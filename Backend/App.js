require("dotenv").config({
    path: require("path").join(__dirname, ".env")
});

const cors = require("cors");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Machine =
    require("./models/ListingMachin.js");

const User =
    require("./models/Owner.js");

const { isDriverEligible, getEligibleDriverIds } =
    require("./utils/driverEligibility.js");

const Review =
    require("./models/Review.js");

const Booking = require("./models/BookingMachine.js");
const GroupBooking = require("./models/GroupBooking.js");
const {
    GROUP_MIN_LAND_AREA,
    GROUP_DISCOUNT_PERCENT,
    SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
    HIGHER_SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
    HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA
} = require("./utils/groupBooking.js");
const { cloudinary } = require("./Cloudinary.js");

const groupBookings =
    require("./routes/groupBookings.js");

const auth =
    require("./routes/auth.js");

const driverRoutes =
    require("./routes/Driver.js");

const adminDriverRoutes =
    require("./routes/adminDriver.js");

const adminDashboardRoutes =
    require("./routes/adminDashboard.js");

const adminUsersRoutes =
    require("./routes/adminUsers.js");

const adminListingsRoutes =
    require("./routes/adminListings.js");

const adminBookingsRoutes =
    require("./routes/adminBookings.js");

const adminReviewsRoutes =
    require("./routes/adminReviews.js");

const adminComplaintsRoutes =
    require("./routes/adminComplaints.js");

const adminAnalyticsRoutes =
    require("./routes/adminAnalytics.js");

const adminSettingsRoutes =
    require("./routes/adminSettings.js");

const adminOffersRoutes =
    require("./routes/adminOffers.js");

const publicOffersRoutes =
    require("./routes/publicOffers.js");

const chatRoutes =
    require("./routes/chat.js");

const aiRoutes =
    require("./routes/aiAssistant.js");

const creditsRoutes =
    require("./routes/credits.js");

const labourRoutes =
    require("./routes/labour.js");

const adminLabourRoutes =
    require("./routes/adminLabour.js");

const { upload } =
    require("./middleware/upload.js");

const {
    isLoggedIn,
    isDriver
} = require("./middleware/auth.js");

const passport =
    require("./config/passport.js");


const app = express();

const port =
    Number(process.env.PORT) || 5000;

let databaseReady = false;


// ======================================================
// SESSION SECRET
// ======================================================

if (
    process.env.NODE_ENV ===
    "production" &&
    !process.env.SESSION_SECRET
) {

    throw new Error(
        "SESSION_SECRET must be configured."
    );

}


const sessionSecret =
    process.env.SESSION_SECRET ||
    "workshetu-development-session-secret-change-me";


// ======================================================
// SECURITY
// ======================================================

app.use(helmet());


// ======================================================
// CORS
// ======================================================

app.use(
    cors({

        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",

        credentials: true

    })
);


// ======================================================
// BODY PARSER
// ======================================================

app.use(
    express.json()
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ======================================================
// SESSION
// ======================================================

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    dbName: "workshetu",
    collectionName: "sessions"
});

// A request can finish after logout (or after its session expires), when the
// session document has already been removed. Treat only that missing-document
// touch as a no-op; real Mongo/store errors should still reach the error handler.
const touchSession = sessionStore.touch.bind(sessionStore);
sessionStore.touch = (sessionId, sessionData, callback) => {
    touchSession(sessionId, sessionData, (error) => {
        if (error?.message === "Unable to find the session to touch") {
            return callback(null);
        }
        return callback(error);
    });
};

app.use(
    session({

        secret:
            sessionSecret,

        store: sessionStore,

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            sameSite: "lax",

            secure:
                process.env.NODE_ENV ===
                "production",

            maxAge:
                7 *
                24 *
                60 *
                60 *
                1000

        }

    })
);


// ======================================================
// PASSPORT
// ======================================================

app.use(
    passport.initialize()
);

app.use(
    passport.session()
);


// ======================================================
// ROUTES
// ======================================================

app.use(
    "/api/auth",
    auth
);


// DRIVER ROUTES
app.use(
    "/api/driver",
    driverRoutes
);


// ADMIN DRIVER ROUTES
app.use(
    "/api/admin",
    adminDriverRoutes
);

app.use(
    "/api/admin",
    adminDashboardRoutes
);

app.use(
    "/api/admin",
    adminUsersRoutes
);

app.use(
    "/api/admin",
    adminListingsRoutes
);

