const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Offer = require("../models/Offer.js");
const Booking = require("../models/BookingMachine.js");
const Machine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const { isLoggedIn, isAdmin } = require("../middleware/auth.js");
const { upload } = require("../middleware/upload.js");

function getSupportedMachineCategories() {
  return Machine.schema.path("category").enumValues || [];
}

async function validateAndNormalizeCategories(applicableService, rawCategories, selectionMode = "all") {
  if (applicableService === "Labour" || applicableService === "Transport") {
    return { isValid: true, categories: [], selectionMode: "all" };
  }
  // All Available Machines mode: universal dynamic coverage across DB categories
  if (selectionMode === "all" || !Array.isArray(rawCategories) || rawCategories.length === 0) {
    return { isValid: true, categories: [], selectionMode: "all" };
  }

  // Selected Categories mode: validate against actual available categories in MongoDB
  const availableCategories = await Machine.getAvailableCategoriesFromDB();
  const availableLowerMap = new Map(availableCategories.map((c) => [c.toLowerCase(), c]));

  const normalized = [];
  for (const cat of rawCategories) {
    const clean = String(cat || "").trim();
    if (!clean) continue;
    const canonical = availableLowerMap.get(clean.toLowerCase());
    if (!canonical) {
      return {
        isValid: false,
        error: `Category '${clean}' is not currently available in the database. Only categories with active, eligible machine listings can be selected. Available categories: ${availableCategories.length > 0 ? availableCategories.join(", ") : "None"}.`,
      };
    }
    if (!normalized.includes(canonical)) {
      normalized.push(canonical);
    }
  }

  if (normalized.length === 0) {
    return {
      isValid: false,
      error: "Selected Categories mode requires choosing at least one available machine category. Switch to 'All Available Machines' if no specific restriction is desired.",
    };
  }

  return { isValid: true, categories: normalized, selectionMode: "selected" };
}

// Helper to compute stats and dynamic status updates
async function getOfferStats() {
  const allOffers = await Offer.find().lean();
  const now = new Date();

  let activeOffers = 0;
  let scheduledOffers = 0;
  let expiredOffers = 0;
  let inactiveOffers = 0;
  let pausedOffers = 0;
  let totalRedemptions = 0;
  let totalCampaignBudget = 0;
  let totalBudgetSpent = 0;
  let totalBudgetReserved = 0;

  for (const o of allOffers) {
    totalRedemptions += o.usedCount || 0;
    if (o.campaignBudget) totalCampaignBudget += Number(o.campaignBudget);
    totalBudgetSpent += Number(o.budgetSpent || 0);
    totalBudgetReserved += Number(o.budgetReserved || 0);

    if (!o.isActive || o.status === "Inactive") {
      inactiveOffers++;
    } else if (o.status === "Paused") {
      pausedOffers++;
    } else if (o.endDate && now > new Date(o.endDate)) {
      expiredOffers++;
    } else if (o.startDate && now < new Date(o.startDate)) {
      scheduledOffers++;
    } else if (o.totalUsageLimit && o.usedCount >= o.totalUsageLimit) {
      expiredOffers++;
    } else if (o.campaignBudget && (Number(o.budgetSpent || 0) + Number(o.budgetReserved || 0)) >= Number(o.campaignBudget)) {
      pausedOffers++;
    } else {
      activeOffers++;
    }
  }

  const totalBudgetRemaining = Math.max(0, totalCampaignBudget - (totalBudgetSpent + totalBudgetReserved));

  // Calculate actual total discount given and driver payouts protected from real DB bookings
  const financialAggregation = await Booking.aggregate([
    {
      $match: {
        $or: [
          { offerDiscount: { $gt: 0 } },
          { discountAmount: { $gt: 0 } },
        ],
        status: { $nin: ["Cancelled", "Rejected"] },
      },
    },
    {
      $group: {
        _id: null,
        totalFarmerSavings: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
        totalPlatformPromoExpense: { $sum: { $ifNull: ["$platformPromoExpense", { $ifNull: ["$offerDiscount", "$discountAmount"] }] } },
        totalDriverPayoutsProtected: { $sum: { $ifNull: ["$driverPayout", "$originalPrice"] } },
        totalBookingRevenue: { $sum: "$finalPrice" },
        successfulRedemptions: { $sum: 1 },
      },
    },
  ]);

  const finance = financialAggregation[0] || {
    totalFarmerSavings: 0,
    totalPlatformPromoExpense: 0,
    totalDriverPayoutsProtected: 0,
    totalBookingRevenue: 0,
    successfulRedemptions: 0,
  };

  return {
    totalOffers: allOffers.length,
    activeOffers,
    scheduledOffers,
    expiredOffers,
    inactiveOffers,
    pausedOffers,
    totalRedemptions,
    successfulRedemptions: finance.successfulRedemptions,
    totalCampaignBudget,
    totalBudgetSpent,
    totalBudgetReserved,
    totalBudgetRemaining,
    totalDiscountGiven: finance.totalFarmerSavings,
    totalFarmerSavings: finance.totalFarmerSavings,
    totalPlatformPromoExpense: finance.totalPlatformPromoExpense,
    totalDriverPayoutsProtected: finance.totalDriverPayoutsProtected,
    driverPayoutReduction: 0,
    totalBookingRevenue: finance.totalBookingRevenue,
  };
}

