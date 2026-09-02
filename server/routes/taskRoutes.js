const express = require("express");
const mongoose = require("mongoose");

const Task = require("../models/Task");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

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

/* =========================
   GET ALL TASKS
========================= */

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const tasks = await Task.find({
      $or: [
        { user: userId },
        { assignedTo: userId },
      ],
    })
      .populate("user", "name email")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get Tasks Error:", error);

    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
});

/* =========================
   GET USERS
   Used for task assignment
========================= */

router.get(
  "/users/list",
  authMiddleware,
  async (req, res) => {
    try {
      const users = await User.find({
        _id: {
          $ne: req.user.userId,
        },
      })
        .select("_id name email")
        .sort({ name: 1 });

      res.json(users);
    } catch (error) {
      console.error(
        "Get Users Error:",
        error
      );

      res.status(500).json({
        message: "Failed to fetch users",
      });
    }
  }
);

/* =========================
   CREATE TASK
========================= */

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
      assignedTo,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "Task title is required",
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

    let selectedAssignedTo = null;

    if (assignedTo) {
      if (
        !mongoose.Types.ObjectId.isValid(
          assignedTo
        )
      ) {
        return res.status(400).json({
          message: "Invalid assigned user",
        });
      }

      const assignedUser =
        await User.findById(assignedTo);

      if (!assignedUser) {
        return res.status(404).json({
          message: "Assigned user not found",
        });
      }

      selectedAssignedTo =
        assignedUser._id;
    }

    const task = await Task.create({
      user: req.user.userId,

      assignedTo:
        selectedAssignedTo,

      title: title.trim(),

      description:
        typeof description === "string"
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
          "name email"
        )
        .populate(
          "assignedTo",
          "name email"
        );

    console.log(
      `Task Created → ${task.title} | Assigned: ${
        selectedAssignedTo || "Nobody"
      }`
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
      message: "Failed to create task",
      error: error.message,
    });
  }
});

/* =========================
   UPDATE TASK
========================= */

router.put(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        priority,
        dueDate,
        completed,
        assignedTo,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: "Invalid task ID",
        });
      }

      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message: "Task title is required",
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

      let selectedAssignedTo = null;

      if (assignedTo) {
        if (
          !mongoose.Types.ObjectId.isValid(
            assignedTo
          )
        ) {
          return res.status(400).json({
            message:
              "Invalid assigned user",
          });
        }

        const assignedUser =
          await User.findById(
            assignedTo
          );

        if (!assignedUser) {
          return res.status(404).json({
            message:
              "Assigned user not found",
          });
        }

        selectedAssignedTo =
          assignedUser._id;
      }

      const existingTask =
        await Task.findOne({
          _id: req.params.id,
          $or: [
            {
              user: req.user.userId,
            },
            {
              assignedTo:
                req.user.userId,
            },
          ],
        });

      if (!existingTask) {
        return res.status(404).json({
          message:
            "Task not found or access denied",
        });
      }

      existingTask.title =
        title.trim();

      existingTask.description =
        typeof description ===
        "string"
          ? description.trim()
          : "";

      existingTask.category =
        selectedCategory;

      existingTask.priority =
        selectedPriority;

      existingTask.dueDate =
        dueDate || null;

      existingTask.completed =
        completed === true;

      existingTask.assignedTo =
        selectedAssignedTo;

      await existingTask.save();

      const updatedTask =
        await Task.findById(
          existingTask._id
        )
          .populate(
            "user",
            "name email"
          )
          .populate(
            "assignedTo",
            "name email"
          );

      console.log(
        `Task Updated → ${updatedTask.title}`
      );

      res.json({
        message:
          "Task updated successfully",
        task: updatedTask,
      });
    } catch (error) {
      console.error(
        "Update Task Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update task",
        error: error.message,
      });
    }
  }
);

/* =========================
   DELETE TASK
   Only owner can delete
========================= */

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message: "Invalid task ID",
        });
      }

      const task =
        await Task.findOneAndDelete({
          _id: req.params.id,
          user: req.user.userId,
        });

      if (!task) {
        return res.status(404).json({
          message:
            "Task not found or only task owner can delete it",
        });
      }

      console.log(
        `Task Deleted → ${task.title}`
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