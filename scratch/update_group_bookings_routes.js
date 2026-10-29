const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../Backend/routes/groupBookings.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Add expireOverdueBookings function after REJECTED_HISTORY_TTL_MS
const anchorLock = `const REJECTED_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;`;
const expireOverdueCode = `const REJECTED_HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

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
    b.status = "Expired";
    b.historyExpiresAt = new Date(Date.now() + REJECTED_HISTORY_TTL_MS);
    await releaseOfferBudget(b);
    await b.save();
  }
}`;

if (code.includes(anchorLock) && !code.includes("async function expireOverdueBookings")) {
  code = code.replace(anchorLock, expireOverdueCode);
}

// 2. Update createBooking helper signature & document fields
const oldCreateBooking = `async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session, offerData }) {
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
    bookingDate: body.bookingDate || new Date(),`;

const newCreateBooking = `async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session, offerData, responseDeadline, isInstantBooking }) {
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
    originalBookingId: body.originalBookingId && mongoose.isValidObjectId(body.originalBookingId) ? body.originalBookingId : null,`;

if (code.includes(oldCreateBooking)) {
  code = code.replace(oldCreateBooking, newCreateBooking);
}

// 3. Update singleOwnerAction to atomically check responseDeadline
const oldOwnerAccepted = `  if (status === "Accepted") {
    booking.completionOtp = createCompletionOtp();
    booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    booking.otpVerified = false;
  }`;

const newOwnerAccepted = `  if (status === "Accepted") {
    if (booking.responseDeadline && booking.responseDeadline < new Date()) {
      booking.status = "Expired";
      booking.historyExpiresAt = new Date(Date.now() + REJECTED_HISTORY_TTL_MS);
      await releaseOfferBudget(booking);
      await booking.save();
      return res.status(409).json({ message: "This booking request has expired because it was not accepted within the response deadline." });
    }
    booking.completionOtp = createCompletionOtp();
    booking.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    booking.otpVerified = false;
  }`;

if (code.includes(oldOwnerAccepted)) {
  code = code.replace(oldOwnerAccepted, newOwnerAccepted);
}

// 4. Update router.get("/my/requests") to clean up expired and include Expired status in query
const oldMyRequestsFilter = `        { status: { $in: ["Rejected", "Cancelled"] }, historyExpiresAt: { $gt: now } }`;
const newMyRequestsFilter = `        { status: { $in: ["Rejected", "Cancelled", "Expired"] }, historyExpiresAt: { $gt: now } }`;

if (code.includes(oldMyRequestsFilter)) {
  code = code.replaceAll(oldMyRequestsFilter, newMyRequestsFilter);
}

// 5. In router.get("/my/requests") and router.get("/owner/requests"), call expireOverdueBookings
const oldMyRequestsStart = `router.get("/my/requests", [...requireCustomer, requireUser], async (req, res) => {
  const expiryCutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);`;
const newMyRequestsStart = `router.get("/my/requests", [...requireCustomer, requireUser], async (req, res) => {
  await expireOverdueBookings({ customer: req.customerId });
  const expiryCutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);`;

if (code.includes(oldMyRequestsStart)) {
  code = code.replace(oldMyRequestsStart, newMyRequestsStart);
}

const oldOwnerRequestsStart = `router.get("/owner/requests", [...requireOwner, requireUser], async (req, res) => {
  const [groups, bookings] = await Promise.all([`;
const newOwnerRequestsStart = `router.get("/owner/requests", [...requireOwner, requireUser], async (req, res) => {
  await expireOverdueBookings({ owner: req.customerId });
  const [groups, bookings] = await Promise.all([`;

if (code.includes(oldOwnerRequestsStart)) {
  code = code.replace(oldOwnerRequestsStart, newOwnerRequestsStart);
}

// 6. In router.post("/single"), calculate responseDeadline & check originalBookingId duplicate
const oldBookingCreateCall = `  const booking = await createBooking({ machine, customer, body: req.body, bookingType: "Single", price, offerData });`;
const newBookingCreateCall = `  const now = new Date();
  const requestedDate = req.body.bookingDate ? new Date(req.body.bookingDate) : now;
  const isInstantBooking = Math.abs(requestedDate.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000;
  const responseDeadline = isInstantBooking
    ? new Date(now.getTime() + 2 * 60 * 1000)
    : new Date(now.getTime() + 2 * 60 * 60 * 1000);

  if (req.body.originalBookingId && mongoose.isValidObjectId(req.body.originalBookingId)) {
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
  });`;

if (code.includes(oldBookingCreateCall)) {
  code = code.replace(oldBookingCreateCall, newBookingCreateCall);
}

// 7. Add alternatives endpoint before module.exports
const alternativesRoute = `
router.get("/single/:id/alternatives", [...requireCustomer, requireUser], async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid booking ID." });
  const booking = await Booking.findById(req.params.id).populate("itemId", "title category price unit location latitude longitude image");
  if (!booking) return res.status(404).json({ message: "Booking not found." });
  if (String(booking.customer) !== String(req.customerId) && req.user.isAdmin !== true) {
    return res.status(403).json({ message: "Not authorized to view alternatives for this booking." });
  }

  const category = booking.itemId?.category;
  const { getEligibleDriverIds } = require("../utils/driverEligibility.js");
  const eligibleDrivers = await getEligibleDriverIds();

  const query = {
    _id: { $ne: booking.itemId?._id },
    owner: { $in: eligibleDrivers, $ne: req.customerId },
    availability: "Available"
  };
  if (category) query.category = category;

  const candidateMachines = await Machine.find(query).populate("owner", "fullName phone").limit(10);

  const { getDistanceKm } = require("../utils/groupBooking.js");
  const alternatives = candidateMachines.map((m) => {
    const obj = m.toObject();
    let distanceKm = null;
    if (booking.customerLatitude != null && booking.customerLongitude != null && m.latitude != null && m.longitude != null) {
      distanceKm = getDistanceKm(
        { latitude: booking.customerLatitude, longitude: booking.customerLongitude },
        { latitude: m.latitude, longitude: m.longitude }
      );
      if (distanceKm != null) distanceKm = Math.round(distanceKm * 10) / 10;
    }
    obj.distanceKm = distanceKm;
    return obj;
  });

  alternatives.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    return a.price - b.price;
  });

  return res.json({
    originalBooking: {
      _id: booking._id,
      status: booking.status,
      category,
      landArea: booking.landArea,
      customerLocation: booking.customerLocation,
      bookingDate: booking.bookingDate,
      requiredDate: booking.requiredDate,
      preferredTime: booking.preferredTime
    },
    alternatives
  });
});
`;

if (!code.includes('router.get("/single/:id/alternatives"')) {
  code = code.replace('module.exports = router;', alternativesRoute + '\nmodule.exports = router;');
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('groupBookings.js updated successfully.');

