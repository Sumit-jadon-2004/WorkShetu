const mongoose = require("mongoose");

const LABOUR_CATEGORIES = [
    "Mistri & Construction",
    "Engineer",
    "Technician",
    "Mechanic",
    "Electrician",
    "Plumber",
    "Carpenter",
    "Painter",
    "Beldar",
    "Agricultural Labour",
    "General Labour",
    "Other Professional",
    "General agricultural labour",
    "Sowing and planting",
    "Harvesting",
    "Irrigation assistance",
    "Weeding and field preparation",
    "Fruit and vegetable picking",
    "Loading and unloading",
    "Other skilled and general labour services"
];

const PRICING_UNITS = ["per day", "per hour", "per acre", "per bigha"];
const LABOUR_STATUSES = ["Approved", "Pending", "Rejected"];

const labourSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    labourType: {
        type: String,
        required: true,
        trim: true
    },

    subProfession: {
        type: String,
        trim: true,
        maxlength: 100,
        default: ""
    },

    category: {
        type: String,
        enum: LABOUR_CATEGORIES,
        default: "General agricultural labour"
    },

    skills: [{
        type: String,
        trim: true
    }],

    experience: {
        type: Number,
        default: 0,
        min: 0
    },

    qualification: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
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
        min: 0
    },

    wageRate: {
        type: Number,
        min: 0
    },

    pricingUnit: {
        type: String,
        enum: PRICING_UNITS,
        default: "per day"
    },

    location: {
        type: String,
        required: true,
        trim: true
    },

    serviceArea: {
        type: String,
        trim: true,
        default: ""
    },

    serviceRadiusKm: {
        type: Number,
        default: 25,
        min: 1,
        max: 200
    },

    availabilityDays: [{
        type: String,
        trim: true
    }],

    emergencyAvailability: {
        type: Boolean,
        default: false
    },

    profileVisibility: {
        type: Boolean,
        default: true
    },

    serviceLocation: {
        type: String,
        trim: true,
        default: ""
    },

    latitude: {
        type: Number
    },

    longitude: {
        type: Number
    },

    mapVisibilityConsent: {
        type: Boolean,
        default: false
    },

    publicLocation: {
        type: String,
        trim: true,
        maxlength: 200,
        default: ""
    },

    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    phone: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        required: true,
        trim: true
    },

    bookingInstructions: {
        type: String,
        trim: true,
        default: "Book at least 24 hours in advance. Provide clear farm location and task details."
    },

    availability: {
        type: String,
        enum: ["Available", "Booked", "Hidden"],
        default: "Available"
    },

    isAvailable: {
        type: Boolean,
        default: true
    },

    status: {
        type: String,
        enum: LABOUR_STATUSES,
        default: "Approved"
    },

    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },

    reviewCount: {
        type: Number,
        default: 0,
        min: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-save synchronization hook between labourType/category and price/wageRate
labourSchema.pre("save", function() {
    if (this.category && !this.labourType) {
        this.labourType = this.category;
    } else if (this.labourType && !this.category) {
        this.category = this.labourType;
    }
    if (this.price != null && this.wageRate == null) {
        this.wageRate = this.price;
    } else if (this.wageRate != null && this.price == null) {
        this.price = this.wageRate;
    }
    if (this.availability === "Available") {
        this.isAvailable = true;
    } else if (this.availability === "Booked" || this.availability === "Hidden") {
        this.isAvailable = false;
    }
});

// Static properties
labourSchema.statics.CATEGORIES = LABOUR_CATEGORIES;
labourSchema.statics.PRICING_UNITS = PRICING_UNITS;
labourSchema.statics.STATUSES = LABOUR_STATUSES;

// Indexes for fast searching and filtering
labourSchema.index({ availability: 1, status: 1 });
labourSchema.index({ availability: 1, status: 1, labourType: 1 });
labourSchema.index({ availability: 1, status: 1, latitude: 1, longitude: 1 });
labourSchema.index({ owner: 1, availability: 1 });
labourSchema.index({ labourType: 1 });
labourSchema.index({ category: 1 });
labourSchema.index({ price: 1 });
labourSchema.index({ experience: 1 });
labourSchema.index({ location: "text", name: "text", description: "text" });

const Labour = mongoose.model("Labour", labourSchema);
Labour.LABOUR_CATEGORIES = LABOUR_CATEGORIES;
Labour.PRICING_UNITS = PRICING_UNITS;
Labour.STATUSES = LABOUR_STATUSES;

module.exports = Labour;
