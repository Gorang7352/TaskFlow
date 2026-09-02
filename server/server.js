require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dns = require("dns");

const taskRoutes = require("./routes/taskRoutes");
const User = require("./models/User");

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

/* =========================
   MIDDLEWARE
========================= */

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   JWT TOKEN
========================= */

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

/* =========================
   HOME / HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});

/* =========================
   REGISTER
========================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        message: "Name is required.",
      });
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Password is required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          "Account already exists. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });

    const token = createToken(user);

    console.log(
      `New User Registered → ${user.name} | ${user.email}`
    );

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    res.status(500).json({
      message: "Registration failed.",
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    if (
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Password is required.",
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

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Incorrect password.",
      });
    }

    const token = createToken(user);

    console.log(
      `User Login → ${user.name} | ${user.email}`
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({
      message: "Login failed.",
    });
  }
});

/* =========================
   TASK ROUTES
========================= */

app.use(
  "/api/tasks",
  taskRoutes
);

/* =========================
   SERVER START
========================= */

async function startServer() {
  try {
    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      }
    );

    console.log(
      "MongoDB Connected Successfully"
    );

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `Server running on http://localhost:${PORT}`
        );

        console.log(
          `Mobile backend: http://192.168.71.42:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "MongoDB Connection Error:",
      error.message
    );

    process.exit(1);
  }
}

startServer();