const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Labour = require("../models/Labour.js");
const Booking = require("../models/BookingMachine.js");
const User = require("../models/Owner.js");
const { upload } = require("../middleware/upload.js");
const { isLoggedIn, isLabour } = require("../middleware/auth.js");
const { filterAndRankByLocation, getApproximateServiceCoordinates } = require("../utils/locationService.js");

const OTP_SECRET = process.env.SESSION_SECRET || "workshetu-otp-secret-salt-2025-v1";
const OTP_ENCRYPTION_KEY = crypto.createHash("sha256").update(OTP_SECRET).digest(); // 32 bytes

function encryptOtp(plainOtp) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", OTP_ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(plainOtp), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decryptOtp(cipherText) {
  if (!cipherText || !cipherText.includes(":")) return null;
  const [ivHex, encrypted] = cipherText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", OTP_ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function hashOtp(plainOtp) {
  return crypto.createHash("sha256").update(String(plainOtp).trim()).digest("hex");
}

const DEFAULT_LABOUR_IMAGE = {
  url: "https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=600&q=80",
  filename: "default-labour-avatar"
};

// Standard Labour Categories for WorkShetu
const DEFAULT_CATEGORIES = [
  "General Agricultural Labour",
  "Sowing & Planting",
  "Harvesting",
  "Irrigation Assistance",
  "Weeding & Field Preparation",
  "Fruit & Vegetable Picking",
  "Loading & Unloading",
  "Tractor Driver",
  "Harvester Operator",
  "Loader Operator",
  "Spray Machine Operator",
  "Farm Worker",
  "Electrician",
  "Mechanical",
  "Welder",
  "Plumber",
  "Helper"
];

function safePublicCoordinates(worker) {
  if (!worker || worker.latitude == null || worker.longitude == null || worker.latitude === "" || worker.longitude === "") return null;
  const latitude = Number(worker.latitude);
  const longitude = Number(worker.longitude);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100
  };
}


// ======================================================
// 1. PUBLIC MARKETPLACE ROUTES
// ======================================================

// GET /api/labour/profile-status - Resolve the authenticated user's provider destinations
router.get("/profile-status", isLoggedIn, async (req, res) => {
  try {
    const [labourProfiles, user] = await Promise.all([
      Labour.find({ owner: req.user._id })
        .select("_id status availability")
        .sort({ createdAt: -1 })
        .lean(),
      User.findById(req.user._id)
        .select("role isAdmin driverApplicationStatus isActive")
        .lean()
    ]);

    const isAdmin = Boolean(user?.isAdmin) || String(user?.role || "").toLowerCase() === "admin";
    const hasDriverProfile =
      !isAdmin &&
      (String(user?.role || "").toLowerCase() === "driver" ||
        user?.driverApplicationStatus === "Approved");
    const hasLabourProfile = labourProfiles.length > 0;
    const pendingLabourProfile = labourProfiles.find((profile) => profile.status === "Pending");

    return res.json({
      success: true,
      profileStatus: {
        hasLabourProfile,
        hasDriverProfile,
        hasBothProfiles: hasLabourProfile && hasDriverProfile,
        hasIncompleteLabourRegistration:
          String(user?.role || "").toLowerCase() === "labour" && !hasLabourProfile,
        pendingLabourProfile: pendingLabourProfile || null,
        driverApplicationStatus: user?.driverApplicationStatus || "None",
        isAdmin
      }
    });
  } catch (error) {
    console.error("GET LABOUR PROFILE STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve provider profile status."
    });
  }
});

