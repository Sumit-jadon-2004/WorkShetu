
// ==========================================
// AUTH MIDDLEWARE
// ==========================================

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
            if (userRole === "driver" && req.user.driverApplicationStatus === "Approved" && req.user.isActive !== false) {
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
            return res.status(403).json({
                success: false,
                message: "You are not authorized to perform this action."
            });
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
    isLoggedIn,
    roleRequired,
    isFarmer: roleRequired("Farmer"),
    isDriver: roleRequired("Driver"),
    isLabour: roleRequired("Labour"),
    isAdmin: adminRequired
};
