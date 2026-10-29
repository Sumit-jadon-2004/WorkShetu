const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");
const ListingMachine = require("../models/ListingMachin.js");
const { isDriverEligible, getDriverAccountStatus } = require("../utils/driverEligibility.js");

const {
    isLoggedIn,
    isAdmin
} = require("../middleware/auth.js");


// ==========================================
// GET PENDING DRIVER APPLICATIONS
// ==========================================

router.get(
    "/driver-applications",
    isLoggedIn,
    isAdmin,
    async (req, res) => {
        try {
            const applications = await User.find({
                driverApplicationStatus: "Pending"
            })
                .select(
                    "fullName phone email location latitude longitude driverApplicationStatus driverApplicationDate driverEquipmentImage driverVehicleType driverVehicleNumber driverExperience driverAddress driverMessage driverFirstListing driverAadhaarNumber driverLicenseNumber isActive driverSuspensionReason driverReviewReason"
                )
                .sort({
                    driverApplicationDate: -1
                });

            return res.json({
                success: true,
                applications
            });

        } catch (error) {
            console.error(
                "GET DRIVER APPLICATIONS:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch Driver applications."
            });
        }
    }
);


// ==========================================
// APPROVE / REACTIVATE DRIVER APPLICATION
// ==========================================

const handleApproveDriver = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Allow approval if Pending, Suspected, Rejected, or reactivating
        const allowedStatuses = ["Pending", "Suspected", "Rejected", "None"];
        if (!allowedStatuses.includes(user.driverApplicationStatus) && user.role !== "Driver") {
            return res.status(400).json({
                success: false,
                message: "This account cannot be transitioned to Approved."
            });
        }

        // Make Driver and activate
        user.role = "Driver";
        user.driverApplicationStatus = "Approved";
        user.isActive = true;
        user.driverRejectionReason = undefined;
        user.driverSuspensionReason = undefined;
        user.driverSuspendedAt = undefined;
        user.driverReviewReason = undefined;
        user.driverReviewedAt = undefined;

        await user.save();

        // ==========================================
        // AUTO-CREATE DRIVER'S FIRST LISTING IF NEEDED
        // ==========================================
        let firstListingCreated = false;
        let createdListing = null;

        if (user.driverEquipmentImage?.url) {
            try {
                const firstListingData = user.driverFirstListing || {};
                const category = firstListingData.category || user.driverVehicleType || "Tractor";
                const validCategories = ["Tractor", "Cultivator", "Rotavator", "Harrow", "Harvester"];
                const safeCategory = validCategories.includes(category) ? category : "Tractor";

                const validUnits = ["Bigha", "Acre", "Hectare", "Hour", "Day", "Trip"];
                const safeUnit = validUnits.includes(firstListingData.unit) ? firstListingData.unit : "Hour";

                const cleanPhone = (user.phone || "").replace(/\D/g, "").slice(-10);
                const rawVehicleNo = (firstListingData.vehicleNumber || user.driverVehicleNumber || "").toUpperCase().replace(/\s+/g, "");

                // Check if a listing by this owner or vehicle number already exists
                const existingListing = await ListingMachine.findOne({
                    $or: [
                        { owner: user._id },
                        ...(rawVehicleNo ? [{ vehicleNumber: rawVehicleNo }] : [])
                    ]
                });

                if (!existingListing) {
                    const newListing = new ListingMachine({
                        owner: user._id,
                        title: firstListingData.title || `${safeCategory} - ${user.fullName}`,
                        category: safeCategory,
                        vehicleNumber: rawVehicleNo || undefined,
                        image: {
                            url: user.driverEquipmentImage.url,
                            filename: user.driverEquipmentImage.filename || "driver-equipment"
                        },
                        price: Number(firstListingData.price) || 500,
                        unit: safeUnit,
                        power: Number(firstListingData.power) || 45,
                        fuelType: firstListingData.fuelType || "Diesel",
                        year: Number(firstListingData.year) || new Date().getFullYear(),
                        location: firstListingData.location || user.driverAddress || user.location || "Local Area",
                        latitude: Number(firstListingData.latitude || user.latitude) || 28.6139,
                        longitude: Number(firstListingData.longitude || user.longitude) || 77.2090,
                        phone: cleanPhone.length === 10 ? cleanPhone : "9999999999",
                        description: firstListingData.description || user.driverMessage || `Service provided by verified driver ${user.fullName}.`,
                        availability: "Available"
                    });

                    createdListing = await newListing.save();
                    firstListingCreated = true;
                }
            } catch (listingError) {
                console.error("Auto-creating first listing on driver approval failed:", listingError);
            }
        }

        return res.json({
            success: true,
            message: firstListingCreated
                ? `${user.fullName} is now an Approved Driver and their machinery listing is live!`
                : `${user.fullName} is now an Approved Active Driver. Machinery listings are now publicly visible.`,
            user: {
                _id: user._id,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                driverApplicationStatus: user.driverApplicationStatus,
                status: getDriverAccountStatus(user),
            },
            firstListingCreated,
            listingId: createdListing?._id
        });

    } catch (error) {
        console.error("APPROVE DRIVER:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve Driver application."
        });
    }
};

