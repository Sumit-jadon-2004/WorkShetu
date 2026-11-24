
// ==========================================
// AUTH MIDDLEWARE
// ==========================================
const Labour = require("../models/Labour.js");

function safeUser(user) {
    if (!user) return null;

    return {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin === true || String(user.role || "").toLowerCase() === "admin",

        // Driver Application
        driverApplicationStatus: user.driverApplicationStatus,
        driverApplicationDate: user.driverApplicationDate,
        driverRejectionReason: user.driverRejectionReason,
        driverEquipmentImage: user.driverEquipmentImage,
        driverVehicleType: user.driverVehicleType,
        driverVehicleNumber: user.driverVehicleNumber,
        driverExperience: user.driverExperience,
        driverAddress: user.driverAddress,
        driverMessage: user.driverMessage,
        driverAadhaarNumber: user.driverAadhaarNumber,
        driverLicenseNumber: user.driverLicenseNumber,
        driverSuspensionReason: user.driverSuspensionReason,
        driverSuspendedAt: user.driverSuspendedAt,
        driverReviewReason: user.driverReviewReason,
        driverReviewedAt: user.driverReviewedAt,

        // Profile
        profileImage: user.profileImage,
        location: user.location,
        latitude: user.latitude,
        longitude: user.longitude,
        isActive: user.isActive
    };
}

async function resolveUserProfileStatus(userId) {
    if (!userId) return null;
    const User = require("../models/Owner.js");
    const [labourProfiles, user] = await Promise.all([
        Labour.find({ owner: userId }).select("_id status availability").sort({ createdAt: -1 }).lean(),
        User.findById(userId).select("role isAdmin driverApplicationStatus isActive").lean()
    ]);

    const isAdmin = Boolean(user?.isAdmin) || String(user?.role || "").toLowerCase() === "admin";
    const hasDriverProfile =
        !isAdmin &&
        (String(user?.role || "").toLowerCase() === "driver" ||
            user?.driverApplicationStatus === "Approved");
    const hasLabourProfile = labourProfiles.length > 0;
    const pendingLabourProfile = labourProfiles.find((profile) => profile.status === "Pending");

    return {
        hasLabourProfile,
        hasDriverProfile,
        hasBothProfiles: hasLabourProfile && hasDriverProfile,
        hasIncompleteLabourRegistration:
            String(user?.role || "").toLowerCase() === "labour" && !hasLabourProfile,
        pendingLabourProfile: pendingLabourProfile || null,
        driverApplicationStatus: user?.driverApplicationStatus || "None",
        isAdmin
    };
}


// ==========================================
// CHECK LOGIN
// ==========================================

function isLoggedIn(req, res, next) {

    if (
        !req.isAuthenticated ||
        !req.isAuthenticated() ||
        !req.user
    ) {
        return res.status(401).json({
            success: false,
            message: "You are not authenticated."
        });
    }


    // Account disabled
    if (req.user.isActive === false) {

        return req.logout(() => {

            return res.status(401).json({
                success: false,
                message:
                    "Your account has been disabled. Please contact support."
            });

        });
    }


    next();
}


// ==========================================
// ROLE CHECK
// ==========================================

function roleRequired(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to perform this action."
            });
        }

        const userRole = String(req.user.role || "").trim().toLowerCase();
        const targetRole = String(role || "").trim().toLowerCase();

        if (targetRole === "admin") {
            const isUserAdmin = req.user.isAdmin === true || userRole === "admin";
            if (!isUserAdmin) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to perform this action."
                });
            }
            return next();
        }

        if (targetRole === "driver") {
            const isUserAdmin = req.user.isAdmin === true || userRole === "admin";
            if (isUserAdmin) return next();
            if (req.user.driverApplicationStatus === "Approved" && req.user.isActive !== false) {
                return next();
            }
            return res.status(403).json({
                success: false,
                message: "You are not authorized to perform this action."
            });
        }

        if (targetRole === "labour") {
            const isUserAdmin = req.user.isAdmin === true || userRole === "admin";
            if (isUserAdmin) return next();
            if (userRole === "labour" && req.user.isActive !== false) {
                return next();
            }
            if (req.user.isActive === false) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to perform this action."
                });
            }
            return Labour.exists({ owner: req.user._id })
                .then((labourProfile) => {
                    if (labourProfile) return next();
                    return res.status(403).json({
                        success: false,
                        message: "You are not authorized to perform this action."
                    });
                })
                .catch((error) => next(error));
        }

        if (userRole !== targetRole) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to perform this action."
            });
        }

        next();
    };
}

function adminRequired(req, res, next) {
    if (
        !req.isAuthenticated ||
        !req.isAuthenticated() ||
        !req.user
    ) {
        return res.status(401).json({
            success: false,
            message: "Login required."
        });
    }

    if (req.user.isActive === false) {
        return res.status(401).json({
            success: false,
            message: "Your account has been disabled. Please contact support."
        });
    }

    const role = String(req.user.role || "").toLowerCase();
    const isUserAdmin = role === "admin" || req.user.isAdmin === true;

    if (!isUserAdmin) {
        return res.status(403).json({
            success: false,
            message: "Admin access denied."
        });
    }

    next();
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    safeUser,
    resolveUserProfileStatus,
    isLoggedIn,
    roleRequired,
    isFarmer: roleRequired("Farmer"),
    isDriver: roleRequired("Driver"),
    isLabour: roleRequired("Labour"),
    isAdmin: adminRequired
};
