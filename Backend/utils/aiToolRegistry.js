const crypto = require("crypto");
const mongoose = require("mongoose");
const Machine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const Booking = require("../models/BookingMachine.js");
const GroupBooking = require("../models/GroupBooking.js");
const User = require("../models/Owner.js");
const Offer = require("../models/Offer.js");
const Complaint = require("../models/Complaint.js");
const Review = require("../models/Review.js");
const { getEligibleDriverIds, isDriverEligible, getDriverAccountStatus } = require("./driverEligibility.js");
const { validateOffer, calculateFinalPrice, findBestAutomaticOffer, getSmallLandExtraCharge } = require("./pricingEngine.js");

const categories = ["Tractor", "Cultivator", "Rotavator", "Harrow", "Harvester"];
const labourTypes = [
  "General Agricultural Labour", "Sowing & Planting", "Harvesting",
  "Irrigation Assistance", "Weeding & Field Preparation", "Fruit & Vegetable Picking",
  "Loading & Unloading", "Electrician", "Mechanical", "Tractor Driver", "Harvester Operator",
  "Loader Operator", "Truck Driver", "Welder", "Plumber", "Carpenter",
  "Painter", "Mason", "Farm Worker", "Irrigation Technician",
  "Spray Machine Operator", "Helper"
];
const transportTypes = ["Truck", "Loader", "Mini Truck", "Pickup", "Tempo"];

// ==========================================
// PENDING ACTION STORE (5-minute TTL)
// ==========================================
const pendingActions = new Map();
const ACTION_TTL_MS = 5 * 60 * 1000;

function cleanupExpiredActions() {
  const now = Date.now();
  for (const [id, action] of pendingActions.entries()) {
    if (action.expiresAt <= now) {
      pendingActions.delete(id);
    }
  }
}

function createPendingAction({ userId, role, actionType, params, summary }) {
  cleanupExpiredActions();
  const actionId = `act_${crypto.randomBytes(8).toString("hex")}`;
  const action = {
    actionId,
    userId: String(userId),
    role,
    actionType,
    params,
    summary,
    createdAt: Date.now(),
    expiresAt: Date.now() + ACTION_TTL_MS,
  };
  pendingActions.set(actionId, action);
  return action;
}

function getPendingAction(actionId, userId) {
  cleanupExpiredActions();
  if (!actionId) return null;
  const action = pendingActions.get(String(actionId).trim());
  if (!action) return null;
  if (userId && String(action.userId) !== String(userId)) return null;
  return action;
}

