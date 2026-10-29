const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const express = require("express");

dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/Owner.js");
const Booking = require("./models/BookingMachine.js");
const ListingMachine = require("./models/ListingMachin.js");
const groupBookingsRouter = require("./routes/groupBookings.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WorkShetu";

async function runTests() {
  console.log("======================================================================");
  console.log("   WORKSHETU: SMART MACHINE BOOKING & RAPIDO UX TEST SUITE            ");
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
      req.isAuthenticated = () => true;
    } else {
      req.user = null;
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use("/api/group-bookings", groupBookingsRouter);
  app.use("/api/bookings", groupBookingsRouter);

  let server;
  let baseUrl;

  const testIds = {
    users: [],
    listings: [],
    bookings: [],
  };

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. SETUP TEST USERS
    const driverUser = await User.create({
      fullName: "Driver Sukhdev Singh",
      email: `driver_${timestamp}@workshetu.test`,
      phone: `987${String(timestamp).slice(-7)}`,
      role: "Driver",
      driverApplicationStatus: "Approved",
      location: "Patiala, Punjab",
      latitude: 30.3398,
      longitude: 76.3869,
    });
    testIds.users.push(driverUser._id);

    const farmerUser = await User.create({
      fullName: "Farmer Gurpreet Kaur",
      email: `farmer_${timestamp}@workshetu.test`,
      phone: `988${String(timestamp).slice(-7)}`,
      role: "Farmer",
      location: "Nabha, Punjab",
      latitude: 30.3752,
      longitude: 76.1527,
    });
    testIds.users.push(farmerUser._id);

    // 2. SETUP TEST MACHINE LISTINGS (Same category: Tractor)
    const machineA = await ListingMachine.create({
      title: "Mahindra 575 DI High Power Tractor",
      category: "Tractor",
      price: 900,
      pricePerUnit: 900,
      unit: "Bigha",
      owner: driverUser._id,
      location: "Patiala, Punjab",
      latitude: 30.3398,
      longitude: 76.3869,
      availability: "Available",
      status: "Published",
      vehicleNumber: `PB11TR${String(timestamp).slice(-4)}`,
      image: { url: "https://example.com/tractor1.jpg", filename: "tractor1.jpg" },
      power: 45,
      fuelType: "Diesel",
      year: 2022,
      phone: "9876543210",
      description: "High power Mahindra tractor ready for fieldwork",
    });
    testIds.listings.push(machineA._id);

    const machineB = await ListingMachine.create({
      title: "John Deere 5310 Power Tech Tractor",
      category: "Tractor",
      price: 950,
      pricePerUnit: 950,
      unit: "Bigha",
      owner: driverUser._id,
      location: "Rajpura, Punjab",
      latitude: 30.484,
      longitude: 76.5937,
      availability: "Available",
      status: "Published",
      vehicleNumber: `PB11JD${String(timestamp).slice(-4)}`,
      image: { url: "https://example.com/tractor2.jpg", filename: "tractor2.jpg" },
      power: 55,
      fuelType: "Diesel",
      year: 2023,
      phone: "9876543210",
      description: "John Deere tractor with rotavator attachment",
    });
    testIds.listings.push(machineB._id);

    const machineC = await ListingMachine.create({
      title: "Sonalika DI 745 III Cultivator Edition",
      category: "Cultivator",
      price: 600,
      pricePerUnit: 600,
      unit: "Bigha",
      owner: driverUser._id,
      location: "Samana, Punjab",
      latitude: 30.158,
      longitude: 76.192,
      availability: "Available",
      status: "Published",
      vehicleNumber: `PB11SN${String(timestamp).slice(-4)}`,
      image: { url: "https://example.com/cultivator.jpg", filename: "cultivator.jpg" },
      power: 50,
      fuelType: "Diesel",
      year: 2021,
      phone: "9876543210",
      description: "Heavy cultivator for soil preparation",
    });
    testIds.listings.push(machineC._id);

    // -------------------------------------------------------------------------
    // TEST 1: Instant Booking (Today) sets 2-minute response deadline
    // -------------------------------------------------------------------------
    console.log("--- TEST GROUP 1: Response Deadlines & Instant Requests ---");
    activeTestUser = farmerUser;
    const todayStr = new Date().toISOString().split("T")[0];

    const instantRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        location: "Nabha, Punjab",
        latitude: 30.3752,
        longitude: 76.1527,
        landArea: 6,
        bookingDate: todayStr,
        workType: "Ploughing",
        preferredTime: "08:00 AM",
      }),
    });
    const instantData = await instantRes.json();
    testIds.bookings.push(instantData._id);

    assert(instantRes.status === 201, `Farmer can create instant booking (Status: ${instantRes.status})`);
    assert(instantData.isInstantBooking === true, `isInstantBooking is true for today's booking`);
    assert(Boolean(instantData.responseDeadline), `Booking has responseDeadline set`);

    const deadlineDiffSec = Math.round(
      (new Date(instantData.responseDeadline).getTime() - new Date().getTime()) / 1000
    );
    assert(
      deadlineDiffSec >= 110 && deadlineDiffSec <= 125,
      `Instant booking responseDeadline is approximately 120 seconds in future (Actual: ${deadlineDiffSec}s)`
    );
    assert(instantData.preferredTime === "08:00 AM", `Preferred time is recorded as "08:00 AM"`);

    // -------------------------------------------------------------------------
    // TEST 2: Advance Booking sets 2-hour response deadline
    // -------------------------------------------------------------------------
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const advanceRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        location: "Nabha, Punjab",
        latitude: 30.3752,
        longitude: 76.1527,
        landArea: 4,
        bookingDate: futureDateStr,
        workType: "Sowing",
      }),
    });
    const advanceData = await advanceRes.json();
    testIds.bookings.push(advanceData._id);

    assert(advanceRes.status === 201, `Farmer can create advance booking (Status: ${advanceRes.status})`);
    assert(advanceData.isInstantBooking === false, `isInstantBooking is false for advance booking`);
    const advDiffSec = Math.round(
      (new Date(advanceData.responseDeadline).getTime() - new Date().getTime()) / 1000
    );
    assert(
      advDiffSec >= 7100 && advDiffSec <= 7210,
      `Advance booking responseDeadline is approximately 2 hours in future (Actual: ${advDiffSec}s)`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Driver attempting to accept an expired request is rejected with 409
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 2: Atomic Acceptance & Expiry Enforcement ---");

    // Artificially expire the booking deadline in the past
    await Booking.findByIdAndUpdate(instantData._id, {
      responseDeadline: new Date(Date.now() - 5000), // 5 seconds in the past
    });

    activeTestUser = driverUser;
    const acceptExpiredRes = await fetch(
      `${baseUrl}/api/group-bookings/single/${instantData._id}/accept`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }
    );
    const acceptExpiredData = await acceptExpiredRes.json();

    assert(
      acceptExpiredRes.status === 409,
      `Driver cannot accept booking whose deadline expired (Status: ${acceptExpiredRes.status})`
    );
    assert(
      acceptExpiredData.message && acceptExpiredData.message.includes("expired"),
      `Returns explicit expiration message: "${acceptExpiredData.message}"`
    );

    const updatedBooking = await Booking.findById(instantData._id);
    assert(
      updatedBooking.status === "Expired",
      `Booking status transitioned to "Expired" in database`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Alternative machines endpoint recommendations
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 3: Alternative Machine Recommendations ---");
    activeTestUser = farmerUser;

    const altRes = await fetch(
      `${baseUrl}/api/group-bookings/single/${instantData._id}/alternatives`
    );
    const altData = await altRes.json();

    assert(altRes.status === 200, `Alternatives endpoint responds 200 OK`);
    assert(altData.category === "Tractor", `Target category matches "Tractor"`);
    assert(Array.isArray(altData.alternatives), `Returns an array of alternatives`);

    const altIds = altData.alternatives.map((a) => String(a._id));
    assert(
      !altIds.includes(String(machineA._id)),
      `Original expired machine (Machine A) is excluded from alternatives`
    );
    assert(
      altIds.includes(String(machineB._id)),
      `Eligible matching Tractor (Machine B) is recommended in alternatives`
    );
    assert(
      !altIds.includes(String(machineC._id)),
      `Cultivator (Machine C) is excluded because category does not match Tractor`
    );

    const recMachine = altData.alternatives.find((a) => String(a._id) === String(machineB._id));
    assert(
      recMachine && recMachine.distanceKm != null,
      `Alternative has computed distance in KM (Distance: ${recMachine?.distanceKm} KM)`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Farmer rebooking an alternative machine with originalBookingId
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 4: Linked Rebooking & Anti-Duplicate Protection ---");
    activeTestUser = farmerUser;

    const rebookRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineB._id,
        originalBookingId: instantData._id,
        location: "Nabha, Punjab",
        latitude: 30.3752,
        longitude: 76.1527,
        landArea: 6,
        bookingDate: todayStr,
        workType: "Ploughing",
      }),
    });
    const rebookData = await rebookRes.json();
    testIds.bookings.push(rebookData._id);

    assert(rebookRes.status === 201, `Rebooking created successfully (Status: ${rebookRes.status})`);
    assert(
      String(rebookData.originalBookingId) === String(instantData._id),
      `New booking preserves originalBookingId linkage`
    );

    // Attempt duplicate rebooking using the exact same originalBookingId
    const dupRebookRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineB._id,
        originalBookingId: instantData._id,
        location: "Nabha, Punjab",
        landArea: 6,
        bookingDate: todayStr,
      }),
    });
    assert(
      dupRebookRes.status === 409,
      `Duplicate rebooking with same originalBookingId is rejected with 409 Conflict`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Own-listing booking prevention
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 5: Authorization & Own-Listing Safety ---");
    activeTestUser = driverUser; // Owner of machineA

    const ownBookingRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        location: "Patiala",
        landArea: 5,
        bookingDate: todayStr,
      }),
    });
    assert(
      ownBookingRes.status === 403,
      `Driver cannot book their own listing (Status: 403 Forbidden)`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Protected Driver Payout (100% of agreed price)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST GROUP 6: Protected Driver Payouts ---");
    // Machine B price is 950. For 6 Bigha, base price = 950 * 6 = 5700.
    const expectedBase = 950 * 6;
    assert(
      Number(rebookData.finalPrice) === expectedBase,
      `Driver payout finalPrice matches full agreed price ₹${expectedBase} without deductions`
    );

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    console.log("\n--- CLEANUP ---");
    if (testIds.bookings.length) {
      await Booking.deleteMany({ _id: { $in: testIds.bookings } });
    }
    if (testIds.listings.length) {
      await ListingMachine.deleteMany({ _id: { $in: testIds.listings } });
    }
    if (testIds.users.length) {
      await User.deleteMany({ _id: { $in: testIds.users } });
    }
    console.log("Test records cleaned up.");

    if (server) server.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");

    console.log("\n======================================================================");
    console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("======================================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

