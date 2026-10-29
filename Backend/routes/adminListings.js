const express = require("express");
const router = express.Router();

const ListingMachine = require("../models/ListingMachin.js");
const Labour = require("../models/Labour.js");
const Transport = require("../models/Tranport.js");
const User = require("../models/Owner.js");

const { isLoggedIn, isAdmin } = require("../middleware/auth.js");

// Helper to resolve model by type
function getModelByType(type) {
  const normalized = (type || "").toLowerCase();
  if (normalized === "machine" || normalized === "machines") return ListingMachine;
  if (normalized === "labour") return Labour;
  if (normalized === "transport") return Transport;
  return null;
}

// ==========================================
// 1. GET LISTINGS WITH TABS, SEARCH & FILTER
// ==========================================
router.get("/listings", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { tab = "all", category, search, status } = req.query;

    const [totalMachines, totalLabour, totalTransport] = await Promise.all([
      ListingMachine.countDocuments(),
      Labour.countDocuments(),
      Transport.countDocuments(),
    ]);

    const counts = {
      all: totalMachines + totalLabour + totalTransport,
      machines: totalMachines,
      labour: totalLabour,
      transport: totalTransport,
    };

    let items = [];

    const searchRegex = search && search.trim()
      ? new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      : null;

    // Helper to query Machines
    const fetchMachines = async () => {
      const q = {};
      if (category && category !== "all") q.category = category;
      if (status && status !== "all") q.availability = status;
      if (searchRegex) {
        q.$or = [
          { title: searchRegex },
          { category: searchRegex },
          { vehicleNumber: searchRegex },
          { location: searchRegex },
          { phone: searchRegex },
        ];
      }
      const raw = await ListingMachine.find(q)
        .sort({ createdAt: -1 })
        .populate("owner", "fullName phone email role driverApplicationStatus isActive driverSuspensionReason driverReviewReason")
        .lean();

      return raw.map((m) => ({
        _id: m._id,
        type: "Machine",
        title: m.title,
        category: m.category,
        vehicleNumber: m.vehicleNumber || null,
        price: m.price,
        unit: m.unit,
        power: m.power,
        fuelType: m.fuelType,
        year: m.year,
        location: m.location,
        phone: m.phone,
        description: m.description,
        availability: m.availability || "Available",
        image: m.image?.url || null,
        owner: m.owner || null,
        createdAt: m.createdAt,
      }));
    };

    // Helper to query Labour
    const fetchLabour = async () => {
      const q = {};
      if (category && category !== "all") q.labourType = category;
      if (status && status !== "all") q.availability = status;
      if (searchRegex) {
        q.$or = [
          { name: searchRegex },
          { labourType: searchRegex },
          { phone: searchRegex },
        ];
      }
      const raw = await Labour.find(q)
        .sort({ createdAt: -1 })
        .populate("owner", "fullName phone email")
        .lean();

      return raw.map((l) => ({
        _id: l._id,
        type: "Labour",
        title: l.name,
        category: l.labourType,
        vehicleNumber: null,
        price: l.price,
        unit: l.unit,
        experience: l.experience,
        location: "Local Services",
        phone: l.phone,
        description: l.description,
        availability: l.availability || "Available",
        image: null,
        owner: l.owner || null,
        createdAt: l.createdAt,
      }));
    };

    // Helper to query Transport
    const fetchTransport = async () => {
      const q = {};
      if (category && category !== "all") q.vehicleType = category;
      if (status && status !== "all") q.availability = status;
      if (searchRegex) {
        q.$or = [
          { vehicleName: searchRegex },
          { vehicleType: searchRegex },
          { location: searchRegex },
          { phone: searchRegex },
        ];
      }
      const raw = await Transport.find(q)
        .sort({ createdAt: -1 })
        .populate("owner", "fullName phone email")
        .lean();

      return raw.map((t) => ({
        _id: t._id,
        type: "Transport",
        title: t.vehicleName,
        category: t.vehicleType,
        vehicleNumber: null,
        price: t.price,
        unit: t.unit,
        location: t.location,
        phone: t.phone,
        description: t.description,
        availability: t.availability || "Available",
        image: t.image?.url || null,
        owner: t.owner || null,
        createdAt: t.createdAt,
      }));
    };

    if (tab === "machines") {
      items = await fetchMachines();
    } else if (tab === "labour") {
      items = await fetchLabour();
    } else if (tab === "transport") {
      items = await fetchTransport();
    } else {
      // tab === "all"
      const [m, l, t] = await Promise.all([
        fetchMachines(),
        fetchLabour(),
        fetchTransport(),
      ]);
      items = [...m, ...l, ...t].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    return res.json({
      success: true,
      counts,
      listings: items,
    });
  } catch (error) {
    console.error("GET LISTINGS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listings.",
    });
  }
});

