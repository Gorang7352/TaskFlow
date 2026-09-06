const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

const ADMIN_REGISTRATION_CODE =
  process.env.ADMIN_REGISTRATION_CODE || "COLLEGE2026";

// ================= REGISTER =================

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      accountType,
      adminCode,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // ================= ROLE =================

    let role = "user";

    if (accountType === "admin") {
      if (!adminCode) {
        return res.status(400).json({
          message:
            "Admin Registration Code is required",
        });
      }

      if (
        adminCode.trim() !==
        ADMIN_REGISTRATION_CODE
      ) {
        return res.status(403).json({
          message:
            "Invalid Admin Registration Code",
        });
      }

      role = "admin";
    }

    // ================= PASSWORD =================

    const hashedPassword =
      await bcrypt.hash(password, 10);

    // ================= CREATE USER =================

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message:
        role === "admin"
          ? "Teacher / Admin account created successfully. Please login."
          : "Student account created successfully. Please login.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Register Error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error during registration",
    });
  }
});

// ================= LOGIN =================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

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

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET ||
        "taskflow_secret_key",
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",

      token,

      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error.message
    );

    res.status(500).json({
      message:
        "Server error during login",
    });
  }
});

module.exports = router;