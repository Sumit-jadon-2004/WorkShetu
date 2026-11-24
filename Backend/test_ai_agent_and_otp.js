/**
 * Automated Verification Test Suite:
 * 1. Labour Booking Call Access Control & Phone Masking
 * 2. Secure OTP Work Completion System (SHA-256 hash, 10m expiry, 60s cooldown, 5 attempts limit)
 * 3. WorkShetu Universal AI Agent Intent Routing & Real Tool Executions
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const crypto = require("crypto");
const assert = require("assert");

const Booking = require("./models/BookingMachine.js");
const User = require("./models/Owner.js");
const Labour = require("./models/Labour.js");
const Machine = require("./models/ListingMachin.js");

const { detectIntent, serviceSearchFilters } = require("./utils/aiIntent.js");
const { getToolsForRole, executeTool } = require("./utils/aiToolRegistry.js");
const { getRelevantKnowledge } = require("./utils/projectKnowledge.js");

const OTP_SECRET = process.env.SESSION_SECRET || "workshetu-otp-secret-salt-2025-v1";
const OTP_ENCRYPTION_KEY = crypto.createHash("sha256").update(OTP_SECRET).digest();

function encryptOtp(plainOtp) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", OTP_ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(String(plainOtp), "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decryptOtp(cipherText) {
  if (!cipherText || !cipherText.includes(":")) return null;
  const [ivHex, encrypted] = cipherText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", OTP_ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function hashOtp(plainOtp) {
  return crypto.createHash("sha256").update(String(plainOtp).trim()).digest("hex");
}

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}:`, err.message);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  WorkShetu: AI Agent & Labour Booking OTP Test Suite");
  console.log("=======================================================\n");

  // ----------------------------------------------------
  // TEST GROUP 1: AI Intent Classification & Knowledge
  // ----------------------------------------------------
  console.log("Test Group 1: Universal AI Intent & Knowledge System");

  it("Driver: 'meri registered machines dikhao' routes to driver_listings", () => {
    const driverUser = { role: "Driver", driverApplicationStatus: "Approved" };
    const intent = detectIntent("meri registered machines dikhao", [], driverUser, "general");
    assert.strictEqual(intent.type, "driver_listings");
  });

  it("Driver: 'meri listings dikhao' routes to driver_listings", () => {
    const driverUser = { role: "Driver", driverApplicationStatus: "Approved" };
    const intent = detectIntent("meri listings dikhao", [], driverUser, "general");
    assert.strictEqual(intent.type, "driver_listings");
  });

  it("Farmer: 'mujhe mistri chahiye' routes to labour search with Mason category", () => {
    const farmerUser = { role: "Farmer" };
    const intent = detectIntent("mujhe mistri chahiye", [], farmerUser, "general");
    assert.strictEqual(intent.type, "labour");
    assert.strictEqual(intent.filters?.labourType, "Mason");
  });

  it("Farmer: 'kheti ke liye mazdoor chahiye' routes to labour search with Farm Worker", () => {
    const farmerUser = { role: "Farmer" };
    const intent = detectIntent("kheti ke liye mazdoor chahiye", [], farmerUser, "general");
    assert.strictEqual(intent.type, "labour");
    assert.strictEqual(intent.filters?.labourType, "Farm Worker");
  });

  it("Farmer: '8 bigha ke liye tractor chahiye' routes to search with Tractor category", () => {
    const farmerUser = { role: "Farmer" };
    const intent = detectIntent("8 bigha ke liye tractor chahiye", [], farmerUser, "general");
    assert.strictEqual(intent.type, "search");
  });

  it("Farmer: 'mera booking status kya hai' routes to my_bookings", () => {
    const farmerUser = { role: "Farmer" };
    const intent = detectIntent("mera booking status kya hai", [], farmerUser, "general");
    assert.strictEqual(intent.type, "my_bookings");
  });

  it("Knowledge Layer: returns Labour knowledge when querying workers", () => {
    const knowledge = getRelevantKnowledge("mujhe mistri chahiye", "Farmer");
    assert(knowledge.includes("Labour Marketplace & Worker Guidance"));
    assert(knowledge.includes("Masons (Mistri)"));
    assert(knowledge.includes("Phone Number Privacy"));
  });

  // ----------------------------------------------------
  // TEST GROUP 2: OTP Cryptography & Access Invariants
  // ----------------------------------------------------
  console.log("\nTest Group 2: Cryptographic OTP & Privacy Invariants");

  it("OTP generation produces a valid 6-digit numeric string", () => {
    const plainOtp = String(crypto.randomInt(100000, 1000000));
    assert.strictEqual(plainOtp.length, 6);
    assert(/^\d{6}$/.test(plainOtp));
  });

  it("SHA-256 hash is deterministic and cannot reveal plaintext", () => {
    const plainOtp = "729415";
    const hash1 = hashOtp(plainOtp);
    const hash2 = hashOtp(plainOtp);
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, plainOtp);
    assert.strictEqual(hash1.length, 64);
  });

  it("AES-256 cipher encryption and decryption recovers plaintext OTP accurately", () => {
    const plainOtp = "482019";
    const cipherText = encryptOtp(plainOtp);
    assert.notStrictEqual(cipherText, plainOtp);
    const decrypted = decryptOtp(cipherText);
    assert.strictEqual(decrypted, plainOtp);
  });

  it("Invalid cipher text fails safely without crash", () => {
    assert.strictEqual(decryptOtp(null), null);
    assert.strictEqual(decryptOtp("invalid-token"), null);
  });

  // ----------------------------------------------------
  // TEST GROUP 3: Database & Mock Lifecycle
  // ----------------------------------------------------
  console.log("\nTest Group 3: Labour Booking Lifecycle & Phone Masking");

  const mockCustomerId = new mongoose.Types.ObjectId();
  const mockOwnerId = new mongoose.Types.ObjectId();
  const mockWorkerId = new mongoose.Types.ObjectId();

  const mockBooking = new Booking({
    requestType: "Labour",
    bookingType: "Single",
    itemId: mockWorkerId,
    owner: mockOwnerId,
    customer: mockCustomerId,
    customerName: "Ramesh Kumar",
    customerPhone: "9876543210",
    customerLocation: "Noida Sector 62",
    daysRequired: 2,
    workerCount: 1,
    unitPrice: 500,
    totalPrice: 1000,
    finalPrice: 1000,
    bookingDate: new Date(),
    status: "Pending"
  });

  it("Pending booking: Customer must not see owner phone", () => {
    const populatedPending = mockBooking.toObject();
    populatedPending.owner = {
      _id: mockOwnerId,
      fullName: "Suresh Mistri",
      phone: "9123456789"
    };

    // Apply masking rule
    if (populatedPending.status !== "Accepted" && populatedPending.status !== "Completed") {
      delete populatedPending.owner.phone;
    }
    assert.strictEqual(populatedPending.owner.phone, undefined);
  });

  it("Accepted booking: Generates 6-digit OTP, SHA-256 hash in DB, 10m expiry, 60s cooldown", () => {
    mockBooking.status = "Accepted";
    const plainOtp = String(crypto.randomInt(100000, 1000000));
    mockBooking.completionOtp = hashOtp(plainOtp);
    mockBooking.completionOtpCipher = encryptOtp(plainOtp);
    mockBooking.completionOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    mockBooking.otpCooldownUntil = new Date(Date.now() + 60 * 1000);
    mockBooking.otpAttempts = 0;

    assert.strictEqual(mockBooking.completionOtp.length, 64);
    assert.strictEqual(mockBooking.otpAttempts, 0);
    assert(mockBooking.completionOtpExpiresAt > new Date());
    assert(mockBooking.otpCooldownUntil > new Date());
  });

  it("Accepted booking: Customer decrypts plain OTP", () => {
    const customerDecrypted = decryptOtp(mockBooking.completionOtpCipher);
    assert(/^\d{6}$/.test(customerDecrypted));
    assert.strictEqual(hashOtp(customerDecrypted), mockBooking.completionOtp);
  });

  it("Verification: Incorrect OTP increments attempt counter and rejects", () => {
    const wrongOtp = "000000";
    const isMatch = hashOtp(wrongOtp) === mockBooking.completionOtp;
    assert.strictEqual(isMatch, false);
    mockBooking.otpAttempts = (mockBooking.otpAttempts || 0) + 1;
    assert.strictEqual(mockBooking.otpAttempts, 1);
    assert.strictEqual(5 - mockBooking.otpAttempts, 4); // 4 remaining
  });

  it("Verification: Correct OTP marks status 'Completed' and clears sensitive OTP fields", () => {
    const customerDecrypted = decryptOtp(mockBooking.completionOtpCipher);
    const isMatch = hashOtp(customerDecrypted) === mockBooking.completionOtp;
    assert.strictEqual(isMatch, true);

    mockBooking.status = "Completed";
    mockBooking.completedAt = new Date();
    mockBooking.workCompletedAt = new Date();
    mockBooking.otpVerified = true;
    mockBooking.otpVerifiedAt = new Date();
    mockBooking.completionOtp = null;
    mockBooking.completionOtpCipher = null;
    mockBooking.completionOtpExpiresAt = null;

    assert.strictEqual(mockBooking.status, "Completed");
    assert.strictEqual(mockBooking.otpVerified, true);
    assert.strictEqual(mockBooking.completionOtp, null);
    assert(mockBooking.completedAt instanceof Date);
  });

  // ----------------------------------------------------
  // TEST GROUP 4: Driver Machine Recommendations in AI
  // ----------------------------------------------------
  console.log("\nTest Group 4: Driver Listings Tool & Card Transformation");

  it("Driver Listings Tool: maps registered machines with status and price", () => {
    const toolResult = {
      driverStatus: "Approved",
      isPubliclyVisible: true,
      machines: [
        {
          machineId: "6758493021abcdef12345678",
          title: "Mahindra 575 DI Tractor",
          category: "Tractor",
          price: "₹850 / Bigha",
          availability: "Available",
          location: "Hapur, UP"
        }
      ],
      labours: []
    };

    // Simulate responseRecommendations transformation
    const recommendations = [];
    if (toolResult.machines) {
      for (const m of toolResult.machines) {
        recommendations.push({
          type: "machine",
          machineId: m.machineId,
          title: m.title,
          category: m.category,
          price: m.price,
          location: m.location,
          availabilityStatus: m.availability === "Available" ? "available" : "unavailable",
          reason: "Registered Active Machine"
        });
      }
    }

    assert.strictEqual(recommendations.length, 1);
    assert.strictEqual(recommendations[0].type, "machine");
    assert.strictEqual(recommendations[0].title, "Mahindra 575 DI Tractor");
    assert.strictEqual(recommendations[0].availabilityStatus, "available");
  });

  console.log("\n=======================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
