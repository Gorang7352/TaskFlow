import { useEffect, useState } from "react";

const ADMIN_API = "https://taskflow-odcc.onrender.com/api/admin";

function AdminDashboard({ user, token, onLogout }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0,
  });

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    category: "Other",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
  });

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [statsData, usersData, tasksData] = await Promise.all([
        request(`${ADMIN_API}/stats`),
        request(`${ADMIN_API}/users`),
        request(`${ADMIN_API}/tasks`),
      ]);

      setStats({
        totalUsers: statsData.stats?.totalUsers || 0,
        totalTasks: statsData.stats?.totalTasks || 0,
        completedTasks: statsData.stats?.completedTasks || 0,
        pendingTasks: statsData.stats?.pendingTasks || 0,
        highPriorityTasks: statsData.stats?.highPriorityTasks || 0,
        mediumPriorityTasks: statsData.stats?.mediumPriorityTasks || 0,
        lowPriorityTasks: statsData.stats?.lowPriorityTasks || 0,
      });

      setUsers(
        Array.isArray(usersData.users)
          ? usersData.users
          : []
      );

      setTasks(
        Array.isArray(tasksData.tasks)
          ? tasksData.tasks
          : []
      );
    } catch (error) {
      console.error("Admin Dashboard Error:", error);

      setMessage(
        error.message || "Unable to load admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  const getUserName = (person) => {
    if (!person) return null;

    return (
      person.name ||
      person.fullName ||
      person.username ||
      null
    );
  };

  const getUserEmail = (person) => {
    if (!person) return "";

    return person.email || "";
  };

  const getInitial = (person, fallback = "U") => {
    const name =
      person?.name ||
      person?.fullName ||
      person?.username ||
      person?.email;

    return (
      name?.charAt(0)?.toUpperCase() ||
      fallback
    );
  };

  /* =========================
     CREATE TASK FORM
  ========================= */

  const handleTaskInput = (event) => {
    const { name, value } = event.target;

    setTaskForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      category: "Other",
      priority: "Medium",
      dueDate: "",
      assignedTo: "",
    });
  };

  const closeCreateModal = () => {
    if (creatingTask) return;

    setShowCreateModal(false);
    resetTaskForm();
  };

  const createAdminTask = async (event) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setMessage("Please enter a task title.");
      return;
    }

    try {
      setCreatingTask(true);
      setMessage("");

      const data = await request(`${ADMIN_API}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          category: taskForm.category,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate || null,
          assignedTo: taskForm.assignedTo || null,
        }),
      });

      setShowCreateModal(false);
      resetTaskForm();

      setMessage(
        data.message || "Task created successfully."
      );

      await loadAdminData();

      setActiveTab("tasks");
    } catch (error) {
      console.error("Create Admin Task Error:", error);

      setMessage(
        error.message || "Failed to create task."
      );
    } finally {
      setCreatingTask(false);
    }
  };

  /* =========================
     DELETE USER
  ========================= */

  const deleteUser = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user and their related tasks?"
    );

    if (!confirmed) return;

    try {
      await request(`${ADMIN_API}/users/${id}`, {
        method: "DELETE",
      });

      setMessage("User deleted successfully.");

      await loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  /* =========================
     DELETE TASK
  ========================= */

  const deleteTask = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      await request(`${ADMIN_API}/tasks/${id}`, {
        method: "DELETE",
      });

      setMessage("Task deleted successfully.");

      await loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const completionRate =
    stats.totalTasks > 0
      ? Math.round(
          (stats.completedTasks / stats.totalTasks) * 100
        )
      : 0;

  return (
    <div className="admin-page">
      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="admin-navbar">
        <div className="admin-brand">
          <div className="admin-logo">T</div>

          <div>
            <h2>TaskFlow</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <div className="admin-user-area">
          <div className="admin-profile">
            <div className="admin-avatar">
              {getInitial(user, "A")}
            </div>

            <div>
              <strong>
                {user?.name ||
                  user?.email ||
                  "Admin"}
              </strong>

              <small>{user?.email || ""}</small>
            </div>
          </div>

          <button
            className="admin-logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* =========================
          MAIN
      ========================= */}

      <main className="admin-container">
        <section className="admin-header">
          <div>
            <p className="admin-label">
              ADMINISTRATOR
            </p>

            <h1>Admin Dashboard</h1>

            <p>
              Manage users, tasks and monitor overall
              TaskFlow activity.
            </p>
          </div>

          <button
            className="admin-refresh-btn"
            onClick={loadAdminData}
            disabled={loading}
          >
            ↻ {loading ? "Loading..." : "Refresh"}
          </button>
        </section>

        {message && (
          <div className="admin-message">
            <span>{message}</span>

            <button
              onClick={() => setMessage("")}
              aria-label="Close message"
            >
              ×
            </button>
          </div>
        )}

        {/* =========================
            TABS
        ========================= */}

        <div className="admin-tabs">
          <button
            className={
              activeTab === "overview"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("overview")
            }
          >
            📊 Overview
          </button>

          <button
            className={
              activeTab === "users"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("users")
            }
          >
            👥 Users
          </button>

          <button
            className={
              activeTab === "tasks"
                ? "active"
                : ""
            }
            onClick={() =>
              setActiveTab("tasks")
            }
          >
            📋 Tasks
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner"></div>

            <p>
              Loading admin dashboard...
            </p>
          </div>
        ) : (
          <>
            {/* =========================
                OVERVIEW
            ========================= */}

            {activeTab === "overview" && (
              <>
                <section className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      👥
                    </div>

                    <div>
                      <span>Total Users</span>

                      <strong>
                        {stats.totalUsers}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      📋
                    </div>

                    <div>
                      <span>Total Tasks</span>

                      <strong>
                        {stats.totalTasks}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      ✅
                    </div>

                    <div>
                      <span>Completed</span>

                      <strong>
                        {stats.completedTasks}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      ⏳
                    </div>

                    <div>
                      <span>Pending</span>

                      <strong>
                        {stats.pendingTasks}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="admin-overview-grid">
                  <div className="admin-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Task Completion
                        </h2>

                        <p>
                          Overall task completion
                          rate
                        </p>
                      </div>

                      <strong className="completion-number">
                        {completionRate}%
                      </strong>
                    </div>

                    <div className="admin-progress">
                      <div
                        className="admin-progress-fill"
                        style={{
                          width: `${completionRate}%`,
                        }}
                      ></div>
                    </div>

                    <div className="completion-details">
                      <span>
                        Completed:{" "}
                        <strong>
                          {stats.completedTasks}
                        </strong>
                      </span>

                      <span>
                        Pending:{" "}
                        <strong>
                          {stats.pendingTasks}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="admin-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Priority Statistics
                        </h2>

                        <p>
                          Tasks by priority level
                        </p>
                      </div>
                    </div>

                    <div className="priority-list">
                      <div className="priority-row">
                        <span>
                          <i className="priority-dot high"></i>
                          High
                        </span>

                        <strong>
                          {stats.highPriorityTasks}
                        </strong>
                      </div>

                      <div className="priority-row">
                        <span>
                          <i className="priority-dot medium"></i>
                          Medium
                        </span>

                        <strong>
                          {stats.mediumPriorityTasks}
                        </strong>
                      </div>

                      <div className="priority-row">
                        <span>
                          <i className="priority-dot low"></i>
                          Low
                        </span>

                        <strong>
                          {stats.lowPriorityTasks}
                        </strong>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Tasks</h2>

                      <p>
                        Latest tasks created in
                        TaskFlow
                      </p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() =>
                        setActiveTab("tasks")
                      }
                    >
                      View All →
                    </button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="empty-admin">
                      <span>📋</span>

                      <p>
                        No tasks available.
                      </p>
                    </div>
                  ) : (
                    <div className="recent-task-list">
                      {tasks
                        .slice(0, 5)
                        .map((task) => (
                          <div
                            className="recent-task"
                            key={task._id}
                          >
                            <div>
                              <strong>
                                {task.title ||
                                  "Untitled Task"}
                              </strong>

                              <small>
                                Created by{" "}
                                {getUserName(
                                  task.user
                                ) ||
                                  getUserEmail(
                                    task.user
                                  ) ||
                                  "Deleted User"}
                              </small>
                            </div>

                            <div className="recent-task-right">
                              <span
                                className={`status-badge ${
                                  task.completed
                                    ? "completed"
                                    : "pending"
                                }`}
                              >
                                {task.completed
                                  ? "Completed"
                                  : "Pending"}
                              </span>

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
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* =========================
                USERS
            ========================= */}

            {activeTab === "users" && (
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>All Users</h2>

                    <p>
                      Manage registered TaskFlow
                      users.
                    </p>
                  </div>

                  <span className="count-badge">
                    {users.length} Users
                  </span>
                </div>

                {users.length === 0 ? (
                  <div className="empty-admin">
                    <span>👥</span>

                    <p>No users found.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Joined</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((person) => {
                          const isCurrentAdmin =
                            String(
                              person._id
                            ) ===
                            String(user?.id);

                          const personName =
                            getUserName(person);

                          const personEmail =
                            getUserEmail(person);

                          return (
                            <tr
                              key={person._id}
                            >
                              <td>
                                <div className="table-user">
                                  <div className="table-avatar">
                                    {getInitial(
                                      person,
                                      "U"
                                    )}
                                  </div>

                                  <div className="table-user-info">
                                    <strong>
                                      {personName ||
                                        personEmail ||
                                        "User"}
                                    </strong>

                                    {personName &&
                                      personEmail && (
                                        <small>
                                          {
                                            personEmail
                                          }
                                        </small>
                                      )}
                                  </div>
                                </div>
                              </td>

                              <td>
                                {personEmail ||
                                  "—"}
                              </td>

                              <td>
                                <span
                                  className={`role-badge ${
                                    person.role ===
                                    "admin"
                                      ? "admin-role"
                                      : "user-role"
                                  }`}
                                >
                                  {person.role ||
                                    "user"}
                                </span>
                              </td>

                              <td>
                                {person.createdAt
                                  ? new Date(
                                      person.createdAt
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              <td>
                                {isCurrentAdmin ? (
                                  <span className="self-label">
                                    Current Admin
                                  </span>
                                ) : (
                                  <button
                                    className="delete-btn"
                                    onClick={() =>
                                      deleteUser(
                                        person._id
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* =========================
                TASKS
            ========================= */}

            {activeTab === "tasks" && (
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>All Tasks</h2>

                    <p>
                      View and manage every task
                      in TaskFlow.
                    </p>
                  </div>

                  <div className="task-header-actions">
                    <span className="count-badge">
                      {tasks.length} Tasks
                    </span>

                    <button
                      className="admin-create-task-btn"
                      onClick={() =>
                        setShowCreateModal(true)
                      }
                    >
                      + Create & Assign Task
                    </button>
                  </div>
                </div>

                {tasks.length === 0 ? (
                  <div className="empty-admin">
                    <span>📋</span>

                    <p>No tasks found.</p>

                    <button
                      className="admin-create-task-btn"
                      onClick={() =>
                        setShowCreateModal(true)
                      }
                    >
                      + Create First Task
                    </button>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Created By</th>
                          <th>Assigned To</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {tasks.map((task) => {
                          const createdBy =
                            task.user;

                          const assignedTo =
                            task.assignedTo;

                          const createdByName =
                            getUserName(
                              createdBy
                            );

                          const createdByEmail =
                            getUserEmail(
                              createdBy
                            );

                          const assignedName =
                            getUserName(
                              assignedTo
                            );

                          const assignedEmail =
                            getUserEmail(
                              assignedTo
                            );

                          return (
                            <tr
                              key={task._id}
                            >
                              <td>
                                <div className="table-task">
                                  <strong>
                                    {task.title ||
                                      "Untitled Task"}
                                  </strong>

                                  <span className="task-category">
                                    {task.category ||
                                      "Other"}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <div className="task-person">
                                  {createdByName ? (
                                    <>
                                      <strong>
                                        {
                                          createdByName
                                        }
                                      </strong>

                                      {createdByEmail && (
                                        <small>
                                          {
                                            createdByEmail
                                          }
                                        </small>
                                      )}
                                    </>
                                  ) : (
                                    <strong>
                                      {createdByEmail ||
                                        "Deleted User"}
                                    </strong>
                                  )}
                                </div>
                              </td>

                              <td>
                                {assignedTo ? (
                                  <div className="task-person">
                                    {assignedName ? (
                                      <>
                                        <strong>
                                          {
                                            assignedName
                                          }
                                        </strong>

                                        {assignedEmail && (
                                          <small>
                                            {
                                              assignedEmail
                                            }
                                          </small>
                                        )}
                                      </>
                                    ) : (
                                      <strong>
                                        {assignedEmail ||
                                          "User"}
                                      </strong>
                                    )}
                                  </div>
                                ) : (
                                  <span className="no-assignee">
                                    No Assignee
                                  </span>
                                )}
                              </td>

                              <td>
                                <span
                                  className={`priority-badge ${String(
                                    task.priority ||
                                      "Medium"
                                  ).toLowerCase()}`}
                                >
                                  {task.priority ||
                                    "Medium"}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`status-badge ${
                                    task.completed
                                      ? "completed"
                                      : "pending"
                                  }`}
                                >
                                  {task.completed
                                    ? "Completed"
                                    : "Pending"}
                                </span>
                              </td>

                              <td>
                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    deleteTask(
                                      task._id
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* =========================
          CREATE TASK MODAL
      ========================= */}

      {showCreateModal && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !creatingTask
            ) {
              closeCreateModal();
            }
          }}
        >
          <div className="admin-create-modal">
            <div className="admin-modal-header">
              <div>
                <p className="admin-label">
                  ADMIN TASK
                </p>

                <h2>Create & Assign Task</h2>

                <p>
                  Create a task and assign it to a
                  TaskFlow user.
                </p>
              </div>

              <button
                className="admin-modal-close"
                onClick={closeCreateModal}
                disabled={creatingTask}
              >
                ×
              </button>
            </div>

            <form
              className="admin-task-form"
              onSubmit={createAdminTask}
            >
              <div className="admin-form-group">
                <label>
                  Task Title <span>*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleTaskInput}
                  placeholder="Enter task title"
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-group">
                <label>Description</label>

                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleTaskInput}
                  placeholder="Enter task description"
                  rows="4"
                ></textarea>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Category</label>

                  <select
                    name="category"
                    value={taskForm.category}
                    onChange={handleTaskInput}
                  >
                    <option value="Work">
                      Work
                    </option>

                    <option value="Study">
                      Study
                    </option>

                    <option value="Personal">
                      Personal
                    </option>

                    <option value="Shopping">
                      Shopping
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Priority</label>

                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskInput}
                  >
                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="High">
                      High
                    </option>
                  </select>
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Due Date</label>

                  <input
                    type="date"
                    name="dueDate"
                    value={taskForm.dueDate}
                    onChange={handleTaskInput}
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Assign To
                  </label>

                  <select
                    name="assignedTo"
                    value={taskForm.assignedTo}
                    onChange={handleTaskInput}
                  >
                    <option value="">
                      No Assignee
                    </option>

                    {users.map((person) => (
                      <option
                        key={person._id}
                        value={person._id}
                      >
                        {person.name
                          ? `${person.name} — ${person.email}`
                          : person.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="admin-assignment-note">
                <span>💡</span>

                <p>
                  The task will be created under your
                  admin account and assigned to the
                  selected user.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={closeCreateModal}
                  disabled={creatingTask}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={creatingTask}
                >
                  {creatingTask
                    ? "Creating..."
                    : "Create & Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="admin-footer">
        <p>
          © {new Date().getFullYear()} TaskFlow.
          Admin Control Panel.
        </p>
      </footer>
    </div>
  );
}

export default AdminDashboard;