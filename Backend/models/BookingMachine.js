const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({

    requestType: {
        type: String,
        enum: ["Machine", "Labour", "Transport"],
        required: true
    },

    bookingType: {
        type: String,
        enum: ["Single", "Group"],
        default: "Single",
        required: true
    },

    groupBookingId: {
        type: Schema.Types.ObjectId,
        ref: "GroupBooking",
        default: null
    },

    itemId: {
        type: Schema.Types.ObjectId,
        refPath: "requestType",
        required: true
    },

    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    customer: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    customerName: {
        type: String,
        required: true
    },

    customerPhone: {
        type: String,
        required: true
    },

    customerLocation: {
        type: String,
        required: true
    },

    customerLatitude: {
        type: Number,
    },

    customerLongitude: {
        type: Number,
    },

    // Machine Booking Details
   landArea: {
    type: Number,
    required: function () {
        return this.requestType === "Machine";
    }
},

    areaUnit: {
        type: String,
        enum: ["Bigha", "Acre", "Hectare"]
    },

    workType: {
    type: String,
    required: function () {
        return this.requestType === "Machine";
    }
},

    requiredDate: {
    type: Date,
    required: function () {
        return this.requestType === "Machine";
    }
},
totalPrice: {
    type: Number,
    required: function () {
        return this.requestType === "Machine";
    }
},

    basePrice: {
        type: Number,
        required: function () {
            return this.requestType === "Machine";
        },
        min: 0
    },

    extraCharge: {
        type: Number,
        default: 0,
        min: 0
    },

    discountPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },

    discountAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    originalPrice: {
        type: Number,
        required: function () {
            return this.requestType === "Machine";
        },
        min: 0
    },

    finalPrice: {
        type: Number,
        required: function () {
            return this.requestType === "Machine";
        },
        min: 0
    },

    // Offer & Promotion Details
    offerId: {
        type: Schema.Types.ObjectId,
        ref: "Offer",
        default: null
    },
    offerCode: {
        type: String,
        default: null,
        trim: true
    },
    offerTitle: {
        type: String,
        default: null
    },
    offerDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    driverPayout: {
        type: Number,
        default: 0,
        min: 0
    },
    platformPromoExpense: {
        type: Number,
        default: 0,
        min: 0
    },
    fundingSource: {
        type: String,
        enum: ["WorkShetu", "Driver", "Shared"],
        default: "WorkShetu"
    },

    // Transport Booking Details
    goodsType: {
    type: String,
    required: function () {
        return this.requestType === "Transport";
    }
},

    weight: {
    type: Number,
    required: function () {
        return this.requestType === "Transport";
    }
},

    pickupLocation: {
    type: String,
    required: function () {
        return this.requestType === "Transport";
    }
},

    dropLocation: {
    type: String,
    required: function () {
        return this.requestType === "Transport";
    }
},

    // Labour Booking Details
    daysRequired: {
        type: Number,
        default: 1,
        min: 1
    },

    workerCount: {
        type: Number,
        default: 1,
        min: 1
    },

    taskCategory: {
        type: String,
        default: ""
    },

    taskDescription: {
        type: String,
        default: ""
    },

    unitPrice: {
        type: Number,
        default: 0
    },

    pricingUnit: {
        type: String,
        default: "per day"
    },

    message: {
        type: String,
        default: ""
    },

    bookingDate: {
        type: Date,
        default: Date.now,
        required : true
    },

    preferredTime: {
        type: String,
        default: ""
    },

    responseDeadline: {
        type: Date,
        default: null
    },

    isInstantBooking: {
        type: Boolean,
        default: false
    },

    originalBookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        default: null
    },

    cancellationReason: {
        type: String,
        default: ""
    },

    earning: {
        type: Number,
        default: 0
    },

    isHistory: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: [
            "Pending",
            "Accepted",
            "Rejected",
            "Completed",
            "Cancelled",
            "Expired"
        ],
        default: "Pending"
    },

    completedAt: {
        type: Date,
        default: null
    },

    statusChangedAt: {
        type: Date,
        default: null
    },

    purgeAt: {
        type: Date,
        default: null
    },

    historyExpiresAt: {
        type: Date,
        default: null
    },

    completionOtp: {
        type: String,
        select: false
    },

    completionOtpExpiresAt: {
        type: Date,
        select: false
    },

    otpVerified: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

bookingSchema.index({ completedAt: 1 }, { expireAfterSeconds: 15 * 24 * 60 * 60, sparse: true });
bookingSchema.index({ historyExpiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
bookingSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model("Booking", bookingSchema);
