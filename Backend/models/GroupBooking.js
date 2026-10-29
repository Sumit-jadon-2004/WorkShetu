const mongoose = require("mongoose");
const { GROUP_MIN_LAND_AREA } = require("../utils/groupBooking.js");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    landArea: { type: Number, required: true, min: 0.01 },
    location: { type: String, required: true, trim: true },
    latitude: Number,
    longitude: Number,
    locationVerified: { type: Boolean, default: false },
    originalPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Rejected", "Cancelled"],
      default: "Pending"
    },
    completionOtp: { type: String, select: false },
    completionOtpExpiresAt: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false }
  },
  { _id: true }
);

const groupBookingSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    requestType: { type: String, enum: ["Machine", "Labour", "Transport"], required: true },
    members: { type: [memberSchema], default: [] },
    totalLandArea: { type: Number, default: 0, min: 0 },
    minimumRequiredLand: { type: Number, default: GROUP_MIN_LAND_AREA, min: 0.01 },
    groupDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    totalOriginalPrice: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    totalFinalPrice: { type: Number, default: 0, min: 0 },
    location: { type: String, required: true, trim: true },
    latitude: Number,
    longitude: Number,
    locationVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Forming", "Ready", "RequestSent", "Accepted", "Rejected", "Completed", "Cancelled"],
      default: "Forming"
    },
    completedAt: { type: Date, default: null },
    statusChangedAt: { type: Date, default: null },
    purgeAt: { type: Date, default: null },
    historyExpiresAt: { type: Date, default: null },
    completionOtp: { type: String, select: false },
    completionOtpExpiresAt: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    bookingDate: { type: Date, required: true }
  },
  { timestamps: true }
);

groupBookingSchema.index({ listing: 1, requestType: 1, status: 1 });

groupBookingSchema.index({ owner: 1, status: 1 });
groupBookingSchema.index({ completedAt: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60, sparse: true });
groupBookingSchema.index({ historyExpiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
groupBookingSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model("GroupBooking", groupBookingSchema);
