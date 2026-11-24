// ======================================================
// WORKSHETU: LOCATION-BASED MARKETPLACE SERVICE
// Priority 1: Nearby listings within radius (5 km)
// Priority 2: Same-city listings (even if > radius)
// Exclude: Unrelated cities, other states, missing location
// ======================================================

function hasValidCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") {
    return false;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!hasValidCoordinates(lat1, lon1) || !hasValidCoordinates(lat2, lon2)) {
    return null;
  }
  const earthRadiusKm = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const lat1Rad = (Number(lat1) * Math.PI) / 180;
  const lat2Rad = (Number(lat2) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadiusKm * c * 10) / 10;
}

function normalizeCity(name) {
  if (!name || typeof name !== "string") return "";
  const cityPart = name.split(",")[0].trim();
  return cityPart
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCity(rawLocation) {
  if (!rawLocation || typeof rawLocation !== "string") return "";
  const parts = rawLocation.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  return parts[0];
}

// Verified city centroids for Indian agricultural hubs & regions
const CITY_CENTROIDS = {
  // Uttar Pradesh & NCR
  aligarh: { latitude: 27.8974, longitude: 78.0880 },
  agra: { latitude: 27.1767, longitude: 78.0081 },
  bareilly: { latitude: 28.3670, longitude: 79.4304 },
  mathura: { latitude: 27.4924, longitude: 77.6737 },
  meerut: { latitude: 28.9845, longitude: 77.7064 },
  hathras: { latitude: 27.5970, longitude: 78.0519 },
  bulandshahr: { latitude: 28.4070, longitude: 77.8498 },
  etawah: { latitude: 26.7769, longitude: 79.0322 },
  kanpur: { latitude: 26.4499, longitude: 80.3319 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  varanasi: { latitude: 25.3176, longitude: 82.9739 },
  prayagraj: { latitude: 25.4358, longitude: 81.8463 },
  allahabad: { latitude: 25.4358, longitude: 81.8463 },
  gorakhpur: { latitude: 26.7606, longitude: 83.3732 },
  moradabad: { latitude: 28.8386, longitude: 78.7733 },
  muzaffarnagar: { latitude: 29.4727, longitude: 77.7085 },
  saharanpur: { latitude: 29.9671, longitude: 77.5510 },
  ghaziabad: { latitude: 28.6692, longitude: 77.4538 },
  noida: { latitude: 28.5355, longitude: 77.3910 },
  "greater noida": { latitude: 28.4744, longitude: 77.5040 },
  "gautam buddha nagar": { latitude: 28.5355, longitude: 77.3910 },
  "gautam buddh nagar": { latitude: 28.5355, longitude: 77.3910 },
  delhi: { latitude: 28.6139, longitude: 77.2090 },

  // Punjab
  ludhiana: { latitude: 30.9010, longitude: 75.8573 },
  amritsar: { latitude: 31.6340, longitude: 74.8723 },
  jalandhar: { latitude: 31.3260, longitude: 75.5762 },
  patiala: { latitude: 30.3398, longitude: 76.3869 },
  bathinda: { latitude: 30.2110, longitude: 74.9455 },
  chandigarh: { latitude: 30.7333, longitude: 76.7794 },

  // Haryana
  karnal: { latitude: 29.6857, longitude: 76.9905 },
  hisar: { latitude: 29.1492, longitude: 75.7217 },
  panipat: { latitude: 29.3909, longitude: 76.9635 },
  sonipat: { latitude: 28.9931, longitude: 77.0151 },
  rohtak: { latitude: 28.8955, longitude: 76.6066 },
  ambala: { latitude: 30.3782, longitude: 76.7767 },
  sirsa: { latitude: 29.5349, longitude: 75.0298 },

  // Rajasthan
  alwar: { latitude: 27.5530, longitude: 76.6346 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  jodhpur: { latitude: 26.2389, longitude: 73.0243 },
  kota: { latitude: 25.2138, longitude: 75.8648 },
  bikaner: { latitude: 28.0229, longitude: 73.3119 },
  "sri ganganagar": { latitude: 29.9038, longitude: 73.8772 },

  // Madhya Pradesh
  indore: { latitude: 22.7196, longitude: 75.8577 },
  bhopal: { latitude: 23.2599, longitude: 77.4126 },
  gwalior: { latitude: 26.2183, longitude: 78.1828 },
  jabalpur: { latitude: 23.1815, longitude: 79.9864 },
  ujjain: { latitude: 23.1765, longitude: 75.7885 },

  // Bihar
  patna: { latitude: 25.5941, longitude: 85.1376 },
  muzaffarpur: { latitude: 26.1209, longitude: 85.3647 },
  gaya: { latitude: 24.7955, longitude: 85.0002 },
  bhagalpur: { latitude: 25.2425, longitude: 86.9842 },

  // Maharashtra
  pune: { latitude: 18.5204, longitude: 73.8567 },
  nagpur: { latitude: 21.1458, longitude: 79.0882 },
  nashik: { latitude: 19.9975, longitude: 73.7898 },
  aurangabad: { latitude: 19.8762, longitude: 75.3433 }
};

/**
 * Generate safe, privacy-preserving approximate coordinates for a worker's public profile map.
 * 1. If worker has GPS coordinates: rounds to 2 decimal places (~1.1 km area center),
 *    ensuring the exact home doorstep coordinate is NEVER exposed to public visitors.
 * 2. If worker has no GPS coordinates: looks up verified city centroid from their address.
 * 3. Never fabricates fake coordinates for unrelated places.
 */
function getApproximateServiceCoordinates(worker) {
  if (!worker) return null;

  // Priority 1: Worker has valid GPS coordinates -> approximate to safe 2-decimal area resolution
  if (hasValidCoordinates(worker.latitude, worker.longitude)) {
    const lat = Math.round(Number(worker.latitude) * 100) / 100;
    const lon = Math.round(Number(worker.longitude) * 100) / 100;
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return {
        latitude: lat,
        longitude: lon,
        isApproximate: true,
        isCityCenter: false,
        source: "worker_coordinates"
      };
    }
  }

  // Priority 2: Worker has no GPS coordinates -> check if address matches verified city
  const locStr = worker.publicLocation || worker.serviceLocation || worker.location || "";
  if (locStr && typeof locStr === "string") {
    // Check comma parts or whole location
    const parts = locStr.split(",").map((p) => normalizeCity(p)).filter(Boolean);
    for (const part of parts) {
      if (CITY_CENTROIDS[part]) {
        return {
          latitude: CITY_CENTROIDS[part].latitude,
          longitude: CITY_CENTROIDS[part].longitude,
          isApproximate: true,
          isCityCenter: true,
          source: "city_centroid",
          cityName: part
        };
      }
    }
    const fullNorm = normalizeCity(locStr);
    if (fullNorm && CITY_CENTROIDS[fullNorm]) {
      return {
        latitude: CITY_CENTROIDS[fullNorm].latitude,
        longitude: CITY_CENTROIDS[fullNorm].longitude,
        isApproximate: true,
        isCityCenter: true,
        source: "city_centroid",
        cityName: fullNorm
      };
    }
  }

  return null;
}

function isSameCity(listingLocation, targetCity) {
  if (!listingLocation || !targetCity) return false;
  const normA = normalizeCity(listingLocation);
  const normB = normalizeCity(targetCity);
  if (normA && normB && normA === normB) return true;

  const check = (listing, target) => {
    const normTarget = normalizeCity(target);
    if (!normTarget) return false;
    const cleanListing = String(listing)
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const escaped = normTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
    if (regex.test(cleanListing)) return true;

    const commaParts = String(listing)
      .split(",")
      .map((p) => normalizeCity(p))
      .filter(Boolean);
    if (commaParts.includes(normTarget)) return true;
    return false;
  };

  return check(listingLocation, targetCity) || check(targetCity, listingLocation);
}

/**
 * Filter and rank listings by location.
 * Priority 1 – Nearby listings: Find Machines and Labour profiles within radius, sorted nearest first.
 * Smart Nearby Radius Expansion: When progressiveRadius is enabled, searches progressively (5 km -> 10 km -> 15 km -> up to max).
 * Priority 2 – Same-city listings: Include listings from the user's city, without duplicates.
 * Exclude: Listings from unrelated cities/states or invalid location data from default results.
 */
function filterAndRankByLocation(items = [], options = {}) {
  const userLoc = options.userLocation || options || {};
  const initialRadiusKm = Math.max(1, Number(options.radiusKm) || 5);
  const locationField = options.locationField || "location";
  const progressiveRadius = Boolean(options.progressiveRadius || options.autoExpandRadius);
  const minItemsThreshold = Math.max(1, Number(options.minItems) || 3);
  const maxRadiusKm = Math.min(200, Math.max(initialRadiusKm, Number(options.maxRadiusKm) || 50));

  const hasCoords = hasValidCoordinates(userLoc.latitude, userLoc.longitude);
  const userLat = hasCoords ? Number(userLoc.latitude) : null;
  const userLon = hasCoords ? Number(userLoc.longitude) : null;

  const rawCity = userLoc.city || extractCity(userLoc.location) || "";
  const userCity = normalizeCity(rawCity);

  // If no coordinates and no city are available, require location selection
  if (!hasCoords && !userCity) {
    return {
      locationRequired: true,
      userCity: "",
      userCoordinates: null,
      initialRadiusKm,
      appliedRadiusKm: initialRadiusKm,
      isExpandedRadius: false,
      radiusKm: initialRadiusKm,
      nearby: [],
      sameCity: [],
      merged: [],
      all: [],
      machines: [],
      workers: [],
      nearbyCount: 0,
      sameCityCount: 0,
      total: 0
    };
  }

  // Pre-calculate distances for items with valid coordinates
  const preparedItems = items.map((rawItem) => {
    const item = typeof rawItem.toObject === "function" ? rawItem.toObject() : { ...rawItem };
    const itemLocStr = item[locationField] || item.serviceLocation || item.publicLocation || item.location || "";
    const hasItemCoords = hasValidCoordinates(item.latitude, item.longitude);

    let distance = null;
    if (hasCoords && hasItemCoords) {
      distance = calculateDistanceKm(userLat, userLon, item.latitude, item.longitude);
    }

    const inCity = Boolean(userCity && isSameCity(itemLocStr, userCity));

    return {
      item,
      distance,
      inCity
    };
  });

  // Calculate applied radius with progressive expansion if requested
  let appliedRadiusKm = initialRadiusKm;
  if (hasCoords && progressiveRadius) {
    const countWithin = (r) => preparedItems.filter((p) => p.distance != null && p.distance <= r).length;
    let currentCount = countWithin(appliedRadiusKm);

    if (currentCount < minItemsThreshold) {
      const radiusTiers = [5, 10, 15, 25, 50].filter((r) => r > initialRadiusKm && r <= maxRadiusKm);
      for (const tier of radiusTiers) {
        const tierCount = countWithin(tier);
        if (tierCount > currentCount) {
          appliedRadiusKm = tier;
          currentCount = tierCount;
          if (tierCount >= minItemsThreshold) {
            break;
          }
        }
      }
    }
  }

  const nearby = [];
  const sameCity = [];
  const seenIds = new Set();

  for (const prep of preparedItems) {
    const item = prep.item;
    const itemId = String(item._id || "");
    const distance = prep.distance;
    const inCity = prep.inCity;

    // Priority 1: Within applied radius, nearest first
    if (distance != null && distance <= appliedRadiusKm) {
      if (!seenIds.has(itemId)) {
        seenIds.add(itemId);
        nearby.push({
          ...item,
          distanceKm: distance,
          proximityGroup: "nearby",
          proximityLabel: distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`,
          isNearby: true,
          inSameCity: inCity
        });
      }
    }
    // Priority 2: Same city, even if outside radius or missing exact coordinates
    else if (inCity) {
      if (!seenIds.has(itemId)) {
        seenIds.add(itemId);
        sameCity.push({
          ...item,
          distanceKm: distance,
          proximityGroup: "same_city",
          proximityLabel: distance != null ? `${distance.toFixed(1)} km away` : "Same city",
          isNearby: false,
          inSameCity: true
        });
      }
    }
    // Exclude unrelated cities, states, or invalid data
  }

  // Sort Priority 1 by distance ascending (nearest first)
  nearby.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

  // Sort Priority 2: with coordinates sorted by distance first, then those without
  sameCity.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return 0;
  });

  // Combine Priority 1 followed by Priority 2
  const merged = [...nearby, ...sameCity];

  return {
    locationRequired: false,
    userCity: rawCity || userCity,
    userCoordinates: hasCoords ? { latitude: userLat, longitude: userLon } : null,
    initialRadiusKm,
    appliedRadiusKm,
    isExpandedRadius: appliedRadiusKm > initialRadiusKm,
    radiusKm: appliedRadiusKm,
    nearby,
    sameCity,
    merged,
    all: merged,
    machines: merged,
    workers: merged,
    nearbyCount: nearby.length,
    sameCityCount: sameCity.length,
    total: merged.length
  };
}

module.exports = {
  hasValidCoordinates,
  calculateDistanceKm,
  normalizeCity,
  extractCity,
  isSameCity,
  CITY_CENTROIDS,
  getApproximateServiceCoordinates,
  filterAndRankByLocation
};
