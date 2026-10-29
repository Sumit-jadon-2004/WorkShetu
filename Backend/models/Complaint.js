const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const complaintSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userPhone: {
      type: String,
      trim: true,
    },
    targetBooking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    targetDriver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: [
        "Booking Dispute",
        "Driver Behavior",
        "Machine Breakdown / Issue",
        "Payment / Overcharging",
        "Cancellation",
        "Other",
      ],
      default: "Booking Dispute",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Resolved", "Rejected", "Open", "In Progress"],
      default: "Pending",
    },
    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
