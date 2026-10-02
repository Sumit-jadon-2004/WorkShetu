const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongooseModule = require("passport-local-mongoose");

const passportLocalMongoose =
    passportLocalMongooseModule.default || passportLocalMongooseModule;


const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: [
                /^[6-9]\d{9}$/,
                "Invalid Indian mobile number"
            ]
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Invalid email address"
            ]
        },

        role: {
            type: String,
            enum: ["Farmer", "Driver"],
            default: "Farmer",
            required: true
        },

        isAdmin: {
            type: Boolean,
            default: false
        },

        // =========================
        // DRIVER APPLICATION
        // =========================

        driverApplicationStatus: {
            type: String,
            enum: [
                "None",
                "Pending",
                "Approved",
                "Rejected"
            ],
            default: "None"
        },

        driverApplicationDate: {
            type: Date
        },

        driverRejectionReason: {
            type: String,
            trim: true,
            maxlength: 500
        },

        driverEquipmentImage: {
            url: {
                type: String,
                trim: true
            },

            filename: {
                type: String,
                trim: true
            }
        },

        driverVehicleType: {
            type: String,
            trim: true,
            maxlength: 100
        },

        driverVehicleNumber: {
            type: String,
            trim: true,
            maxlength: 50
        },

        driverExperience: {
            type: Number,
            min: 0
        },

        driverAddress: {
            type: String,
            trim: true,
            maxlength: 300
        },

        driverMessage: {
            type: String,
            trim: true,
            maxlength: 1000
        },

        // =========================
        // USER PROFILE
        // =========================

        profileImage: {
            url: {
                type: String,
                trim: true
            },

            filename: {
                type: String,
                trim: true
            }
        },

        location: {
            type: String,
            trim: true,
            maxlength: 200
        },

        latitude: {
            type: Number,
            min: -90,
            max: 90
        },

        longitude: {
            type: Number,
            min: -180,
            max: 180
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);


// Passport
userSchema.plugin(passportLocalMongoose, {
    usernameField: "phone"
});


const User = mongoose.model("User", userSchema);

module.exports = User;