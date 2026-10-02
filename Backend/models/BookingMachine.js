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
    required: function () {
        return this.requestType === "Labour";
    }
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
            "Cancelled"
        ],
        default: "Pending"
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

module.exports = mongoose.model("Booking", bookingSchema);