// GET /api/labour/categories - Return available categories and counts
router.get("/categories", async (req, res) => {
  try {
    const counts = await Labour.aggregate([
      { $match: { availability: { $ne: "Hidden" }, status: { $ne: "Rejected" } } },
      { $group: { _id: "$labourType", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach((c) => {
      if (c._id) countMap[c._id] = c.count;
    });

    const categoryList = DEFAULT_CATEGORIES.map((name) => ({
      name,
      count: countMap[name] || 0
    }));

    // Add any custom categories present in DB
    counts.forEach((c) => {
      if (c._id && !DEFAULT_CATEGORIES.includes(c._id)) {
        categoryList.push({ name: c._id, count: c.count });
      }
    });

    return res.json({ success: true, categories: categoryList });
  } catch (error) {
    console.error("GET LABOUR CATEGORIES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch categories." });
  }
});

// GET /api/labour - Fetch available labour listings with rich search and location-based filters
router.get("/", async (req, res) => {
  try {
    const {
      category,
      search,
      city,
      location,
      skills,
      latitude,
      longitude,
      radiusKm = 5,
      minPrice,
      maxPrice,
      minExperience,
      availability,
      sort = "newest",
      limit = 50,
      page = 1
    } = req.query;

    const query = {
      status: { $ne: "Rejected" }
    };

    // Filter by availability
    if (availability && ["Available", "Booked"].includes(availability)) {
      query.availability = availability;
    } else {
      query.availability = { $ne: "Hidden" };
    }

    // Category filter
    if (category && category !== "all" && category !== "All") {
      const catRegex = new RegExp(`^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      query.labourType = catRegex;
    }

    // Wage rate filter
    if (minPrice != null || maxPrice != null) {
      query.price = {};
      if (minPrice != null && !isNaN(Number(minPrice))) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice != null && !isNaN(Number(maxPrice))) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // Experience filter
    if (minExperience != null && !isNaN(Number(minExperience))) {
      query.experience = { $gte: Number(minExperience) };
    }

    if (skills && skills.trim()) {
      const skillRegex = new RegExp(skills.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.skills = skillRegex;
    }

    // Text search
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { name: searchRegex },
        { labourType: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
        { skills: searchRegex },
        { serviceArea: searchRegex }
      ];
    }

    // Cache inactive user exclusions for 30s to eliminate redundant full table scans on users
    if (!global.__workshetu_inactiveUserCache || Date.now() - global.__workshetu_inactiveUserTime > 30000) {
      const inactiveUsers = await User.find({ isActive: false }).select("_id").lean();
      global.__workshetu_inactiveUserCache = inactiveUsers.map((u) => u._id);
      global.__workshetu_inactiveUserTime = Date.now();
    }
    const inactiveUserIds = global.__workshetu_inactiveUserCache || [];
    if (inactiveUserIds.length) {
      query.owner = { $nin: inactiveUserIds };
    }

    const rawWorkers = await Labour.find(query)
      .select("name labourType category subProfession skills experience price wageRate pricingUnit location serviceLocation serviceRadiusKm serviceArea availability status image rating reviewCount publicLocation latitude longitude owner createdAt")
      .populate("owner", "fullName phone email location profileImage")
      .lean();

    const userLat = latitude != null && latitude !== ""
      ? Number(latitude)
      : req.user?.latitude != null ? Number(req.user.latitude) : null;
    const userLon = longitude != null && longitude !== ""
      ? Number(longitude)
      : req.user?.longitude != null ? Number(req.user.longitude) : null;
    const userCity = city || location || req.user?.location || "";

    const userLocation = {
      latitude: userLat,
      longitude: userLon,
      city: userCity,
      location: userCity
    };

    const parsedRadius = Math.min(Math.max(Number(radiusKm) || 5, 1), 200);

    const locationResult = filterAndRankByLocation(rawWorkers, {
      userLocation,
      radiusKm: parsedRadius,
      locationField: "location",
      progressiveRadius: true,
      isLabour: true
    });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    if (locationResult.locationRequired) {
      return res.json({
        success: true,
        locationRequired: true,
        message: "Location permission required. Enable GPS to view workers near you.",
        userCity: "",
        userCoordinates: null,
        radiusKm: parsedRadius,
        appliedRadiusKm: parsedRadius,
        initialRadiusKm: parsedRadius,
        isExpandedRadius: false,
        nearbyCount: 0,
        sameCityCount: 0,
        nearbyWorkers: [],
        sameCityWorkers: [],
        workers: [],
        featuredWorkers: [],
        total: 0,
        page: 1,
        totalPages: 1
      });
    }

    const merged = locationResult.merged;
    const paginatedWorkers = merged.slice(skip, skip + limitNum);
    const locationFeatured = [...merged]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0) || (b.experience || 0) - (a.experience || 0))
      .slice(0, 4);

    return res.json({
      success: true,
      locationRequired: false,
      userCity: locationResult.userCity,
      userCoordinates: locationResult.userCoordinates,
      radiusKm: locationResult.appliedRadiusKm || locationResult.radiusKm,
      appliedRadiusKm: locationResult.appliedRadiusKm || locationResult.radiusKm,
      initialRadiusKm: locationResult.initialRadiusKm || parsedRadius,
      isExpandedRadius: Boolean(locationResult.isExpandedRadius),
      nearbyCount: locationResult.nearbyCount,
      sameCityCount: locationResult.sameCityCount,
      total: merged.length,
      page: pageNum,
      totalPages: Math.ceil(merged.length / limitNum) || 1,
      nearbyWorkers: locationResult.nearby,
      sameCityWorkers: locationResult.sameCity,
      workers: paginatedWorkers,
      featuredWorkers: locationFeatured
    });
  } catch (error) {
    console.error("GET LABOUR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load labour listings."
    });
  }
});

// GET /api/labour/bookings - Authenticated customer's Labour bookings
const getCustomerLabourBookings = async (req, res) => {
  try {
    const customerId = req.user?._id;
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { status } = req.query;

    const query = {
      customer: customerId,
      requestType: "Labour"
    };

    if (status && status !== "all" && status !== "All") {
      if (status === "active" || status === "Active") {
        query.status = { $in: ["Pending", "Accepted"] };
      } else if (status === "rejected" || status === "Rejected") {
        query.status = { $in: ["Rejected", "Cancelled", "Expired"] };
      } else {
        query.status = status;
      }
    }

    const rawBookings = await Booking.find(query)
      .select("+completionOtpCipher +completionOtpExpiresAt")
      .sort({ createdAt: -1 })
      .populate("itemId", "name labourType category image location price pricingUnit experienceYears phone")
      .populate("owner", "fullName location profileImage phone")
      .lean();

    const now = Date.now();
    const safeBookings = rawBookings.map((b) => {
      const isConfirmed = ["Accepted", "Completed"].includes(b.status);

      // 1. Contact Privacy: worker phone number is ONLY visible if booking is Accepted or Completed
      const workerPhone = isConfirmed
        ? (b.owner?.phone || b.itemId?.phone || "")
        : "";

      // Mask owner & item phone if not confirmed
      if (!isConfirmed) {
        if (b.owner) b.owner.phone = "";
        if (b.itemId && typeof b.itemId === "object") b.itemId.phone = "";
      } else {
        if (b.owner) b.owner.phone = workerPhone;
      }

      // 2. Customer OTP Display Logic
      let plainOtp = null;
      let hasActiveOtp = false;

      if (b.status === "Accepted") {
        const expiresAt = b.completionOtpExpiresAt ? new Date(b.completionOtpExpiresAt).getTime() : 0;
        if (b.completionOtpCipher && expiresAt > now) {
          try {
            plainOtp = decryptOtp(b.completionOtpCipher);
            hasActiveOtp = Boolean(plainOtp);
          } catch (e) {
            plainOtp = null;
            hasActiveOtp = false;
          }
        }
      }

      // Never expose completionOtpCipher or completionOtp hash
      delete b.completionOtpCipher;
      delete b.completionOtp;

      // Safe worker profile handling with graceful fallback
      const isWorkerMissing = !b.itemId || typeof b.itemId !== "object";
      const workerProfileUnavailable = isWorkerMissing && !b.owner?.fullName;
      if (workerProfileUnavailable) {
        console.warn(`[LabourBookings] Notice: Booking ${b.bookingRef || b._id} references missing or deleted worker profile.`);
      }

      const workerId = b.itemId?._id
        ? String(b.itemId._id)
        : (b.itemId && mongoose.isValidObjectId(b.itemId) ? String(b.itemId) : null);

      return {
        ...b,
        workerPhone,
        completionOtp: plainOtp,
        hasActiveOtp,
        workerId,
        workerProfileUnavailable,
        workerName: b.itemId?.name || b.owner?.fullName || "Worker profile unavailable",
        workerSkill: b.itemId?.labourType || b.itemId?.category || b.taskCategory || "Agricultural Labour",
        workerImage: b.itemId?.image?.url || b.itemId?.image || b.owner?.profileImage?.url || b.owner?.profileImage || null,
        workerLocation: b.itemId?.location || b.owner?.location || "",
        reference: b.bookingRef || `LB-${String(b._id).slice(-6).toUpperCase()}`
      };
    });

    return res.json({
      success: true,
      count: safeBookings.length,
      bookings: safeBookings
    });
  } catch (error) {
    console.error("GET CUSTOMER LABOUR BOOKINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load customer labour bookings."
    });
  }
};

router.get("/bookings", isLoggedIn, getCustomerLabourBookings);
router.get("/my-bookings", isLoggedIn, getCustomerLabourBookings);

// GET /api/labour/:id - Fetch single worker profile with public details
router.get("/:id", async (req, res, next) => {
  try {
    const RESERVED_KEYWORDS = ["bookings", "my-bookings", "categories", "profile-status", "provider", "apply"];
    if (RESERVED_KEYWORDS.includes(req.params.id)) {
      return next();
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid worker ID." });
    }

    const worker = await Labour.findById(req.params.id)
      .populate("owner", "fullName location profileImage isActive")
      .lean();

    if (!worker || worker.availability === "Hidden") {
      return res.status(404).json({ success: false, message: "Labour profile not found." });
    }

    // Sanitize owner to prevent exposing sensitive internal documents
    const sanitizedOwner = worker.owner
      ? {
          _id: worker.owner._id,
          fullName: worker.owner.fullName,
          location: worker.owner.location,
          profileImage: worker.owner.profileImage
        }
      : null;
    const publicWorker = { ...worker };
    delete publicWorker.phone;
    delete publicWorker.latitude;
    delete publicWorker.longitude;
    const approxCoords = getApproximateServiceCoordinates(worker);
    publicWorker.locationVisibility = {
      mapVisible: Boolean(approxCoords),
      publicLocation: worker.publicLocation || worker.serviceLocation || worker.location || null,
      serviceRadiusKm: worker.serviceRadiusKm || null,
      coordinates: approxCoords,
      isCityCenter: approxCoords?.isCityCenter || false
    };

    return res.json({
      success: true,
      worker: {
        ...publicWorker,
        owner: sanitizedOwner
      }
    });
  } catch (error) {
    console.error("GET LABOUR BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load worker details." });
  }
});

// POST /api/labour/book - Farmer books a labour service
router.post("/book", isLoggedIn, async (req, res) => {
  try {
    const {
      itemId,
      workerId,
      labourId,
      taskCategory,
      taskDescription,
      daysRequired = 1,
      workerCount = 1,
      bookingDate,
      preferredTime = "Morning (8:00 AM)",
      customerLocation,
      latitude,
      longitude,
      message
    } = req.body;

    const rawWorkerId = itemId || workerId || labourId || (typeof req.body.worker === "object" ? req.body.worker?._id : req.body.worker);
    const targetId = (typeof rawWorkerId === "object" && rawWorkerId?._id) ? String(rawWorkerId._id) : String(rawWorkerId || "").trim();

    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ success: false, message: "A valid worker ID is required." });
    }

    const days = Math.max(1, parseInt(daysRequired, 10) || 1);

    // Look up by Labour listing ID first, then fallback to owner (User) ID
    let worker = await Labour.findById(targetId);
    if (!worker) {
      worker = await Labour.findOne({ owner: targetId });
    }

    if (!worker) {
      return res.status(404).json({ success: false, message: "Labour listing not found." });
    }

    if (worker.availability !== "Available") {
      return res.status(400).json({
        success: false,
        message: "This worker is currently not available for new bookings."
      });
    }

    // Prevent booking own service
    const workerOwnerId = String(worker.owner?._id || worker.owner);
    if (workerOwnerId === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own listing."
      });
    }

    // Validate booking date
    const parsedDate = bookingDate ? new Date(bookingDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return res.status(400).json({
        success: false,
        message: "Booking date cannot be in the past."
      });
    }

    // Prevent duplicate pending booking for the same customer, worker and date
    const existingPending = await Booking.findOne({
      requestType: "Labour",
      itemId: worker._id,
      customer: req.user._id,
      status: "Pending",
      bookingDate: {
        $gte: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()),
        $lt: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate() + 1)
      }
    });

    if (existingPending) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending booking request with this worker for that date."
      });
    }

    const unitPrice = Number(worker.price) || 0;
    const totalPrice = unitPrice * days;

    const booking = new Booking({
      requestType: "Labour",
      bookingType: "Single",
      itemId: worker._id,
      owner: worker.owner,
      customer: req.user._id,
      customerName: (req.user.fullName || req.user.name || "Customer").trim(),
      customerPhone: (req.user.phone || req.body.customerPhone || "9999999999").trim(),
      customerLocation: (customerLocation || req.body.customerLocation || req.user.location || worker.location || "Farm Work Site").trim(),
      customerLatitude: latitude != null ? Number(latitude) : req.user.latitude,
      customerLongitude: longitude != null ? Number(longitude) : req.user.longitude,
      taskCategory: (taskCategory || worker.labourType || worker.category || "General Farm Work").trim(),
      taskDescription: (taskDescription || message || "Labour service request").trim(),
      daysRequired: days,
      workerCount: 1, // Safely default worker count to 1 for database schema compatibility
      unitPrice,
      pricingUnit: worker.pricingUnit || "per day",
      totalPrice,
      basePrice: unitPrice,
      originalPrice: totalPrice,
      finalPrice: totalPrice,
      bookingDate: parsedDate,
      preferredTime: String(preferredTime || "Morning (8:00 AM)").trim(),
      message: (message || "").trim(),
      status: "Pending"
    });

    const bookingRef = `LB-${String(booking._id).slice(-6).toUpperCase()}`;
    booking.bookingRef = bookingRef;

    await booking.save();
    await booking.populate("owner", "fullName location profileImage");

    const safeBooking = booking.toObject();
    if (safeBooking.owner) {
      delete safeBooking.owner.phone;
    }
    safeBooking.reference = bookingRef;

    return res.status(201).json({
      success: true,
      message: "Labour booking request sent successfully!",
      booking: safeBooking,
      reference: bookingRef
    });
  } catch (error) {
    console.error("BOOK LABOUR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit labour booking request."
    });
  }
});

// PUT /api/labour/bookings/:id/cancel - Farmer cancels their own pending labour booking
router.put("/bookings/:id/cancel", isLoggedIn, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (String(booking.customer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this booking." });
    }

    if (booking.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking that is already ${booking.status}.`
      });
    }

    booking.status = "Cancelled";
    booking.cancellationReason = req.body.reason || "Cancelled by farmer";
    booking.statusChangedAt = new Date();
    await booking.save();

    return res.json({
      success: true,
      message: "Booking request cancelled successfully.",
      booking
    });
  } catch (error) {
    console.error("CANCEL LABOUR BOOKING ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel booking." });
  }
});

// ======================================================
// 2. LABOUR PROVIDER DASHBOARD & MANAGEMENT
// ======================================================

// GET /api/labour/provider/dashboard - Overview statistics & recent requests
router.get("/provider/dashboard", isLoggedIn, isLabour, async (req, res) => {
  try {
    const providerId = req.user._id;

    const [
      activeListings,
      pendingListings,
      pendingRequests,
      acceptedRequests,
      completedRequests,
      cancelledRequests,
      rejectedRequests,
      recentRequestsRaw
    ] = await Promise.all([
      Labour.countDocuments({ owner: providerId, availability: "Available", status: "Approved" }),
      Labour.countDocuments({ owner: providerId, status: "Pending" }),
      Booking.countDocuments({ owner: providerId, requestType: "Labour", status: "Pending" }),
      Booking.countDocuments({ owner: providerId, requestType: "Labour", status: "Accepted" }),
      Booking.find({ owner: providerId, requestType: "Labour", status: "Completed" }).select("finalPrice earning").lean(),
      Booking.countDocuments({ owner: providerId, requestType: "Labour", status: "Cancelled" }),
      Booking.countDocuments({ owner: providerId, requestType: "Labour", status: "Rejected" }),
      Booking.find({ owner: providerId, requestType: "Labour" })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate("customer", "fullName phone location profileImage")
        .populate("itemId", "name labourType price pricingUnit location image")
        .lean()
    ]);

    const safeRecentRequests = recentRequestsRaw.map((reqItem) => {
      const isConfirmed = ["Accepted", "Completed"].includes(reqItem.status);
      if (!isConfirmed) {
        if (reqItem.customer) reqItem.customer.phone = "";
        reqItem.customerPhone = "";
      }
      return reqItem;
    });

    const totalEarnings = completedRequests.reduce(
      (sum, b) => sum + (Number(b.earning || b.finalPrice) || 0),
      0
    );

    return res.json({
      success: true,
      stats: {
        activeListings,
        pendingListings,
        pendingRequests,
        acceptedRequests,
        completedCount: completedRequests.length,
        cancelledCount: cancelledRequests,
        rejectedCount: rejectedRequests,
        totalEarnings
      },
      recentRequests: safeRecentRequests
    });
  } catch (error) {
    console.error("LABOUR PROVIDER DASHBOARD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load labour provider dashboard."
    });
  }
});

