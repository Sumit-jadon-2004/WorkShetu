
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
        isAdmin: user.isAdmin === true,

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

        if (
            !req.user ||
            req.user.role !== role
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to perform this action."
            });
        }

        next();
    };
}

function adminRequired(req, res, next) {
    if (!req.user || req.user.isAdmin !== true) {
        return res.status(403).json({
            success: false,
            message: "You are not authorized to perform this action."
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

    isFarmer:
        roleRequired("Farmer"),

    isDriver:
        roleRequired("Driver"),

    isAdmin:
        adminRequired
};
