const express = require("express");
const rateLimit = require("express-rate-limit");
const passport = require("../config/passport.js");
const User = require("../models/Owner.js");
const { signupSchema, loginSchema } = require("../JoiSchema.js");
const { isLoggedIn, safeUser } = require("../middleware/auth.js");

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const validationError = (error) => error.details.map((detail) => detail.message).join(" ");

router.post("/register", authLimiter, async (req, res) => {
  const { error, value } = signupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ success: false, message: validationError(error) });

  try {
    if (await User.exists({ phone: value.phone })) {
      return res.status(409).json({ success: false, message: "An account with this phone number already exists." });
    }
    const user = await User.register({
      fullName: value.fullName,
      phone: value.phone,
      role: "Farmer",
      location: value.location || undefined,
      latitude: value.latitude,
      longitude: value.longitude,
      isActive: true
    }, value.password);
    return req.login(user, (loginError) => {
      if (loginError) return res.status(500).json({ success: false, message: "Account created, but login failed." });
      return res.status(201).json({ success: true, message: "Registration successful.", user: safeUser(user) });
    });
  } catch (registrationError) {
    if (registrationError.code === 11000) return res.status(409).json({ success: false, message: "An account with this phone number already exists." });
    console.error("Registration failed:", registrationError.message);
    return res.status(400).json({ success: false, message: "Registration could not be completed." });
  }
});

router.post("/login", authLimiter, (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ success: false, message: validationError(error) });
  passport.authenticate("local", (authError, user) => {
    if (authError) return next(authError);
    if (!user) return res.status(401).json({ success: false, message: "Invalid phone or password." });
    if (user.isActive === false) return res.status(403).json({ success: false, message: "Your account has been disabled. Please contact support." });
    return req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      return res.json({ success: true, message: "Login successful.", user: safeUser(user) });
    });
  })(Object.assign(req, { body: value }), res, next);
});

router.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("connect.sid");
      return res.json({ success: true, message: "Logout successful." });
    });
  });
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user || req.user.isActive === false) {
    return res.json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: safeUser(req.user) });
});

router.get("/profile", isLoggedIn, (req, res) => res.json({ success: true, user: safeUser(req.user) }));
router.put("/profile", isLoggedIn, async (req, res) => {
  const allowed = ["fullName", "email", "location", "latitude", "longitude", "profileImage"];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (updates.fullName !== undefined && (typeof updates.fullName !== "string" || updates.fullName.trim().length < 3)) return res.status(400).json({ success: false, message: "Full name must contain at least 3 characters." });
  Object.assign(req.user, updates);
  await req.user.save();
  return res.json({ success: true, user: safeUser(req.user) });
});

module.exports = router;
