const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");
const ListingMachine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Booking = require("../models/BookingMachine.js");
const Review = require("../models/Review.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// GET ADMIN DASHBOARD OVERVIEW & METRICS
// ==========================================
router.get("/dashboard/stats", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalFarmers,
      totalLabourUsers,
      totalAdmins,
      totalMachines,
      totalLabour,
      totalTransport,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      acceptedBookings,
      pendingDriverApplications,
      totalReviews,
      recentBookingsRaw,
      recentApplicationsRaw,
      recentUsersRaw,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Driver" }),
      User.countDocuments({ role: "Farmer" }),
      User.countDocuments({ role: { $in: ["Labour", "labour"] } }),
      User.countDocuments({ role: { $in: ["Admin", "admin"] } }),
      ListingMachine.countDocuments(),
      Labour.countDocuments(),
      Transport.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Pending" }),
      Booking.countDocuments({ status: "Completed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      Booking.countDocuments({ status: "Accepted" }),
      User.countDocuments({ driverApplicationStatus: "Pending" }),
      Review.countDocuments(),
      Booking.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("customer", "fullName phone")
        .populate("owner", "fullName phone")
        .lean(),
      User.find({
        driverApplicationStatus: { $in: ["Pending", "Approved", "Suspected", "Rejected"] },
      })
        .sort({ driverApplicationDate: -1, updatedAt: -1 })
        .limit(5)
        .select(
          "fullName phone driverVehicleType driverVehicleNumber driverExperience driverApplicationStatus driverApplicationDate driverEquipmentImage"
        )
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select("fullName phone email role createdAt isActive driverApplicationStatus")
        .lean(),
    ]);

    const totalListings = totalMachines + totalLabour + totalTransport;

    // Format recent bookings for UI table
    const recentBookings = recentBookingsRaw.map((b) => ({
      _id: b._id,
      customer: b.customer?.fullName || b.customerName || "Customer",
      customerPhone: b.customer?.phone || b.customerPhone || "N/A",
      driver: b.owner?.fullName || "Assigned Driver",
      driverPhone: b.owner?.phone || "N/A",
      bookingType: b.bookingType || "Single",
      item: b.requestType || "Machine",
      date: b.bookingDate || b.createdAt,
      status: b.status || "Pending",
      amount: b.finalPrice || b.totalPrice || b.earning || 0,
    }));

    // Format recent driver applications
    const recentDriverApplications = recentApplicationsRaw.map((a) => ({
      _id: a._id,
      name: a.fullName || "Driver Applicant",
      phone: a.phone || "N/A",
      vehicleType: a.driverVehicleType || "Tractor",
      vehicleNumber: a.driverVehicleNumber || "N/A",
      experience: a.driverExperience != null ? `${a.driverExperience} yrs` : "N/A",
      status: a.driverApplicationStatus || "Pending",
      date: a.driverApplicationDate || a.updatedAt,
      image: a.driverEquipmentImage?.url || null,
    }));

    // Format recent users
    const recentUsers = recentUsersRaw.map((u) => ({
      _id: u._id,
      name: u.fullName || "User",
      phone: u.phone || "N/A",
      email: u.email || "",
      role: u.role || "Farmer",
      joinedDate: u.createdAt,
      status: u.isActive !== false ? "Active" : "Suspended",
    }));

    // Chart datasets
    const charts = {
      bookingStatus: [
        { label: "Pending", count: pendingBookings, color: "#f59e0b" },
        { label: "Accepted", count: acceptedBookings, color: "#3b82f6" },
        { label: "Completed", count: completedBookings, color: "#10b981" },
        { label: "Cancelled", count: cancelledBookings, color: "#ef4444" },
      ],
      listingCategories: [
        { label: "Machines & Tractors", count: totalMachines, color: "#059669" },
        { label: "Labour Services", count: totalLabour, color: "#0284c7" },
        { label: "Transport Vehicles", count: totalTransport, color: "#d97706" },
      ],
      userRoles: [
        { label: "Farmers", count: totalFarmers, color: "#16a34a" },
        { label: "Drivers", count: totalDrivers, color: "#2563eb" },
        { label: "Labour Providers", count: totalLabourUsers, color: "#06b6d4" },
        { label: "Admins", count: totalAdmins, color: "#9333ea" },
      ],
    };

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalDrivers,
        totalFarmers,
        totalLabourUsers,
        totalAdmins,
        totalMachines,
        totalLabour,
        totalTransport,
        totalListings,
        totalBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,
        acceptedBookings,
        pendingDriverApplications,
        totalReviews,
      },
      recentBookings,
      recentDriverApplications,
      recentUsers,
      charts,
    });
  } catch (error) {
    console.error("ADMIN DASHBOARD STATS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard statistics.",
    });
  }
});

module.exports = router;

