const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        machine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Machine",
            index: true
        },
        labour: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Labour",
            index: true
        },
        serviceType: {
            type: String,
            enum: ["Machine", "Labour", "Transport"],
            default: "Machine",
            index: true
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Booking",
            sparse: true
        },
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        reviewerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        text: {
            type: String,
            trim: true,
            maxlength: 500
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        images: [{
            type: String,
            trim: true,
            maxlength: 500
        }],
        status: {
            type: String,
            enum: ["Visible", "Hidden", "Pending", "Rejected"],
            default: "Visible"
        },
        verifiedBooking: {
            type: Boolean,
            default: false
        },
        reported: {
            type: Boolean,
            default: false
        },
        reportCount: {
            type: Number,
            default: 0,
            min: 0
        },
        reportReason: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },
        isHidden: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

reviewSchema.index(
    { bookingId: 1 },
    { unique: true, sparse: true, name: "unique_review_per_booking" }
);

module.exports = mongoose.model("Review", reviewSchema);
