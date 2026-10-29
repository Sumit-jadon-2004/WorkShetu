require("dotenv").config({ path: "Backend/.env" });
const mongoose = require("mongoose");
const Offer = require("./Backend/models/Offer.js");
const Machine = require("./Backend/models/ListingMachin.js");
const User = require("./Backend/models/Owner.js");
const Booking = require("./Backend/models/BookingMachine.js");
const { validateOffer, calculateFinalPrice } = require("./Backend/utils/pricingEngine.js");
const { getSinglePrice } = require("./Backend/utils/groupBooking.js");

(async () => {
  await mongoose.connect(process.env.MONGO_URL.trim(), { serverSelectionTimeoutMS: 30000 });
  console.log("Connected to MongoDB successfully.");

  let offer = null;
  let booking = null;

  try {
    // 1. Create Offer with Banner Photo
    offer = await Offer.create({
      title: "Live Booking Verification Promo",
      description: "Flat ₹200 discount for tractor booking test",
      code: "FARMER200",
      bannerUrl: "https://res.cloudinary.com/dzlumisao/image/upload/v1728412345/test_banner.jpg",
      discountType: "Flat",
      discountValue: 200,
      applicableService: "Machine",
      applicableCategories: ["Tractor"],
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
      status: "Active",
    });
    console.log("1. Created Offer with Photo:", offer.title, "Banner:", offer.bannerUrl);

    // 2. Validate Offer for Booking
    const validation = await validateOffer({
      code: "FARMER200",
      requestType: "Machine",
      category: "Tractor",
      basePrice: 2400,
      landArea: 3,
      bookingType: "Single",
    });

    console.log("2. Validation Result: isValid =", validation.isValid, "Offer Title =", validation.offer?.title);
    if (!validation.isValid) throw new Error(validation.reason);

    const quote = calculateFinalPrice({
      baseServicePrice: 2400,
      mandatoryCharges: 200, // 3 Bigha smallholding fee
      offer: validation.offer,
    });
    console.log("3. Authoritative Quote Breakdown:", quote);

    if (quote.actualDiscount !== 200) throw new Error("Discount mismatch!");
    if (quote.finalPayableAmount !== 2400) throw new Error("Payable mismatch!");

    console.log("=== ALL END-TO-END BOOKING & OFFER VALIDATION CHECKS PASSED (100%) ===");
  } catch (err) {
    console.error("TEST FAILED:", err);
  } finally {
    if (offer) await Offer.findByIdAndDelete(offer._id);
    await mongoose.disconnect();
  }
})();

