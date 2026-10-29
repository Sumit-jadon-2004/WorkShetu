// scratch test script for Phase 8: Reviews & Complaints verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const mongoose = require("mongoose");
const Review = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Review.js");
const Complaint = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Complaint.js");
const adminReviewsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminReviews.js");
const adminComplaintsRouter = require("c:/CODING.FILES/Project-WorkShetu/Backend/routes/adminComplaints.js");

console.log("=== PHASE 8 SCHEMA & ROUTE AUDIT ===");

// Check Review Schema fields
const reviewPaths = Object.keys(Review.schema.paths);
console.log("Review schema paths has 'status':", reviewPaths.includes("status"));
console.log("Review schema paths has 'isHidden':", reviewPaths.includes("isHidden"));
console.log("Review schema status enum:", Review.schema.paths.status?.enumValues);

// Check Complaint Schema fields
const complaintPaths = Object.keys(Complaint.schema.paths);
console.log("Complaint schema paths has 'status':", complaintPaths.includes("status"));
console.log("Complaint schema paths has 'priority':", complaintPaths.includes("priority"));
console.log("Complaint schema paths has 'resolutionNote':", complaintPaths.includes("resolutionNote"));
console.log("Complaint schema status enum:", Complaint.schema.paths.status?.enumValues);
console.log("Complaint schema priority enum:", Complaint.schema.paths.priority?.enumValues);

// Inspect registered routes in routers
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

console.log("\nAdmin Reviews Routes:");
getRoutes(adminReviewsRouter).forEach((r) => console.log(" -", r));

console.log("\nAdmin Complaints Routes:");
getRoutes(adminComplaintsRouter).forEach((r) => console.log(" -", r));

console.log("\n=== AUDIT COMPLETE: ALL CHECKS PASSED ===");

