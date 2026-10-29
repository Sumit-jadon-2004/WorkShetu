const express = require("express");
const router = express.Router();

const PlatformSettings = require("../models/PlatformSettings.js");
const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// ==========================================
// 1. GET ADMIN SETTINGS (Full Configuration)
// ==========================================
router.get("/settings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("GET ADMIN SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve platform settings.",
      error: error.message,
    });
  }
});

// ==========================================
// 2. UPDATE ADMIN SETTINGS
// ==========================================
router.put("/settings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    let settings = await PlatformSettings.getSettings();

    const {
      nearbyMachineRadiusKm,
      minimumLandArea,
      groupMaxDistanceKm,
      groupDiscountPercent,
      extraBookingCharge,
      smallLandExtraChargePerMissingBigha,
      higherSmallLandExtraChargePerMissingBigha,
      allowGroupBookings,
      requireDriverVerification,
      cancellationWindowHours,
      platformCommissionPercent,
      supportPhone,
      supportEmail,
      emergencyHelpline,
      operationalOffice,
      workingHours,
    } = req.body;

    // Numerical range validations
    if (nearbyMachineRadiusKm !== undefined) {
      const val = Number(nearbyMachineRadiusKm);
      if (Number.isFinite(val) && val >= 1 && val <= 100) {
        settings.nearbyMachineRadiusKm = val;
      }
    }

    if (minimumLandArea !== undefined) {
      const val = Number(minimumLandArea);
      if (Number.isFinite(val) && val >= 1) {
        settings.minimumLandArea = val;
      }
    }

    if (groupMaxDistanceKm !== undefined) {
      const val = Number(groupMaxDistanceKm);
      if (Number.isFinite(val) && val >= 1 && val <= 50) {
        settings.groupMaxDistanceKm = val;
      }
    }

    if (groupDiscountPercent !== undefined) {
      const val = Number(groupDiscountPercent);
      if (Number.isFinite(val) && val >= 0 && val <= 50) {
        settings.groupDiscountPercent = val;
      }
    }

    if (extraBookingCharge !== undefined) {
      const val = Number(extraBookingCharge);
      if (Number.isFinite(val) && val >= 0) {
        settings.extraBookingCharge = val;
      }
    }

    if (smallLandExtraChargePerMissingBigha !== undefined) {
      const val = Number(smallLandExtraChargePerMissingBigha);
      if (Number.isFinite(val) && val >= 0) {
        settings.smallLandExtraChargePerMissingBigha = val;
      }
    }

    if (higherSmallLandExtraChargePerMissingBigha !== undefined) {
      const val = Number(higherSmallLandExtraChargePerMissingBigha);
      if (Number.isFinite(val) && val >= 0) {
        settings.higherSmallLandExtraChargePerMissingBigha = val;
      }
    }

    if (allowGroupBookings !== undefined) {
      settings.allowGroupBookings = Boolean(allowGroupBookings);
    }

    if (requireDriverVerification !== undefined) {
      settings.requireDriverVerification = Boolean(requireDriverVerification);
    }

    if (cancellationWindowHours !== undefined) {
      const val = Number(cancellationWindowHours);
      if (Number.isFinite(val) && val >= 0 && val <= 168) {
        settings.cancellationWindowHours = val;
      }
    }

    if (platformCommissionPercent !== undefined) {
      const val = Number(platformCommissionPercent);
      if (Number.isFinite(val) && val >= 0 && val <= 30) {
        settings.platformCommissionPercent = val;
      }
    }

    // String contact details
    if (supportPhone !== undefined) settings.supportPhone = String(supportPhone).trim();
    if (supportEmail !== undefined) settings.supportEmail = String(supportEmail).trim();
    if (emergencyHelpline !== undefined) settings.emergencyHelpline = String(emergencyHelpline).trim();
    if (operationalOffice !== undefined) settings.operationalOffice = String(operationalOffice).trim();
    if (workingHours !== undefined) settings.workingHours = String(workingHours).trim();

    settings.lastUpdatedBy = req.user._id;

    await settings.save();

    return res.json({
      success: true,
      message: "Platform settings updated successfully.",
      settings,
    });
  } catch (error) {
    console.error("UPDATE ADMIN SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update platform settings.",
      error: error.message,
    });
  }
});

// ==========================================
// 3. RESET TO DEFAULT BUSINESS RULES
// ==========================================
router.post("/settings/reset", isLoggedIn, isAdmin, async (req, res) => {
  try {
    await PlatformSettings.deleteMany({});
    const defaultSettings = await PlatformSettings.getSettings();

    return res.json({
      success: true,
      message: "Platform business rules successfully reset to system defaults (5 Bigha, ₹500, 5 KM).",
      settings: defaultSettings,
    });
  } catch (error) {
    console.error("RESET ADMIN SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset settings.",
      error: error.message,
    });
  }
});

// ==========================================
// 4. PUBLIC CONTACT & OPERATIONAL INFO
// ==========================================
router.get("/settings/public", async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    return res.json({
      success: true,
      contact: {
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
        emergencyHelpline: settings.emergencyHelpline,
        operationalOffice: settings.operationalOffice,
        workingHours: settings.workingHours,
      },
      rules: {
        nearbyRadiusKm: settings.nearbyMachineRadiusKm,
        minimumLandArea: settings.minimumLandArea,
        allowGroupBookings: settings.allowGroupBookings,
        cancellationWindowHours: settings.cancellationWindowHours,
      },
    });
  } catch (error) {
    console.error("GET PUBLIC SETTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve public settings.",
    });
  }
});

module.exports = router;

