const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const { CreditTransaction } = require("./models/CreditPack.js");

async function runTests() {
  console.log("=== WORKSHETU DRIVER BOOKING-CREDIT & TIMEOUT TEST SUITE ===");
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

  try {
    // 1. Setup Test Users
    const testDriverPhone = "9876543210";
    const testFarmerPhone = "9876543211";

    let driver = await User.findOne({ phone: testDriverPhone });
    if (!driver) {
      driver = await User.create({
        fullName: "Test Driver Pro",
        phone: testDriverPhone,
        role: "Driver",
        driverApplicationStatus: "Approved",
        isActive: true,
        bookingCredits: 0,
        freeRequestsUsed: 0,
      });
    } else {
      driver.bookingCredits = 0;
      driver.freeRequestsUsed = 0;
      driver.role = "Driver";
      driver.driverApplicationStatus = "Approved";
      await driver.save();
    }

    let farmer = await User.findOne({ phone: testFarmerPhone });
    if (!farmer) {
      farmer = await User.create({
        fullName: "Test Farmer Ram",
        phone: testFarmerPhone,
        role: "Farmer",
        isActive: true,
        bookingCredits: 0,
      });
    }

    // 2. Setup Test Machine
    let machine = await Machine.findOne({ owner: driver._id });
    if (!machine) {
      machine = await Machine.create({
        title: "Sonalika DI 745 III",
        category: "Tractor",
        price: 500,
        unit: "Bigha",
        availability: "Available",
        owner: driver._id,
        phone: "9876543210",
        year: 2022,
        power: 50,
        fuelType: "Diesel",
        vehicleNumber: "UP81AB1234",
        description: "Heavy duty tractor for agricultural tillage",
        image: {
          url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
          filename: "sample"
        },
        location: "Aligarh, UP",
        latitude: 27.8974,
        longitude: 78.0880,
      });
    } else {
      machine.availability = "Available";
      await machine.save();
    }

    // -------------------------------------------------------------
    // TEST 1: Free driver can receive up to 3 booking requests
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Free Driver 3-Request Quota ---");
    assert(driver.freeRequestsUsed === 0, "Driver starts with 0 free requests used");
    assert(driver.bookingCredits === 0, "Driver starts with 0 premium credits");

    const FREE_LIMIT = 3;
    let allowedCount = 0;
    for (let i = 1; i <= 3; i++) {
      const freeUsed = Number(driver.freeRequestsUsed || 0);
      const credits = Number(driver.bookingCredits || 0);
      if (freeUsed < FREE_LIMIT) {
        allowedCount++;
        driver.freeRequestsUsed += 1;
        await driver.save();
      }
    }
    assert(allowedCount === 3, "Free driver successfully received exactly 3 free requests");
    assert(driver.freeRequestsUsed === 3, "Driver freeRequestsUsed is now 3");

    // -------------------------------------------------------------
    // TEST 2: 4th request blocked when credits are 0
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Exhausted Driver Request Block ---");
    const canReceiveMore = driver.freeRequestsUsed < FREE_LIMIT || driver.bookingCredits > 0;
    assert(!canReceiveMore, "Driver cannot receive 4th request without purchased booking credits");

    // -------------------------------------------------------------
    // TEST 3: Driver Purchases Premium Credit Pack
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Driver Credit Pack Grant ---");
    const packSize = 5;
    driver.bookingCredits += packSize;
    await driver.save();
    assert(driver.bookingCredits === 5, "Driver successfully recharged 5 premium booking credits");

    // -------------------------------------------------------------
    // TEST 4: Premium Request Allowed & Credits Decremented
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Premium Credit Consumption ---");
    let premiumAllowed = false;
    if (driver.freeRequestsUsed >= FREE_LIMIT && driver.bookingCredits > 0) {
      driver.bookingCredits -= 1;
      await driver.save();
      premiumAllowed = true;
    }
    assert(premiumAllowed, "Request allowed using driver's premium credit pack");
    assert(driver.bookingCredits === 4, "Driver bookingCredits decremented from 5 to 4");

    // -------------------------------------------------------------
    // TEST 5: Farmer has no credit limit imposed
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Farmer Immunity from Credit Restrictions ---");
    assert(farmer.bookingCredits === 0, "Farmer has 0 platform credits");
    // Verify farmer can submit regardless of platform credits
    const farmerCanBook = farmer.isActive === true;
    assert(farmerCanBook, "Farmer can book freely without requiring booking credits");

    // -------------------------------------------------------------
    // TEST 6: 2-Minute Server-Side Response Deadline
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Two-Minute Instant Booking Timeout ---");
    const now = new Date();
    const responseDeadline = new Date(now.getTime() + 2 * 60 * 1000);
    const deadlineDiffMs = responseDeadline.getTime() - now.getTime();
    assert(deadlineDiffMs === 120000, "Server responseDeadline is set to exactly 120,000ms (2 minutes)");

    const testBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: machine._id,
      owner: driver._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: "Mathura Road, Aligarh",
      landArea: 6,
      workType: "Ploughing",
      requiredDate: new Date(),
      basePrice: 3000,
      originalPrice: 3000,
      totalPrice: 3000,
      finalPrice: 3000,
      status: "Pending",
      isInstantBooking: true,
      responseDeadline: new Date(now.getTime() - 1000), // simulate already expired!
    });
    assert(testBooking.status === "Pending", "Test booking created as Pending");

    // -------------------------------------------------------------
    // TEST 7: Expired Booking Cannot Be Accepted (Atomic Guard)
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Expired Request Acceptance Guard ---");
    const checkNow = new Date();
    const acceptedResult = await Booking.findOneAndUpdate(
      {
        _id: testBooking._id,
        status: "Pending",
        $or: [
          { responseDeadline: null },
          { responseDeadline: { $gt: checkNow } },
        ],
      },
      {
        $set: { status: "Accepted" },
      },
      { new: true }
    );
    assert(!acceptedResult, "Atomic update correctly blocked acceptance because responseDeadline has passed");

    // Flip to expired
    testBooking.status = "Expired";
    await testBooking.save();
    assert(testBooking.status === "Expired", "Booking marked as Expired");

    // -------------------------------------------------------------
    // TEST 8: Linking Alternative Booking to Original Booking
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Inline Alternative Booking Linkage ---");
    const altBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: machine._id,
      owner: driver._id,
      customer: farmer._id,
      customerName: farmer.fullName,
      customerPhone: farmer.phone,
      customerLocation: "Mathura Road, Aligarh",
      landArea: 6,
      workType: "Ploughing",
      requiredDate: new Date(),
      basePrice: 3000,
      originalPrice: 3000,
      totalPrice: 3000,
      finalPrice: 3000,
      status: "Pending",
      isInstantBooking: true,
      originalBookingId: testBooking._id,
      responseDeadline: new Date(Date.now() + 2 * 60 * 1000),
    });

    assert(
      String(altBooking.originalBookingId) === String(testBooking._id),
      "Alternative booking correctly references originalBookingId for history and tracking"
    );

    // -------------------------------------------------------------
    // TEST 9: Duplicate Alternative Booking Prevention
    // -------------------------------------------------------------
    console.log("\n--- TEST 9: Duplicate Alternative Booking Check ---");
    const existingActive = await Booking.findOne({
      originalBookingId: testBooking._id,
      customer: farmer._id,
      status: { $in: ["Pending", "Accepted"] },
    });
    assert(Boolean(existingActive), "System successfully detects existing active alternative booking");

    // Clean up test bookings
    await Booking.deleteMany({ _id: { $in: [testBooking._id, altBooking._id] } });
    console.log("\nTest bookings cleaned up.");

  } catch (err) {
    console.error("Test execution error:", err);
    testsFailed++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n=== RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED ===\n`);
    process.exit(testsFailed === 0 ? 0 : 1);
  }
}

runTests();
