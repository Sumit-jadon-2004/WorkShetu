const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../Backend/models/BookingMachine.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

const oldEnum = `        enum: [
            "Pending",
            "Accepted",
            "Rejected",
            "Completed",
            "Cancelled"
        ],`;

const newEnum = `        enum: [
            "Pending",
            "Accepted",
            "Rejected",
            "Completed",
            "Cancelled",
            "Expired"
        ],`;

const oldDateBlock = `    bookingDate: {
        type: Date,
        default: Date.now,
        required : true
    },`;

const newDateBlock = `    bookingDate: {
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
    },`;

if (code.includes(oldEnum) && code.includes(oldDateBlock)) {
    code = code.replace(oldEnum, newEnum);
    code = code.replace(oldDateBlock, newDateBlock);
    fs.writeFileSync(targetPath, code, 'utf8');
    console.log('BookingMachine schema updated successfully.');
} else {
    console.error('Could not find target blocks in BookingMachine.js');
    process.exit(1);
}

