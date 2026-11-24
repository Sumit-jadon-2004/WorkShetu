const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Booking = require("../models/BookingMachine.js");
const GroupBooking = require("../models/GroupBooking.js");
const Machine = require("../models/ListingMachin.js");
const User = require("../models/Owner.js");
const Offer = require("../models/Offer.js");
const { validateOffer, calculateFinalPrice } = require("../utils/pricingEngine.js");
const {
  GROUP_DISCOUNT_PERCENT,
  GROUP_MIN_LAND_AREA,
  getSinglePrice,
  getGroupMemberPrice,
  groupHasMember,
  groupHasOnlyVerifiedFarmerMembers,
  groupStatusForLand,
  hasValidCoordinates,
  isGroupLandEligible,
  isFarmerAccount,
  isRelatedLocation,
  recalculateGroup
} = require("../utils/groupBooking.js");
const { isLoggedIn, isFarmer } = require("../middleware/auth.js");
const { isDriverEligible } = require("../utils/driverEligibility.js");
const { validateBookingDate } = require("../utils/dateValidator.js");

const router = express.Router();
const standaloneGroupLocks = new Map();
const REJECTED_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

const OTP_SECRET = process.env.SESSION_SECRET || "workshetu-otp-secret-salt-2025-v1";
const OTP_ENCRYPTION_KEY = crypto.createHash("sha256").update(OTP_SECRET).digest();

function decryptOtp(cipherText) {
  if (!cipherText || !cipherText.includes(":")) return null;
  const [ivHex, encrypted] = cipherText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", OTP_ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function expireOverdueBookings(queryFilter = {}) {
  const now = new Date();
  const overdueBookings = await Booking.find({
    ...queryFilter,
    requestType: "Machine",
    bookingType: "Single",
    status: "Pending",
    responseDeadline: { $ne: null, $lte: now }
  });
  for (const b of overdueBookings) {
    const statusChangedAt = new Date();
    const purgeAt = new Date(statusChangedAt.getTime() + REJECTED_HISTORY_TTL_MS);
    b.status = "Expired";
    b.statusChangedAt = statusChangedAt;
    b.purgeAt = purgeAt;
    b.historyExpiresAt = purgeAt;
    await releaseOfferBudget(b);
    await b.save();
  }
}

async function migrateExistingExpiredAndRejectedBookings() {
  try {
    const unpurged = await Booking.find({
      status: { $in: ["Expired", "Rejected", "Cancelled"] },
      purgeAt: null
    });
    for (const b of unpurged) {
      const statusChangedAt = b.updatedAt || b.createdAt || new Date();
      b.statusChangedAt = statusChangedAt;
      b.purgeAt = new Date(new Date(statusChangedAt).getTime() + REJECTED_HISTORY_TTL_MS);
      b.historyExpiresAt = b.purgeAt;
      await b.save();
    }
  } catch (err) {
    console.error("Migration error for unpurged bookings:", err);
  }
}
migrateExistingExpiredAndRejectedBookings().catch(() => {});

async function withStandaloneGroupLock(key, callback) {
  const previous = standaloneGroupLocks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  standaloneGroupLocks.set(key, current);
  await previous;
  try {
    return await callback();
  } finally {
    release();
    if (standaloneGroupLocks.get(key) === current) standaloneGroupLocks.delete(key);
  }
}

function createCompletionOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function createUniqueCompletionOtp(usedOtps) {
  let otp = createCompletionOtp();
  while (usedOtps.has(otp)) otp = createCompletionOtp();
  usedOtps.add(otp);
  return otp;
}

function isOtpActive(expiresAt) {
  if (!expiresAt) return false;
  const expiryTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return false;
  return Date.now() < expiryTime;
}

function isOtpExpired(expiresAt) {
  if (!expiresAt) return false;
  const expiryTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(expiryTime)) return false;
  return Date.now() >= expiryTime;
}

function isValidOtp(value, expected) {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  const trimmedValue = value.trim();
  const trimmedExpected = expected.trim();
  if (!trimmedValue || !trimmedExpected || trimmedValue.length !== trimmedExpected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(trimmedValue), Buffer.from(trimmedExpected));
}

function getUserId(req) {
  return req.user?._id || req.user?.id;
}

function requireUser(req, res, next) {
  const userId = getUserId(req);
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return res.status(401).json({ message: "Please log in to create or join a group booking." });
  }
  req.customerId = userId;
  next();
}

const requireFarmer = [isLoggedIn];
const requireCustomer = [isLoggedIn];
const requireOwner = [isLoggedIn, async (req, res, next) => {
  const role = String(req.user.role || "").trim().toLowerCase();
  const isAdmin = req.user.isAdmin === true || role === "admin";
  if (isAdmin) return next();
  if ((role === "driver" || req.user.driverApplicationStatus === "Approved") && req.user.isActive !== false) {
    return next();
  }
  // Check if user owns any listed machine or has listings
  try {
    const hasMachine = await Machine.exists({ owner: req.user._id });
    if (hasMachine && req.user.isActive !== false) {
      return next();
    }
  } catch (err) {
    console.error("requireOwner machine check error:", err);
  }
  return res.status(403).json({ success: false, message: "Only approved active drivers or machine owners can manage group requests." });
}];

function validateMachineInput(body) {
  const landArea = Number(body.landArea);
  if (!Number.isFinite(landArea) || landArea <= 0) return "Land area must be a positive number.";
  if (!body.location || !String(body.location).trim()) return "Location is required.";
  const dateToValidate = body.bookingDate || body.requiredDate;
  if (dateToValidate) {
    const dateError = validateBookingDate(dateToValidate, body.preferredTime);
    if (dateError) return dateError;
  }
  for (const field of ["latitude", "longitude"]) {
    if (body[field] !== undefined && !Number.isFinite(Number(body[field]))) return `${field} must be a valid number.`;
  }
  return null;
}

function memberInput(body, customer) {
  return {
    user: customer._id,
    landArea: Number(body.landArea),
    location: String(body.location).trim(),
    latitude: customer.latitude,
    longitude: customer.longitude,
    locationVerified: true
  };
}

