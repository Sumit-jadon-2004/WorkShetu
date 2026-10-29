const mongoose = require("mongoose");
const http = require("http");
const express = require("express");
require("dotenv").config({ path: __dirname + "/.env" });

const Machine = require("./models/ListingMachin");
const Offer = require("./models/Offer");
const adminOffersRouter = require("./routes/adminOffers");
const publicOffersRouter = require("./routes/publicOffers");
const { validateOffer, calculateBookingPrice } = require("./utils/pricingEngine");

// Create test express app with routes mounted
const app = express();
app.use(express.json());

// Mock admin auth middleware for tests
app.use("/api/admin", (req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = {
        _id: new mongoose.Types.ObjectId(),
        role: "Admin",
        isAdmin: true,
        isActive: true,
        email: "admin@test.com"
    };
    next();
}, adminOffersRouter);

app.use("/api/offers", publicOffersRouter);

async function runTests() {
    console.log("======================================================================");
    console.log("  WORKSHETU: DYNAMIC MACHINE CATEGORIES IN OFFER SYSTEM TESTS        ");
    console.log("======================================================================\n");

    const mongoURI = (process.env.MONGO_URL || "").trim();
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 20000 });
    console.log("Connected to MongoDB successfully.\n");

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  [PASS] ${message}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${message}`);
            failed++;
        }
    }

    try {
        // --- TEST 1: Model Source of Truth ---
        console.log("--- TEST 1: Machine Model as Dynamic Single Source of Truth ---");
        const supported = Machine.getSupportedCategories();
        assert(Array.isArray(supported), "Machine.getSupportedCategories() returns an array");
        assert(supported.includes("Tractor"), "Supported categories include Tractor");
        assert(supported.includes("Cultivator"), "Supported categories include Cultivator");
        assert(supported.includes("Rotavator"), "Supported categories include Rotavator");
        assert(supported.includes("Harrow"), "Supported categories include Harrow");
        assert(supported.includes("Harvester"), "Supported categories include Harvester");
        assert(supported.includes("Loader"), "Supported categories include Loader");
        console.log("");

        // --- TEST 2: GET /api/admin/offers/categories endpoint ---
        console.log("--- TEST 2: Admin API GET /api/admin/offers/categories ---");
        const adminRes = await fetch(`${baseUrl}/api/admin/offers/categories`);
        const adminBody = await adminRes.json();
        assert(adminRes.status === 200, "Admin categories endpoint returns HTTP 200");
        assert(adminBody.success === true, "Response reports success: true");
        assert(adminBody.service === "Machine", "Default service is Machine");
        assert(Array.isArray(adminBody.categories), "Returned categories is an array");
        assert(adminBody.categories.includes("Loader"), "Returned categories includes 'Loader'");
        assert(adminBody.categories.length === supported.length, `Returned ${adminBody.categories.length} categories matching schema`);
        assert(Array.isArray(adminBody.services), "Returned services includes Machine, Labour, Transport, All");
        console.log("");

        // --- TEST 3: GET /api/offers/categories endpoint (public) ---
        console.log("--- TEST 3: Public API GET /api/offers/categories ---");
        const pubRes = await fetch(`${baseUrl}/api/offers/categories`);
        const pubBody = await pubRes.json();
        assert(pubRes.status === 200, "Public categories endpoint returns HTTP 200");
        assert(pubBody.success === true, "Public response reports success: true");
        assert(pubBody.categories.includes("Loader"), "Public categories includes 'Loader'");
        console.log("");

        // --- TEST 4: Admin Offer Creation with Valid Machine Categories ---
        console.log("--- TEST 4: Admin Offer Creation with Valid Machine Categories ---");
        const uniqueCode1 = "DYN_" + Date.now();
        const createRes1 = await fetch(`${baseUrl}/api/admin/offers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "Dynamic Loader & Tractor Offer",
                code: uniqueCode1,
                description: "Special offer for Tractor and Loader machines",
                discountType: "Percentage",
                discountValue: 15,
                maxDiscount: 150,
                minimumBookingAmount: 500,
                applicableService: "Machine",
                applicableCategories: ["Tractor", "Loader"],
                fundingSource: "WorkShetu",
                userEligibility: "All",
                campaignBudget: 5000,
                endDate: new Date(Date.now() + 86400000).toISOString()
            })
        });
        const createBody1 = await createRes1.json();

        assert(createRes1.status === 201, `Offer created successfully (Status: ${createRes1.status})`);
        assert(createBody1.offer && createBody1.offer.applicableCategories.length === 2, "Offer saved with exactly 2 categories");
        assert(createBody1.offer && createBody1.offer.applicableCategories.includes("Loader"), "Offer includes 'Loader'");
        assert(createBody1.offer && createBody1.offer.applicableCategories.includes("Tractor"), "Offer includes 'Tractor'");
        const createdOfferId = createBody1.offer ? createBody1.offer._id : null;
        console.log("");

        // --- TEST 5: Admin Offer Creation with 'All Machines' (empty array) ---
        console.log("--- TEST 5: Admin Offer Creation with 'All Machines' (empty categories) ---");
        const uniqueCode2 = "ALLMACH_" + Date.now();
        const createRes2 = await fetch(`${baseUrl}/api/admin/offers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "All Machines Universal Offer",
                code: uniqueCode2,
                description: "Offer for all machines",
                discountType: "Percentage",
                discountValue: 10,
                maxDiscount: 100,
                minimumBookingAmount: 500,
                applicableService: "Machine",
                applicableCategories: [],
                fundingSource: "WorkShetu",
                userEligibility: "All",
                campaignBudget: 5000,
                endDate: new Date(Date.now() + 86400000).toISOString()
            })
        });
        const createBody2 = await createRes2.json();

        assert(createRes2.status === 201, "Universal Machine offer created with status 201");
        assert(Array.isArray(createBody2.offer && createBody2.offer.applicableCategories) && createBody2.offer.applicableCategories.length === 0, "applicableCategories is empty array for All Machines");
        console.log("");

        // --- TEST 6: Admin Offer Creation Rejects Unsupported Categories ---
        console.log("--- TEST 6: Server-Side Validation Rejects Unsupported Categories ---");
        const uniqueCode3 = "INVALID_" + Date.now();
        const invalidRes = await fetch(`${baseUrl}/api/admin/offers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "Invalid Categories Offer",
                code: uniqueCode3,
                description: "Testing rejection of invalid machine categories",
                discountType: "Percentage",
                discountValue: 10,
                maxDiscount: 100,
                minimumBookingAmount: 500,
                applicableService: "Machine",
                applicableCategories: ["Hovercraft", "Drone", "Tractor"],
                fundingSource: "WorkShetu",
                userEligibility: "All",
                campaignBudget: 5000,
                endDate: new Date(Date.now() + 86400000).toISOString()
            })
        });
        const invalidBody = await invalidRes.json();

        assert(invalidRes.status === 400, "Server rejected unsupported category with HTTP 400");
        assert(invalidBody.success === false, "Response body success is false");
        assert(invalidBody.message.includes("Hovercraft"), `Error message identifies invalid category: ${invalidBody.message}`);
        console.log("");

        // --- TEST 7: Admin Offer Update Category Validation ---
        console.log("--- TEST 7: Admin Offer Update Category Validation (PUT /:id) ---");
        // Test valid update
        const updateValidRes = await fetch(`${baseUrl}/api/admin/offers/${createdOfferId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                applicableCategories: ["Rotavator", "Harrow"]
            })
        });
        const updateValidBody = await updateValidRes.json();
        assert(updateValidRes.status === 200, "Valid update returned HTTP 200");
        assert(updateValidBody.offer.applicableCategories.includes("Rotavator"), "Updated categories include Rotavator");
        assert(updateValidBody.offer.applicableCategories.includes("Harrow"), "Updated categories include Harrow");
        assert(!updateValidBody.offer.applicableCategories.includes("Loader"), "Previous categories replaced");

        // Test invalid update
        const updateInvalidRes = await fetch(`${baseUrl}/api/admin/offers/${createdOfferId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                applicableCategories: ["Spaceship"]
            })
        });
        const updateInvalidBody = await updateInvalidRes.json();
        assert(updateInvalidRes.status === 400, "Invalid update rejected with HTTP 400");
        assert(updateInvalidBody.message.includes("Spaceship"), "Error message specifies invalid category");
        console.log("");

        // --- TEST 8: Checkout & Pricing Engine Category Enforcement ---
        console.log("--- TEST 8: Checkout & Pricing Engine Category Enforcement ---");
        const restrictedOffer = await Offer.findById(createdOfferId);

        // Subtest 8a: Booking with matching category (Rotavator)
        const matchResult = await validateOffer({
            code: restrictedOffer.code,
            requestType: "Machine",
            category: "Rotavator",
            basePrice: 1000,
            location: "Bareilly"
        });
        assert(matchResult.isValid === true, "Booking with matching category 'Rotavator' is valid");

        // Subtest 8b: Booking with non-matching category (Tractor)
        const mismatchResult = await validateOffer({
            code: restrictedOffer.code,
            requestType: "Machine",
            category: "Tractor",
            basePrice: 1000,
            location: "Bareilly"
        });
        assert(mismatchResult.isValid === false, "Booking with non-matching category 'Tractor' is rejected");
        assert(mismatchResult.reason && mismatchResult.reason.includes("Rotavator"), `Mismatch error reason mentions required category: "${mismatchResult.reason}"`);

        // Subtest 8c: Booking with All Machines offer (empty applicableCategories)
        const allMachinesOffer = await Offer.findOne({ code: uniqueCode2 });
        const allMatchResult1 = await validateOffer({
            code: allMachinesOffer.code,
            requestType: "Machine",
            category: "Tractor",
            basePrice: 1000,
            location: "Bareilly"
        });
        assert(allMatchResult1.isValid === true, "All Machines offer is valid for Tractor");

        const allMatchResult2 = await validateOffer({
            code: allMachinesOffer.code,
            requestType: "Machine",
            category: "Loader",
            basePrice: 1000,
            location: "Bareilly"
        });
        assert(allMatchResult2.isValid === true, "All Machines offer is valid for Loader");

        // Subtest 8d: Booking with unsupported machine category
        const unsupportedCategoryResult = await validateOffer({
            code: allMachinesOffer.code,
            requestType: "Machine",
            category: "CyberTruck",
            basePrice: 1000,
            location: "Bareilly"
        });
        assert(unsupportedCategoryResult.isValid === false, "Unsupported category 'CyberTruck' is rejected");
        assert(unsupportedCategoryResult.reason && unsupportedCategoryResult.reason.includes("CyberTruck"), `Rejection reason identifies category: "${unsupportedCategoryResult.reason}"`);

        console.log("");

        // Clean up created test offers
        await Offer.deleteMany({ code: { $in: [uniqueCode1, uniqueCode2] } });

    } catch (err) {
        console.error("Test execution error:", err);
        failed++;
    } finally {
        server.close();
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }

    console.log("\n=================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================");
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