app.use(
    "/api/admin",
    adminBookingsRoutes
);

app.use(
    "/api/admin",
    adminReviewsRoutes
);

app.use(
    "/api/admin",
    adminComplaintsRoutes
);

app.use(
    "/api/admin",
    adminAnalyticsRoutes
);

app.use(
    "/api/admin",
    adminSettingsRoutes
);

app.use(
    "/api/admin",
    adminOffersRoutes
);

app.use(
    "/api/admin/labour",
    adminLabourRoutes
);

app.use(
    "/api/offers",
    publicOffersRoutes
);

app.use(
    "/api/chat",
    chatRoutes
);

app.use(
    "/api/ai",
    aiRoutes
);

app.use(
    "/api/credits",
    creditsRoutes
);

app.use(
    "/api/labour",
    labourRoutes
);

app.use(
    "/api/Labour",
    labourRoutes
);


// GROUP BOOKINGS
app.use(
    "/api/group-bookings",
    groupBookings
);

app.use(
    "/api/bookings",
    groupBookings
);


// ======================================================
// HEALTH
// ======================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            database:
                databaseReady
                    ? "connected"
                    : "disconnected"

        });

    }
);


// ======================================================
// MACHINES
// ======================================================

app.get(
    "/api/machine",
    async (req, res) => {

        if (!databaseReady) {

            return res.status(503).json({

                message:
                    "Database is not connected."

            });

        }


        try {

            const suspendedOrSuspected = await User.find({
                $or: [
                    { isActive: false },
                    { driverApplicationStatus: "Suspected" }
                ]
            }).select("_id");
            const excludedOwnerIds = suspendedOrSuspected.map((u) => u._id);

            const machines =
                await Machine
                    .find({
                        owner: { $nin: excludedOwnerIds },
                        availability: { $ne: "Hidden" }
                    })
                    .populate("owner", "fullName location driverApplicationStatus")
                    .sort({
                        createdAt: -1
                    });


            return res.json(
                machines
            );


        } catch (error) {

            console.error(
                "Failed to load machines:",
                error.message
            );


            return res.status(500).json({

                message:
                    "Unable to load machines."

            });

        }

    }
);


// ======================================================
// DATABASE
// ======================================================

async function connectDatabase() {

    if (!process.env.MONGO_URL) {

        throw new Error(
            "MONGO_URL is not configured."
        );

    }


    try {

        await mongoose.connect(
            process.env.MONGO_URL,
            {

                dbName:
                    "workshetu",

                serverSelectionTimeoutMS:
                    30000

            }
        );


        databaseReady =
            true;


        console.log(
            "Connected to the workshetu database."
        );


    } catch (error) {

        databaseReady =
            false;


        console.error(
            "Database connection failed:",
            error.message
        );


        setTimeout(
            connectDatabase,
            10000
        );

    }

}


connectDatabase();


// ======================================================
// MACHINE DETAILS
// ======================================================

app.get("/api/machine/mine", isLoggedIn, isDriver, async (req, res) => {
    try {
        const machines = await Machine.find({ owner: req.user._id }).sort({ createdAt: -1 });
        return res.json(machines);
    } catch (error) {
        return res.status(500).json({ message: "Unable to load your listings." });
    }
});

