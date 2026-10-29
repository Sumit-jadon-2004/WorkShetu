const User = require("../models/Owner.js");

/**
 * Checks if a user object meets all requirements to be an active, approved driver.
 * A driver is eligible only if:
 * 1. Their role is "Driver"
 * 2. Their driverApplicationStatus is "Approved"
 * 3. Their account activity is active (isActive is not false)
 *
 * Accounts that are Pending, Suspended (isActive: false), Suspected (Under Review),
 * or Rejected fail this check.
 *
 * @param {object|null} user
 * @returns {boolean}
 */
function isDriverEligible(user) {
  if (!user) return false;
  const role = String(user.role || "").trim().toLowerCase();
  if (role !== "driver") return false;
  if (user.driverApplicationStatus !== "Approved") return false;
  if (user.isActive === false) return false;
  return true;
}

/**
 * Returns the effective computed status of a driver.
 * States:
 * - "Suspended" (isActive === false)
 * - "Suspected" (driverApplicationStatus === "Suspected", Under Review)
 * - "Approved"  (Approved and Active)
 * - "Pending"   (Pending review)
 * - "Rejected"  (Rejected application)
 * - "None"
 *
 * @param {object|null} user
 * @returns {string}
 */
function getDriverAccountStatus(user) {
  if (!user) return "None";
  const role = String(user.role || "").trim().toLowerCase();
  if (user.isActive === false && (role === "driver" || user.driverApplicationStatus === "Approved")) {
    return "Suspended";
  }
  if (user.driverApplicationStatus === "Suspected") {
    return "Suspected";
  }
  if (user.driverApplicationStatus === "Approved") {
    return "Approved";
  }
  if (user.driverApplicationStatus === "Pending") {
    return "Pending";
  }
  if (user.driverApplicationStatus === "Rejected") {
    return "Rejected";
  }
  return user.driverApplicationStatus || "None";
}

/**
 * Retrieves the MongoDB ObjectIds of all currently approved and active drivers.
 * Used to filter public machine queries (listing, search, category, geo, featured).
 *
 * @returns {Promise<Array<mongoose.Types.ObjectId>>}
 */
async function getEligibleDriverIds() {
  return await User.find({
    role: { $in: ["Driver", "driver"] },
    driverApplicationStatus: "Approved",
    isActive: { $ne: false },
  }).distinct("_id");
}

module.exports = {
  isDriverEligible,
  getDriverAccountStatus,
  getEligibleDriverIds,
};

