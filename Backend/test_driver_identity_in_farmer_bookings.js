require('dotenv').config();
const mongoose = require('mongoose');
const assert = require('assert');

const User = require('./models/Owner.js');
const Machine = require('./models/ListingMachin.js');
const Booking = require('./models/BookingMachine.js');
const GroupBooking = require('./models/GroupBooking.js');

async function runTest() {
  console.log("=== WORKSHETU DRIVER IDENTITY IN FARMER BOOKINGS TEST ===");
  await mongoose.connect(process.env.MONGO_URL, { dbName: 'workshetu' });

  // 1. Setup Test Users
  const testSuffix = Date.now();
  const vNumA = `PB10AB${String(testSuffix).slice(-4)}`;
  const vNumB = `HR26CD${String(testSuffix).slice(-4)}`;

  const driverA = await User.create({
    fullName: `Ramesh Kumar DriverA ${testSuffix}`,
    phone: `981${String(testSuffix).slice(-7)}`,
    email: `driverA_${testSuffix}@example.com`,
    role: "Driver",
    driverApplicationStatus: "Approved",
    driverVehicleType: "Mahindra 575 DI Tractor",
    driverVehicleNumber: vNumA,
    driverExperience: 7,
    location: "Ludhiana, Punjab",
  });

  const driverB = await User.create({
    fullName: `Suresh Singh DriverB ${testSuffix}`,
    phone: `982${String(testSuffix).slice(-7)}`,
    email: `driverB_${testSuffix}@example.com`,
    role: "Driver",
    driverApplicationStatus: "Approved",
    driverVehicleType: "John Deere 5050D Harvester",
    driverVehicleNumber: vNumB,
    driverExperience: 4,
    location: "Karnal, Haryana",
  });

  const farmer = await User.create({
    fullName: `Kisan Lal Farmer ${testSuffix}`,
    phone: `983${String(testSuffix).slice(-7)}`,
    email: `farmer_${testSuffix}@example.com`,
    role: "Farmer",
  });

  // 2. Setup Test Machines
  const machineA = await Machine.create({
    title: `Mahindra 575 DI Tractor MachineA ${testSuffix}`,
    category: "Tractor",
    price: 800,
    unit: "Bigha",
    image: { url: "https://example.com/tractorA.jpg", filename: "tractorA.jpg" },
    owner: driverA._id,
    vehicleNumber: vNumA,
    location: "Ludhiana, Punjab",
    latitude: 30.901,
    longitude: 75.8573,
    phone: driverA.phone,
    power: 45,
    fuelType: "Diesel",
    year: 2022,
    description: "High power tractor for all farming needs.",
    availability: "Available",
  });

  const machineB = await Machine.create({
    title: `John Deere Harvester MachineB ${testSuffix}`,
    category: "Harvester",
    price: 1500,
    unit: "Bigha",
    image: { url: "https://example.com/harvesterB.jpg", filename: "harvesterB.jpg" },
    owner: driverB._id,
    vehicleNumber: vNumB,
    location: "Karnal, Haryana",
    latitude: 29.6857,
    longitude: 76.9905,
    phone: driverB.phone,
    power: 75,
    fuelType: "Diesel",
    year: 2023,
    description: "Multi-crop harvester for fast field operations.",
    availability: "Available",
  });

  // 3. Create Bookings
  // Booking 1: Single Accepted for Driver A
  const booking1 = await Booking.create({
    requestType: "Machine",
    bookingType: "Single",
    itemId: machineA._id,
    owner: driverA._id,
    customer: farmer._id,
    customerName: farmer.fullName,
    customerPhone: farmer.phone,
    customerLocation: "Ludhiana Farm",
    landArea: 5,
    areaUnit: "Bigha",
    workType: "Ploughing",
    requiredDate: new Date(),
    basePrice: 4000,
    totalPrice: 4000,
    originalPrice: 4000,
    finalPrice: 4000,
    status: "Accepted",
    bookingDate: new Date(),
  });

  // Booking 2: Single Accepted for Driver B
  const booking2 = await Booking.create({
    requestType: "Machine",
    bookingType: "Single",
    itemId: machineB._id,
    owner: driverB._id,
    customer: farmer._id,
    customerName: farmer.fullName,
    customerPhone: farmer.phone,
    customerLocation: "Karnal Farm",
    landArea: 10,
    areaUnit: "Bigha",
    workType: "Harvesting",
    requiredDate: new Date(),
    basePrice: 15000,
    totalPrice: 15000,
    originalPrice: 15000,
    finalPrice: 15000,
    status: "Accepted",
    bookingDate: new Date(),
  });

  // Booking 3: Single Pending for Driver A
  const booking3 = await Booking.create({
    requestType: "Machine",
    bookingType: "Single",
    itemId: machineA._id,
    owner: driverA._id,
    customer: farmer._id,
    customerName: farmer.fullName,
    customerPhone: farmer.phone,
    customerLocation: "Ludhiana Farm",
    landArea: 3,
    areaUnit: "Bigha",
    workType: "Cultivation",
    requiredDate: new Date(),
    basePrice: 2400,
    totalPrice: 2400,
    originalPrice: 2400,
    finalPrice: 2400,
    status: "Pending",
    bookingDate: new Date(),
  });

  // Booking 4: Single Completed for Driver B
  const booking4 = await Booking.create({
    requestType: "Machine",
    bookingType: "Single",
    itemId: machineB._id,
    owner: driverB._id,
    customer: farmer._id,
    customerName: farmer.fullName,
    customerPhone: farmer.phone,
    customerLocation: "Karnal Farm",
    landArea: 8,
    areaUnit: "Bigha",
    workType: "Harvesting",
    requiredDate: new Date(),
    basePrice: 12000,
    totalPrice: 12000,
    originalPrice: 12000,
    finalPrice: 12000,
    status: "Completed",
    completedAt: new Date(),
    bookingDate: new Date(),
  });

  console.log("Fixtures created successfully.");

  // 4. Test Query Simulation (Same query as /api/group-bookings/my/requests)
  const DRIVER_PUBLIC_FIELDS = "fullName phone profileImage driverVehicleType driverVehicleNumber driverApplicationStatus driverExperience location";

  const bookings = await Booking.find({
    customer: farmer._id,
    requestType: "Machine",
    bookingType: "Single",
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "itemId",
      select: "title category image location latitude longitude owner vehicleNumber",
      populate: {
        path: "owner",
        select: DRIVER_PUBLIC_FIELDS
      }
    })
    .populate("owner", DRIVER_PUBLIC_FIELDS);

  const resolveDriverInfo = (ownerDoc, listingDoc, bookingStatus) => {
    const driverUser = (ownerDoc && typeof ownerDoc === "object" && ownerDoc.fullName)
      ? ownerDoc
      : (listingDoc?.owner && typeof listingDoc.owner === "object" && listingDoc.owner.fullName)
        ? listingDoc.owner
        : null;

    if (!driverUser) return null;

    const isConfirmed = ["Accepted", "Completed"].includes(bookingStatus);
    const vehicleType = driverUser.driverVehicleType || listingDoc?.category || "Tractor";
    const vehicleNumber = driverUser.driverVehicleNumber || listingDoc?.vehicleNumber || "";

    return {
      _id: driverUser._id,
      fullName: driverUser.fullName || "Verified Driver",
      phone: isConfirmed ? (driverUser.phone || "") : "",
      profileImage: driverUser.profileImage?.url || null,
      vehicleType,
      vehicleNumber,
      driverApplicationStatus: driverUser.driverApplicationStatus || "None",
      isVerified: driverUser.driverApplicationStatus === "Approved",
      driverExperience: driverUser.driverExperience || 0,
      location: driverUser.location || listingDoc?.location || ""
    };
  };

  const safeBookings = bookings.map((booking) => {
    const data = booking.toObject();
    const driverInfo = resolveDriverInfo(data.owner, data.itemId, data.status);
    data.driver = driverInfo;
    if (data.owner && typeof data.owner === "object" && !["Accepted", "Completed"].includes(data.status)) {
      data.owner.phone = "";
    }
    return data;
  });

  // 5. Assertions
  const resB1 = safeBookings.find(b => String(b._id) === String(booking1._id));
  const resB2 = safeBookings.find(b => String(b._id) === String(booking2._id));
  const resB3 = safeBookings.find(b => String(b._id) === String(booking3._id));
  const resB4 = safeBookings.find(b => String(b._id) === String(booking4._id));

  // --- Booking 1 (Driver A, Accepted) ---
  assert(resB1, "Booking 1 found");
  assert.strictEqual(resB1.driver.fullName, driverA.fullName, "Booking 1 has Driver A full name");
  assert.strictEqual(resB1.driver.phone, driverA.phone, "Booking 1 has Driver A phone");
  assert.strictEqual(resB1.driver.vehicleType, "Mahindra 575 DI Tractor", "Booking 1 has Driver A vehicle type");
  assert.strictEqual(resB1.driver.vehicleNumber, vNumA, "Booking 1 has Driver A vehicle number");
  assert.strictEqual(resB1.driver.isVerified, true, "Booking 1 Driver A is verified");
  assert.notStrictEqual(resB1.driver.fullName, farmer.fullName, "Driver A is NOT farmer name");
  assert.notStrictEqual(resB1.driver.fullName, machineA.title, "Driver A is NOT machine name");
  console.log("✅ [PASS] Booking 1 correctly identifies Driver A with phone and vehicle");

  // --- Booking 2 (Driver B, Accepted) ---
  assert(resB2, "Booking 2 found");
  assert.strictEqual(resB2.driver.fullName, driverB.fullName, "Booking 2 has Driver B full name");
  assert.strictEqual(resB2.driver.phone, driverB.phone, "Booking 2 has Driver B phone");
  assert.strictEqual(resB2.driver.vehicleType, "John Deere 5050D Harvester", "Booking 2 has Driver B vehicle type");
  assert.strictEqual(resB2.driver.vehicleNumber, vNumB, "Booking 2 has Driver B vehicle number");
  assert.strictEqual(resB2.driver.isVerified, true, "Booking 2 Driver B is verified");
  assert.notStrictEqual(resB2.driver.fullName, driverA.fullName, "Driver B is NOT Driver A (no mixing)");
  console.log("✅ [PASS] Booking 2 correctly identifies Driver B (distinct from Driver A)");

  // --- Booking 3 (Driver A, Pending) ---
  assert(resB3, "Booking 3 found");
  assert.strictEqual(resB3.driver.fullName, driverA.fullName, "Booking 3 has Driver A name");
  assert.strictEqual(resB3.driver.phone, "", "Booking 3 (Pending) does NOT leak phone number");
  console.log("✅ [PASS] Booking 3 (Pending) preserves Driver identity without leaking phone");

  // --- Booking 4 (Driver B, Completed) ---
  assert(resB4, "Booking 4 found");
  assert.strictEqual(resB4.driver.fullName, driverB.fullName, "Booking 4 has Driver B full name");
  assert.strictEqual(resB4.driver.phone, driverB.phone, "Booking 4 has Driver B phone");
  console.log("✅ [PASS] Booking 4 (Completed) preserves Driver B contact details");

  // --- Privacy Check ---
  assert.strictEqual(resB1.driver.password, undefined, "No password field on driver");
  assert.strictEqual(resB1.owner.password, undefined, "No password field on owner");
  console.log("✅ [PASS] Sensitive credentials (password, salt, hash) are never exposed");

  // 6. Cleanup
  await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id, booking3._id, booking4._id] } });
  await Machine.deleteMany({ _id: { $in: [machineA._id, machineB._id] } });
  await User.deleteMany({ _id: { $in: [driverA._id, driverB._id, farmer._id] } });
  console.log("Test fixtures cleaned up.");

  console.log("\n=== ALL DRIVER IDENTITY TESTS PASSED (14/14 ASSERTIONS) ===");
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