app.get(
    "/api/machine/:id",
    async (req, res) => {

        if (!databaseReady) {

            return res.status(503).json({

                message:
                    "Database is not connected."

            });

        }


        try {

            const machine =
                await Machine.findById(
                    req.params.id
                ).populate(
                    "owner",
                    "fullName phone email role location driverApplicationStatus profileImage driverExperience driverVehicleNumber isActive"
                );


            if (!machine) {

                return res.status(404).json({

                    message:
                        "Machine not found."

                });

            }

            const owner = machine.owner;
            if (machine.availability === "Hidden" || (owner && (owner.isActive === false || owner.driverApplicationStatus === "Suspected"))) {
                return res.status(404).json({
                    message: "This machine listing is currently unavailable.",
                    unavailable: true
                });
            }

            const machineObj = machine.toObject();

            // Strict Driver Phone Privacy:
            // The Farmer must NOT see the Driver's phone number before that booking is accepted.
            let canViewDriverPhone = false;
            if (req.user && req.user._id) {
                const currentUserId = String(req.user._id);
                const isOwnerRequester = owner && String(owner._id) === currentUserId;
                const isAdminRequester = req.user.role === "Admin" || req.user.role === "admin";
                if (isOwnerRequester || isAdminRequester) {
                    canViewDriverPhone = true;
                } else {
                    const acceptedBooking = await Booking.findOne({
                        itemId: machine._id,
                        customer: req.user._id,
                        status: { $in: ["Accepted", "Completed"] }
                    }).select("_id");
                    if (acceptedBooking) {
                        canViewDriverPhone = true;
                    }
                }
            }

            // Normalized driver & owner objects
            let driverName = "Driver information unavailable";
            let isVerified = false;
            let driverLocation = machineObj.location || "";
            let driverPhone = "";
            let driverExperience = 0;
            let profileImage = null;
            let driverVehicleNumber = "";

            if (owner && typeof owner === "object") {
                const hasName = Boolean(owner.fullName && String(owner.fullName).trim());
                if (hasName) {
                    driverName = String(owner.fullName).trim();
                    isVerified = owner.driverApplicationStatus === "Approved";
                    driverLocation = owner.location || machineObj.location || "";
                    driverPhone = canViewDriverPhone ? (owner.phone || "") : "";
                    driverExperience = owner.driverExperience || 0;
                    profileImage = owner.profileImage || null;
                    driverVehicleNumber = owner.driverVehicleNumber || machineObj.vehicleNumber || "";
                }
            }

            const driverInfo = {
                _id: owner?._id || null,
                fullName: driverName,
                name: driverName,
                phone: driverPhone,
                canViewPhone: canViewDriverPhone,
                location: driverLocation,
                driverApplicationStatus: owner?.driverApplicationStatus || "None",
                isVerified,
                driverExperience,
                profileImage,
                driverVehicleNumber
            };

            machineObj.owner = driverInfo;
            machineObj.driver = driverInfo;
            machineObj.canViewDriverPhone = canViewDriverPhone;

            return res.json({
                ...machineObj,
                pricingRules: {
                    minimumLandArea: GROUP_MIN_LAND_AREA,
                    groupDiscountPercent: GROUP_DISCOUNT_PERCENT,
                    extraChargePerMissingBigha: SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
                    higherExtraChargePerMissingBigha: HIGHER_SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
                    higherExtraChargeAfterMissingBigha: HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA
                }
            });


        } catch (error) {

            return res.status(400).json({

                message:
                    "Invalid machine id."

            });

        }

    }
);


// ======================================================
// REVIEWS
// ======================================================

app.get(
    "/api/machine/:id/reviews",
    async (req, res) => {

        try {

            const reviews =
                await Review
                    .find({
                        machine:
                            req.params.id
                    })
                    .populate("author", "_id fullName")
                    .sort({
                        createdAt: -1
                    });


            return res.json(
                reviews
            );


        } catch (error) {

            return res.status(400).json({

                message:
                    "Unable to load reviews."

            });

        }

    }
);


app.post(
    "/api/machine/:id/reviews",
    isLoggedIn,
    async (req, res) => {

        try {

            const review =
                await Review.create({

                    machine:
                        req.params.id,

                    author:
                        req.user._id,

                    reviewerName:
                        req.user.fullName,

                    rating:
                        req.body.rating,

                    text:
                        req.body.text

                });


            return res.status(201).json(
                review
            );


        } catch (error) {

            return res.status(400).json({

                message:
                    "Review could not be added."

            });

        }

    }
);


app.put(
    "/api/reviews/:reviewId",
    isLoggedIn,
    async (req, res) => {

        try {

            const review =
                await Review.findOneAndUpdate(

                    {
                        _id: req.params.reviewId,
                        author: req.user._id
                    },

                    {

                        reviewerName:
                            req.user.fullName,

                        rating:
                            req.body.rating,

                        text:
                            req.body.text

                    },

                    {
                        new: true,
                        runValidators: true
                    }

                );


            if (!review) {

                return res.status(404).json({

                    message:
                        "Review not found."

                });

            }


            return res.json(
                review
            );


        } catch (error) {

            return res.status(400).json({

                message:
                    "Review could not be updated."

            });

        }

    }
);


app.delete(
    "/api/reviews/:reviewId",
    isLoggedIn,
    async (req, res) => {

        try {

            const review =
                await Review.findOneAndDelete({
                    _id: req.params.reviewId,
                    author: req.user._id
                });


            if (!review) {

                return res.status(404).json({

                    message:
                        "Review not found."

                });

            }


            return res.status(204).send();


        } catch (error) {

            return res.status(400).json({

                message:
                    "Review could not be deleted."

            });

        }

    }
);


