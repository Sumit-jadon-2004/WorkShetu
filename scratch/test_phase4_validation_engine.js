/**
 * PHASE 4 VERIFICATION TEST SUITE
 * Tests the Authoritative Offer Validation Engine & Pricing Calculation Precedence
 */

const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

require("dotenv").config({ path: "c:/CODING.FILES/Project-WorkShetu/Backend/.env" });
const mongoose = require("mongoose");
const Offer = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Offer.js");
const User = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Owner.js");
const Booking = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/BookingMachine.js");
const publicOffersRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/publicOffers.js");
const { validateOffer, calculateFinalPrice, getSmallLandExtraCharge } = require("c:/CODING.FILES/Project-WorkShetu/Backend/utils/pricingEngine.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("=================================================");
  console.log("   PHASE 4: OFFER VALIDATION ENGINE TEST SUITE   ");
  console.log("=================================================\n");

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

  // ------------------------------------------------------------------
  // TEST SECTION 1: CONCRETE WORKSHETU PRICING EXAMPLES (SECTION 12)
  // ------------------------------------------------------------------
  console.log("--- SECTION 1: Concrete Pricing Engine Precedence ---");

  // Example A: Flat discount with small land mandatory charge
  // Base: 3 Bigha * 800 = 2400. Mandatory surcharge for 3 Bigha (<5): 2 * 100 = 200.
  const flatOffer = {
    discountType: "Flat",
    discountValue: 200,
    maxDiscount: null,
  };
  const extraA = getSmallLandExtraCharge(3);
  assert(extraA === 200, `Small land surcharge for 3 Bigha is ₹200 (Got: ₹${extraA})`);

  const quoteA = calculateFinalPrice({
    baseServicePrice: 2400,
    mandatoryCharges: extraA,
    otherCharges: 0,
    offer: flatOffer,
  });
  assert(quoteA.baseServicePrice === 2400, "Example A: Base service price is ₹2,400");
  assert(quoteA.mandatoryNonDiscountableCharges === 200, "Example A: Mandatory charges ₹200 remains non-discountable");
  assert(quoteA.actualDiscount === 200, "Example A: Actual discount is ₹200");
  assert(quoteA.finalPayableAmount === 2400, `Example A: Final payable is ₹2,400 (2400 - 200 + 200) (Got: ₹${quoteA.finalPayableAmount})`);

  // Example B: Percentage discount with no mandatory charge (6 Bigha >= 5)
  // Base: 6 Bigha * 800 = 4800. 10% discount = 480 (cap 500).
  const pctOffer = {
    discountType: "Percentage",
    discountValue: 10,
    maxDiscount: 500,
  };
  const extraB = getSmallLandExtraCharge(6);
  assert(extraB === 0, `Small land surcharge for 6 Bigha is ₹0 (Got: ₹${extraB})`);

  const quoteB = calculateFinalPrice({
    baseServicePrice: 4800,
    mandatoryCharges: extraB,
    otherCharges: 0,
    offer: pctOffer,
  });
  assert(quoteB.actualDiscount === 480, `Example B: Actual discount is ₹480 (Got: ₹${quoteB.actualDiscount})`);
  assert(quoteB.finalPayableAmount === 4320, `Example B: Final payable is ₹4,320 (4800 - 480) (Got: ₹${quoteB.finalPayableAmount})`);

  // Example C: Cap at maximum discount
  // Base: 10 Bigha * 1500 = 15000. 20% discount = 3000, capped at maxDiscount: 1000.
  const cappedOffer = {
    discountType: "Percentage",
    discountValue: 20,
    maxDiscount: 1000,
  };
  const quoteC = calculateFinalPrice({
    baseServicePrice: 15000,
    mandatoryCharges: 0,
    otherCharges: 0,
    offer: cappedOffer,
  });
  assert(quoteC.actualDiscount === 1000, `Example C: Actual discount capped at maxDiscount ₹1,000 (Got: ₹${quoteC.actualDiscount})`);
  assert(quoteC.finalPayableAmount === 14000, `Example C: Final payable is ₹14,000 (15000 - 1000) (Got: ₹${quoteC.finalPayableAmount})`);

  // Example D: Discount exceeds base price (Cannot discount mandatory charge or go negative)
  // Base: 300. Mandatory: 200. Offer: Flat 500.
  // Actual discount should be MIN(500, base 300) = 300. Final payable: (300 - 300) + 200 = 200.
  const megaOffer = {
    discountType: "Flat",
    discountValue: 500,
    maxDiscount: null,
  };
  const quoteD = calculateFinalPrice({
    baseServicePrice: 300,
    mandatoryCharges: 200,
    otherCharges: 0,
    offer: megaOffer,
  });
  assert(quoteD.actualDiscount === 300, `Example D: Actual discount cannot exceed base price (Got: ₹${quoteD.actualDiscount}, Expected: 300)`);
  assert(quoteD.finalPayableAmount === 200, `Example D: Final payable is ₹200 (mandatory charges protected, non-negative) (Got: ₹${quoteD.finalPayableAmount})`);

  // ------------------------------------------------------------------
  // TEST SECTION 2: VALIDATION ENGINE LOGIC TESTS
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 2: Offer Validation Rules Logic ---");

  // Mock Active Offer
  const now = new Date();
  const validBaseOffer = {
    _id: "6704fa871234567890abcdef",
    title: "Tractor Mega Offer",
    code: "TRACTOR20",
    isActive: true,
    status: "Active",
    discountType: "Percentage",
    discountValue: 20,
    maxDiscount: 500,
    applicableService: "Machine",
    applicableCategories: ["Tractor"],
    minimumBookingAmount: 1000,
    applicableLocations: ["Pune", "Satara"],
    startDate: new Date(now.getTime() - 86400000),
    endDate: new Date(now.getTime() + 86400000),
    totalUsageLimit: 100,
    usedCount: 10,
    groupBookingOnly: false,
    firstBookingOnly: false,
  };

  // 1. Valid Offer Check
  const val1 = await validateOffer({
    offer: { ...validBaseOffer },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune District",
  });
  assert(val1.isValid === true, "Valid tractor offer in Pune is approved");

  // 2. Inactive status
  const valInactive = await validateOffer({
    offer: { ...validBaseOffer, isActive: false },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valInactive.isValid === false, "Inactive offer is rejected");

  // 3. Category Mismatch
  const valCat = await validateOffer({
    offer: { ...validBaseOffer },
    requestType: "Machine",
    category: "Harvester",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valCat.isValid === false, "Category mismatch (Tractor offer on Harvester) is rejected");

  // 4. Service Mismatch
  const valService = await validateOffer({
    offer: { ...validBaseOffer },
    requestType: "Labour",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valService.isValid === false, "Service mismatch (Machine offer on Labour) is rejected");

  // 5. Minimum Booking Amount violation
  const valMin = await validateOffer({
    offer: { ...validBaseOffer, minimumBookingAmount: 3000 },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valMin.isValid === false, "Minimum booking amount violation is rejected");

  // 6. Expired promotion
  const valExp = await validateOffer({
    offer: { ...validBaseOffer, endDate: new Date(now.getTime() - 3600000) },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valExp.isValid === false, "Expired date schedule is rejected");

  // 7. Future promotion (not yet started)
  const valFuture = await validateOffer({
    offer: { ...validBaseOffer, startDate: new Date(now.getTime() + 3600000) },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valFuture.isValid === false, "Future scheduled offer is rejected");

  // 8. Total usage limit reached
  const valLimit = await validateOffer({
    offer: { ...validBaseOffer, totalUsageLimit: 10, usedCount: 10 },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valLimit.isValid === false, "Exhausted total usage limit is rejected");

  // 9. Location restriction
  const valLoc = await validateOffer({
    offer: { ...validBaseOffer },
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Nagpur",
  });
  assert(valLoc.isValid === false, "Unmatched location (Nagpur vs Pune/Satara) is rejected");

  // 10. Group booking restriction
  const valGrp = await validateOffer({
    offer: { ...validBaseOffer, groupBookingOnly: true },
    bookingType: "Single",
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valGrp.isValid === false, "Group booking only offer rejected for Single booking");

  const valGrpOk = await validateOffer({
    offer: { ...validBaseOffer, groupBookingOnly: true },
    bookingType: "Group",
    requestType: "Machine",
    category: "Tractor",
    basePrice: 2000,
    location: "Pune",
  });
  assert(valGrpOk.isValid === true, "Group booking only offer approved for Group booking");

  // ------------------------------------------------------------------
  // TEST SECTION 3: ROUTE REGISTRATION AUDIT
  // ------------------------------------------------------------------
  console.log("\n--- SECTION 3: Route Registration Audit ---");
  const routes = publicOffersRouter.stack
    .filter((r) => r.route)
    .map((r) => `${Object.keys(r.route.methods).map(m => m.toUpperCase()).join(", ")} ${r.route.path}`);

  console.log("Registered routes in publicOffers router:", routes);
  assert(routes.includes("GET /active"), "GET /active route registered");
  assert(routes.includes("POST /validate"), "POST /validate route registered");

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL TEST ERROR:", err);
  process.exit(1);
});
