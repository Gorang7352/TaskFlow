import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("taskflow_token")
  );

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("taskflow_user")) || null
  );

  const [tasks, setTasks] = useState([]);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================
  // FETCH TASKS
  // =========================

  const fetchTasks = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tasks");
      }

      setTasks(data);
    } catch (error) {
      console.error("Fetch Tasks Error:", error.message);
    }
  };

  // =========================
  // LOAD TASKS AFTER LOGIN
  // =========================

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  // =========================
  // REGISTER
  // =========================

  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        setLoading(false);
        return;
      }

      setMessage("Registration successful! Please login.");

      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        setShowRegister(false);
        setShowLogin(true);
        setMessage("");
      }, 1000);
    } catch (error) {
      setMessage("Server connection failed");
    }

    setLoading(false);
  };

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("taskflow_token", data.token);
      localStorage.setItem(
        "taskflow_user",
        JSON.stringify(data.user)
      );

      setToken(data.token);
      setUser(data.user);

      setEmail("");
      setPassword("");
      setMessage("");

      setShowLogin(false);
    } catch (error) {
      setMessage("Server connection failed");
    }

    setLoading(false);
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("taskflow_token");
    localStorage.removeItem("taskflow_user");

    setToken(null);
    setUser(null);
    setTasks([]);
  };

  // =========================
  // CREATE TASK
  // =========================

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!taskTitle.trim()) {
      setMessage("Task title is required");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: taskTitle,
            description: taskDescription,
            priority: taskPriority,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create task");
        return;
      }

      setTasks((previousTasks) => [
        data.task,
        ...previousTasks,
      ]);

      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("Medium");
      setMessage("Task created successfully");

      setTimeout(() => {
        setMessage("");
      }, 2000);
    } catch (error) {
      setMessage("Server connection failed");
    }
  };

  // =========================
  // COMPLETE TASK
  // =========================

  const handleToggleTask = async (task) => {
    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${task._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            completed: !task.completed,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to update task");
        return;
      }

      setTasks((previousTasks) =>
        previousTasks.map((item) =>
          item._id === task._id ? data.task : item
        )
      );
    } catch (error) {
      setMessage("Server connection failed");
    }
  };

  // =========================
  // DELETE TASK
  // =========================

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/tasks/${taskId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to delete task");
        return;
      }

      setTasks((previousTasks) =>
        previousTasks.filter((task) => task._id !== taskId)
      );
    } catch (error) {
      setMessage("Server connection failed");
    }
  };

  // =========================
  // DASHBOARD
  // =========================

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = tasks.filter(
    (task) => !task.completed
  ).length;

  return (
    <div className="app">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">

        <div className="logo">
          <div className="logo-icon">T</div>

          <div>
            <h2>TaskFlow</h2>
            <span>SMART TASK MANAGEMENT</span>
          </div>
        </div>

        <div className="nav-links">

          <a href="#features">Features</a>

          <a href="#how-it-works">
            How it works
          </a>

          {token ? (
            <>
              <span className="user-name">
                Hi, {user?.name}
              </span>

              <button
                className="login-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="login-btn"
              onClick={() => setShowLogin(true)}
            >
              Login
            </button>
          )}

        </div>

      </nav>

      {/* =========================
          HERO
      ========================= */}

      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            🚀 Smart Team Productivity Platform
          </div>

          <h1>
            Manage Tasks.
            <br />
            <span>Monitor Progress.</span>
          </h1>

          <p>
            TaskFlow helps teams organize tasks, track
            deadlines, monitor performance and complete
            projects efficiently from one powerful platform.
          </p>

          <div className="hero-buttons">

            {!token && (
              <button
                className="primary-btn"
                onClick={() => setShowRegister(true)}
              >
                Get Started →
              </button>
            )}

            <button
              className="secondary-btn"
              onClick={() => {
                document
                  .getElementById("features")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            >
              Explore Features
            </button>

          </div>

          <div className="trust">

            <div>
              <strong>{tasks.length}</strong>
              <span>Your Tasks</span>
            </div>

            <div>
              <strong>{completedTasks}</strong>
              <span>Completed</span>
            </div>

            <div>
              <strong>{pendingTasks}</strong>
              <span>Pending</span>
            </div>

          </div>

        </div>

        {/* =========================
            DASHBOARD
        ========================= */}

        <div className="dashboard-preview">

          <div className="dashboard-header">

            <div>
              <span>GOOD MORNING</span>

              <h3>
                {token
                  ? `${user?.name}'s Dashboard`
                  : "Team Dashboard"}
              </h3>
            </div>

            <div className="profile">
              {user?.name
                ? user.name.charAt(0).toUpperCase()
                : "G"}
            </div>

          </div>

          <div className="stats">

            <div className="stat-card">
              <span>Total Tasks</span>
              <strong>{tasks.length}</strong>
              <small>All tasks</small>
            </div>

            <div className="stat-card">
              <span>Completed</span>
              <strong>{completedTasks}</strong>
              <small>Finished tasks</small>
            </div>

            <div className="stat-card">
              <span>In Progress</span>
              <strong>{pendingTasks}</strong>
              <small>Active tasks</small>
            </div>

            <div className="stat-card">
              <span>High Priority</span>
              <strong>
                {
                  tasks.filter(
                    (task) =>
                      task.priority === "High" &&
                      !task.completed
                  ).length
                }
              </strong>
              <small>Needs attention</small>
            </div>

          </div>

          <div className="task-box">

            <div className="task-title">
              <h4>Recent Tasks</h4>
            </div>

            {!token ? (
              <div className="empty-task">
                Login to view your tasks
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-task">
                No tasks yet. Create your first task!
              </div>
            ) : (
              tasks.slice(0, 5).map((task) => (
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
                        : task.priority}
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
              ))
            )}

          </div>

        </div>

      </section>

      {/* =========================
          TASK MANAGEMENT
      ========================= */}

      {token && (
        <section className="task-manager">

          <div className="section-heading">
            <span>YOUR WORKSPACE</span>

            <h2>Manage Your Tasks</h2>

            <p>
              Create, complete and remove your tasks.
            </p>
          </div>

          {/* CREATE TASK */}

          <form
            className="create-task-form"
            onSubmit={handleCreateTask}
          >

            <input
              type="text"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) =>
                setTaskTitle(e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Description"
              value={taskDescription}
              onChange={(e) =>
                setTaskDescription(e.target.value)
              }
            />

            <select
              value={taskPriority}
              onChange={(e) =>
                setTaskPriority(e.target.value)
              }
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <button
              type="submit"
              className="primary-btn"
            >
              + Create Task
            </button>

          </form>

          {message && (
            <div className="message">
              {message}
            </div>
          )}

          {/* TASK LIST */}

          <div className="task-list">

            {tasks.length === 0 ? (
              <p className="empty-task">
                No tasks found.
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  className={`task-item ${
                    task.completed
                      ? "task-completed"
                      : ""
                  }`}
                  key={task._id}
                >

                  <div className="task-item-content">

                    <h3>
                      {task.title}
                    </h3>

                    <p>
                      {task.description ||
                        "No description"}
                    </p>

                    <span>
                      Priority: {task.priority}
                    </span>

                  </div>

                  <div className="task-actions">

                    <button
                      onClick={() =>
                        handleToggleTask(task)
                      }
                    >
                      {task.completed
                        ? "Undo"
                        : "Complete"}
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteTask(task._id)
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
      )}

      {/* =========================
          FEATURES
      ========================= */}

      <section
        id="features"
        className="features"
      >

        <div className="section-heading">

          <span>WHY TASKFLOW?</span>

          <h2>
            Everything your team needs
          </h2>

          <p>
            Manage your team's work without
            complicated tools.
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
              Create, assign and track tasks
              with priorities and deadlines.
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
              Monitor task progress and
              identify delayed work quickly.
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
              Understand team performance
              using clear statistics and reports.
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
              Help teams prioritize important
              work and improve productivity.
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
            <div>01</div>
            <h3>Create</h3>
            <p>
              Create tasks and set priorities.
            </p>
          </div>

          <div className="step">
            <div>02</div>
            <h3>Assign</h3>
            <p>
              Organize tasks for your team.
            </p>
          </div>

          <div className="step">
            <div>03</div>
            <h3>Monitor</h3>
            <p>
              Track progress in real time.
            </p>
          </div>

          <div className="step">
            <div>04</div>
            <h3>Complete</h3>
            <p>
              Finish projects faster.
            </p>
          </div>

        </div>

      </section>

      {/* =========================
          FOOTER
      ========================= */}

      <footer>

        <div>
          <h3>TaskFlow</h3>

          <p>
            Smart Task Management &
            Monitoring Platform
          </p>
        </div>

        <span>
          © 2026 TaskFlow. All rights reserved.
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
              onClick={() => {
                setShowLogin(false);
                setMessage("");
              }}
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

            <form onSubmit={handleLogin}>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                type="submit"
                className="modal-login"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Login"}
              </button>

            </form>

            {message && (
              <p className="modal-message">
                {message}
              </p>
            )}

            <small>
              Don't have an account?{" "}
              <b
                onClick={() => {
                  setShowLogin(false);
                  setShowRegister(true);
                  setMessage("");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Register
              </b>
            </small>

          </div>

        </div>

      )}

      {/* =========================
          REGISTER MODAL
      ========================= */}

      {showRegister && (

        <div className="modal-overlay">

          <div className="login-modal">

            <button
              className="close-btn"
              onClick={() => {
                setShowRegister(false);
                setMessage("");
              }}
            >
              ×
            </button>

            <div className="modal-logo">
              T
            </div>

            <h2>
              Create your account
            </h2>

            <p>
              Start managing your tasks
            </p>

            <form onSubmit={handleRegister}>

              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                required
              />

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                minLength="6"
                required
              />

              <button
                type="submit"
                className="modal-login"
                disabled={loading}
              >
                {loading
                  ? "Creating account..."
                  : "Register"}
              </button>

            </form>

            {message && (
              <p className="modal-message">
                {message}
              </p>
            )}

            <small>
              Already have an account?{" "}
              <b
                onClick={() => {
                  setShowRegister(false);
                  setShowLogin(true);
                  setMessage("");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Login
              </b>
            </small>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;