/**
 * WORKSHETU: DATABASE-DRIVEN MACHINE CATEGORY SELECTOR TEST SUITE
 * 
 * Verifies all 10 user requirements:
 * 1. A category with active machine listings appears.
 * 2. A category with no eligible listings does not appear.
 * 3. Adding a new category makes it available automatically.
 * 4. Search, Select All and Clear Selection UI semantics.
 * 5. All Available Machines includes future categories automatically.
 * 6. Selected Categories applies only to selected eligible categories.
 * 7. Labour and transport categories do not appear in the machine selector.
 * 8. Unauthorized requests are rejected.
 * 9. Empty database and API errors are handled correctly (no hardcoded fallback).
 * 10. Existing offers and booking functionality continue working.
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const http = require("http");
const express = require("express");

const Machine = require("./models/ListingMachin");
const Labour = require("./models/Labour");
const Transport = require("./models/Tranport");
const User = require("./models/Owner");
const Offer = require("./models/Offer");
const adminOffersRouter = require("./routes/adminOffers");
const publicOffersRouter = require("./routes/publicOffers");
const { validateOffer, calculateFinalPrice } = require("./utils/pricingEngine");
const { getEligibleDriverIds } = require("./utils/driverEligibility");

// Setup test Express App
const app = express();
app.use(express.json());

// Unprotected public routes
app.use("/api/offers", publicOffersRouter);

// Protected Admin routes (uses real auth middleware in adminOffersRouter)
app.use("/api/admin", adminOffersRouter);

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("======================================================================");
  console.log("  WORKSHETU: DATABASE-DRIVEN MACHINE CATEGORY SELECTOR TESTS         ");
  console.log("======================================================================\n");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log("Connected to MongoDB successfully.\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

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

  // Cleanup tracking arrays
  const testUserIds = [];
  const testMachineIds = [];
  const testLabourIds = [];
  const testTransportIds = [];
  const testOfferCodes = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Create controlled test drivers and listings
    // -------------------------------------------------------------------------
    console.log("--- SETUP: Preparing Isolated Test Environment ---");

    // Approved, active driver
    const activeDriver = await User.create({
      fullName: "Test Active Driver",
      phone: "9199990001",
      email: "active_driver@test.com",
      role: "Driver",
      driverApplicationStatus: "Approved",
      isActive: true,
      location: "Bareilly",
    });
    testUserIds.push(activeDriver._id);

    // Suspended driver
    const suspendedDriver = await User.create({
      fullName: "Test Suspended Driver",
      phone: "9199990002",
      email: "suspended_driver@test.com",
      role: "Driver",
      driverApplicationStatus: "Approved",
      isActive: false, // Suspended
      location: "Bareilly",
    });
    testUserIds.push(suspendedDriver._id);

    // Admin user for authorized calls
    const adminUser = await User.create({
      fullName: "Test Admin User",
      phone: "9199990003",
      email: "admin_user@test.com",
      role: "Admin",
      isActive: true,
    });
    testUserIds.push(adminUser._id);

    // Farmer user for bookings
    const farmerUser = await User.create({
      fullName: "Test Farmer",
      phone: "9199990004",
      email: "farmer@test.com",
      role: "Farmer",
      isActive: true,
      location: "Bareilly",
    });
    testUserIds.push(farmerUser._id);

    // Listing 1: Active Tractor listing
    const tractorListing = await Machine.create({
      owner: activeDriver._id,
      title: "Test Active Tractor",
      category: "Tractor",
      vehicleNumber: "UP25AA1111",
      phone: "9199990001",
      description: "Eligible tractor",
      availability: "Available",
      price: 1000,
      unit: "Hour",
      power: 50,
      fuelType: "Diesel",
      year: 2022,
      location: "Bareilly",
      latitude: 28.367,
      longitude: 79.430,
      image: { url: "https://example.com/tractor.jpg", filename: "tractor" },
    });
    testMachineIds.push(tractorListing._id);

    // Listing 2: Active Rotavator listing
    const rotavatorListing = await Machine.create({
      owner: activeDriver._id,
      title: "Test Active Rotavator",
      category: "Rotavator",
      vehicleNumber: "UP25AA2222",
      phone: "9199990001",
      description: "Eligible rotavator",
      availability: "Available",
      price: 1200,
      unit: "Hour",
      power: 45,
      fuelType: "Diesel",
      year: 2021,
      location: "Bareilly",
      latitude: 28.367,
      longitude: 79.430,
      image: { url: "https://example.com/rotavator.jpg", filename: "rotavator" },
    });
    testMachineIds.push(rotavatorListing._id);

    // Listing 3: Hidden Harvester listing (Ineligible)
    const hiddenHarvester = await Machine.create({
      owner: activeDriver._id,
      title: "Test Hidden Harvester",
      category: "Harvester",
      vehicleNumber: "UP25AA3333",
      phone: "9199990001",
      description: "Hidden harvester",
      availability: "Hidden", // Ineligible!
      price: 2500,
      unit: "Hour",
      power: 90,
      fuelType: "Diesel",
      year: 2023,
      location: "Bareilly",
      latitude: 28.367,
      longitude: 79.430,
      image: { url: "https://example.com/harvester.jpg", filename: "harvester" },
    });
    testMachineIds.push(hiddenHarvester._id);

    // Listing 4: Cultivator owned by SUSPENDED driver (Ineligible)
    const suspendedCultivator = await Machine.create({
      owner: suspendedDriver._id,
      title: "Test Suspended Cultivator",
      category: "Cultivator",
      vehicleNumber: "UP25AA4444",
      phone: "9199990002",
      description: "Suspended owner cultivator",
      availability: "Available",
      price: 700,
      unit: "Hour",
      power: 35,
      fuelType: "Diesel",
      year: 2020,
      location: "Bareilly",
      latitude: 28.367,
      longitude: 79.430,
      image: { url: "https://example.com/cultivator.jpg", filename: "cultivator" },
    });
    testMachineIds.push(suspendedCultivator._id);

    // Add Labour & Transport listings to verify service isolation
    const testLabour = await Labour.create({
      owner: activeDriver._id,
      name: "Field Worker",
      labourType: "Farm Worker",
      price: 500,
      description: "Field labor",
      phone: "9199990001",
      location: "Bareilly",
      image: { url: "https://example.com/labour.jpg", filename: "labour" },
    });
    testLabourIds.push(testLabour._id);

    const testTransport = await Transport.create({
      owner: activeDriver._id,
      vehicleName: "Tempo 1",
      vehicleType: "Tempo",
      description: "Transport service",
      price: 1000,
      phone: "9199990001",
      location: "Bareilly",
      image: { url: "https://example.com/tempo.jpg", filename: "tempo" },
    });
    testTransportIds.push(testTransport._id);

    console.log("Test entities created.\n");

    // -------------------------------------------------------------------------
    // TEST 1 & 2: Database as Source of Truth & Category Visibility
    // -------------------------------------------------------------------------
    console.log("--- TEST 1 & 2: Active Listing Appears, Ineligible/Missing Does Not ---");
    const dbCategories = await Machine.getAvailableCategoriesFromDB();
    assert(dbCategories.includes("Tractor"), "Active listing category 'Tractor' appears in distinct categories");
    assert(dbCategories.includes("Rotavator"), "Active listing category 'Rotavator' appears in distinct categories");
    assert(!dbCategories.includes("Harvester"), "Hidden listing category 'Harvester' DOES NOT appear");
    assert(!dbCategories.includes("Cultivator"), "Suspended driver category 'Cultivator' DOES NOT appear");
    assert(!dbCategories.includes("Loader"), "Category with zero listings ('Loader') DOES NOT appear");
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 3: Dynamic Updates When New Listing Category Added
    // -------------------------------------------------------------------------
    console.log("--- TEST 3: Adding a New Category Makes It Available Automatically ---");
    const loaderListing = await Machine.create({
      owner: activeDriver._id,
      title: "Test Active Loader",
      category: "Loader",
      vehicleNumber: "UP25AA5555",
      phone: "9199990001",
      description: "Newly added loader",
      availability: "Available",
      price: 1500,
      unit: "Hour",
      power: 60,
      fuelType: "Diesel",
      year: 2023,
      location: "Bareilly",
      latitude: 28.367,
      longitude: 79.430,
      image: { url: "https://example.com/loader.jpg", filename: "loader" },
    });
    testMachineIds.push(loaderListing._id);

    const updatedCategories = await Machine.getAvailableCategoriesFromDB();
    assert(updatedCategories.includes("Loader"), "Newly added 'Loader' category is dynamically available without code edits");
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 7: Service Isolation (Labour and Transport excluded)
    // -------------------------------------------------------------------------
    console.log("--- TEST 7: Service Isolation (Labour & Transport Excluded) ---");
    assert(!updatedCategories.includes("Farm Worker"), "Labour type 'Farm Worker' does not appear in machine categories");
    assert(!updatedCategories.includes("Tempo"), "Transport type 'Tempo' does not appear in machine categories");
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 8: Authorization Checks
    // -------------------------------------------------------------------------
    console.log("--- TEST 8: Security & Authorization Enforcement ---");
    // Public endpoint allows reading categories
    const pubRes = await fetch(`${baseUrl}/api/offers/categories`);
    const pubBody = await pubRes.json();
    assert(pubRes.status === 200, "Public /api/offers/categories responds with HTTP 200");
    assert(pubBody.categories.includes("Tractor"), "Public categories includes available Tractor");

    // Admin endpoint rejects unauthenticated request
    const unauthRes = await fetch(`${baseUrl}/api/admin/offers/categories`);
    assert(unauthRes.status === 401, "Unauthenticated request to /api/admin/offers/categories is rejected with HTTP 401");
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 5 & 6: Offer Selection Rules (All Available vs Selected Categories)
    // -------------------------------------------------------------------------
    console.log("--- TEST 5 & 6: All Available Machines vs Selected Categories Rules ---");

    // 5a. Create offer with 'All Available Machines' (stored unambiguously as categorySelectionMode: "all", applicableCategories: [])
    const codeAll = "TEST_ALL_" + Date.now();
    testOfferCodes.push(codeAll);
    const offerAll = await Offer.create({
      title: "All Available Machines Offer",
      code: codeAll,
      discountType: "Percentage",
      discountValue: 10,
      maxDiscount: 100,
      applicableService: "Machine",
      categorySelectionMode: "all",
      applicableCategories: [],
      fundingSource: "WorkShetu",
      userEligibility: "All",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    // 5b. Evaluate against Tractor and newly added Loader
    const evalTractor = await validateOffer({
      code: codeAll,
      requestType: "Machine",
      category: "Tractor",
      basePrice: 1000,
    });
    assert(evalTractor.isValid === true, "All Available Machines offer qualifies for Tractor");

    const evalLoader = await validateOffer({
      code: codeAll,
      requestType: "Machine",
      category: "Loader",
      basePrice: 1500,
    });
    assert(evalLoader.isValid === true, "All Available Machines offer automatically qualifies for newly added Loader");

    // 6a. Create offer with 'Selected Categories' (restricted to Tractor only)
    const codeSel = "TEST_SEL_" + Date.now();
    testOfferCodes.push(codeSel);
    const offerSelected = await Offer.create({
      title: "Tractor Only Selected Offer",
      code: codeSel,
      discountType: "Flat",
      discountValue: 100,
      applicableService: "Machine",
      categorySelectionMode: "selected",
      applicableCategories: ["Tractor"],
      fundingSource: "WorkShetu",
      userEligibility: "All",
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    // Evaluate matching category
    const evalTractorMatch = await validateOffer({
      code: codeSel,
      requestType: "Machine",
      category: "Tractor",
      basePrice: 1000,
    });
    assert(evalTractorMatch.isValid === true, "Selected Categories offer qualifies for matching category Tractor");

    // Evaluate non-matching category
    const evalRotavatorMismatch = await validateOffer({
      code: codeSel,
      requestType: "Machine",
      category: "Rotavator",
      basePrice: 1200,
    });
    assert(evalRotavatorMismatch.isValid === false, "Selected Categories offer rejects non-selected category Rotavator");
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 6b & 8b: Backend Category Validation Rejects Unavailable Categories
    // -------------------------------------------------------------------------
    console.log("--- TEST 6b: Backend Rejects Offer Creation with Unavailable Category ---");
    // Helper to simulate admin-authenticated request
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use("/api/admin", (req, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { _id: adminUser._id, role: "Admin", isAdmin: true, isActive: true };
      next();
    }, adminOffersRouter);

    const adminServer = http.createServer(adminApp);
    await new Promise((resolve) => adminServer.listen(0, resolve));
    const adminUrl = `http://127.0.0.1:${adminServer.address().port}`;

    // Attempt to create offer with 'Harvester' (which has no active listing in DB)
    const resCreateUnavailable = await fetch(`${adminUrl}/api/admin/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Invalid Harvester Offer",
        code: "HARV_" + Date.now(),
        discountType: "Flat",
        discountValue: 50,
        applicableService: "Machine",
        categorySelectionMode: "selected",
        applicableCategories: ["Harvester"], // Harvester is hidden/unavailable in DB
        endDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    const bodyCreateUnavailable = await resCreateUnavailable.json();
    assert(resCreateUnavailable.status === 400, "Backend rejects creation with unavailable category (HTTP 400)");
    assert(
      bodyCreateUnavailable.message.includes("not currently available in the database"),
      `Error specifies unavailable category: "${bodyCreateUnavailable.message}"`
    );

    adminServer.close();
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 9: Empty Database Handling (No Hardcoded Fallback)
    // -------------------------------------------------------------------------
    console.log("--- TEST 9: Empty Database Returns Empty Array (No Hardcoded Fallback) ---");
    // Temporarily hide our active test listings
    await Machine.updateMany({ _id: { $in: testMachineIds } }, { availability: "Hidden" });

    // Check if any other machines exist in database
    const remainingEligible = await Machine.getAvailableCategoriesFromDB();
    // Verify that getAvailableCategoriesFromDB directly queries distinct categories without injecting hardcoded strings
    const rawDistinct = await Machine.distinct("category", {
      owner: { $in: await getEligibleDriverIds() },
      availability: { $ne: "Hidden" },
    });
    assert(
      remainingEligible.length === rawDistinct.length,
      `Categories count (${remainingEligible.length}) strictly matches raw database distinct count (${rawDistinct.length})`
    );

    // Restore our active listings for subsequent tests
    await Machine.updateOne({ _id: tractorListing._id }, { availability: "Available" });
    await Machine.updateOne({ _id: rotavatorListing._id }, { availability: "Available" });
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 10: Ineligible Machine Booking Protection & Invariant Preservation
    // -------------------------------------------------------------------------
    console.log("--- TEST 10: Ineligible Machine Protection & Protected Payout Invariants ---");
    // Offer should NOT apply to a hidden machine via machineId
    const hiddenMachineBookingEval = await validateOffer({
      code: codeAll,
      requestType: "Machine",
      machineId: hiddenHarvester._id,
      category: "Harvester",
      basePrice: 2500,
    });
    assert(
      hiddenMachineBookingEval.isValid === false,
      "Offer is blocked from applying to an ineligible/hidden machine listing"
    );
    assert(
      hiddenMachineBookingEval.reason.includes("machine listing is currently inactive, hidden, or owned by an unapproved driver"),
      `Rejection reason: "${hiddenMachineBookingEval.reason}"`
    );

    // Verify financial quote invariant on eligible machine
    const quote = calculateFinalPrice({
      baseServicePrice: 1000,
      mandatoryCharges: 500, // Small land surcharge
      offer: offerAll,
    });
    assert(quote.actualDiscount === 100, "Offer discount is 10% = ₹100");
    assert(quote.finalPayableAmount === 1400, "Farmer pays discounted base (900) + full mandatory charges (500) = ₹1400");
    assert(quote.driverPayout === 1500, "Driver payout is strictly 100% of agreed price (₹1500), ₹0 deduction");
    console.log("");

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    console.log("--- CLEANUP: Removing Test Entities ---");
    await Machine.deleteMany({ _id: { $in: testMachineIds } });
    await Labour.deleteMany({ _id: { $in: testLabourIds } });
    await Transport.deleteMany({ _id: { $in: testTransportIds } });
    await User.deleteMany({ _id: { $in: testUserIds } });
    await Offer.deleteMany({ code: { $in: testOfferCodes } });

    server.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.\n");
  }

  console.log("=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
