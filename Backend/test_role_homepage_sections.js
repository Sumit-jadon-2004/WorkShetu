/**
 * Automated Verification Suite: Role-Based Homepage Sections & Route Authorization
 * Tests Admin, Eligible Driver, Pending Driver, Farmer, and Guest user scenarios,
 * role case normalization, and backend API authorization guards.
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");
const User = require("./models/Owner.js");
const { isDriverEligible, getDriverAccountStatus } = require("./utils/driverEligibility.js");
const { safeUser, roleRequired, isAdmin: adminRequired } = require("./middleware/auth.js");

const MONGO_URI = (process.env.MONGO_URL || "").trim();

async function runTests() {
  console.log("==================================================================");
  console.log("   ROLE-BASED HOMEPAGE SECTIONS & ROUTE AUTHORIZATION TESTS       ");
  console.log("==================================================================\n");

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

  // Frontend logic simulator matching HeroSection.jsx
  function evaluateHomepageHero(user, isAuthenticated) {
    const userRole = String(user?.role || "").trim().toLowerCase();
    const isAdmin = Boolean(user?.isAdmin) || userRole === "admin";
    const isDriver = !isAdmin && userRole === "driver";
    const isFarmer = !isAdmin && !isDriver;
    const isEligibleDriver =
      isDriver &&
      user?.driverApplicationStatus === "Approved" &&
      user?.isActive !== false;

    const dashboardPath = isAdmin
      ? "/admin/dashboard"
      : isEligibleDriver
        ? "/Drivers"
        : isDriver
          ? "/driver/apply"
          : "/bookings";

    const dashboardLabel = isAdmin
      ? "Admin Dashboard"
      : isEligibleDriver
        ? "Driver Dashboard"
        : isDriver
          ? "Driver Application"
          : "My Bookings";

    // Compute buttons rendered on the homepage
    let buttons = [];
    if (isAuthenticated && isAdmin) {
      buttons = [
        { label: "Admin Dashboard", to: "/admin/dashboard", isPrimary: true },
        { label: "Find Machines / Workers", href: "#services", isSecondary: true },
      ];
    } else if (isAuthenticated && isDriver) {
      if (isEligibleDriver) {
        buttons = [
          { label: "Driver Dashboard", to: "/Drivers", isPrimary: true },
          { label: "Find Machines / Workers", href: "#services", isSecondary: true },
        ];
      } else {
        buttons = [
          { label: "Find Machines / Workers", href: "#services", isPrimary: true },
          { label: "Driver Application", to: "/driver/apply", isSecondary: true },
        ];
      }
    } else if (isAuthenticated && isFarmer) {
      buttons = [
        { label: "Find Machines / Workers", href: "#services", isPrimary: true },
        { label: "My Bookings", to: "/bookings", isSecondary: true },
      ];
    } else {
      // Guest
      buttons = [
        { label: "Find Machines / Workers", href: "#services", isPrimary: true },
        { label: "Sign In / Register", to: "/login", isSecondary: true },
      ];
    }

    const hasDriverDashboard = buttons.some((b) => b.label === "Driver Dashboard");
    const hasAdminDashboard = buttons.some((b) => b.label === "Admin Dashboard");
    const hasFindMachines = buttons.some((b) => b.label === "Find Machines / Workers");

    return {
      isAdmin,
      isDriver,
      isFarmer,
      isEligibleDriver,
      dashboardPath,
      dashboardLabel,
      buttons,
      hasDriverDashboard,
      hasAdminDashboard,
      hasFindMachines,
    };
  }

  // --- 1. ADMIN USER ---
  console.log("--- 1. Testing Admin User ---");
  const adminUserCapital = { fullName: "Admin User", role: "Admin", isAdmin: true, isActive: true };
  const resAdmin1 = evaluateHomepageHero(adminUserCapital, true);
  assert(resAdmin1.isAdmin === true, "Admin (role: 'Admin') correctly identified as Admin");
  assert(resAdmin1.hasDriverDashboard === false, "Driver Dashboard button is NOT shown to Admin");
  assert(resAdmin1.hasAdminDashboard === true, "Admin Dashboard button IS shown to Admin");
  assert(resAdmin1.dashboardPath === "/admin/dashboard", "Admin dashboard path points to /admin/dashboard");
  assert(resAdmin1.dashboardLabel === "Admin Dashboard", "Admin header label is 'Admin Dashboard'");

  const adminUserLower = { fullName: "Super Admin", role: "admin", isAdmin: false, isActive: true };
  const resAdmin2 = evaluateHomepageHero(adminUserLower, true);
  assert(resAdmin2.isAdmin === true, "Admin (role: 'admin' lowercase) correctly identified as Admin");
  assert(resAdmin2.hasDriverDashboard === false, "Driver Dashboard button is NOT shown to lowercase 'admin'");
  assert(resAdmin2.hasAdminDashboard === true, "Admin Dashboard button IS shown to lowercase 'admin'");

  // --- 2. ELIGIBLE DRIVER USER ---
  console.log("\n--- 2. Testing Eligible Approved Driver User ---");
  const approvedDriver = {
    fullName: "Raju Driver",
    role: "Driver",
    driverApplicationStatus: "Approved",
    isActive: true,
  };
  const resDriver1 = evaluateHomepageHero(approvedDriver, true);
  assert(resDriver1.isEligibleDriver === true, "Approved Driver evaluated as eligible driver");
  assert(resDriver1.hasDriverDashboard === true, "Driver Dashboard button IS shown to eligible driver");
  assert(resDriver1.hasAdminDashboard === false, "Admin Dashboard button is NOT shown to driver");
  assert(resDriver1.dashboardPath === "/Drivers", "Driver dashboard path points to /Drivers");
  assert(resDriver1.dashboardLabel === "Driver Dashboard", "Driver header label is 'Driver Dashboard'");

  // Test lowercase driver role variation
  const approvedDriverLower = {
    fullName: "Raju Driver",
    role: "driver",
    driverApplicationStatus: "Approved",
    isActive: true,
  };
  const resDriverLower = evaluateHomepageHero(approvedDriverLower, true);
  assert(resDriverLower.isEligibleDriver === true, "Lowercase 'driver' evaluated as eligible driver");
  assert(resDriverLower.hasDriverDashboard === true, "Driver Dashboard button IS shown to lowercase 'driver'");

  // --- 3. PENDING / SUSPENDED DRIVER USER ---
  console.log("\n--- 3. Testing Pending / Ineligible Driver User ---");
  const pendingDriver = {
    fullName: "Vikram Pending",
    role: "Driver",
    driverApplicationStatus: "Pending",
    isActive: true,
  };
  const resDriverPending = evaluateHomepageHero(pendingDriver, true);
  assert(resDriverPending.isEligibleDriver === false, "Pending Driver is evaluated as NOT eligible");
  assert(resDriverPending.hasDriverDashboard === false, "Driver Dashboard button is HIDDEN for pending driver");
  assert(resDriverPending.buttons.some((b) => b.label === "Driver Application"), "Driver Application status button is shown instead");

  const suspendedDriver = {
    fullName: "Sohan Suspended",
    role: "Driver",
    driverApplicationStatus: "Approved",
    isActive: false, // Suspended
  };
  const resDriverSuspended = evaluateHomepageHero(suspendedDriver, true);
  assert(resDriverSuspended.isEligibleDriver === false, "Suspended Driver is evaluated as NOT eligible");
  assert(resDriverSuspended.hasDriverDashboard === false, "Driver Dashboard button is HIDDEN for suspended driver");

  // --- 4. FARMER USER ---
  console.log("\n--- 4. Testing Farmer User ---");
  const farmerUser = {
    fullName: "Kisan Ramesh",
    role: "Farmer",
    isActive: true,
  };
  const resFarmer = evaluateHomepageHero(farmerUser, true);
  assert(resFarmer.isFarmer === true, "Farmer evaluated as Farmer");
  assert(resFarmer.hasDriverDashboard === false, "Driver Dashboard button is completely HIDDEN for Farmer");
  assert(resFarmer.hasAdminDashboard === false, "Admin Dashboard button is completely HIDDEN for Farmer");
  assert(resFarmer.hasFindMachines === true, "Find Machines / Workers button IS shown for Farmer");
  assert(resFarmer.buttons.some((b) => b.label === "My Bookings"), "My Bookings button IS shown for Farmer");
  assert(resFarmer.dashboardPath === "/bookings", "Farmer dashboard path points to /bookings");

  // --- 5. GUEST USER (UNAUTHENTICATED) ---
  console.log("\n--- 5. Testing Guest / Unauthenticated User ---");
  const resGuest = evaluateHomepageHero(null, false);
  assert(resGuest.hasDriverDashboard === false, "Driver Dashboard button is completely HIDDEN for Guest");
  assert(resGuest.hasAdminDashboard === false, "Admin Dashboard button is completely HIDDEN for Guest");
  assert(resGuest.hasFindMachines === true, "Find Machines / Workers button IS shown for Guest");
  assert(resGuest.buttons.some((b) => b.label === "Sign In / Register"), "Sign In / Register button IS shown for Guest");

  // --- 6. SERVER-SIDE AUTHORIZATION GUARDS ---
  console.log("\n--- 6. Testing Server-Side Authorization Middleware ---");
  let mockRes;
  function createMockRes() {
    return {
      statusCode: 200,
      data: null,
      status(code) { this.statusCode = code; return this; },
      json(obj) { this.data = obj; return this; },
    };
  }

  // 6.1: Non-admin trying to access Admin endpoint
  let calledNext = false;
  mockRes = createMockRes();
  adminRequired(
    { isAuthenticated: () => true, user: { role: "Farmer", isAdmin: false, isActive: true } },
    mockRes,
    () => { calledNext = true; }
  );
  assert(mockRes.statusCode === 403 && !calledNext, "adminRequired blocks Farmer with 403 Forbidden");

  // 6.2: Admin permitted by adminRequired
  calledNext = false;
  mockRes = createMockRes();
  adminRequired(
    { isAuthenticated: () => true, user: { role: "Admin", isAdmin: true, isActive: true } },
    mockRes,
    () => { calledNext = true; }
  );
  assert(calledNext === true, "adminRequired permits Admin user");

  // 6.3: Non-driver trying to access Driver endpoint
  const driverRoleMiddleware = roleRequired("Driver");
  calledNext = false;
  mockRes = createMockRes();
  driverRoleMiddleware(
    { user: { role: "Farmer", isActive: true } },
    mockRes,
    () => { calledNext = true; }
  );
  assert(mockRes.statusCode === 403 && !calledNext, "roleRequired('Driver') blocks Farmer with 403 Forbidden");

  // 6.4: Pending driver blocked from Driver endpoint
  calledNext = false;
  mockRes = createMockRes();
  driverRoleMiddleware(
    { user: { role: "Driver", driverApplicationStatus: "Pending", isActive: true } },
    mockRes,
    () => { calledNext = true; }
  );
  assert(mockRes.statusCode === 403 && !calledNext, "roleRequired('Driver') blocks pending driver with 403 Forbidden");

  // 6.5: Approved active driver permitted by Driver role middleware
  calledNext = false;
  mockRes = createMockRes();
  driverRoleMiddleware(
    { user: { role: "Driver", driverApplicationStatus: "Approved", isActive: true } },
    mockRes,
    () => { calledNext = true; }
  );
  assert(calledNext === true, "roleRequired('Driver') permits approved active Driver");

  console.log("\n==================================================================");
  console.log(`TOTAL ROLE-BASED TESTS PASSED: ${passed}`);
  console.log(`TOTAL ROLE-BASED TESTS FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

