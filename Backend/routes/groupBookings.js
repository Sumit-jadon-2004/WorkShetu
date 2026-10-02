const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Booking = require("../models/BookingMachine.js");
const GroupBooking = require("../models/GroupBooking.js");
const Machine = require("../models/ListingMachin.js");
const User = require("../models/Owner.js");
const {
  GROUP_DISCOUNT_PERCENT,
  GROUP_MINIMUM_LAND,
  getSinglePrice,
  isRelatedLocation,
  recalculateGroup
} = require("../utils/groupBooking.js");
const { isLoggedIn, isFarmer } = require("../middleware/auth.js");

const router = express.Router();

function createCompletionOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function isValidOtp(value, expected) {
  return typeof value === "string" && typeof expected === "string" && value.length === expected.length && crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
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

const requireFarmer = [isLoggedIn, isFarmer];
const requireOwner = [isLoggedIn, (req, res, next) => {
  if (req.user.role === "Driver" || req.user.isAdmin === true) return next();
  return res.status(403).json({ success: false, message: "Only drivers or admins can manage group requests." });
}];

function validateMachineInput(body) {
  const landArea = Number(body.landArea);
  if (!Number.isFinite(landArea) || landArea <= 0) return "Land area must be a positive number.";
  if (!body.location || !String(body.location).trim()) return "Location is required.";
  if (body.bookingDate && Number.isNaN(Date.parse(body.bookingDate))) return "Booking date is invalid.";
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
    latitude: body.latitude == null ? undefined : Number(body.latitude),
    longitude: body.longitude == null ? undefined : Number(body.longitude)
  };
}

function memberPrice(machine, landArea) {
  const price = getSinglePrice(machine.price, landArea);
  return {
    originalPrice: price.basePrice,
    discountAmount: 0,
    finalPrice: price.basePrice
  };
}

async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session }) {
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
    requiredDate: body.bookingDate || new Date(),
    bookingDate: body.bookingDate || new Date(),
    basePrice: price.basePrice,
    extraCharge: price.extraCharge || 0,
    discountPercent: price.discountPercent || 0,
    discountAmount: price.discountAmount || 0,
    originalPrice: price.originalPrice,
    finalPrice: price.finalPrice,
    totalPrice: price.finalPrice,
    message: body.message || ""
  }], { session });
  return booking[0];
}

