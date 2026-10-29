const express = require("express");
const router = express.Router();

const User = require("../models/Owner.js");
const ListingMachine = require("../models/ListingMachin.js");

const { isLoggedIn } = require("../middleware/auth.js");
const { upload } = require("../middleware/upload.js");


// ======================================================
// APPLY FOR DRIVER
// ======================================================

router.post(
    "/apply",
    isLoggedIn,
    (req, res, next) => {
        upload.single("equipmentImage")(req, res, (err) => {
            if (err) {
                console.error("DRIVER UPLOAD ERROR:", err);
                const message =
                    err.code === "LIMIT_FILE_SIZE"
                        ? "Equipment image must be less than 5 MB."
                        : err.message || "Failed to upload equipment image. Please try again.";
                return res.status(400).json({
                    success: false,
                    message,
                });
            }
            next();
        });
    },

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
                aadhaarNumber,
                licenseNumber,
                drivingLicense,
                address,
                latitude,
                longitude,
                vehicleType,
                vehicleNumber,
                experience,
                message,
                // First Listing Details (styled like AddListing)
                title,
                category,
                price,
                unit,
                power,
                fuelType,
                year,
                description
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


            // Phone Validation
            const rawPhone = (phone || user.phone || "").trim();
            const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
            if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid 10-digit Indian mobile number."
                });
            }

            if (cleanPhone !== user.phone) {
                const existingPhoneUser = await User.findOne({
                    phone: cleanPhone,
                    _id: { $ne: user._id }
                });
                if (existingPhoneUser) {
                    return res.status(400).json({
                        success: false,
                        message: "This mobile number is already registered with another account."
                    });
                }
                user.phone = cleanPhone;
            }

            // Aadhaar Card Validation & Duplicate Check
            const cleanAadhaar = (aadhaarNumber || "").replace(/\D/g, "");
            if (!cleanAadhaar || cleanAadhaar.length !== 12) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid 12-digit Aadhaar Card number."
                });
            }

            const existingAadhaarUser = await User.findOne({
                driverAadhaarNumber: cleanAadhaar,
                _id: { $ne: user._id }
            });
            if (existingAadhaarUser) {
                return res.status(400).json({
                    success: false,
                    message: "This Aadhaar Card number is already registered with another account."
                });
            }

            // Driving License Validation & Duplicate Check
            const cleanLicense = (drivingLicense || licenseNumber || "").trim().replace(/\s+/g, "").toUpperCase();
            if (!cleanLicense || cleanLicense.length < 5) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid Driving License (DL) number."
                });
            }

            const existingLicenseUser = await User.findOne({
                driverLicenseNumber: cleanLicense,
                _id: { $ne: user._id }
            });
            if (existingLicenseUser) {
                return res.status(400).json({
                    success: false,
                    message: "This Driving License (DL) number is already registered with another account."
                });
            }


            if (
                !address ||
                address.trim().length < 5
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter your address/location."
                });
            }

            const effectiveCategory = (category || vehicleType || "Tractor").trim();

            if (!effectiveCategory) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Please select vehicle/equipment type."
                });
            }

            const needsVehicleNumber = ["Tractor", "Harvester"].includes(effectiveCategory);
            const cleanVehicleNumber = (vehicleNumber || "").trim().replace(/\s+/g, "").toUpperCase();

            if (needsVehicleNumber && !cleanVehicleNumber) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Vehicle number is required for tractors and harvesters."
                });
            }

            // Vehicle Number Duplicate Check
            if (cleanVehicleNumber) {
                const existingVehicleDriver = await User.findOne({
                    driverVehicleNumber: cleanVehicleNumber,
                    _id: { $ne: user._id }
                });
                if (existingVehicleDriver) {
                    return res.status(400).json({
                        success: false,
                        message: "This Vehicle number is already registered with another driver."
                    });
                }

                const existingVehicleListing = await ListingMachine.findOne({
                    vehicleNumber: cleanVehicleNumber,
                    owner: { $ne: user._id }
                });
                if (existingVehicleListing) {
                    return res.status(400).json({
                        success: false,
                        message: "This Vehicle number is already registered in existing machine listings."
                    });
                }
            }


            // ------------------------------------------
            // UPDATE USER & STORE FIRST LISTING
            // ------------------------------------------

            user.fullName = fullName.trim();
            user.driverAddress = address.trim();
            user.location = address.trim();
            user.driverAadhaarNumber = cleanAadhaar;
            user.driverLicenseNumber = cleanLicense;

            if (latitude && !isNaN(Number(latitude))) {
                user.latitude = Number(latitude);
            }
            if (longitude && !isNaN(Number(longitude))) {
                user.longitude = Number(longitude);
            }

            user.driverVehicleType = effectiveCategory;
            user.driverVehicleNumber = cleanVehicleNumber || undefined;
            user.driverExperience = Number(experience) || 0;
            user.driverMessage = (description || message || "").trim();

            // Store complete first listing details to be auto-published on approval
            user.driverFirstListing = {
                title: (title || `${effectiveCategory} - ${fullName}`).trim(),
                category: effectiveCategory,
                price: Number(price) || 500,
                unit: unit || "Hour",
                power: Number(power) || 45,
                fuelType: fuelType || "Diesel",
                year: Number(year) || new Date().getFullYear(),
                vehicleNumber: cleanVehicleNumber || undefined,
                location: address.trim(),
                latitude: Number(latitude) || user.latitude || 28.6139,
                longitude: Number(longitude) || user.longitude || 77.2090,
                description: (description || message || `Service provided by experienced driver ${fullName}.`).trim()
            };


            // ------------------------------------------
            // CLOUDINARY IMAGE
            // ------------------------------------------

            const uploadedImageUrl =
                req.file.secure_url || req.file.url || req.file.path;
            const uploadedFilename =
                req.file.public_id || req.file.filename || "driver_equipment";

            user.driverEquipmentImage = {
                url: uploadedImageUrl,
                filename: uploadedFilename
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


            if (error.code === 11000) {
                const key = Object.keys(error.keyPattern || error.keyValue || {})[0];
                let fieldName = "information";
                if (key === "phone") fieldName = "Phone number";
                else if (key === "driverAadhaarNumber") fieldName = "Aadhaar Card number";
                else if (key === "driverLicenseNumber") fieldName = "Driving License (DL) number";
                else if (key === "driverVehicleNumber" || key === "vehicleNumber") fieldName = "Vehicle registration number";

                return res.status(400).json({
                    success: false,
                    message: `This ${fieldName} is already registered on the platform.`
                });
            }

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


            return res.status(400).json({

                success: false,

                message:
                    error.message || "Failed to submit Driver application."
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
                    "fullName phone role location latitude longitude driverApplicationStatus driverApplicationDate driverRejectionReason driverEquipmentImage driverVehicleType driverVehicleNumber driverExperience driverAddress driverMessage driverFirstListing driverAadhaarNumber driverLicenseNumber"
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