// ==========================================
// 1. GET ALL OFFERS (With Tabs, Search, Stats)
// ==========================================
router.get("/offers", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { status = "all", search, page = 1, limit = 10, service } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const stats = await getOfferStats();
    const now = new Date();

    const query = {};

    // Status Tab Filtering
    if (status && status !== "all") {
      const lower = status.toLowerCase();
      if (lower === "active") {
        query.isActive = true;
        query.status = { $ne: "Inactive" };
        query.startDate = { $lte: now };
        query.endDate = { $gte: now };
      } else if (lower === "scheduled") {
        query.isActive = true;
        query.status = { $ne: "Inactive" };
        query.startDate = { $gt: now };
      } else if (lower === "expired") {
        query.$or = [
          { endDate: { $lt: now } },
          { status: "Expired" },
        ];
      } else if (lower === "inactive") {
        query.$or = [
          { isActive: false },
          { status: "Inactive" },
        ];
      }
    }

    if (service && service !== "All") {
      query.applicableService = { $in: ["All", service] };
    }

    // Keyword Search (title, description, code)
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const regex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { code: regex },
      ];
    }

    const [totalMatching, offers] = await Promise.all([
      Offer.countDocuments(query),
      Offer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "fullName email")
        .lean(),
    ]);

    // Attach computed real-time lifecycle status to each offer
    const enrichedOffers = offers.map((o) => {
      let liveStatus = "Active";
      if (!o.isActive || o.status === "Inactive") {
        liveStatus = "Inactive";
      } else if (o.endDate && now > new Date(o.endDate)) {
        liveStatus = "Expired";
      } else if (o.startDate && now < new Date(o.startDate)) {
        liveStatus = "Scheduled";
      } else if (o.totalUsageLimit && o.usedCount >= o.totalUsageLimit) {
        liveStatus = "Expired";
      }
      return { ...o, liveStatus };
    });

    return res.json({
      success: true,
      stats,
      offers: enrichedOffers,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("GET ADMIN OFFERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offers list.",
      error: error.message,
    });
  }
});

