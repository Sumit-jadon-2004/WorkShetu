const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Labour = require("../models/Labour.js");
const Booking = require("../models/BookingMachine.js");
const User = require("../models/Owner.js");
const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. LABOUR STATS & METRICS FOR ADMIN
// ==========================================
router.get("/stats", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const [
      totalProviders,
      totalListings,
      activeListings,
      totalBookings,
      pendingBookings,
      acceptedBookings,
      completedBookings,
      completedWagesRaw
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ["Labour", "labour"] } }),
      Labour.countDocuments(),
      Labour.countDocuments({ availability: "Available", status: "Approved" }),
      Booking.countDocuments({ requestType: "Labour" }),
      Booking.countDocuments({ requestType: "Labour", status: "Pending" }),
      Booking.countDocuments({ requestType: "Labour", status: "Accepted" }),
      Booking.countDocuments({ requestType: "Labour", status: "Completed" }),
      Booking.find({ requestType: "Labour", status: "Completed" }).select("finalPrice earning").lean()
    ]);

    const totalWagesCompleted = completedWagesRaw.reduce(
      (sum, b) => sum + (Number(b.earning || b.finalPrice) || 0),
      0
    );

    return res.json({
      success: true,
      stats: {
        totalProviders,
        totalListings,
        activeListings,
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
        totalWagesCompleted
      }
    });
  } catch (error) {
    console.error("ADMIN LABOUR STATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load labour statistics." });
  }
});

// ==========================================
// 2. GET LABOUR PROVIDERS (USERS)
// ==========================================
router.get("/providers", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { role: { $in: ["Labour", "labour"] } };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { location: searchRegex },
        { email: searchRegex }
      ];
    }

    const [total, providersRaw] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("fullName phone email location isActive createdAt profileImage")
        .lean()
    ]);

    // Attach listing counts to each provider
    const providers = await Promise.all(
      providersRaw.map(async (p) => {
        const [listingsCount, completedJobs] = await Promise.all([
          Labour.countDocuments({ owner: p._id }),
          Booking.countDocuments({ owner: p._id, requestType: "Labour", status: "Completed" })
        ]);
        return {
          ...p,
          listingsCount,
          completedJobs
        };
      })
    );

    return res.json({
      success: true,
      providers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error("ADMIN LABOUR PROVIDERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load labour providers." });
  }
});

// ==========================================
// 3. GET LABOUR LISTINGS WITH FILTERS
// ==========================================
router.get("/listings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { category, search, status, availability, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (category && category !== "all" && category !== "All") {
      query.labourType = new RegExp(`^${category.trim()}$`, "i");
    }

    if (status && status !== "all" && status !== "All") {
      query.status = status;
    }

    if (availability && availability !== "all" && availability !== "All") {
      query.availability = availability;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { name: searchRegex },
        { labourType: searchRegex },
        { location: searchRegex },
        { description: searchRegex }
      ];
    }

    const [total, listings] = await Promise.all([
      Labour.countDocuments(query),
      Labour.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("owner", "fullName phone email location isActive")
        .lean()
    ]);

    return res.json({
      success: true,
      listings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error("ADMIN LABOUR LISTINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load listings." });
  }
});

// ==========================================
// 4. MODERATE / UPDATE LISTING STATUS
// ==========================================
router.put("/listings/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status, availability } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await Labour.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    if (status && ["Approved", "Pending", "Rejected"].includes(status)) {
      listing.status = status;
    }

    if (availability && ["Available", "Booked", "Hidden"].includes(availability)) {
      listing.availability = availability;
    }

    await listing.save();

    return res.json({
      success: true,
      message: "Listing moderation updated successfully.",
      listing
    });
  } catch (error) {
    console.error("ADMIN MODERATE LISTING ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update listing." });
  }
});

// ==========================================
// 5. DELETE LABOUR LISTING
// ==========================================
router.delete("/listings/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await Labour.findByIdAndDelete(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    return res.json({ success: true, message: "Labour listing deleted successfully." });
  } catch (error) {
    console.error("ADMIN DELETE LISTING ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete listing." });
  }
});

// ==========================================
// 6. GET LABOUR BOOKINGS
// ==========================================
router.get("/bookings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { requestType: "Labour" };

    if (status && status !== "all" && status !== "All") {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { customerLocation: searchRegex },
        { taskCategory: searchRegex }
      ];
    }

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("customer", "fullName phone email")
        .populate("owner", "fullName phone email")
        .populate("itemId", "name labourType price pricingUnit location")
        .lean()
    ]);

    return res.json({
      success: true,
      bookings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error("ADMIN LABOUR BOOKINGS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load bookings." });
  }
});

// ==========================================
// 7. UPDATE LABOUR BOOKING STATUS (ADMIN OVERRIDE)
// ==========================================
router.put("/bookings/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (!["Pending", "Accepted", "Completed", "Cancelled", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    booking.status = status;
    booking.statusChangedAt = new Date();
    if (status === "Completed") {
      booking.completedAt = new Date();
      booking.earning = booking.finalPrice || booking.totalPrice || 0;
    }
    if (reason) booking.cancellationReason = reason;

    await booking.save();

    return res.json({
      success: true,
      message: `Booking status updated to ${status}.`,
      booking
    });
  } catch (error) {
    console.error("ADMIN UPDATE BOOKING STATUS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update booking status." });
  }
});

module.exports = router;

