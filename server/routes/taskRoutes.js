const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// AUTHENTICATION
// =====================================================

router.use(authMiddleware);

// =====================================================
// GET ALL TASKS FOR LOGGED-IN USER
// =====================================================
// User ko:
// 1. Apne banaye tasks
// 2. Admin dwara assigned tasks
// dono dikhेंगे.
// =====================================================

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const tasks = await Task.find({
      $or: [
        { user: userId },
        { assignedTo: userId },
      ],
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
      "GET TASKS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// =====================================================
// GET NORMAL USERS FOR ASSIGNMENT
// =====================================================
// IMPORTANT:
// Sirf normal users yahan milenge.
// Admin ko assign nahi kiya ja sakta.
// =====================================================

router.get("/users/list", async (req, res) => {
  try {
    const currentUserId =
      req.user.userId;

    const users = await User.find({
      _id: {
        $ne: currentUserId,
      },

      $or: [
        // New roles system
        {
          roles: {
            $in: ["user"],
            $nin: ["admin"],
          },
        },

        // Old users
        {
          role: "user",
        },
      ],
    }).select(
      "_id name email roles role"
    );

    // Extra safety:
    // Admin ko kabhi return nahi karna
    const normalUsers = users.filter(
      (user) => {
        const roles = Array.isArray(
          user.roles
        )
          ? user.roles
          : user.role
          ? [user.role]
          : ["user"];

        return !roles.includes("admin");
      }
    );

    return res.json({
      success: true,
      users: normalUsers,
    });
  } catch (error) {
    console.error(
      "GET USERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch users",
    });
  }
});

// =====================================================
// CREATE TASK
// =====================================================
// Normal User:
//   apna task create karega
//   kisi ko assign nahi kar sakta
//
// Admin:
//   Admin Dashboard ke alag endpoint se
//   normal user ko task assign karega.
// =====================================================

router.post("/", async (req, res) => {
  try {
    const userId =
      req.user.userId;

    const {
      title,
      description,
      category,
      priority,
      dueDate,
    } = req.body;

    // ---------------- VALIDATION ----------------

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Task title is required",
      });
    }

    // IMPORTANT:
    // assignedTo intentionally accept nahi kar rahe.
    // Isliye normal user manually API request bhejkar
    // kisi ko task assign nahi kar sakta.

    const task = await Task.create({
      user: userId,
      assignedTo: null,

      title: title.trim(),

      description:
        description?.trim() || "",

      category:
        category || "General",

      priority:
        priority || "Medium",

      dueDate:
        dueDate || null,

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
      message:
        "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error(
      "CREATE TASK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create task",
    });
  }
});

// =====================================================
// UPDATE TASK
// =====================================================
// Owner ya assigned user update kar sakta hai.
//
// IMPORTANT:
// Normal User assignedTo change nahi kar sakta.
// =====================================================

router.put("/:id", async (req, res) => {
  try {
    const taskId =
      req.params.id;

    const currentUserId =
      req.user.userId;

    // ---------------- OBJECT ID CHECK ----------------

    if (
      !mongoose.Types.ObjectId.isValid(
        taskId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task =
      await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // ---------------- PERMISSION ----------------

    const ownerId =
      task.user?.toString();

    const assignedUserId =
      task.assignedTo?.toString();

    const isOwner =
      ownerId ===
      currentUserId.toString();

    const isAssignedUser =
      assignedUserId ===
      currentUserId.toString();

    if (
      !isOwner &&
      !isAssignedUser
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this task",
      });
    }

    // ---------------- SAFE UPDATE ----------------

    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
    } = req.body;

    if (
      title !== undefined
    ) {
      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Task title cannot be empty",
        });
      }

      task.title =
        title.trim();
    }

    if (
      description !== undefined
    ) {
      task.description =
        description?.trim() || "";
    }

    if (
      category !== undefined
    ) {
      task.category =
        category;
    }

    if (
      priority !== undefined
    ) {
      task.priority =
        priority;
    }

    if (
      dueDate !== undefined
    ) {
      task.dueDate =
        dueDate || null;
    }

    if (
      completed !== undefined
    ) {
      task.completed =
        Boolean(completed);
    }

    // IMPORTANT:
    // assignedTo ko update nahi kar rahe.
    // Normal User assignment bypass nahi kar sakta.

    await task.save();

    const updatedTask =
      await Task.findById(task._id)
        .populate(
          "user",
          "name email roles role"
        )
        .populate(
          "assignedTo",
          "name email roles role"
        );

    return res.json({
      success: true,
      message:
        "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error(
      "UPDATE TASK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update task",
    });
  }
});

// =====================================================
// DELETE TASK
// =====================================================
// Sirf task owner delete kar sakta hai.
// Assigned normal user delete nahi kar sakta.
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    const taskId =
      req.params.id;

    const currentUserId =
      req.user.userId;

    if (
      !mongoose.Types.ObjectId.isValid(
        taskId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task =
      await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const ownerId =
      task.user?.toString();

    // Only owner can delete
    if (
      ownerId !==
      currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only task owner can delete this task",
      });
    }

    await Task.findByIdAndDelete(
      taskId
    );

    return res.json({
      success: true,
      message:
        "Task deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE TASK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete task",
    });
  }
});

// =====================================================
// EXPORT
// =====================================================

module.exports = router;