function utcDateRange(value) {
  const date = value ? new Date(value) : new Date();
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function memberPrice(machine, landArea) {
  const price = getGroupMemberPrice(machine.price, landArea);
  return {
    basePrice: price.basePrice,
    extraCharge: price.extraCharge,
    discountPercent: price.discountPercent,
    discountAmount: price.discountAmount,
    originalPrice: price.originalPrice,
    finalPrice: price.finalPrice
  };
}

async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session, offerData, responseDeadline, isInstantBooking }) {
  const booking = await Booking.create([{
    requestType: "Machine",
    bookingType,
    groupBookingId: groupBookingId || null,
    itemId: machine._id,
    owner: machine.owner,
    customer: customer._id,
    customerName: customer.fullName,
    customerPhone: customer.phone,
    customerLocation: String(body.location).trim(),
    customerLatitude: body.latitude == null ? undefined : Number(body.latitude),
    customerLongitude: body.longitude == null ? undefined : Number(body.longitude),
    landArea: Number(body.landArea),
    areaUnit: "Bigha",
    workType: body.workType || "General machine work",
    preferredTime: String(body.preferredTime || "").trim(),
    requiredDate: body.bookingDate || new Date(),
    bookingDate: body.bookingDate || new Date(),
    responseDeadline: responseDeadline || body.responseDeadline || null,
    isInstantBooking: Boolean(isInstantBooking ?? body.isInstantBooking),
    originalBookingId: body.originalBookingId && mongoose.isValidObjectId(body.originalBookingId) ? body.originalBookingId : null,
    basePrice: price.basePrice,
    extraCharge: price.extraCharge || 0,
    discountPercent: price.discountPercent || 0,
    discountAmount: price.discountAmount || 0,
    originalPrice: price.originalPrice,
    finalPrice: price.finalPrice,
    totalPrice: price.finalPrice,
    earning: price.originalPrice, // Driver receives full agreed booking amount without deduction
    driverPayout: price.originalPrice, // Guaranteed protected driver payout
    platformPromoExpense: offerData ? (price.discountAmount || 0) : 0, // Funded by WorkShetu
    fundingSource: offerData?.fundingSource || "WorkShetu",
    message: body.message || "",
    offerId: offerData?._id || null,
    offerCode: offerData?.code || null,
    offerTitle: offerData?.title || null,
    offerDiscount: offerData ? (price.discountAmount || 0) : 0
  }], session ? { session } : {});
  return booking[0];
}

async function createGroup(req, res) {
  const error = validateMachineInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const topologyType = mongoose.connection.client?.topology?.description?.type;
  const supportsTransactions = ["ReplicaSetWithPrimary", "ReplicaSetNoPrimary", "Sharded", "LoadBalanced"].includes(topologyType);
  const session = supportsTransactions ? await mongoose.startSession() : null;
  const sessionOptions = session ? { session } : {};
  const pendingWrites = { groupId: null, createdGroup: false, bookingId: null };

  try {
    let result;
    const createGroupBooking = async () => {
      const machine = await Machine.findById(req.body.itemId).session(session);
      const customer = await User.findById(req.customerId).session(session);
      if (!machine) throw Object.assign(new Error("Machine not found."), { status: 404 });
      if (!customer) throw Object.assign(new Error("User not found."), { status: 401 });
      if (!isFarmerAccount(customer)) throw Object.assign(new Error("Only an active account can join a group booking."), { status: 403 });
      if (!hasValidCoordinates(customer)) throw Object.assign(new Error("Save your farm coordinates in your Farmer profile before creating a group booking."), { status: 400 });
      if (req.body.areaUnit && req.body.areaUnit !== "Bigha") throw Object.assign(new Error("Group booking land area must be entered in Bigha."), { status: 400 });
      const machineOwnerId = String(machine.owner?._id || machine.owner);
      if (machineOwnerId === String(customer._id)) {
        throw Object.assign(new Error("You cannot book your own listing."), { status: 403 });
      }
      const machineOwner = await User.findById(machine.owner).select("role isAdmin isActive driverApplicationStatus").session(session);
      if (!machineOwner || !isDriverEligible(machineOwner) || machine.availability === "Hidden") {
        throw Object.assign(new Error("This machine's owner is currently unavailable or under review for bookings."), { status: 409 });
      }

      const member = memberInput(req.body, customer);
      const { start: bookingDayStart, end: bookingDayEnd } = utcDateRange(req.body.bookingDate);
      const existingMembership = await GroupBooking.findOne({
        listing: machine._id,
        requestType: "Machine",
        bookingDate: { $gte: bookingDayStart, $lt: bookingDayEnd },
        status: { $in: ["Forming", "Ready", "RequestSent", "Accepted"] },
        "members.user": customer._id
      }).session(session);
      if (existingMembership) throw Object.assign(new Error("You already have a booking in this group for the selected date."), { status: 409 });

      let candidates = req.joinGroupId
        ? [await GroupBooking.findById(req.joinGroupId).session(session)].filter(Boolean)
        : await GroupBooking.find({
            listing: machine._id,
            owner: machine.owner,
            requestType: "Machine",
            bookingDate: { $gte: bookingDayStart, $lt: bookingDayEnd },
            status: "Forming"
          }).sort({ createdAt: 1 }).session(session);

      if (req.joinGroupId && !candidates.length) {
        throw Object.assign(new Error("Group booking not found."), { status: 404 });
      }
      if (req.joinGroupId && candidates[0].status !== "Forming") {
        throw Object.assign(new Error("This group is no longer accepting members."), { status: 409 });
      }
      if (req.joinGroupId && (String(candidates[0].listing) !== String(machine._id) || String(candidates[0].owner) !== String(machine.owner))) {
        throw Object.assign(new Error("This group belongs to a different machine."), { status: 409 });
      }

      const candidateMemberIds = [...new Set(candidates.flatMap((group) => group.members.map((item) => String(item.user))))];
      const candidateUsers = candidateMemberIds.length
        ? await User.find({ _id: { $in: candidateMemberIds } }).select("role isAdmin isActive").session(session).lean()
        : [];
      let group = candidates.find((candidate) => groupHasOnlyVerifiedFarmerMembers(candidate, candidateUsers)
        && !groupHasMember(candidate, customer._id)
        && isRelatedLocation(candidate, member)) || null;
      if (req.joinGroupId && !group) {
        throw Object.assign(new Error("This group has no verified Farmer members within 2 KM of its saved location."), { status: 409 });
      }

      if (!group) {
        group = new GroupBooking({
          listing: machine._id,
          owner: machine.owner,
          requestType: "Machine",
          groupDiscountPercent: GROUP_DISCOUNT_PERCENT,
          minimumRequiredLand: GROUP_MIN_LAND_AREA,
          location: member.location,
          latitude: member.latitude,
          longitude: member.longitude,
          locationVerified: true,
          bookingDate: new Date(bookingDayStart)
        });
        await group.save(sessionOptions);
        pendingWrites.createdGroup = true;
      }
      pendingWrites.groupId = group._id;
      group.minimumRequiredLand = GROUP_MIN_LAND_AREA;

      const memberPriceData = memberPrice(machine, member.landArea);
      const booking = await createBooking({ machine, customer, body: { ...req.body, latitude: member.latitude, longitude: member.longitude }, bookingType: "Group", groupBookingId: group._id, price: memberPriceData, session });
      pendingWrites.bookingId = booking._id;
      Object.assign(member, memberPriceData, { booking: booking._id });
      group.members.push(member);
      recalculateGroup(group);
      group.status = groupStatusForLand(group.totalLandArea);
      await group.save(sessionOptions);

      await Booking.updateMany({ groupBookingId: group._id }, {
        $set: { discountPercent: group.groupDiscountPercent }
      }, sessionOptions);
      for (const groupMember of group.members) {
        await Booking.updateOne({ _id: groupMember.booking }, {
          $set: {
            discountPercent: group.groupDiscountPercent,
            discountAmount: groupMember.discountAmount,
            originalPrice: groupMember.originalPrice,
            finalPrice: groupMember.finalPrice,
            totalPrice: groupMember.finalPrice
          }
        }, sessionOptions);
      }
      result = group;
    };

    if (supportsTransactions) await withStandaloneGroupLock(String(req.body.itemId), () => session.withTransaction(createGroupBooking));
    else {
      console.warn("MongoDB deployment does not support transactions; creating group booking with compensating cleanup on failure.", { topologyType: topologyType || "unknown" });
      await withStandaloneGroupLock(String(req.body.itemId), createGroupBooking);
    }
    return res.status(201).json(await GroupBooking.findById(result._id).populate("members.user", "fullName phone"));
  } catch (caughtError) {
    console.error("Group booking submission failed", {
      error: caughtError.name || "GroupBookingError",
      code: caughtError.code || caughtError.errorLabels?.[0] || null,
      topologyType: topologyType || "unknown"
    });
    if (!supportsTransactions && pendingWrites.groupId && (pendingWrites.createdGroup || pendingWrites.bookingId)) {
      try {
        const group = await GroupBooking.findById(pendingWrites.groupId).session(session);
        if (group) {
          if (pendingWrites.createdGroup) {
            await Booking.deleteMany({ groupBookingId: group._id }, sessionOptions);
            await GroupBooking.deleteOne({ _id: group._id }, sessionOptions);
          } else {
            group.members = group.members.filter((member) => String(member.booking) !== String(pendingWrites.bookingId));
            recalculateGroup(group);
            group.status = groupStatusForLand(group.totalLandArea);
            await group.save(sessionOptions);
            await Promise.all(group.members.map((member) => Booking.updateOne({ _id: member.booking }, {
              $set: {
                discountPercent: group.groupDiscountPercent,
                discountAmount: member.discountAmount,
                originalPrice: member.originalPrice,
                finalPrice: member.finalPrice,
                totalPrice: member.finalPrice
              }
            }, sessionOptions)));
            if (pendingWrites.bookingId) await Booking.deleteOne({ _id: pendingWrites.bookingId }, sessionOptions);
          }
        } else if (pendingWrites.bookingId) {
          await Booking.deleteOne({ _id: pendingWrites.bookingId }, sessionOptions);
        }
      } catch (cleanupError) {
        console.error("Group booking rollback failed", { error: cleanupError.name || "CleanupError" });
      }
    }
    return res.status(caughtError.status || 400).json({ message: caughtError.message || "Group booking could not be created." });
  } finally {
    if (session) await session.endSession();
  }
}

