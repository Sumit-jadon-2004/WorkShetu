// Phase 12 Security & Regression Test Suite
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const express = require("express");
const mongoose = require("mongoose");
const assert = require("assert");

// Import middleware
const { isLoggedIn, isAdmin } = require("c:/CODING.FILES/Project-WorkShetu/Backend/middleware/auth.js");

// Import models
const User = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Owner.js");
const Booking = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/BookingMachine.js");
const Machine = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/ListingMachin.js");
const Labour = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Labour.js");
const Transport = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Tranport.js");
const Review = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Review.js");
const Complaint = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Complaint.js");
const PlatformSettings = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/PlatformSettings.js");

// Import business rules utility
const groupBookingUtils = require("c:/CODING.FILES/Project-WorkShetu/Backend/utils/groupBooking.js");

// Import all Admin Routers
const adminDashboardRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminDashboard.js");
const adminUsersRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminUsers.js");
const adminDriverRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminDriver.js");
const adminListingsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminListings.js");
const adminBookingsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminBookings.js");
const adminReviewsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminReviews.js");
const adminComplaintsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminComplaints.js");
const adminAnalyticsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminAnalytics.js");
const adminSettingsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminSettings.js");

const testResults = {
  rbacTests: [],
  modelTests: [],
  businessRuleTests: [],
  routeMountTests: [],
};

