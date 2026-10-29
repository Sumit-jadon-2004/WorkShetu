/**
 * WorkShetu: Offer Location Modes & Geographic Scope Verification Tests
 * Tests All Locations (default) vs Restrict to Selected Cities,
 * User Eligibility separation, mandatory charges preservation, and driver payout invariants.
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Offer = require("./models/Offer.js");
const Booking = require("./models/BookingMachine.js");
const { getSmallLandExtraCharge } = require("./utils/groupBooking.js");
const { validateOffer, calculateFinalPrice } = require("./utils/pricingEngine.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("=================================================");
  console.log("   OFFER LOCATION RESTRICTIONS & SCOPE TESTS     ");
  console.log("=================================================\n");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log("Connected to MongoDB successfully.\n");

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

  const cleanupCodes = ["TEST_ALL_LOC", "TEST_SELECTED_CITY", "TEST_NEW_USER_LOC"];

  try {
    await Offer.deleteMany({ code: { $in: cleanupCodes } });

    // 1. Create Universal "All Locations" offer (applicableLocations = [])
    console.log("--- TEST SCENARIO 1: Universal Offer (All Locations Mode: []) ---");
    const allLocOffer = await Offer.create({
      title: "Universal Harvest Offer",
      description: "Valid across all locations nationwide",
      code: "TEST_ALL_LOC",
      discountType: "Flat",
      discountValue: 200,
      applicableService: "Machine",
      applicableCategories: ["Tractor"],
      applicableLocations: [], // Default: All locations
      userEligibility: "All",
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    // Test 1.1: Valid in Noida
    const valNoida = await validateOffer({
      code: "TEST_ALL_LOC",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "Sector 62, Noida, Uttar Pradesh",
    });
    assert(valNoida.isValid === true, "Universal offer validates successfully in Noida");

    // Test 1.2: Valid in Jaipur
    const valJaipur = await validateOffer({
      code: "TEST_ALL_LOC",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "Jaipur, Rajasthan",
    });
    assert(valJaipur.isValid === true, "Universal offer validates successfully in Jaipur");

    // Test 1.3: Valid with empty location string (nationwide coverage)
    const valEmptyLoc = await validateOffer({
      code: "TEST_ALL_LOC",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "",
    });
    assert(valEmptyLoc.isValid === true, "Universal offer validates without location restriction");

    // 2. Create Targeted City offer (applicableLocations = ["Noida", "Greater Noida"])
    console.log("\n--- TEST SCENARIO 2: Targeted City Offer (Selected Cities: Noida, Greater Noida) ---");
    const targetedOffer = await Offer.create({
      title: "Noida NCR Special Offer",
      description: "Restricted to Noida and Greater Noida only",
      code: "TEST_SELECTED_CITY",
      discountType: "Percentage",
      discountValue: 15,
      maxDiscount: 500,
      applicableService: "Machine",
      applicableCategories: ["Tractor"],
      applicableLocations: ["Noida", "Greater Noida"],
      userEligibility: "All",
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    // Test 2.1: Valid for booking in Noida
    const valTargetNoida = await validateOffer({
      code: "TEST_SELECTED_CITY",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "Village Chhapraula, Noida, Gautam Buddha Nagar",
    });
    assert(valTargetNoida.isValid === true, "Targeted offer validates for booking in Noida");

    // Test 2.2: Valid for booking in Greater Noida
    const valTargetGN = await validateOffer({
      code: "TEST_SELECTED_CITY",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "Alpha 1, Greater Noida",
    });
    assert(valTargetGN.isValid === true, "Targeted offer validates for booking in Greater Noida");

    // Test 2.3: Rejected for booking in Lucknow / outside selected cities
    const valTargetLucknow = await validateOffer({
      code: "TEST_SELECTED_CITY",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      location: "Hazratganj, Lucknow, Uttar Pradesh",
    });
    assert(
      valTargetLucknow.isValid === false &&
      valTargetLucknow.reason.includes("restricted to specific regions"),
      "Targeted offer is correctly rejected for booking outside selected cities with helpful message"
    );

    // 3. User Eligibility independent of Geographic Scope
    console.log("\n--- TEST SCENARIO 3: User Eligibility vs Geographic Scope Independence ---");
    const newUserOffer = await Offer.create({
      title: "First Booking Welcome Promo",
      description: "Only for new users, but open to All Locations",
      code: "TEST_NEW_USER_LOC",
      discountType: "Flat",
      discountValue: 150,
      applicableService: "Machine",
      applicableCategories: ["Tractor"],
      applicableLocations: [], // All locations
      userEligibility: "New Users",
      firstBookingOnly: true,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    const mockNewUserId = new mongoose.Types.ObjectId();
    const mockNewUser = { _id: mockNewUserId, name: "Ramesh Farmer", role: "Farmer" };

    // Test 3.1: New user (0 bookings) in any location succeeds
    const valNewUser = await validateOffer({
      code: "TEST_NEW_USER_LOC",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      user: mockNewUser,
      location: "Mathura, Uttar Pradesh",
    });
    assert(valNewUser.isValid === true, "New user in Mathura passes eligibility on universal offer");

    // Test 3.2: Existing user (with 1 existing booking) in same location fails user eligibility
    const mockExistingUserId = new mongoose.Types.ObjectId();
    const mockExistingUser = { _id: mockExistingUserId, name: "Suresh Farmer", role: "Farmer" };
    
    // Create a mock past booking for Suresh
    const pastBooking = await Booking.create({
      farmerId: mockExistingUserId,
      customer: mockExistingUserId,
      owner: new mongoose.Types.ObjectId(),
      itemId: new mongoose.Types.ObjectId(),
      requestType: "Machine",
      customerName: "Suresh Farmer",
      customerPhone: "9876543210",
      customerLocation: "Mathura, Uttar Pradesh",
      workType: "Ploughing",
      landArea: 2,
      basePrice: 1500,
      totalPrice: 1500,
      originalPrice: 1500,
      finalPrice: 1500,
      requiredDate: new Date(),
      status: "Completed",
      totalAmount: 1500,
    });

    const valExistingUser = await validateOffer({
      code: "TEST_NEW_USER_LOC",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2000,
      user: mockExistingUser,
      location: "Mathura, Uttar Pradesh",
    });
    assert(
      valExistingUser.isValid === false &&
      valExistingUser.reason.includes("first platform booking"),
      "Existing user is rejected based on user eligibility, independent of geographic location"
    );

    // Clean up mock booking
    await Booking.deleteOne({ _id: pastBooking._id });

    // 4. Mandatory Pricing Invariants & Driver Payout Protection
    console.log("\n--- TEST SCENARIO 4: Mandatory Charges & Driver Payout Invariants ---");
    // Small land area (e.g. 1.5 bigha) has mandatory surcharge
    const smallLandCharge = getSmallLandExtraCharge(1.5);
    assert(smallLandCharge > 0, `Small land extra charge is calculated: ₹${smallLandCharge}`);

    const baseAmount = 1000;
    const finalPricing = calculateFinalPrice({
      baseServicePrice: baseAmount,
      mandatoryCharges: smallLandCharge,
      offer: allLocOffer,
    });

    assert(
      finalPricing.actualDiscount === 200,
      `Discount (₹${finalPricing.actualDiscount}) is applied only to base service amount`
    );
    assert(
      finalPricing.mandatoryNonDiscountableCharges === smallLandCharge,
      `Mandatory small land charge (₹${finalPricing.mandatoryNonDiscountableCharges}) is fully preserved`
    );
    assert(
      finalPricing.finalPayableAmount === (baseAmount - 200) + smallLandCharge,
      `Final payable equals discounted base + full mandatory charges (₹${finalPricing.finalPayableAmount})`
    );

    console.log("\n=================================================");
    console.log(`TOTAL PASSED: ${passed}`);
    console.log(`TOTAL FAILED: ${failed}`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    process.exit(1);
  } finally {
    await Offer.deleteMany({ code: { $in: cleanupCodes } });
    await mongoose.disconnect();
  }
}

runTests();
