const express = require("express");
const session = require("express-session");
const signature = require("cookie-signature");
const passport = require("./config/passport.js");
const { isLoggedIn, isAdmin } = require("./middleware/auth.js");
const User = require("./models/Owner.js");
const mongoose = require("mongoose");
const assert = require("assert");

async function runTestSuite() {
    console.log("================================================================================");
    console.log("   WORKSHETU - DUAL-CHANNEL AUTHENTICATION & ACCESS CONTROL VERIFICATION");
    console.log("================================================================================");

    const secret = "test-session-secret-12345";
    const app = express();
    app.use(express.json());

    // Session bridge
    app.use((req, res, next) => {
        const rawHeader = req.headers["x-session-id"] ||
            (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
                ? req.headers.authorization.slice(7).trim()
                : null);

        if (rawHeader && (!req.headers.cookie || !req.headers.cookie.includes("connect.sid="))) {
            const signed = "s:" + signature.sign(rawHeader, secret);
            req.headers.cookie = (req.headers.cookie ? req.headers.cookie + "; " : "") + "connect.sid=" + encodeURIComponent(signed);
        }
        next();
    });

    app.use(session({
        secret,
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: "none", secure: true }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    const mockUserStore = {};
    const originalFindById = User.findById;
    User.findById = function (id) {
        const u = mockUserStore[String(id)];
        return {
            exec: () => Promise.resolve(u || null),
            then: (fn, rej) => Promise.resolve(u || null).then(fn, rej),
            select: function() { return this; },
            lean: function() { return this; }
        };
    };

    // Mock routes for testing
    app.post("/test/login-as", (req, res) => {
        const mockUser = {
            id: req.body._id,
            _id: req.body._id,
            fullName: req.body.fullName,
            phone: req.body.phone,
            role: req.body.role,
            isAdmin: Boolean(req.body.isAdmin),
            isActive: true
        };
        mockUserStore[String(mockUser._id)] = mockUser;
        req.login(mockUser, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            req.session.save(() => {
                res.json({ token: req.sessionID, sessionId: req.sessionID, user: mockUser });
            });
        });
    });

    app.get("/api/auth/me", (req, res) => {
        if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
            return res.json({ authenticated: false });
        }
        res.json({ authenticated: true, token: req.sessionID, user: req.user });
    });

    app.post("/api/bookings/single", isLoggedIn, (req, res) => {
        res.json({ success: true, message: "Booking allowed for customer " + req.user.phone });
    });

    app.get("/api/admin/dashboard/stats", isLoggedIn, isAdmin, (req, res) => {
        res.json({ success: true, stats: { totalUsers: 100 } });
    });

    const server = app.listen(0);
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        // --- TEST 1: Unauthenticated request ---
        console.log("\n--- TEST 1: Unauthenticated request security ---");
        const unauthMe = await (await fetch(`${baseUrl}/api/auth/me`)).json();
        assert.strictEqual(unauthMe.authenticated, false, "Unauthenticated /me must return authenticated: false");
        console.log("  [PASS] /api/auth/me returns authenticated: false when no credentials sent");

        const unauthBooking = await fetch(`${baseUrl}/api/bookings/single`, { method: "POST" });
        assert.strictEqual(unauthBooking.status, 401, "Unauthenticated booking must return 401");
        const unauthBookingBody = await unauthBooking.json();
        assert.strictEqual(unauthBookingBody.message, "You are not authenticated.");
        console.log("  [PASS] Booking rejects unauthenticated request with 401 'You are not authenticated.'");

        const unauthAdmin = await fetch(`${baseUrl}/api/admin/dashboard/stats`);
        assert.strictEqual(unauthAdmin.status, 401, "Unauthenticated admin must return 401");
        console.log("  [PASS] Admin route rejects unauthenticated request with 401");

        // --- TEST 2: Farmer Login and Token generation ---
        console.log("\n--- TEST 2: Farmer authentication and session bridge ---");
        const farmerId = new mongoose.Types.ObjectId().toHexString();
        const farmerLoginRes = await fetch(`${baseUrl}/test/login-as`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: farmerId, fullName: "Ramesh Farmer", phone: "9876543210", role: "Farmer", isAdmin: false })
        });
        const farmerData = await farmerLoginRes.json();
        assert.ok(farmerData.token, "Login must return session token");
        console.log("  [PASS] Farmer login succeeded, received session token:", farmerData.token.substring(0, 8) + "...");

        // --- TEST 3: Access /api/auth/me with Bearer token (NO COOKIE) ---
        console.log("\n--- TEST 3: Session persistence without cookies (Bearer token) ---");
        const meRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${farmerData.token}` }
        });
        const meData = await meRes.json();
        assert.strictEqual(meData.authenticated, true, "Bearer token must authenticate user");
        assert.strictEqual(meData.user.phone, "9876543210");
        console.log("  [PASS] /api/auth/me recognizes Farmer using Bearer token alone");

        // --- TEST 4: Access /api/auth/me with X-Session-ID header (NO COOKIE) ---
        console.log("\n--- TEST 4: Session persistence without cookies (X-Session-ID header) ---");
        const xMeRes = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { "X-Session-ID": farmerData.token }
        });
        const xMeData = await xMeRes.json();
        assert.strictEqual(xMeData.authenticated, true);
        assert.strictEqual(xMeData.user.fullName, "Ramesh Farmer");
        console.log("  [PASS] /api/auth/me recognizes Farmer using X-Session-ID header alone");

        // --- TEST 5: Farmer creates Booking using token header ---
        console.log("\n--- TEST 5: Farmer creates Booking ---");
        const bookingRes = await fetch(`${baseUrl}/api/bookings/single`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${farmerData.token}`, "Content-Type": "application/json" }
        });
        assert.strictEqual(bookingRes.status, 200, "Farmer booking must return 200");
        const bookingData = await bookingRes.json();
        assert.strictEqual(bookingData.success, true);
        console.log("  [PASS] Farmer successfully creates booking via session bridge:", bookingData.message);

        // --- TEST 6: Farmer tries to access Admin route (Forbidden check) ---
        console.log("\n--- TEST 6: Access control (Farmer accessing Admin) ---");
        const farmerAdminRes = await fetch(`${baseUrl}/api/admin/dashboard/stats`, {
            headers: { "Authorization": `Bearer ${farmerData.token}` }
        });
        assert.strictEqual(farmerAdminRes.status, 403, "Farmer must receive 403 on admin route");
        const farmerAdminData = await farmerAdminRes.json();
        assert.strictEqual(farmerAdminData.message, "Admin access denied.");
        console.log("  [PASS] Farmer is forbidden from Admin route (403 'Admin access denied.')");

        // --- TEST 7: Admin Login and Admin route access ---
        console.log("\n--- TEST 7: Admin Login & Panel Access ---");
        const adminId = new mongoose.Types.ObjectId().toHexString();
        const adminLoginRes = await fetch(`${baseUrl}/test/login-as`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: adminId, fullName: "Sumit Admin", phone: "7017653019", role: "Admin", isAdmin: true })
        });
        const adminData = await adminLoginRes.json();
        const adminPanelRes = await fetch(`${baseUrl}/api/admin/dashboard/stats`, {
            headers: { "Authorization": `Bearer ${adminData.token}` }
        });
        assert.strictEqual(adminPanelRes.status, 200, "Admin must be granted access");
        const adminPanelData = await adminPanelRes.json();
        assert.strictEqual(adminPanelData.success, true);
        console.log("  [PASS] Admin receives 200 OK and accesses Admin dashboard stats");

        console.log("\n================================================================================");
        console.log("   ALL 7 CROSS-ORIGIN AUTH & AUTHORIZATION TEST SUITES PASSED! (7/7)");
        console.log("================================================================================\n");
    } finally {
        server.close();
    }
}

runTestSuite().catch((err) => {
    console.error("Test suite failed:", err);
    process.exit(1);
});