router.post("/create", [...requireFarmer, requireUser], createGroup);

router.post("/:id/join", [...requireFarmer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid group booking ID." });
  const group = await GroupBooking.findById(req.params.id);
  if (!group) return res.status(404).json({ message: "Group booking not found." });
  if (group.status !== "Forming") return res.status(409).json({ message: "This group is no longer accepting members." });
  req.body.itemId = group.listing;
  req.joinGroupId = group._id;
  return createGroup(req, res);
});

router.get("/my", [...requireCustomer, requireUser], async (req, res) => {
  const groups = await GroupBooking.find({ "members.user": req.customerId }).sort({ createdAt: -1 }).populate("listing", "title price unit");
  return res.json(groups);
});

router.get("/my/requests", [...requireCustomer, requireUser], async (req, res) => {
  await expireOverdueBookings({ customer: req.customerId });
  const expiryCutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const legacyCompletedFilter = { status: "Completed", completedAt: null };

  // Backfill older completed requests so they enter the existing 15-day TTL window.
  await Promise.all([
    GroupBooking.updateMany({ ...legacyCompletedFilter, "members.user": req.customerId }, [{ $set: { completedAt: "$updatedAt" } }], { updatePipeline: true, timestamps: false }),
    Booking.updateMany({ ...legacyCompletedFilter, customer: req.customerId, requestType: "Machine" }, [{ $set: { completedAt: "$updatedAt" } }], { updatePipeline: true, timestamps: false })
  ]);

  const [groups, bookings] = await Promise.all([
    GroupBooking.find({
      "members.user": req.customerId,
      $or: [
        { status: { $nin: ["Completed", "Rejected", "Cancelled", "Expired"] } },
        { status: "Completed", completedAt: { $gt: expiryCutoff } },
        {
          status: { $in: ["Rejected", "Cancelled", "Expired"] },
          $or: [
            { purgeAt: { $gt: now } },
            { purgeAt: null, historyExpiresAt: { $gt: now } }
          ]
        }
      ]
    })
      .select("+members.completionOtp +members.completionOtpExpiresAt")
      .sort({ createdAt: -1 })
      .populate({
        path: "listing",
        select: "title category image location latitude longitude owner vehicleNumber",
        populate: {
          path: "owner",
          select: "fullName phone profileImage driverVehicleType driverVehicleNumber driverApplicationStatus driverExperience location"
        }
      })
      .populate("owner", "fullName phone profileImage driverVehicleType driverVehicleNumber driverApplicationStatus driverExperience location"),
    // Group members also have linked Booking documents for payment, status, and OTP.
    // Return only standalone bookings here because the group itself is already in `groups`.
    Booking.find({
      customer: req.customerId,
      requestType: "Machine",
      bookingType: "Single",
      $or: [
        { status: { $nin: ["Completed", "Rejected", "Cancelled", "Expired"] } },
        { status: "Completed", completedAt: { $gt: expiryCutoff } },
        {
          status: { $in: ["Rejected", "Cancelled", "Expired"] },
          $or: [
            { purgeAt: { $gt: now } },
            { purgeAt: null, historyExpiresAt: { $gt: now } }
          ]
        }
      ]
    })
      .select("+completionOtp +completionOtpCipher +completionOtpExpiresAt")
      .sort({ createdAt: -1 })
      .populate({
        path: "itemId",
        select: "title name category labourType image location latitude longitude owner vehicleNumber price pricingUnit",
        populate: {
          path: "owner",
          select: "fullName phone profileImage driverVehicleType driverVehicleNumber driverApplicationStatus driverExperience location"
        }
      })
      .populate("owner", "fullName phone profileImage driverVehicleType driverVehicleNumber driverApplicationStatus driverExperience location")
  ]);

  const acceptedGroupsWithMissingOtp = groups.filter((group) => {
    if (group.status !== "Accepted") return false;
    const issuedOtps = new Set();
    return group.members.some((member) => {
      if (!member.completionOtp || !isOtpActive(member.completionOtpExpiresAt) || issuedOtps.has(member.completionOtp)) return true;
      issuedOtps.add(member.completionOtp);
      return false;
    });
  });
  const acceptedBookingsWithoutOtp = bookings.filter((booking) =>
    booking.status === "Accepted" && booking.requestType === "Machine" && (!booking.completionOtp || !isOtpActive(booking.completionOtpExpiresAt))
  );

  await Promise.all([
    ...acceptedGroupsWithMissingOtp.map((group) => {
      const usedOtps = new Set();
      for (const member of group.members) {
        if (!member.completionOtp || !isOtpActive(member.completionOtpExpiresAt) || usedOtps.has(member.completionOtp)) {
          member.completionOtp = createUniqueCompletionOtp(usedOtps);
          member.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          member.otpVerified = false;
        } else usedOtps.add(member.completionOtp);
      }
      return group.save();
    }),
    ...acceptedBookingsWithoutOtp.map((booking) => {
      booking.completionOtp = createCompletionOtp();
      booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      booking.otpVerified = false;
      return booking.save();
    })
  ]);

  const resolveDriverInfo = (ownerDoc, listingDoc, bookingStatus, requestType) => {
    const isLabour = requestType === "Labour";
    const driverUser = (ownerDoc && typeof ownerDoc === "object" && ownerDoc.fullName)
      ? ownerDoc
      : (listingDoc?.owner && typeof listingDoc.owner === "object" && listingDoc.owner.fullName)
        ? listingDoc.owner
        : null;

    if (!driverUser) {
      return null;
    }

    const isConfirmed = ["Accepted", "Completed"].includes(bookingStatus);
    const vehicleType = isLabour
      ? (listingDoc?.labourType || "Agricultural Worker")
      : (driverUser.driverVehicleType || listingDoc?.category || "Tractor");
    const vehicleNumber = isLabour ? "" : (driverUser.driverVehicleNumber || listingDoc?.vehicleNumber || "");

    return {
      _id: driverUser._id,
      fullName: driverUser.fullName || (isLabour ? (listingDoc?.name || "Labour Worker") : "Verified Driver"),
      phone: isConfirmed ? (driverUser.phone || "") : "",
      profileImage: driverUser.profileImage?.url || driverUser.profileImage || null,
      vehicleType,
      vehicleNumber,
      driverApplicationStatus: driverUser.driverApplicationStatus || "None",
      isVerified: isLabour ? true : driverUser.driverApplicationStatus === "Approved",
      driverExperience: isLabour ? (listingDoc?.experienceYears || 0) : (driverUser.driverExperience || 0),
      location: driverUser.location || listingDoc?.location || ""
    };
  };

  const safeGroups = groups.map((group) => {
    const data = group.toObject();
    for (const member of data.members || []) {
      if (String(member.user?._id || member.user) !== String(req.customerId)) {
        delete member.completionOtp;
        delete member.completionOtpExpiresAt;
      }
    }
    const driverInfo = resolveDriverInfo(data.owner, data.listing, data.status, "Machine");
    data.driver = driverInfo;
    if (data.owner && typeof data.owner === "object" && !["Accepted", "Completed"].includes(data.status)) {
      data.owner.phone = "";
    }
    return data;
  });

  const safeBookings = bookings.map((booking) => {
    const data = booking.toObject();
    const isConfirmed = ["Accepted", "Completed"].includes(data.status);
    const driverInfo = resolveDriverInfo(data.owner, data.itemId, data.status, data.requestType);
    data.driver = driverInfo;
    if (data.owner && typeof data.owner === "object" && !isConfirmed) {
      data.owner.phone = "";
    }
    if (data.requestType === "Labour") {
      if (data.status === "Accepted" && data.completionOtpCipher) {
        try {
          data.completionOtp = decryptOtp(data.completionOtpCipher);
        } catch (e) {
          data.completionOtp = "";
        }
      } else if (data.status !== "Accepted") {
        delete data.completionOtp;
      }
      delete data.completionOtpCipher;
    }
    return data;
  });

  return res.json({ groups: safeGroups, bookings: safeBookings });
});

