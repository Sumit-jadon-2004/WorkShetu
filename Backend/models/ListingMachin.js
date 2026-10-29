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
            "Harvester",
            "Loader"
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
        enum: ["Available", "Booked", "Hidden"],
        default: "Available"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

machineSchema.statics.getSupportedCategories = function () {
    return [...this.schema.path("category").enumValues];
};

machineSchema.statics.getAvailableCategoriesFromDB = async function () {
    const { getEligibleDriverIds } = require("../utils/driverEligibility.js");
    const eligibleDriverIds = await getEligibleDriverIds();
    const rawCategories = await this.distinct("category", {
        owner: { $in: eligibleDriverIds },
        availability: { $ne: "Hidden" },
    });

    const categoryMap = new Map();
    for (const cat of rawCategories) {
        if (typeof cat !== "string") continue;
        const trimmed = cat.trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!categoryMap.has(lower)) {
            categoryMap.set(lower, trimmed);
        }
    }
    return Array.from(categoryMap.values()).sort((a, b) => a.localeCompare(b));
};

const Machine = mongoose.models.Machine || mongoose.model("Machine", machineSchema);
Machine.getSupportedCategories = function () {
    return [...machineSchema.path("category").enumValues];
};
Machine.getAvailableCategoriesFromDB = function () {
    return Machine.schema.statics.getAvailableCategoriesFromDB.call(Machine);
};

module.exports = Machine;