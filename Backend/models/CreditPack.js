const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Supported configurable credit pack sizes: 5, 7, 10, 15, 20, and 25 requests.
 */
const ALLOWED_PACK_SIZES = [5, 7, 10, 15, 20, 25];

const PACK_PRICING = {
  5: 199,
  7: 269,
  10: 379,
  15: 549,
  20: 699,
  25: 849,
};

const creditTransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packSize: {
      type: Number,
      required: true,
      enum: ALLOWED_PACK_SIZES,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentGateway: {
      type: String,
      enum: ["Razorpay", "UPI", "Stripe", "Cashfree", "TestVerifiedGateway"],
      default: "UPI",
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Initiated", "Verified", "Failed"],
      default: "Initiated",
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    creditsGranted: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = {
  CreditTransaction: mongoose.model("CreditTransaction", creditTransactionSchema),
  ALLOWED_PACK_SIZES,
  PACK_PRICING,
};