// GET /api/labour/provider/listings - Get all listings of logged-in provider
router.get("/provider/listings", isLoggedIn, isLabour, async (req, res) => {
  try {
    const listings = await Labour.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, listings });
  } catch (error) {
    console.error("GET PROVIDER LISTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load listings."
    });
  }
});

// POST /api/labour/provider/listings - Create new labour listing
router.post(
  "/provider/listings",
  isLoggedIn,
  isLabour,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        labourType,
        skills,
        experience,
        price,
        pricingUnit = "per day",
        location,
        serviceArea,
        serviceLocation,
        serviceRadiusKm,
        subProfession,
        qualification,
        availabilityDays,
        emergencyAvailability,
        profileVisibility,
        latitude,
        longitude,
        mapVisibilityConsent,
        publicLocation,
        phone,
        description,
        bookingInstructions,
        availability = "Available"
      } = req.body;

      if (!name || !labourType || !price || !location || !phone || !description) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all required fields (Name, Category, Wage Rate, Location, Phone, Description)."
        });
      }

      // Parse skills array if string
      let parsedSkills = [];
      if (Array.isArray(skills)) {
        parsedSkills = skills;
      } else if (typeof skills === "string" && skills.trim()) {
        parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
      }

      const image = req.file
        ? { url: req.file.path, filename: req.file.filename }
        : DEFAULT_LABOUR_IMAGE;

      const newListing = new Labour({
        owner: req.user._id,
        name: name.trim(),
        labourType: labourType.trim(),
        subProfession: (subProfession || "").trim(),
        skills: parsedSkills,
        experience: Math.max(0, Number(experience) || 0),
        qualification: (qualification || "").trim(),
        price: Number(price),
        pricingUnit: ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit) ? pricingUnit : "per day",
        location: location.trim(),
        serviceArea: (serviceArea || "").trim(),
        serviceLocation: (serviceLocation || "").trim(),
        serviceRadiusKm: Number(serviceRadiusKm) || 25,
        availabilityDays: Array.isArray(availabilityDays)
          ? availabilityDays
          : typeof availabilityDays === "string"
            ? availabilityDays.split(",").map((day) => day.trim()).filter(Boolean)
            : [],
        emergencyAvailability: emergencyAvailability === true || emergencyAvailability === "true",
        profileVisibility: profileVisibility !== false && profileVisibility !== "false",
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        mapVisibilityConsent: mapVisibilityConsent === true || mapVisibilityConsent === "true",
        publicLocation: (publicLocation || "").trim().slice(0, 200),
        phone: phone.trim(),
        description: description.trim(),
        bookingInstructions: (bookingInstructions || "Book at least 24 hours in advance.").trim(),
        image,
        availability: ["Available", "Booked", "Hidden"].includes(availability) ? availability : "Available",
        status: "Approved"
      });

      await newListing.save();

      return res.status(201).json({
        success: true,
        message: "Labour listing created successfully!",
        listing: newListing
      });
    } catch (error) {
      console.error("CREATE LABOUR LISTING ERROR:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create labour listing."
      });
    }
  }
);

