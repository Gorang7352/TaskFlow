const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");

const router = express.Router();

const CATEGORIES = [
  "Work",
  "Study",
  "Personal",
  "Shopping",
  "Other",
];

const PRIORITIES = [
  "Low",
  "Medium",
  "High",
];

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
        "name email role"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });

    res.json(tasks);
  } catch (error) {
    console.error(
      "Get Tasks Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to fetch tasks",
    });
  }
});

// ================= GET USERS =================
// Normal users are allowed in assignment list.
// Admins are intentionally excluded.

router.get(
  "/users/list",
  async (req, res) => {
    try {
      const users =
        await User.find({
          _id: {
            $ne: req.user.userId,
          },
          role: "user",
        })
          .select(
            "_id name email role"
          )
          .sort({
            name: 1,
          });

      res.json(users);
    } catch (error) {
      console.error(
        "Get Users Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to fetch users",
      });
    }
  }
);

// ================= CREATE TASK =================

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message:
          "Task title is required",
      });
    }

    const selectedCategory =
      CATEGORIES.includes(category)
        ? category
        : "Other";

    const selectedPriority =
      PRIORITIES.includes(priority)
        ? priority
        : "Medium";

    // Normal user can NEVER assign
    // a task through this endpoint.

    const task =
      await Task.create({
        user: req.user.userId,

        assignedTo: null,

        title: title.trim(),

        description:
          typeof description ===
          "string"
            ? description.trim()
            : "",

        category:
          selectedCategory,

        priority:
          selectedPriority,

        dueDate:
          dueDate || null,

        completed:
          completed === true,
      });

    const populatedTask =
      await Task.findById(task._id)
        .populate(
          "user",
          "name email role"
        )
        .populate(
          "assignedTo",
          "name email role"
        );

    res.status(201).json({
      message:
        "Task created successfully",

      task: populatedTask,
    });
  } catch (error) {
    console.error(
      "Create Task Error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create task",
      error: error.message,
    });
  }
});

// ================= UPDATE TASK =================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid task ID",
        });
      }

      const task =
        await Task.findById(id);

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found",
        });
      }

      const currentUserId =
        String(req.user.userId);

      const isOwner =
        String(task.user) ===
        currentUserId;

      const isAssignedUser =
        task.assignedTo &&
        String(
          task.assignedTo
        ) === currentUserId;

      if (
        !isOwner &&
        !isAssignedUser
      ) {
        return res.status(403).json({
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
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message:
            "Task title is required",
        });
      }

      task.title =
        title.trim();

      task.description =
        typeof description ===
        "string"
          ? description.trim()
          : "";

      task.category =
        CATEGORIES.includes(
          category
        )
          ? category
          : task.category ||
            "Other";

      task.priority =
        PRIORITIES.includes(
          priority
        )
          ? priority
          : task.priority ||
            "Medium";

      task.dueDate =
        dueDate || null;

      task.completed =
        completed === true;

      // IMPORTANT:
      // assignedTo is NOT changed here.
      // Only Admin Dashboard can assign.

      await task.save();

      const populatedTask =
        await Task.findById(
          task._id
        )
          .populate(
            "user",
            "name email role"
          )
          .populate(
            "assignedTo",
            "name email role"
          );

      res.json({
        message:
          "Task updated successfully",

        task: populatedTask,
      });
    } catch (error) {
      console.error(
        "Update Task Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update task",
      });
    }
  }
);

// ================= DELETE TASK =================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid task ID",
        });
      }

      const task =
        await Task.findById(id);

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found",
        });
      }

      if (
        String(task.user) !==
        String(req.user.userId)
      ) {
        return res.status(403).json({
          message:
            "Only the task owner can delete this task",
        });
      }

      await Task.findByIdAndDelete(
        id
      );

      res.json({
        message:
          "Task deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Task Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete task",
      });
    }
  }
);

module.exports = router;