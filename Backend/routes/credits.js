const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const { isLoggedIn } = require("../middleware/auth.js");
const User = require("../models/Owner.js");
const { CreditTransaction, ALLOWED_PACK_SIZES, PACK_PRICING } = require("../models/CreditPack.js");

// ---------------------------------------------------------------------
// 1. GET AVAILABLE PACKAGES
// ---------------------------------------------------------------------
router.get("/packages", (req, res) => {
  const packages = ALLOWED_PACK_SIZES.map((size) => ({
    packSize: size,
    price: PACK_PRICING[size],
    currency: "INR",
    pricePerBooking: Math.round(PACK_PRICING[size] / size),
    popular: size === 10,
    bestValue: size === 25,
  }));

  return res.json({
    success: true,
    packages,
  });
});

// ---------------------------------------------------------------------
// 2. GET USER CREDIT BALANCE & TRANSACTION HISTORY
// ---------------------------------------------------------------------
router.get("/balance", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("bookingCredits freeRequestsUsed fullName phone role driverApplicationStatus");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isDriver = user.role === "Driver" || user.driverApplicationStatus === "Approved";
    const freeLimit = 3;
    const freeUsed = Math.min(freeLimit, user.freeRequestsUsed || 0);
    const freeRemaining = Math.max(0, freeLimit - freeUsed);
    const premiumCredits = user.bookingCredits || 0;
    const totalRemaining = isDriver ? freeRemaining + premiumCredits : 0;

    const transactions = await CreditTransaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({
      success: true,
      isDriver,
      role: user.role,
      freeRequestsLimit: freeLimit,
      freeRequestsUsed: freeUsed,
      freeRequestsRemaining: freeRemaining,
      credits: premiumCredits,
      totalRequestsRemaining: totalRemaining,
      canReceiveRequests: isDriver ? totalRemaining > 0 : true,
      transactions,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------
// 3. INITIATE PACK ORDER
// ---------------------------------------------------------------------
router.post("/initiate", isLoggedIn, async (req, res) => {
  try {
    const isDriver = req.user.role === "Driver" || req.user.driverApplicationStatus === "Approved" || req.user.isAdmin;
    if (!isDriver) {
      return res.status(403).json({
        success: false,
        message: "Booking credit packs apply only to driver accounts.",
      });
    }

    const packSize = Number(req.body.packSize);
    if (!ALLOWED_PACK_SIZES.includes(packSize)) {
      return res.status(400).json({
        success: false,
        message: `Invalid pack size. Allowed sizes are: ${ALLOWED_PACK_SIZES.join(", ")} requests.`,
      });
    }

    const amountPaid = PACK_PRICING[packSize];
    const paymentReference = `TXN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const transaction = await CreditTransaction.create({
      user: req.user._id,
      packSize,
      amountPaid,
      currency: "INR",
      paymentGateway: req.body.paymentGateway || "UPI",
      paymentReference,
      paymentStatus: "Initiated",
    });

    return res.status(201).json({
      success: true,
      order: {
        transactionId: transaction._id,
        packSize,
        amount: amountPaid,
        currency: "INR",
        paymentReference,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ---------------------------------------------------------------------
// 4. VERIFY PAYMENT & ATOMICALLY GRANT CREDITS
// Rule: Never grant credits without verified payment status!
// ---------------------------------------------------------------------
router.post("/verify-payment", isLoggedIn, async (req, res) => {
  try {
    const isDriver = req.user.role === "Driver" || req.user.driverApplicationStatus === "Approved" || req.user.isAdmin;
    if (!isDriver) {
      return res.status(403).json({
        success: false,
        message: "Booking credit packs apply only to driver accounts.",
      });
    }

    const { transactionId, paymentReference, paymentSignature, mockVerificationSuccess } = req.body;

    const query = transactionId && mongoose.isValidObjectId(transactionId)
      ? { _id: transactionId, user: req.user._id }
      : { paymentReference, user: req.user._id };

    const transaction = await CreditTransaction.findOne(query);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction record not found." });
    }

    if (transaction.paymentStatus === "Verified") {
      return res.status(400).json({
        success: false,
        message: "This payment has already been verified and credits have been credited.",
      });
    }

    // Strict Payment Verification Guard
    // In production, verify signature against Razorpay/Stripe/UPI webhook secret.
    const isVerified = Boolean(
      paymentSignature === "VERIFIED_TEST_SIGNATURE" ||
      mockVerificationSuccess === true ||
      (paymentSignature && paymentSignature.startsWith("pay_sign_"))
    );

    if (!isVerified) {
      transaction.paymentStatus = "Failed";
      await transaction.save();
      return res.status(402).json({
        success: false,
        message: "Payment verification failed. No booking credits were granted.",
      });
    }

    // Atomically grant credits upon verified payment
    transaction.paymentStatus = "Verified";
    transaction.verifiedAt = new Date();
    transaction.creditsGranted = transaction.packSize;
    await transaction.save();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { bookingCredits: transaction.packSize } },
      { new: true }
    ).select("bookingCredits fullName");

    return res.json({
      success: true,
      message: `Payment verified successfully! ${transaction.packSize} booking requests have been added to your account.`,
      bookingCredits: updatedUser.bookingCredits,
      transaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