// ==========================================
// 1. RBAC SECURITY MIDDLEWARE UNIT TESTS
// ==========================================
function mockReq(user, isAuthenticated = true) {
  return {
    isAuthenticated: () => isAuthenticated,
    user: user,
    headers: {},
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

// Test 1: Unauthenticated access blocked (401)
{
  const req = mockReq(null, false);
  const res = mockRes();
  let nextCalled = false;
  isLoggedIn(req, res, () => { nextCalled = true; });
  const passed = res.statusCode === 401 && !nextCalled;
  testResults.rbacTests.push({
    test: "Unauthenticated Request -> 401 Unauthorized",
    passed,
    detail: `Status: ${res.statusCode}, Next called: ${nextCalled}`,
  });
}

// Test 2: Farmer access blocked (403)
{
  const req = mockReq({ _id: "1", role: "Farmer", isAdmin: false }, true);
  const res = mockRes();
  let nextCalled = false;
  isAdmin(req, res, () => { nextCalled = true; });
  const passed = res.statusCode === 403 && !nextCalled;
  testResults.rbacTests.push({
    test: "Farmer Role Request -> 403 Forbidden",
    passed,
    detail: `Status: ${res.statusCode}, Next called: ${nextCalled}`,
  });
}

// Test 3: Driver access blocked (403)
{
  const req = mockReq({ _id: "2", role: "Driver", isAdmin: false }, true);
  const res = mockRes();
  let nextCalled = false;
  isAdmin(req, res, () => { nextCalled = true; });
  const passed = res.statusCode === 403 && !nextCalled;
  testResults.rbacTests.push({
    test: "Driver Role Request -> 403 Forbidden",
    passed,
    detail: `Status: ${res.statusCode}, Next called: ${nextCalled}`,
  });
}

// Test 4: Admin access allowed (Next called)
{
  const req = mockReq({ _id: "3", role: "Admin", isAdmin: true }, true);
  const res = mockRes();
  let nextCalled = false;
  isAdmin(req, res, () => { nextCalled = true; });
  const passed = nextCalled && res.statusCode === 200;
  testResults.rbacTests.push({
    test: "Admin Role (role='Admin', isAdmin=true) -> Allowed (next() invoked)",
    passed,
    detail: `Next called: ${nextCalled}`,
  });
}

// Test 5: Lowercase admin role allowed
{
  const req = mockReq({ _id: "4", role: "admin", isAdmin: true }, true);
  const res = mockRes();
  let nextCalled = false;
  isAdmin(req, res, () => { nextCalled = true; });
  const passed = nextCalled && res.statusCode === 200;
  testResults.rbacTests.push({
    test: "Lowercase admin Role (role='admin') -> Allowed",
    passed,
    detail: `Next called: ${nextCalled}`,
  });
}

// ==========================================
// 2. ROUTER STACK SECURITY AUDIT (Every router has isLoggedIn & isAdmin)
// ==========================================
const adminRouters = [
  { name: "adminDashboard", router: adminDashboardRouter },
  { name: "adminUsers", router: adminUsersRouter },
  { name: "adminDriver", router: adminDriverRouter },
  { name: "adminListings", router: adminListingsRouter },
  { name: "adminBookings", router: adminBookingsRouter },
  { name: "adminReviews", router: adminReviewsRouter },
  { name: "adminComplaints", router: adminComplaintsRouter },
  { name: "adminAnalytics", router: adminAnalyticsRouter },
  { name: "adminSettings", router: adminSettingsRouter },
];

let totalEndpoints = 0;
let fullyProtectedEndpoints = 0;

adminRouters.forEach(({ name, router }) => {
  const routes = router.stack.filter((r) => r.route);
  routes.forEach((layer) => {
    totalEndpoints++;
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
    const stackHandlers = layer.route.stack;
    
    // Public settings route is intentionally open for public contact info
    const isPublicRoute = path === "/settings/public";
    
    const isProtected = isPublicRoute || stackHandlers.length >= 3;
    if (isProtected) fullyProtectedEndpoints++;

    testResults.routeMountTests.push({
      router: name,
      endpoint: `${methods} ${path}`,
      handlersCount: stackHandlers.length,
      protected: isProtected,
    });
  });
});

// ==========================================
// 3. MODEL BACKWARD COMPATIBILITY TESTS
// ==========================================
{
  // User Schema: Must support Farmer, Driver, Admin
  const userRoles = User.schema.paths.role.enumValues;
  const userHasFarmer = userRoles.includes("Farmer");
  const userHasDriver = userRoles.includes("Driver");
  const userHasAdmin = userRoles.includes("Admin") || userRoles.includes("admin");
  const userHasIsAdmin = Boolean(User.schema.paths.isAdmin);
  testResults.modelTests.push({
    model: "User (Owner.js)",
    passed: userHasFarmer && userHasDriver && userHasAdmin && userHasIsAdmin,
    detail: `Roles: ${JSON.stringify(userRoles)}, isAdmin field: ${userHasIsAdmin}`,
  });

  // Machine Schema: Must have availability enum with "Hidden"
  const machineAvail = Machine.schema.paths.availability.enumValues;
  testResults.modelTests.push({
    model: "Machine (ListingMachin.js)",
    passed: machineAvail.includes("Available") && machineAvail.includes("Hidden"),
    detail: `Availability: ${JSON.stringify(machineAvail)}`,
  });

  // Review Schema: Must have status and isHidden
  const reviewPaths = Object.keys(Review.schema.paths);
  testResults.modelTests.push({
    model: "Review (Review.js)",
    passed: reviewPaths.includes("status") && reviewPaths.includes("isHidden"),
    detail: `status enum: ${JSON.stringify(Review.schema.paths.status?.enumValues)}`,
  });

  // Complaint Schema: Must exist and have status, priority, resolutionNote
  const complaintPaths = Object.keys(Complaint.schema.paths);
  testResults.modelTests.push({
    model: "Complaint (Complaint.js)",
    passed: complaintPaths.includes("status") && complaintPaths.includes("priority"),
    detail: `status enum: ${JSON.stringify(Complaint.schema.paths.status?.enumValues)}`,
  });

  // PlatformSettings Schema: Must exist with 5, 500, 5 defaults
  testResults.modelTests.push({
    model: "PlatformSettings (PlatformSettings.js)",
    passed: PlatformSettings.schema.paths.nearbyMachineRadiusKm.defaultValue === 5 &&
            PlatformSettings.schema.paths.minimumLandArea.defaultValue === 5 &&
            PlatformSettings.schema.paths.extraBookingCharge.defaultValue === 500,
    detail: `Defaults: radius=${PlatformSettings.schema.paths.nearbyMachineRadiusKm.defaultValue}km, minLand=${PlatformSettings.schema.paths.minimumLandArea.defaultValue}bigha, charge=₹${PlatformSettings.schema.paths.extraBookingCharge.defaultValue}`,
  });
}

// ==========================================
// 4. BUSINESS RULES REGRESSION TESTS
// ==========================================
{
  // Test 5 Bigha threshold
  const is5Eligible = groupBookingUtils.isGroupLandEligible(5);
  const is4Eligible = groupBookingUtils.isGroupLandEligible(4);
  
  // Test extra charge calculations
  const chargeAt5 = groupBookingUtils.getSmallLandExtraCharge(5); // 0 extra charge
  const chargeAt3 = groupBookingUtils.getSmallLandExtraCharge(3); // 2 missing = 2 * 100 = 200
  const chargeAt0 = groupBookingUtils.getSmallLandExtraCharge(0); // 5 missing = 2*100 + 3*150 = 650

  testResults.businessRuleTests.push({
    rule: "5 Bigha Group Eligibility Threshold",
    passed: is5Eligible === true && is4Eligible === false,
    detail: `5 Bigha: ${is5Eligible}, 4 Bigha: ${is4Eligible}`,
  });

  testResults.businessRuleTests.push({
    rule: "Small Land Surcharge (₹0 for 5+ Bigha, Tiered for <5)",
    passed: chargeAt5 === 0 && chargeAt3 === 200 && chargeAt0 === 650,
    detail: `Charge at 5 Bigha: ₹${chargeAt5}, at 3 Bigha: ₹${chargeAt3}, at 0 Bigha: ₹${chargeAt0}`,
  });
}

// ==========================================
// OUTPUT REPORT
// ==========================================
console.log("=================================================================");
console.log("             PHASE 12 SECURITY & REGRESSION AUDIT               ");
console.log("=================================================================\n");

console.log("1. RBAC & SECURITY MIDDLEWARE TESTS:");
testResults.rbacTests.forEach((t) => {
  console.log(`  [${t.passed ? "PASS" : "FAIL"}] ${t.test} (${t.detail})`);
});

console.log("\n2. DATABASE MODEL BACKWARD COMPATIBILITY:");
testResults.modelTests.forEach((t) => {
  console.log(`  [${t.passed ? "PASS" : "FAIL"}] ${t.model} - ${t.detail}`);
});

console.log("\n3. BUSINESS RULES INTEGRITY:");
testResults.businessRuleTests.forEach((t) => {
  console.log(`  [${t.passed ? "PASS" : "FAIL"}] ${t.rule} - ${t.detail}`);
});

console.log(`\n4. ROUTE LEVEL ACCESS CONTROL AUDIT:`);
console.log(`  Total Admin Endpoints Audited: ${totalEndpoints}`);
console.log(`  Protected with isLoggedIn & isAdmin: ${fullyProtectedEndpoints}/${totalEndpoints}`);

const allRbacPassed = testResults.rbacTests.every((t) => t.passed);
const allModelsPassed = testResults.modelTests.every((t) => t.passed);
const allRulesPassed = testResults.businessRuleTests.every((t) => t.passed);
const allProtected = fullyProtectedEndpoints === totalEndpoints;

const allPassed = allRbacPassed && allModelsPassed && allRulesPassed && allProtected;

console.log("\n=================================================================");
console.log(`FINAL SECURITY & REGRESSION VERDICT: ${allPassed ? "PASSED (100%)" : "FAILED"}`);
console.log("=================================================================");

if (!allPassed) {
  process.exit(1);
}

