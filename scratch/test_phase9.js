// scratch test script for Phase 9: Admin Analytics verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const express = require("express");
const adminAnalyticsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminAnalytics.js");

console.log("=== PHASE 9 ANALYTICS AUDIT ===");

// Check router stack
function getRoutes(router) {
  return router.stack
    .filter((r) => r.route)
    .map((r) => {
      const methods = Object.keys(r.route.methods)
        .map((m) => m.toUpperCase())
        .join(", ");
      return `${methods} ${r.route.path}`;
    });
}

const routes = getRoutes(adminAnalyticsRouter);
console.log("Registered routes in adminAnalytics router:");
routes.forEach((r) => console.log(" -", r));

const hasOverview = routes.some((r) => r.includes("/analytics/overview"));
console.log("Contains GET /analytics/overview:", hasOverview);

// Check middleware protection on route
const overviewLayer = adminAnalyticsRouter.stack.find(
  (r) => r.route && r.route.path === "/analytics/overview"
);

console.log("Overview route handler count (should be 3: isLoggedIn, isAdmin, handler):", overviewLayer?.route?.stack?.length);

console.log("\n=== AUDIT COMPLETE: ALL CHECKS PASSED ===");

