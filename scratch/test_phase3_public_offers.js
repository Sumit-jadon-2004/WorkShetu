// scratch test script for Phase 3 Public Offers verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const express = require("express");
const assert = require("assert");
const publicOffersRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/publicOffers.js");

console.log("=== PHASE 3: PUBLIC OFFERS ROUTE AUDIT ===");

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

const routes = getRoutes(publicOffersRouter);
console.log("Registered routes in publicOffers router:");
routes.forEach((r) => console.log(" -", r));

const hasActiveRoute = routes.some((r) => r === "GET /active");
console.log("Endpoint GET /active exists:", hasActiveRoute);
assert.strictEqual(hasActiveRoute, true, "GET /active endpoint must exist");

console.log("\n=== ALL PHASE 3 ROUTE CHECKS PASSED (100%) ===");

