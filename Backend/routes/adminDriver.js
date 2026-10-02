const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");

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
                    "fullName phone email driverApplicationStatus driverApplicationDate driverEquipmentImage driverVehicleType driverVehicleNumber driverExperience driverAddress driverMessage"
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
// APPROVE DRIVER
// ==========================================

router.put(
    "/driver-applications/:id/approve",
    isLoggedIn,
    isAdmin,
    async (req, res) => {
        try {

            const user = await User.findById(
                req.params.id
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }


            if (
                user.driverApplicationStatus !==
                "Pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This application is not pending."
                });
            }


            // Make Driver
            user.role = "Driver";

            user.driverApplicationStatus =
                "Approved";

            user.driverRejectionReason =
                undefined;


            await user.save();


            return res.json({
                success: true,
                message:
                    `${user.fullName} is now a Driver.`,
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    role: user.role,
                    driverApplicationStatus:
                        user.driverApplicationStatus
                }
            });

        } catch (error) {
            console.error(
                "APPROVE DRIVER:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to approve Driver application."
            });
        }
    }
);


// ==========================================
// REJECT DRIVER
// ==========================================

router.put(
    "/driver-applications/:id/reject",
    isLoggedIn,
    isAdmin,
    async (req, res) => {
        try {

            const {
                reason
            } = req.body;


            const user = await User.findById(
                req.params.id
            );


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }


            if (
                user.driverApplicationStatus !==
                "Pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This application is not pending."
                });
            }


            user.role = "Farmer";

            user.driverApplicationStatus =
                "Rejected";

            user.driverRejectionReason =
                reason?.trim() ||
                "Application rejected by admin.";


            await user.save();


            return res.json({
                success: true,
                message:
                    "Driver application rejected.",
                user: {
                    _id: user._id,
                    fullName: user.fullName,
                    role: user.role,
                    driverApplicationStatus:
                        user.driverApplicationStatus,
                    driverRejectionReason:
                        user.driverRejectionReason
                }
            });

        } catch (error) {
            console.error(
                "REJECT DRIVER:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to reject Driver application."
            });
        }
    }
);


module.exports = router;