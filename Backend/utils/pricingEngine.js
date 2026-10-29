const Booking = require("../models/BookingMachine.js");
const Offer = require("../models/Offer.js");
const { getSmallLandExtraCharge } = require("./groupBooking.js");

/**
 * Validates an offer against current context, user history, service type, and rules.
 *
 * @param {Object} params
 * @param {Object} params.offer - Loaded Offer document or null
 * @param {string} params.code - Coupon code string entered by user
 * @param {Object} params.user - User document or req.user
 * @param {string} params.requestType - "Machine" | "Labour" | "Transport"
 * @param {string} params.category - e.g. "Tractor", "Harvester"
 * @param {number} params.basePrice - Authoritative base service price
 * @param {number} params.landArea - Land area in Bigha
 * @param {string} params.location - Customer location string
 * @param {string} params.bookingType - "Single" | "Group"
 * @param {boolean} params.autoDetect - If true, automatically discovers best active automatic offer
 * @returns {Promise<{ isValid: boolean, reason?: string, offer?: Object }>}
 */
async function validateOffer({
  offer = null,
  code = null,
  user = null,
  requestType = "Machine",
  machineId = null,
  itemId = null,
  category = null,
  basePrice = 0,
  landArea = 0,
  location = "",
  bookingType = "Single",
  autoDetect = false,
}) {
  const now = new Date();

  // 1. Locate offer if not provided
  let targetOffer = offer;
  if (!targetOffer) {
    if (code && String(code).trim()) {
      const formattedCode = String(code).trim().toUpperCase();
      targetOffer = await Offer.findOne({ code: formattedCode });
      if (!targetOffer) {
        return { isValid: false, reason: `Coupon code '${formattedCode}' is invalid or does not exist.` };
      }
    } else if (autoDetect || (!code && !offer)) {
      targetOffer = await findBestAutomaticOffer({
        user,
        requestType,
        category,
        basePrice,
        landArea,
        location,
        bookingType,
      });
      if (!targetOffer) {
        return { isValid: false, reason: "No eligible automatic promotion found." };
      }
    } else {
      return { isValid: false, reason: "No coupon code or offer was specified." };
    }
  }

  // 2. Active status
  if (!targetOffer.isActive || targetOffer.status === "Inactive" || targetOffer.status === "Draft") {
    return { isValid: false, reason: `Offer '${targetOffer.title}' is currently inactive.` };
  }
  if (targetOffer.status === "Paused") {
    return { isValid: false, reason: `Offer '${targetOffer.title}' is currently paused.` };
  }

  // 2.1 Campaign budget exhaustion check
  if (targetOffer.campaignBudget && (Number(targetOffer.budgetSpent || 0) + Number(targetOffer.budgetReserved || 0)) >= Number(targetOffer.campaignBudget)) {
    return { isValid: false, reason: `The promotional budget for '${targetOffer.title}' has been fully exhausted.` };
  }

  // 2.2 Funding source check: currently only WorkShetu-funded platform offers are active
  if (targetOffer.fundingSource && targetOffer.fundingSource !== "WorkShetu") {
    return { isValid: false, reason: "Only WorkShetu platform-funded promotions are currently supported." };
  }

  // 3. Date validity schedule
  if (targetOffer.startDate && now < new Date(targetOffer.startDate)) {
    return { isValid: false, reason: `This promotion has not started yet. Valid from ${new Date(targetOffer.startDate).toLocaleDateString("en-IN")}.` };
  }
  if (targetOffer.endDate && now > new Date(targetOffer.endDate)) {
    return { isValid: false, reason: `This promotion expired on ${new Date(targetOffer.endDate).toLocaleDateString("en-IN")}.` };
  }

  // 4. Overall usage limit
  if (targetOffer.totalUsageLimit && targetOffer.usedCount >= targetOffer.totalUsageLimit) {
    return { isValid: false, reason: "This promotion has reached its maximum redemption limit." };
  }

  // 5. Service applicability
  if (targetOffer.applicableService && targetOffer.applicableService !== "All") {
    if (targetOffer.applicableService.toLowerCase() !== String(requestType).toLowerCase()) {
      return {
        isValid: false,
        reason: `This offer is only applicable to ${targetOffer.applicableService} bookings, not ${requestType}.`,
      };
    }
  }

  // 6. Category applicability (for machines: Tractor, Cultivator, Rotavator, etc.)
  if (String(requestType || "Machine").toLowerCase() === "machine") {
    const Machine = require("../models/ListingMachin.js");
    const { getEligibleDriverIds } = require("./driverEligibility.js");

    // If machineId or itemId provided, query actual database listing to verify visibility & category
    let actualCategory = category;
    const targetMachineId = machineId || itemId;
    if (targetMachineId) {
      const eligibleDriverIds = await getEligibleDriverIds();
      const machineDoc = await Machine.findOne({
        _id: targetMachineId,
        owner: { $in: eligibleDriverIds },
        availability: { $ne: "Hidden" },
      });

      if (!machineDoc) {
        return {
          isValid: false,
          reason: "This offer cannot be applied to this machine because the machine listing is currently inactive, hidden, or owned by an unapproved driver.",
        };
      }
      actualCategory = machineDoc.category;
    }

    const supportedCategories = Machine.schema.path("category").enumValues || [];
    const supportedLower = new Set(supportedCategories.map((c) => c.toLowerCase()));

    const currentCat = String(actualCategory || "").trim().toLowerCase();

    // If a machine category is provided, verify it is recognized by the system
    if (currentCat && !supportedLower.has(currentCat)) {
      return {
        isValid: false,
        reason: `Machine category '${actualCategory}' is not a recognized machine category. Supported categories are: ${supportedCategories.join(", ")}.`,
      };
    }

    const isSelectedMode =
      targetOffer.categorySelectionMode === "selected" ||
      (Array.isArray(targetOffer.applicableCategories) && targetOffer.applicableCategories.length > 0);

    // If offer restricts to specific machine categories, enforce match
    if (isSelectedMode) {
      if (!currentCat) {
        return {
          isValid: false,
          reason: `This offer is restricted to specific machine categories [${targetOffer.applicableCategories.join(", ")}]. Machine category must be provided.`,
        };
      }

      const isMatch = targetOffer.applicableCategories.some(
        (c) => c.toLowerCase() === currentCat
      );

      if (!isMatch) {
        return {
          isValid: false,
          reason: `This offer is only valid on [${targetOffer.applicableCategories.join(", ")}]. Current category: ${actualCategory || "General"}.`,
        };
      }
    }
  }

  // 7. Minimum booking amount check (applies against base service price)
  if (targetOffer.minimumBookingAmount > 0 && basePrice < targetOffer.minimumBookingAmount) {
    return {
      isValid: false,
      reason: `Minimum booking amount of ₹${targetOffer.minimumBookingAmount.toLocaleString("en-IN")} required to apply this offer. (Current: ₹${basePrice.toLocaleString("en-IN")})`,
    };
  }

  // 8. Group booking restriction
  if (targetOffer.groupBookingOnly && bookingType !== "Group") {
    return { isValid: false, reason: "This offer is exclusively available for group pooling bookings." };
  }

  // 9. Location restrictions (Optional targeted campaigns: default is All Locations)
  if (Array.isArray(targetOffer.applicableLocations) && targetOffer.applicableLocations.length > 0) {
    // Primary: Actual booking service location takes precedence
    const serviceLoc = String(location || "").trim().toLowerCase();
    const userLoc = String(user?.location || "").trim().toLowerCase();
    const locCandidates = [serviceLoc, userLoc].filter(Boolean);

    if (locCandidates.length === 0) {
      return {
        isValid: false,
        reason: `This offer is restricted to specific regions [${targetOffer.applicableLocations.join(", ")}]. Please specify your service location.`,
      };
    }

    const isNcrNoida = (text) =>
      text.includes("gautam buddha nagar") ||
      text.includes("gautam buddh nagar") ||
      text.includes("noida") ||
      text.includes("greater noida");

    const matchesCity = (candidateText, targetCity) => {
      if (!candidateText || !targetCity) return false;
      if (candidateText.includes(targetCity)) return true;
      if ((targetCity === "noida" || targetCity.includes("gautam")) && isNcrNoida(candidateText)) {
        return true;
      }
      return false;
    };

    const locationMatched = targetOffer.applicableLocations.some((city) => {
      const cleanCity = String(city || "").toLowerCase().trim();
      if (!cleanCity) return false;
      return locCandidates.some((cand) => matchesCity(cand, cleanCity));
    });

    if (!locationMatched) {
      return {
        isValid: false,
        reason: `This offer is restricted to specific regions [${targetOffer.applicableLocations.join(", ")}].`,
      };
    }
  }

  // 10. User Eligibility & Per-User Constraints
  if (user && user._id) {
    // Check role eligibility
    if (targetOffer.userEligibility === "Farmers" && user.role !== "Farmer") {
      return { isValid: false, reason: "This offer is reserved exclusively for registered Farmers." };
    }

    // Check user booking history
    const pastBookingsCount = await Booking.countDocuments({
      $or: [{ customer: user._id }, { farmerId: user._id }],
      status: { $nin: ["Cancelled", "Rejected"] },
    });

    if (targetOffer.firstBookingOnly && pastBookingsCount > 0) {
      return { isValid: false, reason: "This offer is valid only on your first platform booking." };
    }

    if (targetOffer.userEligibility === "New Users" && pastBookingsCount > 0) {
      return { isValid: false, reason: "This offer is reserved for new users with no prior bookings." };
    }

    if (targetOffer.userEligibility === "Existing Users" && pastBookingsCount === 0) {
      return { isValid: false, reason: "This offer is reserved for existing platform customers." };
    }

    // Check per-user redemption limit for this specific offer
    if (targetOffer.perUserUsageLimit) {
      const userRedemptions = await Booking.countDocuments({
        $or: [{ customer: user._id }, { farmerId: user._id }],
        offerId: targetOffer._id,
        status: { $nin: ["Cancelled", "Rejected"] },
      });

      if (userRedemptions >= targetOffer.perUserUsageLimit) {
        return {
          isValid: false,
          reason: `You have already redeemed this offer ${userRedemptions} time(s). (Limit: ${targetOffer.perUserUsageLimit} per user)`,
        };
      }
    }
  }

  return { isValid: true, offer: targetOffer };
}

