// scratch test script for Phase 1 Offer Model verification
const path = require("path");
module.paths.push("c:/CODING.FILES/Project-WorkShetu/Backend/node_modules");

const mongoose = require("mongoose");
const assert = require("assert");
const Offer = require("c:/CODING.FILES/Project-WorkShetu/Backend/models/Offer.js");

console.log("=== PHASE 1: OFFER MODEL VALIDATION & TESTS ===");

// 1. Verify schema paths
const paths = Offer.schema.paths;
const requiredFields = [
  "title", "description", "code", "isAutomatic", "discountType", "discountValue",
  "maxDiscount", "applicableService", "applicableCategories", "userEligibility",
  "firstBookingOnly", "groupBookingOnly", "minimumBookingAmount", "applicableLocations",
  "totalUsageLimit", "perUserUsageLimit", "usedCount", "startDate", "endDate",
  "status", "isActive", "createdBy", "createdAt", "updatedAt"
];

const missingFields = requiredFields.filter((f) => !paths[f]);
console.log("Missing fields in Offer schema:", missingFields.length === 0 ? "NONE (All present)" : missingFields);
assert.strictEqual(missingFields.length, 0, "All required fields must be present in schema");

// 2. Verify enum values
console.log("discountType enum:", paths.discountType.enumValues);
assert.deepStrictEqual(paths.discountType.enumValues, ["Flat", "Percentage"]);

console.log("applicableService enum:", paths.applicableService.enumValues);
assert.deepStrictEqual(paths.applicableService.enumValues, ["All", "Machine", "Labour", "Transport"]);

console.log("userEligibility enum:", paths.userEligibility.enumValues);
assert.deepStrictEqual(paths.userEligibility.enumValues, ["All", "New Users", "Existing Users", "Farmers"]);

console.log("status enum:", paths.status.enumValues);
assert.deepStrictEqual(paths.status.enumValues, ["Draft", "Scheduled", "Active", "Expired", "Inactive"]);

// 3. Verify indexes
const indexes = Offer.schema.indexes();
console.log("Indexes defined on Offer schema:", indexes.length);
indexes.forEach((idx) => console.log(" -", JSON.stringify(idx[0]), JSON.stringify(idx[1] || {})));

const hasCodeIndex = indexes.some((idx) => idx[0].code === 1 && idx[1]?.unique === true);
console.log("Has unique sparse index on 'code':", hasCodeIndex);
assert.strictEqual(hasCodeIndex, true, "Must have unique sparse index on code");

// 4. Test instance creation and computeCurrentStatus()
const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

// Active offer instance
const activeOffer = new Offer({
  title: "Kisan Tractor Special",
  code: "TRACTOR500",
  discountType: "Flat",
  discountValue: 500,
  applicableService: "Machine",
  applicableCategories: ["Tractor"],
  startDate: yesterday,
  endDate: tomorrow,
  isActive: true,
  status: "Active",
});

const valError = activeOffer.validateSync();
console.log("Validation error on valid offer:", valError ? valError.message : "None (Valid)");
assert.strictEqual(valError, undefined);
console.log("Computed status for active offer:", activeOffer.computeCurrentStatus());
assert.strictEqual(activeOffer.computeCurrentStatus(), "Active");

// Scheduled offer instance (starts in future)
const scheduledOffer = new Offer({
  title: "Diwali Harvest Promo",
  code: "DIWALI10",
  discountType: "Percentage",
  discountValue: 10,
  startDate: tomorrow,
  endDate: nextWeek,
  isActive: true,
  status: "Active",
});
console.log("Computed status for scheduled offer:", scheduledOffer.computeCurrentStatus());
assert.strictEqual(scheduledOffer.computeCurrentStatus(), "Scheduled");

// Expired offer instance (endDate in past)
const expiredOffer = new Offer({
  title: "Old Offer",
  code: "OLD50",
  discountType: "Flat",
  discountValue: 50,
  startDate: new Date(now.getTime() - 48 * 60 * 60 * 1000),
  endDate: yesterday,
  isActive: true,
  status: "Active",
});
console.log("Computed status for expired offer:", expiredOffer.computeCurrentStatus());
assert.strictEqual(expiredOffer.computeCurrentStatus(), "Expired");

// Inactive offer instance
const inactiveOffer = new Offer({
  title: "Deactivated Offer",
  code: "PAUSED100",
  discountType: "Flat",
  discountValue: 100,
  startDate: yesterday,
  endDate: tomorrow,
  isActive: false,
  status: "Inactive",
});
console.log("Computed status for inactive offer:", inactiveOffer.computeCurrentStatus());
assert.strictEqual(inactiveOffer.computeCurrentStatus(), "Inactive");

// 5. Test validation failure on missing required fields
const invalidOffer = new Offer({
  description: "Missing title, discountValue, and endDate",
});
const failedValidation = invalidOffer.validateSync();
console.log("Validation caught missing required fields properly:", Boolean(failedValidation?.errors?.title && failedValidation?.errors?.discountValue && failedValidation?.errors?.endDate));
assert.ok(failedValidation?.errors?.title, "Title should be required");
assert.ok(failedValidation?.errors?.discountValue, "DiscountValue should be required");
assert.ok(failedValidation?.errors?.endDate, "EndDate should be required");

console.log("\n=== ALL PHASE 1 MODEL TESTS PASSED (100%) ===");