// PUT /api/labour/provider/listings/:id - Update labour listing
router.put(
  "/provider/listings/:id",
  isLoggedIn,
  isLabour,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ success: false, message: "Invalid listing ID." });
      }

      const listing = await Labour.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found." });
      }

      // Check ownership or Admin role
      const isOwner = String(listing.owner) === String(req.user._id);
      const isAdminUser = req.user.isAdmin === true || String(req.user.role).toLowerCase() === "admin";
      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ success: false, message: "Not authorized to update this listing." });
      }

      const {
        name,
        labourType,
        subProfession,
        skills,
        experience,
        qualification,
        price,
        pricingUnit,
        location,
        serviceArea,
        serviceLocation,
        serviceRadiusKm,
        availabilityDays,
        emergencyAvailability,
        profileVisibility,
        latitude,
        longitude,
        mapVisibilityConsent,
        publicLocation,
        phone,
        description,
        bookingInstructions,
        availability
      } = req.body;

      if (name) listing.name = name.trim();
      if (labourType) listing.labourType = labourType.trim();
      if (subProfession !== undefined) listing.subProfession = subProfession.trim();
      if (skills !== undefined) {
        if (Array.isArray(skills)) listing.skills = skills;
        else if (typeof skills === "string") {
          listing.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (experience != null) listing.experience = Math.max(0, Number(experience));
      if (qualification !== undefined) listing.qualification = qualification.trim();
      if (price != null) {
        listing.price = Number(price);
        listing.wageRate = listing.price;
      }
      if (pricingUnit && ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit)) {
        listing.pricingUnit = pricingUnit;
      }
      if (location) listing.location = location.trim();
      if (serviceArea !== undefined) listing.serviceArea = serviceArea.trim();
      if (serviceLocation !== undefined) listing.serviceLocation = serviceLocation.trim();
      if (serviceRadiusKm != null) listing.serviceRadiusKm = Number(serviceRadiusKm);
      if (availabilityDays !== undefined) {
        listing.availabilityDays = Array.isArray(availabilityDays)
          ? availabilityDays
          : String(availabilityDays).split(",").map((day) => day.trim()).filter(Boolean);
      }
      if (emergencyAvailability !== undefined) listing.emergencyAvailability = emergencyAvailability === true || emergencyAvailability === "true";
      if (profileVisibility !== undefined) listing.profileVisibility = profileVisibility !== false && profileVisibility !== "false";
      if (latitude != null && !isNaN(Number(latitude))) listing.latitude = Number(latitude);
      if (longitude != null && !isNaN(Number(longitude))) listing.longitude = Number(longitude);
      if (mapVisibilityConsent !== undefined) listing.mapVisibilityConsent = mapVisibilityConsent === true || mapVisibilityConsent === "true";
      if (publicLocation !== undefined) listing.publicLocation = String(publicLocation).trim().slice(0, 200);
      if (phone) listing.phone = phone.trim();
      if (description) listing.description = description.trim();
      if (bookingInstructions !== undefined) listing.bookingInstructions = bookingInstructions.trim();
      if (availability && ["Available", "Booked", "Hidden"].includes(availability)) {
        listing.availability = availability;
      }

      if (req.file) {
        listing.image = { url: req.file.path, filename: req.file.filename };
      }

      await listing.save();

      return res.json({
        success: true,
        message: "Listing updated successfully!",
        listing
      });
    } catch (error) {
      console.error("UPDATE LABOUR LISTING ERROR:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update listing."
      });
    }
  }
);

