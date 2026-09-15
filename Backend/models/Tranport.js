const mongoose = require("mongoose");

const transportSchema = new mongoose.Schema({
    owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
            },

    vehicleName: {
        type: String,
        required: true,
    },

    vehicleType: {
        type: String,
        required: true,
        enum: [
            "Truck",
            "Loader",
            "Mini Truck",
            "Pickup",
            "Tempo"
        ]
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

    capacity: String,

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

module.exports = mongoose.model("Transport", transportSchema);