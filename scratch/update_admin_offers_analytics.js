const fs = require("fs");
const file = "Backend/routes/adminOffers.js";
let content = fs.readFileSync(file, "utf8");

const target = `// ==========================================
// 2. GET SINGLE OFFER BY ID
// ==========================================
router.get("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {`;

const analyticsRoute = `// ==========================================
// 1.5. GET COMPREHENSIVE OFFER ANALYTICS
// ==========================================
router.get("/offers/analytics", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const stats = await getOfferStats();

    // 1. Financial KPIs & Totals from Bookings with Offers
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

    // 2. Top Performing Offers Leaderboard
    const topOffers = await Offer.find()
      .sort({ usedCount: -1, createdAt: -1 })
      .limit(10)
      .select("title code discountType discountValue maxDiscount applicableService usedCount totalUsageLimit isActive status")
      .lean();

    // 3. Service Breakdown from Bookings with Offers
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

    // 4. Recent Offer Redemptions Activity Feed
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

    return res.json({
      success: true,
      stats: {
        ...stats,
        totalRedemptions: Math.max(stats.totalRedemptions, finance.totalRedemptions),
        totalDiscountGiven: Math.max(stats.totalDiscountGiven, finance.totalDiscountGiven),
        totalBookingRevenue: finance.totalBookingRevenue,
        avgDiscount: Math.round(finance.avgDiscount || 0),
      },
      topOffers,
      serviceBreakdown,
      recentRedemptions,
    });
  } catch (error) {
    console.error("GET OFFER ANALYTICS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to compile offer analytics.",
      error: error.message,
    });
  }
});

// ==========================================
// 2. GET SINGLE OFFER BY ID
// ==========================================
router.get("/offers/:id", isLoggedIn, isAdmin, async (req, res) => {`;

content = content.replace(/\r\n/g, "\n");
const normTarget = target.replace(/\r\n/g, "\n");

if (!content.includes(normTarget)) {
  console.error("Target not found in adminOffers.js!");
  process.exit(1);
}

content = content.replace(normTarget, analyticsRoute);
fs.writeFileSync(file, content, "utf8");
console.log("Successfully added /offers/analytics route to adminOffers.js");