// DELETE /api/labour/provider/listings/:id - Delete labour listing
router.delete("/provider/listings/:id", isLoggedIn, isLabour, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await Labour.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const isOwner = String(listing.owner) === String(req.user._id);
    const isAdminUser = req.user.isAdmin === true || String(req.user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this listing." });
    }

    await Labour.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Labour listing deleted successfully."
    });
  } catch (error) {
    console.error("DELETE LABOUR LISTING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete listing."
    });
  }
});

// GET /api/labour/provider/requests - Incoming booking requests with optional status filter
router.get("/provider/requests", isLoggedIn, isLabour, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {
      owner: req.user._id,
      requestType: "Labour"
    };

    if (status && status !== "all" && status !== "All") {
      query.status = status;
    }

    const requests = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate("customer", "fullName phone location profileImage email")
      .populate("itemId", "name labourType price pricingUnit location image")
      .lean();

    const safeRequests = requests.map((item) => {
      const isConfirmed = ["Accepted", "Completed"].includes(item.status);
      if (!isConfirmed) {
        if (item.customer) item.customer.phone = "";
        item.customerPhone = "";
      }
      return item;
    });

    return res.json({ success: true, requests: safeRequests });
  } catch (error) {
    console.error("GET LABOUR REQUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load booking requests."
    });
  }
});