/**
 * Calculates authoritative transparent pricing breakdown honoring WorkShetu
 * pricing precedence: Mandatory surcharges remain intact and non-discountable.
 *
 * Formula:
 *   Eligible Discountable Amount = Base Service Price
 *   Actual Discount = MIN(Calculated Discount, Maximum Discount, Eligible Base Amount)
 *   Final Payable = Base Service Price - Actual Discount + Mandatory Charges + Other Charges
 *
 * @param {Object} params
 * @param {number} params.baseServicePrice - Base machine/service price (rate * land)
 * @param {number} [params.mandatoryCharges=0] - Non-discountable surcharges (e.g. small land fee)
 * @param {number} [params.otherCharges=0] - Additional fees
 * @param {Object} [params.offer=null] - Validated offer object
 * @returns {Object} Complete transparent financial quote
 */
function calculateFinalPrice({
  baseServicePrice = 0,
  basePrice = 0,
  mandatoryCharges = 0,
  mandatorySurcharge = 0,
  otherCharges = 0,
  offer = null,
}) {
  const base = Math.max(0, Number(baseServicePrice || basePrice) || 0);
  const mandatory = Math.max(0, Number(mandatoryCharges || mandatorySurcharge) || 0);
  const other = Math.max(0, Number(otherCharges) || 0);

  // Mandatory charges are protected and never discounted
  const eligibleServiceAmount = base;

  let calculatedDiscount = 0;
  let discountPercent = 0;

  if (offer && eligibleServiceAmount > 0) {
    if (offer.discountType === "Percentage") {
      discountPercent = Math.min(100, Math.max(0, Number(offer.discountValue) || 0));
      const rawDiscount = Math.round((eligibleServiceAmount * discountPercent) / 100);
      calculatedDiscount = offer.maxDiscount ? Math.min(rawDiscount, Number(offer.maxDiscount)) : rawDiscount;
    } else {
      // Flat amount discount
      calculatedDiscount = Math.max(0, Number(offer.discountValue) || 0);
      if (offer.maxDiscount) {
        calculatedDiscount = Math.min(calculatedDiscount, Number(offer.maxDiscount));
      }
      discountPercent = Math.min(100, Math.round((calculatedDiscount / (base || 1)) * 100));
    }

    // Protect campaign budget: discount cannot exceed remaining budget
    if (offer.campaignBudget) {
      const remainingBudget = Math.max(
        0,
        Number(offer.campaignBudget) - (Number(offer.budgetSpent || 0) + Number(offer.budgetReserved || 0))
      );
      calculatedDiscount = Math.min(calculatedDiscount, remainingBudget);
    }
  }

  // Ensure actual discount never exceeds eligible service amount and never < 0
  const actualDiscount = Math.max(0, Math.min(calculatedDiscount, eligibleServiceAmount));

  // Platform-funded financial calculation:
  // farmerPayable = originalFarmerPayable - eligibleDiscount
  // driverPayout = originalAgreedDriverPayout
  // platformPromoExpense = eligibleDiscount
  const originalFarmerPayable = eligibleServiceAmount + mandatory + other;
  const originalAgreedDriverPayout = eligibleServiceAmount + mandatory;
  const farmerPayable = Math.max(0, originalFarmerPayable - actualDiscount);
  const driverPayout = originalAgreedDriverPayout; // Full driver earning guaranteed, 0 reduction!
  const platformPromoExpense = actualDiscount; // Subsidized by WorkShetu
  const finalPayableAmount = farmerPayable;

  return {
    baseServicePrice: base,
    discountableCharges: 0,
    eligibleServiceAmount,
    mandatoryNonDiscountableCharges: mandatory,
    otherCharges: other,
    originalFarmerPayable,
    originalAgreedDriverPayout,
    calculatedDiscount,
    actualDiscount,
    discountAmount: actualDiscount,
    eligibleDiscount: actualDiscount,
    discountPercent,
    finalPayableAmount,
    farmerPayable,
    driverPayout,
    driverPayoutReduction: 0,
    platformPromoExpense,
    fundingSource: offer?.fundingSource || "WorkShetu",
  };
}

