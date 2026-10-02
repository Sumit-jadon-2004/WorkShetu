const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        machine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Machine",
            required: true,
            index: true
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
            required: true,
            min: 1,
            max: 5
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