// ==========================================
// 1.5. GET COMPREHENSIVE OFFER ANALYTICS
// ==========================================
router.get("/offers/analytics", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const stats = await getOfferStats();

    // 1. Financial KPIs & Totals from Bookings with Offers
    const financialStats = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
            { discountAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountGiven: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
          totalBookingRevenue: { $sum: "$finalPrice" },
          totalRedemptions: { $sum: 1 },
          avgDiscount: { $avg: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
        },
      },
    ]);

    const finance = financialStats[0] || {
      totalDiscountGiven: 0,
      totalBookingRevenue: 0,
      totalRedemptions: 0,
      avgDiscount: 0,
    };

    // 2. Top Performing Offers Leaderboard
    const topOffers = await Offer.find()
      .sort({ usedCount: -1, createdAt: -1 })
      .limit(10)
      .select("title code discountType discountValue maxDiscount applicableService usedCount totalUsageLimit isActive status")
      .lean();

    // 3. Service Breakdown from Bookings with Offers
    const serviceBreakdown = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: "$requestType",
          redemptions: { $sum: 1 },
          totalDiscount: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
    ]);

    // 4. Recent Offer Redemptions Activity Feed
    const recentRedemptions = await Booking.find({
      $or: [
        { offerId: { $ne: null } },
        { offerCode: { $ne: null } },
      ],
    })
      .select("customerName customerPhone offerCode offerTitle offerDiscount discountAmount basePrice extraCharge finalPrice requestType createdAt")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // 5. Geographic / City Breakdown from Bookings with Offers
    const cityBreakdown = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
            { discountAmount: { $gt: 0 } },
          ],
          customerLocation: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$customerLocation",
          redemptions: { $sum: 1 },
          totalDiscount: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
          totalDriverPayout: { $sum: { $ifNull: ["$driverPayout", "$originalPrice"] } },
        },
      },
      { $sort: { redemptions: -1 } },
      { $limit: 10 },
    ]);

    // 6. Booking Status Breakdown for Offer Redemptions
    const statusBreakdown = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
            { discountAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalDiscount: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
        },
      },
    ]);

    return res.json({
      success: true,
      stats: {
        ...stats,
        totalRedemptions: Math.max(stats.totalRedemptions, finance.totalRedemptions),
        totalDiscountGiven: stats.totalFarmerSavings,
        totalFarmerSavings: stats.totalFarmerSavings,
        totalPlatformPromoExpense: stats.totalPlatformPromoExpense,
        totalDriverPayoutsProtected: stats.totalDriverPayoutsProtected,
        driverPayoutReduction: 0,
        totalCampaignBudget: stats.totalCampaignBudget,
        totalBudgetSpent: stats.totalBudgetSpent,
        totalBudgetReserved: stats.totalBudgetReserved,
        totalBudgetRemaining: stats.totalBudgetRemaining,
        totalBookingRevenue: finance.totalBookingRevenue,
        avgDiscount: Math.round(finance.avgDiscount || 0),
      },
      topOffers,
      serviceBreakdown,
      cityBreakdown,
      statusBreakdown,
      recentRedemptions,
    });
  } catch (error) {
    console.error("GET OFFER ANALYTICS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to compile offer analytics.",
      error: error.message,
    });
  }
});

// ==========================================
// 1.8. UPLOAD OFFER BANNER / THUMBNAIL IMAGE
// ==========================================
router.post("/offers/upload-image", isLoggedIn, isAdmin, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("BANNER UPLOAD ERROR:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to upload image file.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file was provided for upload.",
      });
    }

    const imageUrl = req.file.path || req.file.url || req.file.secure_url;
    return res.json({
      success: true,
      message: "Banner photo uploaded successfully.",
      url: imageUrl,
      filename: req.file.filename,
    });
  });
});

// ==========================================
// 1.9. GET SUPPORTED MACHINE & SERVICE CATEGORIES
// ==========================================
router.get("/offers/categories", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const availableCategories = await Machine.getAvailableCategoriesFromDB();
    const supportedCategories = getSupportedMachineCategories();
    const labourTypes = Labour.schema.path("labourType").enumValues || [];
    const transportTypes = Transport.schema.path("vehicleType").enumValues || [];

    return res.json({
      success: true,
      service: "Machine",
      categories: availableCategories,
      availableCategories,
      supportedMachineCategories: supportedCategories,
      labourTypes,
      transportTypes,
      services: ["All", "Machine", "Labour", "Transport"],
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load database machine categories.",
      error: error.message,
    });
  }
});

