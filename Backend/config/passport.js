const passport = require("passport");
const User = require("../models/Owner.js");

passport.use(User.createStrategy());
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
