const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");
const ListingMachine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Booking = require("../models/BookingMachine.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. GET PAGINATED USERS WITH SEARCH & FILTERS
// ==========================================
router.get("/users", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, role, status } = req.query;

    const query = {};

    // Search by name, phone, or email
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const searchRegex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { fullName: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { location: searchRegex },
      ];
    }

    // Role filter
    if (role && role !== "all") {
      if (role.toLowerCase() === "admin") {
        query.$or = [
          { role: { $in: ["Admin", "admin"] } },
          { isAdmin: true },
        ];
      } else {
        query.role = new RegExp(`^${role}$`, "i");
      }
    }

    // Status filter
    if (status && status !== "all") {
      if (status === "active") {
        query.isActive = { $ne: false };
      } else if (status === "suspended") {
        query.isActive = false;
      }
    }

    const [totalUsers, usersRaw] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-hash -salt")
        .lean(),
    ]);

    // Aggregate counts for each user (listings & bookings)
    const usersWithStats = await Promise.all(
      usersRaw.map(async (u) => {
        const [machineCount, labourCount, transportCount, customerBookings, driverBookings] =
          await Promise.all([
            ListingMachine.countDocuments({ owner: u._id }),
            Labour.countDocuments({ owner: u._id }),
            Transport.countDocuments({ owner: u._id }),
            Booking.countDocuments({ customer: u._id }),
            Booking.countDocuments({ owner: u._id }),
          ]);

        const totalListings = machineCount + labourCount + transportCount;
        const totalBookings = customerBookings + driverBookings;

        const isUserAdmin =
          u.isAdmin === true || (u.role && u.role.toLowerCase() === "admin");

        return {
          ...u,
          isAdmin: isUserAdmin,
          role: isUserAdmin ? "Admin" : u.role || "Farmer",
          listingsCount: totalListings,
          bookingsCount: totalBookings,
          customerBookingsCount: customerBookings,
          driverBookingsCount: driverBookings,
          status: u.isActive !== false ? "Active" : "Suspended",
        };
      })
    );

    return res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit) || 1,
      },
    });
  } catch (error) {
    console.error("GET ADMIN USERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users list.",
    });
  }
});

// ==========================================
// 2. GET SINGLE USER DETAILS WITH ACTIVITY
// ==========================================
router.get("/users/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-hash -salt")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const [machines, labour, transport, recentBookings] = await Promise.all([
      ListingMachine.find({ owner: user._id }).limit(5).lean(),
      Labour.find({ owner: user._id }).limit(5).lean(),
      Transport.find({ owner: user._id }).limit(5).lean(),
      Booking.find({
        $or: [{ customer: user._id }, { owner: user._id }],
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("customer", "fullName phone")
        .populate("owner", "fullName phone")
        .lean(),
    ]);

    const isUserAdmin =
      user.isAdmin === true || (user.role && user.role.toLowerCase() === "admin");

    return res.json({
      success: true,
      user: {
        ...user,
        isAdmin: isUserAdmin,
        role: isUserAdmin ? "Admin" : user.role || "Farmer",
        status: user.isActive !== false ? "Active" : "Suspended",
      },
      activity: {
        listings: {
          machines,
          labour,
          transport,
          total: machines.length + labour.length + transport.length,
        },
        recentBookings,
      },
    });
  } catch (error) {
    console.error("GET SINGLE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user details.",
    });
  }
});

// ==========================================
// 3. UPDATE USER (ROLE, NAME, PHONE, LOCATION)
// ==========================================
router.put("/users/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const { fullName, phone, email, role, location } = req.body;

    const currentIsAdmin =
      user.isAdmin === true || (user.role && user.role.toLowerCase() === "admin");

    // SAFETY CHECK: Prevent demoting the last Admin account
    if (role && role !== "Admin" && role !== "admin" && currentIsAdmin) {
      const otherAdminsCount = await User.countDocuments({
        _id: { $ne: user._id },
        $or: [{ role: { $in: ["Admin", "admin"] } }, { isAdmin: true }],
      });

      if (otherAdminsCount <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Safety restriction: Cannot demote the last administrator account. Assign another admin first.",
        });
      }
    }

    // Apply updates
    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (phone && phone.trim()) user.phone = phone.trim();
    if (email !== undefined) user.email = email ? email.trim() : undefined;
    if (location !== undefined) user.location = location ? location.trim() : "";

    if (role) {
      const normalizedRole =
        role.toLowerCase() === "admin"
          ? "Admin"
          : role.toLowerCase() === "driver"
          ? "Driver"
          : "Farmer";

      user.role = normalizedRole;
      user.isAdmin = normalizedRole === "Admin";
    }

    await user.save();

    return res.json({
      success: true,
      message: "User updated successfully.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        location: user.location,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update user.",
    });
  }
});

// ==========================================
// 4. BLOCK / UNBLOCK USER (SET STATUS)
// ==========================================
router.patch("/users/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // SAFETY CHECK 1: Admin cannot block own account
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block or suspend your own administrator account.",
      });
    }

    const { isActive } = req.body;
    const willBeSuspended = isActive === false;

    // SAFETY CHECK 2: Cannot suspend the last active Admin account
    const isTargetAdmin =
      user.isAdmin === true || (user.role && user.role.toLowerCase() === "admin");

    if (isTargetAdmin && willBeSuspended) {
      const otherActiveAdminsCount = await User.countDocuments({
        _id: { $ne: user._id },
        $or: [{ role: { $in: ["Admin", "admin"] } }, { isAdmin: true }],
        isActive: { $ne: false },
      });

      if (otherActiveAdminsCount <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Safety restriction: Cannot suspend the last active administrator account.",
        });
      }
    }

    user.isActive = Boolean(isActive);
    await user.save();

    return res.json({
      success: true,
      message: user.isActive
        ? `Account for ${user.fullName} has been unblocked.`
        : `Account for ${user.fullName} has been suspended.`,
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("TOGGLE USER STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
});

// ==========================================
// 5. DELETE USER (WITH LAST ADMIN SAFEGUARD)
// ==========================================
router.delete("/users/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // SAFETY CHECK 1: Cannot delete own account
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own administrator account.",
      });
    }

    // SAFETY CHECK 2: Cannot delete the last Admin account
    const isTargetAdmin =
      user.isAdmin === true || (user.role && user.role.toLowerCase() === "admin");

    if (isTargetAdmin) {
      const otherAdminsCount = await User.countDocuments({
        _id: { $ne: user._id },
        $or: [{ role: { $in: ["Admin", "admin"] } }, { isAdmin: true }],
      });

      if (otherAdminsCount <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Safety restriction: Cannot delete the last administrator account. There must always be at least one active Admin.",
        });
      }
    }

    await User.findByIdAndDelete(user._id);

    return res.json({
      success: true,
      message: `User ${user.fullName} was permanently deleted.`,
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete user.",
    });
  }
});

module.exports = router;

