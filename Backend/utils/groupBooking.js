const defaultMinimumLandArea = 5;
const configuredMinimumLandArea = Number(process.env.GROUP_MIN_LAND_AREA);
const GROUP_MIN_LAND_AREA = Number.isFinite(configuredMinimumLandArea) && configuredMinimumLandArea > 0
  ? configuredMinimumLandArea
  : defaultMinimumLandArea;
const GROUP_MAX_DISTANCE_KM = 2;
const GROUP_DISCOUNT_PERCENT = 10;
const SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA = 100;
const HIGHER_SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA = 150;
const HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA = 2;

function hasValidCoordinates(point) {
  return Number.isFinite(point?.latitude) && point.latitude >= -90 && point.latitude <= 90
    && Number.isFinite(point?.longitude) && point.longitude >= -180 && point.longitude <= 180;
}

function isFarmerAccount(user) {
  return Boolean(user && user.isActive !== false && user.isAdmin !== true);
}

function isGroupLandEligible(totalLandArea) {
  return Number.isFinite(totalLandArea) && totalLandArea >= GROUP_MIN_LAND_AREA;
}

function groupStatusForLand(totalLandArea) {
  return isGroupLandEligible(totalLandArea) ? "RequestSent" : "Forming";
}

function groupHasMember(group, userId) {
  return (group?.members || []).some((member) => String(member.user?._id || member.user) === String(userId));
}

function groupHasOnlyVerifiedFarmerMembers(group, users) {
  if (!Array.isArray(group?.members) || group.members.length === 0 || group.locationVerified !== true || !hasValidCoordinates(group)) return false;
  const byId = new Map((users || []).map((user) => [String(user._id), user]));
  return group.members.every((member) => {
    const id = String(member.user?._id || member.user || "");
    return member.locationVerified === true
      && hasValidCoordinates(member)
      && getDistanceKm(group, member) <= GROUP_MAX_DISTANCE_KM
      && isFarmerAccount(byId.get(id));
  });
}

function getDistanceKm(first, second) {
  if (![first?.latitude, first?.longitude, second?.latitude, second?.longitude].every(Number.isFinite)) {
    return null;
  }

  const radians = (value) => value * Math.PI / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitude) * Math.cos(secondLatitude);

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function isRelatedLocation(group, member) {
  return hasValidCoordinates(group) && hasValidCoordinates(member)
    && getDistanceKm(group, member) <= GROUP_MAX_DISTANCE_KM;
}

function getSmallLandExtraCharge(landArea) {
  const missingLandArea = Math.max(0, GROUP_MIN_LAND_AREA - landArea);
  if (missingLandArea === 0) return 0;

  const firstRateArea = Math.min(missingLandArea, HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA);
  const higherRateArea = Math.max(0, missingLandArea - HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA);
  return Math.round(
    firstRateArea * SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA
      + higherRateArea * HIGHER_SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA
  );
}

function getSinglePrice(pricePerBigha, landArea) {
  const basePrice = pricePerBigha * landArea;
  const extraCharge = getSmallLandExtraCharge(landArea);
  return { pricePerBigha, basePrice, extraCharge, discountPercent: 0, discountAmount: 0, originalPrice: basePrice + extraCharge, finalPrice: basePrice + extraCharge };
}

function getGroupMemberPrice(pricePerBigha, landArea) {
  const basePrice = pricePerBigha * landArea;
  return { pricePerBigha, basePrice, extraCharge: 0, discountPercent: 0, discountAmount: 0, originalPrice: basePrice, finalPrice: basePrice };
}

function recalculateGroup(group) {
  const totalLandArea = group.members.reduce((total, member) => total + member.landArea, 0);
  const totalOriginalPrice = group.members.reduce((total, member) => total + member.originalPrice, 0);
  const totalDiscount = totalOriginalPrice * group.groupDiscountPercent / 100;
  const totalFinalPrice = totalOriginalPrice - totalDiscount;

  group.totalLandArea = totalLandArea;
  group.totalOriginalPrice = totalOriginalPrice;
  group.totalDiscount = totalDiscount;
  group.totalFinalPrice = totalFinalPrice;

  for (const member of group.members) {
    const share = totalLandArea ? member.landArea / totalLandArea : 0;
    member.discountAmount = totalDiscount * share;
    member.finalPrice = totalFinalPrice * share;
  }

  return group;
}

module.exports = {
  GROUP_MIN_LAND_AREA,
  GROUP_MAX_DISTANCE_KM,
  GROUP_DISCOUNT_PERCENT,
  SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
  HIGHER_SMALL_LAND_EXTRA_CHARGE_PER_MISSING_BIGHA,
  HIGHER_EXTRA_CHARGE_RATE_AFTER_MISSING_BIGHA,
  groupHasMember,
  groupHasOnlyVerifiedFarmerMembers,
  groupStatusForLand,
  hasValidCoordinates,
  isFarmerAccount,
  isGroupLandEligible,
  getDistanceKm,
  getSinglePrice,
  getGroupMemberPrice,
  getSmallLandExtraCharge,
  isRelatedLocation,
  recalculateGroup
};
