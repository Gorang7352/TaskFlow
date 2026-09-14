// =====================================================
// ADMIN AUTHORIZATION MIDDLEWARE
// =====================================================

const adminMiddleware = (req, res, next) => {
  try {
    // User login hai ya nahi
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // New roles system
    let roles = [];

    if (Array.isArray(req.user.roles)) {
      roles = req.user.roles;
    }

    // Old role system support
    else if (req.user.role) {
      roles = [req.user.role];
    }

    // Default normal user
    else {
      roles = ["user"];
    }

    // Admin check
    if (!roles.includes("admin")) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only.",
      });
    }

    // Admin hai → next route
    next();
  } catch (error) {
    console.error(
      "Admin Middleware Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Admin authorization failed",
    });
  }
};

module.exports = adminMiddleware;