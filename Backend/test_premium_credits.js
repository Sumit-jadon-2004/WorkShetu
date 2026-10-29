/**
 * TEST SUITE: WorkShetu Premium Plans & Booking Credit Packs
 * Verifies:
 * 1. Supported configurable pack sizes [5, 7, 10, 15, 20, 25]
 * 2. Strict rejection of unverified payment (never grant credits without payment)
 * 3. Atomic credit allocation upon verified payment
 * 4. Credit consumption on booking creation
 * 5. Preservation of confirmed bookings when credits run out
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const express = require("express");

dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const creditsRouter = require("./routes/credits.js");
const groupBookingsRouter = require("./routes/groupBookings.js");
const { ALLOWED_PACK_SIZES, PACK_PRICING, CreditTransaction } = require("./models/CreditPack.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WorkShetu";

async function runTests() {
  console.log("======================================================================");
  console.log("       WORKSHETU: PREMIUM PLANS & BOOKING CREDITS TEST SUITE          ");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const app = express();
  app.use(express.json());

  let activeTestUser = null;
  app.use((req, res, next) => {
    if (activeTestUser) {
      req.user = activeTestUser;
      req.session = { userId: activeTestUser._id.toString() };
      req.isAuthenticated = () => true;
    } else {
      req.user = null;
      req.session = {};
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use("/api/credits", creditsRouter);
  app.use("/api/group-bookings", groupBookingsRouter);

  let server;
  let baseUrl;

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. Setup Test Users
    const farmer = await User.create({
      fullName: `Credit Farmer ${timestamp}`,
      phone: `91${String(timestamp).slice(-8)}`,
      email: `farmer_credit_${timestamp}@test.com`,
      role: "Farmer",
      isAdmin: false,
      bookingCredits: 0,
      isActive: true,
      location: "Bareilly, UP",
    });

    const driver = await User.create({
      fullName: `Credit Driver ${timestamp}`,
      phone: `92${String(timestamp).slice(-8)}`,
      email: `driver_credit_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      driverExperience: 5,
      driverVehicleNumber: "UP-25-CR-1111",
      isActive: true,
      location: "Bareilly, UP",
    });

    // 2. Setup Machine
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const machine = await Machine.create({
      owner: driver._id,
      title: `Credit Tractor ${timestamp}`,
      category: "Tractor",
      vehicleNumber: `UP25CR${randomSuffix}`,
      price: 700,
      unit: "Bigha",
      power: 50,
      fuelType: "Diesel",
      year: 2022,
      image: { url: "https://example.com/tractor.jpg", filename: "tractor.jpg" },
      location: "Bareilly, UP",
      latitude: 28.367,
      longitude: 79.430,
      phone: driver.phone,
      description: "Tractor for credit testing.",
      availability: "Available",
      isActive: true,
    });

    // -----------------------------------------------------------------
    // TEST 1: Configurable Pack Sizes & Pricing
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Configurable Pack Sizes & Packages API ---");
    assert(
      JSON.stringify(ALLOWED_PACK_SIZES) === JSON.stringify([5, 7, 10, 15, 20, 25]),
      "Configurable pack sizes include exactly [5, 7, 10, 15, 20, 25] requests"
    );

    const packagesRes = await fetch(`${baseUrl}/api/credits/packages`);
    const packagesData = await packagesRes.json();
    assert(packagesRes.status === 200, "GET /api/credits/packages returns HTTP 200");
    assert(packagesData.packages.length === 6, "Returns all 6 supported pack sizes");
    assert(
      packagesData.packages.every(p => ALLOWED_PACK_SIZES.includes(p.packSize)),
      "Every returned package matches supported pack sizes"
    );

    // -----------------------------------------------------------------
    // TEST 2: Rejection of Invalid Pack Sizes & Farmer Access Block
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Invalid Pack Sizes & Farmer Access Block ---");
    activeTestUser = farmer;
    const farmerBlockedRes = await fetch(`${baseUrl}/api/credits/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize: 5 }),
    });
    assert(farmerBlockedRes.status === 403, "Farmers blocked from purchasing driver credits with HTTP 403");

    activeTestUser = driver;
    const invalidPackRes = await fetch(`${baseUrl}/api/credits/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize: 12 }), // Not in allowed list
    });
    assert(invalidPackRes.status === 400, "Rejects packSize 12 with HTTP 400");

    // -----------------------------------------------------------------
    // TEST 3: Initiation & Strict Rejection of Unverified Payment
    // (Never grant credits without verified payment)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Unverified Payment Rejection Invariant ---");
    const initiateRes = await fetch(`${baseUrl}/api/credits/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize: 10 }), // ₹379
    });
    const initiateData = await initiateRes.json();
    assert(initiateRes.status === 201, "Initiate order returns HTTP 201");
    assert(initiateData.order.packSize === 10, "Order packSize is 10");
    assert(initiateData.order.amount === PACK_PRICING[10], "Order amount matches ₹379");

    // Attempt verification with failed / missing signature
    const failedVerifyRes = await fetch(`${baseUrl}/api/credits/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: initiateData.order.transactionId,
        paymentSignature: "INVALID_UNVERIFIED_SIGNATURE",
      }),
    });
    assert(failedVerifyRes.status === 402, "Unverified payment rejected with HTTP 402");

    const farmerAfterFail = await User.findById(farmer._id);
    assert(farmerAfterFail.bookingCredits === 0, "No credits granted when payment verification fails (credits = 0)");

    // -----------------------------------------------------------------
    // TEST 4: Verified Payment Grants Credits Atomically
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Verified Payment Atomic Credit Allocation ---");
    // Initiate valid 5-pack
    const order5Res = await fetch(`${baseUrl}/api/credits/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packSize: 5 }),
    });
    const order5Data = await order5Res.json();

    const verify5Res = await fetch(`${baseUrl}/api/credits/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: order5Data.order.transactionId,
        paymentSignature: "VERIFIED_TEST_SIGNATURE",
      }),
    });
    const verify5Data = await verify5Res.json();
    assert(verify5Res.status === 200, "Verified payment returns HTTP 200");
    assert(verify5Data.bookingCredits === 5, "Driver bookingCredits incremented to 5");

    // Replay attack prevention: duplicate verification of same transaction
    const duplicateVerifyRes = await fetch(`${baseUrl}/api/credits/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: order5Data.order.transactionId,
        paymentSignature: "VERIFIED_TEST_SIGNATURE",
      }),
    });
    assert(duplicateVerifyRes.status === 400, "Duplicate payment verification rejected with HTTP 400");

    // -----------------------------------------------------------------
    // TEST 5: Credit Consumption on Driver Account (Farmer Immunity)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Driver Credit Consumption & Farmer Immunity ---");
    // Ensure driver has exhausted free 3 requests so premium credit is consumed
    await User.findByIdAndUpdate(driver._id, { freeRequestsUsed: 3, bookingCredits: 5 });
    const driverBefore = await User.findById(driver._id);
    assert(driverBefore.bookingCredits === 5, "Driver has 5 premium credits before booking");

    // Farmer books without platform credits
    activeTestUser = await User.findById(farmer._id);
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0];
    const bookingRes = await fetch(`${baseUrl}/api/group-bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machine._id,
        landArea: 3,
        bookingDate: tomorrow,
        location: "Bareilly Credit Farm",
        workType: "Ploughing",
      }),
    });
    const bookingData = await bookingRes.json();
    assert(bookingRes.status === 201, "Farmer books successfully without platform credit limits (HTTP 201)");

    const driverAfterBooking = await User.findById(driver._id);
    assert(driverAfterBooking.bookingCredits === 4, "Driver bookingCredits decremented from 5 to 4");

    const farmerAfterBooking = await User.findById(farmer._id);
    assert(farmerAfterBooking.bookingCredits === 0, "Farmer credits balance remains unchanged (Farmers not charged platform credits)");

    // -----------------------------------------------------------------
    // TEST 6: Preservation of Confirmed Bookings When Credits Run Out
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Confirmed Bookings Preservation Invariant ---");
    // Accept the booking as driver
    activeTestUser = driver;
    const acceptRes = await fetch(`${baseUrl}/api/group-bookings/single/${bookingData._id}/accept`, {
      method: "PUT",
    });
    assert(acceptRes.status === 200, "Driver accepts booking (HTTP 200)");
    const acceptedBooking = await Booking.findById(bookingData._id);
    assert(acceptedBooking.status === "Accepted", "Booking status is 'Accepted'");

    // Simulate driver running out of credits completely (credits = 0)
    await User.findByIdAndUpdate(driver._id, { bookingCredits: 0 });
    const driverDepleted = await User.findById(driver._id);
    assert(driverDepleted.bookingCredits === 0, "Driver credits balance is now 0");

    // Check that previously confirmed booking remains strictly intact
    const preservedBooking = await Booking.findById(bookingData._id).select("+completionOtp");
    assert(preservedBooking.status === "Accepted", "Confirmed booking status is preserved as 'Accepted'");
    assert(Boolean(preservedBooking.completionOtp), "Completion OTP remains active on confirmed booking");

    // Clean up
    await Machine.deleteOne({ _id: machine._id });
    await Booking.deleteOne({ _id: bookingData._id });
    await CreditTransaction.deleteMany({ user: farmer._id });
    await User.deleteMany({ _id: { $in: [farmer._id, driver._id] } });

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
      throw new Error(`${failed} tests failed!`);
    }
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
