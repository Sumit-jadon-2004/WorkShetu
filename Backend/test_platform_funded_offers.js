/**
 * WorkShetu: Platform-Funded Offers, Protected Driver Payouts & Smart Location Restrictions
 * Comprehensive Verification Test Suite
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Offer = require("./models/Offer.js");
const Booking = require("./models/BookingMachine.js");
const User = require("./models/Owner.js");
const { getSmallLandExtraCharge } = require("./utils/groupBooking.js");
const { validateOffer, calculateFinalPrice } = require("./utils/pricingEngine.js");
const { releaseOfferBudget } = require("./routes/groupBookings.js");
const { seedFirstBookingOffer } = require("./utils/seedOffers.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("======================================================================");
  console.log("  WORKSHETU: PLATFORM-FUNDED OFFERS & PROTECTED DRIVER PAYOUT TESTS   ");
  console.log("======================================================================\n");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log("Connected to MongoDB successfully.\n");

  await seedFirstBookingOffer();

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

  const cleanupCodes = ["TEST_FIRST50", "TEST_BUDGET_PAUSE", "TEST_NATIONWIDE", "TEST_CITY_TARGET"];

  try {
    await Offer.deleteMany({ code: { $in: cleanupCodes } });

    // --------------------------------------------------------------------------------------
    // 1. Core Financial Invariant: Platform Expense, Driver Protected Payout, Farmer Payable
    // --------------------------------------------------------------------------------------
    console.log("--- TEST 1: Protected Driver Payout & WorkShetu Promotional Expense Invariant ---");

    const promoOffer = await Offer.create({
      title: "Test WorkShetu Promotion",
      code: "TEST_FIRST50",
      discountType: "Percentage",
      discountValue: 10,
      maxDiscount: 50,
      minimumBookingAmount: 500,
      fundingSource: "WorkShetu",
      campaignBudget: 2000,
      budgetSpent: 0,
      applicableService: "All",
      userEligibility: "All",
      applicableLocations: [],
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    const pricing1 = calculateFinalPrice({
      basePrice: 1000,
      offer: promoOffer,
    });

    assert(pricing1.farmerPayable === 950, `Farmer payable is ₹950 (received ₹50 discount, was ₹1000)`);
    assert(pricing1.discountAmount === 50, `Discount amount is ₹50`);
    assert(pricing1.driverPayout === 1000, `Driver payout is ₹1000 (100% of agreed price, zero deduction)`);
    assert(pricing1.driverPayoutReduction === 0, `Driver payout reduction is strictly ₹0`);
    assert(pricing1.platformPromoExpense === 50, `WorkShetu platform promo expense equals discount (₹50)`);
    assert(pricing1.fundingSource === "WorkShetu", `Funding source is correctly attributed to WorkShetu`);

    // --------------------------------------------------------------------------------------
    // 2. Mandatory Surcharges & Small Holding Fee Preservation (< 5 Bigha)
    // --------------------------------------------------------------------------------------
    console.log("\n--- TEST 2: Preservation of Mandatory Surcharges (< 5 Bigha Small Land Fee) ---");

    const smallLandCharge = getSmallLandExtraCharge(1); // 1 Bigha has 4 missing bigha => 2 * 100 + 2 * 150 = ₹500
    assert(smallLandCharge === 500, `Small holding surcharge for 1 bigha is ₹500`);

    const pricingWithSurcharge = calculateFinalPrice({
      basePrice: 1000,
      mandatorySurcharge: smallLandCharge,
      offer: promoOffer,
    });

    // Original total without discount = 1000 + 500 = 1500
    // Discount on service = 50
    // Farmer payable = 1500 - 50 = 1450
    // Driver payout = 1500 (1000 base + 500 mandatory surcharge, zero deduction)
    assert(pricingWithSurcharge.farmerPayable === 1450, `Farmer payable retains mandatory surcharge (₹1450 = ₹1500 - ₹50)`);
    assert(pricingWithSurcharge.driverPayout === 1500, `Driver payout retains 100% of base + mandatory surcharge (₹1500)`);
    assert(pricingWithSurcharge.driverPayoutReduction === 0, `Driver payout reduction is ₹0 even with surcharge present`);
    assert(pricingWithSurcharge.platformPromoExpense === 50, `Platform promo expense remains ₹50`);

    // --------------------------------------------------------------------------------------
    // 3. First Booking Offer Eligibility (History checks)
    // --------------------------------------------------------------------------------------
    console.log("\n--- TEST 3: First Booking Only Eligibility Validation ---");

    // Create a mock user ID
    const mockNewFarmerId = new mongoose.Types.ObjectId();
    const mockExistingFarmerId = new mongoose.Types.ObjectId();

    // Create a completed booking for existing farmer
    const priorBooking = await Booking.create({
      itemId: new mongoose.Types.ObjectId(),
      owner: new mongoose.Types.ObjectId(),
      customer: mockExistingFarmerId,
      customerName: "Test Farmer",
      customerPhone: "9876543210",
      customerLocation: "Noida",
      landArea: 5,
      workType: "Ploughing",
      requiredDate: new Date(),
      farmerId: mockExistingFarmerId,
      customerId: mockExistingFarmerId,
      requestType: "Machine",
      status: "Completed",
      price: 1500,
      basePrice: 1500,
      originalPrice: 1500,
      finalPrice: 1500,
      totalPrice: 1500,
      totalAmount: 1500,
      hoursRequested: 2,
      bookingDate: new Date(),
    });

    const firstBookingOffer = await Offer.create({
      title: "First Booking Exclusive",
      code: "TEST_FIRST50_EXCL",
      discountType: "Percentage",
      discountValue: 10,
      maxDiscount: 50,
      minimumBookingAmount: 500,
      fundingSource: "WorkShetu",
      firstBookingOnly: true,
      userEligibility: "Farmers",
      applicableLocations: [],
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });
    cleanupCodes.push("TEST_FIRST50_EXCL");

    // Test new farmer (0 completed bookings) -> VALID
    const valNewFarmer = await validateOffer({
      code: "TEST_FIRST50_EXCL",
      user: { _id: mockNewFarmerId, role: "Farmer" },
      basePrice: 800,
    });
    assert(valNewFarmer.isValid === true, `New farmer with 0 prior bookings is eligible for First Booking offer`);

    // Test existing farmer (1 completed booking) -> REJECTED
    const valExistingFarmer = await validateOffer({
      code: "TEST_FIRST50_EXCL",
      user: { _id: mockExistingFarmerId, role: "Farmer" },
      basePrice: 800,
    });
    assert(valExistingFarmer.isValid === false, `Existing farmer with 1 prior booking is rejected for First Booking offer`);
    assert(
      (valExistingFarmer.reason || "").toLowerCase().includes("first") &&
      (valExistingFarmer.reason || "").toLowerCase().includes("booking"),
      `Rejection reason states first booking requirement: "${valExistingFarmer.reason}"`
    );

    // Clean up mock prior booking
    await Booking.findByIdAndDelete(priorBooking._id);

    // --------------------------------------------------------------------------------------
    // 4. Budget Exhaustion, Concurrency & Auto-Pause
    // --------------------------------------------------------------------------------------
    console.log("\n--- TEST 4: Campaign Budget Exhaustion & Auto-Pause Protection ---");

    const limitedBudgetOffer = await Offer.create({
      title: "Budget Capped Campaign",
      code: "TEST_BUDGET_PAUSE",
      discountType: "Flat",
      discountValue: 50,
      campaignBudget: 100, // Budget only allows 2 redemptions of ₹50 each
      budgetSpent: 50,
      applicableService: "All",
      userEligibility: "All",
      applicableLocations: [],
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    // 1st check: ₹50 remaining budget out of ₹100 -> Valid
    const valBeforeExhaust = await validateOffer({
      code: "TEST_BUDGET_PAUSE",
      basePrice: 600,
    });
    assert(valBeforeExhaust.isValid === true, `Offer is valid with ₹50 remaining budget`);

    // Simulate exhausting the budget: budgetSpent = 100
    limitedBudgetOffer.budgetSpent = 100;
    limitedBudgetOffer.status = "Paused";
    await limitedBudgetOffer.save();

    // 2nd check: Budget exhausted -> Auto-paused & Invalid
    const valAfterExhaust = await validateOffer({
      code: "TEST_BUDGET_PAUSE",
      basePrice: 600,
    });
    assert(valAfterExhaust.isValid === false, `Exhausted offer is invalid / auto-paused`);
    assert(
      (valAfterExhaust.reason || "").toLowerCase().includes("budget") ||
      (valAfterExhaust.reason || "").toLowerCase().includes("pause"),
      `Error mentions budget/paused: "${valAfterExhaust.reason}"`
    );

    // 3rd check: releaseOfferBudget restores budget and resumes offer
    await releaseOfferBudget(limitedBudgetOffer._id, 50);
    const restoredOffer = await Offer.findById(limitedBudgetOffer._id);
    assert(restoredOffer.budgetSpent === 50, `Restored offer budgetSpent is reduced back to ₹50`);
    assert(restoredOffer.status === "Active", `Restored offer status is resumed back to "Active"`);

    // --------------------------------------------------------------------------------------
    // 5. Geographic Scope: All Locations (Nationwide) vs Selected Cities
    // --------------------------------------------------------------------------------------
    console.log("\n--- TEST 5: Smart Location Restrictions (All Locations vs Selected Cities) ---");

    const nationwideOffer = await Offer.create({
      title: "Nationwide Offer",
      code: "TEST_NATIONWIDE",
      discountType: "Flat",
      discountValue: 100,
      applicableLocations: [], // All locations
      applicableService: "All",
      userEligibility: "All",
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    const valNationwideInAnyCity = await validateOffer({
      code: "TEST_NATIONWIDE",
      location: "Bareilly, Uttar Pradesh",
      basePrice: 1000,
    });
    assert(valNationwideInAnyCity.isValid === true, `All Locations offer validates in Bareilly`);

    const targetedCityOffer = await Offer.create({
      title: "Bareilly Hub Special",
      code: "TEST_CITY_TARGET",
      discountType: "Flat",
      discountValue: 100,
      applicableLocations: ["Bareilly", "Moradabad"],
      applicableService: "All",
      userEligibility: "All",
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    const valCityMatch = await validateOffer({
      code: "TEST_CITY_TARGET",
      location: "Bareilly rural cluster, UP",
      basePrice: 1000,
    });
    assert(valCityMatch.isValid === true, `Targeted offer validates in Bareilly matching location`);

    const valCityMismatch = await validateOffer({
      code: "TEST_CITY_TARGET",
      location: "Lucknow, Uttar Pradesh",
      basePrice: 1000,
    });
    assert(valCityMismatch.isValid === false, `Targeted offer is rejected outside targeted cities (Lucknow)`);

    // --------------------------------------------------------------------------------------
    // 6. Seed First Booking Offer Verification
    // --------------------------------------------------------------------------------------
    console.log("\n--- TEST 6: Seeded First Booking Offer in Database ---");
    const seededOffer = await Offer.findOne({ code: "FIRST50" });
    assert(Boolean(seededOffer), `Default seeded offer 'FIRST50' exists in the database`);
    if (seededOffer) {
      assert(seededOffer.fundingSource === "WorkShetu", `Seeded offer fundingSource is 'WorkShetu'`);
      assert(seededOffer.discountValue === 10 && seededOffer.maxDiscount === 50, `Seeded offer is 10% off up to ₹50`);
      assert(seededOffer.campaignBudget === 2000, `Seeded offer has campaign budget of ₹2,000`);
      assert(seededOffer.firstBookingOnly === true, `Seeded offer has firstBookingOnly = true`);
      assert(seededOffer.applicableLocations.length === 0, `Seeded offer applies to All Locations (applicableLocations: [])`);
    }

  } finally {
    // Cleanup created test records
    await Offer.deleteMany({ code: { $in: cleanupCodes } });
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB.");
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
