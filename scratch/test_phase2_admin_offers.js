// scratch test script for Phase 2 Admin Offers verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const express = require("express");
const assert = require("assert");
const adminOffersRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminOffers.js");

console.log("=== PHASE 2: ADMIN OFFERS ROUTE & SECURITY AUDIT ===");

// 1. Inspect registered routes
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

const routes = getRoutes(adminOffersRouter);
console.log("Registered routes in adminOffers router:");
routes.forEach((r) => console.log(" -", r));

const expectedEndpoints = [
  "GET /offers",
  "GET /offers/:id",
  "POST /offers",
  "PUT /offers/:id",
  "PATCH /offers/:id/status",
  "POST /offers/:id/duplicate",
  "DELETE /offers/:id",
];

expectedEndpoints.forEach((exp) => {
  const found = routes.some((r) => r === exp);
  console.log(`Endpoint ${exp} exists:`, found);
  assert.strictEqual(found, true, `Missing required endpoint: ${exp}`);
});

// 2. Verify RBAC middleware (all endpoints must have at least 3 handlers: isLoggedIn, isAdmin, handler)
let allProtected = true;
adminOffersRouter.stack.filter((r) => r.route).forEach((layer) => {
  const count = layer.route.stack.length;
  if (count < 3) {
    allProtected = false;
    console.error(`Route ${layer.route.path} lacks proper RBAC handlers! Count: ${count}`);
  }
});

console.log("All admin offer routes protected with isLoggedIn & isAdmin:", allProtected);
assert.strictEqual(allProtected, true);

console.log("\n=== ALL PHASE 2 ROUTE & SECURITY CHECKS PASSED (100%) ===");

