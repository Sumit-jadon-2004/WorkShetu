const fs = require("fs");
const file = "Backend/models/BookingMachine.js";
let content = fs.readFileSync(file, "utf8");

const target = "// Transport Booking Details";
const addition = `// Offer & Promotion Details
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

    // Transport Booking Details`;

if (!content.includes(target)) {
  console.error("Target not found!");
  process.exit(1);
}

content = content.replace(target, addition);
fs.writeFileSync(file, content, "utf8");
console.log("Updated BookingMachine.js successfully!");