async function releaseOfferBudget(bookingOrOfferId, directDiscount) {
  if (!bookingOrOfferId) return;
  const offerId = (bookingOrOfferId && bookingOrOfferId.offerId) ? bookingOrOfferId.offerId : bookingOrOfferId;
  const discount = Number(directDiscount != null ? directDiscount : (bookingOrOfferId.offerDiscount || bookingOrOfferId.discountAmount || 0));
  if (!offerId) return;
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) return;
    offer.usedCount = Math.max(0, (offer.usedCount || 0) - 1);
    offer.budgetSpent = Math.max(0, (offer.budgetSpent || 0) - discount);
    if (offer.status === "Paused" && offer.campaignBudget && offer.budgetSpent < offer.campaignBudget) {
      const now = new Date();
      if (!offer.endDate || now <= offer.endDate) {
        offer.status = "Active";
      }
    }
    await offer.save();
    return offer;
  } catch (err) {
    console.error("Failed to release offer budget:", err);
  }
}

router.put("/my/single/:id/cancel", [...requireCustomer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.customerId,
    requestType: "Machine",
    bookingType: "Single",
    status: "Pending"
  });
  if (!booking) return res.status(409).json({ message: "This booking can no longer be cancelled." });
  await releaseOfferBudget(booking);
  await Booking.deleteOne({ _id: booking._id });
  return res.json({ success: true, message: "Booking cancelled and removed successfully." });
});

router.put("/my/group/:id/cancel", [...requireFarmer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.customerId,
    requestType: "Machine",
    bookingType: "Group",
    status: "Pending"
  });
  if (!booking || !booking.groupBookingId) return res.status(409).json({ message: "This booking can no longer be cancelled." });

  const group = await GroupBooking.findOne({ _id: booking.groupBookingId, status: { $in: ["Forming", "RequestSent", "Ready"] } });
  if (!group) return res.status(409).json({ message: "This group booking can no longer be cancelled." });

  await Booking.deleteOne({ _id: booking._id });
  group.members = group.members.filter((member) => String(member.booking) !== String(booking._id));
  recalculateGroup(group);
  group.minimumRequiredLand = GROUP_MIN_LAND_AREA;
  group.status = group.members.length ? groupStatusForLand(group.totalLandArea) : "Cancelled";
  await group.save();
  await Promise.all(group.members.map((member) => Booking.updateOne({ _id: member.booking }, {
    $set: {
      discountPercent: group.groupDiscountPercent,
      discountAmount: member.discountAmount,
      originalPrice: member.originalPrice,
      finalPrice: member.finalPrice,
      totalPrice: member.finalPrice
    }
  })));
  return res.json({ success: true, message: "Group booking cancelled successfully." });
});

