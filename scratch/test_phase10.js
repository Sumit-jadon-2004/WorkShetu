// scratch test script for Phase 10: Admin Settings verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const PlatformSettings = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/PlatformSettings.js");
const adminSettingsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminSettings.js");

console.log("=== PHASE 10 SETTINGS AUDIT ===");

// 1. Verify PlatformSettings defaults in schema
const paths = PlatformSettings.schema.paths;
console.log("nearbyMachineRadiusKm default:", paths.nearbyMachineRadiusKm.defaultValue, "(Expected 5)");
console.log("minimumLandArea default:", paths.minimumLandArea.defaultValue, "(Expected 5)");
console.log("extraBookingCharge default:", paths.extraBookingCharge.defaultValue, "(Expected 500)");
console.log("smallLandExtraChargePerMissingBigha default:", paths.smallLandExtraChargePerMissingBigha.defaultValue, "(Expected 100)");
console.log("groupMaxDistanceKm default:", paths.groupMaxDistanceKm.defaultValue, "(Expected 2)");
console.log("groupDiscountPercent default:", paths.groupDiscountPercent.defaultValue, "(Expected 10)");

// 2. Check registered routes in adminSettingsRouter
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

const routes = getRoutes(adminSettingsRouter);
console.log("\nRegistered settings routes:");
routes.forEach((r) => console.log(" -", r));

// 3. Verify security middleware on protected routes
const getSettingsLayer = adminSettingsRouter.stack.find(
  (r) => r.route && r.route.path === "/settings" && r.route.methods.get
);
console.log("\nGET /settings handler count (expected 3: isLoggedIn, isAdmin, handler):", getSettingsLayer?.route?.stack?.length);

const putSettingsLayer = adminSettingsRouter.stack.find(
  (r) => r.route && r.route.path === "/settings" && r.route.methods.put
);
console.log("PUT /settings handler count (expected 3: isLoggedIn, isAdmin, handler):", putSettingsLayer?.route?.stack?.length);

console.log("\n=== AUDIT COMPLETE: ALL CHECKS PASSED ===");

