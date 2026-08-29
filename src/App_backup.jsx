import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [showLogin, setShowLogin] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "Medium",
  });

  // =========================
  // GET ALL TASKS
  // =========================

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/tasks"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();

      setTasks(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load tasks");
    } finally {
      setLoading(false);
    }
  };

  // Load tasks when page opens
  useEffect(() => {
    fetchTasks();
  }, []);

  // =========================
  // CREATE TASK
  // =========================

  const createTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      alert("Please enter task title");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newTask),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      setNewTask({
        title: "",
        description: "",
        priority: "Medium",
      });

      setShowTaskForm(false);

      await fetchTasks();

      alert("Task created successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to create task");
    }
  };

  // =========================
  // COMPLETE / UNCOMPLETE TASK
  // =========================

  const toggleTask = async (task) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${task._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed: !task.completed,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      await fetchTasks();
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    }
  };

  // =========================
  // DELETE TASK
  // =========================

  const deleteTask = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      await fetchTasks();

      alert("Task deleted successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
    }
  };

  // =========================
  // STATISTICS
  // =========================

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const highPriorityTasks = tasks.filter(
    (task) => task.priority === "High" && !task.completed
  ).length;

  return (
    <div className="app">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">

        <div className="logo">

          <div className="logo-icon">
            T
          </div>

          <div>
            <h2>TaskFlow</h2>
            <span>
              SMART TASK MANAGEMENT
            </span>
          </div>

        </div>

        <div className="nav-links">

          <a href="#dashboard">
            Dashboard
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#how-it-works">
            How it works
          </a>

          <button
            className="login-btn"
            onClick={() => setShowLogin(true)}
          >
            Login
          </button>

        </div>

      </nav>


      {/* =========================
          HERO SECTION
      ========================= */}

      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            🚀 Smart Team Productivity Platform
          </div>

          <h1>
            Manage Tasks.
            <br />
            <span>
              Monitor Progress.
            </span>
          </h1>

          <p>
            TaskFlow helps teams organize tasks,
            track deadlines, monitor performance
            and complete projects efficiently
            from one powerful platform.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={() => {
                setShowTaskForm(true);

                setTimeout(() => {
                  document
                    .getElementById("dashboard")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    });
                }, 100);
              }}
            >
              Get Started →
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("features")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Explore Features
            </button>

          </div>

          <div className="trust">

            <div>
              <strong>
                {totalTasks}
              </strong>

              <span>
                Tasks Managed
              </span>
            </div>

            <div>
              <strong>
                {completedTasks}
              </strong>

              <span>
                Completed
              </span>
            </div>

            <div>
              <strong>
                {totalTasks > 0
                  ? Math.round(
                      (completedTasks /
                        totalTasks) *
                        100
                    )
                  : 0}
                %
              </strong>

              <span>
                Completion Rate
              </span>
            </div>

          </div>

        </div>


        {/* Dashboard Preview */}

        <div className="dashboard-preview">

          <div className="dashboard-header">

            <div>
              <span>
                GOOD MORNING
              </span>

              <h3>
                Team Dashboard
              </h3>
            </div>

            <div className="profile">
              G
            </div>

          </div>


          <div className="stats">

            <div className="stat-card">

              <span>
                Total Tasks
              </span>

              <strong>
                {totalTasks}
              </strong>

              <small>
                Live data
              </small>

            </div>


            <div className="stat-card">

              <span>
                Completed
              </span>

              <strong>
                {completedTasks}
              </strong>

              <small>
                Completed tasks
              </small>

            </div>


            <div className="stat-card">

              <span>
                Pending
              </span>

              <strong>
                {pendingTasks}
              </strong>

              <small>
                Active tasks
              </small>

            </div>


            <div className="stat-card">

              <span>
                High Priority
              </span>

              <strong>
                {highPriorityTasks}
              </strong>

              <small>
                Needs attention
              </small>

            </div>

          </div>


          <div className="task-box">

            <div className="task-title">

              <h4>
                Recent Tasks
              </h4>

              <button
                onClick={() =>
                  document
                    .getElementById("dashboard")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                View All
              </button>

            </div>


            {loading && (
              <p>
                Loading tasks...
              </p>
            )}


            {!loading &&
              tasks.length === 0 && (
                <p>
                  No tasks available.
                </p>
              )}


            {!loading &&
              tasks.slice(0, 3).map((task) => (

                <div
                  className="task"
                  key={task._id}
                >

                  <div className="task-icon">
                    {task.priority === "High"
                      ? "!"
                      : "T"}
                  </div>

                  <div className="task-info">

                    <strong>
                      {task.title}
                    </strong>

                    <span>
                      {task.completed
                        ? "Completed"
                        : "Pending"}
                    </span>

                  </div>

                  <label
                    className={
                      task.completed
                        ? "completed"
                        : "progress"
                    }
                  >
                    {task.completed
                      ? "100%"
                      : "Pending"}
                  </label>

                </div>

              ))}

          </div>

        </div>

      </section>


      {/* =========================
          TASK DASHBOARD
      ========================= */}

      <section
        id="dashboard"
        className="task-dashboard"
      >

        <div className="section-heading">

          <span>
            TASK MANAGEMENT
          </span>

          <h2>
            Manage Your Tasks
          </h2>

          <p>
            Create, complete and delete
            tasks directly from TaskFlow.
          </p>

        </div>


        {/* Dashboard Stats */}

        <div className="dashboard-stats">

          <div className="dashboard-stat">

            <span>
              Total Tasks
            </span>

            <strong>
              {totalTasks}
            </strong>

          </div>


          <div className="dashboard-stat">

            <span>
              Completed
            </span>

            <strong>
              {completedTasks}
            </strong>

          </div>


          <div className="dashboard-stat">

            <span>
              Pending
            </span>

            <strong>
              {pendingTasks}
            </strong>

          </div>


          <div className="dashboard-stat">

            <span>
              High Priority
            </span>

            <strong>
              {highPriorityTasks}
            </strong>

          </div>

        </div>


        {/* Add Task Button */}

        <div className="add-task-area">

          <button
            className="primary-btn"
            onClick={() =>
              setShowTaskForm(!showTaskForm)
            }
          >
            {showTaskForm
              ? "Close Form"
              : "+ Add New Task"}
          </button>

        </div>


        {/* Create Task Form */}

        {showTaskForm && (

          <form
            className="task-form"
            onSubmit={createTask}
          >

            <h3>
              Create New Task
            </h3>

            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  title: e.target.value,
                })
              }
            />

            <textarea
              placeholder="Task description"
              value={newTask.description}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  description:
                    e.target.value,
                })
              }
            />

            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  priority: e.target.value,
                })
              }
            >

              <option value="Low">
                Low Priority
              </option>

              <option value="Medium">
                Medium Priority
              </option>

              <option value="High">
                High Priority
              </option>

            </select>


            <button
              type="submit"
              className="primary-btn"
            >
              Create Task
            </button>

          </form>

        )}


        {/* Error */}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}


        {/* Task List */}

        <div className="task-list">

          {loading ? (

            <div className="empty-state">
              Loading tasks...
            </div>

          ) : tasks.length === 0 ? (

            <div className="empty-state">
              <h3>
                No Tasks Yet
              </h3>

              <p>
                Create your first task
                to get started.
              </p>
            </div>

          ) : (

            tasks.map((task) => (

              <div
                className={`task-card ${
                  task.completed
                    ? "task-completed"
                    : ""
                }`}
                key={task._id}
              >

                <div className="task-card-left">

                  <button
                    className="complete-btn"
                    onClick={() =>
                      toggleTask(task)
                    }
                  >
                    {task.completed
                      ? "✓"
                      : "○"}
                  </button>

                  <div>

                    <h3>
                      {task.title}
                    </h3>

                    <p>
                      {task.description ||
                        "No description"}
                    </p>

                    <span
                      className={`priority ${task.priority?.toLowerCase()}`}
                    >
                      {task.priority}
                    </span>

                  </div>

                </div>


                <div className="task-card-actions">

                  <button
                    className="complete-action"
                    onClick={() =>
                      toggleTask(task)
                    }
                  >
                    {task.completed
                      ? "Mark Pending"
                      : "Complete"}
                  </button>

                  <button
                    className="delete-action"
                    onClick={() =>
                      deleteTask(task._id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      </section>


      {/* =========================
          FEATURES
      ========================= */}

      <section
        id="features"
        className="features"
      >

        <div className="section-heading">

          <span>
            WHY TASKFLOW?
          </span>

          <h2>
            Everything your team needs
          </h2>

          <p>
            Manage your team's work
            without complicated tools.
          </p>

        </div>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              ✓
            </div>

            <h3>
              Task Management
            </h3>

            <p>
              Create, assign and track
              tasks with priorities
              and deadlines.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ◷
            </div>

            <h3>
              Progress Monitoring
            </h3>

            <p>
              Monitor task progress
              and identify delayed
              work quickly.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ↗
            </div>

            <h3>
              Analytics
            </h3>

            <p>
              Understand team
              performance using
              clear statistics.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ⚡
            </div>

            <h3>
              Smart Productivity
            </h3>

            <p>
              Help teams prioritize
              important work and
              improve productivity.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          HOW IT WORKS
      ========================= */}

      <section
        id="how-it-works"
        className="how-section"
      >

        <div className="section-heading">

          <span>
            HOW IT WORKS
          </span>

          <h2>
            Simple. Organized. Productive.
          </h2>

        </div>


        <div className="steps">

          <div className="step">

            <div>
              01
            </div>

            <h3>
              Create
            </h3>

            <p>
              Create tasks and
              set priorities.
            </p>

          </div>


          <div className="step">

            <div>
              02
            </div>

            <h3>
              Assign
            </h3>

            <p>
              Assign tasks to
              team members.
            </p>

          </div>


          <div className="step">

            <div>
              03
            </div>

            <h3>
              Monitor
            </h3>

            <p>
              Track progress
              in real time.
            </p>

          </div>


          <div className="step">

            <div>
              04
            </div>

            <h3>
              Complete
            </h3>

            <p>
              Finish projects
              faster.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          FOOTER
      ========================= */}

      <footer>

        <div>

          <h3>
            TaskFlow
          </h3>

          <p>
            Smart Task Management
            & Monitoring Platform
          </p>

        </div>

        <span>
          © 2026 TaskFlow.
          All rights reserved.
        </span>

      </footer>


      {/* =========================
          LOGIN MODAL
      ========================= */}

      {showLogin && (

        <div className="modal-overlay">

          <div className="login-modal">

            <button
              className="close-btn"
              onClick={() =>
                setShowLogin(false)
              }
            >
              ×
            </button>

            <div className="modal-logo">
              T
            </div>

            <h2>
              Welcome to TaskFlow
            </h2>

            <p>
              Login to manage your tasks
            </p>

            <input
              type="email"
              placeholder="Email address"
            />

            <input
              type="password"
              placeholder="Password"
            />

            <button className="modal-login">
              Login
            </button>

            <small>
              Don't have an account?
              {" "}
              <b>
                Register
              </b>
            </small>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;