router.get("/owner/list", [...requireOwner, requireUser], async (req, res) => {
  const groups = await GroupBooking.find({ owner: req.customerId }).sort({ createdAt: -1 }).populate("members.user", "fullName phone").populate("listing", "title price unit");
  return res.json(groups.map((group) => {
    const data = group.toObject();
    if (data.status !== "Accepted") {
      data.members = data.members.map((member) => {
        if (member.user) delete member.user.phone;
        return member;
      });
    }
    return data;
  }));
});

router.get("/owner/requests", [...requireOwner, requireUser], async (req, res) => {
  await expireOverdueBookings({ owner: req.customerId });
  const now = new Date();
  const [groups, bookings, rejectedHistory] = await Promise.all([
    GroupBooking.find({ owner: req.customerId, status: { $nin: ["Rejected", "Cancelled", "Completed", "Expired"] } })
      .sort({ createdAt: -1 })
      .populate("members.user", "fullName phone")
      .populate("listing", "title price unit"),
    Booking.find({
      owner: req.customerId,
      requestType: "Machine",
      bookingType: "Single",
      status: { $nin: ["Rejected", "Cancelled", "Completed", "Expired"] }
    })
      .sort({ createdAt: -1 })
      .populate("itemId", "title category image")
      .populate("customer", "fullName phone"),
    Booking.find({
      owner: req.customerId,
      requestType: "Machine",
      bookingType: "Single",
      status: { $in: ["Rejected", "Expired"] },
      $or: [
        { purgeAt: { $gt: now } },
        { purgeAt: null, historyExpiresAt: { $gt: now } }
      ]
    })
      .sort({ updatedAt: -1 })
      .populate("itemId", "title category image")
      .populate("customer", "fullName")
  ]);

  const safeGroups = groups.map((group) => {
    const data = group.toObject();
    if (data.status !== "Accepted") {
      data.members = data.members.map((member) => {
        if (member.user) delete member.user.phone;
        return member;
      });
    }
    return data;
  });

  const safeBookings = bookings.map((booking) => {
    const data = booking.toObject();
    if (data.status !== "Accepted") {
      delete data.customerPhone;
      if (data.customer) delete data.customer.phone;
    }
    return data;
  });

  const safeRejectedHistory = rejectedHistory.map((booking) => {
    const data = booking.toObject();
    delete data.customerPhone;
    if (data.customer) delete data.customer.phone;
    return data;
  });

  return res.json({ groups: safeGroups, bookings: safeBookings, rejectedHistory: safeRejectedHistory });
});

router.get("/owner/completed", [...requireOwner, requireUser], async (req, res) => {
  const expiryCutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const legacyCompletedFilter = { owner: req.customerId, status: "Completed", completedAt: null };

  await Promise.all([
    GroupBooking.updateMany(legacyCompletedFilter, [{ $set: { completedAt: "$updatedAt" } }], { updatePipeline: true, timestamps: false }),
    Booking.updateMany({ ...legacyCompletedFilter, bookingType: "Single" }, [{ $set: { completedAt: "$updatedAt" } }], { updatePipeline: true, timestamps: false })
  ]);

  const [groups, bookings] = await Promise.all([
    GroupBooking.find({ owner: req.customerId, status: "Completed", completedAt: { $gt: expiryCutoff } })
      .sort({ completedAt: -1 })
      .populate("members.user", "fullName")
      .populate("listing", "title category image"),
    Booking.find({ owner: req.customerId, requestType: "Machine", bookingType: "Single", status: "Completed", completedAt: { $gt: expiryCutoff } })
      .sort({ completedAt: -1 })
      .populate("itemId", "title category image")
      .populate("customer", "fullName")
  ]);

  return res.json({ groups, bookings });
});

router.get("/:id", isLoggedIn, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid group booking ID." });
  const group = await GroupBooking.findById(req.params.id).populate("members.user", "fullName phone").populate("listing", "title price unit");
  if (!group) return res.status(404).json({ message: "Group booking not found." });
  if (req.user.role === "Driver" && String(group.owner) === String(req.user._id) && group.status === "Forming") {
    return res.status(404).json({ message: "This group is waiting for enough nearby Farmer land and is not available to the Driver yet." });
  }
  const isMember = group.members.some((member) => String(member.user?._id || member.user) === String(req.user._id));
  const isOwner = String(group.owner) === String(req.user._id);
  if (!isMember && !isOwner && req.user.isAdmin !== true) return res.status(403).json({ message: "You are not authorized to view this group booking." });
  return res.json(group);
});

async function ownerAction(req, res, status) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid group booking ID." });
  const group = await GroupBooking.findById(req.params.id).select("+members.completionOtp +members.completionOtpExpiresAt");
  if (!group) return res.status(404).json({ message: "Group booking not found." });
  if (!group.owner || group.owner.toString() !== req.customerId.toString()) {
    return res.status(403).json({ message: "You are not authorized to perform actions on this group booking." });
  }
  if (group.status === "Completed") {
    return res.status(409).json({ message: "This group booking has already been completed." });
  }
  if (!["Forming", "RequestSent", "Ready", "Accepted"].includes(group.status) && status !== "Cancelled") return res.status(409).json({ message: "This group is not ready for that action." });
  if (status === "Accepted" && group.totalLandArea <= 0) {
    return res.status(409).json({ message: "This group has no verified land area for acceptance." });
  }
  if (status === "Completed") {
    if (!group.members.length || group.members.some((member) => member.otpVerified !== true)) {
      return res.status(409).json({ message: "Verify each Farmer's OTP before completing this group work." });
    }
    group.otpVerified = true;
    group.completedAt = new Date();
    group.statusChangedAt = new Date();
    group.purgeAt = null;
    group.historyExpiresAt = null;
    for (const member of group.members) {
      member.completionOtp = null;
      member.completionOtpExpiresAt = null;
    }
  }
  if (["Rejected", "Cancelled"].includes(status)) {
    const statusChangedAt = new Date();
    const purgeAt = new Date(statusChangedAt.getTime() + REJECTED_HISTORY_TTL_MS);
    group.statusChangedAt = statusChangedAt;
    group.purgeAt = purgeAt;
    group.historyExpiresAt = purgeAt;
  }
  group.status = status;
  if (status === "Accepted") {
    group.statusChangedAt = new Date();
    group.purgeAt = null;
    group.historyExpiresAt = null;
    const usedOtps = new Set();
    for (const member of group.members) {
      member.completionOtp = createUniqueCompletionOtp(usedOtps);
      member.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      member.otpVerified = false;
    }
    group.otpVerified = false;
  }
  await group.save();
  await Booking.updateMany({ groupBookingId: group._id }, {
    $set: {
      status: status === "Accepted" ? "Accepted" : status === "Completed" ? "Completed" : "Rejected",
      statusChangedAt: new Date(),
      ...(status === "Completed" ? { completedAt: group.completedAt, purgeAt: null, historyExpiresAt: null, completionOtp: null, completionOtpExpiresAt: null, otpVerified: true } : {}),
      ...(status === "Accepted" ? { purgeAt: null, historyExpiresAt: null } : {}),
      ...(["Rejected", "Cancelled"].includes(status) ? { purgeAt: group.purgeAt, historyExpiresAt: group.historyExpiresAt } : {})
    }
  });
  const responseGroup = group.toObject();
  for (const member of responseGroup.members || []) {
    delete member.completionOtp;
    delete member.completionOtpExpiresAt;
  }
  return res.json(responseGroup);
}

