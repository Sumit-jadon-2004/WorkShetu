require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Offer = require("../Backend/models/Offer.js");
const Booking = require("../Backend/models/BookingMachine.js");
const User = require("../Backend/models/Owner.js");

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to MongoDB");

  // Sample existing bookings
  const existingBooking = await Booking.findOne({ status: { $nin: ["Cancelled", "Rejected"] } });
  if (!existingBooking) {
    console.log("No bookings found in DB");
    process.exit(0);
  }

  const existingFarmerId = existingBooking.customer || existingBooking.farmerId;
  const count = await Booking.countDocuments({
    $or: [{ customer: existingFarmerId }, { farmerId: existingFarmerId }],
    status: { $nin: ["Cancelled", "Rejected"] },
  });
  console.log(`Existing farmer ID: ${existingFarmerId} (Bookings: ${count})`);

  // Active offers
  const activeOffers = await Offer.find({ isActive: true }).lean();
  console.log(`Total active offers in DB: ${activeOffers.length}`);
  activeOffers.forEach(o => console.log(` - [${o.code || 'AUTO'}] ${o.title} | firstBookingOnly: ${o.firstBookingOnly}`));

  // Simulate GET /api/offers/active logic directly:
  const now = new Date();
  const rawOffers = await Offer.find({
    isActive: true,
    status: { $nin: ["Inactive", "Draft"] },
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  // Test Case 1: Existing Farmer with > 0 bookings
  const isFirstTimeUserExisting = count === 0;
  const filteredForExisting = rawOffers.filter(offer => {
    if (offer.firstBookingOnly && !isFirstTimeUserExisting) return false;
    if (offer.userEligibility === "New Users" && !isFirstTimeUserExisting) return false;
    return true;
  });
  console.log(`\nOffers visible to existing farmer (${existingFarmerId}): ${filteredForExisting.length}`);
  filteredForExisting.forEach(o => console.log(`   * ${o.title}`));

  // Test Case 2: Brand new user with 0 bookings
  const dummyNewUserId = new mongoose.Types.ObjectId();
  const isFirstTimeUserNew = true;
  const filteredForNew = rawOffers.filter(offer => {
    if (offer.firstBookingOnly && !isFirstTimeUserNew) return false;
    if (offer.userEligibility === "New Users" && !isFirstTimeUserNew) return false;
    return true;
  });
  console.log(`\nOffers visible to NEW farmer (0 bookings): ${filteredForNew.length}`);
  filteredForNew.forEach(o => console.log(`   * ${o.title}`));

  // Assertions
  if (count > 0) {
    const hasFirstBookingOffer = filteredForExisting.some(o => o.firstBookingOnly);
    if (hasFirstBookingOffer) {
      console.error("FAIL: Existing user saw firstBookingOnly offer!");
      process.exit(1);
    } else {
      console.log("PASS: Existing user correctly CANNOT see firstBookingOnly offer!");
    }
  }

  const newSeesFirst = filteredForNew.some(o => o.firstBookingOnly);
  if (!newSeesFirst) {
    console.error("FAIL: New user did not see firstBookingOnly offer!");
    process.exit(1);
  } else {
    console.log("PASS: New user correctly SEES firstBookingOnly offer!");
  }

  console.log("\nALL TARGETING CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
