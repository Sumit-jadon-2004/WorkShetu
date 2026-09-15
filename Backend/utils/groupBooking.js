const GROUP_MINIMUM_LAND = 5;
const GROUP_LOCATION_RADIUS_KM = 5;
const GROUP_DISCOUNT_PERCENT = 10;
const SMALL_LAND_EXTRA_CHARGE = 500;

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
  if (group.latitude != null && group.longitude != null && member.latitude != null && member.longitude != null) {
    return getDistanceKm(group, member) <= GROUP_LOCATION_RADIUS_KM;
  }

  return group.location.trim().toLowerCase() === member.location.trim().toLowerCase();
}

function getSinglePrice(basePrice, landArea) {
  const extraCharge = landArea < GROUP_MINIMUM_LAND ? SMALL_LAND_EXTRA_CHARGE : 0;
  return { basePrice, extraCharge, discountPercent: 0, discountAmount: 0, originalPrice: basePrice + extraCharge, finalPrice: basePrice + extraCharge };
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
  GROUP_MINIMUM_LAND,
  GROUP_LOCATION_RADIUS_KM,
  GROUP_DISCOUNT_PERCENT,
  getDistanceKm,
  getSinglePrice,
  isRelatedLocation,
  recalculateGroup
};