router.put("/:id/verify-member-otp", [...requireOwner, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.body.memberId)) {
    return res.status(400).json({ message: "Invalid group or Farmer ID." });
  }
  const group = await GroupBooking.findById(req.params.id)
    .select("+members.completionOtp +members.completionOtpExpiresAt");
  if (!group) return res.status(404).json({ message: "Group booking not found." });
  if (!group.owner || group.owner.toString() !== req.customerId.toString()) {
    return res.status(403).json({ message: "You are not authorized to verify OTPs for this group booking." });
  }
  if (group.status === "Completed") {
    return res.status(409).json({ message: "This group booking has already been completed." });
  }
  if (group.status !== "Accepted") {
    return res.status(409).json({ message: "Only accepted group work can verify Farmer OTPs." });
  }

  const member = group.members.id(req.body.memberId);
  if (!member) return res.status(404).json({ message: "Farmer is not part of this group booking." });
  if (member.otpVerified) {
    return res.status(409).json({ message: "This Farmer's OTP has already been verified." });
  }

  const providedOtp = String(req.body.otp || "").trim();
  if (!providedOtp || !member.completionOtp || !isValidOtp(providedOtp, member.completionOtp)) {
    return res.status(400).json({ message: "Incorrect OTP for this Farmer." });
  }
  if (isOtpExpired(member.completionOtpExpiresAt)) {
    return res.status(400).json({ message: "This Farmer's completion OTP has expired. Ask them to refresh the booking page." });
  }

  member.otpVerified = true;
  member.completionOtp = null;
  member.completionOtpExpiresAt = null;
  group.otpVerified = group.members.every((groupMember) => groupMember.otpVerified === true);
  await group.save();

  if (member.booking) {
    await Booking.findByIdAndUpdate(member.booking, {
      $set: {
        otpVerified: true,
        completionOtp: null,
        completionOtpExpiresAt: null
      }
    });
  }

  const responseGroup = group.toObject();
  for (const groupMember of responseGroup.members || []) {
    delete groupMember.completionOtp;
    delete groupMember.completionOtpExpiresAt;
  }
  return res.json(responseGroup);
});

router.put("/:id/accept", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Accepted"));
router.put("/:id/reject", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Rejected"));
router.put("/:id/cancel", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Cancelled"));
router.put("/:id/complete", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Completed"));

async function singleOwnerAction(req, res, status) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({
    _id: req.params.id,
    requestType: "Machine",
    bookingType: "Single"
  }).select("+completionOtp +completionOtpExpiresAt");

  if (!booking) return res.status(404).json({ message: "Fast booking not found." });

  if (!booking.owner || booking.owner.toString() !== req.customerId.toString()) {
    return res.status(403).json({ message: "You are not authorized to perform actions on this booking." });
  }

  if (booking.status === "Completed") {
    return res.status(409).json({ message: "This booking has already been completed." });
  }

  if (!["Pending", "Accepted"].includes(booking.status) && status !== "Cancelled") {
    return res.status(409).json({ message: "This booking is not ready for that action." });
  }

  if (status === "Completed") {
    if (booking.status !== "Accepted") {
      return res.status(409).json({ message: "Only accepted bookings can be completed." });
    }

    const providedOtp = String(req.body.otp || "").trim();
    if (!providedOtp || !booking.completionOtp || !isValidOtp(providedOtp, booking.completionOtp)) {
      return res.status(400).json({ message: "Invalid completion OTP." });
    }

    if (isOtpExpired(booking.completionOtpExpiresAt)) {
      return res.status(400).json({ message: "Completion OTP has expired." });
    }

    booking.status = "Completed";
    booking.otpVerified = true;
    booking.completionOtp = null;
    booking.completionOtpExpiresAt = null;
    booking.completedAt = new Date();
    booking.statusChangedAt = new Date();
    booking.purgeAt = null;
    booking.historyExpiresAt = null;
    await booking.save();
    return res.json(booking);
  }

  if (status === "Accepted") {
    const now = new Date();
    const acceptedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: "Pending",
        $or: [
          { responseDeadline: null },
          { responseDeadline: { $gt: now } }
        ]
      },
      {
        $set: {
          status: "Accepted",
          statusChangedAt: now,
          completionOtp: createCompletionOtp(),
          completionOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          otpVerified: false
        },
        $unset: {
          purgeAt: 1,
          historyExpiresAt: 1
        }
      },
      { new: true }
    );

    if (!acceptedBooking) {
      const current = await Booking.findById(booking._id);
      if (current && current.responseDeadline && current.responseDeadline <= now) {
        const statusChangedAt = new Date();
        const purgeAt = new Date(statusChangedAt.getTime() + REJECTED_HISTORY_TTL_MS);
        current.status = "Expired";
        current.statusChangedAt = statusChangedAt;
        current.purgeAt = purgeAt;
        current.historyExpiresAt = purgeAt;
        await releaseOfferBudget(current);
        await current.save();
        return res.status(409).json({ message: "This booking request has expired because it was not accepted within the 2-minute deadline." });
      }
      return res.status(409).json({ message: "This booking is no longer pending or has already been resolved." });
    }
    return res.json(acceptedBooking);
  }

  if (["Rejected", "Cancelled"].includes(status)) {
    const statusChangedAt = new Date();
    const purgeAt = new Date(statusChangedAt.getTime() + REJECTED_HISTORY_TTL_MS);
    const updated = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $in: ["Pending", "Accepted"] } },
      {
        $set: {
          status,
          statusChangedAt,
          purgeAt,
          historyExpiresAt: purgeAt
        }
      },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ message: "Booking could not be updated." });
    }
    await releaseOfferBudget(updated);
    return res.json(updated);
  }

  booking.status = status;
  booking.statusChangedAt = new Date();
  await booking.save();
  return res.json(booking);
}

