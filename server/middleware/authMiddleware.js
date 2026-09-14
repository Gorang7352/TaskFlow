const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

const authMiddleware = async (req, res, next) => {
  try {
    // ---------------- GET TOKEN ----------------

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message:
          "Access denied. No token provided.",
      });
    }

    const parts =
      authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        message:
          "Invalid token format.",
      });
    }

    const token = parts[1];

    // ---------------- VERIFY TOKEN ----------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET ||
        "taskflow_secret_key"
    );

    const userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    if (!userId) {
      return res.status(401).json({
        message:
          "Invalid token: user ID missing.",
      });
    }

    // =================================================
    // GET CURRENT USER FROM DATABASE
    // =================================================

    const user =
      await User.findById(userId)
        .select("-password");

    if (!user) {
      return res.status(401).json({
        message:
          "User not found.",
      });
    }

    // =================================================
    // GET ROLES
    // =================================================

    let roles = [];

    // New roles system
    if (Array.isArray(user.roles)) {
      roles = [...user.roles];
    }

    // Old role system
    else if (user.role) {
      roles = [user.role];
    }

    // Default
    else {
      roles = ["user"];
    }

    // Every account has User access
    if (!roles.includes("user")) {
      roles.unshift("user");
    }

    // Remove duplicate roles
    roles = [...new Set(roles)];

    // =================================================
    // ATTACH USER TO REQUEST
    // =================================================

    req.user = {
      _id: user._id,
      userId: user._id,
      id: user._id,

      name: user.name,
      email: user.email,

      roles,

      // Backward compatibility
      role: roles.includes("admin")
        ? "admin"
        : "user",
    };

    next();
  } catch (error) {
    console.error(
      "AUTH ERROR:",
      error.message
    );

    return res.status(401).json({
      message:
        "Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;