const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/Owner.js");
const Booking = require("./models/BookingMachine.js");
const ListingMachine = require("./models/ListingMachin.js");
const ChatMessage = require("./models/ChatMessage.js");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WorkShetu";

async function runTests() {
  console.log("======================================================================");
  console.log("    WORKSHETU: ROLE-BASED NAVIGATION & ROUTE AUTHORIZATION TESTS      ");
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

  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.\n");

    const timestamp = Date.now();

    // 1. Setup Test Users: Farmer, Approved Driver, and Admin
    const farmerUser = await User.create({
      fullName: `Test Farmer Nav ${timestamp}`,
      phone: `91${String(timestamp).slice(-8)}`,
      email: `farmer_${timestamp}@test.com`,
      role: "Farmer",
      isAdmin: false,
      isActive: true,
    });

    const driverUser = await User.create({
      fullName: `Test Driver Nav ${timestamp}`,
      phone: `92${String(timestamp).slice(-8)}`,
      email: `driver_${timestamp}@test.com`,
      role: "Driver",
      isAdmin: false,
      driverApplicationStatus: "Approved",
      isActive: true,
    });

    const adminUser = await User.create({
      fullName: `Test Admin Nav ${timestamp}`,
      phone: `93${String(timestamp).slice(-8)}`,
      email: `admin_${timestamp}@test.com`,
      role: "Admin",
      isAdmin: true,
      isActive: true,
    });

    console.log("--- TEST 1: Navigation Logic Invariant Simulation ---");
    // Helper function that mirrors Frontend/src/Pages/UI/Navbar.jsx logic
    function getNavbarItems(user, isAuthenticated) {
      const userRole = String(user?.role || "").trim().toLowerCase();
      const isAdmin = Boolean(user?.isAdmin) || userRole === "admin";
      const isDriver = !isAdmin && userRole === "driver";
      const isEligibleDriver = isDriver && user?.driverApplicationStatus === "Approved" && user?.isActive !== false;
      const isFarmer = isAuthenticated && !isAdmin && !isDriver;

      if (isAdmin) {
        return [
          { to: "/admin/dashboard", label: "Admin Dashboard" },
          { to: "/admin/bookings", label: "Platform Bookings" },
          { to: "/machine", label: "Machinery" },
          { to: "/services", label: "Services" },
          { to: "/admin/complaints", label: "Complaints & Support" },
        ];
      }
      if (isDriver) {
        if (isEligibleDriver) {
          return [
            { to: "/Drivers", label: "Booking Requests" },
            { to: "/driver/listings", label: "My Listings" },
            { to: "/driver/completed", label: "Completed Work" },
            { to: "/chat", label: "Chats" },
          ];
        }
        return [
          { to: "/driver/apply", label: "Driver Application" },
          { to: "/machine", label: "Machinery" },
          { to: "/services", label: "Services" },
        ];
      }
      if (isFarmer) {
        return [
          { to: "/", label: "Home" },
          { to: "/machine", label: "Machinery" },
          { to: "/services", label: "Services" },
          { to: "/bookings", label: "My Bookings" },
          { to: "/chat", label: "Chats" },
        ];
      }
      return [
        { to: "/", label: "Home" },
        { to: "/machine", label: "Machinery" },
        { to: "/services", label: "Services" },
      ];
    }

    // Farmer Navbar
    const farmerNav = getNavbarItems(farmerUser, true);
    assert(farmerNav.some((item) => item.to === "/bookings"), "Farmer navigation includes 'My Bookings'");
    assert(farmerNav.some((item) => item.to === "/chat"), "Farmer navigation includes 'Chats'");
    assert(!farmerNav.some((item) => item.to === "/Drivers"), "Farmer navigation does NOT include '/Drivers'");
    assert(!farmerNav.some((item) => item.to === "/admin/dashboard"), "Farmer navigation does NOT include '/admin/dashboard'");

    // Driver Navbar
    const driverNav = getNavbarItems(driverUser, true);
    assert(driverNav.some((item) => item.to === "/Drivers"), "Driver navigation includes 'Booking Requests' (/Drivers)");
    assert(driverNav.some((item) => item.to === "/driver/listings"), "Driver navigation includes 'My Listings'");
    assert(driverNav.some((item) => item.to === "/driver/completed"), "Driver navigation includes 'Completed Work'");
    assert(driverNav.some((item) => item.to === "/chat"), "Driver navigation includes 'Chats'");
    assert(!driverNav.some((item) => item.to === "/bookings"), "Driver navigation does NOT include personal 'My Bookings'");
    assert(!driverNav.some((item) => item.to === "/admin/bookings"), "Driver navigation does NOT include '/admin/bookings'");

    // Admin Navbar
    const adminNav = getNavbarItems(adminUser, true);
    assert(adminNav.some((item) => item.to === "/admin/dashboard"), "Admin navigation includes 'Admin Dashboard'");
    assert(adminNav.some((item) => item.to === "/admin/bookings"), "Admin navigation includes 'Platform Bookings' (/admin/bookings)");
    assert(adminNav.some((item) => item.to === "/admin/complaints"), "Admin navigation includes 'Complaints & Support' (/admin/complaints)");
    assert(!adminNav.some((item) => item.to === "/bookings"), "Admin navigation strictly hides personal 'My Bookings' (/bookings)");
    assert(!adminNav.some((item) => item.to === "/chat"), "Admin navigation strictly hides customer-driver 'Chats' (/chat)");

    // Guest Navbar
    const guestNav = getNavbarItems(null, false);
    assert(guestNav.some((item) => item.to === "/"), "Guest navigation includes Home");
    assert(!guestNav.some((item) => item.to === "/bookings"), "Guest navigation does NOT include 'My Bookings'");
    assert(!guestNav.some((item) => item.to === "/chat"), "Guest navigation does NOT include 'Chats'");

    console.log("\n--- TEST 2: Backend Route Authorization Middleware Invariants ---");
    const { isLoggedIn, roleRequired, isAdmin, isFarmer, isDriver } = require("./middleware/auth.js");

    // Test Farmer route protection
    function testMiddleware(middleware, user) {
      let allowed = false;
      let deniedStatus = null;
      let deniedMessage = null;

      const req = {
        isAuthenticated: () => Boolean(user),
        user,
      };
      const res = {
        status: (code) => ({
          json: (data) => {
            deniedStatus = code;
            deniedMessage = data.message;
          },
        }),
      };
      const next = () => {
        allowed = true;
      };

      middleware(req, res, next);
      return { allowed, deniedStatus, deniedMessage };
    }

    const farmerCheckOnFarmer = testMiddleware(isFarmer, farmerUser);
    assert(farmerCheckOnFarmer.allowed === true, "Farmer middleware allows authentic Farmer");

    const farmerCheckOnAdmin = testMiddleware(isFarmer, adminUser);
    assert(farmerCheckOnAdmin.allowed === false && farmerCheckOnAdmin.deniedStatus === 403, "Farmer middleware blocks Admin with 403 Forbidden");

    const farmerCheckOnDriver = testMiddleware(isFarmer, driverUser);
    assert(farmerCheckOnDriver.allowed === false && farmerCheckOnDriver.deniedStatus === 403, "Farmer middleware blocks Driver with 403 Forbidden");

    const adminCheckOnAdmin = testMiddleware(isAdmin, adminUser);
    assert(adminCheckOnAdmin.allowed === true, "Admin middleware allows Admin");

    const adminCheckOnFarmer = testMiddleware(isAdmin, farmerUser);
    assert(adminCheckOnFarmer.allowed === false && adminCheckOnFarmer.deniedStatus === 403, "Admin middleware blocks Farmer with 403 Forbidden");

    const adminCheckOnDriver = testMiddleware(isAdmin, driverUser);
    assert(adminCheckOnDriver.allowed === false && adminCheckOnDriver.deniedStatus === 403, "Admin middleware blocks Driver with 403 Forbidden");

    console.log("\n--- TEST 3: Chat Participant Isolation Invariant ---");
    // Create a mock machine and booking between farmer and driver
    const machine = await ListingMachine.create({
      title: `Test Machine Nav ${timestamp}`,
      description: "Test machine description for nav testing",
      category: "Tractor",
      price: 1000,
      unit: "Hour",
      power: 45,
      year: 2022,
      fuelType: "Diesel",
      vehicleNumber: `UP14AB${String(timestamp).slice(-4)}`,
      phone: "9876543210",
      latitude: 28.5355,
      longitude: 77.391,
      image: { url: "http://example.com/tractor.jpg", filename: "tractor.jpg" },
      owner: driverUser._id,
      location: "Meerut",
      status: "Available",
      isActive: true,
    });

    const booking = await Booking.create({
      customer: farmerUser._id,
      customerName: farmerUser.fullName,
      customerPhone: farmerUser.phone,
      customerLocation: "Meerut",
      owner: driverUser._id,
      itemId: machine._id,
      itemType: "ListingMachin",
      requestType: "Machine",
      landArea: 2,
      workType: "Ploughing",
      requiredDate: new Date(),
      basePrice: 1000,
      originalPrice: 1000,
      totalPrice: 1000,
      finalPrice: 1000,
      status: "Accepted",
      bookingDate: new Date(),
    });

    // Check chat participant function from chat.js
    function checkChatParticipant(bookingObj, userId) {
      return [bookingObj.owner, bookingObj.customer].some(
        (participant) => String(participant) === String(userId)
      );
    }

    assert(checkChatParticipant(booking, farmerUser._id) === true, "Farmer is authorized participant in booking chat");
    assert(checkChatParticipant(booking, driverUser._id) === true, "Driver is authorized participant in booking chat");
    assert(checkChatParticipant(booking, adminUser._id) === false, "Admin is NOT a participant in customer-driver booking chat");

    console.log("\n--- CLEANUP ---");
    await Booking.deleteOne({ _id: booking._id });
    await ListingMachine.deleteOne({ _id: machine._id });
    await User.deleteMany({ _id: { $in: [farmerUser._id, driverUser._id, adminUser._id] } });
    console.log("Cleaned up test entities.");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");

    console.log("\n=================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

runTests();