// PUT /api/labour/provider/requests/:id/:action - Accept, Reject, Complete
router.put("/provider/requests/:id/:action", isLoggedIn, isLabour, async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking request not found." });
    }

    const isOwner = String(booking.owner) === String(req.user._id);
    const isAdminUser = req.user.isAdmin === true || String(req.user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: "Unauthorized action." });
    }

    if (action === "accept") {
      if (booking.status !== "Pending") {
        return res.status(400).json({
          success: false,
          message: `Cannot accept a booking that is currently ${booking.status}.`
        });
      }
      booking.status = "Accepted";
      booking.statusChangedAt = new Date();

      // Automatically generate cryptographically secure 6-digit completion OTP
      const plainOtp = String(crypto.randomInt(100000, 1000000));
      booking.completionOtp = hashOtp(plainOtp);
      booking.completionOtpCipher = encryptOtp(plainOtp);
      booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      booking.otpAttempts = 0;
      booking.otpCooldownUntil = new Date(Date.now() + 60 * 1000);
    } else if (action === "reject") {
      if (booking.status !== "Pending") {
        return res.status(400).json({
          success: false,
          message: `Cannot reject a booking that is currently ${booking.status}.`
        });
      }
      booking.status = "Rejected";
      booking.statusChangedAt = new Date();
      if (req.body.reason) booking.cancellationReason = req.body.reason;
    } else if (action === "complete") {
      return res.status(400).json({
        success: false,
        message: "Work completion requires secure OTP verification. Please verify the customer OTP to complete work."
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Allowed: accept, reject, complete." });
    }

    await booking.save();

    return res.json({
      success: true,
      message: `Booking request marked as ${booking.status}.`,
      booking
    });
  } catch (error) {
    console.error("UPDATE LABOUR REQUEST STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update booking status."
    });
  }
});

