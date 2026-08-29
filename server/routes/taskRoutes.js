const express = require("express");
const Task = require("../models/Task");
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

/* ================= GET ALL TASKS ================= */

router.get("/", authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get Tasks Error:", error);

    res.status(500).json({
      message: "Failed to fetch tasks",
    });
  }
});

/* ================= CREATE TASK ================= */

router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
    } = req.body;

    /* ---------- TITLE ---------- */

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    /* ---------- CATEGORY ---------- */

    const selectedCategory = CATEGORIES.includes(
      category
    )
      ? category
      : "Other";

    /* ---------- PRIORITY ---------- */

    const selectedPriority = PRIORITIES.includes(
      priority
    )
      ? priority
      : "Medium";

    /* ---------- CREATE ---------- */

    const task = await Task.create({
      user: req.user.userId,

      title: title.trim(),

      description:
        typeof description === "string"
          ? description.trim()
          : "",

      category: selectedCategory,

      priority: selectedPriority,

      dueDate: dueDate || null,

      completed: completed === true,
    });

    console.log(
      `Task Created → ${task.title} | Category: ${task.category}`
    );

    res.status(201).json({
      message: "Task created successfully",
      task,
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

/* ================= UPDATE TASK ================= */

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      dueDate,
      completed,
    } = req.body;

    /* ---------- TITLE ---------- */

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    /* ---------- CATEGORY ---------- */

    const selectedCategory = CATEGORIES.includes(
      category
    )
      ? category
      : "Other";

    /* ---------- PRIORITY ---------- */

    const selectedPriority = PRIORITIES.includes(
      priority
    )
      ? priority
      : "Medium";

    /* ---------- UPDATE ---------- */

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },

      {
        title: title.trim(),

        description:
          typeof description === "string"
            ? description.trim()
            : "",

        category: selectedCategory,

        priority: selectedPriority,

        dueDate: dueDate || null,

        completed: completed === true,
      },

      {
        new: true,
        runValidators: true,
      }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    console.log(
      `Task Updated → ${task.title} | Category: ${task.category}`
    );

    res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error(
      "Update Task Error:",
      error
    );

    res.status(500).json({
      message: "Failed to update task",
      error: error.message,
    });
  }
});

/* ================= DELETE TASK ================= */

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    console.log(
      `Task Deleted → ${task.title}`
    );

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Task Error:",
      error
    );

    res.status(500).json({
      message: "Failed to delete task",
    });
  }
});

module.exports = router;