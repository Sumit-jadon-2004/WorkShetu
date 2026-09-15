const mongoose = require("mongoose");
const Machine = require("../models/ListingMachin.js");

const machines = [
  {
    owner: "66c7a1234567890123456789",

    title: "Mahindra 575 DI Tractor",

    category: "Tractor",

    vehicleNumber: "UK14AB1234",

    image: {
      url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
      filename: "mahindra-575-di-tractor"
    },

    price: 1800,

    unit: "Hour",

    power: 45,

    fuelType: "Diesel",

    year: 2024,

    location: "Rishikesh, Uttarakhand",

    latitude: 30.0869,

    longitude: 78.2676,

    phone: "9876543210",

    description:
      "45 HP diesel tractor suitable for ploughing, cultivation, rotavator work, trolley transportation and general agricultural operations.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Swaraj 744 FE Tractor",

    category: "Tractor",

    vehicleNumber: "UK07CD5678",

    image: {
      url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae",
      filename: "swaraj-744-fe-tractor"
    },

    price: 2000,

    unit: "Hour",

    power: 48,

    fuelType: "Diesel",

    year: 2023,

    location: "Haridwar, Uttarakhand",

    latitude: 29.9457,

    longitude: 78.1642,

    phone: "9812345670",

    description:
      "48 HP tractor designed for agricultural applications including cultivation, ploughing, rotavator operation and trolley work.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "John Deere 5310 Tractor",

    category: "Tractor",

    vehicleNumber: "UP14EF2468",

    image: {
      url: "https://images.unsplash.com/photo-1530267981375-f0de937f5f13",
      filename: "john-deere-5310-tractor"
    },

    price: 2200,

    unit: "Hour",

    power: 55,

    fuelType: "Diesel",

    year: 2024,

    location: "Meerut, Uttar Pradesh",

    latitude: 28.9845,

    longitude: 77.7064,

    phone: "9898765432",

    description:
      "55 HP agricultural tractor suitable for heavy-duty field preparation, ploughing, cultivation, rotavator work and transportation.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Heavy Duty Cultivator",

    category: "Cultivator",

    image: {
      url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
      filename: "heavy-duty-cultivator"
    },

    price: 900,

    unit: "Acre",

    year: 2024,

    location: "Rishikesh, Uttarakhand",

    latitude: 30.0869,

    longitude: 78.2676,

    phone: "9876501234",

    description:
      "Heavy-duty cultivator suitable for soil preparation, loosening soil, removing weeds and preparing agricultural fields before sowing.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Spring Loaded Cultivator",

    category: "Cultivator",

    image: {
      url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
      filename: "spring-loaded-cultivator"
    },

    price: 750,

    unit: "Acre",

    year: 2023,

    location: "Roorkee, Uttarakhand",

    latitude: 29.8543,

    longitude: 77.8880,

    phone: "9765432109",

    description:
      "Spring-loaded cultivator for efficient field preparation, soil loosening and weed control. Suitable for regular agricultural operations.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "6 Feet Agricultural Rotavator",

    category: "Rotavator",

    image: {
      url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
      filename: "6-feet-rotavator"
    },

    price: 1200,

    unit: "Acre",

    year: 2024,

    location: "Dehradun, Uttarakhand",

    latitude: 30.3165,

    longitude: 78.0322,

    phone: "9988776655",

    description:
      "6 feet tractor-mounted rotavator designed for seedbed preparation, soil pulverization and mixing crop residues into the soil.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "7 Feet Heavy Duty Rotavator",

    category: "Rotavator",

    image: {
      url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854",
      filename: "7-feet-heavy-duty-rotavator"
    },

    price: 1500,

    unit: "Acre",

    year: 2025,

    location: "Muzaffarnagar, Uttar Pradesh",

    latitude: 29.4727,

    longitude: 77.7085,

    phone: "9876123456",

    description:
      "Heavy-duty 7 feet rotavator suitable for large agricultural fields, soil preparation and crop residue management.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Disc Harrow Agricultural Machine",

    category: "Harrow",

    image: {
      url: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95",
      filename: "disc-harrow"
    },

    price: 1100,

    unit: "Acre",

    year: 2024,

    location: "Saharanpur, Uttar Pradesh",

    latitude: 29.9680,

    longitude: 77.5552,

    phone: "9823456710",

    description:
      "Disc harrow designed for breaking soil clods, leveling fields, incorporating crop residues and preparing soil for sowing.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Heavy Duty Disc Harrow",

    category: "Harrow",

    image: {
      url: "https://images.unsplash.com/photo-1500076656116-558758c991c1",
      filename: "heavy-duty-disc-harrow"
    },

    price: 1300,

    unit: "Acre",

    year: 2023,

    location: "Meerut, Uttar Pradesh",

    latitude: 28.9845,

    longitude: 77.7064,

    phone: "9900112233",

    description:
      "Heavy-duty disc harrow suitable for primary and secondary soil preparation, field leveling and breaking hard soil.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Combine Harvester",

    category: "Harvester",

    vehicleNumber: "PB10GH4321",

    image: {
      url: "https://images.unsplash.com/photo-1500076656116-558758c991c1",
      filename: "combine-harvester"
    },

    price: 2500,

    unit: "Hour",

    power: 75,

    fuelType: "Diesel",

    year: 2024,

    location: "Karnal, Haryana",

    latitude: 29.6857,

    longitude: 76.9905,

    phone: "9856743210",

    description:
      "Diesel-powered combine harvester suitable for harvesting and threshing operations in major cereal crops.",

    availability: "Available"
  },

  {
    owner: "66c7a1234567890123456789",

    title: "Multi Crop Harvester",

    category: "Harvester",

    vehicleNumber: "HR05JK7890",

    image: {
      url: "https://images.unsplash.com/photo-1592982537447-7440770cbfc9",
      filename: "multi-crop-harvester"
    },

    price: 2800,

    unit: "Hour",

    power: 90,

    fuelType: "Diesel",

    year: 2025,

    location: "Panipat, Haryana",

    latitude: 29.3909,

    longitude: 76.9635,

    phone: "9911223344",

    description:
      "High-capacity multi-crop harvesting machine designed for efficient harvesting operations and reduced field time.",

    availability: "Available"
  }
];

module.exports = machines;