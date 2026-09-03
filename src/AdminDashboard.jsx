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

      const [statsData, usersData, tasksData] = await Promise.all([
        request(`${ADMIN_API}/stats`),
        request(`${ADMIN_API}/users`),
        request(`${ADMIN_API}/tasks`),
      ]);

      setStats(statsData.stats || {});
      setUsers(usersData.users || []);
      setTasks(tasksData.tasks || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

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
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  };

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
      loadAdminData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const completionRate =
    stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <div className="admin-page">
      {/* ================= NAVBAR ================= */}

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
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div>
              <strong>{user?.name || "Admin"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>

          <button className="admin-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* ================= MAIN ================= */}

      <main className="admin-container">
        <section className="admin-header">
          <div>
            <p className="admin-label">ADMINISTRATOR</p>
            <h1>Admin Dashboard</h1>
            <p>
              Manage users, tasks and monitor overall TaskFlow activity.
            </p>
          </div>

          <button
            className="admin-refresh-btn"
            onClick={loadAdminData}
          >
            ↻ Refresh
          </button>
        </section>

        {message && (
          <div className="admin-message">
            <span>{message}</span>

            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {/* ================= TABS ================= */}

        <div className="admin-tabs">
          <button
            className={activeTab === "overview" ? "active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            📊 Overview
          </button>

          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>

          <button
            className={activeTab === "tasks" ? "active" : ""}
            onClick={() => setActiveTab("tasks")}
          >
            📋 Tasks
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner"></div>
            <p>Loading admin dashboard...</p>
          </div>
        ) : (
          <>
            {/* ================= OVERVIEW ================= */}

            {activeTab === "overview" && (
              <>
                <section className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">👥</div>
                    <div>
                      <span>Total Users</span>
                      <strong>{stats.totalUsers}</strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">📋</div>
                    <div>
                      <span>Total Tasks</span>
                      <strong>{stats.totalTasks}</strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">✅</div>
                    <div>
                      <span>Completed</span>
                      <strong>{stats.completedTasks}</strong>
                    </div>
                  </div>

                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">⏳</div>
                    <div>
                      <span>Pending</span>
                      <strong>{stats.pendingTasks}</strong>
                    </div>
                  </div>
                </section>

                <section className="admin-overview-grid">
                  <div className="admin-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Task Completion</h2>
                        <p>Overall task completion rate</p>
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
                        Completed: <strong>{stats.completedTasks}</strong>
                      </span>

                      <span>
                        Pending: <strong>{stats.pendingTasks}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="admin-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Priority Statistics</h2>
                        <p>Tasks by priority level</p>
                      </div>
                    </div>

                    <div className="priority-list">
                      <div className="priority-row">
                        <span>
                          <i className="priority-dot high"></i>
                          High
                        </span>

                        <strong>{stats.highPriorityTasks}</strong>
                      </div>

                      <div className="priority-row">
                        <span>
                          <i className="priority-dot medium"></i>
                          Medium
                        </span>

                        <strong>{stats.mediumPriorityTasks}</strong>
                      </div>

                      <div className="priority-row">
                        <span>
                          <i className="priority-dot low"></i>
                          Low
                        </span>

                        <strong>{stats.lowPriorityTasks}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="admin-panel recent-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Tasks</h2>
                      <p>Latest tasks created in TaskFlow</p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => setActiveTab("tasks")}
                    >
                      View All →
                    </button>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="empty-admin">
                      <span>📋</span>
                      <p>No tasks available.</p>
                    </div>
                  ) : (
                    <div className="recent-task-list">
                      {tasks.slice(0, 5).map((task) => (
                        <div className="recent-task" key={task._id}>
                          <div>
                            <strong>{task.title}</strong>

                            <small>
                              Created by{" "}
                              {task.user?.name ||
                                task.user?.email ||
                                "Unknown User"}
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
                                task.priority || "Medium"
                              ).toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {/* ================= USERS ================= */}

            {activeTab === "users" && (
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>All Users</h2>
                    <p>Manage registered TaskFlow users.</p>
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
                        {users.map((person) => (
                          <tr key={person._id}>
                            <td>
                              <div className="table-user">
                                <div className="table-avatar">
                                  {person.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </div>

                                <strong>
                                  {person.name || "Unknown"}
                                </strong>
                              </div>
                            </td>

                            <td>{person.email}</td>

                            <td>
                              <span
                                className={`role-badge ${
                                  person.role === "admin"
                                    ? "admin-role"
                                    : "user-role"
                                }`}
                              >
                                {person.role || "user"}
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
                              {person._id !== user?.id ? (
                                <button
                                  className="delete-btn"
                                  onClick={() =>
                                    deleteUser(person._id)
                                  }
                                >
                                  Delete
                                </button>
                              ) : (
                                <span className="self-label">
                                  Current Admin
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ================= TASKS ================= */}

            {activeTab === "tasks" && (
              <section className="admin-panel">
                <div className="panel-heading">
                  <div>
                    <h2>All Tasks</h2>
                    <p>View and manage every task in TaskFlow.</p>
                  </div>

                  <span className="count-badge">
                    {tasks.length} Tasks
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="empty-admin">
                    <span>📋</span>
                    <p>No tasks found.</p>
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
                        {tasks.map((task) => (
                          <tr key={task._id}>
                            <td>
                              <div className="table-task">
                                <strong>{task.title}</strong>

                                <small>
                                  {task.category || "Other"}
                                </small>
                              </div>
                            </td>

                            <td>
                              {task.user?.name ||
                                task.user?.email ||
                                "Unknown"}
                            </td>

                            <td>
                              {task.assignedTo?.name ||
                                task.assignedTo?.email ||
                                "No Assignee"}
                            </td>

                            <td>
                              <span
                                className={`priority-badge ${String(
                                  task.priority || "Medium"
                                ).toLowerCase()}`}
                              >
                                {task.priority || "Medium"}
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
                                  deleteTask(task._id)
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="admin-footer">
        <p>
          © {new Date().getFullYear()} TaskFlow. Admin Control
          Panel.
        </p>
      </footer>
    </div>
  );
}

export default AdminDashboard;