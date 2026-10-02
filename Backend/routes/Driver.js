const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");

const { isLoggedIn } = require("../middleware/auth.js");
const { upload } = require("../middleware/upload.js");


// ======================================================
// APPLY FOR DRIVER
// ======================================================

router.post(
    "/apply",
    isLoggedIn,
    upload.single("equipmentImage"),

    async (req, res) => {

        try {

            const user = req.user;


            // ------------------------------------------
            // ALREADY DRIVER
            // ------------------------------------------

            if (user.role === "Driver") {
                return res.status(400).json({
                    success: false,
                    message:
                        "You are already registered as a Driver."
                });
            }


            // ------------------------------------------
            // APPLICATION ALREADY PENDING
            // ------------------------------------------

            if (
                user.driverApplicationStatus ===
                "Pending"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Your Driver application is already pending."
                });
            }


            // ------------------------------------------
            // IMAGE REQUIRED
            // ------------------------------------------

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Agricultural equipment photo is required."
                });
            }


            // ------------------------------------------
            // FORM DATA
            // ------------------------------------------

            const {
                fullName,
                phone,
                address,
                vehicleType,
                vehicleNumber,
                experience,
                message
            } = req.body;


            // ------------------------------------------
            // VALIDATION
            // ------------------------------------------

            if (
                !fullName ||
                fullName.trim().length < 3
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter a valid full name."
                });
            }


            if (!phone) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Phone number is required."
                });
            }


            if (
                !address ||
                address.trim().length < 5
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter your address."
                });
            }


            if (!vehicleType) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please select vehicle/equipment type."
                });
            }


            if (!vehicleNumber) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Vehicle number is required."
                });
            }


            // ------------------------------------------
            // UPDATE USER
            // ------------------------------------------

            user.fullName = fullName.trim();

            user.phone = phone.trim();

            user.driverAddress =
                address.trim();

            user.driverVehicleType =
                vehicleType.trim();

            user.driverVehicleNumber =
                vehicleNumber.trim();

            user.driverExperience =
                Number(experience) || 0;

            user.driverMessage =
                message
                    ? message.trim()
                    : "";


            // ------------------------------------------
            // CLOUDINARY IMAGE
            // ------------------------------------------

            user.driverEquipmentImage = {
                url: req.file.path,
                filename: req.file.filename
            };


            // ------------------------------------------
            // APPLICATION STATUS
            // ------------------------------------------

            user.driverApplicationStatus =
                "Pending";

            user.driverApplicationDate =
                new Date();

            user.driverRejectionReason =
                undefined;


            // ------------------------------------------
            // SAVE
            // ------------------------------------------

            await user.save();


            // ------------------------------------------
            // RESPONSE
            // ------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Driver application submitted successfully. Please wait for admin approval.",

                user: {

                    _id: user._id,

                    fullName:
                        user.fullName,

                    phone:
                        user.phone,

                    role:
                        user.role,

                    driverApplicationStatus:
                        user.driverApplicationStatus,

                    driverApplicationDate:
                        user.driverApplicationDate,

                    driverEquipmentImage:
                        user.driverEquipmentImage
                }
            });


        } catch (error) {

            console.error(
                "DRIVER APPLY ERROR:",
                error
            );


            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Equipment image must be less than 5 MB."
                });
            }


            return res.status(500).json({

                success: false,

                message:
                    "Failed to submit Driver application.",

                error:
                    process.env.NODE_ENV ===
                    "development"
                        ? error.message
                        : undefined
            });
        }
    }
);


// ======================================================
// GET MY DRIVER APPLICATION
// ======================================================

router.get(
    "/application",
    isLoggedIn,

    async (req, res) => {

        try {

            const user = await User
                .findById(req.user._id)
                .select(
                    "fullName phone role driverApplicationStatus driverApplicationDate driverRejectionReason driverEquipmentImage driverVehicleType driverVehicleNumber driverExperience driverAddress driverMessage"
                );


            if (!user) {
                return res.status(404).json({
                    success: false,
                    message:
                        "User not found."
                });
            }


            return res.status(200).json({
                success: true,
                application: user
            });


        } catch (error) {

            console.error(
                "GET DRIVER APPLICATION ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch Driver application."
            });
        }
    }
);


module.exports = router;