/**
 * WorkShetu Machine Learning Service Recommendation Engine
 * 
 * Provides transparent, multi-attribute relevance ranking for Machine and Labour services:
 * - Category & Skill Vector Match Score
 * - Text Similarity Score (TF-IDF term overlap)
 * - Budget / Pricing Suitability Score
 * - Geospatial Distance Score (Haversine formula)
 * - Availability & Verification Quality Score
 */

const { tokenize } = require("./mlClassifier.js");

// Haversine formula to compute great-circle distance in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Compute Text Match Jaccard / Overlap similarity between query and listing
 */
function textRelevance(queryText, itemText) {
  if (!queryText || !itemText) return 0;
  const qTokens = new Set(tokenize(queryText));
  const itemTokens = new Set(tokenize(itemText));
  if (qTokens.size === 0 || itemTokens.size === 0) return 0;

  let intersection = 0;
  qTokens.forEach((t) => {
    if (itemTokens.has(t)) intersection++;
  });

  return intersection / Math.sqrt(qTokens.size * itemTokens.size);
}

/**
 * Score and rank Labour listings based on query context
 * 
 * @param {Array} listings - Real listings fetched from MongoDB
 * @param {Object} query - Extracted criteria (category, skills, budget, location, coords)
 * @returns {Array} Ranked listings with relevance scores and match explanation reasons
 */
