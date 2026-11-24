const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");

const Labour = require("../models/Labour.js");
const Booking = require("../models/BookingMachine.js");
const Review = require("../models/Review.js");
const { isLoggedIn } = require("../middleware/auth.js");
const { getApproximateServiceCoordinates } = require("../utils/locationService.js");

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many review actions. Please try again later." }
});

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function reviewAuthorId(review) {
  const author = review?.reviewerId || review?.author;
  return String(author?._id || author || "");
}

function canReviewProfile(labour, userId) {
  return Boolean(labour && userId && String(labour.owner) !== String(userId));
}

function canManageReview(review, userId) {
  return Boolean(review && userId && reviewAuthorId(review) === String(userId));
}

function ownedReviewQuery(labourId, reviewId, userId) {
  return {
    _id: reviewId,
    labour: labourId,
    $or: [{ reviewerId: userId }, { reviewerId: { $exists: false }, author: userId }]
  };
}

function validateReviewInput(body = {}) {
  const rating = Number(body.rating);
  const comment = cleanText(body.comment, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be between 1 and 5." };
  }
  if (comment.length < 10) {
    return { error: "Review text must be at least 10 characters." };
  }
  return { rating, comment };
}

function hasValidCoordinatePair(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return false;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180;
}

function publicCoordinates(worker) {
  if (!worker) return null;
  return getApproximateServiceCoordinates(worker);
}

async function refreshRating(labourId) {
  const [summary] = await Review.aggregate([
    { $match: { labour: new mongoose.Types.ObjectId(labourId), status: "Visible", isHidden: { $ne: true } } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  await Labour.findByIdAndUpdate(labourId, {
    rating: summary ? Math.round(summary.average * 10) / 10 : 0,
    reviewCount: summary?.count || 0
  });
}

router.get("/:id/rating", async (req, res, next) => {
  if (["bookings", "my-bookings", "categories", "profile-status", "provider", "apply"].includes(req.params.id)) return next();
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  if (!await Labour.exists({ _id: req.params.id })) return res.status(404).json({ success: false, message: "Labour profile not found." });
  const ratings = await Review.aggregate([
    { $match: { labour: new mongoose.Types.ObjectId(req.params.id), status: "Visible", isHidden: { $ne: true } } },
    { $group: { _id: "$rating", count: { $sum: 1 } } }
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalReviews = 0;
  let weightedTotal = 0;
  for (const row of ratings) {
    distribution[row._id] = row.count;
    totalReviews += row.count;
    weightedTotal += row._id * row.count;
  }
  return res.json({ success: true, averageRating: totalReviews ? Math.round((weightedTotal / totalReviews) * 10) / 10 : 0, totalReviews, distribution });
});

router.get("/:id/reviews", async (req, res, next) => {
  if (["bookings", "my-bookings", "categories", "profile-status", "provider", "apply"].includes(req.params.id)) return next();
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  if (!await Labour.exists({ _id: req.params.id })) return res.status(404).json({ success: false, message: "Labour profile not found." });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));
  const sort = req.query.sort === "highest" ? { rating: -1, createdAt: -1 }
    : req.query.sort === "lowest" ? { rating: 1, createdAt: -1 }
      : { createdAt: -1 };
  const query = { labour: new mongoose.Types.ObjectId(req.params.id), status: "Visible", isHidden: { $ne: true } };
  const [total, reviews] = await Promise.all([
    Review.countDocuments(query),
    Review.find(query).sort(sort).skip((page - 1) * limit).limit(limit)
      .populate("reviewerId", "fullName profileImage")
      .populate("author", "fullName profileImage")
      .lean()
  ]);
  return res.json({
    success: true,
    reviews: reviews.map((review) => {
      const reviewer = review.reviewerId || review.author;
      return {
        _id: review._id,
        reviewerId: reviewAuthorId(review),
        customerName: review.reviewerName || reviewer?.fullName || "Customer",
        customerImage: reviewer?.profileImage?.url || reviewer?.profileImage || null,
        rating: review.rating,
        comment: review.comment || review.text || "",
        images: Array.isArray(review.images) ? review.images : [],
        verifiedBooking: review.verifiedBooking === true,
        createdAt: review.createdAt
      };
    }),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 }
  });
});

router.post("/:id/reviews", reviewLimiter, isLoggedIn, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  const labour = await Labour.findById(req.params.id).select("_id owner").lean();
  if (!labour) return res.status(404).json({ success: false, message: "Labour profile not found." });
  if (!canReviewProfile(labour, req.user._id)) return res.status(403).json({ success: false, message: "Workers cannot review their own profile." });
  const validated = validateReviewInput(req.body);
  if (validated.error) return res.status(400).json({ success: false, message: validated.error });
  const { rating, comment } = validated;
  const bookingId = String(req.body?.bookingId || "").trim();
  let booking = null;
  if (bookingId) {
    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ success: false, message: "A valid completed booking ID is required." });
    }
    booking = await Booking.findOne({
      _id: bookingId,
      requestType: "Labour",
      itemId: labour._id,
      customer: req.user._id,
      status: "Completed"
    }).lean();
    if (!booking) {
      return res.status(403).json({ success: false, message: "Only the customer with a completed booking can submit this review." });
    }
    if (await Review.exists({ bookingId: booking._id })) {
      return res.status(409).json({ success: false, message: "A review has already been submitted for this booking." });
    }
  } else {
    const existing = await Review.findOne({
      labour: labour._id,
      $or: [{ reviewerId: req.user._id }, { author: req.user._id }]
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "You have already submitted a review for this worker." });
    }
  }

  try {
    const reviewData = {
      labour: labour._id,
      serviceType: "Labour",
      reviewerId: req.user._id,
      author: req.user._id,
      reviewerName: String(req.user.fullName || "Customer").trim().slice(0, 80),
      rating,
      comment,
      text: comment,
      images: [],
      status: "Visible",
      verifiedBooking: Boolean(booking)
    };
    if (booking) {
      reviewData.bookingId = booking._id;
    }
    const review = await Review.create(reviewData);
    await refreshRating(labour._id);
    return res.status(201).json({ success: true, message: "Review submitted successfully.", review: { _id: review._id } });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "A review has already been submitted for this booking." });
    }
    throw error;
  }
});

