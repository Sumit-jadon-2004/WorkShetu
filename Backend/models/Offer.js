const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const offerSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required."],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    // Coupon Code (Optional if automatic offer)
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 30,
      default: null,
    },
    isAutomatic: {
      type: Boolean,
      default: false,
    },
    bannerUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Discount Structure
    discountType: {
      type: String,
      enum: ["Flat", "Percentage"],
      required: true,
      default: "Flat",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required."],
      min: [0, "Discount value cannot be negative."],
    },
    maxDiscount: {
      type: Number,
      default: null, // For percentage discounts, upper cap in INR (e.g., 500)
      min: 0,
    },

    // Service & Category Applicability
    applicableService: {
      type: String,
      enum: ["All", "Machine", "Labour", "Transport"],
      default: "All",
    },
    categorySelectionMode: {
      type: String,
      enum: ["all", "selected"],
      default: "all",
    },
    applicableCategories: {
      type: [String], // e.g. ["Tractor", "Harvester", "Rotavator"]
      default: [],
    },

    // User Eligibility & Booking Rules
    userEligibility: {
      type: String,
      enum: ["All", "New Users", "Existing Users", "Farmers"],
      default: "All",
    },
    firstBookingOnly: {
      type: Boolean,
      default: false,
    },
    groupBookingOnly: {
      type: Boolean,
      default: false,
    },
    minimumBookingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableLocations: {
      type: [String],
      default: [], // Empty array = valid nationwide / all regions
    },

    // Usage Constraints
    totalUsageLimit: {
      type: Number,
      default: null, // null = unlimited
      min: 1,
    },
    perUserUsageLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Funding Source & Platform Budget Protection
    fundingSource: {
      type: String,
      enum: ["WorkShetu", "Driver", "Shared"],
      default: "WorkShetu",
    },
    campaignBudget: {
      type: Number,
      default: null, // null = unlimited
      min: 0,
    },
    budgetSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    budgetReserved: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Validity Schedule
    startDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required."],
    },

    // Status
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Active", "Paused", "Expired", "Inactive"],
      default: "Active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup & concurrency safety
offerSchema.index({ code: 1 }, { unique: true, sparse: true });
offerSchema.index({ isActive: 1, status: 1, startDate: 1, endDate: 1 });
offerSchema.index({ applicableService: 1 });
offerSchema.index({ fundingSource: 1 });

// Helper to determine real-time operational status based on time window and budget exhaustion
offerSchema.methods.computeCurrentStatus = function () {
  if (!this.isActive || this.status === "Inactive") return "Inactive";
  if (this.status === "Paused") return "Paused";
  const now = new Date();
  if (this.endDate && now > this.endDate) return "Expired";
  if (this.startDate && now < this.startDate) return "Scheduled";
  if (this.totalUsageLimit && this.usedCount >= this.totalUsageLimit) return "Expired";
  if (this.campaignBudget && (this.budgetSpent + (this.budgetReserved || 0)) >= this.campaignBudget) return "Paused";
  return "Active";
};

module.exports = mongoose.model("Offer", offerSchema);