router.put("/driver-applications/:id/approve", isLoggedIn, isAdmin, handleApproveDriver);
router.put("/drivers/:id/approve", isLoggedIn, isAdmin, handleApproveDriver);


// ==========================================
// REJECT DRIVER APPLICATION
// ==========================================

const handleRejectDriver = async (req, res) => {
    try {
        const { reason } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.driverApplicationStatus === "Rejected") {
            return res.status(400).json({
                success: false,
                message: "This driver application is already rejected."
            });
        }

        user.role = "Farmer";
        user.driverApplicationStatus = "Rejected";
        user.driverRejectionReason = reason?.trim() || "Application rejected by admin.";
        user.driverSuspensionReason = undefined;
        user.driverReviewReason = undefined;

        await user.save();

        return res.json({
            success: true,
            message: `Driver application rejected for ${user.fullName}. Equipment is hidden from public booking.`,
            user: {
                _id: user._id,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                driverApplicationStatus: user.driverApplicationStatus,
                driverRejectionReason: user.driverRejectionReason,
                status: "Rejected"
            }
        });

    } catch (error) {
        console.error("REJECT DRIVER:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject Driver application."
        });
    }
};

router.put("/driver-applications/:id/reject", isLoggedIn, isAdmin, handleRejectDriver);
router.put("/drivers/:id/reject", isLoggedIn, isAdmin, handleRejectDriver);


// ==========================================
// GET DRIVERS (FILTER BY STATUS & SEARCH)
// ==========================================

router.get("/drivers", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const { status, search } = req.query;

        const [pendingCount, approvedCount, suspectedCount, suspendedCount, rejectedCount] = await Promise.all([
            User.countDocuments({ driverApplicationStatus: "Pending" }),
            User.countDocuments({ role: "Driver", driverApplicationStatus: "Approved", isActive: { $ne: false } }),
            User.countDocuments({ driverApplicationStatus: "Suspected" }),
            User.countDocuments({ isActive: false, $or: [{ role: "Driver" }, { driverApplicationStatus: "Approved" }] }),
            User.countDocuments({ driverApplicationStatus: "Rejected" }),
        ]);

        const query = {};

        if (search && search.trim()) {
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            query.$or = [
                { fullName: regex },
                { phone: regex },
                { driverVehicleNumber: regex },
                { driverVehicleType: regex },
                { location: regex },
                { driverAddress: regex },
            ];
        }

        const normalizedStatus = (status || "").toLowerCase();

        if (normalizedStatus === "pending") {
            query.driverApplicationStatus = "Pending";
        } else if (normalizedStatus === "approved" || normalizedStatus === "active") {
            query.role = "Driver";
            query.driverApplicationStatus = "Approved";
            query.isActive = { $ne: false };
        } else if (normalizedStatus === "suspected" || normalizedStatus === "review" || normalizedStatus === "under_review") {
            query.driverApplicationStatus = "Suspected";
        } else if (normalizedStatus === "suspended") {
            query.isActive = false;
            query.$or = [{ role: "Driver" }, { driverApplicationStatus: "Approved" }];
        } else if (normalizedStatus === "rejected") {
            query.driverApplicationStatus = "Rejected";
        } else {
            query.$or = [
                { role: "Driver" },
                { driverApplicationStatus: { $in: ["Pending", "Approved", "Suspected", "Rejected"] } },
            ];
        }

        const drivers = await User.find(query)
            .select("-hash -salt")
            .sort({ updatedAt: -1, driverApplicationDate: -1 })
            .lean();

        const enrichedDrivers = drivers.map((d) => ({
            ...d,
            accountStatus: getDriverAccountStatus(d),
            isEligible: isDriverEligible(d),
        }));

        return res.json({
            success: true,
            counts: {
                pending: pendingCount,
                approved: approvedCount,
                active: approvedCount,
                suspected: suspectedCount,
                suspended: suspendedCount,
                rejected: rejectedCount,
                total: pendingCount + approvedCount + suspectedCount + suspendedCount + rejectedCount,
            },
            drivers: enrichedDrivers,
        });
    } catch (error) {
        console.error("GET DRIVERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch drivers list.",
        });
    }
});


// ==========================================
// GET SINGLE DRIVER DOSSIER
// ==========================================

