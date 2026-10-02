require("dotenv").config();

const cors = require("cors");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const helmet = require("helmet");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Machine =
    require("./models/ListingMachin.js");

const Review =
    require("./models/Review.js");

const groupBookings =
    require("./routes/groupBookings.js");

const auth =
    require("./routes/auth.js");

const driverRoutes =
    require("./routes/Driver.js");

const adminDriverRoutes =
    require("./routes/adminDriver.js");

const chatRoutes =
    require("./routes/chat.js");

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

app.use(
    session({

        secret:
            sessionSecret,

        store:
            MongoStore.create({

                mongoUrl:
                    process.env.MONGO_URL,

                dbName:
                    "workshetu",

                collectionName:
                    "sessions"

            }),

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
    "/api/chat",
    chatRoutes
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

            const machines =
                await Machine
                    .find()
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
                    5000

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
                );


            if (!machine) {

                return res.status(404).json({

                    message:
                        "Machine not found."

                });

            }


            return res.json(
                machine
            );


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
                        req.body.reviewerName,

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
                            req.body.reviewerName,

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