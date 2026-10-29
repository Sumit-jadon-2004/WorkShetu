const fs = require("fs");
const file = "Backend/routes/groupBookings.js";
let content = fs.readFileSync(file, "utf8");

// 1. Add Offer and pricingEngine imports
const importTarget = 'const User = require("../models/Owner.js");';
const importAddition = `const User = require("../models/Owner.js");
const Offer = require("../models/Offer.js");
const { validateOffer, calculateFinalPrice } = require("../utils/pricingEngine.js");`;

if (!content.includes(importTarget)) {
  console.error("Import target not found!");
  process.exit(1);
}
content = content.replace(importTarget, importAddition);

// 2. Update createBooking signature and payload
const createBookingTarget = `async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session }) {
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
  }], session ? { session } : {});
  return booking[0];
}`;

const createBookingReplacement = `async function createBooking({ machine, customer, body, bookingType, groupBookingId, price, session, offerData }) {
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
    message: body.message || "",
    offerId: offerData?._id || null,
    offerCode: offerData?.code || null,
    offerTitle: offerData?.title || null,
    offerDiscount: offerData ? (price.discountAmount || 0) : 0
  }], session ? { session } : {});
  return booking[0];
}`;

// Normalize line endings to find target
content = content.replace(/\r\n/g, "\n");
const normTarget = createBookingTarget.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("createBooking target not found!");
  process.exit(1);
}
content = content.replace(normTarget, createBookingReplacement);

// 3. Update router.post("/single", ...)
const singleBookingTarget = `router.post("/single", [...requireFarmer, requireUser], async (req, res) => {
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
});`;

const singleBookingReplacement = `router.post("/single", [...requireFarmer, requireUser], async (req, res) => {
  const error = validateMachineInput(req.body);
  if (error) return res.status(400).json({ message: error });
  const [machine, customer] = await Promise.all([
    Machine.findById(req.body.itemId),
    User.findById(req.customerId)
  ]);
  if (!machine) return res.status(404).json({ message: "Machine not found." });
  if (!customer) return res.status(401).json({ message: "User not found." });
  if (String(machine.owner) === String(customer._id)) return res.status(403).json({ message: "You cannot book your own machine." });

  let price = getSinglePrice(machine.price, Number(req.body.landArea));
  let offerData = null;

  // Authoritative Offer Validation & Calculation
  if (req.body.offerCode || req.body.offerId) {
    const offerValidation = await validateOffer({
      code: req.body.offerCode,
      offer: req.body.offerId ? await Offer.findById(req.body.offerId) : null,
      user: customer,
      requestType: "Machine",
      category: machine.category,
      basePrice: price.basePrice,
      landArea: Number(req.body.landArea),
      location: req.body.location || customer.location || "",
      bookingType: "Single"
    });

    if (!offerValidation.isValid) {
      return res.status(400).json({ message: offerValidation.reason });
    }

    const quote = calculateFinalPrice({
      baseServicePrice: price.basePrice,
      mandatoryCharges: price.extraCharge,
      otherCharges: 0,
      offer: offerValidation.offer
    });

    price.discountAmount = quote.actualDiscount;
    price.discountPercent = quote.discountPercent;
    price.finalPrice = quote.finalPayableAmount;
    offerData = offerValidation.offer;
  }

  const booking = await createBooking({ machine, customer, body: req.body, bookingType: "Single", price, offerData });

  // Update offer redemption statistics atomically
  if (offerData) {
    await Offer.findByIdAndUpdate(offerData._id, {
      $inc: { usedCount: 1 }
    });
  }

  return res.status(201).json(booking);
});`;

const normSingleTarget = singleBookingTarget.replace(/\r\n/g, "\n");
if (!content.includes(normSingleTarget)) {
  console.error("singleBookingTarget not found!");
  process.exit(1);
}
content = content.replace(normSingleTarget, singleBookingReplacement);

fs.writeFileSync(file, content, "utf8");
console.log("Updated groupBookings.js successfully!");

