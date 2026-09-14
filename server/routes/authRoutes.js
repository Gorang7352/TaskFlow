const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

// =====================================================
// HELPER: GET USER ROLES
// =====================================================

const getRoles = (user) => {
  let roles = [];

  // New roles system
  if (Array.isArray(user?.roles)) {
    roles = [...user.roles];
  }

  // Old role system - backward compatibility
  else if (user?.role) {
    roles = [user.role];
  }

  // Default normal user
  else {
    roles = ["user"];
  }

  // Admin should always have normal user access also
  if (roles.includes("admin") && !roles.includes("user")) {
    roles.unshift("user");
  }

  // Every normal account must have user access
  if (!roles.includes("user")) {
    roles.unshift("user");
  }

  // Remove duplicates
  return [...new Set(roles)];
};

// =====================================================
// NORMALIZE ACCOUNT TYPE
// =====================================================

const normalizeAccountType = (accountType) => {
  if (!accountType) {
    return "user";
  }

  const value = String(accountType)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // Admin values
  if (
    value === "admin" ||
    value === "teacher / admin" ||
    value === "teacher/admin" ||
    value === "teacher admin" ||
    value === "teacher"
  ) {
    return "admin";
  }

  // Normal user values
  if (
    value === "user" ||
    value === "normal user" ||
    value === "student / normal user" ||
    value === "student/normal user" ||
    value === "student"
  ) {
    return "user";
  }

  return null;
};

// =====================================================
// REGISTER
// =====================================================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      accountType = "user",
    } = req.body;

    // ---------------- VALIDATION ----------------

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // =====================================================
    // NORMALIZE ACCOUNT TYPE
    // =====================================================

    const finalAccountType =
      normalizeAccountType(accountType);

    if (!finalAccountType) {
      return res.status(400).json({
        message: "Invalid account type",
      });
    }

    // ---------------- EMAIL ----------------

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        message:
          "User already exists. Please login instead.",
      });
    }

    // =====================================================
    // ROLES
    // =====================================================

    let roles = ["user"];
    let role = "user";

    // Teacher / Admin
    if (finalAccountType === "admin") {
      roles = ["user", "admin"];
      role = "admin";
    }

    // =====================================================
    // PASSWORD
    // =====================================================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // =====================================================
    // CREATE USER
    // =====================================================

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,

      // New roles system
      roles: roles,

      // Old role system - backward compatibility
      role: role,
    });

    console.log(
      "NEW USER CREATED:",
      user.email,
      "| accountType:",
      finalAccountType,
      "| role:",
      role,
      "| roles:",
      roles
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      message:
        finalAccountType === "admin"
          ? "Admin account created successfully. Please login."
          : "Normal User account created successfully. Please login.",

      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,

        roles: roles,

        role: role,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error during registration",
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // ---------------- VALIDATION ----------------

    if (
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    // ---------------- EMAIL ----------------

    const normalizedEmail =
      email.trim().toLowerCase();

    // ---------------- FIND USER ----------------

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // ---------------- PASSWORD CHECK ----------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // GET ROLES
    // =====================================================

    const roles = getRoles(user);

    // =====================================================
    // FINAL ROLE
    // =====================================================

    const finalRole =
      roles.includes("admin")
        ? "admin"
        : "user";

    // =====================================================
    // JWT
    // =====================================================

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        id: user._id.toString(),

        email: user.email,

        roles: roles,

        // Backward compatibility
        role: finalRole,
      },
      process.env.JWT_SECRET ||
        "taskflow_secret_key",
      {
        expiresIn: "7d",
      }
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        _id: user._id,

        name: user.name,
        email: user.email,

        roles: roles,

        role: finalRole,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      message:
        "Server error during login",
    });
  }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;