router.put("/:id/reviews/:reviewId", reviewLimiter, isLoggedIn, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  if (!mongoose.isValidObjectId(req.params.reviewId)) return res.status(400).json({ success: false, message: "Invalid review ID." });
  const labour = await Labour.findById(req.params.id).select("_id owner").lean();
  if (!labour) return res.status(404).json({ success: false, message: "Labour profile not found." });
  const review = await Review.findOne({ _id: req.params.reviewId, labour: labour._id });
  if (!review) return res.status(404).json({ success: false, message: "Review not found for this Labour profile." });
  if (!canManageReview(review, req.user._id)) return res.status(403).json({ success: false, message: "You can only edit your own review." });
  const validated = validateReviewInput(req.body);
  if (validated.error) return res.status(400).json({ success: false, message: validated.error });
  review.rating = validated.rating;
  review.comment = validated.comment;
  review.text = validated.comment;
  await review.save();
  await refreshRating(labour._id);
  return res.json({ success: true, message: "Review updated successfully." });
});

router.delete("/:id/reviews/:reviewId", reviewLimiter, isLoggedIn, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  if (!mongoose.isValidObjectId(req.params.reviewId)) return res.status(400).json({ success: false, message: "Invalid review ID." });
  const labour = await Labour.findById(req.params.id).select("_id").lean();
  if (!labour) return res.status(404).json({ success: false, message: "Labour profile not found." });
  const review = await Review.findOne({ _id: req.params.reviewId, labour: labour._id });
  if (!review) return res.status(404).json({ success: false, message: "Review not found for this Labour profile." });
  if (!canManageReview(review, req.user._id)) return res.status(403).json({ success: false, message: "You can only delete your own review." });
  const deletion = await Review.deleteOne(ownedReviewQuery(labour._id, review._id, req.user._id));
  if (!deletion.deletedCount) return res.status(403).json({ success: false, message: "You can only delete your own review." });
  await refreshRating(labour._id);
  return res.json({ success: true, message: "Review deleted successfully." });
});

router.post("/reviews/:reviewId/report", reviewLimiter, isLoggedIn, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.reviewId)) return res.status(400).json({ success: false, message: "Invalid review ID." });
  const reason = cleanText(req.body?.reason, 300);
  if (reason.length < 5) return res.status(400).json({ success: false, message: "Please provide a report reason." });
  const review = await Review.findOne({ _id: req.params.reviewId, labour: { $exists: true }, status: "Visible" });
  if (!review) return res.status(404).json({ success: false, message: "Review not found." });
  review.reported = true;
  review.reportCount = Number(review.reportCount || 0) + 1;
  review.reportReason = reason;
  await review.save();
  return res.json({ success: true, message: "Review reported for moderation." });
});

