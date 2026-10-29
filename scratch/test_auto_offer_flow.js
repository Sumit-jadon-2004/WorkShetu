const path = require('path');
const backendDir = path.join(__dirname, '..', 'Backend');
const mongoose = require(path.join(backendDir, 'node_modules', 'mongoose'));
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const Offer = require(path.join(backendDir, 'models', 'Offer'));
const User = require(path.join(backendDir, 'models', 'Owner'));
const Machine = require(path.join(backendDir, 'models', 'ListingMachin'));
const { validateOffer, calculateFinalPrice, findBestAutomaticOffer } = require(path.join(backendDir, 'utils', 'pricingEngine'));

async function testAutoFlow() {
  await mongoose.connect(process.env.MONGO_URL, { dbName: 'workshetu' });
  console.log('--- TEST: FIRST BOOKING AUTO-APPLY INTEGRATION ---');

  // 1. Fetch the user with 0 bookings (e.g. demo3)
  const user = await User.findOne({ phone: '7017653015' }).lean();
  console.log('Farmer:', user.fullName, 'Role:', user.role);

  // 2. Fetch machine
  const machine = await Machine.findOne({}).lean();
  console.log('Machine:', machine.title, 'Rate: ₹' + machine.price);

  // 3. Test for 3 Bigha
  const landArea = 3;
  const basePrice = machine.price * landArea; // 300
  console.log('Booking Land Area:', landArea, 'Base Price: ₹' + basePrice);

  // 4. Test discovery via findBestAutomaticOffer
  const bestAuto = await findBestAutomaticOffer({
    user,
    requestType: 'Machine',
    category: machine.category,
    basePrice,
    landArea,
    location: machine.location,
    bookingType: 'Single'
  });

  console.log('Auto Offer Discovered:', bestAuto ? bestAuto.title : 'None');
  if (!bestAuto) {
    console.error('FAIL: Auto offer was not discovered!');
    process.exit(1);
  }

  // 5. Test validateOffer with autoDetect: true
  const validation = await validateOffer({
    user,
    requestType: 'Machine',
    category: machine.category,
    basePrice,
    landArea,
    location: machine.location,
    bookingType: 'Single',
    autoDetect: true
  });

  console.log('Validation with autoDetect:', {
    isValid: validation.isValid,
    offerTitle: validation.offer?.title,
    isAutomatic: validation.offer?.isAutomatic
  });

  if (!validation.isValid) {
    console.error('FAIL: validateOffer failed with autoDetect:', validation.reason);
    process.exit(1);
  }

  // 6. Calculate Final Quote
  const quote = calculateFinalPrice({
    baseServicePrice: basePrice,
    mandatoryCharges: 350, // for 3 bigha: 2 missing bigha * 100 + 150 = 350
    otherCharges: 0,
    offer: validation.offer
  });

  console.log('Pricing Breakdown:');
  console.log('  Base Price: ₹' + quote.baseServicePrice);
  console.log('  Calculated Discount (50%): ₹' + quote.calculatedDiscount);
  console.log('  Actual Discount (Capped by max ₹150): ₹' + quote.actualDiscount);
  console.log('  Mandatory Smallholding Surcharge: ₹' + quote.mandatoryNonDiscountableCharges);
  console.log('  Final Payable: ₹' + quote.finalPayableAmount + ' (300 - 150 + 350)');

  if (quote.actualDiscount !== 150) {
    console.error('FAIL: Expected discount ₹150, got:', quote.actualDiscount);
    process.exit(1);
  }
  if (quote.finalPayableAmount !== 500) {
    console.error('FAIL: Expected final payable ₹500, got:', quote.finalPayableAmount);
    process.exit(1);
  }

  console.log('SUCCESS: All auto offer first booking tests passed!');
  process.exit(0);
}

testAutoFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});

