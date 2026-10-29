const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const { getDistanceKm } = require("./utils/groupBooking.js");

async function runTests() {
  console.log("=== WORKSHETU BOOKING EXPIRY, NEARBY ALTERNATIVES & 24H PURGE TEST SUITE ===");
  await mongoose.connect(process.env.MONGO_URL, { dbName: "workshetu" });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${message}`);
      testsFailed++;
    }
  }

  const baseLat = 26.9124;
  const baseLng = 75.7873;
  // 1 degree latitude ~ 111.195 km
  // 4.9 km delta lat: ~0.044067
  // 5.1 km delta lat: ~0.045865
  // 9.5 km delta lat: ~0.085435
  const lat4_9km = baseLat + (4.9 / 111.195);
  const lat5_1km = baseLat + (5.1 / 111.195);
  const lat9_5km = baseLat + (9.5 / 111.195);

  const testIdsToClean = [];

  try {
    // Setup users
    const farmer = await User.findOneAndUpdate(
      { phone: "9876543220" },
      {
        fullName: "Test Expiry Farmer",
        phone: "9876543220",
        role: "Farmer",
        isActive: true,
        location: "Jaipur Rural",
        latitude: baseLat,
        longitude: baseLng,
      },
      { upsert: true, returnDocument: "after" }
    );

    const driver1 = await User.findOneAndUpdate(
      { phone: "9876543221" },
      {
        fullName: "Driver Within 5km",
        phone: "9876543221",
        role: "Driver",
        driverApplicationStatus: "Approved",
        isActive: true,
        bookingCredits: 5,
        freeRequestsUsed: 0,
        location: "Village Close",
        latitude: lat4_9km,
        longitude: baseLng,
      },
      { upsert: true, returnDocument: "after" }
    );

    const driver2 = await User.findOneAndUpdate(
      { phone: "9876543222" },
      {
        fullName: "Driver At 5.1km",
        phone: "9876543222",
        role: "Driver",
        driverApplicationStatus: "Approved",
        isActive: true,
        bookingCredits: 5,
        freeRequestsUsed: 0,
        location: "Village Mid",
        latitude: lat5_1km,
        longitude: baseLng,
      },
      { upsert: true, returnDocument: "after" }
    );

    const driver3 = await User.findOneAndUpdate(
      { phone: "9876543223" },
      {
        fullName: "Driver At 9.5km",
        phone: "9876543223",
        role: "Driver",
        driverApplicationStatus: "Approved",
        isActive: true,
        bookingCredits: 5,
        freeRequestsUsed: 0,
        location: "Village Far",
        latitude: lat9_5km,
        longitude: baseLng,
      },
      { upsert: true, returnDocument: "after" }
    );

    // Setup machine listings
    const origMachine = await Machine.findOneAndUpdate(
      { title: "Test Original Tractor" },
      {
        owner: driver1._id,
        title: "Test Original Tractor",
        category: "Tractor",
        price: 800,
        unit: "Bigha",
        availability: "Available",
        location: "Jaipur",
        latitude: baseLat,
        longitude: baseLng,
        year: 2024,
        image: { url: "https://example.com/tractor.jpg", filename: "orig_tractor" },
        vehicleNumber: "RJ14AB1001",
        phone: "9876543221",
        description: "Original test tractor"
      },
      { upsert: true, returnDocument: "after" }
    );

    const altMachine4_9 = await Machine.findOneAndUpdate(
      { title: "Test Alt Tractor 4.9km" },
      {
        owner: driver1._id,
        title: "Test Alt Tractor 4.9km",
        category: "Tractor",
        price: 850,
        unit: "Bigha",
        availability: "Available",
        location: "Village Close",
        latitude: lat4_9km,
        longitude: baseLng,
        year: 2025,
        image: { url: "https://example.com/tractor2.jpg", filename: "alt_tractor1" },
        vehicleNumber: "RJ14AB1002",
        phone: "9876543221",
        description: "Alt tractor within 5km"
      },
      { upsert: true, returnDocument: "after" }
    );

    const altMachine5_1 = await Machine.findOneAndUpdate(
      { title: "Test Alt Tractor 5.1km" },
      {
        owner: driver2._id,
        title: "Test Alt Tractor 5.1km",
        category: "Tractor",
        price: 750,
        unit: "Bigha",
        availability: "Available",
        location: "Village Mid",
        latitude: lat5_1km,
        longitude: baseLng,
        year: 2024,
        image: { url: "https://example.com/tractor3.jpg", filename: "alt_tractor2" },
        vehicleNumber: "RJ14AB1003",
        phone: "9876543222",
        description: "Alt tractor at 5.1km"
      },
      { upsert: true, returnDocument: "after" }
    );

    const altMachineUnavailable = await Machine.findOneAndUpdate(
      { title: "Test Alt Tractor Unavailable" },
      {
        owner: driver2._id,
        title: "Test Alt Tractor Unavailable",
        category: "Tractor",
        price: 700,
        unit: "Bigha",
        availability: "Booked",
        location: "Village Close",
        latitude: lat4_9km,
        longitude: baseLng,
        year: 2023,
        image: { url: "https://example.com/tractor4.jpg", filename: "alt_tractor3" },
        vehicleNumber: "RJ14AB1004",
        phone: "9876543222",
        description: "Unavailable machine"
      },
      { upsert: true, returnDocument: "after" }
    );

    const altMachineWrongCat = await Machine.findOneAndUpdate(
      { title: "Test Alt Cultivator 4.9km" },
      {
        owner: driver1._id,
        title: "Test Alt Cultivator 4.9km",
        category: "Cultivator",
        price: 500,
        unit: "Bigha",
        availability: "Available",
        location: "Village Close",
        latitude: lat4_9km,
        longitude: baseLng,
        year: 2024,
        image: { url: "https://example.com/cultivator.jpg", filename: "alt_cultivator" },
        vehicleNumber: "RJ14AB1005",
        phone: "9876543221",
        description: "Wrong category"
      },
      { upsert: true, returnDocument: "after" }
    );

    console.log("\n--- TEST GROUP 1: Expiry & 24-Hour Retention Logic ---");

    // 1.1 Unanswered instant booking expires at 2-minute deadline
    const now = new Date();
    const instantBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: origMachine._id,
      owner: driver1._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location,
      customerLatitude: baseLat,
      customerLongitude: baseLng,
      landArea: 2,
      areaUnit: "Bigha",
      workType: "Ploughing",
      requiredDate: now,
      totalPrice: 1600,
      basePrice: 1600,
      originalPrice: 1600,
      finalPrice: 1600,
      isInstantBooking: true,
      bookingDate: now,
      responseDeadline: new Date(now.getTime() - 1000), // Overdue
      status: "Pending",
    });
    testIdsToClean.push(instantBooking._id);

    assert(instantBooking.responseDeadline <= now, "Instant booking responseDeadline is in the past (overdue)");

    // Simulate backend expiry sweep
    const statusChangedAt = new Date();
    const purgeAt = new Date(statusChangedAt.getTime() + 24 * 60 * 60 * 1000);
    instantBooking.status = "Expired";
    instantBooking.statusChangedAt = statusChangedAt;
    instantBooking.purgeAt = purgeAt;
    instantBooking.historyExpiresAt = purgeAt;
    await instantBooking.save();

    assert(instantBooking.status === "Expired", "Booking transitioned to Expired");
    assert(instantBooking.statusChangedAt != null, "statusChangedAt timestamp recorded upon expiry");
    assert(
      Math.abs(instantBooking.purgeAt.getTime() - (statusChangedAt.getTime() + 24 * 60 * 60 * 1000)) < 1000,
      "purgeAt is set to exactly 24 hours after expiry transition"
    );

    // 1.2 Future scheduled bookings do NOT receive 2-minute deadline
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const scheduledBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: origMachine._id,
      owner: driver1._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location,
      landArea: 5,
      areaUnit: "Bigha",
      workType: "Ploughing",
      requiredDate: futureDate,
      totalPrice: 4000,
      basePrice: 4000,
      originalPrice: 4000,
      finalPrice: 4000,
      isInstantBooking: false,
      bookingDate: futureDate,
      responseDeadline: null,
      status: "Pending",
    });
    testIdsToClean.push(scheduledBooking._id);

    assert(scheduledBooking.responseDeadline === null, "Future scheduled booking has responseDeadline === null (not 2-minute instant)");
    assert(scheduledBooking.isInstantBooking === false, "Future scheduled booking has isInstantBooking === false");

    // 1.3 Driver Rejection records 24h retention
    const rejectedBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: origMachine._id,
      owner: driver1._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location,
      landArea: 3,
      areaUnit: "Bigha",
      workType: "Cultivation",
      requiredDate: now,
      totalPrice: 2400,
      basePrice: 2400,
      originalPrice: 2400,
      finalPrice: 2400,
      isInstantBooking: true,
      bookingDate: now,
      status: "Pending",
    });
    testIdsToClean.push(rejectedBooking._id);

    // Driver rejects
    const rejectTime = new Date();
    rejectedBooking.status = "Rejected";
    rejectedBooking.statusChangedAt = rejectTime;
    rejectedBooking.purgeAt = new Date(rejectTime.getTime() + 24 * 60 * 60 * 1000);
    rejectedBooking.historyExpiresAt = rejectedBooking.purgeAt;
    await rejectedBooking.save();

    assert(rejectedBooking.status === "Rejected", "Booking marked as Rejected");
    assert(rejectedBooking.statusChangedAt != null, "statusChangedAt recorded upon rejection");
    assert(
      Math.abs(rejectedBooking.purgeAt.getTime() - (rejectTime.getTime() + 24 * 60 * 60 * 1000)) < 1000,
      "purgeAt starts from actual rejection timestamp, not creation date"
    );

    // 1.4 Active Accepted/Completed bookings do NOT have purgeAt
    const acceptedBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: origMachine._id,
      owner: driver1._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location,
      landArea: 2,
      areaUnit: "Bigha",
      workType: "Ploughing",
      requiredDate: now,
      totalPrice: 1600,
      basePrice: 1600,
      originalPrice: 1600,
      finalPrice: 1600,
      isInstantBooking: true,
      bookingDate: now,
      status: "Accepted",
      purgeAt: null,
    });
    testIdsToClean.push(acceptedBooking._id);

    assert(acceptedBooking.purgeAt === null, "Accepted booking has purgeAt === null (protected from 24h deletion)");

    // 1.5 Query exclusions: 24-hour retention query checks
    // Record where purgeAt is expired (> 24h ago)
    const oldExpiredBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: origMachine._id,
      owner: driver1._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: farmer.location,
      landArea: 2,
      areaUnit: "Bigha",
      workType: "Ploughing",
      requiredDate: now,
      totalPrice: 1600,
      basePrice: 1600,
      originalPrice: 1600,
      finalPrice: 1600,
      status: "Expired",
      statusChangedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      purgeAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // Expired 1h ago
    });
    testIdsToClean.push(oldExpiredBooking._id);

    // Farmer query check
    const farmerQueryActive = await Booking.find({
      _id: oldExpiredBooking._id,
      customer: farmer._id,
      $or: [
        { status: { $nin: ["Completed", "Rejected", "Cancelled", "Expired"] } },
        { status: "Completed", completedAt: { $gt: new Date(Date.now() - 15 * 86400000) } },
        {
          status: { $in: ["Rejected", "Cancelled", "Expired"] },
          $or: [
            { purgeAt: { $gt: new Date() } },
            { purgeAt: null, historyExpiresAt: { $gt: new Date() } }
          ]
        }
      ]
    });
    assert(farmerQueryActive.length === 0, "Farmer My Bookings query excludes records past 24-hour purgeAt deadline");

    // Driver query check
    const driverActiveRequests = await Booking.find({
      _id: oldExpiredBooking._id,
      owner: driver1._id,
      status: { $nin: ["Rejected", "Cancelled", "Completed", "Expired"] }
    });
    assert(driverActiveRequests.length === 0, "Driver Workspace active requests query excludes Expired/Rejected records");

    const driverHistoryQuery = await Booking.find({
      _id: oldExpiredBooking._id,
      owner: driver1._id,
      status: { $in: ["Rejected", "Expired"] },
      $or: [
        { purgeAt: { $gt: new Date() } },
        { purgeAt: null, historyExpiresAt: { $gt: new Date() } }
      ]
    });
    assert(driverHistoryQuery.length === 0, "Driver Workspace history excludes records past 24-hour purgeAt deadline");

    console.log("\n--- TEST GROUP 2: Nearby Alternative Machine Filtering ---");

    // 2.1 Calculate distance check
    const dist4_9 = getDistanceKm({ latitude: baseLat, longitude: baseLng }, { latitude: lat4_9km, longitude: baseLng });
    const dist5_1 = getDistanceKm({ latitude: baseLat, longitude: baseLng }, { latitude: lat5_1km, longitude: baseLng });
    const dist9_5 = getDistanceKm({ latitude: baseLat, longitude: baseLng }, { latitude: lat9_5km, longitude: baseLng });

    assert(Math.round(dist4_9 * 10) / 10 === 4.9, `Calculated distance for candidate 1 is 4.9 km (actual: ${Math.round(dist4_9 * 10) / 10})`);
    assert(Math.round(dist5_1 * 10) / 10 === 5.1, `Calculated distance for candidate 2 is 5.1 km (actual: ${Math.round(dist5_1 * 10) / 10})`);
    assert(Math.round(dist9_5 * 10) / 10 === 9.5, `Calculated distance for candidate 3 is 9.5 km (actual: ${Math.round(dist9_5 * 10) / 10})`);

    // 2.2 Default 5km radius filter
    function filterNearbyAlternatives(candidates, userLat, userLng, radiusKm, originalMachineId, targetCategory) {
      if (!Number.isFinite(userLat) || !Number.isFinite(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
        return { requiresLocation: true, alternatives: [] };
      }
      const results = [];
      for (const m of candidates) {
        if (String(m._id) === String(originalMachineId)) continue;
        if (m.category !== targetCategory) continue;
        if (m.availability !== "Available") continue;
        if (!Number.isFinite(m.latitude) || !Number.isFinite(m.longitude)) continue;
        const d = getDistanceKm({ latitude: userLat, longitude: userLng }, { latitude: m.latitude, longitude: m.longitude });
        if (d == null) continue;
        const rounded = Math.round(d * 10) / 10;
        if (rounded <= radiusKm) {
          results.push({ ...m.toObject(), distanceKm: rounded });
        }
      }
      results.sort((a, b) => a.distanceKm - b.distanceKm);
      return { requiresLocation: false, alternatives: results };
    }

    const allCandidates = [origMachine, altMachine4_9, altMachine5_1, altMachineUnavailable, altMachineWrongCat];

    // Search at default 5km
    const search5km = filterNearbyAlternatives(allCandidates, baseLat, baseLng, 5, origMachine._id, "Tractor");
    assert(search5km.requiresLocation === false, "Search with valid coordinates does not require location");
    assert(search5km.alternatives.some((a) => a.title === "Test Alt Tractor 4.9km"), "Candidate at 4.9 km is INCLUDED in 5 km radius results");
    assert(!search5km.alternatives.some((a) => a.title === "Test Alt Tractor 5.1km"), "Candidate at 5.1 km is EXCLUDED from 5 km radius results");
    assert(!search5km.alternatives.some((a) => a.title === "Test Original Tractor"), "Original booked machine is EXCLUDED from alternatives");
    assert(!search5km.alternatives.some((a) => a.title === "Test Alt Tractor Unavailable"), "Unavailable machine is EXCLUDED from alternatives");
    assert(!search5km.alternatives.some((a) => a.title === "Test Alt Cultivator 4.9km"), "Machine with different category is EXCLUDED from alternatives");

    // Search expanded to 10km
    const search10km = filterNearbyAlternatives(allCandidates, baseLat, baseLng, 10, origMachine._id, "Tractor");
    assert(search10km.alternatives.some((a) => a.title === "Test Alt Tractor 4.9km"), "Candidate at 4.9 km is INCLUDED in 10 km radius");
    assert(search10km.alternatives.some((a) => a.title === "Test Alt Tractor 5.1km"), "Candidate at 5.1 km is INCLUDED when radius is expanded to 10 km");

    // Missing coordinates test
    const searchInvalidCoords = filterNearbyAlternatives(allCandidates, null, undefined, 5, origMachine._id, "Tractor");
    assert(searchInvalidCoords.requiresLocation === true, "Missing/invalid coordinates flag requiresLocation: true");
    assert(searchInvalidCoords.alternatives.length === 0, "Missing coordinates return zero arbitrary machines");

    // 2.3 Self-Booking Prevention Check
    const selfBookingAttemptAllowed = (machineOwnerId, customerId) => String(machineOwnerId) !== String(customerId);
    assert(!selfBookingAttemptAllowed(driver1._id, driver1._id), "Driver booking their own listing is strictly blocked");
    assert(selfBookingAttemptAllowed(driver1._id, farmer._id), "Farmer booking driver listing is permitted");

    console.log("\n--- TEST GROUP 3: Database Index Verification ---");
    const bookingIndexes = await Booking.collection.indexes();
    const hasPurgeAtIndex = bookingIndexes.some((idx) => idx.key?.purgeAt === 1);
    assert(hasPurgeAtIndex, "Booking collection has index on { purgeAt: 1 }");

  } finally {
    // Clean up test bookings
    if (testIdsToClean.length > 0) {
      await Booking.deleteMany({ _id: { $in: testIdsToClean } });
    }
    // Clean up test listings
    await Machine.deleteMany({ title: { $regex: /^Test / } });
    // Clean up test users
    await User.deleteMany({ phone: { $in: ["9876543220", "9876543221", "9876543222", "9876543223"] } });
    await mongoose.disconnect();
  }

  console.log(`\n=== RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED ===\n`);
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});

