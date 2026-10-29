const express = require("express");
const router = express.Router();

const Complaint = require("../models/Complaint.js");
const User = require("../models/Owner.js");
const Booking = require("../models/BookingMachine.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. GET COMPLAINTS WITH FILTERS & COUNTS
// ==========================================
router.get("/complaints", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status = "all", priority = "all", search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, pendingCount, underReviewCount, resolvedCount, rejectedCount] = await Promise.all([
      Complaint.countDocuments(),
      Complaint.countDocuments({ status: { $in: ["Pending", "Open"] } }),
      Complaint.countDocuments({ status: { $in: ["Under Review", "In Progress"] } }),
      Complaint.countDocuments({ status: "Resolved" }),
      Complaint.countDocuments({ status: "Rejected" }),
    ]);

    const counts = {
      all: totalCount,
      pending: pendingCount,
      underReview: underReviewCount,
      resolved: resolvedCount,
      rejected: rejectedCount,
      open: pendingCount,
      inProgress: underReviewCount,
    };

    const query = {};

    if (status && status !== "all") {
      if (status.toLowerCase() === "pending" || status.toLowerCase() === "open") {
        query.status = { $in: ["Pending", "Open"] };
      } else if (status.toLowerCase() === "under review" || status.toLowerCase() === "in progress" || status.toLowerCase() === "underreview") {
        query.status = { $in: ["Under Review", "In Progress"] };
      } else {
        query.status = new RegExp(`^${status}$`, "i");
      }
    }

    if (priority && priority !== "all") {
      query.priority = new RegExp(`^${priority}$`, "i");
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const regex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { subject: regex },
        { description: regex },
        { userName: regex },
        { userPhone: regex },
      ];
    }

    const [totalMatching, complaints] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("user", "fullName phone email")
        .populate("targetDriver", "fullName phone driverVehicleType driverVehicleNumber")
        .populate("targetBooking", "requestType bookingType totalPrice finalPrice status")
        .lean(),
    ]);

    return res.json({
      success: true,
      counts,
      complaints,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("GET COMPLAINTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load complaints.",
    });
  }
});

// ==========================================
// 2. GET SINGLE COMPLAINT
// ==========================================
router.get("/complaints/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("user", "fullName phone email location role")
      .populate("targetDriver", "fullName phone driverVehicleType driverVehicleNumber")
      .populate("targetBooking")
      .lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    return res.json({ success: true, complaint });
  } catch (error) {
    console.error("GET SINGLE COMPLAINT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load complaint ticket.",
    });
  }
});

// ==========================================
// 3. UPDATE / RESOLVE COMPLAINT
// ==========================================
router.patch("/complaints/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status, priority, resolutionNote } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;
    if (resolutionNote !== undefined) complaint.resolutionNote = resolutionNote.trim();

    if (status === "Resolved") {
      complaint.resolvedAt = new Date();
      complaint.resolvedBy = req.user._id;
    } else if (status) {
      complaint.resolvedAt = null;
      complaint.resolvedBy = null;
    }

    await complaint.save();

    return res.json({
      success: true,
      message: `Complaint ticket #${complaint._id.toString().slice(-6)} updated to ${complaint.status}.`,
      complaint,
    });
  } catch (error) {
    console.error("UPDATE COMPLAINT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update complaint ticket.",
    });
  }
});

// ==========================================
// 4. DELETE COMPLAINT
// ==========================================
router.delete("/complaints/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    return res.json({
      success: true,
      message: "Complaint ticket removed.",
    });
  } catch (error) {
    console.error("DELETE COMPLAINT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete complaint ticket.",
    });
  }
});

module.exports = router;