router.get("/drivers/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const driver = await User.findById(req.params.id)
            .select("-hash -salt")
            .lean();

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        const listings = await ListingMachine.find({ owner: driver._id }).lean();

        return res.json({
            success: true,
            driver: {
                ...driver,
                accountStatus: getDriverAccountStatus(driver),
                isEligible: isDriverEligible(driver),
            },
            listings,
        });
    } catch (error) {
        console.error("GET SINGLE DRIVER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load driver details.",
        });
    }
});


// ==========================================
// SUSPEND DRIVER ACCOUNT
// ==========================================

const handleSuspendDriver = async (req, res) => {
    try {
        const driver = await User.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        const { reason, isActive } = req.body;

        // If explicit reactivate requested via isActive === true
        if (isActive === true) {
            driver.isActive = true;
            driver.driverApplicationStatus = "Approved";
            driver.role = "Driver";
            driver.driverSuspensionReason = undefined;
            driver.driverSuspendedAt = undefined;
            driver.driverReviewReason = undefined;
            driver.driverReviewedAt = undefined;

            await driver.save();

            return res.json({
                success: true,
                message: `Driver ${driver.fullName} has been reactivated. Machinery is now publicly available for booking.`,
                isActive: true,
                driver: {
                    _id: driver._id,
                    fullName: driver.fullName,
                    role: driver.role,
                    isActive: driver.isActive,
                    driverApplicationStatus: driver.driverApplicationStatus,
                    status: "Approved",
                }
            });
        }

        // Suspend driver
        driver.isActive = false;
        driver.driverSuspensionReason = reason?.trim() || "Driver account suspended by administrator.";
        driver.driverSuspendedAt = new Date();

        await driver.save();

        return res.json({
            success: true,
            message: `Driver ${driver.fullName} has been suspended. Listings are hidden and new bookings are blocked.`,
            isActive: false,
            driver: {
                _id: driver._id,
                fullName: driver.fullName,
                role: driver.role,
                isActive: driver.isActive,
                driverApplicationStatus: driver.driverApplicationStatus,
                driverSuspensionReason: driver.driverSuspensionReason,
                status: "Suspended",
            }
        });
    } catch (error) {
        console.error("SUSPEND DRIVER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update driver suspension status.",
        });
    }
};

router.patch("/drivers/:id/suspend", isLoggedIn, isAdmin, handleSuspendDriver);
router.post("/drivers/:id/suspend", isLoggedIn, isAdmin, handleSuspendDriver);


// ==========================================
// FLAG DRIVER FOR REVIEW / SUSPECTED
// ==========================================

const handleReviewDriver = async (req, res) => {
    try {
        const driver = await User.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        const { reason } = req.body;

        driver.driverApplicationStatus = "Suspected";
        driver.driverReviewReason = reason?.trim() || "Driver flagged for administrative review and identity verification.";
        driver.driverReviewedAt = new Date();

        await driver.save();

        return res.json({
            success: true,
            message: `Driver ${driver.fullName} is now Under Review / Suspected. Machinery listings are temporarily hidden from public pages.`,
            driver: {
                _id: driver._id,
                fullName: driver.fullName,
                role: driver.role,
                isActive: driver.isActive,
                driverApplicationStatus: driver.driverApplicationStatus,
                driverReviewReason: driver.driverReviewReason,
                status: "Suspected",
            }
        });
    } catch (error) {
        console.error("REVIEW DRIVER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to flag driver for review.",
        });
    }
};

router.patch("/drivers/:id/review", isLoggedIn, isAdmin, handleReviewDriver);
router.post("/drivers/:id/review", isLoggedIn, isAdmin, handleReviewDriver);
router.patch("/drivers/:id/flag-review", isLoggedIn, isAdmin, handleReviewDriver);


// ==========================================
// REACTIVATE DRIVER (RESTORE VISIBILITY)
// ==========================================

const handleReactivateDriver = async (req, res) => {
    try {
        const driver = await User.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found.",
            });
        }

        driver.isActive = true;
        driver.driverApplicationStatus = "Approved";
        driver.role = "Driver";
        driver.driverSuspensionReason = undefined;
        driver.driverSuspendedAt = undefined;
        driver.driverReviewReason = undefined;
        driver.driverReviewedAt = undefined;

        await driver.save();

        return res.json({
            success: true,
            message: `Driver ${driver.fullName} has been reactivated and approved. All existing machinery listings are automatically restored and available for booking!`,
            isActive: true,
            driver: {
                _id: driver._id,
                fullName: driver.fullName,
                role: driver.role,
                isActive: driver.isActive,
                driverApplicationStatus: driver.driverApplicationStatus,
                status: "Approved",
            }
        });
    } catch (error) {
        console.error("REACTIVATE DRIVER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reactivate driver.",
        });
    }
};

router.patch("/drivers/:id/reactivate", isLoggedIn, isAdmin, handleReactivateDriver);
router.post("/drivers/:id/reactivate", isLoggedIn, isAdmin, handleReactivateDriver);

module.exports = router;