import "./App.css";
import { useEffect, useMemo, useState } from "react";
const API = "https://taskflow-backend-b6m6.onrender.com/api/tasks";
const AUTH_API = "https://taskflow-backend-b6m6.onrender.com/api/auth";

const CATEGORIES = ["Work", "Study", "Personal", "Shopping", "Other"];

const CATEGORY_ICONS = {
  Work: "💼",
  Study: "📚",
  Personal: "👤",
  Shopping: "🛒",
  Other: "📌",
};

function App() {
  /* ================= AUTH ================= */

  const [token, setToken] = useState(
    localStorage.getItem("taskflowToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("taskflowUser")) || null;
    } catch {
      return null;
    }
  });

  const [authMode, setAuthMode] = useState("login");
  const [showAuth, setShowAuth] = useState(!token);

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [authLoading, setAuthLoading] = useState(false);

  /* ================= TASK STATE ================= */

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Personal",
    priority: "Medium",
    dueDate: "",
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  /* ================= TOAST ================= */

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  /* ================= API HELPER ================= */

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  /* ================= AUTH ================= */

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!authForm.email || !authForm.password) {
      showMessage("Please enter email and password.", "error");
      return;
    }

    if (authMode === "register" && !authForm.name) {
      showMessage("Please enter your name.", "error");
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "login"
          ? `${AUTH_API}/login`
          : `${AUTH_API}/register`;

      const body =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            };

      const data = await request(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const newToken = data.token || data.accessToken;

      if (!newToken) {
        throw new Error("Token not received from server.");
      }

      const newUser = data.user || {
        name: authForm.name,
        email: authForm.email,
      };

      localStorage.setItem("taskflowToken", newToken);
      localStorage.setItem("taskflowUser", JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      setShowAuth(false);

      setAuthForm({
        name: "",
        email: "",
        password: "",
      });

      showMessage(
        authMode === "login"
          ? "Welcome back! Login successful."
          : "Account created successfully!",
        "success"
      );
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("taskflowToken");
    localStorage.removeItem("taskflowUser");

    setToken("");
    setUser(null);
    setTasks([]);
    setShowAuth(true);

    showMessage("You have been logged out.");
  };

  /* ================= FETCH TASKS ================= */

  const fetchTasks = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const data = await request(API);

      const receivedTasks = Array.isArray(data)
        ? data
        : Array.isArray(data.tasks)
        ? data.tasks
        : [];

      setTasks(receivedTasks);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  /* ================= CREATE TASK ================= */

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      showMessage("Please enter a task title.", "error");
      return;
    }

    try {
      const data = await request(API, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          dueDate: form.dueDate || null,
          completed: false,
        }),
      });

      const newTask = data.task || data;

      setTasks((prev) => [newTask, ...prev]);

      setForm({
        title: "",
        description: "",
        category: "Personal",
        priority: "Medium",
        dueDate: "",
      });

      showMessage("Task added successfully!");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* ================= COMPLETE TASK ================= */

  const toggleComplete = async (task) => {
    try {
      const data = await request(`${API}/${task._id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...task,
          completed: !task.completed,
        }),
      });

      const updatedTask = data.task || data;

      setTasks((prev) =>
        prev.map((item) =>
          item._id === task._id ? updatedTask : item
        )
      );

      showMessage(
        !task.completed
          ? "Task completed successfully!"
          : "Task marked as pending."
      );
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* ================= EDIT ================= */

  const openEdit = (task) => {
    setEditingTask({
      ...task,
      category: task.category || "Other",
      priority: task.priority || "Medium",
      dueDate: task.dueDate
        ? String(task.dueDate).slice(0, 10)
        : "",
    });
  };

  const updateTask = async (e) => {
    e.preventDefault();

    if (!editingTask.title.trim()) {
      showMessage("Task title cannot be empty.", "error");
      return;
    }

    try {
      const data = await request(`${API}/${editingTask._id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editingTask.title.trim(),
          description: editingTask.description || "",
          category: editingTask.category || "Other",
          priority: editingTask.priority || "Medium",
          dueDate: editingTask.dueDate || null,
          completed: !!editingTask.completed,
        }),
      });

      const updatedTask = data.task || data;

      setTasks((prev) =>
        prev.map((item) =>
          item._id === editingTask._id
            ? updatedTask
            : item
        )
      );

      setEditingTask(null);

      showMessage("Task updated successfully!");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* ================= DELETE ================= */

  const askDeleteTask = (task) => {
    setDeleteTaskInfo(task);
  };

  const cancelDelete = () => {
    setDeleteTaskInfo(null);
  };

  const confirmDelete = async () => {
    if (!deleteTaskInfo) return;

    try {
      await request(`${API}/${deleteTaskInfo._id}`, {
        method: "DELETE",
      });

      setTasks((prev) =>
        prev.filter(
          (item) => item._id !== deleteTaskInfo._id
        )
      );

      setDeleteTaskInfo(null);

      showMessage("Task deleted successfully!");
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  /* ================= DATE HELPERS ================= */

  const formatDate = (date) => {
    if (!date) return "No due date";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return "No due date";
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);

    return due < today;
  };

  const isToday = (task) => {
    if (!task.dueDate) return false;

    const today = new Date();
    const due = new Date(task.dueDate);

    return (
      today.getFullYear() === due.getFullYear() &&
      today.getMonth() === due.getMonth() &&
      today.getDate() === due.getDate()
    );
  };

  /* ================= FILTER + SORT ================= */

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter((task) =>
        `${task.title || ""} ${
          task.description || ""
        } ${task.category || ""}`
          .toLowerCase()
          .includes(q)
      );
    }

    if (categoryFilter !== "All") {
      result = result.filter(
        (task) =>
          (task.category || "Other") === categoryFilter
      );
    }

    if (priorityFilter !== "All") {
      result = result.filter(
        (task) =>
          (task.priority || "Medium") === priorityFilter
      );
    }

    if (statusFilter === "Pending") {
      result = result.filter((task) => !task.completed);
    }

    if (statusFilter === "Completed") {
      result = result.filter((task) => task.completed);
    }

    if (statusFilter === "Overdue") {
      result = result.filter((task) => isOverdue(task));
    }

    const priorityValue = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    result.sort((a, b) => {
      if (sortBy === "Newest") {
        return (
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
        );
      }

      if (sortBy === "Oldest") {
        return (
          new Date(a.createdAt || 0) -
          new Date(b.createdAt || 0)
        );
      }

      if (sortBy === "Priority High") {
        return (
          (priorityValue[b.priority] || 2) -
          (priorityValue[a.priority] || 2)
        );
      }

      if (sortBy === "Priority Low") {
        return (
          (priorityValue[a.priority] || 2) -
          (priorityValue[b.priority] || 2)
        );
      }

      if (sortBy === "Due Date") {
        return (
          new Date(a.dueDate || "9999-12-31") -
          new Date(b.dueDate || "9999-12-31")
        );
      }

      return 0;
    });

    return result;
  }, [
    tasks,
    search,
    categoryFilter,
    priorityFilter,
    statusFilter,
    sortBy,
  ]);

  /* ================= STATS ================= */

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = tasks.filter(
    (task) => !task.completed
  ).length;

  const todayTasks = tasks.filter(isToday).length;

  const overdueTasks = tasks.filter(isOverdue).length;

  const highPriorityTasks = tasks.filter(
    (task) =>
      !task.completed &&
      (task.priority || "Medium") === "High"
  ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks / tasks.length) * 100
        );

  const categoryStats = CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = tasks.filter(
        (task) =>
          (task.category || "Other") === category
      ).length;

      return acc;
    },
    {}
  );

  /* ================= DISPLAY NAME ================= */

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    (user?.email
      ? user.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase())
      : "User");

  /* ================= AUTH SCREEN ================= */

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <div className="brand-mark">✓</div>
          <span>TaskFlow</span>
        </div>

        <div className="auth-card">
          <div className="auth-icon">✓</div>

          <h1>
            {authMode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>
            {authMode === "login"
              ? "Login to manage your tasks and stay productive."
              : "Start organizing your work with TaskFlow."}
          </p>

          <form
            className="auth-form"
            onSubmit={handleAuth}
          >
            {authMode === "register" && (
              <>
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target.value,
                    })
                  }
                />
              </>
            )}

            <label>Email</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={authForm.email}
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  email: e.target.value,
                })
              }
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={authForm.password}
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  password: e.target.value,
                })
              }
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login to TaskFlow"
                : "Create Account"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() =>
                setAuthMode(
                  authMode === "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {authMode === "login"
                ? "Create one"
                : "Login"}
            </button>
          </div>
        </div>

        <div className="auth-footer">
          © 2026 TaskFlow • Simple • Focused • Productive
        </div>
      </div>
    );
  }

  /* ================= MAIN APP ================= */

  return (
    <div className="app-shell">
      {/* ================= HEADER ================= */}

      <header className="top-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">✓</div>
            <span>TaskFlow</span>
          </div>

          <div className="header-right">
            <div className="welcome-user">
              Hi, {displayName} 👋
            </div>

            <div className="user-email">
              {user?.email || "User"}
            </div>

            <button
              className="logout-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main className="main-content">
        {/* HERO */}

        <section className="welcome-section">
          <div>
            <span className="welcome-label">
              YOUR PERSONAL WORKSPACE
            </span>

            <h1>
              Good to see you{" "}
              <span className="wave">👋</span>
            </h1>

            <p>
              Stay organized and make progress one task
              at a time.
            </p>
          </div>
        </section>

        {/* ================= STATS ================= */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📅</div>

            <div className="stat-content">
              <span>Today's Tasks</span>
              <strong>{todayTasks}</strong>
              <small>Tasks due today</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">⚠️</div>

            <div className="stat-content">
              <span>Overdue</span>
              <strong>{overdueTasks}</strong>
              <small>Unfinished past deadlines</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">🔥</div>

            <div className="stat-content">
              <span>High Priority</span>
              <strong>{highPriorityTasks}</strong>
              <small>Important tasks</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">✓</div>

            <div className="stat-content">
              <span>Completion Rate</span>
              <strong>{progress}%</strong>
              <small>Overall productivity</small>
            </div>
          </div>
        </section>

        {/* ================= PROGRESS ================= */}

        <section className="progress-card">
          <div className="progress-top">
            <div>
              <div className="section-kicker">
                PRODUCTIVITY
              </div>

              <h2>Overall Progress</h2>

              <p>
                {progress === 100
                  ? "Excellent work — everything is completed!"
                  : "Keep going — you're making progress!"}
              </p>
            </div>

            <div className="progress-number">
              <strong>{completedTasks}</strong>

              <span>
                of {tasks.length} completed
              </span>
            </div>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="progress-footer">
            <span>{progress}% complete</span>

            <span>
              {pendingTasks} pending
            </span>
          </div>
        </section>

        {/* ================= CREATE TASK ================= */}

        <section className="create-card">
          <div className="section-heading">
            <div className="heading-icon">✨</div>

            <div>
              <div className="section-kicker">
                GET THINGS DONE
              </div>

              <h2>Create New Task</h2>

              <p>
                Add something to your task list
              </p>
            </div>
          </div>

          <form
            className="create-form"
            onSubmit={handleCreateTask}
          >
            <div className="form-field full">
              <label>Task Title</label>

              <input
                type="text"
                placeholder="e.g. Prepare semester exam"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-field full">
              <label>Description</label>

              <textarea
                placeholder="Add task details..."
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-field">
              <label>Category</label>

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              >
                {CATEGORIES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Priority</label>

              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value,
                  })
                }
              >
                <option value="High">High</option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-field">
              <label>Due Date</label>

              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    dueDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-field button-field">
              <label>&nbsp;</label>

              <button
                className="add-task-btn"
                type="submit"
              >
                <span>＋</span>
                Add Task
              </button>
            </div>
          </form>
        </section>

        {/* ================= CATEGORY OVERVIEW ================= */}

        <section className="category-section">
          <div className="section-title-row">
            <div>
              <div className="section-kicker">
                ORGANIZE
              </div>

              <h2>Category Overview</h2>

              <p>
                Tasks grouped by category
              </p>
            </div>
          </div>

          <div className="category-grid">
            {CATEGORIES.map((category) => (
              <div
                className="category-stat-card"
                key={category}
              >
                <div className="category-icon">
                  {CATEGORY_ICONS[category]}
                </div>

                <div className="category-info">
                  <span>{category}</span>

                  <strong>
                    {categoryStats[category] || 0}
                  </strong>

                  <small>
                    {categoryStats[category] === 1
                      ? "task"
                      : "tasks"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= TASK MANAGER ================= */}

        <section className="task-manager-card">
          <div className="manager-header">
            <div>
              <div className="section-kicker">
                YOUR WORKSPACE
              </div>

              <h2>Your Tasks</h2>

              <p>
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1
                  ? "task"
                  : "tasks"}{" "}
                shown
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={fetchTasks}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {/* CONTROLS */}

          <div className="task-controls">
            <div className="search-box">
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value)
              }
            >
              <option value="All">
                All Categories
              </option>

              {CATEGORIES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value)
              }
            >
              <option value="All">
                All Priorities
              </option>

              <option value="High">High</option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Overdue">
                Overdue
              </option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
            >
              <option value="Newest">
                Newest
              </option>

              <option value="Oldest">
                Oldest
              </option>

              <option value="Priority High">
                Priority High
              </option>

              <option value="Priority Low">
                Priority Low
              </option>

              <option value="Due Date">
                Due Date
              </option>
            </select>
          </div>

          {/* TASK LIST */}

          <div className="task-list">
            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />

                <h3>Loading tasks...</h3>

                <p>
                  Please wait while your tasks
                  are loading.
                </p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  📝
                </div>

                <h3>No tasks found</h3>

                <p>
                  Create a task or change your
                  filters.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  className={`task-item ${
                    task.completed
                      ? "completed-task"
                      : ""
                  }`}
                  key={task._id}
                >
                  <div className="task-main">
                    <button
                      className={`complete-btn ${
                        task.completed
                          ? "completed"
                          : ""
                      }`}
                      onClick={() =>
                        toggleComplete(task)
                      }
                      title={
                        task.completed
                          ? "Mark as pending"
                          : "Mark as complete"
                      }
                    >
                      {task.completed ? "✓" : ""}
                    </button>

                    <div className="task-content">
                      <div className="task-title-row">
                        <h3>{task.title}</h3>

                        <span
                          className={`priority-badge ${String(
                            task.priority ||
                              "Medium"
                          ).toLowerCase()}`}
                        >
                          {task.priority ||
                            "Medium"}
                        </span>
                      </div>

                      {task.description && (
                        <p className="task-description">
                          {task.description}
                        </p>
                      )}

                      <div className="task-meta">
                        <span className="category-badge">
                          {
                            CATEGORY_ICONS[
                              task.category ||
                                "Other"
                            ]
                          }{" "}
                          {task.category ||
                            "Other"}
                        </span>

                        <span className="date-meta">
                          📅{" "}
                          {formatDate(
                            task.dueDate
                          )}
                        </span>

                        {isOverdue(task) && (
                          <span className="overdue-label">
                            Overdue
                          </span>
                        )}

                        {task.completed && (
                          <span className="completed-label">
                            ✓ Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="edit-btn"
                      onClick={() =>
                        openEdit(task)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() =>
                        askDeleteTask(task)
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
      </main>

      {/* ================= FOOTER ================= */}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <div className="footer-mark">✓</div>

              <span>TaskFlow</span>
            </div>

            <p>
              Smart task management made simple.
              Plan your work, stay organized, and
              get things done efficiently.
            </p>
          </div>

          <div className="footer-column">
            <h3>Product</h3>

            <span>Task Management</span>
            <span>Priority Tracking</span>
            <span>Due Date Management</span>
            <span>Progress Tracking</span>
          </div>

          <div className="footer-column">
            <h3>Stay Productive</h3>

            <p>
              Simple tools designed to help you
              stay focused, organized and
              productive.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © 2026 TaskFlow. All rights reserved.
          </span>

          <span>
            Built for better productivity
            <b> • </b>
            Simple • Focused • Productive
          </span>
        </div>
      </footer>

      {/* ================= TOAST ================= */}

      {message && (
        <div
          className={`toast ${
            messageType === "error"
              ? "toast-error"
              : "toast-success"
          }`}
        >
          <span className="toast-icon">
            {messageType === "error"
              ? "!"
              : "✓"}
          </span>

          <span>{message}</span>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}

      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <div className="section-kicker">
                  TASK UPDATE
                </div>

                <h2>Edit Task</h2>

                <p>
                  Update your task details.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setEditingTask(null)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={updateTask}
              className="edit-form"
            >
              <label>Task Title</label>

              <input
                type="text"
                value={editingTask.title}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    title: e.target.value,
                  })
                }
              />

              <label>Description</label>

              <textarea
                value={
                  editingTask.description || ""
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    description:
                      e.target.value,
                  })
                }
              />

              <div className="form-row">
                <div>
                  <label>Category</label>

                  <select
                    value={
                      editingTask.category ||
                      "Other"
                    }
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        category:
                          e.target.value,
                      })
                    }
                  >
                    {CATEGORIES.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Priority</label>

                  <select
                    value={
                      editingTask.priority ||
                      "Medium"
                    }
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority:
                          e.target.value,
                      })
                    }
                  >
                    <option value="High">
                      High
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="Low">
                      Low
                    </option>
                  </select>
                </div>
              </div>

              <label>Due Date</label>

              <input
                type="date"
                value={
                  editingTask.dueDate || ""
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    dueDate:
                      e.target.value,
                  })
                }
              />

              <label>Status</label>

              <select
                value={
                  editingTask.completed
                    ? "Completed"
                    : "Pending"
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    completed:
                      e.target.value ===
                      "Completed",
                  })
                }
              >
                <option value="Pending">
                  Pending
                </option>

                <option value="Completed">
                  Completed
                </option>
              </select>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setEditingTask(null)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE MODAL ================= */}

      {deleteTaskInfo && (
        <div className="modal-overlay">
          <div className="delete-modal">
            <div className="delete-icon">
              🗑️
            </div>

            <h2>Delete Task?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>
                "{deleteTaskInfo.title}"
              </strong>
              ?
            </p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={cancelDelete}
              >
                Cancel
              </button>

              <button
                className="delete-confirm-btn"
                onClick={confirmDelete}
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;