function discardPendingAction(actionId, userId) {
  const action = getPendingAction(actionId, userId);
  if (!action) return false;
  pendingActions.delete(action.actionId);
  return true;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function safeMachine(machine) {
  if (!machine) return null;
  const row = machine.toObject ? machine.toObject() : machine;
  return {
    _id: String(row._id),
    title: row.title,
    category: row.category,
    image: row.image?.url ? { url: row.image.url } : undefined,
    price: row.price,
    unit: row.unit,
    power: row.power,
    fuelType: row.fuelType,
    year: row.year,
    location: row.location,
    description: row.description,
    availability: row.availability,
    distanceKm: row.distanceKm,
    averageRating: row.averageRating,
    reviewCount: row.reviewCount
  };
}

function distanceKm(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function enrichMachines(rows, point) {
  if (!rows.length) return [];
  const ratings = await Review.aggregate([
    { $match: { machine: { $in: rows.map((row) => row._id) }, rating: { $gte: 1, $lte: 5 } } },
    { $group: { _id: "$machine", average: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const ratingMap = new Map(ratings.map((rating) => [String(rating._id), rating]));
  return rows.map((row) => {
    const rating = ratingMap.get(String(row._id));
    const pointDistance = point && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
      ? Math.round(distanceKm(point, row) * 10) / 10
      : null;
    return safeMachine({
      ...row,
      distanceKm: pointDistance,
      averageRating: rating ? Math.round(rating.average * 10) / 10 : null,
      reviewCount: rating?.count || 0
    });
  });
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function createCompletionOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ==========================================
// FARMER TOOLS IMPLEMENTATION
// ==========================================
async function searchMachines(args = {}, user = {}, nearby = false) {
  const eligibleDriverIds = await getEligibleDriverIds();
  const query = { availability: "Available", owner: { $in: eligibleDriverIds } };
  if (categories.includes(args.category)) query.category = args.category;
  if (Number.isFinite(args.maxPrice) && args.maxPrice >= 0) query.price = { $lte: Math.min(args.maxPrice, 100000000) };
  if (Number.isFinite(args.power) && args.power > 0) query.power = args.power;
  if (typeof args.location === "string" && args.location.trim()) {
    const location = args.location.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.location = { $regex: location, $options: "i" };
  }
  if (typeof args.searchText === "string" && args.searchText.trim()) {
    const term = args.searchText.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = ["title", "description", "fuelType"].map((field) => ({ [field]: { $regex: term, $options: "i" } }));
  }

  const hasSavedCoordinates = Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude);
  const point = hasSavedCoordinates ? { latitude: user.latitude, longitude: user.longitude } : null;
  const radiusKm = Math.min(Math.max(Number(args.radiusKm) || 50, 1), 200);

  const rows = await Machine.find(query)
    .select("title category image.url price unit power fuelType year location description availability latitude longitude createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  let results = await enrichMachines(rows, point);
  if (point && (nearby || !args.location)) {
    results = results.filter((m) => m.distanceKm == null || m.distanceKm <= radiusKm);
  }

  if (args.availableOn && validDate(args.availableOn)) {
    const checks = await Promise.all(results.map((m) => checkAvailability({ machineId: m._id, date: args.availableOn })));
    results = results.filter((_, i) => checks[i].available);
  }

  if (Number.isFinite(args.landArea) && args.landArea > 0) {
    results = results.map((m) => ({
      ...m,
      landAreaNote: `Listed price is per ${m.unit}; confirm work capacity with owner.`
    }));
  }

  results.sort(args.preferLowPrice
    ? (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    : (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || (a.price ?? Infinity) - (b.price ?? Infinity));

  return results.slice(0, 12);
}

async function checkAvailability({ machineId, date }) {
  if (!mongoose.isValidObjectId(machineId) || !validDate(date)) {
    return { available: false, reason: "A valid WorkShetu machine ID and date are required." };
  }
  const machine = await Machine.findById(machineId).select("title category image price unit power fuelType year location description availability owner").lean();
  if (!machine) return { available: false, reason: "Machine not found." };
  const owner = await User.findById(machine.owner).select("role isActive driverApplicationStatus");
  if (!owner || !isDriverEligible(owner)) {
    return { available: false, reason: "The owner of this machine is currently unavailable or under review." };
  }
  if (machine.availability !== "Available") {
    return { available: false, date, reason: "This listing is marked as booked." };
  }
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const conflict = await Booking.exists({
    requestType: "Machine",
    itemId: machineId,
    status: { $in: ["Pending", "Accepted"] },
    requiredDate: { $gte: start, $lt: end }
  });
  return {
    available: !conflict,
    date,
    reason: conflict ? "A pending or accepted booking exists for this date." : "No booking conflict found for this date.",
    machine: safeMachine(machine)
  };
}

async function getMachineDetails({ machineId }) {
  if (!mongoose.isValidObjectId(machineId)) return { error: "Invalid machine ID." };
  const row = await Machine.findById(machineId).lean();
  if (!row) return { error: "Machine not found." };
  const [enriched] = await enrichMachines([row], null);
  const owner = await User.findById(row.owner).select("fullName phone driverVehicleType driverExperience").lean();
  return {
    machine: enriched,
    owner: owner ? { name: owner.fullName, vehicleType: owner.driverVehicleType, experience: owner.driverExperience } : null
  };
}

async function searchDirectory(type, rawArgs = {}, user = {}, nearby = false) {
  const model = type === "Labour" ? Labour : Transport;
  const allowedTypes = type === "Labour" ? labourTypes : transportTypes;
  const typeField = type === "Labour" ? "labourType" : "vehicleType";
  const nameFields = type === "Labour" ? ["name", "description"] : ["vehicleName", "vehicleType", "capacity", "description"];
  const args = rawArgs && typeof rawArgs === "object" ? rawArgs : {};
  const query = { availability: "Available" };
  if (allowedTypes.includes(args[typeField])) query[typeField] = args[typeField];
  if (Number.isFinite(args.maxPrice) && args.maxPrice >= 0) query.price = { $lte: Math.min(args.maxPrice, 100000000) };
  if (typeof args.location === "string" && args.location.trim()) {
    query.location = { $regex: args.location.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  if (typeof args.searchText === "string" && args.searchText.trim()) {
    const term = args.searchText.trim().slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = nameFields.map((field) => ({ [field]: { $regex: term, $options: "i" } }));
  }

  const hasSavedCoordinates = Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude);
  const point = hasSavedCoordinates ? { latitude: user.latitude, longitude: user.longitude } : null;
  const radiusKm = Math.min(Math.max(Number(args.radiusKm) || 50, 1), 200);

  const rows = await model.find(query).limit(100).lean();
  let results = rows.map((row) => {
    const dist = point && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)
      ? Math.round(distanceKm(point, row) * 10) / 10
      : null;
    if (type === "Labour") {
      return {
        _id: String(row._id),
        serviceType: type,
        title: row.name,
        category: row.labourType,
        skills: row.skills || [],
        image: row.image?.url ? { url: row.image.url } : undefined,
        price: row.price,
        pricingUnit: row.pricingUnit || "per day",
        location: row.location,
        serviceArea: row.serviceArea || "",
        experience: row.experience,
        description: row.description,
        availability: row.availability,
        distanceKm: dist
      };
    }
    return {
      _id: String(row._id),
      serviceType: type,
      title: row.vehicleName,
      category: row.vehicleType,
      image: row.image?.url ? { url: row.image.url } : undefined,
      capacity: row.capacity,
      price: row.price,
      location: row.location,
      description: row.description,
      availability: row.availability,
      distanceKm: dist
    };
  });

  if (point && (nearby || !args.location)) {
    results = results.filter((s) => nearby ? s.distanceKm != null && s.distanceKm <= radiusKm : s.distanceKm == null || s.distanceKm <= radiusKm);
  }

  results.sort(args.preferLowPrice
    ? (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    : (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || (a.price ?? Infinity) - (b.price ?? Infinity));

  return results.slice(0, 12);
}

const REJECTED_TTL_MS = 24 * 60 * 60 * 1000;

async function getFarmerBookings(user, filterStatus = "Active") {
  if (!user?._id) return { error: "User is not logged in or account ID missing." };
  try {
    const now = new Date();
    const expiryThreshold = new Date(Date.now() - REJECTED_TTL_MS);

    let fetchLimit = 4;
    let statusCondition;
    if (filterStatus === "Rejected") {
      statusCondition = {
        status: { $in: ["Rejected", "Cancelled"] },
        $or: [{ historyExpiresAt: { $gt: now } }, { historyExpiresAt: null, updatedAt: { $gte: expiryThreshold } }]
      };
    } else if (filterStatus === "Completed") {
      statusCondition = { status: "Completed" };
    } else if (filterStatus === "Accepted") {
      statusCondition = { status: "Accepted" };
      fetchLimit = 2;
    } else if (filterStatus === "Pending") {
      statusCondition = { status: "Pending" };
      fetchLimit = 2;
    } else if (filterStatus === "All") {
      statusCondition = {
        $or: [
          { status: { $nin: ["Rejected", "Cancelled"] } },
          { status: { $in: ["Rejected", "Cancelled"] }, $or: [{ historyExpiresAt: { $gt: now } }, { historyExpiresAt: null, updatedAt: { $gte: expiryThreshold } }] }
        ]
      };
      fetchLimit = 5;
    } else {
      // Default: Active
      statusCondition = { status: { $in: ["Pending", "Accepted"] } };
      fetchLimit = 2;
    }

    const singleBookings = await Booking.find({ customer: user._id, ...statusCondition })
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .populate("owner", "fullName phone")
      .lean();

    const items = await Promise.all(singleBookings.map(async (b) => {
      let itemTitle = "Service";
      if (b.requestType === "Machine") {
        const m = await Machine.findById(b.itemId).select("title category").lean();
        if (m) itemTitle = `${m.title} (${m.category})`;
      } else if (b.requestType === "Labour") {
        const l = await Labour.findById(b.itemId).select("title category").lean();
        if (l) itemTitle = `${l.title} (${l.category})`;
      } else if (b.requestType === "Transport") {
        const t = await Transport.findById(b.itemId).select("title category").lean();
        if (t) itemTitle = `${t.title} (${t.category})`;
      }
      return {
        bookingId: String(b._id),
        type: b.requestType,
        service: itemTitle,
        driverName: b.owner?.fullName || "Driver",
        driverPhone: b.status === "Accepted" ? b.owner?.phone : undefined,
        status: b.status,
        date: b.bookingDate ? new Date(b.bookingDate).toLocaleDateString("en-IN") : "N/A",
        totalPrice: b.totalPrice != null ? `₹${b.totalPrice}` : "N/A",
        completionOtp: (b.status === "Accepted" && b.completionOtp) ? b.completionOtp : undefined,
        otpVerified: b.otpVerified
      };
    }));

    const groupBookings = await GroupBooking.find({
      "members.user": user._id,
      status: filterStatus === "Completed" ? "Completed" : { $in: ["Forming", "Ready", "RequestSent", "Accepted"] }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("listing", "title category")
      .populate("owner", "fullName phone")
      .lean();

    const groupItems = groupBookings.map((gb) => {
      const myMembership = gb.members?.find((m) => String(m.user) === String(user._id));
      return {
        groupBookingId: String(gb._id),
        machine: gb.listing ? `${gb.listing.title} (${gb.listing.category})` : "Machine",
        status: gb.status,
        memberStatus: myMembership?.status || gb.status,
        myLandArea: `${myMembership?.landArea || 0} Bigha`,
        myFinalPrice: myMembership?.finalPrice != null ? `₹${myMembership.finalPrice}` : "N/A",
        driverName: gb.owner?.fullName || "Driver",
        date: gb.bookingDate ? new Date(gb.bookingDate).toLocaleDateString("en-IN") : "N/A"
      };
    });

    return {
      filterApplied: filterStatus,
      singleBookings: items,
      groupBookings: groupItems,
      totalCount: items.length + groupItems.length
    };
  } catch (err) {
    return { error: "Failed to retrieve farmer bookings." };
  }
}

async function getNearbyGroupBookings(args = {}, user = {}) {
  try {
    const filter = { status: { $in: ["Forming", "Ready"] } };
    if (args.location) {
      filter.location = { $regex: args.location.trim(), $options: "i" };
    }
    const groups = await GroupBooking.find(filter)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("listing", "title category price unit")
      .populate("owner", "fullName")
      .lean();

    return groups.map((g) => {
      let distance = null;
      if (Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude) && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) {
        distance = Number(distanceKm({ latitude: user.latitude, longitude: user.longitude }, { latitude: g.latitude, longitude: g.longitude }).toFixed(1));
      }
      const needed = Math.max(0, (g.minimumRequiredLand || 5) - (g.totalLandArea || 0));
      return {
        groupId: String(g._id),
        machine: g.listing?.title || "Machine",
        category: g.listing?.category || "Equipment",
        location: g.location,
        distanceKm: distance,
        status: g.status,
        totalPooledLand: `${g.totalLandArea || 0} Bigha`,
        minLandRequired: `${g.minimumRequiredLand || 5} Bigha`,
        landNeededToComplete: `${needed} Bigha`,
        discount: `${g.groupDiscountPercent || 10}% Group Discount`,
        membersCount: g.members?.length || 0,
        bookingDate: g.bookingDate ? new Date(g.bookingDate).toLocaleDateString("en-IN") : "Flexible"
      };
    });
  } catch (err) {
    return { error: "Failed to search group bookings." };
  }
}

async function getEligibleOffers(args = {}, user = {}) {
  try {
    const now = new Date();
    const query = {
      isActive: true,
      status: { $nin: ["Inactive", "Draft", "Paused"] },
      startDate: { $lte: now },
      endDate: { $gte: now },
      $and: [
        { $or: [{ totalUsageLimit: null }, { $expr: { $lt: ["$usedCount", "$totalUsageLimit"] } }] },
        { $or: [{ campaignBudget: null }, { $expr: { $lt: ["$budgetSpent", "$campaignBudget"] } }] }
      ]
    };

    if (args.serviceType && args.serviceType !== "All") {
      query.applicableService = { $in: ["All", args.serviceType] };
    }

    const offers = await Offer.find(query).sort({ discountValue: -1 }).limit(6).lean();
    return offers.map((o) => ({
      offerId: String(o._id),
      code: o.code || "AUTOMATIC",
      title: o.title,
      description: o.description,
      discount: o.discountType === "Percentage" ? `${o.discountValue}% OFF` : `₹${o.discountValue} FLAT OFF`,
      maxDiscount: o.maxDiscount ? `Up to ₹${o.maxDiscount}` : "No limit",
      minimumBookingAmount: o.minimumBookingAmount ? `₹${o.minimumBookingAmount}` : "None",
      applicableService: o.applicableService,
      validUntil: o.endDate ? new Date(o.endDate).toLocaleDateString("en-IN") : "Ongoing",
      fundingSource: "WorkShetu Platform"
    }));
  } catch (err) {
    return { error: "Failed to fetch platform offers." };
  }
}

async function calculateBookingPrice(args = {}, user = {}) {
  try {
    let basePricePerUnit = Number(args.pricePerUnit) || 0;
    let category = args.category || "Tractor";
    let unit = args.unit || "Bigha";

    if (args.machineId && mongoose.isValidObjectId(args.machineId)) {
      const machine = await Machine.findById(args.machineId).select("price unit category title").lean();
      if (machine) {
        basePricePerUnit = machine.price;
        unit = machine.unit || unit;
        category = machine.category || category;
      }
    }

    const landArea = Math.max(0, Number(args.landArea) || 1);
    const baseServicePrice = Math.round(basePricePerUnit * landArea);

    // Land-area pricing rule: plots < 5 Bigha incur mandatory small-land surcharge
    let mandatoryCharges = 0;
    let surchargeExplanation = "";
    if (unit.toLowerCase().includes("bigha") && landArea < 5) {
      mandatoryCharges = getSmallLandExtraCharge(landArea);
      surchargeExplanation = `Plot size is ${landArea} Bigha (under threshold 5 Bigha). Small-land surcharge of ₹${mandatoryCharges} applies to support driver mobilization.`;
    }

    // Find eligible offer
    let offer = null;
    if (args.offerCode) {
      const validation = await validateOffer({
        code: args.offerCode,
        user,
        requestType: "Machine",
        category,
        basePrice: baseServicePrice,
        landArea,
        location: args.location || user.location || ""
      });
      if (validation.isValid) offer = validation.offer;
    } else {
      offer = await findBestAutomaticOffer({
        user,
        requestType: "Machine",
        category,
        basePrice: baseServicePrice,
        landArea,
        location: args.location || user.location || ""
      });
    }

    const quote = calculateFinalPrice({
      baseServicePrice,
      mandatoryCharges,
      offer
    });

    return {
      category,
      landArea: `${landArea} ${unit}`,
      baseRatePerUnit: `₹${basePricePerUnit} / ${unit}`,
      baseServicePrice: `₹${baseServicePrice}`,
      mandatoryCharges: `₹${quote.mandatoryNonDiscountableCharges}`,
      surchargeExplanation: surchargeExplanation || "No plot surcharge applied.",
      offerApplied: offer ? { code: offer.code || "AUTOMATIC", title: offer.title, discount: `₹${quote.actualDiscount}` } : null,
      farmerPayable: `₹${quote.farmerPayable}`,
      driverPayout: `₹${quote.driverPayout}`,
      platformFundingNote: quote.actualDiscount > 0
        ? `WorkShetu funds ₹${quote.actualDiscount} promotional discount. Driver receives full agreed payout of ₹${quote.driverPayout} with 0 deduction.`
        : "No promotional discount applied."
    };
  } catch (err) {
    return { error: `Price calculation error: ${err.message}` };
  }
}

async function requestCancelBooking(args = {}, user = {}, confirm = false, actionId = null) {
  if (!user?._id) return { error: "User is not authenticated." };
  const bookingId = args.bookingId;
  if (!mongoose.isValidObjectId(bookingId)) return { error: "Invalid booking ID." };

  const booking = await Booking.findOne({ _id: bookingId, customer: user._id });
  if (!booking) return { error: "Booking not found or does not belong to you." };
  if (booking.status !== "Pending") {
    return { error: `Only Pending bookings can be cancelled via assistant. Current status is ${booking.status}. Please use the WorkShetu Bookings page for accepted bookings.` };
  }

  const summary = `Cancel Pending booking #${bookingId} (${booking.requestType})`;

  if (!confirm) {
    const action = createPendingAction({
      userId: user._id,
      role: "Farmer",
      actionType: "requestCancelBooking",
      params: { bookingId, reason: args.reason },
      summary
    });
    return {
      requiresConfirmation: true,
      actionId: action.actionId,
      actionType: "requestCancelBooking",
      summary,
      message: `Are you sure you want to cancel your Pending booking for ${booking.requestType}? Please confirm to proceed.`
    };
  }

  // Execution
  booking.status = "Cancelled";
  booking.historyExpiresAt = new Date(Date.now() + REJECTED_TTL_MS);
  await booking.save();
  if (actionId) discardPendingAction(actionId, user._id);

  return {
    success: true,
    bookingId: String(booking._id),
    status: "Cancelled",
    message: `Booking #${bookingId} has been successfully cancelled.`
  };
}

// ==========================================
// DRIVER TOOLS IMPLEMENTATION
// ==========================================
async function getDriverRequests(args = {}, user = {}) {
  if (!user?._id) return { error: "User is not authenticated." };
  try {
    const statusFilter = args.status || "Pending";
    const condition = { owner: user._id };
    if (statusFilter !== "All") {
      condition.status = statusFilter;
    }

    const singleRequests = await Booking.find(condition)
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("customer", "fullName phone")
      .lean();

    const items = await Promise.all(singleRequests.map(async (b) => {
      let itemTitle = "Machine";
      if (b.requestType === "Machine") {
        const m = await Machine.findById(b.itemId).select("title category").lean();
        if (m) itemTitle = `${m.title} (${m.category})`;
      }
      return {
        bookingId: String(b._id),
        type: b.bookingType || "Single",
        service: itemTitle,
        farmerName: b.customerName || b.customer?.fullName || "Farmer",
        farmerPhone: b.status === "Accepted" ? (b.customerPhone || b.customer?.phone) : "Hidden until accepted",
        farmerLocation: b.customerLocation,
        landArea: b.landArea ? `${b.landArea} ${b.areaUnit || "Bigha"}` : undefined,
        requiredDate: b.requiredDate ? new Date(b.requiredDate).toLocaleDateString("en-IN") : "N/A",
        driverPayout: b.driverPayout ? `₹${b.driverPayout}` : `₹${b.totalPrice}`,
        status: b.status,
        createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "N/A"
      };
    }));

    const groupRequests = await GroupBooking.find({
      owner: user._id,
      status: statusFilter === "All" ? { $ne: "Cancelled" } : (statusFilter === "Pending" ? { $in: ["Ready", "RequestSent"] } : statusFilter)
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("listing", "title category")
      .lean();

    const groupItems = groupRequests.map((gb) => ({
      groupBookingId: String(gb._id),
      machine: gb.listing ? `${gb.listing.title} (${gb.listing.category})` : "Machine",
      status: gb.status,
      location: gb.location,
      totalLandArea: `${gb.totalLandArea} Bigha`,
      membersCount: gb.members?.length || 0,
      bookingDate: gb.bookingDate ? new Date(gb.bookingDate).toLocaleDateString("en-IN") : "N/A"
    }));

    return {
      statusFilter,
      requestsCount: items.length + groupItems.length,
      singleBookings: items,
      groupBookings: groupItems
    };
  } catch (err) {
    return { error: "Failed to retrieve driver requests." };
  }
}

async function getDriverListings(args = {}, user = {}) {
  if (!user?._id) return { error: "User is not authenticated." };
  try {
    const [machines, labours, transports] = await Promise.all([
      Machine.find({ owner: user._id }).lean(),
      Labour.find({ owner: user._id }).lean(),
      Transport.find({ owner: user._id }).lean()
    ]);

    const isEligible = isDriverEligible(user);

    return {
      driverStatus: getDriverAccountStatus(user),
      isPubliclyVisible: isEligible,
      visibilityNote: isEligible
        ? "Your listings are active and publicly visible to farmers."
        : "Your listings are hidden because your driver account is pending approval, suspected, or suspended.",
      machines: machines.map((m) => ({
        machineId: String(m._id),
        title: m.title,
        category: m.category,
        price: `₹${m.price} / ${m.unit}`,
        availability: m.availability,
        location: m.location
      })),
      labours: labours.map((l) => ({
        labourId: String(l._id),
        name: l.name,
        type: l.labourType,
        price: `₹${l.price} / day`,
        availability: l.availability
      })),
      transports: transports.map((t) => ({
        transportId: String(t._id),
        vehicleName: t.vehicleName,
        type: t.vehicleType,
        price: `₹${t.price}`,
        availability: t.availability
      }))
    };
  } catch (err) {
    return { error: "Failed to retrieve driver listings." };
  }
}

async function getDriverEarnings(args = {}, user = {}) {
  if (!user?._id) return { error: "User is not authenticated." };
  try {
    const completed = await Booking.find({
      owner: user._id,
      status: "Completed"
    }).sort({ completedAt: -1 }).lean();

    let totalEarnings = 0;
    const history = completed.map((b) => {
      const earning = Number(b.driverPayout || b.earning || b.finalPrice || b.totalPrice || 0);
      totalEarnings += earning;
      return {
        bookingId: String(b._id),
        service: b.requestType,
        farmer: b.customerName,
        date: b.completedAt ? new Date(b.completedAt).toLocaleDateString("en-IN") : "N/A",
        payout: `₹${earning}`
      };
    });

    return {
      totalCompletedJobs: completed.length,
      totalEarnings: `₹${totalEarnings}`,
      guaranteedPayoutNote: "WorkShetu guarantees 100% payout of agreed amount. No platform discounts are deducted from your earnings.",
      recentJobs: history.slice(0, 5)
    };
  } catch (err) {
    return { error: "Failed to fetch driver earnings." };
  }
}

async function getDriverProfileStatus(args = {}, user = {}) {
  if (!user?._id) return { error: "User is not authenticated." };
  const fullUser = await User.findById(user._id).select(
    "fullName phone role isActive driverApplicationStatus driverApplicationDate driverRejectionReason driverSuspensionReason driverReviewReason driverVehicleType driverVehicleNumber driverExperience"
  ).lean();
  if (!fullUser) return { error: "Driver account not found." };

  const accountStatus = getDriverAccountStatus(fullUser);
  const eligible = isDriverEligible(fullUser);

  return {
    driverName: fullUser.fullName,
    phone: fullUser.phone,
    role: fullUser.role,
    accountStatus,
    isPubliclyVisible: eligible,
    applicationStatus: fullUser.driverApplicationStatus,
    applicationDate: fullUser.driverApplicationDate ? new Date(fullUser.driverApplicationDate).toLocaleDateString("en-IN") : "N/A",
    vehicleType: fullUser.driverVehicleType || "Not specified",
    vehicleNumber: fullUser.driverVehicleNumber || "Not specified",
    experienceYears: fullUser.driverExperience != null ? `${fullUser.driverExperience} years` : "N/A",
    suspensionReason: fullUser.driverSuspensionReason,
    reviewReason: fullUser.driverReviewReason,
    rejectionReason: fullUser.driverRejectionReason
  };
}

async function respondToBookingRequest(args = {}, user = {}, confirm = false, actionId = null) {
  if (!user?._id) return { error: "User is not authenticated." };
  const bookingId = args.bookingId;
  const decision = String(args.decision || "").trim().toLowerCase();
  if (!["accept", "reject"].includes(decision)) {
    return { error: "Decision must be either 'Accept' or 'Reject'." };
  }
  if (!mongoose.isValidObjectId(bookingId)) return { error: "Invalid booking ID." };

  const booking = await Booking.findOne({ _id: bookingId, owner: user._id });
  if (!booking) return { error: "Booking request not found or not assigned to you." };
  if (booking.status !== "Pending") {
    return { error: `This booking is already in '${booking.status}' status.` };
  }

  const isAccept = decision === "accept";
  const actionName = isAccept ? "Accept" : "Reject";
  const summary = `${actionName} booking request #${bookingId} from ${booking.customerName} for ${booking.requestType}`;

  if (!confirm) {
    const action = createPendingAction({
      userId: user._id,
      role: "Driver",
      actionType: "respondToBookingRequest",
      params: { bookingId, decision, reason: args.reason },
      summary
    });
    return {
      requiresConfirmation: true,
      actionId: action.actionId,
      actionType: "respondToBookingRequest",
      summary,
      message: `Are you sure you want to ${actionName.toLowerCase()} booking request #${bookingId}? Please confirm to finalize.`
    };
  }

  // Execution
  if (isAccept) {
    booking.status = "Accepted";
    booking.completionOtp = createCompletionOtp();
    booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.save();
    if (actionId) discardPendingAction(actionId, user._id);
    return {
      success: true,
      bookingId: String(booking._id),
      status: "Accepted",
      message: `Booking #${bookingId} accepted successfully! WorkShetu has generated a 6-digit Completion OTP for the farmer. Once work is complete, ask the farmer for the OTP to finalize your payout.`
    };
  } else {
    booking.status = "Rejected";
    booking.historyExpiresAt = new Date(Date.now() + REJECTED_TTL_MS);
    await booking.save();
    if (actionId) discardPendingAction(actionId, user._id);
    return {
      success: true,
      bookingId: String(booking._id),
      status: "Rejected",
      message: `Booking #${bookingId} has been rejected.`
    };
  }
}

async function verifyBookingCompletion(args = {}, user = {}) {
  if (!user?._id) return { error: "User is not authenticated." };
  const bookingId = args.bookingId;
  const otp = String(args.otp || "").trim();
  if (!mongoose.isValidObjectId(bookingId)) return { error: "Invalid booking ID." };
  if (!/^\d{6}$/.test(otp)) return { error: "Please provide a valid 6-digit completion OTP." };

  const booking = await Booking.findOne({ _id: bookingId, owner: user._id }).select("+completionOtp +completionOtpExpiresAt");
  if (!booking) return { error: "Booking not found or not assigned to you." };
  if (booking.status !== "Accepted") {
    return { error: `Booking status is '${booking.status}'. Only accepted bookings can be completed with an OTP.` };
  }
  if (!booking.completionOtp || booking.completionOtp !== otp) {
    return { error: "Incorrect completion OTP. Please verify the 6-digit OTP with the farmer." };
  }
  if (booking.completionOtpExpiresAt && booking.completionOtpExpiresAt < new Date()) {
    return { error: "This completion OTP has expired. Please contact support." };
  }

  booking.status = "Completed";
  booking.otpVerified = true;
  booking.completedAt = new Date();
  booking.earning = booking.driverPayout || booking.finalPrice || booking.totalPrice || 0;
  await booking.save();

  return {
    success: true,
    bookingId: String(booking._id),
    status: "Completed",
    earnedPayout: `₹${booking.earning}`,
    message: `OTP verified! Booking #${bookingId} is marked as Completed. Payout of ₹${booking.earning} has been confirmed.`
  };
}

// ==========================================
// ADMIN TOOLS IMPLEMENTATION
// ==========================================
async function getAdminDashboardStats(args = {}, user = {}) {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalFarmers,
      totalMachines,
      totalLabour,
      totalTransport,
      totalBookings,
      pendingBookings,
      acceptedBookings,
      completedBookings,
      cancelledBookings,
      pendingApplications,
      activeOffers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Driver" }),
      User.countDocuments({ role: "Farmer" }),
      Machine.countDocuments(),
      Labour.countDocuments(),
      Transport.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Pending" }),
      Booking.countDocuments({ status: "Accepted" }),
      Booking.countDocuments({ status: "Completed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      User.countDocuments({ driverApplicationStatus: "Pending" }),
      Offer.countDocuments({ isActive: true, status: "Active" })
    ]);

    return {
      users: { totalUsers, totalFarmers, totalDrivers },
      inventory: { totalMachines, totalLabour, totalTransport },
      bookings: {
        totalBookings,
        pendingBookings,
        acceptedBookings,
        completedBookings,
        cancelledBookings
      },
      driverApplicationsPending: pendingApplications,
      activePromotions: activeOffers
    };
  } catch (err) {
    return { error: "Failed to fetch admin dashboard statistics." };
  }
}

async function getDriverApplications(args = {}, user = {}) {
  try {
    const status = args.status || "Pending";
    const query = {};
    if (status !== "All") {
      query.driverApplicationStatus = status;
    } else {
      query.driverApplicationStatus = { $in: ["Pending", "Approved", "Suspected", "Rejected"] };
    }

    const apps = await User.find(query)
      .select("fullName phone role driverApplicationStatus driverApplicationDate driverVehicleType driverVehicleNumber driverExperience driverAddress isActive driverSuspensionReason driverReviewReason")
      .sort({ driverApplicationDate: -1, updatedAt: -1 })
      .limit(10)
      .lean();

    return apps.map((u) => ({
      userId: String(u._id),
      fullName: u.fullName,
      phone: u.phone,
      status: u.driverApplicationStatus,
      accountStatus: getDriverAccountStatus(u),
      vehicleType: u.driverVehicleType || "N/A",
      vehicleNumber: u.driverVehicleNumber || "N/A",
      experience: u.driverExperience != null ? `${u.driverExperience} yrs` : "N/A",
      appliedDate: u.driverApplicationDate ? new Date(u.driverApplicationDate).toLocaleDateString("en-IN") : "N/A",
      suspensionReason: u.driverSuspensionReason,
      reviewReason: u.driverReviewReason
    }));
  } catch (err) {
    return { error: "Failed to fetch driver applications." };
  }
}

async function manageDriverStatus(args = {}, user = {}, confirm = false, actionId = null) {
  const driverId = args.driverId;
  const action = String(args.action || "").trim().toLowerCase();
  const reason = args.reason || "";

  if (!mongoose.isValidObjectId(driverId)) return { error: "Invalid driver/user ID." };
  if (!["approve", "reject", "suspend", "review", "reactivate"].includes(action)) {
    return { error: "Action must be one of: 'approve', 'reject', 'suspend', 'review', 'reactivate'." };
  }

  const target = await User.findById(driverId);
  if (!target) return { error: "Target user/driver not found." };

  const summary = `Admin ${action.toUpperCase()} action on driver ${target.fullName} (${target.phone})`;

  if (!confirm) {
    const pending = createPendingAction({
      userId: user._id,
      role: "Admin",
      actionType: "manageDriverStatus",
      params: { driverId, action, reason },
      summary
    });
    return {
      requiresConfirmation: true,
      actionId: pending.actionId,
      actionType: "manageDriverStatus",
      summary,
      message: `Confirmation required: Do you wish to perform '${action}' on driver ${target.fullName} (${target.phone})? Please confirm.`
    };
  }

  // Execution
  if (action === "approve") {
    target.role = "Driver";
    target.driverApplicationStatus = "Approved";
    target.isActive = true;
    target.driverRejectionReason = undefined;
    target.driverSuspensionReason = undefined;
    target.driverReviewReason = undefined;
    await target.save();
    // Activate machinery listings
    await Machine.updateMany({ owner: target._id }, { availability: "Available" });
  } else if (action === "reject") {
    target.role = "Farmer";
    target.driverApplicationStatus = "Rejected";
    target.driverRejectionReason = reason || "Application rejected by administrator.";
    await target.save();
    // Hide machinery listings
    await Machine.updateMany({ owner: target._id }, { availability: "Hidden" });
  } else if (action === "suspend") {
    target.isActive = false;
    target.driverSuspensionReason = reason || "Driver suspended by administrator.";
    target.driverSuspendedAt = new Date();
    await target.save();
    await Machine.updateMany({ owner: target._id }, { availability: "Hidden" });
  } else if (action === "review") {
    target.driverApplicationStatus = "Suspected";
    target.driverReviewReason = reason || "Flagged for administrative review.";
    target.driverReviewedAt = new Date();
    await target.save();
    await Machine.updateMany({ owner: target._id }, { availability: "Hidden" });
  } else if (action === "reactivate") {
    target.isActive = true;
    target.driverApplicationStatus = "Approved";
    target.role = "Driver";
    target.driverSuspensionReason = undefined;
    target.driverReviewReason = undefined;
    await target.save();
    await Machine.updateMany({ owner: target._id }, { availability: "Available" });
  }

  if (actionId) discardPendingAction(actionId, user._id);

  return {
    success: true,
    driverId: String(target._id),
    fullName: target.fullName,
    actionApplied: action,
    newStatus: getDriverAccountStatus(target),
    message: `Driver ${target.fullName} account status successfully updated to '${getDriverAccountStatus(target)}'.`
  };
}

async function getPlatformBookings(args = {}, user = {}) {
  try {
    const query = {};
    if (args.status && args.status !== "All") {
      query.status = args.status;
    }
    if (args.type && args.type !== "All") {
      query.requestType = args.type;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("customer", "fullName phone")
      .populate("owner", "fullName phone")
      .lean();

    return bookings.map((b) => ({
      bookingId: String(b._id),
      type: b.requestType,
      farmer: b.customer?.fullName || b.customerName,
      driver: b.owner?.fullName || "Assigned Driver",
      totalPrice: `₹${b.totalPrice || b.finalPrice}`,
      status: b.status,
      date: b.bookingDate ? new Date(b.bookingDate).toLocaleDateString("en-IN") : "N/A"
    }));
  } catch (err) {
    return { error: "Failed to fetch platform bookings." };
  }
}

async function getOfferAnalytics(args = {}, user = {}) {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 }).limit(10).lean();
    return offers.map((o) => {
      const budget = Number(o.campaignBudget) || 0;
      const spent = Number(o.budgetSpent) || 0;
      const remaining = budget > 0 ? Math.max(0, budget - spent) : "Unlimited";
      return {
        offerId: String(o._id),
        code: o.code,
        title: o.title,
        status: o.status,
        discount: o.discountType === "Percentage" ? `${o.discountValue}%` : `₹${o.discountValue}`,
        campaignBudget: budget > 0 ? `₹${budget}` : "No budget cap",
        budgetSpent: `₹${spent}`,
        remainingBudget: typeof remaining === "number" ? `₹${remaining}` : remaining,
        redemptions: o.usedCount || 0
      };
    });
  } catch (err) {
    return { error: "Failed to fetch offer analytics." };
  }
}

async function getPlatformComplaints(args = {}, user = {}) {
  try {
    const query = {};
    if (args.status && args.status !== "All") {
      query.status = args.status;
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return complaints.map((c) => ({
      complaintId: String(c._id),
      userName: c.userName,
      phone: c.userPhone,
      category: c.category,
      priority: c.priority,
      status: c.status,
      subject: c.subject,
      description: c.description.slice(0, 150),
      createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "N/A"
    }));
  } catch (err) {
    return { error: "Failed to fetch complaints." };
  }
}

async function getPlatformListings(args = {}, user = {}) {
  try {
    const query = {};
    if (args.category) query.category = args.category;
    const machines = await Machine.find(query).sort({ createdAt: -1 }).limit(10).lean();
    return machines.map((m) => ({
      machineId: String(m._id),
      title: m.title,
      category: m.category,
      price: `₹${m.price} / ${m.unit}`,
      availability: m.availability,
      location: m.location
    }));
  } catch (err) {
    return { error: "Failed to fetch platform listings." };
  }
}

// ==========================================
// TOOL SCHEMAS & DEFINITIONS
// ==========================================
const toolDefinitions = {
  // Farmer tools
  searchMachines: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "searchMachines",
      description: "Search agricultural machinery listings by category, location, budget, power, and availability date.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: categories },
          searchText: { type: "string", maxLength: 80 },
          location: { type: "string", maxLength: 100 },
          radiusKm: { type: "number", minimum: 1, maximum: 200 },
          maxPrice: { type: "number", minimum: 0 },
          power: { type: "number", minimum: 1, maximum: 1000 },
          availableOn: { type: "string", description: "YYYY-MM-DD" },
          landArea: { type: "number", minimum: 0 },
          areaUnit: { type: "string", enum: ["Bigha", "Acre", "Hectare"] }
        },
        additionalProperties: false
      }
    }
  },
  getNearbyMachines: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "getNearbyMachines",
      description: "Search machinery near the farmer's saved or current GPS coordinates.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: categories },
          radiusKm: { type: "number", minimum: 1, maximum: 200 },
          maxPrice: { type: "number", minimum: 0 },
          availableOn: { type: "string", description: "YYYY-MM-DD" }
        },
        additionalProperties: false
      }
    }
  },
  getMachineDetails: {
    type: "function",
    allowedRoles: ["Farmer", "Driver", "Admin"],
    function: {
      name: "getMachineDetails",
      description: "Read machine specifications, owner, pricing, and ratings using a specific WorkShetu machineId.",
      parameters: {
        type: "object",
        properties: { machineId: { type: "string" } },
        required: ["machineId"],
        additionalProperties: false
      }
    }
  },
  checkAvailability: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "checkAvailability",
      description: "Check if a specific machine listing is free on a given date (YYYY-MM-DD).",
      parameters: {
        type: "object",
        properties: { machineId: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" } },
        required: ["machineId", "date"],
        additionalProperties: false
      }
    }
  },
  searchLabour: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "searchLabour",
      description: "Search agricultural workers and farm labour directory.",
      parameters: {
        type: "object",
        properties: {
          labourType: { type: "string", enum: labourTypes },
          location: { type: "string", maxLength: 100 },
          maxPrice: { type: "number", minimum: 0 }
        },
        additionalProperties: false
      }
    }
  },
  searchTransport: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "searchTransport",
      description: "Search farm transport vehicles (trucks, loaders, pickups, tempos).",
      parameters: {
        type: "object",
        properties: {
          vehicleType: { type: "string", enum: transportTypes },
          location: { type: "string", maxLength: 100 },
          maxPrice: { type: "number", minimum: 0 }
        },
        additionalProperties: false
      }
    }
  },
  getMyBookings: {
    type: "function",
    allowedRoles: ["Farmer"],
    function: {
      name: "getMyBookings",
      description: "Fetch farmer's own bookings filtered by status: 'Active', 'Accepted', 'Pending', 'Completed', 'Rejected', or 'All'.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Active", "Accepted", "Pending", "Completed", "Rejected", "All"] }
        },
        additionalProperties: false
      }
    }
  },
  getNearbyGroupBookings: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "getNearbyGroupBookings",
      description: "Search active forming group bookings nearby where farmers can pool land together for a 10% discount.",
      parameters: {
        type: "object",
        properties: { location: { type: "string", maxLength: 100 } },
        additionalProperties: false
      }
    }
  },
  getEligibleOffers: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "getEligibleOffers",
      description: "Check active WorkShetu promotional discounts and coupon codes.",
      parameters: {
        type: "object",
        properties: { serviceType: { type: "string", enum: ["Machine", "Labour", "Transport", "All"] } },
        additionalProperties: false
      }
    }
  },
  calculateBookingPrice: {
    type: "function",
    allowedRoles: ["Farmer", "Admin"],
    function: {
      name: "calculateBookingPrice",
      description: "Calculate transparent pricing breakdown including mandatory small-land surcharge (for plots < 5 Bigha) and platform-funded offer discounts.",
      parameters: {
        type: "object",
        properties: {
          machineId: { type: "string" },
          category: { type: "string" },
          pricePerUnit: { type: "number" },
          unit: { type: "string" },
          landArea: { type: "number", minimum: 0 },
          offerCode: { type: "string" },
          location: { type: "string" }
        },
        additionalProperties: false
      }
    }
  },
  requestCancelBooking: {
    type: "function",
    allowedRoles: ["Farmer"],
    function: {
      name: "requestCancelBooking",
      description: "Cancel a Pending booking request. Requires confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
          reason: { type: "string" },
          confirm: { type: "boolean" },
          actionId: { type: "string" }
        },
        required: ["bookingId"],
        additionalProperties: false
      }
    }
  },

  // Driver tools
  getDriverRequests: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "getDriverRequests",
      description: "View incoming fast and group booking requests assigned to the driver.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Pending", "Accepted", "Completed", "All"] }
        },
        additionalProperties: false
      }
    }
  },
  getMyListings: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "getMyListings",
      description: "View equipment listings owned by this driver, with active status and public visibility.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  getMyEarnings: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "getMyEarnings",
      description: "View driver's total earnings from completed jobs and recent job payouts.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  getDriverProfileStatus: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "getDriverProfileStatus",
      description: "Check the driver's verification status (Pending, Approved, Suspected, Suspended, Rejected).",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  respondToBookingRequest: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "respondToBookingRequest",
      description: "Accept or reject a customer booking request. Requires 2-step confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
          decision: { type: "string", enum: ["Accept", "Reject"] },
          reason: { type: "string" },
          confirm: { type: "boolean" },
          actionId: { type: "string" }
        },
        required: ["bookingId", "decision"],
        additionalProperties: false
      }
    }
  },
  verifyBookingCompletion: {
    type: "function",
    allowedRoles: ["Driver"],
    function: {
      name: "verifyBookingCompletion",
      description: "Enter farmer's 6-digit Completion OTP to finalize completed agricultural work and secure driver payout.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
          otp: { type: "string", description: "6-digit OTP provided by the farmer" }
        },
        required: ["bookingId", "otp"],
        additionalProperties: false
      }
    }
  },

  // Admin tools
  getAdminDashboardStats: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getAdminDashboardStats",
      description: "Get WorkShetu platform-wide overview metrics: users, drivers, listings, bookings, and active campaigns.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  getDriverApplications: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getDriverApplications",
      description: "Review driver registration applications by status (Pending, Approved, Suspected, Rejected, or All).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["Pending", "Approved", "Suspected", "Rejected", "All"] }
        },
        additionalProperties: false
      }
    }
  },
  manageDriverStatus: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "manageDriverStatus",
      description: "Approve, reject, suspend, flag for review, or reactivate a driver account. Requires 2-step confirmation.",
      parameters: {
        type: "object",
        properties: {
          driverId: { type: "string" },
          action: { type: "string", enum: ["approve", "reject", "suspend", "review", "reactivate"] },
          reason: { type: "string" },
          confirm: { type: "boolean" },
          actionId: { type: "string" }
        },
        required: ["driverId", "action"],
        additionalProperties: false
      }
    }
  },
  getPlatformBookings: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getPlatformBookings",
      description: "Inspect platform-wide bookings with status filter.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["All", "Pending", "Accepted", "Completed", "Cancelled", "Rejected"] },
          type: { type: "string", enum: ["All", "Machine", "Labour", "Transport"] }
        },
        additionalProperties: false
      }
    }
  },
  getOfferAnalytics: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getOfferAnalytics",
      description: "Inspect promotional campaigns, budget utilization, redemptions count, and remaining budget.",
      parameters: { type: "object", properties: {}, additionalProperties: false }
    }
  },
  getPlatformComplaints: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getPlatformComplaints",
      description: "Inspect user and driver complaints submitted to the platform.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["All", "Pending", "Under Review", "Resolved", "Rejected"] }
        },
        additionalProperties: false
      }
    }
  },
  getPlatformListings: {
    type: "function",
    allowedRoles: ["Admin"],
    function: {
      name: "getPlatformListings",
      description: "Inspect machine listings across the platform.",
      parameters: {
        type: "object",
        properties: { category: { type: "string", enum: categories } },
        additionalProperties: false
      }
    }
  }
};