router.put("/single/:id/accept", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Accepted"));
router.put("/single/:id/reject", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Rejected"));
router.put("/single/:id/complete", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Completed"));

router.post("/single/:id/regenerate-otp", requireUser, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({
    _id: req.params.id,
    requestType: "Machine",
    bookingType: "Single"
  }).select("+completionOtp +completionOtpExpiresAt");

  if (!booking) return res.status(404).json({ message: "Fast booking not found." });

  const isCustomer = booking.customer && booking.customer.toString() === req.customerId.toString();
  const isOwner = booking.owner && booking.owner.toString() === req.customerId.toString();

  if (!isCustomer && !isOwner) {
    return res.status(403).json({ message: "You are not authorized to regenerate OTP for this booking." });
  }

  if (booking.status === "Completed") {
    return res.status(409).json({ message: "This booking has already been completed." });
  }
  if (booking.status !== "Accepted") {
    return res.status(409).json({ message: "Only accepted bookings can regenerate completion OTP." });
  }

  booking.completionOtp = createCompletionOtp();
  booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  booking.otpVerified = false;
  await booking.save();

  const response = {
    message: "Completion OTP regenerated successfully.",
    expiresAt: booking.completionOtpExpiresAt
  };
  if (isCustomer) {
    response.completionOtp = booking.completionOtp;
  }
  return res.json(response);
});

router.post("/:id/member/:memberId/regenerate-otp", requireUser, async (req, res) => {
  const memberId = req.params.memberId || req.body.memberId;
  if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ message: "Invalid group or Farmer ID." });
  }
  const group = await GroupBooking.findById(req.params.id)
    .select("+members.completionOtp +members.completionOtpExpiresAt");

  if (!group) return res.status(404).json({ message: "Group booking not found." });

  const member = group.members.id(memberId);
  if (!member) return res.status(404).json({ message: "Farmer is not part of this group booking." });

  const isMemberUser = member.user && member.user.toString() === req.customerId.toString();
  const isOwner = group.owner && group.owner.toString() === req.customerId.toString();

  if (!isMemberUser && !isOwner) {
    return res.status(403).json({ message: "You are not authorized to regenerate OTP for this group booking." });
  }

  if (group.status === "Completed") {
    return res.status(409).json({ message: "This group booking has already been completed." });
  }
  if (group.status !== "Accepted") {
    return res.status(409).json({ message: "Only accepted group bookings can regenerate completion OTP." });
  }

  const usedOtps = new Set();
  for (const m of group.members) {
    if (m._id.toString() !== member._id.toString() && m.completionOtp) {
      usedOtps.add(m.completionOtp);
    }
  }

  member.completionOtp = createUniqueCompletionOtp(usedOtps);
  member.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  member.otpVerified = false;
  await group.save();

  const response = {
    message: "Farmer completion OTP regenerated successfully.",
    expiresAt: member.completionOtpExpiresAt
  };
  if (isMemberUser) {
    response.completionOtp = member.completionOtp;
  }
  return res.json(response);
});

