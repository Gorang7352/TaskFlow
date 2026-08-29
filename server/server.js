require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dns = require("dns");

const taskRoutes = require("./routes/taskRoutes");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const app = express();

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
  process.env.JWT_SECRET || "taskflow_secret_key";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI not found in .env");
  process.exit(1);
}

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* ================= USER MODEL ================= */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

/* ================= JWT ================= */

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

/* ================= HOME ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});

/* ================= REGISTER ================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Account already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
    });

    const token = createToken(user);

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Registration failed.",
    });
  }
});

/* ================= LOGIN ================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        message:
          "Account not found. Please register first.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Incorrect password.",
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Login failed.",
    });
  }
});

/* ================= TASK ROUTES ================= */

// All task CRUD routes are now handled
// by routes/taskRoutes.js

app.use("/api/tasks", taskRoutes);

/* ================= START SERVER ================= */

async function startServer() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log("MongoDB Connected Successfully");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );

      console.log(
        `Mobile backend: http://192.168.71.42:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    process.exit(1);
  }
}

startServer();