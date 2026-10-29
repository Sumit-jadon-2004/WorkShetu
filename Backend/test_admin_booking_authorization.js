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
  console.log("     WORKSHETU: ADMIN MACHINE BOOKING AUTHORIZATION TEST SUITE        ");
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

  app.use("/api/bookings", groupBookingsRouter);

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
    const driverA = await User.create({
      fullName: `Driver A ${timestamp}`,
      phone: `91${String(timestamp).slice(-8)}`,
      email: `driver_a_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      isActive: true,
      location: "Bareilly, UP",
    });

    const driverB = await User.create({
      fullName: `Driver B ${timestamp}`,
      phone: `92${String(timestamp).slice(-8)}`,
      email: `driver_b_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      isActive: true,
      location: "Moradabad, UP",
    });

    const farmer = await User.create({
      fullName: `Farmer Test ${timestamp}`,
      phone: `93${String(timestamp).slice(-8)}`,
      email: `farmer_${timestamp}@test.com`,
      role: "Farmer",
      isAdmin: false,
      isActive: true,
      location: "Aligarh, UP",
      latitude: 27.8974,
      longitude: 78.088,
    });

    const admin = await User.create({
      fullName: `Admin Test ${timestamp}`,
      phone: `94${String(timestamp).slice(-8)}`,
      email: `admin_${timestamp}@test.com`,
      role: "Admin",
      isAdmin: true,
      isActive: true,
      location: "Headquarters, Delhi",
    });

    const suspendedDriver = await User.create({
      fullName: `Suspended Driver ${timestamp}`,
      phone: `95${String(timestamp).slice(-8)}`,
      email: `suspended_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      isActive: false, // Suspended
    });

    // 2. Setup Test Machines
    const machineA = await ListingMachine.create({
      owner: driverA._id,
      title: `Mahindra 575 DI ${timestamp}`,
      category: "Tractor",
      vehicleNumber: `UP${String(timestamp).slice(-2)}AB${String(timestamp).slice(-4)}`,
      image: { url: "https://example.com/tractor.jpg", filename: "tractor.jpg" },
      price: 600,
      unit: "Bigha",
      power: 45,
      fuelType: "Diesel",
      year: 2022,
      location: "Bareilly, UP",
      latitude: 28.367,
      longitude: 79.430,
      phone: "9876543210",
      description: "Powerful tractor for plowing and tilling.",
      availability: "Available",
    });

    const hiddenMachine = await ListingMachine.create({
      owner: driverA._id,
      title: `Hidden Harvester ${timestamp}`,
      category: "Harvester",
      vehicleNumber: `UP${String(timestamp).slice(-2)}CD${String(timestamp).slice(-4)}`,
      image: { url: "https://example.com/harvester.jpg", filename: "harvester.jpg" },
      price: 1200,
      unit: "Bigha",
      power: 75,
      fuelType: "Diesel",
      year: 2023,
      location: "Bareilly, UP",
      latitude: 28.367,
      longitude: 79.430,
      phone: "9876543210",
      description: "Harvesting machine.",
      availability: "Hidden",
    });

    const adminOwnedMachine = await ListingMachine.create({
      owner: admin._id,
      title: `Admin Rotavator ${timestamp}`,
      category: "Rotavator",
      image: { url: "https://example.com/rotavator.jpg", filename: "rotavator.jpg" },
      price: 500,
      unit: "Bigha",
      year: 2021,
      location: "Delhi",
      latitude: 28.6139,
      longitude: 77.2090,
      phone: "9876543211",
      description: "Rotavator equipment.",
      availability: "Available",
    });

    const suspendedDriverMachine = await ListingMachine.create({
      owner: suspendedDriver._id,
      title: `Suspended Cultivator ${timestamp}`,
      category: "Cultivator",
      image: { url: "https://example.com/cultivator.jpg", filename: "cultivator.jpg" },
      price: 400,
      unit: "Bigha",
      year: 2020,
      location: "Meerut",
      latitude: 28.9845,
      longitude: 77.7064,
      phone: "9876543212",
      description: "Cultivator equipment.",
      availability: "Available",
    });

    console.log("--- TEST 1: Farmer Booking Another User's Machine (Baseline) ---");
    activeTestUser = farmer;
    const farmerRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        landArea: 3, // < 5 Bigha, attracts small plot surcharge: 2 * 100 = 200
        location: "Aligarh Farm",
        workType: "Plowing",
      }),
    });
    const farmerData = await farmerRes.json();
    assert(farmerRes.status === 201, "Farmer booking returns HTTP 201 Created");
    assert(farmerData.status === "Pending", "Farmer booking initial status is 'Pending'");
    assert(farmerData.extraCharge === 200, "Small plot surcharge applied correctly for 3 Bigha (₹200)");
    assert(farmerData.basePrice === 1800, "Base price calculated correctly (3 * 600 = ₹1800)");
    assert(farmerData.finalPrice === 2000, "Final price equals basePrice + extraCharge (₹2000)");
    assert(farmerData.driverPayout === 2000, "Driver payout is fully protected (₹2000)");

    console.log("\n--- TEST 2: Admin Booking Another User's Machine (Bug Fix Verification) ---");
    activeTestUser = admin;
    const adminRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        landArea: 1, // 1 Bigha, missing 4 Bigha -> extra charge: 2*100 + 2*150 = 500
        location: "Delhi Farm Plot",
        workType: "Soil Preparation",
      }),
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 201, "Admin booking returns HTTP 201 Created (NOT 403 Forbidden)");
    assert(adminData.status === "Pending", "Admin booking is NOT auto-accepted (remains 'Pending')");
    assert(adminData.otpVerified === false || !adminData.otpVerified, "OTP verification is NOT bypassed for Admin");
    assert(adminData.customer.toString() === admin._id.toString(), "Booking customer is correctly set to Admin user ID");
    assert(adminData.extraCharge === 500, "Small land surcharge applied consistently to Admin (₹500 for 1 Bigha)");
    assert(adminData.basePrice === 600, "Base price calculated consistently for Admin (1 * 600 = ₹600)");
    assert(adminData.finalPrice === 1100, "Final price calculated consistently for Admin (₹1100)");
    assert(adminData.driverPayout === 1100, "Driver payout is protected for Admin booking (₹1100)");

    console.log("\n--- TEST 3: Driver Booking Another Driver's Machine ---");
    activeTestUser = driverB;
    const driverRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        landArea: 5, // >= 5 Bigha, no surcharge
        location: "Moradabad Farm",
        workType: "Harvest assistance",
      }),
    });
    const driverData = await driverRes.json();
    assert(driverRes.status === 201, "Driver B booking Driver A's machine returns HTTP 201 Created");
    assert(driverData.status === "Pending", "Driver B booking initial status is 'Pending'");
    assert(driverData.extraCharge === 0, "No small land surcharge for 5 Bigha (₹0)");
    assert(driverData.finalPrice === 3000, "Final price calculated correctly (5 * 600 = ₹3000)");

    console.log("\n--- TEST 4: Own-Listing Prevention - Driver Booking Own Machine ---");
    activeTestUser = driverA;
    const driverOwnRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: machineA._id,
        landArea: 5,
        location: "Own Farm",
      }),
    });
    const driverOwnData = await driverOwnRes.json();
    assert(driverOwnRes.status === 403, "Driver booking their own machine returns HTTP 403 Forbidden");
    assert(
      driverOwnData.message === "You cannot book your own machine.",
      "Clear error message: 'You cannot book your own machine.'"
    );

    console.log("\n--- TEST 5: Own-Listing Prevention - Admin Booking Own Machine ---");
    activeTestUser = admin;
    const adminOwnRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: adminOwnedMachine._id,
        landArea: 5,
        location: "Admin Farm",
      }),
    });
    const adminOwnData = await adminOwnRes.json();
    assert(adminOwnRes.status === 403, "Admin booking their own machine returns HTTP 403 Forbidden");
    assert(
      adminOwnData.message === "You cannot book your own machine.",
      "Clear error message: 'You cannot book your own machine.'"
    );

    console.log("\n--- TEST 6: Unavailable & Ineligible Machine Booking Protection ---");
    // Attempt booking on hidden machine
    activeTestUser = admin;
    const hiddenRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: hiddenMachine._id,
        landArea: 5,
        location: "Delhi Farm",
      }),
    });
    assert(hiddenRes.status === 409, "Booking a hidden machine returns HTTP 409 Conflict");

    // Attempt booking machine owned by suspended/inactive driver
    const suspendedRes = await fetch(`${baseUrl}/api/bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: suspendedDriverMachine._id,
        landArea: 5,
        location: "Meerut Farm",
      }),
    });
    assert(suspendedRes.status === 409, "Booking machine owned by suspended driver returns HTTP 409 Conflict");

    console.log("\n--- TEST 7: Customer Booking History & Requests for Admin ---");
    activeTestUser = admin;
    const myRequestsRes = await fetch(`${baseUrl}/api/bookings/my/requests`);
    const myRequestsData = await myRequestsRes.json();
    assert(myRequestsRes.status === 200, "Admin can retrieve their customer booking requests at /my/requests");
    assert(
      Array.isArray(myRequestsData.bookings) && myRequestsData.bookings.some((b) => b._id === adminData._id),
      "Admin's booking is present in the returned customer bookings"
    );

    console.log("\n--- TEST 8: Customer Cancellation of Single Booking for Admin ---");
    activeTestUser = admin;
    const cancelRes = await fetch(`${baseUrl}/api/bookings/my/single/${adminData._id}/cancel`, {
      method: "PUT",
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, "Admin can cancel their pending single booking via /my/single/:id/cancel");
    assert(cancelData.success === true, "Cancellation returns success: true");

    const deletedBooking = await Booking.findById(adminData._id);
    assert(!deletedBooking, "Pending booking was removed from DB after cancellation");

    // Cleanup test records
    await Booking.deleteMany({ customer: { $in: [farmer._id, admin._id, driverB._id] } });
    await ListingMachine.deleteMany({ _id: { $in: [machineA._id, hiddenMachine._id, adminOwnedMachine._id, suspendedDriverMachine._id] } });
    await User.deleteMany({ _id: { $in: [driverA._id, driverB._id, farmer._id, admin._id, suspendedDriver._id] } });

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    console.log("\n=================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
    if (failed > 0) process.exit(1);
  }
}

runTests();