router.post("/single", [...requireCustomer, requireUser], async (req, res) => {
  const error = validateMachineInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const [machine, customer] = await Promise.all([
    Machine.findById(req.body.itemId),
    User.findById(req.customerId)
  ]);
  if (!machine) return res.status(404).json({ message: "Machine not found." });
  if (!customer) return res.status(401).json({ message: "User not found." });
  const machineOwnerId = String(machine.owner?._id || machine.owner);
  if (machineOwnerId === String(customer._id)) return res.status(403).json({ message: "You cannot book your own listing." });

  const machineOwner = await User.findById(machine.owner).select("role isAdmin isActive driverApplicationStatus bookingCredits freeRequestsUsed");
  if (!machineOwner || !isDriverEligible(machineOwner) || machine.availability === "Hidden") {
    return res.status(409).json({ message: "This machine's owner is currently unavailable or under review for bookings." });
  }

  if (machine.availability !== "Available") {
    return res.status(409).json({ message: "Machine is not available." });
  }

  // Driver booking credit & free quota enforcement (Applies ONLY to drivers, farmers never restricted)
  const FREE_DRIVER_REQUEST_LIMIT = 3;
  const freeUsed = Number(machineOwner.freeRequestsUsed || 0);
  const premiumCredits = Number(machineOwner.bookingCredits || 0);

  if (freeUsed >= FREE_DRIVER_REQUEST_LIMIT && premiumCredits <= 0) {
    return res.status(403).json({
      message: "This machine's driver has reached their booking request limit and cannot receive new requests right now. Please choose an alternative machine.",
      driverCreditLimitReached: true
    });
  }

  let price = getSinglePrice(machine.price, Number(req.body.landArea));
  let offerData = null;

  // Authoritative Offer Validation & Calculation
  const hasExplicitOffer = Boolean(req.body.offerCode || req.body.offerId);

  const offerValidation = await validateOffer({
    code: req.body.offerCode,
    offer: req.body.offerId ? await Offer.findById(req.body.offerId) : null,
    user: customer,
    requestType: "Machine",
    category: machine.category,
    basePrice: price.basePrice,
    landArea: Number(req.body.landArea),
    location: req.body.location || customer.location || "",
    bookingType: "Single",
    autoDetect: !hasExplicitOffer,
  });

  if (offerValidation.isValid && offerValidation.offer) {
    const quote = calculateFinalPrice({
      baseServicePrice: price.basePrice,
      mandatoryCharges: price.extraCharge,
      otherCharges: 0,
      offer: offerValidation.offer,
    });

    price.discountAmount = quote.actualDiscount;
    price.discountPercent = quote.discountPercent;
    price.finalPrice = quote.finalPayableAmount;
    offerData = offerValidation.offer;
  } else if (hasExplicitOffer) {
    return res.status(400).json({ message: offerValidation.reason });
  }

  // Pre-validate or atomically reserve budget before booking creation if campaignBudget is configured
  let updatedOfferDoc = null;
  if (offerData) {
    const discountAmount = price.discountAmount || 0;
    const budgetCondition = {
      _id: offerData._id,
      isActive: true,
      status: { $nin: ["Inactive", "Draft", "Paused"] },
    };
    if (offerData.campaignBudget) {
      budgetCondition.$expr = {
        $lte: [{ $add: ["$budgetSpent", discountAmount] }, "$campaignBudget"],
      };
    }
    updatedOfferDoc = await Offer.findOneAndUpdate(
      budgetCondition,
      {
        $inc: { usedCount: 1, budgetSpent: discountAmount },
      },
      { new: true }
    );

    if (!updatedOfferDoc && offerData.campaignBudget) {
      return res.status(409).json({
        message: "The promotional campaign budget has been exhausted. Please proceed without this offer.",
      });
    }

    // Auto-pause if campaign budget is fully reached
    if (
      updatedOfferDoc &&
      updatedOfferDoc.campaignBudget &&
      (updatedOfferDoc.budgetSpent + (updatedOfferDoc.budgetReserved || 0)) >= updatedOfferDoc.campaignBudget
    ) {
      await Offer.findByIdAndUpdate(offerData._id, { status: "Paused" });
    }
  }

  const now = new Date();
  const requestedDate = req.body.bookingDate ? new Date(req.body.bookingDate) : now;
  const isInstantBooking = Math.abs(requestedDate.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000;
  const responseDeadline = isInstantBooking
    ? new Date(now.getTime() + 2 * 60 * 1000)
    : null;

  if (req.body.originalBookingId && mongoose.isValidObjectId(req.body.originalBookingId)) {
    const originalBooking = await Booking.findById(req.body.originalBookingId).populate("itemId", "category");
    if (originalBooking) {
      if (String(originalBooking.customer) !== String(customer._id)) {
        return res.status(403).json({ message: "Not authorized to create alternative for another customer's booking." });
      }
      if (originalBooking.itemId?.category && machine.category !== originalBooking.itemId.category) {
        return res.status(400).json({ message: "Selected alternative machine category must match the original requested category." });
      }
      if (String(machine._id) === String(originalBooking.itemId?._id)) {
        return res.status(400).json({ message: "Cannot select the same machine as an alternative." });
      }
    }
    const existingActive = await Booking.findOne({
      originalBookingId: req.body.originalBookingId,
      customer: customer._id,
      status: { $in: ["Pending", "Accepted"] }
    });
    if (existingActive) {
      return res.status(409).json({ message: "An active alternative booking is already pending or confirmed for this request." });
    }
  }

  const booking = await createBooking({
    machine,
    customer,
    body: req.body,
    bookingType: "Single",
    price,
    offerData,
    responseDeadline,
    isInstantBooking
  });

  // Deduct from driver's quota or credit pack (Farmers never have platform credit limits)
  if (freeUsed < FREE_DRIVER_REQUEST_LIMIT) {
    await User.findByIdAndUpdate(machineOwner._id, { $inc: { freeRequestsUsed: 1 } });
  } else if (premiumCredits > 0) {
    await User.findByIdAndUpdate(machineOwner._id, { $inc: { bookingCredits: -1 } });
  }

  return res.status(201).json(booking);
});


router.get("/single/:id/alternatives", [...requireCustomer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findById(req.params.id).populate("itemId", "title category price unit location latitude longitude image");
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  if (String(booking.customer) !== String(req.customerId) && req.user.isAdmin !== true) {
    return res.status(403).json({ message: "Not authorized to view alternatives for this booking." });
  }

  const category = booking.itemId?.category;
  const rawRadius = Number(req.query.radius);
  const selectedRadius = Number.isFinite(rawRadius) && rawRadius > 0 ? rawRadius : 5;

  const lat = req.query.latitude != null ? Number(req.query.latitude) : booking.customerLatitude;
  const lng = req.query.longitude != null ? Number(req.query.longitude) : booking.customerLongitude;

  const isValidLat = typeof lat === "number" && Number.isFinite(lat) && lat >= -90 && lat <= 90;
  const isValidLng = typeof lng === "number" && Number.isFinite(lng) && lng >= -180 && lng <= 180;

  const originalBookingPayload = {
    _id: booking._id,
    status: booking.status,
    category,
    landArea: booking.landArea,
    customerLocation: booking.customerLocation,
    bookingDate: booking.bookingDate,
    requiredDate: booking.requiredDate,
    preferredTime: booking.preferredTime
  };

  if (!isValidLat || !isValidLng) {
    return res.json({
      success: false,
      requiresLocation: true,
      message: "Valid booking coordinates are required to find nearby alternative machines.",
      radius: selectedRadius,
      category,
      originalBooking: originalBookingPayload,
      alternatives: []
    });
  }

  const { getEligibleDriverIds } = require("../utils/driverEligibility.js");
  const eligibleDrivers = await getEligibleDriverIds();

  // Find eligible drivers with free requests remaining OR premium credits > 0, excluding customer
  const driversWithCredits = await User.find({
    _id: { $in: eligibleDrivers, $ne: booking.customer },
    $or: [
      { freeRequestsUsed: { $lt: 3 } },
      { freeRequestsUsed: null },
      { freeRequestsUsed: { $exists: false } },
      { bookingCredits: { $gt: 0 } }
    ]
  }).select("_id");
  const driverIdsWithQuota = driversWithCredits.map((d) => d._id);

  const query = {
    _id: { $ne: booking.itemId?._id },
    owner: { $in: driverIdsWithQuota },
    availability: "Available"
  };
  if (category) query.category = category;

  const candidateMachines = await Machine.find(query).populate("owner", "fullName");

  const { getDistanceKm } = require("../utils/groupBooking.js");
  const alternatives = [];

  for (const m of candidateMachines) {
    const mLat = Number(m.latitude);
    const mLng = Number(m.longitude);
    if (!Number.isFinite(mLat) || !Number.isFinite(mLng) || mLat < -90 || mLat > 90 || mLng < -180 || mLng > 180) {
      continue;
    }
    const distanceKm = getDistanceKm(
      { latitude: lat, longitude: lng },
      { latitude: mLat, longitude: mLng }
    );
    if (distanceKm == null) continue;
    const roundedDist = Math.round(distanceKm * 10) / 10;
    // Strict radius check: actual distance must be less than or equal to selected radius
    if (roundedDist <= selectedRadius) {
      const obj = m.toObject();
      obj.distanceKm = roundedDist;
      alternatives.push(obj);
    }
  }

  alternatives.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return a.price - b.price;
  });

  return res.json({
    success: true,
    requiresLocation: false,
    radius: selectedRadius,
    category,
    originalBooking: originalBookingPayload,
    alternatives
  });
});

// Server-side automatic background sweep for expiring overdue requests (every 10s)
setInterval(() => {
  expireOverdueBookings().catch(() => {});
}, 10000);

module.exports = router;
module.exports.releaseOfferBudget = releaseOfferBudget;