// ==========================================
// 2. GET SINGLE OFFER BY ID
// ==========================================
router.get("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("createdBy", "fullName email phone")
      .lean();

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const now = new Date();
    let liveStatus = "Active";
    if (!offer.isActive || offer.status === "Inactive") {
      liveStatus = "Inactive";
    } else if (offer.endDate && now > new Date(offer.endDate)) {
      liveStatus = "Expired";
    } else if (offer.startDate && now < new Date(offer.startDate)) {
      liveStatus = "Scheduled";
    } else if (offer.totalUsageLimit && offer.usedCount >= offer.totalUsageLimit) {
      liveStatus = "Expired";
    }

    return res.json({ success: true, offer: { ...offer, liveStatus } });
  } catch (error) {
    console.error("GET SINGLE OFFER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve offer details.",
      error: error.message,
    });
  }
});

// ==========================================
// 3. CREATE NEW OFFER
// ==========================================
router.post("/offers", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      code,
      isAutomatic,
      bannerUrl,
      discountType = "Flat",
      discountValue,
      maxDiscount,
      fundingSource = "WorkShetu",
      campaignBudget,
      applicableService = "All",
      categorySelectionMode,
      categoryMode,
      applicableCategories,
      userEligibility = "All",
      firstBookingOnly = false,
      groupBookingOnly = false,
      minimumBookingAmount = 0,
      applicableLocations,
      totalUsageLimit,
      perUserUsageLimit = 1,
      startDate,
      endDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Offer title is required." });
    }

    if (discountValue === undefined || Number(discountValue) < 0) {
      return res.status(400).json({ success: false, message: "A valid non-negative discount value is required." });
    }

    if (discountType === "Percentage" && Number(discountValue) > 100) {
      return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 100%." });
    }

    if (!endDate) {
      return res.status(400).json({ success: false, message: "Offer expiration end date is required." });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ success: false, message: "End date must be after start date." });
    }

    // Format & Check Code uniqueness if code is supplied
    let formattedCode = null;
    if (code && code.trim()) {
      formattedCode = code.trim().toUpperCase();
      const existing = await Offer.findOne({ code: formattedCode });
      if (existing) {
        return res.status(400).json({ success: false, message: `Coupon code '${formattedCode}' already exists.` });
      }
    } else if (!isAutomatic) {
      return res.status(400).json({ success: false, message: "Coupon code is required unless offer is configured as automatic." });
    }

    const effectiveMode =
      categorySelectionMode ||
      categoryMode ||
      (Array.isArray(applicableCategories) && applicableCategories.length > 0 ? "selected" : "all");

    // Validate applicableCategories against database machine categories
    const catValidation = await validateAndNormalizeCategories(
      applicableService,
      applicableCategories,
      effectiveMode
    );
    if (!catValidation.isValid) {
      return res.status(400).json({ success: false, message: catValidation.error });
    }

    const offer = new Offer({
      title: title.trim(),
      description: description ? description.trim() : "",
      code: formattedCode || undefined,
      isAutomatic: Boolean(isAutomatic),
      bannerUrl: bannerUrl ? bannerUrl.trim() : "",
      discountType,
      discountValue: Number(discountValue),
      maxDiscount: maxDiscount && Number(maxDiscount) > 0 ? Number(maxDiscount) : null,
      fundingSource: ["WorkShetu", "Driver", "Shared"].includes(fundingSource) ? fundingSource : "WorkShetu",
      campaignBudget: campaignBudget && Number(campaignBudget) > 0 ? Number(campaignBudget) : null,
      budgetSpent: 0,
      budgetReserved: 0,
      applicableService,
      categorySelectionMode: catValidation.selectionMode,
      applicableCategories: catValidation.categories,
      userEligibility,
      firstBookingOnly: Boolean(firstBookingOnly),
      groupBookingOnly: Boolean(groupBookingOnly),
      minimumBookingAmount: Math.max(0, Number(minimumBookingAmount) || 0),
      applicableLocations: Array.isArray(applicableLocations) ? applicableLocations.map((l) => l.trim()).filter(Boolean) : [],
      totalUsageLimit: totalUsageLimit && Number(totalUsageLimit) > 0 ? Math.max(1, Number(totalUsageLimit)) : null,
      perUserUsageLimit: Math.max(1, Number(perUserUsageLimit) || 1),
      startDate: start,
      endDate: end,
      status: start > new Date() ? "Scheduled" : "Active",
      isActive: true,
      createdBy: req.user?._id || req.user?.id || null,
    });

    await offer.save();

    return res.status(201).json({
      success: true,
      message: `Offer '${offer.title}' created successfully!`,
      offer,
    });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A promotion with this coupon code already exists." });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create offer.",
      error: error.message,
    });
  }
});

