/**
 * PHASE 5 VERIFICATION TEST SUITE
 * Tests Booking & Pricing Integration with Offer Validation, Mandatory Precedence, and Usage Counters
 */

const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

require("dotenv").config({ path: "c:/CODING.FILES/Project-WorkShetu/Backend/.env" });
const mongoose = require("mongoose");
const Offer = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Offer.js");
const User = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Owner.js");
const Machine = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/ListingMachin.js");
const Booking = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/BookingMachine.js");
const { getSmallLandExtraCharge, getSinglePrice } = require("c:/CODING.FILES/Project-WorkShetu/Backend/utils/groupBooking.js");
const { validateOffer, calculateFinalPrice } = require("c:/CODING.FILES/Project-WorkShetu/Backend/utils/pricingEngine.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("=================================================");
  console.log("   PHASE 5: BOOKING & PRICING INTEGRATION TESTS  ");
  console.log("=================================================\n");

  await mongoose.connect(MONGO_URI);
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

  let testOffer = null;
  let testMachine = null;
  let testUser = null;
  let createdBookingId = null;

  try {
    // 1. Setup mock records
    console.log("--- 1. Setting up Test Records ---");
    await Offer.deleteMany({ code: "TEST_P5_PROMO" });

    testOffer = await Offer.create({
      title: "Phase 5 Special Tractor Promo",
      description: "Flat ₹300 discount on tractor bookings",
      code: "TEST_P5_PROMO",
      discountType: "Flat",
      discountValue: 300,
      applicableService: "Machine",
      applicableCategories: ["Tractor"],
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      totalUsageLimit: 50,
      usedCount: 0,
      isActive: true,
      status: "Active"
    });
    assert(testOffer && testOffer._id, "Test promotion created in database");

    // Fetch or create mock customer and machine
    let farmer = await User.findOne({ role: "Farmer" });
    if (!farmer) {
      farmer = await User.create({
        fullName: "Test Farmer",
        email: "testfarmer_p5@example.com",
        phone: "9876543210",
        role: "Farmer",
        location: "Pune",
      });
    }

    let driver = await User.findOne({ role: "Driver" });
    if (!driver) {
      driver = await User.create({
        fullName: "Test Driver",
        email: "testdriver_p5@example.com",
        phone: "9876543211",
        role: "Driver",
        location: "Pune",
      });
    }

    testMachine = await Machine.findOne({ category: "Tractor" });
    if (!testMachine) {
      testMachine = await Machine.create({
        title: "Test Mahindra Tractor 575",
        category: "Tractor",
        price: 800,
        owner: driver._id,
        location: "Pune",
      });
    }
    assert(farmer && testMachine, "Farmer and Machine entities available for booking");

    // 2. Perform End-to-End Booking Simulation with Offer Validation
    console.log("\n--- 2. Booking Creation with Authoritative Offer Validation ---");

    const landArea = 3; // < 5 Bigha -> ₹200 mandatory surcharge
    const singlePrice = getSinglePrice(testMachine.price, landArea);
    // Base: 3 * 800 = 2400. Surcharge: 200.
    assert(singlePrice.basePrice === 2400, "Base price calculated correctly as ₹2,400");
    assert(singlePrice.extraCharge === 200, "Mandatory smallholding surcharge is ₹200");

    // Validate offer against booking parameters
    const offerValidation = await validateOffer({
      code: "TEST_P5_PROMO",
      offer: null, // Test DB resolution by code
      user: farmer,
      requestType: "Machine",
      category: testMachine.category,
      basePrice: singlePrice.basePrice,
      landArea,
      location: farmer.location || "Pune",
      bookingType: "Single"
    });
    assert(offerValidation.isValid, "Offer successfully validated for booking");

    // Authoritative calculation
    const quote = calculateFinalPrice({
      baseServicePrice: singlePrice.basePrice,
      mandatoryCharges: singlePrice.extraCharge,
      otherCharges: 0,
      offer: offerValidation.offer
    });

    assert(quote.actualDiscount === 300, `Actual discount is ₹300 (Got: ₹${quote.actualDiscount})`);
    assert(quote.mandatoryNonDiscountableCharges === 200, `Mandatory charges remain intact at ₹200 (Got: ₹${quote.mandatoryNonDiscountableCharges})`);
    assert(quote.finalPayableAmount === 2300, `Final payable is ₹2,300 (2400 - 300 + 200) (Got: ₹${quote.finalPayableAmount})`);

    // Create Booking Document
    const createdBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: testMachine._id,
      owner: testMachine.owner,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location || "Pune",
      landArea: 3,
      areaUnit: "Bigha",
      workType: "Ploughing",
      requiredDate: new Date(),
      bookingDate: new Date(),
      basePrice: quote.baseServicePrice,
      extraCharge: quote.mandatoryNonDiscountableCharges,
      discountPercent: quote.discountPercent,
      discountAmount: quote.actualDiscount,
      originalPrice: quote.baseServicePrice + quote.mandatoryNonDiscountableCharges,
      finalPrice: quote.finalPayableAmount,
      totalPrice: quote.finalPayableAmount,
      offerId: offerValidation.offer._id,
      offerCode: offerValidation.offer.code,
      offerTitle: offerValidation.offer.title,
      offerDiscount: quote.actualDiscount,
      message: "Test Phase 5 Booking"
    });

    createdBookingId = createdBooking._id;
    assert(createdBooking && createdBooking._id, "Booking document successfully stored in database");

    // 3. Verify Stored Booking Data
    console.log("\n--- 3. Verifying Stored Booking Attributes ---");
    const retrievedBooking = await Booking.findById(createdBookingId);
    assert(retrievedBooking.offerCode === "TEST_P5_PROMO", `offerCode stored properly (Got: ${retrievedBooking.offerCode})`);
    assert(retrievedBooking.offerId.toString() === testOffer._id.toString(), "offerId stored and matches Offer ObjectId");
    assert(retrievedBooking.offerDiscount === 300, `offerDiscount recorded as ₹300 (Got: ₹${retrievedBooking.offerDiscount})`);
    assert(retrievedBooking.finalPrice === 2300, `finalPrice matches expected ₹2,300 (Got: ₹${retrievedBooking.finalPrice})`);
    assert(retrievedBooking.extraCharge === 200, `Mandatory charge recorded as ₹200 (Got: ₹${retrievedBooking.extraCharge})`);

    // 4. Update Offer Usage Statistics Atomically
    console.log("\n--- 4. Verifying Offer Usage Statistics Update ---");
    await Offer.findByIdAndUpdate(testOffer._id, { $inc: { usedCount: 1 } });
    const updatedOffer = await Offer.findById(testOffer._id);
    assert(updatedOffer.usedCount === 1, `Offer usedCount successfully incremented to 1 (Got: ${updatedOffer.usedCount})`);

    // 5. Test Invalid/Expired Code During Booking
    console.log("\n--- 5. Verifying Booking Rejection for Invalid/Expired Offers ---");
    const invalidValidation = await validateOffer({
      code: "NON_EXISTENT_PROMO_999",
      requestType: "Machine",
      basePrice: 2400
    });
    assert(!invalidValidation.isValid, "Non-existent coupon code correctly rejected");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup
    if (createdBookingId) {
      await Booking.findByIdAndDelete(createdBookingId);
    }
    if (testOffer?._id) {
      await Offer.findByIdAndDelete(testOffer._id);
    }
    await mongoose.disconnect();

    console.log("\n=================================================");
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("=================================================");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

