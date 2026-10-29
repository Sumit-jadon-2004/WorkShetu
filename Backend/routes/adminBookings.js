const express = require("express");
const router = express.Router();

const Booking = require("../models/BookingMachine.js");
const User = require("../models/Owner.js");
const ListingMachine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Offer = require("../models/Offer.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. GET BOOKINGS WITH FILTERS & STATS
// ==========================================
router.get("/bookings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status = "all", type = "all", search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Aggregate counts by status
    const [
      totalCount,
      pendingCount,
      acceptedCount,
      completedCount,
      cancelledCount,
      rejectedCount,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Pending" }),
      Booking.countDocuments({ status: "Accepted" }),
      Booking.countDocuments({ status: "Completed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      Booking.countDocuments({ status: "Rejected" }),
    ]);

    const counts = {
      all: totalCount,
      pending: pendingCount,
      accepted: acceptedCount,
      completed: completedCount,
      cancelled: cancelledCount,
      rejected: rejectedCount,
    };

    const query = {};

    // Filter by Status
    if (status && status !== "all") {
      query.status = new RegExp(`^${status}$`, "i");
    }

    // Filter by Item Type
    if (type && type !== "all") {
      query.requestType = new RegExp(`^${type}$`, "i");
    }

    // Search
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const searchRegex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      // Match ObjectIds if hex string
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanSearch);

      if (isObjectId) {
        query._id = cleanSearch;
      } else {
        query.$or = [
          { customerName: searchRegex },
          { customerPhone: searchRegex },
          { customerLocation: searchRegex },
          { workType: searchRegex },
          { goodsType: searchRegex },
          { pickupLocation: searchRegex },
          { dropLocation: searchRegex },
        ];
      }
    }

    const [totalMatching, bookingsRaw] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("customer", "fullName phone email location")
        .populate("owner", "fullName phone email location")
        .lean(),
    ]);

    // Format for frontend
    const bookings = await Promise.all(
      bookingsRaw.map(async (b) => {
        let itemName = "Item";
        if (b.itemId) {
          if (b.requestType === "Machine") {
            const m = await ListingMachine.findById(b.itemId).select("title category").lean();
            if (m) itemName = `${m.category} - ${m.title}`;
          } else if (b.requestType === "Labour") {
            const l = await Labour.findById(b.itemId).select("name labourType").lean();
            if (l) itemName = `${l.labourType} - ${l.name}`;
          } else if (b.requestType === "Transport") {
            const t = await Transport.findById(b.itemId).select("vehicleName vehicleType").lean();
            if (t) itemName = `${t.vehicleType} - ${t.vehicleName}`;
          }
        }

        return {
          _id: b._id,
          bookingType: b.bookingType || "Single",
          requestType: b.requestType || "Machine",
          itemName,
          customer: {
            _id: b.customer?._id,
            name: b.customer?.fullName || b.customerName || "Customer",
            phone: b.customer?.phone || b.customerPhone || "N/A",
            email: b.customer?.email || "",
            location: b.customerLocation || b.customer?.location || "N/A",
          },
          driver: {
            _id: b.owner?._id,
            name: b.owner?.fullName || "Assigned Driver",
            phone: b.owner?.phone || "N/A",
            email: b.owner?.email || "",
          },
          details: {
            landArea: b.landArea != null ? `${b.landArea} ${b.areaUnit || "Bigha"}` : null,
            workType: b.workType || null,
            requiredDate: b.requiredDate || b.bookingDate,
            weight: b.weight != null ? `${b.weight} kg` : null,
            goodsType: b.goodsType || null,
            daysRequired: b.daysRequired != null ? `${b.daysRequired} Days` : null,
            pickupLocation: b.pickupLocation || null,
            dropLocation: b.dropLocation || null,
          },
          pricing: {
            basePrice: b.basePrice || 0,
            extraCharge: b.extraCharge || 0,
            discountAmount: b.discountAmount || 0,
            totalPrice: b.totalPrice || 0,
            finalPrice: b.finalPrice || b.totalPrice || b.earning || 0,
          },
          status: b.status || "Pending",
          completedAt: b.completedAt || null,
          createdAt: b.createdAt,
        };
      })
    );

    return res.json({
      success: true,
      counts,
      bookings,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("GET ADMIN BOOKINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings.",
    });
  }
});

// ==========================================
// 2. GET SINGLE BOOKING AUDIT
// ==========================================
router.get("/bookings/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "fullName phone email location role")
      .populate("owner", "fullName phone email location role driverVehicleType driverVehicleNumber")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking record not found.",
      });
    }

    let item = null;
    if (booking.itemId) {
      if (booking.requestType === "Machine") {
        item = await ListingMachine.findById(booking.itemId).lean();
      } else if (booking.requestType === "Labour") {
        item = await Labour.findById(booking.itemId).lean();
      } else if (booking.requestType === "Transport") {
        item = await Transport.findById(booking.itemId).lean();
      }
    }

    return res.json({
      success: true,
      booking,
      item,
    });
  } catch (error) {
    console.error("GET SINGLE BOOKING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load booking audit details.",
    });
  }
});

// ==========================================
// 3. UPDATE BOOKING STATUS (INTERVENE)
// ==========================================
router.patch("/bookings/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ["Pending", "Accepted", "Completed", "Cancelled", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking record not found.",
      });
    }

    const previousStatus = booking.status;
    booking.status = status;
    if (status === "Completed") {
      booking.completedAt = new Date();
    } else if (status === "Cancelled" || status === "Pending") {
      booking.completedAt = null;
    }

    // Release offer budget if transitioned to Cancelled or Rejected
    if (
      !["Cancelled", "Rejected"].includes(previousStatus) &&
      ["Cancelled", "Rejected"].includes(status) &&
      booking.offerId
    ) {
      const discountToRestore = Number(booking.offerDiscount || booking.discountAmount || 0);
      try {
        const revertedOffer = await Offer.findByIdAndUpdate(
          booking.offerId,
          { $inc: { usedCount: -1, budgetSpent: -discountToRestore } },
          { new: true }
        );
        if (
          revertedOffer &&
          revertedOffer.status === "Paused" &&
          revertedOffer.campaignBudget &&
          revertedOffer.budgetSpent < revertedOffer.campaignBudget
        ) {
          const now = new Date();
          if (!revertedOffer.endDate || now <= revertedOffer.endDate) {
            revertedOffer.status = "Active";
            await revertedOffer.save();
          }
        }
      } catch (err) {
        console.error("Failed to release offer budget on admin status update:", err);
      }
    }

    if (note && note.trim()) {
      booking.message = booking.message
        ? `${booking.message}\n[Admin Note: ${note.trim()}]`
        : `[Admin Note: ${note.trim()}]`;
    }

    await booking.save();

    return res.json({
      success: true,
      message: `Booking #${booking._id.toString().slice(-6)} status updated to ${status}.`,
      status: booking.status,
    });
  } catch (error) {
    console.error("UPDATE BOOKING STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status.",
    });
  }
});

// ==========================================
// 4. DELETE BOOKING
// ==========================================
router.delete("/bookings/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Booking record removed permanently.",
    });
  } catch (error) {
    console.error("DELETE BOOKING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete booking.",
    });
  }
});

module.exports = router;

