const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const parts = authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer"
    ) {
      return res.status(401).json({
        message: "Invalid token format.",
      });
    }

    const token = parts[1];

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

    const user =
      await User.findById(userId).select(
        "-password"
      );

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    // ================= ROLES =================

    let roles = [];

    if (Array.isArray(user.roles)) {
      roles = user.roles;
    } else if (user.role) {
      // Support old accounts
      roles = [user.role];
    } else {
      roles = ["user"];
    }

    // Every account has normal user access
    if (!roles.includes("user")) {
      roles.push("user");
    }

    // ================= REQUEST USER =================

    req.user = {
      _id: user._id,
      userId: user._id,
      id: user._id,

      name: user.name,
      email: user.email,

      roles: roles,

      // Compatibility:
      // admin if account has admin permission
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