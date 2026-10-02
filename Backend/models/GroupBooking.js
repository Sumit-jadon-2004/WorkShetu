const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    landArea: { type: Number, required: true, min: 0.01 },
    location: { type: String, required: true, trim: true },
    latitude: Number,
    longitude: Number,
    originalPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Rejected", "Cancelled"],
      default: "Pending"
    }
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
    minimumRequiredLand: { type: Number, default: 5, min: 0.01 },
    groupDiscountPercent: { type: Number, default: 10, min: 0, max: 100 },
    totalOriginalPrice: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    totalFinalPrice: { type: Number, default: 0, min: 0 },
    location: { type: String, required: true, trim: true },
    latitude: Number,
    longitude: Number,
    status: {
      type: String,
      enum: ["Forming", "Ready", "RequestSent", "Accepted", "Rejected", "Completed", "Cancelled"],
      default: "Forming"
    },
    completionOtp: { type: String, select: false },
    completionOtpExpiresAt: { type: Date, select: false },
    otpVerified: { type: Boolean, default: false },
    bookingDate: { type: Date, required: true }
  },
  { timestamps: true }
);

groupBookingSchema.index({ listing: 1, requestType: 1, status: 1 });

groupBookingSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model("GroupBooking", groupBookingSchema);
