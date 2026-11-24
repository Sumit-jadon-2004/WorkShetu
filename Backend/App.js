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

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection in server:", reason?.message || reason);
});

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
const { filterAndRankByLocation } = require("./utils/locationService.js");

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
const labourReviewsMapsRoutes =
    require("./routes/labourReviewsMaps.js");

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

// Trust reverse proxy (Render, Cloudflare, etc.) for HTTPS detection & secure cookies
app.set("trust proxy", 1);

const port =
    Number(process.env.PORT) || 5000;

let databaseReady = false;


const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.RENDER === "true" ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.RENDER_EXTERNAL_URL) ||
    Boolean(process.env.CLIENT_URL);

// ======================================================
// SESSION SECRET
// ======================================================

if (
    isProduction &&
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

const rawAllowedOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN.replace(/^https?:\/\//, "")}` : null,
    process.env.CUSTOM_DOMAIN ? `https://www.${process.env.CUSTOM_DOMAIN.replace(/^(https?:\/\/)?(www\.)?/, "")}` : null,
    "https://work-shetu.vercel.app",
    "https://work-shetu-klls.vercel.app",
    "http://localhost:5173",
    "http://localhost:5000",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
].filter(Boolean);

const allowedOrigins = rawAllowedOrigins.map((o) =>
    typeof o === "string" ? o.trim().replace(/\/+$/, "").toLowerCase() : o
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            const normalized = origin.trim().replace(/\/+$/, "").toLowerCase();
            if (allowedOrigins.includes(normalized)) return callback(null, true);
            // Allow Vercel preview domains e.g. https://*.vercel.app
            if (/^https:\/\/([a-z0-9-_.]+)\.vercel\.app$/i.test(normalized)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Cache-Control", "Pragma", "X-Session-ID"]
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

const signature = require("cookie-signature");

const sessionStore = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    dbName: "workshetu",
    collectionName: "sessions"
});

sessionStore.on("error", (sessionError) => {
    console.error("Session store connection error:", sessionError?.message || sessionError);
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

// Cross-origin session bridge: if third-party cookies are blocked by the browser,
// reconstruct the signed session cookie from Authorization: Bearer <sessionId> or X-Session-ID header.
app.use((req, res, next) => {
    const rawHeader = req.headers["x-session-id"] ||
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
            ? req.headers.authorization.slice(7).trim()
            : null);

    if (rawHeader && (!req.headers.cookie || !req.headers.cookie.includes("connect.sid="))) {
        const signed = "s:" + signature.sign(rawHeader, sessionSecret);
        req.headers.cookie = (req.headers.cookie ? req.headers.cookie + "; " : "") + "connect.sid=" + encodeURIComponent(signed);
    }
    next();
});

app.use(
    session({

        secret:
            sessionSecret,

        store: sessionStore,

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            sameSite:
                isProduction
                    ? "none"
                    : "lax",

            secure:
                isProduction,

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
    labourReviewsMapsRoutes
);

app.use(
    "/api/labour",
    labourRoutes
);

app.use(
    "/api/Labour",
    labourReviewsMapsRoutes
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
    ["/health", "/api/health"],
    (req, res) => {
        const isDbConnected = databaseReady && mongoose.connection.readyState === 1;
        res.status(isDbConnected ? 200 : 503).json({
            status: isDbConnected ? "ok" : "degraded",
            service: "workshetu-api",
            database: isDbConnected ? "connected" : "disconnected",
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime())
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
                message: "Database is not connected."
            });
        }

        try {
            const {
                latitude,
                longitude,
                city,
                location,
                category,
                search,
                radiusKm = 5
            } = req.query;

            // Cache suspended/suspected owner exclusions for 30s to eliminate redundant full table scans on users
            if (!global.__workshetu_excludedOwnerCache || Date.now() - global.__workshetu_excludedOwnerTime > 30000) {
                const suspendedOrSuspected = await User.find({
                    $or: [
                        { isActive: false },
                        { driverApplicationStatus: "Suspected" }
                    ]
                }).select("_id").lean();
                global.__workshetu_excludedOwnerCache = suspendedOrSuspected.map((u) => u._id);
                global.__workshetu_excludedOwnerTime = Date.now();
            }
            const excludedOwnerIds = global.__workshetu_excludedOwnerCache || [];

            const filter = {
                owner: { $nin: excludedOwnerIds },
                availability: { $ne: "Hidden" }
            };

            if (category && category !== "All" && category !== "all") {
                filter.category = category;
            }

            if (search && typeof search === "string" && search.trim()) {
                const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                filter.$or = [
                    { title: { $regex: term, $options: "i" } },
                    { category: { $regex: term, $options: "i" } },
                    { description: { $regex: term, $options: "i" } },
                    { location: { $regex: term, $options: "i" } }
                ];
            }

            const rawMachines = await Machine
                .find(filter)
                .select("title category vehicleNumber image price unit power fuelType year location latitude longitude availability owner createdAt")
                .populate("owner", "fullName location driverApplicationStatus")
                .sort({ createdAt: -1 })
                .lean();

            const userLat = latitude != null && latitude !== ""
                ? Number(latitude)
                : req.user?.latitude != null ? Number(req.user.latitude) : null;
            const userLon = longitude != null && longitude !== ""
                ? Number(longitude)
                : req.user?.longitude != null ? Number(req.user.longitude) : null;
            const userCity = city || location || req.user?.location || "";

            const userLocation = {
                latitude: userLat,
                longitude: userLon,
                city: userCity,
                location: userCity
            };

            const parsedRadius = Math.min(Math.max(Number(radiusKm) || 5, 1), 200);

            const locationResult = filterAndRankByLocation(rawMachines, {
                userLocation,
                radiusKm: parsedRadius,
                locationField: "location",
                progressiveRadius: true
            });

            if (locationResult.locationRequired) {
                return res.json({
                    success: true,
                    locationRequired: true,
                    message: "Location permission required. Enable GPS to view machines near you.",
                    userCity: "",
                    userCoordinates: null,
                    radiusKm: parsedRadius,
                    appliedRadiusKm: parsedRadius,
                    initialRadiusKm: parsedRadius,
                    isExpandedRadius: false,
                    nearbyCount: 0,
                    sameCityCount: 0,
                    nearbyMachines: [],
                    sameCityMachines: [],
                    machines: []
                });
            }

            return res.json({
                success: true,
                locationRequired: false,
                userCity: locationResult.userCity,
                userCoordinates: locationResult.userCoordinates,
                radiusKm: locationResult.appliedRadiusKm || locationResult.radiusKm,
                appliedRadiusKm: locationResult.appliedRadiusKm || locationResult.radiusKm,
                initialRadiusKm: locationResult.initialRadiusKm || parsedRadius,
                isExpandedRadius: Boolean(locationResult.isExpandedRadius),
                nearbyCount: locationResult.nearbyCount,
                sameCityCount: locationResult.sameCityCount,
                total: locationResult.total,
                nearbyMachines: locationResult.nearby,
                sameCityMachines: locationResult.sameCity,
                machines: locationResult.merged
            });
        } catch (error) {
            console.error("Failed to load machines:", error.message);
            return res.status(500).json({
                message: "Unable to load machines."
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
