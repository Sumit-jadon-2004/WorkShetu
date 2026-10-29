const Offer = require("../models/Offer.js");

/**
 * Seeds or synchronizes the default WorkShetu platform-funded "First Booking Offer".
 * Ensures the offer exists with protected driver payouts and all-locations mode.
 */
async function seedFirstBookingOffer() {
  try {
    const existingOffer = await Offer.findOne({
      $or: [
        { code: "FIRST50" },
        { title: "First Booking Offer" },
      ],
    });

    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (!existingOffer) {
      const defaultOffer = new Offer({
        title: "First Booking Offer",
        description: "Welcome to WorkShetu! Get 10% off up to ₹50 on your very first booking. 100% platform-funded by WorkShetu with protected Driver payouts.",
        code: "FIRST50",
        isAutomatic: false,
        bannerUrl: "",
        discountType: "Percentage",
        discountValue: 10,
        maxDiscount: 50,
        minimumBookingAmount: 500,
        applicableService: "All",
        applicableCategories: [],
        userEligibility: "Farmers",
        firstBookingOnly: true,
        groupBookingOnly: false,
        applicableLocations: [], // All Locations nationwide by default
        totalUsageLimit: 40,
        perUserUsageLimit: 1,
        fundingSource: "WorkShetu",
        campaignBudget: 2000,
        budgetSpent: 0,
        budgetReserved: 0,
        startDate: now,
        endDate: oneYearLater,
        status: "Active",
        isActive: true,
      });

      await defaultOffer.save();
      console.log("✅ [WorkShetu Seed] Default 'First Booking Offer' (FIRST50) seeded successfully.");
      return defaultOffer;
    } else {
      // Ensure fundingSource & campaignBudget fields are populated if missing on legacy doc
      let needsSave = false;
      if (!existingOffer.fundingSource) {
        existingOffer.fundingSource = "WorkShetu";
        needsSave = true;
      }
      if (existingOffer.campaignBudget === undefined || existingOffer.campaignBudget === null) {
        existingOffer.campaignBudget = 2000;
        needsSave = true;
      }
      if (existingOffer.budgetSpent === undefined) {
        existingOffer.budgetSpent = 0;
        needsSave = true;
      }
      if (existingOffer.budgetReserved === undefined) {
        existingOffer.budgetReserved = 0;
        needsSave = true;
      }
      if (needsSave) {
        await existingOffer.save();
        console.log("ℹ️ [WorkShetu Seed] Existing 'First Booking Offer' synchronized with platform funding fields.");
      }
      return existingOffer;
    }
  } catch (err) {
    console.error("⚠️ [WorkShetu Seed] Error seeding first booking offer:", err.message);
  }
}

module.exports = { seedFirstBookingOffer };

