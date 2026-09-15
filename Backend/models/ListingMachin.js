const mongoose = require("mongoose");
const User = require("./Owner.js");
const Schema = mongoose.Schema;
const machineSchema = new Schema({

    owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
    },

    title: {
        type: String,
        required: true,
    },

    category: {
        type: String,
        enum: [
            "Tractor",
            "Cultivator",
            "Rotavator",
            "Harrow",
            "Harvester"
        ],
        required: true,
    },

    vehicleNumber: {
    type: String,
    uppercase: true,
    trim: true,
    unique: true,
    sparse: true,
    match: [/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/, "Invalid Vehicle Number"],
    required: function () {
        return (
            this.category === "Tractor" ||
            this.category === "Harvester"
        );
    }
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

    unit: {
        type : String,
        enum: ["Bigha","Acre","Hectare","Hour","Day","Trip"],
        required : true
    },

    power : {
        type : Number,
        required: function () {
        return (
            this.category === "Tractor" ||
            this.category === "Harvester"
        );
    }
    },

    fuelType: {
        type: String,
        required: function () {
        return (
            this.category === "Tractor" ||
            this.category === "Harvester"
        );
    }
    },

    year: {
        type :Number,
        min: 1980,
        max: new Date().getFullYear() + 1,
        required : true
    },

    location: {
        type: String,
        required: true,
    },

    latitude: {
        type: Number,
        required : true
    },

    longitude: {
        type: Number,
        required : true
    },

    phone: {
        type: String,
        match: [/^[0-9]{10}$/, "Invalid Phone Number"],
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

module.exports = mongoose.model("Machine", machineSchema);