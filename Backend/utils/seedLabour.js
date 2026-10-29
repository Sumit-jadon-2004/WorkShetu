const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User = require("../models/Owner.js");
const Labour = require("../models/Labour.js");

const sampleWorkers = [
  {
    name: "Rajesh Yadav",
    labourType: "Tractor Driver",
    experience: 6,
    price: 650,
    location: "Karnal, Haryana",
    phone: "9876543211",
    description: "Experienced 4WD tractor operator skilled with rotavator, cultivator, leveller, and seed drill. 6+ years experience across Haryana & Punjab.",
    image: {
      url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      filename: "worker-rajesh-yadav"
    },
    availability: "Available"
  },
  {
    name: "Gurpreet Singh",
    labourType: "Harvester Operator",
    experience: 8,
    price: 1100,
    location: "Ludhiana, Punjab",
    phone: "9876543212",
    description: "Professional combine harvester operator for wheat and paddy harvesting. Day & night shifts, fast operations with minimum crop wastage.",
    image: {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
      filename: "worker-gurpreet-singh"
    },
    availability: "Available"
  },
  {
    name: "Mukesh Sharma",
    labourType: "Mechanical",
    experience: 5,
    price: 800,
    location: "Meerut, Uttar Pradesh",
    phone: "9876543213",
    description: "Agricultural machinery repair expert. On-field tractor troubleshooting, hydraulic pump fixing, engine tuning, and rotavator gear service.",
    image: {
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
      filename: "worker-mukesh-sharma"
    },
    availability: "Available"
  },
  {
    name: "Suresh Patel",
    labourType: "Spray Machine Operator",
    experience: 4,
    price: 550,
    location: "Indore, Madhya Pradesh",
    phone: "9876543214",
    description: "Certified pesticide, insecticide and fertilizer spray operator using boom sprayers and battery knapsacks with proper protective safety equipment.",
    image: {
      url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
      filename: "worker-suresh-patel"
    },
    availability: "Available"
  },
  {
    name: "Ramphal Verma",
    labourType: "Farm Worker",
    experience: 10,
    price: 450,
    location: "Alwar, Rajasthan",
    phone: "9876543215",
    description: "Experienced all-round agricultural farm hand for sowing, weeding, irrigation channel maintenance, crop cutting, and threshing work.",
    image: {
      url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
      filename: "worker-ramphal-verma"
    },
    availability: "Available"
  },
  {
    name: "Anil Kumar",
    labourType: "Irrigation Technician",
    experience: 5,
    price: 700,
    location: "Hisar, Haryana",
    phone: "9876543216",
    description: "Drip and sprinkler irrigation installation and servicing specialist. Motor pump installation, PVC pipeline repair, and water flow optimization.",
    image: {
      url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
      filename: "worker-anil-kumar"
    },
    availability: "Available"
  }
];

async function seedLabour() {
  try {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WorkShetu";
    await mongoose.connect(mongoUrl, { dbName: "workshetu" });
    console.log("Connected to MongoDB for Labour seeding.");

    let owner = await User.findOne({ role: "Labour" });
    if (!owner) {
      owner = await User.findOne({ role: "Driver" }) || await User.findOne();
    }

    if (!owner) {
      console.log("No user found in DB to associate with workers.");
      process.exit(1);
    }

    // Delete previous test sample workers if any
    await Labour.deleteMany({ owner: owner._id });

    const docs = sampleWorkers.map((w) => ({
      ...w,
      owner: owner._id
    }));

    const inserted = await Labour.insertMany(docs);
    console.log(`Successfully seeded ${inserted.length} Labour profiles!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seedLabour();
