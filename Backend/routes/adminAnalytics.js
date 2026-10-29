const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");
const Booking = require("../models/BookingMachine.js");
const Machine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Review = require("../models/Review.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// Helper to calculate date range based on timeframe query
function getDateRange(timeframe) {
  const now = new Date();
  let startDate = new Date();
  let groupBy = "%Y-%m-%d"; // day by default

  switch (timeframe) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      groupBy = "%Y-%m"; // month
      break;
    case "all":
      startDate = new Date(2020, 0, 1);
      groupBy = "%Y-%m";
      break;
    case "30d":
    default:
      startDate.setDate(now.getDate() - 30);
      break;
  }

  return { startDate, endDate: now, groupBy };
}

// Helper to fill zero-count time series gaps
function generateTimeSlots(startDate, endDate, groupBy) {
  const slots = [];
  const current = new Date(startDate);

  if (groupBy === "%Y-%m") {
    current.setDate(1);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      slots.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      slots.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
  }

  return slots;
}

// ==========================================
// GET /api/admin/analytics/overview
// ==========================================
router.get("/analytics/overview", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { timeframe = "30d" } = req.query;
    const { startDate, endDate, groupBy } = getDateRange(timeframe);

    // 1. Overall counts
    const [
      totalUsers,
      totalFarmers,
      totalDrivers,
      totalMachines,
      totalLabour,
      totalTransport,
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      acceptedBookings,
      rejectedBookings,
      totalReviews,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Farmer" }),
      User.countDocuments({ role: { $in: ["Driver", "driver"] } }),
      Machine.countDocuments(),
      Labour.countDocuments(),
      Transport.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Completed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      Booking.countDocuments({ status: "Pending" }),
      Booking.countDocuments({ status: "Accepted" }),
      Booking.countDocuments({ status: "Rejected" }),
      Review.countDocuments(),
    ]);

    const totalListings = totalMachines + totalLabour + totalTransport;

    // 2. Financial totals
    const financialStats = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalGross: {
            $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$totalPrice", 0] }] },
          },
          completedGross: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Completed"] },
                { $ifNull: ["$finalPrice", { $ifNull: ["$totalPrice", 0] }] },
                0,
              ],
            },
          },
        },
      },
    ]);

    const grossVolume = financialStats[0]?.totalGross || 0;
    const completedVolume = financialStats[0]?.completedGross || 0;

    // 3. User Growth Timeline
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupBy, date: "$createdAt" } },
            role: { $toLower: "$role" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // 4. Booking Growth Timeline (Total, Completed, Cancelled)
    const bookingGrowthAgg = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupBy, date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
          amount: {
            $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$totalPrice", 0] }] },
          },
        },
      },
    ]);

    // 5. Listing Growth Timeline
    const [machineGrowthAgg, labourGrowthAgg, transportGrowthAgg] = await Promise.all([
      Machine.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupBy, date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Labour.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupBy, date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Transport.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: groupBy, date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build continuous chronological slots
    const timeSlots = generateTimeSlots(startDate, endDate, groupBy);

    // Map User Growth timeline
    const userGrowthMap = {};
    timeSlots.forEach((slot) => {
      userGrowthMap[slot] = { date: slot, farmers: 0, drivers: 0, total: 0 };
    });
    userGrowthAgg.forEach((item) => {
      const slot = item._id.date;
      if (userGrowthMap[slot]) {
        const role = item._id.role;
        if (role === "farmer") userGrowthMap[slot].farmers += item.count;
        else if (role === "driver") userGrowthMap[slot].drivers += item.count;
        userGrowthMap[slot].total += item.count;
      }
    });
    const userGrowth = Object.values(userGrowthMap);

    // Map Booking Growth timeline
    const bookingGrowthMap = {};
    timeSlots.forEach((slot) => {
      bookingGrowthMap[slot] = {
        date: slot,
        total: 0,
        completed: 0,
        cancelled: 0,
        pending: 0,
        volume: 0,
      };
    });
    bookingGrowthAgg.forEach((item) => {
      const slot = item._id.date;
      if (bookingGrowthMap[slot]) {
        const status = item._id.status;
        bookingGrowthMap[slot].total += item.count;
        bookingGrowthMap[slot].volume += item.amount;
        if (status === "Completed") bookingGrowthMap[slot].completed += item.count;
        else if (status === "Cancelled") bookingGrowthMap[slot].cancelled += item.count;
        else if (status === "Pending") bookingGrowthMap[slot].pending += item.count;
      }
    });
    const bookingGrowth = Object.values(bookingGrowthMap);

    // Map Listing Growth timeline
    const listingGrowthMap = {};
    timeSlots.forEach((slot) => {
      listingGrowthMap[slot] = {
        date: slot,
        machines: 0,
        labour: 0,
        transport: 0,
        total: 0,
      };
    });
    machineGrowthAgg.forEach((item) => {
      if (listingGrowthMap[item._id]) {
        listingGrowthMap[item._id].machines += item.count;
        listingGrowthMap[item._id].total += item.count;
      }
    });
    labourGrowthAgg.forEach((item) => {
      if (listingGrowthMap[item._id]) {
        listingGrowthMap[item._id].labour += item.count;
        listingGrowthMap[item._id].total += item.count;
      }
    });
    transportGrowthAgg.forEach((item) => {
      if (listingGrowthMap[item._id]) {
        listingGrowthMap[item._id].transport += item.count;
        listingGrowthMap[item._id].total += item.count;
      }
    });
    const listingGrowth = Object.values(listingGrowthMap);

    // 6. Machine Categories Breakdown
    const machineCategoriesAgg = await Machine.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const machineCategories = machineCategoriesAgg.map((item) => ({
      category: item._id || "Other",
      count: item.count,
      avgPrice: Math.round(item.avgPrice || 0),
    }));

    // 7. Booking Status Breakdown
    const bookingStatusBreakdown = [
      { status: "Completed", count: completedBookings, color: "#10B981" },
      { status: "Accepted", count: acceptedBookings, color: "#059669" },
      { status: "Pending", count: pendingBookings, color: "#F59E0B" },
      { status: "Cancelled", count: cancelledBookings, color: "#EF4444" },
      { status: "Rejected", count: rejectedBookings, color: "#9CA3AF" },
    ];

    // 8. Service Request Types (Machine vs Labour vs Transport bookings)
    const serviceTypeAgg = await Booking.aggregate([
      {
        $group: {
          _id: "$requestType",
          count: { $sum: 1 },
          totalAmount: {
            $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$totalPrice", 0] }] },
          },
        },
      },
    ]);

    const serviceTypes = serviceTypeAgg.map((s) => ({
      type: s._id || "Machine",
      count: s.count,
      amount: s.totalAmount || 0,
    }));

    // 9. Popular Locations (from Bookings customerLocation and User locations)
    const locationsAgg = await Booking.aggregate([
      {
        $match: {
          customerLocation: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$customerLocation",
          bookingsCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          totalSpend: {
            $sum: { $ifNull: ["$finalPrice", { $ifNull: ["$totalPrice", 0] }] },
          },
        },
      },
      { $sort: { bookingsCount: -1 } },
      { $limit: 10 },
    ]);

    const popularLocations = locationsAgg.map((loc) => ({
      location: loc._id || "Unknown Location",
      bookings: loc.bookingsCount,
      completed: loc.completedCount,
      spend: loc.totalSpend || 0,
    }));

    return res.json({
      success: true,
      timeframe,
      summary: {
        totalUsers,
        totalFarmers,
        totalDrivers,
        totalListings,
        totalMachines,
        totalLabour,
        totalTransport,
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        totalReviews,
        completionRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
        cancellationRate: totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 100) : 0,
        grossVolume,
        completedVolume,
      },
      trends: {
        userGrowth,
        bookingGrowth,
        listingGrowth,
      },
      breakdowns: {
        bookingStatus: bookingStatusBreakdown,
        machineCategories,
        serviceTypes,
        popularLocations,
      },
    });
  } catch (error) {
    console.error("GET ADMIN ANALYTICS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load platform analytics.",
      error: error.message,
    });
  }
});

module.exports = router;

