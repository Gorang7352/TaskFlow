const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* ================= ENVIRONMENT ================= */

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET =
  process.env.JWT_SECRET || "taskflow_secret_key";

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

/* ================= DATABASE ================= */

console.log("Connecting to MongoDB...");

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.error(
      "MongoDB Connection Error:",
      error.message
    );
  });

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});

/* ================= REGISTER ================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role || "user",
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
});

/* ================= LOGIN ================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userRole = user.role || "user";

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: userRole,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

/* ================= AUTH MIDDLEWARE ================= */

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. No token provided.",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const user =
      await User.findById(decoded.id).select(
        "-password"
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Auth Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token",
    });
  }
};

/* ================= CURRENT USER ================= */

app.get(
  "/api/auth/me",
  authMiddleware,
  async (req, res) => {
    try {
      res.json({
        success: true,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role || "user",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          "Unable to fetch user",
      });
    }
  }
);

/* ================================================= */
/* TEMPORARY ADMIN SETUP                             */
/* ================================================= */

app.get(
  "/api/setup-admin",
  async (req, res) => {
    try {
      const adminEmail =
        "kumargorang@gmail.com";

      const user =
        await User.findOneAndUpdate(
          {
            email: adminEmail,
          },
          {
            $set: {
              role: "admin",
            },
          },
          {
            new: true,
          }
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Admin user not found",
        });
      }

      res.json({
        success: true,
        message:
          "Admin role assigned successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(
        "Admin Setup Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to assign admin role",
      });
    }
  }
);

/* ================= TASK ROUTES ================= */

app.use(
  "/api/tasks",
  authMiddleware,
  taskRoutes
);

/* ================= SERVER ================= */

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);