// ======================================================
// ERROR HANDLER
// ======================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Request failed:",
            error.message
        );


        if (res.headersSent) {

            return next(error);

        }


        return res.status(500).json({

            success: false,

            message:
                "An unexpected server error occurred."

        });

    }
);


app.post(
    "/api/machine",
    isLoggedIn,
    isDriver,
    upload.single("image"),
    async (req, res) => {
        try {
            if (!isDriverEligible(req.user)) {
                return res.status(403).json({
                    success: false,
                    message: "Your driver account is not approved or is currently suspended/under review."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Machine image is required."
                });
            }

            const machine = await Machine.create({
                owner: req.user._id,
                title: String(req.body.title || "").trim(),
                category: req.body.category,
                vehicleNumber: req.body.vehicleNumber || undefined,
                image: {
                    url: req.file.path,
                    filename: req.file.filename
                },
                price: Number(req.body.price),
                unit: req.body.unit,
                power: req.body.power ? Number(req.body.power) : undefined,
                fuelType: req.body.fuelType || undefined,
                year: Number(req.body.year),
                location: String(req.body.location || "").trim(),
                latitude: Number(req.body.latitude),
                longitude: Number(req.body.longitude),
                phone: req.user.phone,
                description: String(req.body.description || "").trim()
            });

            return res.status(201).json({
                success: true,
                message: "Machine listing added successfully.",
                machine
            });
        } catch (error) {
            console.error("CREATE MACHINE LISTING:", error);
            return res.status(400).json({
                success: false,
                message: error.message || "Machine listing could not be created."
            });
        }
    }
);


app.put("/api/machine/:id", isLoggedIn, isDriver, upload.single("image"), async (req, res) => {
    try {
        if (!isDriverEligible(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Your driver account is not approved or is currently suspended/under review."
            });
        }

        const machine = await Machine.findOne({ _id: req.params.id, owner: req.user._id });
        if (!machine) return res.status(404).json({ message: "Listing not found." });

        const fields = {
            title: String(req.body.title || "").trim(),
            category: req.body.category,
            vehicleNumber: String(req.body.vehicleNumber || "").trim() || undefined,
            price: Number(req.body.price),
            unit: req.body.unit,
            power: req.body.power ? Number(req.body.power) : undefined,
            fuelType: req.body.fuelType || undefined,
            year: Number(req.body.year),
            location: String(req.body.location || "").trim(),
            latitude: Number(req.body.latitude),
            longitude: Number(req.body.longitude),
            description: String(req.body.description || "").trim(),
        };

        const oldImageFilename = machine.image?.filename;
        machine.set(fields);
        if (req.file) {
            machine.image = { url: req.file.path, filename: req.file.filename };
        }
        await machine.save();

        if (req.file && oldImageFilename) {
            cloudinary.uploader.destroy(oldImageFilename).catch((imageError) => {
                console.error("Could not remove replaced listing image:", imageError.message);
            });
        }
        return res.json({ success: true, machine });
    } catch (error) {
        return res.status(400).json({ message: error.message || "Listing could not be updated." });
    }
});

app.delete("/api/machine/:id", isLoggedIn, isDriver, async (req, res) => {
    try {
        const machine = await Machine.findOne({ _id: req.params.id, owner: req.user._id });
        if (!machine) return res.status(404).json({ message: "Listing not found." });

        const [activeBooking, activeGroup] = await Promise.all([
            Booking.exists({ itemId: machine._id, status: { $in: ["Pending", "Accepted"] } }),
            GroupBooking.exists({ listing: machine._id, status: { $in: ["Forming", "Ready", "RequestSent", "Accepted"] } }),
        ]);
        if (activeBooking || activeGroup) {
            return res.status(409).json({ message: "This listing has active booking requests and cannot be deleted yet." });
        }

        await machine.deleteOne();
        await Review.deleteMany({ machine: machine._id });
        if (machine.image?.filename) {
            cloudinary.uploader.destroy(machine.image.filename).catch((imageError) => {
                console.error("Could not remove deleted listing image:", imageError.message);
            });
        }
        return res.status(204).send();
    } catch (error) {
        return res.status(400).json({ message: "Listing could not be deleted." });
    }
});


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.status || err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || "An unexpected error occurred. Please try again.",
    });
});


// ======================================================
// START SERVER
// ======================================================

app.listen(
    port,
    () => {

        console.log(
            `API server is running on http://localhost:${port}`
        );

    }
);
