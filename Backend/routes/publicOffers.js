const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Offer = require("../models/Offer.js");
const Machine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Booking = require("../models/BookingMachine.js");
const User = require("../models/Owner.js");
const { validateOffer, calculateFinalPrice, getSmallLandExtraCharge } = require("../utils/pricingEngine.js");

// ==========================================
// 1. GET ACTIVE PUBLIC OFFERS (TARGETED BY USER ELIGIBILITY)
// ==========================================
router.get("/active", async (req, res) => {
  try {
    const { service, category, location, userId: queryUserId } = req.query;
    const now = new Date();

    const targetUserId = queryUserId || (req.user ? req.user._id : null);
    let isFirstTimeUser = true;
    let userRole = req.user ? req.user.role : null;
    const userOfferRedemptions = new Map();

    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      const uid = new mongoose.Types.ObjectId(targetUserId);

      if (!userRole) {
        const userDoc = await User.findById(uid).select("role").lean();
        if (userDoc) userRole = userDoc.role;
      }

      // Count past non-cancelled bookings made by this user
      const pastBookingsCount = await Booking.countDocuments({
        $or: [{ customer: uid }, { farmerId: uid }],
        status: { $nin: ["Cancelled", "Rejected"] },
      });
      isFirstTimeUser = (pastBookingsCount === 0);

      // Check per-user offer redemptions
      const redemptions = await Booking.aggregate([
        {
          $match: {
            $or: [{ customer: uid }, { farmerId: uid }],
            status: { $nin: ["Cancelled", "Rejected"] },
            offerId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$offerId",
            count: { $sum: 1 },
          },
        },
      ]);

      redemptions.forEach((r) => {
        if (r._id) userOfferRedemptions.set(String(r._id), r.count);
      });
    }

    const query = {
      isActive: true,
      status: { $nin: ["Inactive", "Draft"] },
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { totalUsageLimit: null },
        { $expr: { $lt: ["$usedCount", "$totalUsageLimit"] } },
      ],
    };

    if (service && service !== "All") {
      query.applicableService = { $in: ["All", service] };
    }

    if (category) {
      query.$or = [
        { applicableCategories: { $size: 0 } },
        { applicableCategories: category },
      ];
    }

    if (location && String(location).trim()) {
      const locClean = String(location).trim();
      const regex = new RegExp(locClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { applicableLocations: { $size: 0 } },
        { applicableLocations: regex },
      ];
    }

    const rawOffers = await Offer.find(query)
      .select(
        "_id title description code isAutomatic bannerUrl discountType discountValue maxDiscount applicableService applicableCategories minimumBookingAmount firstBookingOnly groupBookingOnly userEligibility perUserUsageLimit startDate endDate"
      )
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Filter offers strictly based on user eligibility:
    // "promo code unhi ko dikhna chahiye jin logo ke liye hai jaise ki first user etc"
    const eligibleOffers = rawOffers.filter((offer) => {
      if (targetUserId) {
        // If offer is for first-time bookings only, do not show to existing users
        if (offer.firstBookingOnly && !isFirstTimeUser) {
          return false;
        }

        // userEligibility
        if (offer.userEligibility === "New Users" && !isFirstTimeUser) {
          return false;
        }
        if (offer.userEligibility === "Existing Users" && isFirstTimeUser) {
          return false;
        }
        if (offer.userEligibility === "Farmers" && userRole && String(userRole).toLowerCase() !== "farmer") {
          return false;
        }

        // perUserUsageLimit
        if (offer.perUserUsageLimit) {
          const usedCount = userOfferRedemptions.get(String(offer._id)) || 0;
          if (usedCount >= offer.perUserUsageLimit) {
            return false;
          }
        }
      } else {
        // Unauthenticated visitor:
        // Do not show offers strictly targeted to existing customers
        if (offer.userEligibility === "Existing Users") {
          return false;
        }
      }

      return true;
    }).slice(0, 6);

    return res.json({
      success: true,
      count: eligibleOffers.length,
      offers: eligibleOffers,
      isFirstTimeUser,
    });
  } catch (error) {
    console.error("GET ACTIVE OFFERS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load active promotions.",
      error: error.message,
    });
  }
});