// POST /api/labour/provider/requests/:id/request-otp - Labour provider triggers/refreshes OTP
const requestLabourOtpHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(id).select("+completionOtp +completionOtpCipher +completionOtpExpiresAt +otpAttempts +otpCooldownUntil");
    if (!booking || booking.requestType !== "Labour") {
      return res.status(404).json({ success: false, message: "Labour booking request not found." });
    }

    const isOwner = String(booking.owner) === String(req.user._id);
    const isAdminUser = req.user.isAdmin === true || String(req.user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: "Unauthorized action." });
    }

    if (booking.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `OTP can only be generated for Accepted bookings. Current status: ${booking.status}.`
      });
    }

    // Check rate-limiting cooldown (60s)
    const now = Date.now();
    if (booking.otpCooldownUntil && new Date(booking.otpCooldownUntil).getTime() > now) {
      const waitSeconds = Math.ceil((new Date(booking.otpCooldownUntil).getTime() - now) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const plainOtp = String(crypto.randomInt(100000, 1000000));
    booking.completionOtp = hashOtp(plainOtp);
    booking.completionOtpCipher = encryptOtp(plainOtp);
    booking.completionOtpExpiresAt = new Date(now + 10 * 60 * 1000); // 10 minutes
    booking.otpAttempts = 0;
    booking.otpCooldownUntil = new Date(now + 60 * 1000); // 60s cooldown

    await booking.save();

    return res.json({
      success: true,
      message: "Work completion OTP generated. Customer can view it in their bookings.",
      expiresAt: booking.completionOtpExpiresAt,
      cooldownUntil: booking.otpCooldownUntil
    });
  } catch (error) {
    console.error("REQUEST LABOUR OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to generate completion OTP." });
  }
};
router.post("/provider/requests/:id/request-otp", isLoggedIn, isLabour, requestLabourOtpHandler);
router.post("/provider/bookings/:id/request-otp", isLoggedIn, isLabour, requestLabourOtpHandler);

// GET /api/labour/bookings/:id/otp - Farmer views the 6-digit completion OTP for their accepted booking
router.get("/bookings/:id/otp", isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(id).select("+completionOtpCipher +completionOtpExpiresAt");
    if (!booking || booking.requestType !== "Labour") {
      return res.status(404).json({ success: false, message: "Labour booking not found." });
    }

    if (String(booking.customer) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized to view OTP for this booking." });
    }

    if (booking.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `OTP is only available for Accepted bookings. Current status: ${booking.status}.`
      });
    }

    if (!booking.completionOtpExpiresAt || new Date(booking.completionOtpExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        message: "OTP has expired. Please ask the worker to request a new OTP."
      });
    }

    const plainOtp = decryptOtp(booking.completionOtpCipher);
    if (!plainOtp) {
      return res.status(404).json({
        success: false,
        message: "No active OTP found. Please ask the worker to request an OTP."
      });
    }

    return res.json({
      success: true,
      otp: plainOtp,
      expiresAt: booking.completionOtpExpiresAt,
      note: "Share this OTP with the worker only after the work is completely done."
    });
  } catch (error) {
    console.error("GET LABOUR OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve OTP." });
  }
});

// POST /api/labour/provider/requests/:id/verify-otp - Worker submits OTP to complete work
const verifyLabourOtpHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, message: "Please provide a valid 6-digit OTP." });
    }

    const booking = await Booking.findById(id).select("+completionOtp +completionOtpCipher +completionOtpExpiresAt +otpAttempts");
    if (!booking || booking.requestType !== "Labour") {
      return res.status(404).json({ success: false, message: "Labour booking request not found." });
    }

    const isOwner = String(booking.owner) === String(req.user._id);
    const isAdminUser = req.user.isAdmin === true || String(req.user.role).toLowerCase() === "admin";
    if (!isOwner && !isAdminUser) {
      return res.status(403).json({ success: false, message: "Unauthorized action." });
    }

    if (booking.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: `Only Accepted bookings can be verified and completed. Current status: ${booking.status}.`
      });
    }

    // Check maximum attempts (max 5)
    if (booking.otpAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Maximum OTP verification attempts (5) exceeded. Please request a new OTP from the customer."
      });
    }

    // Check expiry
    if (!booking.completionOtpExpiresAt || new Date(booking.completionOtpExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        message: "OTP has expired. Please ask for a new OTP."
      });
    }

    // Compare SHA-256 hashes
    const inputHash = hashOtp(otp);
    const storedHash = booking.completionOtp;

    if (!storedHash || inputHash !== storedHash) {
      booking.otpAttempts = (booking.otpAttempts || 0) + 1;
      await booking.save();
      const remainingAttempts = Math.max(0, 5 - booking.otpAttempts);
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
      });
    }

    // OTP Verified successfully! Mark work completed
    booking.status = "Completed";
    booking.completedAt = new Date();
    booking.workCompletedAt = new Date();
    booking.statusChangedAt = new Date();
    booking.otpVerified = true;
    booking.otpVerifiedAt = new Date();
    booking.earning = booking.finalPrice || booking.totalPrice || 0;
    booking.completionOtp = null;
    booking.completionOtpCipher = null;
    booking.completionOtpExpiresAt = null;

    await booking.save();

    return res.json({
      success: true,
      message: "OTP verified successfully! Work marked as Completed.",
      booking
    });
  } catch (error) {
    console.error("VERIFY LABOUR OTP ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to verify OTP." });
  }
};
router.post("/provider/requests/:id/verify-otp", isLoggedIn, isLabour, verifyLabourOtpHandler);
router.post("/provider/bookings/:id/verify-otp", isLoggedIn, isLabour, verifyLabourOtpHandler);

