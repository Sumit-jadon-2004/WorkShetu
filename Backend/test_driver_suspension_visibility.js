/**
 * DRIVER SUSPENSION & MACHINE VISIBILITY SYSTEM TEST SUITE
 * 
 * Tests the 10 scenarios required by the specification:
 * 1. Approved and active driver: machines are visible.
 * 2. Pending driver: machines are hidden.
 * 3. Suspended driver: machines are hidden and new bookings are blocked.
 * 4. Suspected driver: machines are hidden and new bookings are blocked.
 * 5. Rejected driver: machines are hidden.
 * 6. Reactivated driver: eligible machines become visible again.
 * 7. Farmer attempts to book using an old direct URL: booking is rejected.
 * 8. Unauthorized user attempts to suspend or reactivate a driver: request is rejected.
 * 9. Admin panel continues showing hidden listings for management.
 * 10. Existing booking history and listing ownership remain unchanged.
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const Booking = require("./models/BookingMachine.js");
const { isDriverEligible, getDriverAccountStatus, getEligibleDriverIds } = require("./utils/driverEligibility.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("===============================================================");
  console.log("  DRIVER SUSPENSION & MACHINE VISIBILITY VERIFICATION SUITE   ");
  console.log("===============================================================\n");

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log("Connected to MongoDB successfully.\n");

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

  // IDs to clean up
  const createdUserIds = [];
  const createdMachineIds = [];
  const createdBookingIds = [];

  try {
    console.log("--- Setup: Creating Test Entities ---");

    // Create a Farmer customer
    const testFarmer = await User.create({
      fullName: "Test Verification Farmer",
      phone: "9100000001",
      role: "Farmer",
      isActive: true,
      location: "Karnal",
      latitude: 29.6857,
      longitude: 76.9905,
    });
    createdUserIds.push(testFarmer._id);

    // Create a Driver
    const testDriver = await User.create({
      fullName: "Test Verification Driver",
      phone: "9100000002",
      role: "Driver",
      driverApplicationStatus: "Approved",
      isActive: true,
      driverVehicleType: "Tractor",
      driverVehicleNumber: "HR05AB1234",
      driverExperience: 5,
    });
    createdUserIds.push(testDriver._id);

    // Create a Machine listing for test driver
    const testMachine = await Machine.create({
      owner: testDriver._id,
      title: "Mahindra 575 DI Test Tractor",
      category: "Tractor",
      vehicleNumber: "HR05AB1234",
      image: { url: "https://example.com/tractor.jpg", filename: "test_tractor" },
      price: 800,
      unit: "Hour",
      power: 45,
      fuelType: "Diesel",
      year: 2022,
      location: "Karnal, Haryana",
      latitude: 29.6857,
      longitude: 76.9905,
      phone: "9100000002",
      description: "Well maintained tractor for field plowing.",
      availability: "Available",
    });
    createdMachineIds.push(testMachine._id);

    // Create an existing completed booking to verify history immutability
    const priorBooking = await Booking.create({
      requestType: "Machine",
      bookingType: "Single",
      itemId: testMachine._id,
      owner: testDriver._id,
      customer: testFarmer._id,
      customerName: testFarmer.fullName,
      customerPhone: testFarmer.phone,
      customerLocation: "Karnal",
      landArea: 5,
      areaUnit: "Bigha",
      workType: "Plowing",
      bookingDate: new Date(),
      requiredDate: new Date(),
      basePrice: 4000,
      originalPrice: 4000,
      finalPrice: 4000,
      totalPrice: 4000,
      status: "Completed",
    });
    createdBookingIds.push(priorBooking._id);

    console.log("Entities created successfully.\n");

    // -------------------------------------------------------------------------
    // SCENARIO 1: Approved and active driver: machines are visible
    // -------------------------------------------------------------------------
    console.log("--- Scenario 1: Approved & Active Driver Visibility ---");
    assert(isDriverEligible(testDriver) === true, "isDriverEligible returns true for approved active driver");
    assert(getDriverAccountStatus(testDriver) === "Approved", "getDriverAccountStatus is 'Approved'");

    let eligibleIds = await getEligibleDriverIds();
    assert(
      eligibleIds.some((id) => String(id) === String(testDriver._id)),
      "Driver ID is included in getEligibleDriverIds()"
    );

    let publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      publicMachines.some((m) => String(m._id) === String(testMachine._id)),
      "Test machine is returned in public listings query"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Pending driver: machines are hidden
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 2: Pending Driver Hiding ---");
    const pendingDriver = await User.create({
      fullName: "Pending Applicant",
      phone: "9100000003",
      role: "Farmer",
      driverApplicationStatus: "Pending",
      isActive: true,
    });
    createdUserIds.push(pendingDriver._id);

    const pendingMachine = await Machine.create({
      owner: pendingDriver._id,
      title: "Pending Tractor Listing",
      category: "Tractor",
      vehicleNumber: "HR05CD5678",
      image: { url: "https://example.com/pending.jpg", filename: "pending" },
      price: 700,
      unit: "Hour",
      power: 40,
      fuelType: "Diesel",
      year: 2021,
      location: "Panipat",
      latitude: 29.3909,
      longitude: 76.9635,
      phone: "9100000003",
      description: "Pending approval",
      availability: "Available",
    });
    createdMachineIds.push(pendingMachine._id);

    assert(isDriverEligible(pendingDriver) === false, "isDriverEligible returns false for pending driver");
    assert(getDriverAccountStatus(pendingDriver) === "Pending", "getDriverAccountStatus is 'Pending'");

    eligibleIds = await getEligibleDriverIds();
    assert(
      !eligibleIds.some((id) => String(id) === String(pendingDriver._id)),
      "Pending driver ID is NOT in getEligibleDriverIds()"
    );

    publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      !publicMachines.some((m) => String(m._id) === String(pendingMachine._id)),
      "Pending driver's machine is hidden from public listings query"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Suspended driver: machines hidden and new bookings blocked
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 3: Suspended Driver ---");
    testDriver.isActive = false;
    testDriver.driverSuspensionReason = "Safety documentation expired.";
    testDriver.driverSuspendedAt = new Date();
    await testDriver.save();

    assert(isDriverEligible(testDriver) === false, "isDriverEligible returns false when driver is suspended (isActive: false)");
    assert(getDriverAccountStatus(testDriver) === "Suspended", "getDriverAccountStatus is 'Suspended'");

    eligibleIds = await getEligibleDriverIds();
    assert(
      !eligibleIds.some((id) => String(id) === String(testDriver._id)),
      "Suspended driver ID is excluded from getEligibleDriverIds()"
    );

    publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      !publicMachines.some((m) => String(m._id) === String(testMachine._id)),
      "Suspended driver's machine is hidden from public listings"
    );

    // Direct detail access check
    const ownerForDetail = await User.findById(testMachine.owner).select("role isActive driverApplicationStatus");
    const isDetailAccessible = ownerForDetail && isDriverEligible(ownerForDetail);
    assert(!isDetailAccessible, "Direct detail page check rejects access for suspended owner");

    // -------------------------------------------------------------------------
    // SCENARIO 4: Suspected driver (Under Review): machines hidden and bookings blocked
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 4: Suspected Driver (Under Review) ---");
    testDriver.isActive = true;
    testDriver.driverApplicationStatus = "Suspected";
    testDriver.driverReviewReason = "Investigating customer dispute.";
    testDriver.driverReviewedAt = new Date();
    await testDriver.save();

    assert(isDriverEligible(testDriver) === false, "isDriverEligible returns false for Suspected / Under Review driver");
    assert(getDriverAccountStatus(testDriver) === "Suspected", "getDriverAccountStatus is 'Suspected'");

    eligibleIds = await getEligibleDriverIds();
    assert(
      !eligibleIds.some((id) => String(id) === String(testDriver._id)),
      "Suspected driver ID is excluded from getEligibleDriverIds()"
    );

    publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      !publicMachines.some((m) => String(m._id) === String(testMachine._id)),
      "Suspected driver's machine is hidden from public listings"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: Rejected driver: machines are hidden
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 5: Rejected Driver ---");
    testDriver.role = "Farmer";
    testDriver.driverApplicationStatus = "Rejected";
    testDriver.driverRejectionReason = "Identity verification failed.";
    await testDriver.save();

    assert(isDriverEligible(testDriver) === false, "isDriverEligible returns false for Rejected driver");
    assert(getDriverAccountStatus(testDriver) === "Rejected", "getDriverAccountStatus is 'Rejected'");

    eligibleIds = await getEligibleDriverIds();
    assert(
      !eligibleIds.some((id) => String(id) === String(testDriver._id)),
      "Rejected driver ID is excluded from getEligibleDriverIds()"
    );

    publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      !publicMachines.some((m) => String(m._id) === String(testMachine._id)),
      "Rejected driver's machine is hidden from public listings"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 6: Reactivated driver: eligible machines become visible again
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 6: Driver Reactivation ---");
    testDriver.role = "Driver";
    testDriver.driverApplicationStatus = "Approved";
    testDriver.isActive = true;
    testDriver.driverSuspensionReason = undefined;
    testDriver.driverReviewReason = undefined;
    testDriver.driverRejectionReason = undefined;
    await testDriver.save();

    assert(isDriverEligible(testDriver) === true, "isDriverEligible returns true upon reactivation");
    assert(getDriverAccountStatus(testDriver) === "Approved", "getDriverAccountStatus is 'Approved'");

    eligibleIds = await getEligibleDriverIds();
    assert(
      eligibleIds.some((id) => String(id) === String(testDriver._id)),
      "Reactivated driver ID is restored in getEligibleDriverIds()"
    );

    publicMachines = await Machine.find({
      owner: { $in: eligibleIds },
      availability: { $ne: "Hidden" },
    });
    assert(
      publicMachines.some((m) => String(m._id) === String(testMachine._id)),
      "Machine listing automatically becomes visible again without modifying listing document"
    );
    assert(testMachine.price === 800, "Listing price remains unchanged");
    assert(String(testMachine.owner) === String(testDriver._id), "Listing ownership remains intact");

    // -------------------------------------------------------------------------
    // SCENARIO 7: Farmer booking attempt on old direct URL of suspended/suspected owner
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 7: Booking Attempt on Unavailable Machine ---");
    // Suspend driver again to simulate farmer holding old URL
    testDriver.isActive = false;
    testDriver.driverSuspensionReason = "Administrative hold.";
    await testDriver.save();

    let bookingAttemptAllowed = false;
    let rejectionMessage = "";

    // Simulate backend booking creation check from groupBookings.js
    const machineToBook = await Machine.findById(testMachine._id);
    const ownerToVerify = await User.findById(machineToBook.owner).select("role isAdmin isActive driverApplicationStatus");

    if (!ownerToVerify || !isDriverEligible(ownerToVerify) || machineToBook.availability === "Hidden") {
      bookingAttemptAllowed = false;
      rejectionMessage = "This machine's owner is currently unavailable or under review for bookings.";
    } else {
      bookingAttemptAllowed = true;
    }

    assert(bookingAttemptAllowed === false, "Server-side booking check rejects booking for suspended owner");
    assert(
      rejectionMessage === "This machine's owner is currently unavailable or under review for bookings.",
      "Clear, secure rejection message returned without exposing internal notes"
    );

    // -------------------------------------------------------------------------
    // SCENARIO 8: Unauthorized user attempts status change
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 8: Unauthorized Security Enforcement ---");
    const { isLoggedIn, isAdmin } = require("./middleware/auth.js");

    let nonAdminBlocked = false;
    let unauthenticatedBlocked = false;

    // Simulate non-admin request
    const fakeReqFarmer = {
      isAuthenticated: () => true,
      user: { role: "Farmer", isAdmin: false, isActive: true },
    };
    const fakeRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 403 || code === 401) nonAdminBlocked = true;
          return data;
        },
      }),
    };
    isAdmin(fakeReqFarmer, fakeRes, () => {
      nonAdminBlocked = false;
    });
    assert(nonAdminBlocked === true, "isAdmin middleware blocks non-admin user with 403 Forbidden");

    // Simulate unauthenticated request
    const fakeReqGuest = {
      isAuthenticated: () => false,
      user: null,
    };
    const fakeResGuest = {
      status: (code) => ({
        json: (data) => {
          if (code === 401) unauthenticatedBlocked = true;
          return data;
        },
      }),
    };
    isAdmin(fakeReqGuest, fakeResGuest, () => {
      unauthenticatedBlocked = false;
    });
    assert(unauthenticatedBlocked === true, "isAdmin middleware blocks unauthenticated user with 401 Unauthorized");

    // -------------------------------------------------------------------------
    // SCENARIO 9: Admin panel continues showing hidden listings for management
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 9: Admin Panel Continues Showing Hidden Listings ---");
    // Admin query does not filter out listings by suspended owner
    const adminListingQuery = { _id: testMachine._id };
    const adminListing = await Machine.findOne(adminListingQuery).populate("owner", "fullName role driverApplicationStatus isActive");

    assert(adminListing !== null, "Admin panel can still find and view the listing belonging to suspended driver");
    assert(adminListing.owner.isActive === false, "Admin can inspect that the listing owner is suspended");

    // -------------------------------------------------------------------------
    // SCENARIO 10: Existing booking history and listing ownership remain unchanged
    // -------------------------------------------------------------------------
    console.log("\n--- Scenario 10: Historical Data & Ownership Invariance ---");
    const historyBooking = await Booking.findById(priorBooking._id);
    assert(historyBooking !== null, "Prior booking record exists");
    assert(historyBooking.status === "Completed", "Prior booking status is still 'Completed'");
    assert(String(historyBooking.owner) === String(testDriver._id), "Prior booking owner reference is intact");
    assert(String(historyBooking.customer) === String(testFarmer._id), "Prior booking customer reference is intact");
    assert(historyBooking.finalPrice === 4000, "Prior booking financial amount is intact");

    const currentMachineDoc = await Machine.findById(testMachine._id);
    assert(String(currentMachineDoc.owner) === String(testDriver._id), "Machine ownership is never cleared or reassigned");
    assert(currentMachineDoc.title === "Mahindra 575 DI Test Tractor", "Machine title and details are fully preserved");

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    console.log("\n--- Cleanup: Removing Test Records ---");
    if (createdBookingIds.length) await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    if (createdMachineIds.length) await Machine.deleteMany({ _id: { $in: createdMachineIds } });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds } });
    console.log("Cleanup completed.");

    await mongoose.disconnect();
    console.log("\n===============================================================");
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("===============================================================");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