// ==========================================
// 2. VALIDATE PROMO CODE & CALCULATE PRICING
// ==========================================
router.post("/validate", async (req, res) => {
  try {
    const {
      code,
      offerId,
      itemId,
      service = "Machine",
      category: explicitCategory,
      landArea: rawLandArea,
      location: explicitLocation,
      bookingType = "Single",
      basePrice: rawBasePrice,
    } = req.body;

    let basePrice = Number(rawBasePrice) || 0;
    let mandatoryCharges = 0;
    let category = explicitCategory || null;
    let location = explicitLocation || "";
    const landArea = Number(rawLandArea) || 0;

    // If itemId is provided, extract authoritative listing information
    if (itemId) {
      if (service === "Machine") {
        const machine = await Machine.findById(itemId);
        if (!machine) {
          return res.status(404).json({ success: false, valid: false, message: "Referenced machine listing not found." });
        }
        category = category || machine.category;
        location = location || machine.location || "";
        const rate = Number(machine.price) || 0;
        if (landArea > 0) {
          basePrice = rate * landArea;
          if (bookingType === "Single") {
            mandatoryCharges = getSmallLandExtraCharge(landArea);
          }
        } else {
          basePrice = rate;
        }
      } else if (service === "Labour") {
        const labour = await Labour.findById(itemId);
        if (labour) {
          basePrice = Number(labour.charge) || Number(labour.price) || basePrice;
          location = location || labour.location || "";
        }
      } else if (service === "Transport") {
        const transport = await Transport.findById(itemId);
        if (transport) {
          basePrice = Number(transport.pricePerKm) || Number(transport.price) || basePrice;
          location = location || transport.location || "";
        }
      }
    } else if (landArea > 0 && bookingType === "Single") {
      mandatoryCharges = getSmallLandExtraCharge(landArea);
    }

    const isAutoCheck = !code && !offerId;

    // Call validation engine
    const validation = await validateOffer({
      offer: offerId ? await Offer.findById(offerId) : null,
      code,
      user: req.user || null,
      requestType: service,
      category,
      basePrice,
      landArea,
      location,
      bookingType,
      autoDetect: isAutoCheck,
    });

    if (!validation.isValid) {
      if (isAutoCheck) {
        return res.json({
          success: true,
          valid: false,
          hasAutoOffer: false,
          message: validation.reason,
        });
      }
      return res.status(400).json({
        success: false,
        valid: false,
        message: validation.reason,
      });
    }

    // Calculate final transparent price quote
    const breakdown = calculateFinalPrice({
      baseServicePrice: basePrice,
      mandatoryCharges,
      otherCharges: 0,
      offer: validation.offer,
    });

    return res.json({
      success: true,
      valid: true,
      hasAutoOffer: true,
      isAutomatic: Boolean(validation.offer.isAutomatic),
      offer: {
        _id: validation.offer._id,
        title: validation.offer.title,
        code: validation.offer.code,
        discountType: validation.offer.discountType,
        discountValue: validation.offer.discountValue,
        maxDiscount: validation.offer.maxDiscount,
        isAutomatic: validation.offer.isAutomatic,
        firstBookingOnly: Boolean(validation.offer.firstBookingOnly),
        fundingSource: validation.offer.fundingSource || "WorkShetu",
        applicableLocations: validation.offer.applicableLocations || [],
      },
      breakdown,
    });
  } catch (error) {
    console.error("OFFER VALIDATION ERROR:", error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: "An unexpected error occurred during offer validation.",
      error: error.message,
    });
  }
});

// ==========================================
// 4. GET AVAILABLE MACHINE CATEGORIES (PUBLIC)
// ==========================================
router.get("/categories", async (req, res) => {
  try {
    const availableCategories = await Machine.getAvailableCategoriesFromDB();
    const supportedCategories = Machine.schema.path("category").enumValues || [];
    return res.json({
      success: true,
      service: "Machine",
      categories: availableCategories,
      availableCategories,
      supportedMachineCategories: supportedCategories,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;