// ==========================================
// 2. GET SINGLE LISTING DETAILS
// ==========================================
router.get("/listings/:type/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const Model = getModelByType(req.params.type);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid listing type." });
    }

    const item = await Model.findById(req.params.id)
      .populate("owner", "fullName phone email role location")
      .lean();

    if (!item) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    return res.json({
      success: true,
      listing: item,
      type: req.params.type,
    });
  } catch (error) {
    console.error("GET SINGLE LISTING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load listing details.",
    });
  }
});

// ==========================================
// 3. EDIT LISTING
// ==========================================
router.put("/listings/:type/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const Model = getModelByType(req.params.type);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid listing type." });
    }

    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const { title, name, vehicleName, price, unit, category, labourType, vehicleType, location, phone, description } = req.body;

    if (title || name || vehicleName) {
      if (item.title !== undefined) item.title = (title || name || vehicleName).trim();
      if (item.name !== undefined) item.name = (name || title || vehicleName).trim();
      if (item.vehicleName !== undefined) item.vehicleName = (vehicleName || title || name).trim();
    }

    if (price !== undefined) item.price = Number(price);
    if (unit !== undefined) item.unit = unit;
    if (location !== undefined && item.location !== undefined) item.location = location;
    if (phone !== undefined) item.phone = phone;
    if (description !== undefined) item.description = description;

    if (category && item.category !== undefined) item.category = category;
    if (labourType && item.labourType !== undefined) item.labourType = labourType;
    if (vehicleType && item.vehicleType !== undefined) item.vehicleType = vehicleType;

    await item.save();

    return res.json({
      success: true,
      message: "Listing updated successfully.",
      listing: item,
    });
  } catch (error) {
    console.error("UPDATE LISTING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update listing.",
    });
  }
});

// ==========================================
// 4. HIDE / RESTORE LISTING (TOGGLE AVAILABILITY)
// ==========================================
router.patch("/listings/:type/:id/availability", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const Model = getModelByType(req.params.type);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid listing type." });
    }

    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const { availability } = req.body;
    // Set to requested availability, or toggle between Hidden and Available
    if (availability) {
      item.availability = availability;
    } else {
      item.availability = item.availability === "Hidden" ? "Available" : "Hidden";
    }

    await item.save();

    return res.json({
      success: true,
      message: item.availability === "Hidden"
        ? "Listing has been hidden from public searches."
        : "Listing is now restored and visible to farmers.",
      availability: item.availability,
    });
  } catch (error) {
    console.error("TOGGLE AVAILABILITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update listing visibility.",
    });
  }
});

// ==========================================
// 5. DELETE LISTING
// ==========================================
router.delete("/listings/:type/:id", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const Model = getModelByType(req.params.type);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid listing type." });
    }

    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    return res.json({
      success: true,
      message: "Listing deleted permanently.",
    });
  } catch (error) {
    console.error("DELETE LISTING ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete listing.",
    });
  }
});

module.exports = router;

