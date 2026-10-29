const GENERAL_KNOWLEDGE = [
  "WorkShetu is an agricultural service marketplace in India connecting Farmers, Drivers/Machine Owners, Labour, and Transport operators.",
  "Core Roles & Invariants:",
  "- Farmers: Discover agricultural machinery (Tractors, Cultivators, Rotavators, Harrows, Harvesters), book machinery via Single/Fast Booking or Group Booking, hire farm Labour and agricultural Transport, track active bookings, chat with assigned drivers once accepted, and verify work completion with a 6-digit OTP.",
  "- Drivers / Equipment Owners: Manage vehicle listings, accept/reject fast and group booking requests, track work history, verify farmer OTP upon task completion, and view earnings. Drivers cannot book machinery as customers.",
  "- Admins: Supervise marketplace integrity, review driver verification applications (approve, reject, suspend, flag for suspected review, reactivate), monitor platform bookings, handle farmer/driver complaints, and oversee promotional campaigns.",
  "Public Visibility Rule: Only listings owned by verified, approved, and active drivers (role='Driver', driverApplicationStatus='Approved', isActive=true) are publicly visible and bookable in the marketplace.",
  "Safety & OTP Rule: WorkShetu uses a 6-digit Completion OTP generated for accepted bookings. The Farmer must share this OTP with the Driver ONLY after the agricultural work is fully completed on their field. The Driver enters this OTP to finalize the booking and release payment."
].join(" ");

const PRICING_AND_OFFERS_KNOWLEDGE = [
  "Pricing & Offers Rules:",
  "- Transparent Land-Area Pricing: Pricing is listed per Bigha/Acre/Hour. For small plots under 5 Bigha, a mandatory small-land surcharge (e.g. ₹500 for single bookings under threshold) compensates drivers for mobilization. Mandatory surcharges are non-discountable.",
  "- Group Booking Pooling Discount: Farmers within 2 KM can pool adjacent lands to reach at least 5 Bigha, waiving the small-land surcharge and unlocking a flat 10% group discount.",
  "- WorkShetu Platform-Funded Offers: WorkShetu provides genuine platform discounts funded entirely from WorkShetu's promotional budget. Drivers always receive their full agreed payout (driverPayout = baseAmount, 0 deduction).",
  "- Protected Driver Payout: Promotional discounts never reduce the driver's earnings and never increase the farmer's base price. Surcharges remain intact."
].join(" ");

const FARMER_KNOWLEDGE = [
  "Farmer Capabilities & Guidance:",
  "- Search Machines ('/machinery'): Search by category (Tractor, Cultivator, Rotavator, Harrow, Harvester), brand, horsepower (HP), location, price, and availability date.",
  "- Labour & Transport: Search specialized farm workers (electricians, mechanics, tractor drivers, harvester operators, farm helpers) and transport vehicles (trucks, pickups, loaders, mini-trucks).",
  "- My Bookings ('/bookings' or '/my-bookings'): View live statuses (Pending, Accepted, Completed, Rejected). View driver contact details once accepted.",
  "- Chat ('/chat'): Chat directly with the machine owner/driver after a booking is accepted.",
  "- Price Calculation & Offers: The AI can calculate exact price estimates including any small-plot surcharges and eligible platform offer discounts."
].join(" ");

const DRIVER_KNOWLEDGE = [
  "Driver Capabilities & Guidance:",
  "- Driver Application ('/driver-apply'): Farmers can apply to become drivers by providing vehicle details, license number, Aadhaar number, experience, and machinery photo. Statuses: Pending, Approved, Suspected (under review), Suspended, Rejected.",
  "- Driver Dashboard ('/driver/dashboard'): View incoming booking requests, accept or reject requests, and verify 6-digit completion OTPs.",
  "- Driver Listings ('/driver/listings'): View owned machinery and equipment listings, track availability status (Available, Booked, Hidden).",
  "- Earnings & Work History: Track total completed jobs and verified payouts. WorkShetu guarantees full payout without deducting platform discounts."
].join(" ");

const ADMIN_KNOWLEDGE = [
  "Admin Capabilities & Guidance:",
  "- Admin Dashboard ('/admin/dashboard'): Live platform overview — total users, active drivers, total machines, active/pending/completed bookings, and platform revenue volume.",
  "- Driver Verification ('/admin/driver-applications' & '/admin/drivers'): Inspect driver applications. Approve, reject with detailed reason, suspend accounts violating guidelines, or flag accounts for suspected review.",
  "- Platform Bookings ('/admin/bookings'): Monitor all bookings across Single and Group workflows, inspect statuses and completion records.",
  "- Complaints & Disputes ('/admin/complaints'): Review complaints submitted by farmers or drivers regarding payments, machine breakdowns, or behavior.",
  "- Promotional Campaigns ('/admin/offers'): Inspect active discount campaigns, budget utilization, remaining budget, and redemption metrics."
].join(" ");

const PROJECT_KNOWLEDGE = [
  GENERAL_KNOWLEDGE,
  PRICING_AND_OFFERS_KNOWLEDGE,
  FARMER_KNOWLEDGE,
  DRIVER_KNOWLEDGE,
  ADMIN_KNOWLEDGE
].join(" ");

/**
 * Retrieves concise, contextually relevant project knowledge chunks tailored
 * to the user's role and conversational query.
 *
 * @param {string} query - User message or intent
 * @param {string} role - Authenticated role ('Farmer' | 'Driver' | 'Admin')
 * @returns {string} - Tailored project knowledge text
 */
function getRelevantKnowledge(query = "", role = "Farmer") {
  const normRole = String(role || "").trim().toLowerCase();
  const lowerQuery = String(query || "").toLowerCase();
  const chunks = [GENERAL_KNOWLEDGE];

  if (normRole === "admin") {
    chunks.push(ADMIN_KNOWLEDGE);
    if (/driver|application|suspend|verify|approve|reject/i.test(lowerQuery)) {
      chunks.push(DRIVER_KNOWLEDGE);
    }
    if (/offer|campaign|discount|budget|price|pricing/i.test(lowerQuery)) {
      chunks.push(PRICING_AND_OFFERS_KNOWLEDGE);
    }
  } else if (normRole === "driver") {
    chunks.push(DRIVER_KNOWLEDGE);
    if (/price|payout|earning|money|discount|charge/i.test(lowerQuery)) {
      chunks.push(PRICING_AND_OFFERS_KNOWLEDGE);
    }
  } else {
    // Farmer / Customer
    chunks.push(FARMER_KNOWLEDGE);
    if (/group|pool|discount|offer|coupon|price|cost|kiraya|bigha|surcharge/i.test(lowerQuery)) {
      chunks.push(PRICING_AND_OFFERS_KNOWLEDGE);
    }
  }

  return chunks.join(" ");
}

module.exports = {
  PROJECT_KNOWLEDGE,
  GENERAL_KNOWLEDGE,
  PRICING_AND_OFFERS_KNOWLEDGE,
  FARMER_KNOWLEDGE,
  DRIVER_KNOWLEDGE,
  ADMIN_KNOWLEDGE,
  getRelevantKnowledge
};