/**
 * Discovers and returns the highest-saving eligible automatic promotion
 * for a specific customer and booking requirement.
 */
async function findBestAutomaticOffer({
  user = null,
  requestType = "Machine",
  category = null,
  basePrice = 0,
  landArea = 0,
  location = "",
  bookingType = "Single",
}) {
  const now = new Date();
  const query = {
    isActive: true,
    isAutomatic: true,
    status: { $nin: ["Inactive", "Draft", "Paused"] },
    startDate: { $lte: now },
    endDate: { $gte: now },
    $and: [
      {
        $or: [
          { totalUsageLimit: null },
          { $expr: { $lt: ["$usedCount", "$totalUsageLimit"] } },
        ],
      },
      {
        $or: [
          { campaignBudget: null },
          { $expr: { $lt: ["$budgetSpent", "$campaignBudget"] } },
        ],
      },
    ],
  };

  if (requestType && requestType !== "All") {
    query.applicableService = { $in: ["All", requestType] };
  }

  const candidateOffers = await Offer.find(query).lean();
  if (!candidateOffers || candidateOffers.length === 0) return null;

  let bestOffer = null;
  let highestDiscount = -1;

  for (const candidate of candidateOffers) {
    const validation = await validateOffer({
      offer: candidate,
      user,
      requestType,
      category,
      basePrice,
      landArea,
      location,
      bookingType,
    });

    if (validation.isValid && validation.offer) {
      const quote = calculateFinalPrice({
        baseServicePrice: basePrice,
        mandatoryCharges: 0,
        otherCharges: 0,
        offer: validation.offer,
      });

      if (quote.actualDiscount > highestDiscount) {
        highestDiscount = quote.actualDiscount;
        bestOffer = validation.offer;
      }
    }
  }

  return bestOffer;
}

module.exports = {
  validateOffer,
  calculateFinalPrice,
  findBestAutomaticOffer,
  getSmallLandExtraCharge,
};

