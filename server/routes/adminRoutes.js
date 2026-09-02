const express = require("express");
const User = require("../models/User");
const Task = require("../models/Task");

const router = express.Router();

/* =========================
   ADMIN DASHBOARD STATS
========================= */

router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalTasks = await Task.countDocuments();

    const completedTasks = await Task.countDocuments({
      completed: true,
    });

    const pendingTasks = await Task.countDocuments({
      completed: false,
    });

    const highPriorityTasks = await Task.countDocuments({
      priority: "High",
    });

    const mediumPriorityTasks = await Task.countDocuments({
      priority: "Medium",
    });

    const lowPriorityTasks = await Task.countDocuments({
      priority: "Low",
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTasks,
        completedTasks,
        pendingTasks,
        highPriorityTasks,
        mediumPriorityTasks,
        lowPriorityTasks,
      },
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin statistics",
    });
  }
});

/* =========================
   GET ALL USERS
========================= */

router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin Users Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

/* =========================
   GET ALL TASKS
========================= */

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("user", "name email role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Admin Tasks Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load all tasks",
    });
  }
});

/* =========================
   GET SINGLE USER
========================= */

router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userTasks = await Task.find({
      $or: [
        { user: user._id },
        { assignedTo: user._id },
      ],
    })
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      user,
      tasks: userTasks,
    });
  } catch (error) {
    console.error("Single User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load user details",
    });
  }
});

/* =========================
   DELETE USER
========================= */

router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Admin cannot delete their own account",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await Task.deleteMany({
      $or: [
        { user: user._id },
        { assignedTo: user._id },
      ],
    });

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User and related tasks deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

/* =========================
   DELETE TASK
========================= */

router.delete("/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Admin Delete Task Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

module.exports = router;