function safeUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName,
    phone: user.phone,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    location: user.location,
    latitude: user.latitude,
    longitude: user.longitude,
    isActive: user.isActive
  };
}

function isLoggedIn(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ success: false, message: "You are not authenticated." });
  }
  if (req.user.isActive === false) {
    return req.logout(() => res.status(401).json({ success: false, message: "Your account has been disabled. Please contact support." }));
  }
  next();
}

function roleRequired(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ success: false, message: "You are not authorized to perform this action." });
    }
    next();
  };
}

module.exports = {
  safeUser,
  isLoggedIn,
  isFarmer: roleRequired("Farmer"),
  isDriver: roleRequired("Driver"),
  isAdmin: roleRequired("Admin")
};
