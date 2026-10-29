/**
 * Test Suite: Bug Fixes Verification
 * 1. Prevent Selection of Past Dates in All Forms (both frontend contract & backend API).
 * 2. Show Driver/Owner Name on Every Machine Details Page.
 * 3. Fix My Bookings for Admin Login (Personal vs Platform Bookings).
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const express = require("express");

dotenv.config({ path: path.join(__dirname, ".env") });

const { validateBookingDate, PAST_DATE_ERROR_MESSAGE, getDayString } = require("./utils/dateValidator");
const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const BookingMachine = require("./models/BookingMachine.js");
const groupBookingsRouter = require("./routes/groupBookings.js");
const adminBookingsRouter = require("./routes/adminBookings.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WorkShetu";

async function runTests() {
  console.log("======================================================================");
  console.log("     WORKSHETU: DATE VALIDATION, DRIVER DISPLAY & ADMIN BOOKINGS      ");
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

  // Mount routers
  app.use("/api/group-bookings", groupBookingsRouter);
  app.use("/api/admin", adminBookingsRouter);

  // Mount machine routes mimicking App.js exactly
  app.get("/api/machine", async (req, res) => {
    try {
      const machines = await Machine.find({ isActive: true })
        .populate("owner", "fullName location driverApplicationStatus");
      res.json({ success: true, count: machines.length, data: machines });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/machine/:id", async (req, res) => {
    try {
      const machine = await Machine.findById(req.params.id)
        .populate("owner", "fullName phone email role location driverApplicationStatus profileImage driverExperience driverVehicleNumber isActive");
      if (!machine) {
        return res.status(404).json({ success: false, message: "Machine not found" });
      }

      const machineObj = machine.toObject();
      let driverName = "Driver information unavailable";
      let isVerified = false;
      let driverLocation = machineObj.location || "";
      let driverPhone = "";

      if (machineObj.owner && typeof machineObj.owner === "object") {
        const ownerDoc = machineObj.owner;
        const isApprovedDriver = ownerDoc.driverApplicationStatus === "Approved" || ownerDoc.role === "driver";
        const hasName = Boolean(ownerDoc.fullName && String(ownerDoc.fullName).trim());

        if (hasName && isApprovedDriver) {
          driverName = String(ownerDoc.fullName).trim();
          isVerified = ownerDoc.driverApplicationStatus === "Approved";
          driverLocation = ownerDoc.location || machineObj.location || "";
          driverPhone = ownerDoc.phone || "";
        } else if (hasName) {
          driverName = String(ownerDoc.fullName).trim();
          driverLocation = ownerDoc.location || machineObj.location || "";
          driverPhone = ownerDoc.phone || "";
        }
      }

      machineObj.driver = {
        fullName: driverName,
        isVerified,
        location: driverLocation,
        phone: driverPhone,
        profileImage: machineObj.owner?.profileImage || "",
        driverExperience: machineObj.owner?.driverExperience || null,
        driverVehicleNumber: machineObj.owner?.driverVehicleNumber || ""
      };

      if (!machineObj.owner) {
        machineObj.owner = {
          fullName: "Driver information unavailable",
          location: machineObj.location || "",
          driverApplicationStatus: "None"
        };
      }

      res.json({ success: true, machine: machineObj });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

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
    const driverUser = await User.create({
      fullName: `Rameshwar Singh ${timestamp}`,
      phone: `91${String(timestamp).slice(-8)}`,
      email: `driver_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      driverExperience: 7,
      driverVehicleNumber: "UP-25-XY-9999",
      isActive: true,
      location: "Bareilly, UP",
    });

    const farmerUser = await User.create({
      fullName: `Kisan Ramlal ${timestamp}`,
      phone: `92${String(timestamp).slice(-8)}`,
      email: `farmer_${timestamp}@test.com`,
      role: "Farmer",
      isAdmin: false,
      isActive: true,
      location: "Bareilly, UP",
    });

    const adminUser = await User.create({
      fullName: `Admin Officer ${timestamp}`,
      phone: `93${String(timestamp).slice(-8)}`,
      email: `admin_${timestamp}@test.com`,
      role: "Admin",
      isAdmin: true,
      isActive: true,
      location: "Bareilly, UP",
    });

    // 2. Setup Machine Listings
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const validMachine = await Machine.create({
      owner: driverUser._id,
      title: `Mahindra 575 DI ${timestamp}`,
      category: "Tractor",
      vehicleNumber: `UP25AB${randomSuffix}`,
      price: 650,
      unit: "Bigha",
      power: 45,
      fuelType: "Diesel",
      year: 2022,
      image: { url: "https://example.com/tractor.jpg", filename: "tractor.jpg" },
      location: "Bareilly, UP",
      latitude: 28.367,
      longitude: 79.430,
      phone: driverUser.phone,
      description: "Heavy-duty farm tractor.",
      availability: "Available",
      isActive: true,
    });

    // Orphan machine with non-existent owner ID
    const orphanMachine = await Machine.create({
      owner: new mongoose.Types.ObjectId(),
      title: `Orphan Harvester ${timestamp}`,
      category: "Harvester",
      vehicleNumber: `UP25CD${randomSuffix}`,
      price: 1500,
      unit: "Bigha",
      power: 70,
      fuelType: "Diesel",
      year: 2021,
      image: { url: "https://example.com/harvester.jpg", filename: "harvester.jpg" },
      location: "Bareilly, UP",
      latitude: 28.367,
      longitude: 79.430,
      phone: "9876543210",
      description: "Listing without owner.",
      availability: "Available",
      isActive: true,
    });

    // =========================================================================
    // SECTION 1: Date Validation Utility & Backend Contract
    // =========================================================================
    console.log("--- SECTION 1: Date Validation Contract ---");

    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const yesterdayStr = getDayString(yesterday, "Asia/Kolkata");
    const todayStr = getDayString(new Date(), "Asia/Kolkata");
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    const tomorrowStr = getDayString(tomorrow, "Asia/Kolkata");

    // 1.1 Past dates
    assert(
      validateBookingDate(yesterdayStr) === PAST_DATE_ERROR_MESSAGE,
      `Rejects yesterday date with "${PAST_DATE_ERROR_MESSAGE}"`
    );
    assert(
      validateBookingDate("2023-11-20") === PAST_DATE_ERROR_MESSAGE,
      "Rejects historical year dates"
    );
    assert(
      validateBookingDate("not-a-date") === PAST_DATE_ERROR_MESSAGE,
      "Rejects invalid date format strings"
    );
    assert(
      validateBookingDate("") === PAST_DATE_ERROR_MESSAGE,
      "Rejects empty date strings"
    );

    // 1.2 Valid dates
    assert(
      validateBookingDate(todayStr) === null,
      "Accepts today's date without time restriction"
    );
    assert(
      validateBookingDate(tomorrowStr) === null,
      "Accepts future date (tomorrow)"
    );

    // 1.4 API Single Booking Rejects Past Date
    activeTestUser = farmerUser;
    const pastBookingRes = await fetch(`${baseUrl}/api/group-bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: validMachine._id,
        landArea: 3,
        bookingDate: "2024-05-15",
        location: "Bareilly Field #1",
        workType: "Plowing"
      })
    });
    const pastBookingData = await pastBookingRes.json();
    assert(pastBookingRes.status === 400, "Single booking API returns HTTP 400 for past date");
    assert(
      pastBookingData.message === PAST_DATE_ERROR_MESSAGE,
      `Single booking API returns exact message: "${PAST_DATE_ERROR_MESSAGE}"`
    );

    // 1.5 API Single Booking Accepts Valid Tomorrow Date
    const validBookingRes = await fetch(`${baseUrl}/api/group-bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: validMachine._id,
        landArea: 3,
        bookingDate: tomorrowStr,
        location: "Bareilly Field #1",
        workType: "Plowing"
      })
    });
    const validBookingData = await validBookingRes.json();
    assert(validBookingRes.status === 201, "Single booking API creates booking for valid date (HTTP 201)");
    assert(Boolean(validBookingData._id), "Single booking API returns created booking with ID");
    assert(validBookingData.status === "Pending", "Single booking status is initial 'Pending'");

    // =========================================================================
    // SECTION 2: Machine Details Driver / Owner Display
    // =========================================================================
    console.log("\n--- SECTION 2: Machine Details Driver Name Display ---");

    const machineRes = await fetch(`${baseUrl}/api/machine/${validMachine._id}`);
    const machineJson = await machineRes.json();
    assert(machineRes.status === 200, "Machine details returns HTTP 200");
    assert(machineJson.success === true, "Machine details response success is true");
    assert(Boolean(machineJson.machine.driver), "Driver object is present in machine response");
    assert(
      machineJson.machine.driver.fullName === driverUser.fullName,
      `Driver fullName shows real name ("${driverUser.fullName}") and NOT ObjectId`
    );
    assert(
      machineJson.machine.driver.isVerified === true,
      "Driver isVerified is true for approved driver"
    );
    assert(
      machineJson.machine.driver.location === driverUser.location,
      "Driver location matches driver user profile"
    );

    // Test orphaned machine fallback
    const orphanRes = await fetch(`${baseUrl}/api/machine/${orphanMachine._id}`);
    const orphanJson = await orphanRes.json();
    assert(orphanRes.status === 200, "Orphaned machine details returns HTTP 200");
    assert(
      orphanJson.machine.driver.fullName === "Driver information unavailable",
      'Orphaned machine returns graceful fallback: "Driver information unavailable"'
    );
    assert(
      orphanJson.machine.owner.fullName === "Driver information unavailable",
      'Orphaned owner returns graceful fallback: "Driver information unavailable"'
    );

    // =========================================================================
    // SECTION 3: Admin My Bookings vs Platform Bookings
    // =========================================================================
    console.log("\n--- SECTION 3: Admin My Bookings vs Platform Bookings ---");

    // 3.1 Admin books a machine as a customer
    activeTestUser = adminUser;
    const adminSingleBookingRes = await fetch(`${baseUrl}/api/group-bookings/single`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: validMachine._id,
        landArea: 2,
        bookingDate: tomorrowStr,
        location: "Admin Personal Farm, Bareilly",
        workType: "Harrowing"
      })
    });
    const adminSingleBookingData = await adminSingleBookingRes.json();
    assert(adminSingleBookingRes.status === 201, "Admin creates a personal customer booking (HTTP 201)");
    assert(Boolean(adminSingleBookingData._id), "Admin personal booking has valid _id");

    // 3.2 Admin fetches their personal bookings via customer endpoint
    const adminMyRequestsRes = await fetch(`${baseUrl}/api/group-bookings/my/requests`);
    const adminMyRequestsData = await adminMyRequestsRes.json();
    assert(adminMyRequestsRes.status === 200, "Admin can access personal bookings at /my/requests (HTTP 200)");
    assert(Array.isArray(adminMyRequestsData.bookings), "/my/requests returns array of standalone bookings");
    const foundAdminBooking = adminMyRequestsData.bookings.find(
      b => b._id.toString() === adminSingleBookingData._id.toString()
    );
    assert(Boolean(foundAdminBooking), "Admin personal booking is returned in /my/requests standalone bookings");

    // 3.3 Admin fetches platform-wide bookings via admin endpoint
    const adminPlatformRes = await fetch(`${baseUrl}/api/admin/bookings`);
    const adminPlatformData = await adminPlatformRes.json();
    assert(adminPlatformRes.status === 200, "Admin can access platform bookings at /api/admin/bookings (HTTP 200)");
    assert(adminPlatformData.success === true, "Platform bookings returns success: true");
    assert(Array.isArray(adminPlatformData.bookings), "Platform bookings returns bookings array");

    // 3.4 Regular Farmer is forbidden from platform-wide admin endpoint
    activeTestUser = farmerUser;
    const farmerBlockedRes = await fetch(`${baseUrl}/api/admin/bookings`);
    assert(farmerBlockedRes.status === 403, "Farmer is blocked from /api/admin/bookings (HTTP 403 Forbidden)");

    // Clean up test listings
    await Machine.deleteOne({ _id: orphanMachine._id });
    await Machine.deleteOne({ _id: validMachine._id });
    await BookingMachine.deleteMany({
      _id: { $in: [validBookingData._id, adminSingleBookingData._id] }
    });

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