/**
 * Normalizes user role string
 */
function normalizeRole(user) {
  if (!user) return "Farmer";
  if (user.isAdmin === true || String(user.role || "").trim().toLowerCase() === "admin") {
    return "Admin";
  }
  if (String(user.role || "").trim().toLowerCase() === "driver") {
    return "Driver";
  }
  return "Farmer";
}

/**
 * Returns available OpenAI tools allowed for a specific user role.
 */
function getToolsForRole(role) {
  const normRole = String(role || "Farmer").trim();
  const allowed = [];
  for (const def of Object.values(toolDefinitions)) {
    if (def.allowedRoles.includes(normRole)) {
      allowed.push({
        type: def.type,
        function: def.function
      });
    }
  }
  return allowed;
}

/**
 * Executes a tool securely, enforcing role isolation, authorization, and confirmation constraints.
 */
async function executeTool(name, args, user, context = {}) {
  const role = normalizeRole(user);
  const def = toolDefinitions[name];

  if (!def) {
    return { error: `Tool '${name}' does not exist.` };
  }

  if (!def.allowedRoles.includes(role)) {
    return { error: `Permission denied: Tool '${name}' is not authorized for role '${role}'.` };
  }

  const confirm = Boolean(args?.confirm || context.confirm);
  const actionId = args?.actionId || context.actionId;

  switch (name) {
    // Farmer tools
    case "searchMachines":
      return searchMachines(args, user);
    case "getNearbyMachines":
      return searchMachines(args, user, true);
    case "getMachineDetails":
      return getMachineDetails(args);
    case "checkAvailability":
      return checkAvailability(args);
    case "searchLabour":
      return searchDirectory("Labour", args, user);
    case "searchTransport":
      return searchDirectory("Transport", args, user);
    case "getMyBookings":
      return getFarmerBookings(user, args.status || "Active");
    case "getNearbyGroupBookings":
      return getNearbyGroupBookings(args, user);
    case "getEligibleOffers":
      return getEligibleOffers(args, user);
    case "calculateBookingPrice":
      return calculateBookingPrice(args, user);
    case "requestCancelBooking":
      return requestCancelBooking(args, user, confirm, actionId);

    // Driver tools
    case "getDriverRequests":
      return getDriverRequests(args, user);
    case "getMyListings":
      return getDriverListings(args, user);
    case "getMyEarnings":
      return getDriverEarnings(args, user);
    case "getDriverProfileStatus":
      return getDriverProfileStatus(args, user);
    case "respondToBookingRequest":
      return respondToBookingRequest(args, user, confirm, actionId);
    case "verifyBookingCompletion":
      return verifyBookingCompletion(args, user);

    // Admin tools
    case "getAdminDashboardStats":
      return getAdminDashboardStats(args, user);
    case "getDriverApplications":
      return getDriverApplications(args, user);
    case "manageDriverStatus":
      return manageDriverStatus(args, user, confirm, actionId);
    case "getPlatformBookings":
      return getPlatformBookings(args, user);
    case "getOfferAnalytics":
      return getOfferAnalytics(args, user);
    case "getPlatformComplaints":
      return getPlatformComplaints(args, user);
    case "getPlatformListings":
      return getPlatformListings(args, user);

    default:
      return { error: `Handler for '${name}' is not configured.` };
  }
}

module.exports = {
  toolDefinitions,
  normalizeRole,
  getToolsForRole,
  executeTool,
  createPendingAction,
  getPendingAction,
  discardPendingAction,
  // Export direct handlers for testing & fallback
  searchMachines,
  checkAvailability,
  getMachineDetails,
  searchDirectory,
  getFarmerBookings,
  getNearbyGroupBookings,
  getEligibleOffers,
  calculateBookingPrice,
  requestCancelBooking,
  getDriverRequests,
  getDriverListings,
  getDriverEarnings,
  getDriverProfileStatus,
  respondToBookingRequest,
  verifyBookingCompletion,
  getAdminDashboardStats,
  getDriverApplications,
  manageDriverStatus,
  getPlatformBookings,
  getOfferAnalytics,
  getPlatformComplaints,
  getPlatformListings
};

