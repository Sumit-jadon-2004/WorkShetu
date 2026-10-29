const assert = require("assert");
const {
  toolDefinitions,
  normalizeRole,
  getToolsForRole,
  executeTool,
  createPendingAction,
  getPendingAction,
  discardPendingAction
} = require("./utils/aiToolRegistry.js");
const { detectIntent } = require("./utils/aiIntent.js");
const { buildAssistantSystemPrompt } = require("./utils/aiPrompt.js");
const { getRelevantKnowledge } = require("./utils/projectKnowledge.js");
const { getSmallLandExtraCharge, calculateFinalPrice } = require("./utils/pricingEngine.js");

async function runTests() {
  console.log("==========================================");
  console.log("WORKSHETU AI CO-PILOT FULL TEST SUITE");
  console.log("==========================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`PASS [${total}]: ${name}`);
    } catch (err) {
      console.error(`FAIL [${total}]: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`PASS [${total}]: ${name}`);
    } catch (err) {
      console.error(`FAIL [${total}]: ${name}`);
      console.error(err);
      process.exit(1);
    }
  }

  // 1. Role Normalization
  test("Role Normalization: Admin, Driver, Farmer normalization", () => {
    assert.strictEqual(normalizeRole({ isAdmin: true, role: "Farmer" }), "Admin");
    assert.strictEqual(normalizeRole({ role: "admin" }), "Admin");
    assert.strictEqual(normalizeRole({ role: "Admin" }), "Admin");
    assert.strictEqual(normalizeRole({ role: "Driver" }), "Driver");
    assert.strictEqual(normalizeRole({ role: "Farmer" }), "Farmer");
    assert.strictEqual(normalizeRole(null), "Farmer");
  });

  // 2. Role Tool Scoping
  test("Role Tool Scoping: Farmer tools contain search & bookings, but no admin or driver write tools", () => {
    const farmerTools = getToolsForRole("Farmer").map((t) => t.function.name);
    assert.ok(farmerTools.includes("searchMachines"));
    assert.ok(farmerTools.includes("getMyBookings"));
    assert.ok(farmerTools.includes("calculateBookingPrice"));
    assert.ok(!farmerTools.includes("manageDriverStatus"), "Farmer must not have manageDriverStatus");
    assert.ok(!farmerTools.includes("respondToBookingRequest"), "Farmer must not have respondToBookingRequest");
    assert.ok(!farmerTools.includes("getAdminDashboardStats"), "Farmer must not have getAdminDashboardStats");
  });

  test("Role Tool Scoping: Driver tools contain driver requests, listings, earnings, and completion OTP", () => {
    const driverTools = getToolsForRole("Driver").map((t) => t.function.name);
    assert.ok(driverTools.includes("getDriverRequests"));
    assert.ok(driverTools.includes("getMyListings"));
    assert.ok(driverTools.includes("getMyEarnings"));
    assert.ok(driverTools.includes("respondToBookingRequest"));
    assert.ok(driverTools.includes("verifyBookingCompletion"));
    assert.ok(!driverTools.includes("manageDriverStatus"), "Driver must not have manageDriverStatus");
    assert.ok(!driverTools.includes("getAdminDashboardStats"), "Driver must not have getAdminDashboardStats");
  });

  test("Role Tool Scoping: Admin tools contain admin metrics, driver moderation, complaints, and offers", () => {
    const adminTools = getToolsForRole("Admin").map((t) => t.function.name);
    assert.ok(adminTools.includes("getAdminDashboardStats"));
    assert.ok(adminTools.includes("getDriverApplications"));
    assert.ok(adminTools.includes("manageDriverStatus"));
    assert.ok(adminTools.includes("getPlatformBookings"));
    assert.ok(adminTools.includes("getOfferAnalytics"));
    assert.ok(adminTools.includes("getPlatformComplaints"));
  });

  // 3. Security Role Isolation in executeTool
  await testAsync("Security: Farmer attempting to execute admin tool is denied", async () => {
    const farmerUser = { _id: "60c72b2f9b1d8b001c8d0001", role: "Farmer", isAdmin: false };
    const res = await executeTool("manageDriverStatus", { driverId: "60c72b2f9b1d8b001c8d0002", action: "approve" }, farmerUser);
    assert.ok(res.error && res.error.includes("Permission denied"), `Expected error, got: ${JSON.stringify(res)}`);
  });

  await testAsync("Security: Driver attempting to execute admin tool is denied", async () => {
    const driverUser = { _id: "60c72b2f9b1d8b001c8d0003", role: "Driver", isAdmin: false };
    const res = await executeTool("getAdminDashboardStats", {}, driverUser);
    assert.ok(res.error && res.error.includes("Permission denied"), `Expected error, got: ${JSON.stringify(res)}`);
  });

  // 4. Two-Step Action Confirmation Lifecycle
  test("Action Confirmation: Pending action is stored and retrievable within TTL", () => {
    const action = createPendingAction({
      userId: "60c72b2f9b1d8b001c8d0001",
      role: "Driver",
      actionType: "respondToBookingRequest",
      params: { bookingId: "60c72b2f9b1d8b001c8d0099", decision: "accept" },
      summary: "Accept booking #60c72b2f9b1d8b001c8d0099"
    });
    assert.ok(action.actionId.startsWith("act_"));

    const fetched = getPendingAction(action.actionId, "60c72b2f9b1d8b001c8d0001");
    assert.ok(fetched);
    assert.strictEqual(fetched.actionType, "respondToBookingRequest");

    // Impersonation check: another user cannot fetch this action
    const unauthorized = getPendingAction(action.actionId, "60c72b2f9b1d8b001c8d9999");
    assert.strictEqual(unauthorized, null);

    // Discarding works
    const discarded = discardPendingAction(action.actionId, "60c72b2f9b1d8b001c8d0001");
    assert.strictEqual(discarded, true);
    assert.strictEqual(getPendingAction(action.actionId, "60c72b2f9b1d8b001c8d0001"), null);
  });

  // 5. Pricing Invariants: Small-Land Surcharge & Platform-Funded Discounts
  test("Pricing Invariant: Land < 5 Bigha calculates mandatory small-land surcharge", () => {
    // 1 Bigha plot: missing 4 Bigha -> (2 * 100) + (2 * 150) = ₹500
    const charge1Bigha = getSmallLandExtraCharge(1);
    assert.strictEqual(charge1Bigha, 500, `Expected 500, got ${charge1Bigha}`);

    // 5 Bigha plot: threshold met -> ₹0 extra charge
    const charge5Bigha = getSmallLandExtraCharge(5);
    assert.strictEqual(charge5Bigha, 0, `Expected 0, got ${charge5Bigha}`);

    // 10 Bigha plot: above threshold -> ₹0 extra charge
    const charge10Bigha = getSmallLandExtraCharge(10);
    assert.strictEqual(charge10Bigha, 0, `Expected 0, got ${charge10Bigha}`);
  });

  test("Pricing Invariant: WorkShetu promotional discount NEVER reduces driver payout", () => {
    const baseServicePrice = 1000;
    const mandatoryCharges = 500; // Small land surcharge
    const mockOffer = {
      code: "FARMER50",
      title: "50% Off Kharif Promo",
      discountType: "Percentage",
      discountValue: 50,
      fundingSource: "WorkShetu"
    };

    const quote = calculateFinalPrice({
      baseServicePrice,
      mandatoryCharges,
      offer: mockOffer
    });

    // 50% discount on base 1000 = 500 discount
    assert.strictEqual(quote.actualDiscount, 500);
    // Farmer pays: base (1000) - discount (500) + mandatory (500) = 1000
    assert.strictEqual(quote.farmerPayable, 1000);
    // Driver receives full agreed payout: base (1000) + mandatory (500) = 1500 (ZERO REDUCTION)
    assert.strictEqual(quote.driverPayout, 1500);
    assert.strictEqual(quote.driverPayoutReduction, 0);
    assert.strictEqual(quote.platformPromoExpense, 500);
  });

  // 6. Intent Detection across Roles
  test("Intent Detection: Driver inquiries detect driver intents", () => {
    const driverUser = { role: "Driver" };
    const resReq = detectIntent("meri incoming requests dikhao", [], driverUser);
    assert.strictEqual(resReq.type, "driver_requests");

    const resEarn = detectIntent("meri total kamai aur payout kitna hai", [], driverUser);
    assert.strictEqual(resEarn.type, "driver_earnings");

    const resList = detectIntent("meri registered machines aur listings dikhao", [], driverUser);
    assert.strictEqual(resList.type, "driver_listings");

    const resStat = detectIntent("mera driver approval status kya hai", [], driverUser);
    assert.strictEqual(resStat.type, "driver_status");
  });

  test("Intent Detection: Admin inquiries detect admin intents", () => {
    const adminUser = { isAdmin: true };
    const resStats = detectIntent("platform dashboard stats overview dikhao", [], adminUser);
    assert.strictEqual(resStats.type, "admin_stats");

    const resApps = detectIntent("pending driver applications dikhao", [], adminUser);
    assert.strictEqual(resApps.type, "admin_driver_applications");

    const resBookings = detectIntent("all platform bookings dikhao", [], adminUser);
    assert.strictEqual(resBookings.type, "admin_bookings");

    const resComplaints = detectIntent("open disputes and complaints", [], adminUser);
    assert.strictEqual(resComplaints.type, "admin_complaints");

    const resOffers = detectIntent("offers budget spent summary", [], adminUser);
    assert.strictEqual(resOffers.type, "admin_offers");
  });

  test("Intent Detection: Farmer inquiries detect farmer intents & greetings remain general", () => {
    const farmerUser = { role: "Farmer" };
    const resGreet = detectIntent("नमस्ते", [], farmerUser);
    assert.strictEqual(resGreet.type, "general");

    const resOffers = detectIntent("kya koi discount offers ya coupons available hain", [], farmerUser);
    assert.strictEqual(resOffers.type, "farmer_offers");

    const resCalc = detectIntent("8 bigha ke liye kiraya calculate karo", [], farmerUser);
    assert.strictEqual(resCalc.type, "price_calculation");
  });

  // 7. System Prompt & Knowledge Tailoring
  test("System Prompt: Adapts persona to authenticated role", () => {
    const currentDate = "2026-10-11";

    const farmerPrompt = buildAssistantSystemPrompt({ language: "Hindi", role: "Farmer", currentDate });
    assert.ok(farmerPrompt.includes("WorkShetu Sahayak"));
    assert.ok(farmerPrompt.includes("किसान"));

    const driverPrompt = buildAssistantSystemPrompt({ language: "Hinglish", role: "Driver", currentDate });
    assert.ok(driverPrompt.includes("WorkShetu Driver Co-Pilot") || driverPrompt.includes("सारथी"));
    assert.ok(driverPrompt.includes("Completion OTP"));

    const adminPrompt = buildAssistantSystemPrompt({ language: "English", role: "Admin", currentDate });
    assert.ok(adminPrompt.includes("WorkShetu Admin Co-Pilot") || adminPrompt.includes("administrative"));
  });

  console.log("\n==========================================");
  console.log(`ALL ${passed}/${total} AI CO-PILOT TESTS PASSED SUCCESSFULLY!`);
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