// ==========================================
// 4. UPDATE EXISTING OFFER
// ==========================================
router.put("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    const {
      title,
      description,
      code,
      isAutomatic,
      bannerUrl,
      discountType,
      discountValue,
      maxDiscount,
      fundingSource,
      campaignBudget,
      applicableService,
      categorySelectionMode,
      categoryMode,
      applicableCategories,
      userEligibility,
      firstBookingOnly,
      groupBookingOnly,
      minimumBookingAmount,
      applicableLocations,
      totalUsageLimit,
      perUserUsageLimit,
      startDate,
      endDate,
      isActive,
      status,
    } = req.body;

    if (title !== undefined) offer.title = title.trim();
    if (description !== undefined) offer.description = description.trim();
    if (bannerUrl !== undefined) offer.bannerUrl = bannerUrl.trim();

    if (code !== undefined) {
      if (code && code.trim()) {
        const formattedCode = code.trim().toUpperCase();
        if (formattedCode !== offer.code) {
          const duplicate = await Offer.findOne({ code: formattedCode, _id: { $ne: offer._id } });
          if (duplicate) {
            return res.status(400).json({ success: false, message: `Coupon code '${formattedCode}' is already in use.` });
          }
        }
        offer.code = formattedCode;
      } else {
        offer.code = null;
      }
    }

    if (isAutomatic !== undefined) offer.isAutomatic = Boolean(isAutomatic);
    if (discountType !== undefined) offer.discountType = discountType;
    if (discountValue !== undefined) offer.discountValue = Number(discountValue);
    if (maxDiscount !== undefined) offer.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (fundingSource !== undefined) {
      offer.fundingSource = ["WorkShetu", "Driver", "Shared"].includes(fundingSource) ? fundingSource : "WorkShetu";
    }
    if (campaignBudget !== undefined) {
      offer.campaignBudget = campaignBudget && Number(campaignBudget) > 0 ? Number(campaignBudget) : null;
    }
    if (applicableService !== undefined) offer.applicableService = applicableService;

    if (
      applicableCategories !== undefined ||
      categorySelectionMode !== undefined ||
      categoryMode !== undefined ||
      applicableService !== undefined
    ) {
      const activeService = applicableService !== undefined ? applicableService : offer.applicableService;
      const rawCats = applicableCategories !== undefined ? applicableCategories : offer.applicableCategories;
      const effectiveMode =
        categorySelectionMode !== undefined
          ? categorySelectionMode
          : categoryMode !== undefined
          ? categoryMode
          : (Array.isArray(rawCats) && rawCats.length > 0 ? "selected" : offer.categorySelectionMode || "all");

      const catValidation = await validateAndNormalizeCategories(activeService, rawCats, effectiveMode);
      if (!catValidation.isValid) {
        return res.status(400).json({ success: false, message: catValidation.error });
      }
      offer.applicableCategories = catValidation.categories;
      offer.categorySelectionMode = catValidation.selectionMode;
    }
    if (userEligibility !== undefined) offer.userEligibility = userEligibility;
    if (firstBookingOnly !== undefined) offer.firstBookingOnly = Boolean(firstBookingOnly);
    if (groupBookingOnly !== undefined) offer.groupBookingOnly = Boolean(groupBookingOnly);
    if (minimumBookingAmount !== undefined) offer.minimumBookingAmount = Math.max(0, Number(minimumBookingAmount) || 0);
    if (applicableLocations !== undefined) {
      offer.applicableLocations = Array.isArray(applicableLocations)
        ? applicableLocations.map((l) => String(l || "").trim()).filter(Boolean)
        : [];
    }
    if (totalUsageLimit !== undefined) offer.totalUsageLimit = totalUsageLimit ? Number(totalUsageLimit) : null;
    if (perUserUsageLimit !== undefined) offer.perUserUsageLimit = Math.max(1, Number(perUserUsageLimit) || 1);
    if (startDate !== undefined) offer.startDate = new Date(startDate);
    if (endDate !== undefined) offer.endDate = new Date(endDate);
    if (status !== undefined) {
      offer.status = status;
      offer.isActive = status === "Active" || status === "Scheduled";
    } else if (isActive !== undefined) {
      offer.isActive = Boolean(isActive);
      offer.status = offer.isActive ? "Active" : "Inactive";
    }

    await offer.save();

    return res.json({
      success: true,
      message: `Offer '${offer.title}' updated successfully.`,
      offer,
    });
  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "A promotion with this coupon code already exists." });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update offer.",
      error: error.message,
    });
  }
});

