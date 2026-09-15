const { required } = require("joi");
const mongoose = require("mongoose");

const labourSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
        },

    name: {
        type: String,
        required: true,
    },

    labourType: {
        type: String,
        required: true,
        enum: [
            "Electrician",
            "Mechanical",
            "Tractor Driver",
            "Harvester Operator",
            "Loader Operator",
            "Truck Driver",
            "Welder",
            "Plumber",
            "Carpenter",
            "Painter",
            "Mason",
            "Farm Worker",
            "Irrigation Technician",
            "Spray Machine Operator",
            "Helper"
        ]
    },

    experience: {
        type: Number,
        default: 0
    },

    image: {
    url: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    }
},

    price: {
        type: Number,
        required: true,
    },

    location: {
        type: String,
        required: true,
    },
    latitude: {
        type: Number
    },

    longitude: {
        type: Number
    },
    phone: {
        type: String,
        required: true,
    },

    description: {
        type: String,
        required: true,
    },

    availability: {
        type: String,
        enum: ["Available", "Booked"],
        default: "Available"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Labour", labourSchema);