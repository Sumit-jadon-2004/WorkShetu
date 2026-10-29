/**
 * TEST SUITE: WorkShetu Completion OTP Verification & Expiry Fix
 * Verifies:
 * 1. Correct OTP before expiry -> 200 OK, booking status Completed, OTP fields invalidated/cleared
 * 2. Incorrect OTP before expiry -> 400 Invalid OTP
 * 3. Correct OTP after expiry (expiry in past) -> 400 Expired OTP
 * 4. Farmer refresh (GET /my/requests) or regenerate endpoint generates new valid OTP
 * 5. Old OTP fails after regeneration
 * 6. Missing/null expiry timestamp handled safely without false rejection
 * 7. Unauthorized driver -> 403 Forbidden
 * 8. Already-completed booking -> 409 Conflict
 * 9. Repeated verification request -> 409 Conflict
 * 10. Group booking member OTP verification & expiry checks
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const express = require("express");

dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const GroupBooking = require("./models/GroupBooking.js");
const groupBookingsRouter = require("./routes/groupBookings.js");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/WorkShetu";

async function runTests() {
  console.log("======================================================================");
  console.log("     WORKSHETU: COMPLETION OTP VERIFICATION & EXPIRY TEST SUITE       ");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const app = express();
  app.use(express.json());

  let activeTestUser = null;
  app.use((req, res, next) => {
    if (activeTestUser) {
      req.user = activeTestUser;
      req.session = { userId: activeTestUser._id.toString() };
      req.isAuthenticated = () => true;
    } else {
      req.user = null;
      req.session = {};
      req.isAuthenticated = () => false;
    }
    next();
  });

  app.use("/api/group-bookings", groupBookingsRouter);

  let server;
  let baseUrl;

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // Setup Test Users
    const farmer = await User.create({
      fullName: `OTP Farmer ${timestamp}`,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "Farmer",
      isActive: true,
      verified: true,
      farmerLandArea: 5,
      location: "Pune, Maharashtra"
    });

    const driver = await User.create({
      fullName: `OTP Driver ${timestamp}`,
      phone: `97${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "Driver",
      isActive: true,
      verified: true,
      driverApplicationStatus: "Approved",
      bookingCredits: 10,
      driverVehicleType: "Tractor",
      driverVehicleNumber: "MH12AB1234",
      location: "Pune, Maharashtra"
    });

    const otherDriver = await User.create({
      fullName: `Other Driver ${timestamp}`,
      phone: `96${Math.floor(10000000 + Math.random() * 90000000)}`,
      role: "Driver",
      isActive: true,
      verified: true,
      driverApplicationStatus: "Approved",
      bookingCredits: 10,
      location: "Pune, Maharashtra"
    });

    const machine = await Machine.create({
      title: `Test Tractor ${timestamp}`,
      category: "Tractor",
      price: 1500,
      unit: "Acre",
      owner: driver._id,
      availability: "Available",
      location: "Pune, Maharashtra",
      latitude: 18.5204,
      longitude: 73.8567,
      power: 50,
      fuelType: "Diesel",
      year: 2022,
      vehicleNumber: `MH12AB${String(timestamp).slice(-4)}`,
      phone: driver.phone,
      description: "Test tractor for OTP verification.",
      image: {
        url: "https://example.com/tractor.jpg",
        filename: "tractor.jpg"
      }
    });

    // Helper: Make Fast Booking and accept it
    async function createAcceptedBooking(customFields = {}) {
      const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return Booking.create({
        requestType: "Machine",
        bookingType: "Single",
        itemId: machine._id,
        owner: driver._id,
        customer: farmer._id,
        customerName: farmer.fullName,
        customerPhone: farmer.phone,
        customerLocation: farmer.location,
        landArea: 2,
        bookingDate: new Date(),
        requiredDate: new Date(),
        workType: "Ploughing",
        pricePerUnit: 1500,
        originalPrice: 3000,
        basePrice: 3000,
        totalPrice: 3000,
        finalPrice: 3000,
        status: "Accepted",
        completionOtp: "123456",
        completionOtpExpiresAt: validUntil,
        otpVerified: false,
        ...customFields
      });
    }

    // ---------------------------------------------------------
    // TEST 1: Correct OTP before expiry -> Success, Completed, OTP cleared
    // ---------------------------------------------------------
    console.log("TEST 1: Correct OTP before expiry -> 200 OK, Completed, OTP cleared");
    const booking1 = await createAcceptedBooking({ completionOtp: "654321" });
    activeTestUser = driver;
    const res1 = await fetch(`${baseUrl}/api/group-bookings/single/${booking1._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "654321" })
    });
    const data1 = await res1.json();
    assert(res1.status === 200, `Status is 200 (received ${res1.status})`);
    assert(data1.status === "Completed", "Booking status is Completed");
    const check1 = await Booking.findById(booking1._id).select("+completionOtp +completionOtpExpiresAt");
    assert(check1.completionOtp === null, "completionOtp was cleared from database");
    assert(check1.completionOtpExpiresAt === null, "completionOtpExpiresAt was cleared from database");
    assert(check1.otpVerified === true, "otpVerified is set to true");

    // ---------------------------------------------------------
    // TEST 2: Incorrect OTP before expiry -> 400 Invalid OTP
    // ---------------------------------------------------------
    console.log("\nTEST 2: Incorrect OTP before expiry -> 400 Invalid OTP");
    const booking2 = await createAcceptedBooking({ completionOtp: "112233" });
    const res2 = await fetch(`${baseUrl}/api/group-bookings/single/${booking2._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "999999" })
    });
    const data2 = await res2.json();
    assert(res2.status === 400, `Status is 400 (received ${res2.status})`);
    assert(data2.message === "Invalid completion OTP.", `Error message: ${data2.message}`);
    const check2 = await Booking.findById(booking2._id).select("+completionOtp");
    assert(check2.status === "Accepted", "Booking remains Accepted");
    assert(check2.completionOtp === "112233", "completionOtp is unchanged");

    // ---------------------------------------------------------
    // TEST 3: Correct OTP after expiry -> 400 Expired OTP
    // ---------------------------------------------------------
    console.log("\nTEST 3: Correct OTP after expiry -> 400 Expired OTP");
    const expiredTimestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes in the past
    const booking3 = await createAcceptedBooking({
      completionOtp: "334455",
      completionOtpExpiresAt: expiredTimestamp
    });
    const res3 = await fetch(`${baseUrl}/api/group-bookings/single/${booking3._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "334455" })
    });
    const data3 = await res3.json();
    assert(res3.status === 400, `Status is 400 (received ${res3.status})`);
    assert(data3.message === "Completion OTP has expired.", `Error message: ${data3.message}`);
    const check3 = await Booking.findById(booking3._id);
    assert(check3.status === "Accepted", "Booking remains Accepted");

    // ---------------------------------------------------------
    // TEST 4: Farmer refresh (GET /my/requests) auto-regenerates fresh OTP for expired booking
    // ---------------------------------------------------------
    console.log("\nTEST 4: Farmer fetch (/my/requests) auto-regenerates fresh OTP for expired booking");
    activeTestUser = farmer;
    const res4 = await fetch(`${baseUrl}/api/group-bookings/my/requests`);
    const data4 = await res4.json();
    assert(res4.status === 200, `Status is 200 (received ${res4.status})`);
    const refreshedBooking3 = (data4.bookings || []).find((b) => b._id.toString() === booking3._id.toString());
    assert(Boolean(refreshedBooking3), "Booking found in Farmer requests");
    assert(Boolean(refreshedBooking3.completionOtp), `New OTP generated: ${refreshedBooking3?.completionOtp}`);
    assert(refreshedBooking3.completionOtp !== "334455", "New OTP differs from stale expired OTP");
    const refreshedExpiresAt = new Date(refreshedBooking3.completionOtpExpiresAt).getTime();
    assert(refreshedExpiresAt > Date.now(), "New OTP expiry is in the future (> Date.now())");

    // ---------------------------------------------------------
    // TEST 5: Old OTP fails after regeneration, new OTP succeeds
    // ---------------------------------------------------------
    console.log("\nTEST 5: Old OTP fails after regeneration, new OTP succeeds");
    activeTestUser = driver;
    // Attempt with old expired OTP
    const res5a = await fetch(`${baseUrl}/api/group-bookings/single/${booking3._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "334455" })
    });
    assert(res5a.status === 400, "Old OTP rejected with 400");
    // Attempt with fresh OTP
    const res5b = await fetch(`${baseUrl}/api/group-bookings/single/${booking3._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: refreshedBooking3.completionOtp })
    });
    assert(res5b.status === 200, `New OTP succeeds with 200 (received ${res5b.status})`);
    const check5 = await Booking.findById(booking3._id);
    assert(check5.status === "Completed", "Booking now marked Completed");

    // ---------------------------------------------------------
    // TEST 6: Missing/null expiry timestamp is handled safely without false rejection
    // ---------------------------------------------------------
    console.log("\nTEST 6: Missing/null expiry timestamp handled safely without false rejection");
    const booking6 = await createAcceptedBooking({
      completionOtp: "778899",
      completionOtpExpiresAt: null
    });
    const res6 = await fetch(`${baseUrl}/api/group-bookings/single/${booking6._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "778899" })
    });
    assert(res6.status === 200, `Legacy booking without expiry succeeds (received ${res6.status})`);
    const check6 = await Booking.findById(booking6._id);
    assert(check6.status === "Completed", "Booking completed successfully");

    // ---------------------------------------------------------
    // TEST 7: Unauthorized driver -> 403 Forbidden
    // ---------------------------------------------------------
    console.log("\nTEST 7: Unauthorized driver -> 403 Forbidden");
    const booking7 = await createAcceptedBooking({ completionOtp: "556677" });
    activeTestUser = otherDriver;
    const res7 = await fetch(`${baseUrl}/api/group-bookings/single/${booking7._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "556677" })
    });
    const data7 = await res7.json();
    assert(res7.status === 403, `Status is 403 Forbidden (received ${res7.status})`);
    assert(data7.message === "You are not authorized to perform actions on this booking.", `Error message: ${data7.message}`);

    // ---------------------------------------------------------
    // TEST 8: Already-completed booking -> 409 Conflict
    // ---------------------------------------------------------
    console.log("\nTEST 8: Already-completed booking -> 409 Conflict");
    activeTestUser = driver;
    // Complete booking7 legitimately first
    const res8a = await fetch(`${baseUrl}/api/group-bookings/single/${booking7._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "556677" })
    });
    assert(res8a.status === 200, "First completion succeeds");
    // Attempt second completion
    const res8b = await fetch(`${baseUrl}/api/group-bookings/single/${booking7._id}/complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: "556677" })
    });
    const data8b = await res8b.json();
    assert(res8b.status === 409, `Second completion returns 409 Conflict (received ${res8b.status})`);
    assert(data8b.message === "This booking has already been completed.", `Conflict message: ${data8b.message}`);

    // ---------------------------------------------------------
    // TEST 9: Explicit on-demand regeneration endpoint
    // ---------------------------------------------------------
    console.log("\nTEST 9: Explicit on-demand regeneration endpoint POST /single/:id/regenerate-otp");
    const booking9 = await createAcceptedBooking({ completionOtp: "991122" });
    activeTestUser = farmer;
    const res9 = await fetch(`${baseUrl}/api/group-bookings/single/${booking9._id}/regenerate-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data9 = await res9.json();
    assert(res9.status === 200, `Status is 200 (received ${res9.status})`);
    assert(Boolean(data9.completionOtp), `Regenerated OTP returned to Farmer: ${data9.completionOtp}`);
    assert(data9.completionOtp !== "991122", "Regenerated OTP differs from old OTP");
    const expiry9 = new Date(data9.expiresAt).getTime();
    assert(expiry9 > Date.now(), "Regenerated OTP has valid future expiration");

    // Test Driver regenerating OTP for single booking
    activeTestUser = driver;
    const res9Driver = await fetch(`${baseUrl}/api/group-bookings/single/${booking9._id}/regenerate-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data9Driver = await res9Driver.json();
    assert(res9Driver.status === 200, `Driver can regenerate OTP (received ${res9Driver.status})`);
    assert(data9Driver.message === "Completion OTP regenerated successfully.", "Driver receives success message");

    // ---------------------------------------------------------
    // TEST 10: Group Booking Member OTP verification & expiry
    // ---------------------------------------------------------
    console.log("\nTEST 10: Group Booking Member OTP verification & expiry");
    const group = await GroupBooking.create({
      listing: machine._id,
      owner: driver._id,
      requestType: "Machine",
      totalLandArea: 5,
      minimumRequiredLand: 5,
      groupDiscountPercent: 10,
      totalOriginalPrice: 7500,
      totalDiscount: 750,
      totalFinalPrice: 6750,
      location: "Pune, Maharashtra",
      status: "Accepted",
      bookingDate: new Date(),
      members: [
        {
          user: farmer._id,
          booking: new mongoose.Types.ObjectId(),
          landArea: 5,
          location: "Pune, Maharashtra",
          originalPrice: 7500,
          discountAmount: 750,
          finalPrice: 6750,
          status: "Confirmed",
          completionOtp: "445566",
          completionOtpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          otpVerified: false
        }
      ]
    });
    const memberId = group.members[0]._id;

    // Unauthorized driver verification test
    activeTestUser = otherDriver;
    const res10a = await fetch(`${baseUrl}/api/group-bookings/${group._id}/verify-member-otp`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, otp: "445566" })
    });
    assert(res10a.status === 403, `Unauthorized driver returns 403 (received ${res10a.status})`);

    // Authorized driver incorrect OTP
    activeTestUser = driver;
    const res10b = await fetch(`${baseUrl}/api/group-bookings/${group._id}/verify-member-otp`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, otp: "000000" })
    });
    assert(res10b.status === 400, `Incorrect member OTP returns 400 (received ${res10b.status})`);

    // Authorized driver regenerates group member OTP
    const res10Regen = await fetch(`${baseUrl}/api/group-bookings/${group._id}/member/${memberId}/regenerate-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data10Regen = await res10Regen.json();
    assert(res10Regen.status === 200, `Driver regenerates member OTP (received ${res10Regen.status})`);
    assert(data10Regen.message === "Farmer completion OTP regenerated successfully.", "Driver receives success message for group member regen");
    const updatedGroupAfterRegen = await GroupBooking.findById(group._id).select("+members.completionOtp");
    const freshMemberOtp = updatedGroupAfterRegen.members.id(memberId).completionOtp;
    assert(Boolean(freshMemberOtp), `Fresh member OTP created: ${freshMemberOtp}`);
    assert(freshMemberOtp !== "445566", "Fresh member OTP is different from old OTP");

    // Authorized driver verifies with fresh OTP
    const res10c = await fetch(`${baseUrl}/api/group-bookings/${group._id}/verify-member-otp`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, otp: freshMemberOtp })
    });
    assert(res10c.status === 200, `Authorized driver verification returns 200 (received ${res10c.status})`);
    const checkGroup = await GroupBooking.findById(group._id).select("+members.completionOtp +members.completionOtpExpiresAt");
    const checkMember = checkGroup.members.id(memberId);
    assert(checkMember.otpVerified === true, "Member otpVerified is true");
    assert(checkMember.completionOtp === null, "Member completionOtp cleared");
    assert(checkGroup.otpVerified === true, "Group overall otpVerified is true");

    // Clean up
    await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id, booking3._id, booking6._id, booking7._id, booking9._id] } });
    await GroupBooking.deleteOne({ _id: group._id });
    await Machine.deleteOne({ _id: machine._id });
    await User.deleteMany({ _id: { $in: [farmer._id, driver._id, otherDriver._id] } });

    console.log(`\n======================================================================`);
    console.log(`Results: ${passed} passed, ${failed} failed.`);
    console.log(`======================================================================`);

    if (failed > 0) {
      throw new Error(`${failed} tests failed!`);
    }
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
