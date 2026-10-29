const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Labour = require("../models/Labour.js");
const Booking = require("../models/BookingMachine.js");
const User = require("../models/Owner.js");
const { upload } = require("../middleware/upload.js");
const { isLoggedIn, isLabour } = require("../middleware/auth.js");

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

// ======================================================
// 1. PUBLIC MARKETPLACE ROUTES
// ======================================================

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

// GET /api/labour - Fetch available labour listings with rich search and filters
router.get("/", async (req, res) => {
  try {
    const {
      category,
      search,
      location,
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

    // Location filter
    if (location && location.trim()) {
      const locRegex = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ location: locRegex }, { serviceArea: locRegex }]
      });
    }

    // Exclude listings from suspended/inactive users
    const inactiveUsers = await User.find({ isActive: false }).select("_id").lean();
    if (inactiveUsers.length) {
      query.owner = { $nin: inactiveUsers.map((u) => u._id) };
    }

    // Sort options
    let sortObj = { createdAt: -1 };
    if (sort === "price_asc") sortObj = { price: 1 };
    else if (sort === "price_desc") sortObj = { price: -1 };
    else if (sort === "experience_desc") sortObj = { experience: -1 };
    else if (sort === "rating_desc") sortObj = { rating: -1, reviewCount: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [total, workers] = await Promise.all([
      Labour.countDocuments(query),
      Labour.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate("owner", "fullName phone email location profileImage")
        .lean()
    ]);

    return res.json({
      success: true,
      workers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    console.error("GET LABOUR ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch labour services."
    });
  }
});

// GET /api/labour/:id - Fetch single worker profile with public details
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid worker ID." });
    }

    const worker = await Labour.findById(req.params.id)
      .populate("owner", "fullName phone email location profileImage isActive")
      .lean();

    if (!worker || worker.availability === "Hidden") {
      return res.status(404).json({ success: false, message: "Labour profile not found." });
    }

    // Sanitize owner to prevent exposing sensitive internal documents
    const sanitizedOwner = worker.owner
      ? {
          _id: worker.owner._id,
          fullName: worker.owner.fullName,
          phone: worker.owner.phone,
          location: worker.owner.location,
          profileImage: worker.owner.profileImage
        }
      : null;

    return res.json({
      success: true,
      worker: {
        ...worker,
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

    if (!itemId || !mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: "A valid worker ID is required." });
    }

    const days = Math.max(1, parseInt(daysRequired, 10) || 1);
    const count = Math.max(1, parseInt(workerCount, 10) || 1);

    const worker = await Labour.findById(itemId);
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
    if (String(worker.owner) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own labour listing."
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
    const totalPrice = unitPrice * days * count;

    const booking = new Booking({
      requestType: "Labour",
      bookingType: "Single",
      itemId: worker._id,
      owner: worker.owner,
      customer: req.user._id,
      customerName: req.user.fullName,
      customerPhone: req.user.phone,
      customerLocation: (customerLocation || req.user.location || worker.location || "").trim(),
      customerLatitude: latitude != null ? Number(latitude) : req.user.latitude,
      customerLongitude: longitude != null ? Number(longitude) : req.user.longitude,
      taskCategory: (taskCategory || worker.labourType || "").trim(),
      taskDescription: (taskDescription || message || "").trim(),
      daysRequired: days,
      workerCount: count,
      unitPrice,
      pricingUnit: worker.pricingUnit || "per day",
      totalPrice,
      basePrice: unitPrice,
      originalPrice: totalPrice,
      finalPrice: totalPrice,
      bookingDate: parsedDate,
      preferredTime: String(preferredTime || "").trim(),
      message: (message || "").trim(),
      status: "Pending"
    });

    await booking.save();
    await booking.populate("owner", "fullName phone");

    return res.status(201).json({
      success: true,
      message: "Labour booking request sent successfully!",
      booking
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
      pendingRequests,
      acceptedRequests,
      completedRequests,
      cancelledRequests,
      rejectedRequests,
      recentRequestsRaw
    ] = await Promise.all([
      Labour.countDocuments({ owner: providerId, availability: "Available" }),
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

    const totalEarnings = completedRequests.reduce(
      (sum, b) => sum + (Number(b.earning || b.finalPrice) || 0),
      0
    );

    return res.json({
      success: true,
      stats: {
        activeListings,
        pendingRequests,
        acceptedRequests,
        completedCount: completedRequests.length,
        cancelledCount: cancelledRequests,
        rejectedCount: rejectedRequests,
        totalEarnings
      },
      recentRequests: recentRequestsRaw
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
        serviceRadiusKm,
        latitude,
        longitude,
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
        skills: parsedSkills,
        experience: Math.max(0, Number(experience) || 0),
        price: Number(price),
        pricingUnit: ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit) ? pricingUnit : "per day",
        location: location.trim(),
        serviceArea: (serviceArea || "").trim(),
        serviceRadiusKm: Number(serviceRadiusKm) || 25,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
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
        skills,
        experience,
        price,
        pricingUnit,
        location,
        serviceArea,
        serviceRadiusKm,
        latitude,
        longitude,
        phone,
        description,
        bookingInstructions,
        availability
      } = req.body;

      if (name) listing.name = name.trim();
      if (labourType) listing.labourType = labourType.trim();
      if (skills !== undefined) {
        if (Array.isArray(skills)) listing.skills = skills;
        else if (typeof skills === "string") {
          listing.skills = skills.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
      if (experience != null) listing.experience = Math.max(0, Number(experience));
      if (price != null) listing.price = Number(price);
      if (pricingUnit && ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit)) {
        listing.pricingUnit = pricingUnit;
      }
      if (location) listing.location = location.trim();
      if (serviceArea !== undefined) listing.serviceArea = serviceArea.trim();
      if (serviceRadiusKm != null) listing.serviceRadiusKm = Number(serviceRadiusKm);
      if (latitude != null && !isNaN(Number(latitude))) listing.latitude = Number(latitude);
      if (longitude != null && !isNaN(Number(longitude))) listing.longitude = Number(longitude);
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

    return res.json({ success: true, requests });
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
      if (booking.status !== "Accepted") {
        return res.status(400).json({
          success: false,
          message: `Only Accepted bookings can be marked as Completed. Current status: ${booking.status}.`
        });
      }
      booking.status = "Completed";
      booking.completedAt = new Date();
      booking.statusChangedAt = new Date();
      booking.earning = booking.finalPrice || booking.totalPrice || 0;
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

    // Upgrade user role if not Admin
    if (!user.isAdmin && String(user.role).toLowerCase() !== "admin") {
      user.role = "Labour";
      await user.save();
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
      description
    } = req.body;

    let listing = null;
    if (name && labourType && price && location) {
      const image = req.file
        ? { url: req.file.path, filename: req.file.filename }
        : DEFAULT_LABOUR_IMAGE;

      let parsedSkills = [];
      if (Array.isArray(skills)) parsedSkills = skills;
      else if (typeof skills === "string" && skills.trim()) {
        parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
      }

      listing = new Labour({
        owner: user._id,
        name: name.trim(),
        labourType: labourType.trim(),
        skills: parsedSkills,
        experience: Math.max(0, Number(experience) || 0),
        price: Number(price),
        pricingUnit: ["per day", "per hour", "per acre", "per bigha"].includes(pricingUnit) ? pricingUnit : "per day",
        location: location.trim(),
        serviceArea: (serviceArea || "").trim(),
        phone: (phone || user.phone).trim(),
        description: (description || `Professional ${labourType} with ${experience || 0} years of experience`).trim(),
        image,
        availability: "Available",
        status: "Approved"
      });

      await listing.save();
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
