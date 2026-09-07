const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// ================= GET TASKS =================

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
      "Get Tasks Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
    });
  }
});

// ================= GET NORMAL USERS =================
// Used by Admin to assign tasks.
//
// Admin users are intentionally excluded.

router.get("/users/list", async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const users = await User.find({
      _id: {
        $ne: currentUserId,
      },

      $or: [
        {
          roles: {
            $nin: ["admin"],
          },
        },
        {
          roles: {
            $exists: false,
          },
        },
        {
          role: "user",
        },
      ],
    })
      .select("_id name email roles role")
      .sort({ name: 1 });

    // Extra server-side protection:
    // Never return an admin account in assignment list.
    const normalUsers = users.filter((user) => {
      const roles = Array.isArray(user.roles)
        ? user.roles
        : user.role
        ? [user.role]
        : ["user"];

      return !roles.includes("admin");
    });

    return res.json({
      success: true,
      users: normalUsers,
    });
  } catch (error) {
    console.error(
      "Get Users Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// ================= CREATE NORMAL USER TASK =================

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // IMPORTANT:
    // Normal users cannot assign tasks.
    // assignedTo is ALWAYS null here.

    const task = await Task.create({
      user: req.user.userId,

      assignedTo: null,

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
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error(
      "Create Task Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message,
    });
  }
});

// ================= UPDATE TASK =================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const currentUserId =
      req.user.userId.toString();

    const ownerId =
      task.user.toString();

    const assignedUserId =
      task.assignedTo
        ? task.assignedTo.toString()
        : null;

    // Only owner or assigned user can update
    if (
      currentUserId !== ownerId &&
      currentUserId !== assignedUserId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this task",
      });
    }

    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
    } = req.body;

    if (
      title !== undefined &&
      (!title || !title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (title !== undefined) {
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description =
        typeof description === "string"
          ? description.trim()
          : "";
    }

    if (category !== undefined) {
      task.category = category;
    }

    if (priority !== undefined) {
      task.priority = priority;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate || null;
    }

    if (completed !== undefined) {
      task.completed = Boolean(completed);
    }

    // IMPORTANT:
    // assignedTo is never changed from this route.
    // Assignment is controlled by Admin route only.

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
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error(
      "Update Task Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
});

// ================= DELETE TASK =================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const currentUserId =
      req.user.userId.toString();

    const ownerId =
      task.user.toString();

    // Only task owner can delete.
    if (currentUserId !== ownerId) {
      return res.status(403).json({
        success: false,
        message:
          "Only the task owner can delete this task",
      });
    }

    await Task.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Task Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
    });
  }
});

module.exports = router;