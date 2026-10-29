/**
 * PHASE 7 SECURITY & COMPREHENSIVE REGRESSION TEST SUITE
 * Validates Security Controls, Mathematical Pricing Invariants, Authorization, and Non-Regression
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Offer = require("./models/Offer.js");
const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const { validateOffer, calculateFinalPrice } = require("./utils/pricingEngine.js");
const { getSmallLandExtraCharge, getSinglePrice, getGroupMemberPrice, recalculateGroup } = require("./utils/groupBooking.js");
const { isLoggedIn, isAdmin } = require("./middleware/auth.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("==================================================================");
  console.log("   PHASE 7: SECURITY & COMPREHENSIVE REGRESSION VERIFICATION      ");
  console.log("==================================================================\n");

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

  try {
    // ------------------------------------------------------------------
    // TEST SECTION 1: SECURITY & AUTHORIZATION GUARDS
    // ------------------------------------------------------------------
    console.log("--- 1. Security & Authorization Guards ---");

    // 1.1 Unauthenticated access to admin routes
    const unauthReq = { isAuthenticated: () => false, user: null };
    let unauthPassed = false;
    const resUnauth = {
      status: (code) => ({
        json: (data) => {
          if (code === 401) unauthPassed = true;
        },
      }),
    };
    isLoggedIn(unauthReq, resUnauth, () => { unauthPassed = false; });
    assert(unauthPassed, "Unauthenticated request correctly rejected with 401 Unauthorized");

    // 1.2 Non-admin (Farmer) attempting admin access
    const farmerReq = {
      isAuthenticated: () => true,
      user: { role: "Farmer", isAdmin: false, isActive: true },
    };
    let nonAdminBlocked = false;
    const resForbidden = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) nonAdminBlocked = true;
        },
      }),
    };
    isAdmin(farmerReq, resForbidden, () => { nonAdminBlocked = false; });
    assert(nonAdminBlocked, "Non-admin farmer request blocked from admin actions with 403 Forbidden");

    // 1.3 Admin access allowed
    const adminReq = {
      isAuthenticated: () => true,
      user: { role: "Admin", isAdmin: true, isActive: true },
    };
    let adminAllowed = false;
    isAdmin(adminReq, resForbidden, () => { adminAllowed = true; });
    assert(adminAllowed, "Verified admin user correctly authorized for admin operations");

    // ------------------------------------------------------------------
    // TEST SECTION 2: MATHEMATICAL INVARIANTS & TAMPERING PREVENTION
    // ------------------------------------------------------------------
    console.log("\n--- 2. Mathematical Invariants & Anti-Tampering ---");

    // Invariant A: Final payable is never negative
    const excessiveQuote = calculateFinalPrice({
      baseServicePrice: 200,
      mandatoryCharges: 100,
      otherCharges: 0,
      offer: { discountType: "Flat", discountValue: 5000, maxDiscount: null },
    });
    assert(excessiveQuote.actualDiscount === 200, `Discount capped strictly at base service price (Got: ₹${excessiveQuote.actualDiscount}, Expected: 200)`);
    assert(excessiveQuote.finalPayableAmount === 100, `Final payable is never negative; mandatory charge remains ₹100 (Got: ₹${excessiveQuote.finalPayableAmount})`);
    assert(excessiveQuote.finalPayableAmount >= 0, "Invariant guaranteed: finalPayableAmount >= 0");

    // Invariant B: Negative discount input handled safely
    const negativeQuote = calculateFinalPrice({
      baseServicePrice: 1000,
      mandatoryCharges: 200,
      otherCharges: 0,
      offer: { discountType: "Flat", discountValue: -500 },
    });
    assert(negativeQuote.actualDiscount === 0, `Negative discount rejected/clamped to 0 (Got: ₹${negativeQuote.actualDiscount})`);
    assert(negativeQuote.finalPayableAmount === 1200, `Final payable unaffected by negative input (Got: ₹${negativeQuote.finalPayableAmount})`);

    // Invariant C: Mandatory smallholding charges remain completely non-discountable
    // 2 Bigha land area: missing = 3. First 2 missing @ 100 = 200. Next 1 missing @ 150 = 150. Total = 350.
    const chargeFor2Bigha = getSmallLandExtraCharge(2);
    assert(chargeFor2Bigha === 350, `Mandatory smallholding surcharge for 2 Bigha is ₹350 (Got: ₹${chargeFor2Bigha})`);

    const smallholdingQuote = calculateFinalPrice({
      baseServicePrice: 1600, // 2 Bigha * 800
      mandatoryCharges: chargeFor2Bigha,
      offer: { discountType: "Percentage", discountValue: 50 }, // 50% discount on base
    });
    assert(smallholdingQuote.actualDiscount === 800, `Discount applied ONLY to base ₹1,600 (Got: ₹${smallholdingQuote.actualDiscount})`);
    assert(smallholdingQuote.mandatoryNonDiscountableCharges === 350, `Mandatory surcharge intact at ₹350 (Got: ₹${smallholdingQuote.mandatoryNonDiscountableCharges})`);
    assert(smallholdingQuote.finalPayableAmount === 1150, `Final payable = 1600 - 800 + 350 = ₹1,150 (Got: ₹${smallholdingQuote.finalPayableAmount})`);

    // ------------------------------------------------------------------
    // TEST SECTION 3: EXPLOIT & ABUSE PREVENTION
    // ------------------------------------------------------------------
    console.log("\n--- 3. Exploit & Abuse Prevention ---");

    // 3.1 Expired offer exploitation
    const expiredVal = await validateOffer({
      offer: {
        isActive: true,
        status: "Active",
        startDate: new Date(Date.now() - 10 * 86400000),
        endDate: new Date(Date.now() - 86400000), // Expired yesterday
      },
      basePrice: 2000,
    });
    assert(!expiredVal.isValid, "Expired promotion exploitation blocked");

    // 3.2 Total redemption limit bypass
    const limitVal = await validateOffer({
      offer: {
        isActive: true,
        status: "Active",
        totalUsageLimit: 10,
        usedCount: 10, // Full
      },
      basePrice: 2000,
    });
    assert(!limitVal.isValid, "Redemption limit bypass blocked");

    // 3.3 Category mismatch bypass (Attempt to use tractor discount on Harvester)
    const catVal = await validateOffer({
      offer: {
        isActive: true,
        status: "Active",
        applicableCategories: ["Tractor"],
      },
      category: "Harvester",
      basePrice: 5000,
    });
    assert(!catVal.isValid, "Category mismatch exploitation blocked");

    // 3.4 Service mismatch bypass (Attempt to use Machine discount on Labour)
    const srvVal = await validateOffer({
      offer: {
        isActive: true,
        status: "Active",
        applicableService: "Machine",
      },
      requestType: "Labour",
      basePrice: 500,
    });
    assert(!srvVal.isValid, "Service mismatch exploitation blocked");

    // ------------------------------------------------------------------
    // TEST SECTION 4: REGRESSION TESTING (EXISTING PLATFORM LOGIC)
    // ------------------------------------------------------------------
    console.log("\n--- 4. Existing Platform Flow Regression Tests ---");

    // 4.1 Standard Booking without Promo Code
    const standardSingle = getSinglePrice(800, 4); // 4 Bigha: base 3200, small land surcharge 100
    assert(standardSingle.basePrice === 3200, "Normal booking: Base price computed accurately as ₹3,200");
    assert(standardSingle.extraCharge === 100, "Normal booking: Small land charge computed accurately as ₹100");
    assert(standardSingle.finalPrice === 3300, "Normal booking: Final price computed accurately as ₹3,300");
    assert(standardSingle.discountAmount === 0, "Normal booking: Zero discount amount");

    // 4.2 Group Booking Member Pricing
    const memberPrice = getGroupMemberPrice(800, 3);
    assert(memberPrice.basePrice === 2400, "Group member pricing: Base price ₹2,400");
    assert(memberPrice.extraCharge === 0, "Group member pricing: Extra charge waived (pooling benefit)");

    // 4.3 Group Booking Recalculation
    const mockGroup = {
      groupDiscountPercent: 10,
      members: [
        { landArea: 3, originalPrice: 2400 },
        { landArea: 2, originalPrice: 1600 },
      ],
    };
    recalculateGroup(mockGroup);
    assert(mockGroup.totalLandArea === 5, "Group pooling: Total land area is 5 Bigha");
    assert(mockGroup.totalOriginalPrice === 4000, "Group pooling: Total original price is ₹4,000");
    assert(mockGroup.totalDiscount === 400, "Group pooling: Total 10% pooling discount is ₹400");
    assert(mockGroup.totalFinalPrice === 3600, "Group pooling: Total payable is ₹3,600");

    // 4.4 Booking Machine Schema Integrity
    const bookingPaths = Booking.schema.paths;
    assert(Boolean(bookingPaths["offerId"]), "Booking schema maintains 'offerId'");
    assert(Boolean(bookingPaths["offerCode"]), "Booking schema maintains 'offerCode'");
    assert(Boolean(bookingPaths["offerDiscount"]), "Booking schema maintains 'offerDiscount'");
    assert(Boolean(bookingPaths["basePrice"]), "Booking schema backward compatibility: 'basePrice' present");
    assert(Boolean(bookingPaths["extraCharge"]), "Booking schema backward compatibility: 'extraCharge' present");
    assert(Boolean(bookingPaths["finalPrice"]), "Booking schema backward compatibility: 'finalPrice' present");
    assert(Boolean(bookingPaths["totalPrice"]), "Booking schema backward compatibility: 'totalPrice' present");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    await mongoose.disconnect();

    console.log("\n==================================================================");
    console.log(`TOTAL SECURITY & REGRESSION TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});

