const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const platformSettingsSchema = new Schema(
  {
    // ==========================================
    // 1. NEARBY & GEOGRAPHIC SEARCH CONFIG
    // ==========================================
    nearbyMachineRadiusKm: {
      type: Number,
      default: 5, // 5 KM default
      min: 1,
      max: 100,
    },

    // ==========================================
    // 2. GROUP BOOKING BUSINESS RULES
    // ==========================================
    minimumLandArea: {
      type: Number,
      default: 5, // 5 Bigha default
      min: 1,
      max: 100,
    },
    groupMaxDistanceKm: {
      type: Number,
      default: 2, // 2 KM pooling radius
      min: 1,
      max: 50,
    },
    groupDiscountPercent: {
      type: Number,
      default: 10, // 10% pool discount
      min: 0,
      max: 50,
    },

    // ==========================================
    // 3. EXTRA BOOKING CHARGES
    // ==========================================
    extraBookingCharge: {
      type: Number,
      default: 500, // ₹500 standard extra charge
      min: 0,
    },
    smallLandExtraChargePerMissingBigha: {
      type: Number,
      default: 100, // ₹100 per missing Bigha
      min: 0,
    },
    higherSmallLandExtraChargePerMissingBigha: {
      type: Number,
      default: 150, // ₹150 for >2 missing Bigha
      min: 0,
    },

    // ==========================================
    // 4. PLATFORM OPERATIONAL RULES
    // ==========================================
    allowGroupBookings: {
      type: Boolean,
      default: true,
    },
    requireDriverVerification: {
      type: Boolean,
      default: true,
    },
    cancellationWindowHours: {
      type: Number,
      default: 24,
      min: 0,
      max: 168,
    },
    platformCommissionPercent: {
      type: Number,
      default: 5,
      min: 0,
      max: 30,
    },

    // ==========================================
    // 5. PLATFORM CONTACT & SUPPORT INFO
    // ==========================================
    supportPhone: {
      type: String,
      default: "+91 98765 43210",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@workshetu.com",
      trim: true,
    },
    emergencyHelpline: {
      type: String,
      default: "1800-123-FARM",
      trim: true,
    },
    operationalOffice: {
      type: String,
      default: "WorkShetu Agri-Tech Hub, Sector 62, Noida, Uttar Pradesh, 201301",
      trim: true,
    },
    workingHours: {
      type: String,
      default: "Monday - Saturday: 6:00 AM - 9:00 PM IST",
      trim: true,
    },

    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Static method to always fetch the active singleton settings document
platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);

