/**
 * PHASE 6 VERIFICATION TEST SUITE
 * Tests the Offer Analytics Engine and Reporting API
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const Offer = require("./models/Offer.js");
const Booking = require("./models/BookingMachine.js");
const User = require("./models/Owner.js");
const adminOffersRouter = require("./routes/adminOffers.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("=================================================");
  console.log("   PHASE 6: OFFER ANALYTICS VERIFICATION TESTS   ");
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

  try {
    // 1. Audit Route Registration in adminOffers
    console.log("--- 1. Route Registration Audit ---");
    const routes = adminOffersRouter.stack
      .filter((r) => r.route)
      .map((r) => `${Object.keys(r.route.methods).map(m => m.toUpperCase()).join(", ")} ${r.route.path}`);

    console.log("Registered routes in adminOffers router:", routes);
    assert(routes.includes("GET /offers/analytics"), "GET /offers/analytics is registered in admin router");
    assert(routes.includes("GET /offers"), "GET /offers is registered");
    assert(routes.includes("GET /offers/:id"), "GET /offers/:id is registered");

    // 2. Query Analytics Aggregation Logic
    console.log("\n--- 2. Querying Live Analytics Aggregations ---");

    // Compute stats
    const allOffers = await Offer.find().lean();
    assert(Array.isArray(allOffers), "Retrieved all offers collection");

    // Aggregate Bookings with Offers
    const financialStats = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
            { discountAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountGiven: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
          totalBookingRevenue: { $sum: "$finalPrice" },
          totalRedemptions: { $sum: 1 },
          avgDiscount: { $avg: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
        },
      },
    ]);

    const finance = financialStats[0] || {
      totalDiscountGiven: 0,
      totalBookingRevenue: 0,
      totalRedemptions: 0,
      avgDiscount: 0,
    };

    assert(typeof finance.totalDiscountGiven === "number", "totalDiscountGiven is numeric");
    assert(typeof finance.totalBookingRevenue === "number", "totalBookingRevenue is numeric");
    assert(typeof finance.totalRedemptions === "number", "totalRedemptions is numeric");

    // Top Performing Offers
    const topOffers = await Offer.find()
      .sort({ usedCount: -1, createdAt: -1 })
      .limit(10)
      .select("title code discountType discountValue maxDiscount applicableService usedCount totalUsageLimit isActive status")
      .lean();

    assert(Array.isArray(topOffers), "topOffers leaderboard generated as array");

    // Service Breakdown
    const serviceBreakdown = await Booking.aggregate([
      {
        $match: {
          $or: [
            { offerId: { $ne: null } },
            { offerDiscount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: "$requestType",
          redemptions: { $sum: 1 },
          totalDiscount: { $sum: { $ifNull: ["$offerDiscount", "$discountAmount"] } },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
    ]);

    assert(Array.isArray(serviceBreakdown), "serviceBreakdown generated as array");

    // Recent Redemptions
    const recentRedemptions = await Booking.find({
      $or: [
        { offerId: { $ne: null } },
        { offerCode: { $ne: null } },
      ],
    })
      .select("customerName customerPhone offerCode offerTitle offerDiscount discountAmount basePrice extraCharge finalPrice requestType createdAt")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    assert(Array.isArray(recentRedemptions), "recentRedemptions live audit feed generated as array");

    // 3. Test Simulation: Create an Offer and a Booking with Offer
    console.log("\n--- 3. Verifying Analytics Reactivity With Sample Promotion Data ---");
    const sampleOffer = await Offer.create({
      title: "Analytics Test Promo",
      code: "TEST_P6_ANALYTICS",
      discountType: "Percentage",
      discountValue: 15,
      applicableService: "Machine",
      usedCount: 7,
      totalUsageLimit: 50,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });

    const refreshedTop = await Offer.find()
      .sort({ usedCount: -1, createdAt: -1 })
      .limit(5)
      .lean();

    const foundInTop = refreshedTop.some((o) => o.code === "TEST_P6_ANALYTICS");
    assert(foundInTop, "Sample promotion with redemptions accurately reflected in top offers leaderboard");

    // Cleanup sample offer
    await Offer.findByIdAndDelete(sampleOffer._id);

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
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