function rankLabourListings(listings, query = {}) {
  if (!Array.isArray(listings) || listings.length === 0) return [];

  const {
    category,
    skills = [],
    maxPrice,
    searchText,
    userLatitude,
    userLongitude
  } = query;

  const targetCategory = (category || "").toLowerCase();
  const targetSkills = Array.isArray(skills) ? skills.map((s) => s.toLowerCase()) : [];

  const scored = listings.map((item) => {
    let categoryScore = 0;
    const itemCat = (item.labourType || item.category || "").toLowerCase();
    if (targetCategory && itemCat.includes(targetCategory)) {
      categoryScore = 1.0;
    } else if (targetCategory && targetCategory.split(" ").some((w) => itemCat.includes(w))) {
      categoryScore = 0.6;
    } else if (!targetCategory) {
      categoryScore = 0.5; // Neutral when no specific category requested
    }

    // Skills match score
    let skillsScore = 0;
    const itemSkills = Array.isArray(item.skills) ? item.skills.map((s) => s.toLowerCase()) : [];
    if (targetSkills.length > 0 && itemSkills.length > 0) {
      const matches = targetSkills.filter((s) => itemSkills.some((is) => is.includes(s) || s.includes(is)));
      skillsScore = matches.length / targetSkills.length;
    } else if (targetSkills.length === 0) {
      skillsScore = 0.5;
    }

    // Text relevance
    const itemLoc = typeof item.location === "object" ? `${item.location.city || ""} ${item.location.state || ""}` : (item.location || "");
    const itemDesc = `${item.name || ""} ${itemCat} ${item.description || ""} ${itemLoc} ${itemSkills.join(" ")}`;
    const textScore = searchText ? textRelevance(searchText, itemDesc) : 0.5;

    // Price / Budget score
    let priceScore = 0.5;
    const price = Number(item.price != null ? item.price : item.wageRate) || 0;
    if (maxPrice != null && maxPrice > 0) {
      if (price <= maxPrice) {
        priceScore = 1.0 - (maxPrice - price) / (maxPrice * 2); // Closer to budget is good
      } else {
        // Exceeding budget decays score
        priceScore = Math.max(0, 1.0 - (price - maxPrice) / maxPrice);
      }
    } else {
      // If no budget, slightly favor competitive rates (under ₹800)
      priceScore = price > 0 ? Math.min(1.0, 600 / price) : 0.5;
    }

    // Distance score
    let distanceKm = null;
    let distanceScore = 0.5;
    const itemLat = item.latitude != null ? item.latitude : (item.location?.coordinates ? item.location.coordinates[1] : null);
    const itemLng = item.longitude != null ? item.longitude : (item.location?.coordinates ? item.location.coordinates[0] : null);
    if (userLatitude != null && userLongitude != null && itemLat != null && itemLng != null) {
      distanceKm = haversineDistance(userLatitude, userLongitude, itemLat, itemLng);
      if (distanceKm != null) {
        distanceScore = Math.max(0, 1.0 - distanceKm / 50);
      }
    }

    // Availability score
    const isAvail = item.availability === "Available" || item.isAvailable === true;
    const availScore = isAvail ? 1.0 : 0.2;

    // Quality / Experience score
    const exp = Math.min(10, Number(item.experience != null ? item.experience : item.experienceYears) || 0);
    const qualityScore = exp / 10;

    // Composite ML-derived relevance score (weights sum to 1.0)
    const compositeScore = parseFloat(
      (
        0.30 * categoryScore +
        0.20 * textScore +
        0.15 * skillsScore +
        0.15 * priceScore +
        0.10 * distanceScore +
        0.05 * availScore +
        0.05 * qualityScore
      ).toFixed(4)
    );

    // Build transparent match explanation
    const reasons = [];
    if (categoryScore >= 0.8) reasons.push("Skill match");
    if (priceScore >= 0.8 && maxPrice) reasons.push(`Within budget (₹${price})`);
    else if (price > 0) reasons.push(`₹${price}/${item.pricingUnit || "day"}`);
    if (distanceKm != null) reasons.push(`${distanceKm} km away`);
    if (exp > 2) reasons.push(`${exp} yrs experience`);
    if (isAvail) reasons.push("Available now");

    return {
      ...item,
      distanceKm,
      relevanceScore: compositeScore,
      matchReason: reasons.slice(0, 3).join(" · ") || "Matched provider",
      matchReasons: reasons,
      scoreBreakdown: {
        category: categoryScore,
        text: textScore,
        skills: skillsScore,
        price: priceScore,
        distance: distanceScore,
        availability: availScore,
        quality: qualityScore
      }
    };
  });

  // Sort descending by relevance score
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Score and rank Machine listings based on query context
 * 
 * @param {Array} listings - Real listings fetched from MongoDB
 * @param {Object} query - Criteria (category, maxPrice, power, location, coords)
 * @returns {Array} Ranked listings with relevance scores
 */
function rankMachineListings(listings, query = {}) {
  if (!Array.isArray(listings) || listings.length === 0) return [];

  const {
    category,
    maxPrice,
    power,
    searchText,
    userLatitude,
    userLongitude
  } = query;

  const targetCategory = (category || "").toLowerCase();

  const scored = listings.map((item) => {
    let categoryScore = 0;
    const itemCat = (item.category || "").toLowerCase();
    const itemTitle = (item.machineName || item.title || "").toLowerCase();
    if (targetCategory && (itemCat.includes(targetCategory) || itemTitle.includes(targetCategory))) {
      categoryScore = 1.0;
    } else if (targetCategory && targetCategory.split(" ").some((w) => itemCat.includes(w) || itemTitle.includes(w))) {
      categoryScore = 0.6;
    } else if (!targetCategory) {
      categoryScore = 0.5;
    }

    const itemLoc = typeof item.location === "object" ? `${item.location.city || ""} ${item.location.state || ""}` : (item.location || "");
    const itemDesc = `${item.machineName || item.title || ""} ${item.category || ""} ${item.description || ""} ${itemLoc}`;
    const textScore = searchText ? textRelevance(searchText, itemDesc) : 0.5;

    let priceScore = 0.5;
    const price = Number(item.price != null ? item.price : item.pricePerHour != null ? item.pricePerHour : item.pricePerDay) || 0;
    if (maxPrice != null && maxPrice > 0) {
      if (price <= maxPrice) {
        priceScore = 1.0 - (maxPrice - price) / (maxPrice * 2);
      } else {
        priceScore = Math.max(0, 1.0 - (price - maxPrice) / maxPrice);
      }
    }

    let powerScore = 0.5;
    if (power != null && power > 0 && item.power) {
      const diff = Math.abs(Number(item.power) - power);
      powerScore = Math.max(0, 1.0 - diff / 50);
    }

    let distanceKm = null;
    let distanceScore = 0.5;
    const itemLat = item.latitude != null ? item.latitude : (item.location?.coordinates ? item.location.coordinates[1] : null);
    const itemLng = item.longitude != null ? item.longitude : (item.location?.coordinates ? item.location.coordinates[0] : null);
    if (userLatitude != null && userLongitude != null && itemLat != null && itemLng != null) {
      distanceKm = haversineDistance(userLatitude, userLongitude, itemLat, itemLng);
      if (distanceKm != null) {
        distanceScore = Math.max(0, 1.0 - distanceKm / 50);
      }
    }

    const isAvail = item.availability === "Available" || item.isAvailable === true;
    const availScore = isAvail ? 1.0 : 0.2;
    const rating = Number(item.averageRating != null ? item.averageRating : item.rating) || 0;
    const ratingScore = rating ? rating / 5 : 0.5;

    const compositeScore = parseFloat(
      (
        0.30 * categoryScore +
        0.20 * textScore +
        0.20 * priceScore +
        0.10 * distanceScore +
        0.10 * powerScore +
        0.05 * availScore +
        0.05 * ratingScore
      ).toFixed(4)
    );

    const reasons = [];
    if (categoryScore >= 0.8) reasons.push(`${item.category || "Category"} match`);
    if (priceScore >= 0.8 && maxPrice) reasons.push(`Within budget (₹${price})`);
    else if (price > 0) reasons.push(`₹${price}/${item.unit || "Bigha"}`);
    if (distanceKm != null) reasons.push(`${distanceKm} km away`);
    if (item.power) reasons.push(`${item.power} HP`);
    if (rating > 0) reasons.push(`★ ${rating}`);

    return {
      ...item,
      distanceKm,
      relevanceScore: compositeScore,
      matchReason: reasons.slice(0, 3).join(" · ") || "Matched machine",
      matchReasons: reasons,
      scoreBreakdown: {
        category: categoryScore,
        text: textScore,
        price: priceScore,
        distance: distanceScore,
        power: powerScore,
        availability: availScore,
        rating: ratingScore
      }
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

module.exports = {
  haversineDistance,
  textRelevance,
  rankLabourListings,
  rankMachineListings
};
