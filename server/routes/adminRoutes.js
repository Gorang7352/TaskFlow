const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// Admin authentication
router.use(authMiddleware);
router.use(adminMiddleware);

// ================= CREATE TASK AS ADMIN =================

router.post("/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      assignedTo,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    let assignedUser = null;

    if (assignedTo) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      // Only NORMAL USERS can receive admin-assigned tasks.
      // Admin accounts are excluded.
      assignedUser = await User.findOne({
        _id: assignedTo,
        roles: { $nin: ["admin"] },
      });

      // Backward compatibility for old users having role field
      if (!assignedUser) {
        assignedUser = await User.findOne({
          _id: assignedTo,
          role: "user",
        });
      }

      if (!assignedUser) {
        return res.status(403).json({
          success: false,
          message:
            "Tasks can only be assigned to normal users/students.",
        });
      }
    }

    const task = await Task.create({
      user: req.user.userId,
      assignedTo: assignedUser
        ? assignedUser._id
        : null,

      title: title.trim(),

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      category: category || "Other",

      priority: priority || "Medium",

      dueDate: dueDate || null,

      completed: false,
    });

    const populatedTask =
      await Task.findById(task._id)
        .populate(
          "user",
          "name email roles role"
        )
        .populate(
          "assignedTo",
          "name email roles role"
        );

    return res.status(201).json({
      success: true,

      message: assignedUser
        ? `Task created and assigned to ${
            assignedUser.name ||
            assignedUser.email
          }`
        : "Task created successfully",

      task: populatedTask,
    });
  } catch (error) {
    console.error(
      "Admin Create Task Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});

// ================= GET ADMIN TASKS =================

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.userId,
    })
      .populate(
        "user",
        "name email roles role"
      )
      .populate(
        "assignedTo",
        "name email roles role"
      )
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error(
      "Admin Get Tasks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin tasks",
    });
  }
});

module.exports = router;