// ==========================================
// 5. TOGGLE / PATCH STATUS & PAUSE
// ==========================================
router.patch("/offers/:id/status", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    if (req.body.status) {
      offer.status = req.body.status;
      offer.isActive = req.body.status === "Active" || req.body.status === "Scheduled";
    } else {
      offer.isActive = !offer.isActive;
      offer.status = offer.isActive ? "Active" : "Inactive";
    }
    await offer.save();

    return res.json({
      success: true,
      message: `Offer '${offer.title}' is now ${offer.status}.`,
      isActive: offer.isActive,
      status: offer.status,
      offer,
    });
  } catch (error) {
    console.error("PATCH OFFER STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle offer status.",
      error: error.message,
    });
  }
});

router.patch("/offers/:id/pause", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    offer.status = offer.status === "Paused" ? "Active" : "Paused";
    offer.isActive = offer.status === "Active";
    await offer.save();

    return res.json({
      success: true,
      message: `Offer '${offer.title}' is now ${offer.status}.`,
      status: offer.status,
      isActive: offer.isActive,
      offer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. DUPLICATE OFFER
// ==========================================
router.post("/offers/:id/duplicate", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const source = await Offer.findById(req.params.id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: "Original offer not found." });
    }

    delete source._id;
    delete source.createdAt;
    delete source.updatedAt;

    source.title = `${source.title} (Copy)`;
    source.usedCount = 0;
    source.createdBy = req.user._id;

    if (source.code) {
      source.code = `${source.code}_COPY_${Date.now().toString().slice(-4)}`;
    }

    const duplicatedOffer = new Offer(source);
    await duplicatedOffer.save();

    return res.status(201).json({
      success: true,
      message: `Offer duplicated successfully as '${duplicatedOffer.title}'.`,
      offer: duplicatedOffer,
    });
  } catch (error) {
    console.error("DUPLICATE OFFER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to duplicate offer.",
      error: error.message,
    });
  }
});

// ==========================================
// 7. DELETE / ARCHIVE OFFER
// (Prefers deactivation if historically redeemed)
// ==========================================
router.delete("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    // Safety rule: if the offer has historical redemptions, deactivate it to preserve audit trail
    if (offer.usedCount > 0) {
      offer.isActive = false;
      offer.status = "Inactive";
      await offer.save();
      return res.json({
        success: true,
        message: `Offer '${offer.title}' has ${offer.usedCount} recorded redemptions. It has been archived and deactivated instead of permanently deleted to preserve historical booking audit trails.`,
        deactivated: true,
      });
    }

    await Offer.findByIdAndDelete(req.params.id);
    return res.json({
      success: true,
      message: `Offer '${offer.title}' was permanently deleted.`,
      deactivated: false,
    });
  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete offer.",
      error: error.message,
    });
  }
});

module.exports = router;

