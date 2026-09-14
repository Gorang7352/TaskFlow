const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Task = require("../models/Task");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// ----------------------------------------------------
// ADMIN AUTHENTICATION
// ----------------------------------------------------
router.use(authMiddleware);
router.use(adminMiddleware);

// ----------------------------------------------------
// GET ADMIN STATS
// ----------------------------------------------------
router.get("/stats", async (req, res) => {
  try {
    const adminId = req.user.userId;

    const totalUsers = await User.countDocuments({
      assignedAdmin: adminId,
      roles: { $not: { $elemMatch: { $eq: "admin" } } },
    });

    const totalAdmins = await User.countDocuments({
      roles: { $in: ["admin"] },
    });

    const totalTasks = await Task.countDocuments({
      user: adminId,
    });

    const completedTasks = await Task.countDocuments({
      user: adminId,
      completed: true,
    });

    const pendingTasks = await Task.countDocuments({
      user: adminId,
      completed: false,
    });

    const assignedTasks = await Task.countDocuments({
      user: adminId,
      assignedTo: { $ne: null },
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        totalTasks,
        completedTasks,
        pendingTasks,
        assignedTasks,
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

// ----------------------------------------------------
// GET MY USERS
// Only Normal Users assigned to the logged-in Admin
// ----------------------------------------------------
router.get("/users", async (req, res) => {
  try {
    const adminId = req.user.userId;

    const users = await User.find({
      assignedAdmin: adminId,
      roles: { $not: { $elemMatch: { $eq: "admin" } } },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get My Users Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load your users",
    });
  }
});

// ----------------------------------------------------
// GET AVAILABLE NORMAL USERS
// Users not assigned to any Admin
// ----------------------------------------------------
router.get("/available-users", async (req, res) => {
  try {
    const users = await User.find({
      assignedAdmin: null,
      roles: { $not: { $elemMatch: { $eq: "admin" } } },
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Available Users Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load available users",
    });
  }
});

// ----------------------------------------------------
// ADD NORMAL USER TO MY USER LIST
// ----------------------------------------------------
router.post("/users/:id/add", async (req, res) => {
  try {
    const adminId = req.user.userId;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (String(adminId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const roles = Array.isArray(user.roles)
      ? user.roles
      : user.role
      ? [user.role]
      : ["user"];

    if (roles.includes("admin")) {
      return res.status(400).json({
        success: false,
        message: "Admin accounts cannot be added as users",
      });
    }

    if (user.assignedAdmin) {
      return res.status(400).json({
        success: false,
        message: "This user already belongs to another Admin",
      });
    }

    user.assignedAdmin = adminId;
    await user.save();

    const safeUser = await User.findById(userId).select("-password");

    res.json({
      success: true,
      message: "User added to your user list",
      user: safeUser,
    });
  } catch (error) {
    console.error("Add User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add user",
    });
  }
});

// ----------------------------------------------------
// REMOVE USER FROM MY USER LIST
// ----------------------------------------------------
router.delete("/users/:id/remove", async (req, res) => {
  try {
    const adminId = req.user.userId;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findOne({
      _id: userId,
      assignedAdmin: adminId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User is not in your user list",
      });
    }

    user.assignedAdmin = null;
    await user.save();

    // Remove this user from tasks created by this Admin
    await Task.updateMany(
      {
        user: adminId,
        assignedTo: user._id,
      },
      {
        $set: { assignedTo: null },
      }
    );

    res.json({
      success: true,
      message: "User removed from your user list",
    });
  } catch (error) {
    console.error("Remove User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove user",
    });
  }
});

// ----------------------------------------------------
// CREATE + ASSIGN TASK TO MY USER
// ----------------------------------------------------
router.post("/tasks", async (req, res) => {
  try {
    const adminId = req.user.userId;

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

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: "Please select a user",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assigned user",
      });
    }

    // IMPORTANT:
    // User must belong to the logged-in Admin
    const targetUser = await User.findOne({
      _id: assignedTo,
      assignedAdmin: adminId,
      roles: { $not: { $elemMatch: { $eq: "admin" } } },
    });

    if (!targetUser) {
      return res.status(403).json({
        success: false,
        message: "You can assign tasks only to your own users",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      category: category || "Other",
      priority: priority || "Medium",
      dueDate: dueDate || null,
      completed: false,

      // Admin who created the task
      user: adminId,

      // Normal User receiving the task
      assignedTo: targetUser._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("user", "name email roles")
      .populate("assignedTo", "name email roles");

    res.status(201).json({
      success: true,
      message: "Task created and assigned successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("Admin Create Task Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create and assign task",
    });
  }
});

// ----------------------------------------------------
// GET MY ADMIN TASKS
// ----------------------------------------------------
router.get("/tasks", async (req, res) => {
  try {
    const adminId = req.user.userId;

    const tasks = await Task.find({
      user: adminId,
    })
      .populate("user", "name email roles")
      .populate("assignedTo", "name email roles")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get Admin Tasks Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load admin tasks",
    });
  }
});

// ----------------------------------------------------
// DELETE MY ADMIN TASK
// ----------------------------------------------------
router.delete("/tasks/:id", async (req, res) => {
  try {
    const adminId = req.user.userId;
    const taskId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      user: adminId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete Admin Task Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

module.exports = router;