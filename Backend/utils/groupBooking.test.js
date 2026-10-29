const test = require("node:test");
const assert = require("node:assert/strict");
const {
  GROUP_MIN_LAND_AREA,
  GROUP_MAX_DISTANCE_KM,
  groupHasMember,
  groupHasOnlyVerifiedFarmerMembers,
  groupStatusForLand,
  getDistanceKm,
  hasValidCoordinates,
  isRelatedLocation
} = require("./groupBooking.js");

const farmerA = { _id: "farmer-a", role: "Farmer", isActive: true, isAdmin: false };
const farmerB = { _id: "farmer-b", role: "Farmer", isActive: true, isAdmin: false };
const groupAtOrigin = (members = []) => ({
  latitude: 0,
  longitude: 0,
  locationVerified: true,
  members
});
const member = (user, landArea, latitude = 0, longitude = 0) => ({
  user,
  landArea,
  latitude,
  longitude,
  locationVerified: true
});

test("default group land threshold is configurable and 5 Bigha or more is forwarded", () => {
  const configuredMinimum = Number(process.env.GROUP_MIN_LAND_AREA);
  const expectedMinimum = Number.isFinite(configuredMinimum) && configuredMinimum > 0 ? configuredMinimum : 5;
  assert.equal(GROUP_MIN_LAND_AREA, expectedMinimum);
  assert.equal(groupStatusForLand(4.99), "Forming");
  assert.equal(groupStatusForLand(5), "RequestSent");
  assert.equal(groupStatusForLand(6), "RequestSent");
});

test("candidate members must all be verified Farmers with coordinates within 2 KM", () => {
  const group = groupAtOrigin([member(farmerA._id, 3), member(farmerB._id, 1, 0, 0.01)]);
  assert.ok(getDistanceKm(group, group.members[1]) < GROUP_MAX_DISTANCE_KM);
  assert.equal(groupHasOnlyVerifiedFarmerMembers(group, [farmerA, farmerB]), true);
  assert.equal(groupHasOnlyVerifiedFarmerMembers(group, [farmerA]), false);

  const distant = member(farmerB._id, 1, 0, 0.03);
  assert.ok(getDistanceKm(group, distant) > GROUP_MAX_DISTANCE_KM);
  assert.equal(isRelatedLocation(group, distant), false);
});

test("missing coordinates are never treated as nearby, even with matching address text", () => {
  const group = { ...groupAtOrigin(), location: "Aligarh" };
  const noCoordinates = { location: "Aligarh" };
  assert.equal(hasValidCoordinates(noCoordinates), false);
  assert.equal(isRelatedLocation(group, noCoordinates), false);
});

test("non-Farmer, inactive, and admin accounts cannot validate group membership", () => {
  const group = groupAtOrigin([member("provider", 2)]);
  assert.equal(groupHasOnlyVerifiedFarmerMembers(group, [{ _id: "provider", role: "Driver", isActive: true }]), false);
  assert.equal(groupHasOnlyVerifiedFarmerMembers(group, [{ _id: "provider", role: "Farmer", isActive: false }]), false);
  assert.equal(groupHasOnlyVerifiedFarmerMembers(group, [{ _id: "provider", role: "Farmer", isActive: true, isAdmin: true }]), false);
});

test("membership helper prevents adding the same Farmer twice", () => {
  const group = groupAtOrigin([member(farmerA._id, 3)]);
  assert.equal(groupHasMember(group, farmerA._id), true);
  assert.equal(groupHasMember(group, farmerB._id), false);
});

test("cancellation recalculation returns an under-threshold group to waiting", () => {
  assert.equal(groupStatusForLand(3 + 1 + 1), "RequestSent");
  assert.equal(groupStatusForLand(3 + 1), "Forming");
});
