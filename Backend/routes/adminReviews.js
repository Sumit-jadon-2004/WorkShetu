const express = require("express");
const router = express.Router();

const Review = require("../models/Review.js");
const ListingMachine = require("../models/ListingMachin.js");
const User = require("../models/Owner.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. GET REVIEWS WITH FILTER & METRICS
// ==========================================
router.get("/reviews", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { rating, status, search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Rating star breakdown
    const [
      totalReviews,
      star5,
      star4,
      star3,
      star2,
      star1,
      visibleCount,
      hiddenCount,
    ] = await Promise.all([
      Review.countDocuments(),
      Review.countDocuments({ rating: 5 }),
      Review.countDocuments({ rating: 4 }),
      Review.countDocuments({ rating: 3 }),
      Review.countDocuments({ rating: 2 }),
      Review.countDocuments({ rating: 1 }),
      Review.countDocuments({ $or: [{ status: "Visible" }, { isHidden: { $ne: true } }] }),
      Review.countDocuments({ $or: [{ status: "Hidden" }, { isHidden: true }] }),
    ]);

    const sumRatings = star5 * 5 + star4 * 4 + star3 * 3 + star2 * 2 + star1 * 1;
    const averageRating = totalReviews > 0 ? (sumRatings / totalReviews).toFixed(1) : "0.0";

    const query = {};

    // Filter by Rating
    if (rating && rating !== "all") {
      query.rating = Number(rating);
    }

    // Filter by Status (Visible / Hidden)
    if (status && status !== "all") {
      if (status === "Hidden") {
        query.$or = [{ status: "Hidden" }, { isHidden: true }];
      } else {
        query.$or = [{ status: "Visible" }, { isHidden: false }];
      }
    }

    // Search
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const searchRegex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { reviewerName: searchRegex },
        { text: searchRegex },
      ];
    }

    const [totalMatching, reviewsRaw] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("author", "fullName phone email")
        .populate("machine", "title category image")
        .lean(),
    ]);

    const reviews = reviewsRaw.map((r) => ({
      _id: r._id,
      reviewerName: r.reviewerName || r.author?.fullName || "Farmer",
      reviewerPhone: r.author?.phone || "N/A",
      machine: {
        _id: r.machine?._id,
        title: r.machine?.title || "Machine Listing",
        category: r.machine?.category || "Tractor",
        image: r.machine?.image?.url || null,
      },
      rating: r.rating || 5,
      text: r.text || "",
      status: r.status === "Hidden" || r.isHidden === true ? "Hidden" : "Visible",
      createdAt: r.createdAt,
    }));

    return res.json({
      success: true,
      metrics: {
        totalReviews,
        averageRating,
        stars: { star5, star4, star3, star2, star1 },
        visible: visibleCount,
        hidden: hiddenCount,
      },
      reviews,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load reviews.",
    });
  }
});

// ==========================================
// 2. TOGGLE REVIEW VISIBILITY (HIDE / RESTORE)
// ==========================================
router.patch("/reviews/:id/visibility", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    const isCurrentlyHidden = review.status === "Hidden" || review.isHidden === true;
    const nextStatus = isCurrentlyHidden ? "Visible" : "Hidden";

    review.status = nextStatus;
    review.isHidden = nextStatus === "Hidden";
    await review.save();

    return res.json({
      success: true,
      message: nextStatus === "Hidden"
        ? "Review has been hidden from public equipment pages."
        : "Review restored to public visibility.",
      status: review.status,
    });
  } catch (error) {
    console.error("TOGGLE REVIEW VISIBILITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review visibility.",
    });
  }
});

// ==========================================
// 3. DELETE REVIEW
// ==========================================
router.delete("/reviews/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    return res.json({
      success: true,
      message: "Review permanently removed.",
    });
  } catch (error) {
    console.error("DELETE REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review.",
    });
  }
});

module.exports = router;