router.get("/review-eligible/:id", isLoggedIn, async (req, res, next) => {
  if (["bookings", "my-bookings", "categories", "profile-status", "provider", "apply"].includes(req.params.id)) return next();
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  const labour = await Labour.findById(req.params.id).select("_id owner").lean();
  if (!labour) return res.status(404).json({ success: false, message: "Labour profile not found." });
  if (!canReviewProfile(labour, req.user._id)) return res.json({ success: true, bookings: [], canReview: false, hasReviewed: false });
  const completed = await Booking.find({ requestType: "Labour", itemId: req.params.id, customer: req.user._id, status: "Completed" })
    .select("_id bookingDate completedAt updatedAt").sort({ completedAt: -1 }).lean();
  const bookingIds = completed.map((booking) => booking._id);
  const reviewed = bookingIds.length ? await Review.find({ bookingId: { $in: bookingIds } }).select("bookingId").lean() : [];
  const reviewedIds = new Set(reviewed.map((review) => String(review.bookingId)));
  const unreviewedBookings = completed.filter((booking) => !reviewedIds.has(String(booking._id)));
  const hasReviewed = await Review.exists({
    labour: req.params.id,
    $or: [{ reviewerId: req.user._id }, { author: req.user._id }]
  });
  return res.json({
    success: true,
    canReview: true,
    hasReviewed: Boolean(hasReviewed),
    bookings: unreviewedBookings
  });
});

router.get("/map", async (req, res) => {
  const { category, location, skills, minExperience, maxPrice, radiusKm, latitude, longitude } = req.query;
  const query = { availability: { $ne: "Hidden" }, status: { $ne: "Rejected" }, mapVisibilityConsent: true, latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } };
  if (category && category !== "All") query.labourType = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  if (location?.trim()) {
    const clean = location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [{ location: new RegExp(clean, "i") }, { serviceArea: new RegExp(clean, "i") }, { publicLocation: new RegExp(clean, "i") }];
  }
  if (skills?.trim()) query.skills = new RegExp(skills.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  if (minExperience != null && !isNaN(Number(minExperience))) query.experience = { $gte: Number(minExperience) };
  if (maxPrice != null && !isNaN(Number(maxPrice))) query.price = { $lte: Number(maxPrice) };
  let workers = await Labour.find(query).limit(200).lean();
  const pointLat = Number(latitude);
  const pointLng = Number(longitude);
  const hasPoint = Number.isFinite(pointLat) && Number.isFinite(pointLng);
  const radius = Math.min(Math.max(Number(radiusKm) || 50, 1), 200);
  const mapped = workers.flatMap((worker) => {
    const coordinates = publicCoordinates(worker);
    if (!coordinates) return [];
    let approximateDistanceKm = null;
    if (hasPoint) {
      const latDelta = (pointLat - coordinates.latitude) * 111;
      const lngDelta = (pointLng - coordinates.longitude) * 111 * Math.max(Math.cos(pointLat * Math.PI / 180), 0.1);
      approximateDistanceKm = Math.round(Math.sqrt(latDelta * latDelta + lngDelta * lngDelta) * 10) / 10;
      if (approximateDistanceKm > radius) return [];
    }
    return [{ _id: worker._id, name: worker.name, labourType: worker.labourType, experience: worker.experience, price: worker.price, pricingUnit: worker.pricingUnit, location: worker.publicLocation || worker.serviceLocation || worker.location, rating: worker.rating || 0, reviewCount: worker.reviewCount || 0, serviceRadiusKm: worker.serviceRadiusKm, approximateDistanceKm, ...coordinates }];
  });
  return res.json({ success: true, workers: mapped });
});

router.get("/:id/location", async (req, res, next) => {
  if (["bookings", "my-bookings", "categories", "profile-status", "provider", "apply"].includes(req.params.id)) return next();
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid worker ID." });
  const worker = await Labour.findById(req.params.id).lean();
  if (!worker) {
    console.error("WORKER NOT FOUND FOR ID:", req.params.id);
    return res.status(404).json({ success: false, message: "Labour profile not found." });
  }
  if (worker.availability === "Hidden") return res.status(404).json({ success: false, message: "Labour profile not found." });
  const coordinates = publicCoordinates(worker);
  const publicLocation = worker.publicLocation || worker.serviceLocation || worker.location || null;
  return res.json({
    success: true,
    locationVisible: Boolean(coordinates),
    publicLocation,
    serviceRadiusKm: Number.isFinite(Number(worker.serviceRadiusKm)) && Number(worker.serviceRadiusKm) > 0 ? Number(worker.serviceRadiusKm) : null,
    coordinates,
    isCityCenter: coordinates?.isCityCenter || false
  });
});

router.reviewPolicy = { canManageReview, canReviewProfile, hasValidCoordinatePair, ownedReviewQuery, validateReviewInput };

module.exports = router;