async function createGroup(req, res) {
  const error = validateMachineInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      const [machine, customer] = await Promise.all([
        Machine.findById(req.body.itemId).session(session),
        User.findById(req.customerId).session(session)
      ]);
      if (!machine) throw Object.assign(new Error("Machine not found."), { status: 404 });
      if (!customer) throw Object.assign(new Error("User not found."), { status: 401 });
      if (String(machine.owner) === String(customer._id)) {
        throw Object.assign(new Error("You cannot book your own machine."), { status: 403 });
      }

      const member = memberInput(req.body, customer);
      let group = req.joinGroupId
        ? await GroupBooking.findById(req.joinGroupId).session(session)
        : await GroupBooking.findOne({
            listing: machine._id,
            owner: machine.owner,
            requestType: "Machine",
            status: "Forming"
          }).session(session);

      if (req.joinGroupId && !group) {
        throw Object.assign(new Error("Group booking not found."), { status: 404 });
      }
      if (req.joinGroupId && group.status !== "Forming") {
        throw Object.assign(new Error("This group is no longer accepting members."), { status: 409 });
      }
      if (req.joinGroupId && (String(group.listing) !== String(machine._id) || String(group.owner) !== String(machine.owner))) {
        throw Object.assign(new Error("This group belongs to a different machine."), { status: 409 });
      }
      if (req.joinGroupId && group.members.some((item) => String(item.user) === String(customer._id))) {
        throw Object.assign(new Error("You already belong to this group."), { status: 409 });
      }

      if (group && !isRelatedLocation(group, member)) {
        if (req.joinGroupId) {
          throw Object.assign(new Error("Your location is too far from this group."), { status: 409 });
        }
        group = null;
      }

      if (!group) {
        group = new GroupBooking({
          listing: machine._id,
          owner: machine.owner,
          requestType: "Machine",
          groupDiscountPercent: GROUP_DISCOUNT_PERCENT,
          minimumRequiredLand: GROUP_MINIMUM_LAND,
          location: member.location,
          latitude: member.latitude,
          longitude: member.longitude,
          bookingDate: req.body.bookingDate || new Date()
        });
        await group.save({ session });
      }

      const memberPriceData = memberPrice(machine, member.landArea);
      const booking = await createBooking({ machine, customer, body: req.body, bookingType: "Group", groupBookingId: group._id, price: memberPriceData, session });
      Object.assign(member, memberPriceData, { booking: booking._id });
      group.members.push(member);
      recalculateGroup(group);
      if (group.totalLandArea >= group.minimumRequiredLand) group.status = "RequestSent";
      await group.save({ session });

      await Booking.updateMany({ groupBookingId: group._id }, {
        $set: { discountPercent: group.groupDiscountPercent }
      }, { session });
      for (const groupMember of group.members) {
        await Booking.updateOne({ _id: groupMember.booking }, {
          $set: {
            discountPercent: group.groupDiscountPercent,
            discountAmount: groupMember.discountAmount,
            originalPrice: groupMember.originalPrice,
            finalPrice: groupMember.finalPrice,
            totalPrice: groupMember.finalPrice
          }
        }, { session });
      }
      result = group;
    });
    return res.status(201).json(await GroupBooking.findById(result._id).populate("members.user", "fullName phone"));
  } catch (caughtError) {
    return res.status(caughtError.status || 400).json({ message: caughtError.message || "Group booking could not be created." });
  } finally {
    await session.endSession();
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

router.get("/my", [...requireFarmer, requireUser], async (req, res) => {
  const groups = await GroupBooking.find({ "members.user": req.customerId }).sort({ createdAt: -1 }).populate("listing", "title price unit");
  return res.json(groups);
});

router.get("/my/requests", [...requireFarmer, requireUser], async (req, res) => {
  const [groups, bookings] = await Promise.all([
    GroupBooking.find({ "members.user": req.customerId })
      .select("+completionOtp +completionOtpExpiresAt")
      .sort({ createdAt: -1 })
      .populate("listing", "title category image location latitude longitude owner"),
    Booking.find({ customer: req.customerId, requestType: "Machine" })
      .select("+completionOtp +completionOtpExpiresAt")
      .sort({ createdAt: -1 })
      .populate("itemId", "title category image location latitude longitude owner")
      .populate("owner", "fullName")
  ]);

  const acceptedGroupsWithoutOtp = groups.filter((group) => group.status === "Accepted" && !group.completionOtp);
  const acceptedBookingsWithoutOtp = bookings.filter((booking) => booking.status === "Accepted" && !booking.completionOtp);

  await Promise.all([
    ...acceptedGroupsWithoutOtp.map((group) => {
      group.completionOtp = createCompletionOtp();
      group.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return group.save();
    }),
    ...acceptedBookingsWithoutOtp.map((booking) => {
      booking.completionOtp = createCompletionOtp();
      booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return booking.save();
    })
  ]);

  return res.json({ groups, bookings });
});

router.put("/my/single/:id/cancel", [...requireFarmer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({
    _id: req.params.id,
    customer: req.customerId,
    requestType: "Machine",
    bookingType: "Single",
    status: "Pending"
  });
  if (!booking) return res.status(409).json({ message: "This booking can no longer be cancelled." });
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
  group.status = group.totalLandArea >= group.minimumRequiredLand ? "RequestSent" : "Forming";
  await group.save();
  return res.json({ success: true, message: "Group booking cancelled successfully." });
});

router.get("/owner/list", [...requireOwner, requireUser], async (req, res) => {
  const groups = await GroupBooking.find({ owner: req.customerId }).sort({ createdAt: -1 }).populate("members.user", "fullName phone").populate("listing", "title price unit");
  return res.json(groups);
});

router.get("/owner/requests", [...requireOwner, requireUser], async (req, res) => {
  const [groups, bookings] = await Promise.all([
    GroupBooking.find({ owner: req.customerId })
      .sort({ createdAt: -1 })
      .populate("members.user", "fullName phone")
      .populate("listing", "title price unit"),
    Booking.find({ owner: req.customerId, requestType: "Machine", bookingType: "Single" })
      .sort({ createdAt: -1 })
      .populate("itemId", "title category image")
      .populate("customer", "fullName phone")
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

  return res.json({ groups: safeGroups, bookings: safeBookings });
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
  const isMember = group.members.some((member) => String(member.user?._id || member.user) === String(req.user._id));
  const isOwner = String(group.owner) === String(req.user._id);
  if (!isMember && !isOwner && req.user.isAdmin !== true) return res.status(403).json({ message: "You are not authorized to view this group booking." });
  return res.json(group);
});

async function ownerAction(req, res, status) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid group booking ID." });
  const group = await GroupBooking.findOne({ _id: req.params.id, owner: req.customerId }).select("+completionOtp +completionOtpExpiresAt");
  if (!group) return res.status(404).json({ message: "Group booking not found." });
  if (!["RequestSent", "Ready", "Accepted"].includes(group.status) && status !== "Cancelled") return res.status(409).json({ message: "This group is not ready for that action." });
  if (status === "Completed") {
    const providedOtp = String(req.body.otp || "");
    if (!group.completionOtp || !isValidOtp(providedOtp, group.completionOtp)) return res.status(400).json({ message: "Invalid completion OTP." });
    if (group.completionOtpExpiresAt < new Date()) return res.status(400).json({ message: "Completion OTP has expired." });
    group.otpVerified = true;
    group.completedAt = new Date();
  }
  group.status = status;
  if (status === "Accepted") {
    group.completionOtp = createCompletionOtp();
    group.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    group.otpVerified = false;
  }
  await group.save();
  await Booking.updateMany({ groupBookingId: group._id }, { $set: { status: status === "Accepted" ? "Accepted" : status === "Completed" ? "Completed" : "Rejected", ...(status === "Completed" ? { completedAt: group.completedAt } : {}) } });
  return res.json(group);
}

router.put("/:id/accept", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Accepted"));
router.put("/:id/reject", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Rejected"));
router.put("/:id/cancel", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Cancelled"));
router.put("/:id/complete", [...requireOwner, requireUser], (req, res) => ownerAction(req, res, "Completed"));

async function singleOwnerAction(req, res, status) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findOne({ _id: req.params.id, owner: req.customerId, requestType: "Machine", bookingType: "Single" }).select("+completionOtp +completionOtpExpiresAt");
  if (!booking) return res.status(404).json({ message: "Fast booking not found." });
  if (!["Pending", "Accepted"].includes(booking.status) && status !== "Cancelled") {
    return res.status(409).json({ message: "This booking is not ready for that action." });
  }
  if (status === "Completed") {
    const providedOtp = String(req.body.otp || "");
    if (!booking.completionOtp || !isValidOtp(providedOtp, booking.completionOtp)) return res.status(400).json({ message: "Invalid completion OTP." });
    if (booking.completionOtpExpiresAt < new Date()) return res.status(400).json({ message: "Completion OTP has expired." });
    booking.otpVerified = true;
    booking.completedAt = new Date();
  }
  if (status === "Accepted") {
    booking.completionOtp = createCompletionOtp();
    booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    booking.otpVerified = false;
  }
  booking.status = status;
  await booking.save();
  return res.json(booking);
}

router.put("/single/:id/accept", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Accepted"));
router.put("/single/:id/reject", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Rejected"));
router.put("/single/:id/complete", [...requireOwner, requireUser], (req, res) => singleOwnerAction(req, res, "Completed"));

router.post("/single", [...requireFarmer, requireUser], async (req, res) => {
  const error = validateMachineInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const [machine, customer] = await Promise.all([
    Machine.findById(req.body.itemId),
    User.findById(req.customerId)
  ]);
  if (!machine) return res.status(404).json({ message: "Machine not found." });
  if (!customer) return res.status(401).json({ message: "User not found." });
  if (String(machine.owner) === String(customer._id)) return res.status(403).json({ message: "You cannot book your own machine." });
  const price = getSinglePrice(machine.price, Number(req.body.landArea));
  const booking = await createBooking({ machine, customer, body: req.body, bookingType: "Single", price });
  return res.status(201).json(booking);
});

module.exports = router;