// GET /api/labour/provider/profile - Get profile of logged-in labour provider
router.get("/provider/profile", isLoggedIn, isLabour, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("fullName phone email location latitude longitude profileImage role isActive")
      .lean();

    return res.json({ success: true, user });
  } catch (error) {
    console.error("GET LABOUR PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load profile." });
  }
});

// PUT /api/labour/provider/profile - Update profile of logged-in labour provider
router.put("/provider/profile", isLoggedIn, isLabour, async (req, res) => {
  try {
    const { fullName, location, latitude, longitude } = req.body;
    const user = await User.findById(req.user._id);

    if (fullName && fullName.trim().length >= 3) user.fullName = fullName.trim();
    if (location !== undefined) user.location = location.trim();
    if (latitude != null && !isNaN(Number(latitude))) user.latitude = Number(latitude);
    if (longitude != null && !isNaN(Number(longitude))) user.longitude = Number(longitude);

    await user.save();

    return res.json({
      success: true,
      message: "Labour profile updated successfully.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        location: user.location,
        latitude: user.latitude,
        longitude: user.longitude,
        role: user.role
      }
    });
  } catch (error) {
    console.error("UPDATE LABOUR PROFILE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// POST /api/labour/apply - Onboard / upgrade user to Labour role & create initial profile listing
router.post("/apply", isLoggedIn, upload.single("image"), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const {
      name,
      labourType,
      skills,
      experience,
      price,
      pricingUnit = "per day",
      location,
      serviceArea,
      phone,
      description,
      subProfession,
      qualification,
      serviceLocation,
      serviceRadiusKm,
      availabilityDays,
      emergencyAvailability,
      profileVisibility,
      latitude,
      longitude,
      mapVisibilityConsent,
      publicLocation
    } = req.body;

    if (user.isAdmin || String(user.role).toLowerCase() === "admin") {
      return res.status(403).json({ success: false, message: "Admins cannot register as labour providers." });
    }

    if (!name?.trim() || !labourType?.trim() || !location?.trim() || !phone?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name, profession, location, phone, and description are required."
      });
    }

    const numericPrice = Number(price);
    const numericExperience = Number(experience);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ success: false, message: "Expected charges must be greater than zero." });
    }
    if (!Number.isFinite(numericExperience) || numericExperience < 0) {
      return res.status(400).json({ success: false, message: "Experience must be a valid non-negative number." });
    }
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid 10-digit Indian mobile number." });
    }

    const existingListing = await Labour.findOne({ owner: user._id }).select("_id status");
    if (existingListing) {
      return res.status(409).json({
        success: false,
        message: "You already have a labour profile. Edit your existing profile instead of creating another one."
      });
    }

    const image = req.file
      ? { url: req.file.path, filename: req.file.filename }
      : DEFAULT_LABOUR_IMAGE;

    let parsedSkills = [];
    if (Array.isArray(skills)) parsedSkills = skills;
    else if (typeof skills === "string" && skills.trim()) {
      parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const listing = new Labour({
      owner: user._id,
      name: name.trim(),
      labourType: labourType.trim(),
      subProfession: (subProfession || "").trim(),
      skills: parsedSkills,
      experience: numericExperience,
      qualification: (qualification || "").trim(),
      price: numericPrice,
      pricingUnit: ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit) ? pricingUnit : "per day",
      location: location.trim(),
      serviceArea: (serviceArea || "").trim(),
      serviceLocation: (serviceLocation || "").trim(),
      serviceRadiusKm: Math.min(Math.max(Number(serviceRadiusKm) || 25, 1), 200),
      availabilityDays: Array.isArray(availabilityDays)
        ? availabilityDays
        : typeof availabilityDays === "string"
          ? availabilityDays.split(",").map((day) => day.trim()).filter(Boolean)
          : [],
      emergencyAvailability: emergencyAvailability === true || emergencyAvailability === "true",
      profileVisibility: true,
      latitude: latitude != null && Number.isFinite(Number(latitude)) ? Number(latitude) : undefined,
      longitude: longitude != null && Number.isFinite(Number(longitude)) ? Number(longitude) : undefined,
      mapVisibilityConsent: mapVisibilityConsent === true || mapVisibilityConsent === "true",
      publicLocation: (publicLocation || "").trim().slice(0, 200),
      phone: phone.trim(),
      description: description.trim(),
      image,
      availability: "Available",
      status: "Approved"
    });

    await listing.save();

    if (String(user.role).toLowerCase() !== "labour") {
      user.role = "Labour";
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Successfully registered as Labour provider!",
      userRole: user.role,
      listing
    });
  } catch (error) {
    console.error("LABOUR APPLY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to complete labour registration."
    });
  }
});

module.exports = router;
