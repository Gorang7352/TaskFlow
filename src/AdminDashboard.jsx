import { useEffect, useMemo, useState } from "react";

const ADMIN_API = "https://taskflow-odcc.onrender.com/api/admin";

function AdminDashboard({
  user,
  token,
  onLogout,
  onSwitchToUser,
}) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    assignedTasks: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0,
  });

  const [users, setUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const [creatingTask, setCreatingTask] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [removingUserId, setRemovingUserId] = useState("");

  const [addUserName, setAddUserName] = useState("");
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserMessage, setAddUserMessage] = useState("");

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    category: "Other",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
  });

  // =====================================================
  // TODAY DATE
  // =====================================================

  const getTodayString = () => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayString();

  // =====================================================
  // ROLE HELPERS
  // =====================================================

  const getRoles = (person) => {
    if (Array.isArray(person?.roles)) {
      return person.roles;
    }

    if (person?.role) {
      return [person.role];
    }

    return ["user"];
  };

  const isAdminUser = (person) => {
    return getRoles(person).some(
      (role) => String(role).toLowerCase() === "admin"
    );
  };

  // =====================================================
  // USER HELPERS
  // =====================================================

  const getUserId = (person) => {
    return person?._id || person?.id || "";
  };

  const getUserName = (person) => {
    if (!person) return "";

    return (
      person.name ||
      person.fullName ||
      person.username ||
      ""
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
      person?.email ||
      "";

    return name.charAt(0).toUpperCase() || fallback;
  };

  // =====================================================
  // API REQUEST
  // =====================================================

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
      throw new Error(
        data.message ||
          data.error ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  };

  // =====================================================
  // LOAD ADMIN DATA
  // =====================================================

  const loadAdminData = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setMessage("");

      const [
        statsData,
        usersData,
        availableUsersData,
        tasksData,
      ] = await Promise.all([
        request(`${ADMIN_API}/stats`),
        request(`${ADMIN_API}/users`),
        request(`${ADMIN_API}/available-users`),
        request(`${ADMIN_API}/tasks`),
      ]);

      const backendStats = statsData?.stats || {};

      const myUsers = Array.isArray(usersData?.users)
        ? usersData.users
        : [];

      const registeredUsers = Array.isArray(
        availableUsersData?.users
      )
        ? availableUsersData.users
        : [];

      const allTasks = Array.isArray(tasksData?.tasks)
        ? tasksData.tasks
        : [];

      const highPriorityTasks = allTasks.filter(
        (task) =>
          String(task?.priority || "").toLowerCase() === "high"
      ).length;

      const mediumPriorityTasks = allTasks.filter(
        (task) =>
          String(task?.priority || "").toLowerCase() === "medium"
      ).length;

      const lowPriorityTasks = allTasks.filter(
        (task) =>
          String(task?.priority || "").toLowerCase() === "low"
      ).length;

      const completedTasks = allTasks.filter(
        (task) => Boolean(task?.completed)
      ).length;

      const pendingTasks = allTasks.filter(
        (task) => !Boolean(task?.completed)
      ).length;

      const assignedTasks = allTasks.filter(
        (task) => Boolean(task?.assignedTo)
      ).length;

      setStats({
        totalUsers:
          backendStats.totalUsers ??
          myUsers.filter(
            (person) => !isAdminUser(person)
          ).length,

        totalAdmins:
          backendStats.totalAdmins ?? 0,

        totalTasks:
          backendStats.totalTasks ??
          allTasks.length,

        completedTasks:
          backendStats.completedTasks ??
          completedTasks,

        pendingTasks:
          backendStats.pendingTasks ??
          pendingTasks,

        assignedTasks:
          backendStats.assignedTasks ??
          assignedTasks,

        highPriorityTasks:
          backendStats.highPriorityTasks ??
          highPriorityTasks,

        mediumPriorityTasks:
          backendStats.mediumPriorityTasks ??
          mediumPriorityTasks,

        lowPriorityTasks:
          backendStats.lowPriorityTasks ??
          lowPriorityTasks,
      });

      setUsers(myUsers);
      setAvailableUsers(registeredUsers);
      setTasks(allTasks);
    } catch (error) {
      console.error(
        "Admin Dashboard Error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to load admin dashboard."
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

  // =====================================================
  // MY NORMAL USERS
  // =====================================================

  const normalUsers = useMemo(() => {
    const currentUserId = user?.id || user?._id;

    return users.filter((person) => {
      const personId = getUserId(person);

      if (
        currentUserId &&
        String(personId) === String(currentUserId)
      ) {
        return false;
      }

      if (isAdminUser(person)) {
        return false;
      }

      return true;
    });
  }, [users, user]);

  // =====================================================
  // REGISTERED NORMAL USERS
  // Used only for Add User
  // =====================================================

  const addableNormalUsers = useMemo(() => {
    const myUserIds = new Set(
      normalUsers.map((person) =>
        String(getUserId(person))
      )
    );

    return availableUsers.filter((person) => {
      const personId = getUserId(person);

      if (!personId) {
        return false;
      }

      if (isAdminUser(person)) {
        return false;
      }

      if (myUserIds.has(String(personId))) {
        return false;
      }

      return true;
    });
  }, [availableUsers, normalUsers]);

  // =====================================================
  // MESSAGE
  // =====================================================

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  // =====================================================
  // ADD USER MODAL
  // =====================================================

  const openAddUserModal = () => {
    setAddUserName("");
    setAddUserEmail("");
    setAddUserMessage("");
    setShowAddUserModal(true);
  };

  const closeAddUserModal = () => {
    if (addingUser) return;

    setShowAddUserModal(false);
    setAddUserName("");
    setAddUserEmail("");
    setAddUserMessage("");
  };

  // =====================================================
  // ADD USER
  // =====================================================

  const addUserToMyList = async (userId) => {
    if (!userId) {
      setAddUserMessage(
        "This email is not registered"
      );
      return;
    }

    try {
      setAddingUser(true);
      setAddUserMessage("");

      const data = await request(
        `${ADMIN_API}/users/${userId}/add`,
        {
          method: "POST",
        }
      );

      setShowAddUserModal(false);
      setAddUserName("");
      setAddUserEmail("");
      setAddUserMessage("");

      showMessage(
        data.message ||
          "User added successfully."
      );

      await loadAdminData();

      setActiveTab("users");
    } catch (error) {
      console.error(
        "Add User Error:",
        error
      );

      setAddUserMessage(
        error.message ||
          "Failed to add user."
      );
    } finally {
      setAddingUser(false);
    }
  };

  // =====================================================
  // CHECK NAME + EMAIL
  // =====================================================

  const handleCheckAndAddUser = async (event) => {
    event.preventDefault();

    const enteredName =
      addUserName.trim();

    const enteredEmail =
      addUserEmail.trim().toLowerCase();

    setAddUserMessage("");

    if (!enteredName) {
      setAddUserMessage(
        "Please enter the user's name."
      );
      return;
    }

    if (!enteredEmail) {
      setAddUserMessage(
        "Please enter the user's email."
      );
      return;
    }

    const matchedUser =
      addableNormalUsers.find((person) => {
        const personName =
          getUserName(person)
            .trim()
            .toLowerCase();

        const personEmail =
          getUserEmail(person)
            .trim()
            .toLowerCase();

        return (
          personName ===
            enteredName.toLowerCase() &&
          personEmail === enteredEmail
        );
      });

    if (!matchedUser) {
      setAddUserMessage(
        "This email is not registered"
      );
      return;
    }

    const alreadyAdded =
      normalUsers.some(
        (person) =>
          String(
            getUserId(person)
          ) ===
          String(
            getUserId(matchedUser)
          )
      );

    if (alreadyAdded) {
      setAddUserMessage(
        "This user is already in your user list."
      );
      return;
    }

    await addUserToMyList(
      getUserId(matchedUser)
    );
  };

  // =====================================================
  // REMOVE USER
  // =====================================================

  const removeUserFromMyList = async (id) => {
    const person = users.find(
      (item) =>
        String(getUserId(item)) ===
        String(id)
    );

    const personName =
      getUserName(person) ||
      getUserEmail(person) ||
      "this user";

    const confirmed = window.confirm(
      `Remove ${personName} from your user list?`
    );

    if (!confirmed) return;

    try {
      setRemovingUserId(String(id));
      setMessage("");

      const data = await request(
        `${ADMIN_API}/users/${id}/remove`,
        {
          method: "DELETE",
        }
      );

      showMessage(
        data.message ||
          "User removed from your list."
      );

      await loadAdminData();
    } catch (error) {
      console.error(
        "Remove User Error:",
        error
      );

      showMessage(
        error.message ||
          "Failed to remove user."
      );
    } finally {
      setRemovingUserId("");
    }
  };

  // =====================================================
  // TASK FORM
  // =====================================================

  const handleTaskInput = (event) => {
    const {
      name,
      value,
    } = event.target;

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

  // =====================================================
  // CREATE TASK MODAL
  // =====================================================

  const openCreateTaskModal = () => {
    resetTaskForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (creatingTask) return;

    setShowCreateModal(false);
    resetTaskForm();
  };

  // =====================================================
  // CREATE + ASSIGN TASK
  // =====================================================

  const createAdminTask = async (event) => {
    event.preventDefault();

    const title =
      taskForm.title.trim();

    if (!title) {
      showMessage(
        "Please enter a task title."
      );
      return;
    }

    if (!taskForm.assignedTo) {
      showMessage(
        "Please select a Normal User."
      );
      return;
    }

    // Past date validation
    if (
      taskForm.dueDate &&
      taskForm.dueDate < todayDate
    ) {
      showMessage(
        "Due date cannot be in the past."
      );
      return;
    }

    const selectedUser =
      normalUsers.find(
        (person) =>
          String(
            getUserId(person)
          ) ===
          String(
            taskForm.assignedTo
          )
      );

    if (!selectedUser) {
      showMessage(
        "You can only assign tasks to your own users."
      );
      return;
    }

    if (isAdminUser(selectedUser)) {
      showMessage(
        "Admin accounts cannot receive assigned tasks."
      );
      return;
    }

    try {
      setCreatingTask(true);
      setMessage("");

      const data = await request(
        `${ADMIN_API}/tasks`,
        {
          method: "POST",

          body: JSON.stringify({
            title,

            description:
              taskForm.description.trim(),

            category:
              taskForm.category,

            priority:
              taskForm.priority,

            dueDate:
              taskForm.dueDate || null,

            assignedTo:
              taskForm.assignedTo,
          }),
        }
      );

      setShowCreateModal(false);
      resetTaskForm();

      showMessage(
        data.message ||
          "Task created and assigned successfully."
      );

      await loadAdminData();

      setActiveTab("tasks");
    } catch (error) {
      console.error(
        "Create Admin Task Error:",
        error
      );

      showMessage(
        error.message ||
          "Failed to create and assign task."
      );
    } finally {
      setCreatingTask(false);
    }
  };

  // =====================================================
  // DELETE TASK
  // =====================================================

  const deleteTask = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      await request(
        `${ADMIN_API}/tasks/${id}`,
        {
          method: "DELETE",
        }
      );

      showMessage(
        "Task deleted successfully."
      );

      await loadAdminData();
    } catch (error) {
      console.error(
        "Delete Task Error:",
        error
      );

      showMessage(
        error.message ||
          "Failed to delete task."
      );
    }
  };

  // =====================================================
  // COMPLETION RATE
  // =====================================================

  const completionRate =
    stats.totalTasks > 0
      ? Math.round(
          (stats.completedTasks /
            stats.totalTasks) *
            100
        )
      : 0;

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleDateString();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="admin-page">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="admin-navbar">

        <div className="admin-brand">

          <div className="admin-logo">
            T
          </div>

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

              <small>
                {user?.email || ""}
              </small>
            </div>

          </div>

          <button
            className="admin-user-mode-btn"
            onClick={onSwitchToUser}
            title="Switch to User Mode"
          >
            👤 User Mode
          </button>

          <button
            className="admin-logout-btn"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="admin-container">

        <section className="admin-header">

          <div>

            <p className="admin-label">
              ADMINISTRATOR
            </p>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Manage your users, assign tasks
              and monitor your TaskFlow activity.
            </p>

          </div>

          <button
            className="admin-refresh-btn"
            onClick={loadAdminData}
            disabled={loading}
          >
            ↻{" "}
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>

        </section>

        {/* MESSAGE */}

        {message && (
          <div className="admin-message">

            <span>
              {message}
            </span>

            <button
              onClick={() =>
                setMessage("")
              }
              aria-label="Close message"
            >
              ×
            </button>

          </div>
        )}

        {/* =================================================
            TABS
        ================================================= */}

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
            👥 My Users
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

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="admin-loading">

            <div className="admin-spinner"></div>

            <p>
              Loading admin dashboard...
            </p>

          </div>
        ) : (
          <>

            {/* =================================================
                OVERVIEW
            ================================================= */}

            {activeTab === "overview" && (
              <>

                <section className="admin-stats-grid">

                  {/* MY USERS */}

                  <div className="admin-stat-card">

                    <div className="admin-stat-icon">
                      👥
                    </div>

                    <div>
                      <span>
                        My Users
                      </span>

                      <strong>
                        {normalUsers.length}
                      </strong>
                    </div>

                  </div>

                  {/* MY TASKS */}

                  <div className="admin-stat-card">

                    <div className="admin-stat-icon">
                      📋
                    </div>

                    <div>
                      <span>
                        My Tasks
                      </span>

                      <strong>
                        {stats.totalTasks}
                      </strong>
                    </div>

                  </div>

                  {/* PENDING */}

                  <div className="admin-stat-card">

                    <div className="admin-stat-icon">
                      ⏳
                    </div>

                    <div>
                      <span>
                        Pending
                      </span>

                      <strong>
                        {stats.pendingTasks}
                      </strong>
                    </div>

                  </div>

                </section>

                <section className="admin-overview-grid">

                  {/* COMPLETION */}

                  <div className="admin-panel">

                    <div className="panel-heading">

                      <div>
                        <h2>
                          Task Completion
                        </h2>

                        <p>
                          Your task completion rate
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
                          width:
                            `${completionRate}%`,
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

                  {/* PRIORITY */}

                  <div className="admin-panel">

                    <div className="panel-heading">

                      <div>
                        <h2>
                          Priority Statistics
                        </h2>

                        <p>
                          Your tasks by priority
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

                {/* RECENT TASKS */}

                <section className="admin-panel recent-panel">

                  <div className="panel-heading">

                    <div>

                      <h2>
                        Recent Tasks
                      </h2>

                      <p>
                        Latest tasks created by you
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

                      <span>
                        📋
                      </span>

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
                            key={
                              task._id ||
                              task.id
                            }
                          >

                            <div>

                              <strong>
                                {task.title ||
                                  "Untitled Task"}
                              </strong>

                              <small>
                                Assigned to{" "}
                                {getUserName(
                                  task.assignedTo
                                ) || "User"}
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

            {/* =================================================
                MY USERS
            ================================================= */}

            {activeTab === "users" && (
              <section className="admin-panel">

                <div className="panel-heading">

                  <div>

                    <h2>
                      My Users
                    </h2>

                    <p>
                      Manage the Normal Users
                      connected to your Admin account.
                    </p>

                  </div>

                  <div className="task-header-actions">

                    <span className="count-badge">
                      {normalUsers.length} Users
                    </span>

                    <button
                      className="admin-create-task-btn"
                      onClick={
                        openAddUserModal
                      }
                    >
                      + Add User
                    </button>

                  </div>

                </div>

                {normalUsers.length === 0 ? (
                  <div className="empty-admin">

                    <span>
                      👥
                    </span>

                    <p>
                      You don't have any users yet.
                    </p>

                    <button
                      className="admin-create-task-btn"
                      onClick={
                        openAddUserModal
                      }
                    >
                      + Add User
                    </button>

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

                        {normalUsers.map(
                          (person) => {

                            const personId =
                              getUserId(person);

                            const personName =
                              getUserName(
                                person
                              );

                            const personEmail =
                              getUserEmail(
                                person
                              );

                            return (
                              <tr
                                key={personId}
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
                                          "User"}
                                      </strong>

                                    </div>

                                  </div>

                                </td>

                                <td>
                                  {personEmail ||
                                    "—"}
                                </td>

                                <td>

                                  <span className="role-badge user-role">
                                    Normal User
                                  </span>

                                </td>

                                <td>
                                  {formatDate(
                                    person.createdAt
                                  )}
                                </td>

                                <td>

                                  <button
                                    className="delete-btn"
                                    disabled={
                                      removingUserId ===
                                      String(
                                        personId
                                      )
                                    }
                                    onClick={() =>
                                      removeUserFromMyList(
                                        personId
                                      )
                                    }
                                  >
                                    {removingUserId ===
                                    String(
                                      personId
                                    )
                                      ? "Removing..."
                                      : "Remove"}
                                  </button>

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </section>
            )}

            {/* =================================================
                TASKS
            ================================================= */}

            {activeTab === "tasks" && (
              <section className="admin-panel">

                <div className="panel-heading">

                  <div>

                    <h2>
                      My Tasks
                    </h2>

                    <p>
                      Tasks created and assigned
                      by your Admin account.
                    </p>

                  </div>

                  <div className="task-header-actions">

                    <span className="count-badge">
                      {tasks.length} Tasks
                    </span>

                    <button
                      className="admin-create-task-btn"
                      onClick={
                        openCreateTaskModal
                      }
                    >
                      + Create & Assign Task
                    </button>

                  </div>

                </div>

                {tasks.length === 0 ? (
                  <div className="empty-admin">

                    <span>
                      📋
                    </span>

                    <p>
                      No tasks found.
                    </p>

                    <button
                      className="admin-create-task-btn"
                      onClick={
                        openCreateTaskModal
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
                          <th>Due Date</th>
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

                          const assignedName =
                            getUserName(
                              assignedTo
                            );

                          return (
                            <tr
                              key={
                                task._id ||
                                task.id
                              }
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

                                  <strong>
                                    {createdByName ||
                                      "Admin"}
                                  </strong>

                                </div>

                              </td>

                              <td>

                                {assignedTo &&
                                assignedName ? (
                                  <div className="task-person">

                                    <strong>
                                      {assignedName}
                                    </strong>

                                  </div>
                                ) : null}

                              </td>

                              <td>
                                {formatDate(
                                  task.dueDate
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
                                      task._id ||
                                        task.id
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

      {/* =====================================================
          ADD USER MODAL
      ===================================================== */}

      {showAddUserModal && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
                event.currentTarget &&
              !addingUser
            ) {
              closeAddUserModal();
            }

          }}
        >

          <div className="admin-create-modal">

            <div className="admin-modal-header">

              <div>

                <p className="admin-label">
                  USER MANAGEMENT
                </p>

                <h2>
                  Add User
                </h2>

                <p>
                  Enter the registered Normal
                  User's name and email ID.
                </p>

              </div>

              <button
                className="admin-modal-close"
                onClick={
                  closeAddUserModal
                }
                disabled={addingUser}
              >
                ×
              </button>

            </div>

            <form
              className="admin-task-form"
              onSubmit={
                handleCheckAndAddUser
              }
            >

              {/* NAME */}

              <div className="admin-form-group">

                <label>
                  Name{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  value={addUserName}
                  onChange={(event) => {

                    setAddUserName(
                      event.target.value
                    );

                    setAddUserMessage("");

                  }}
                  placeholder="Enter user name"
                  required
                  autoFocus
                />

              </div>

              {/* EMAIL */}

              <div className="admin-form-group">

                <label>
                  Email ID{" "}
                  <span>*</span>
                </label>

                <input
                  type="email"
                  value={addUserEmail}
                  onChange={(event) => {

                    setAddUserEmail(
                      event.target.value
                    );

                    setAddUserMessage("");

                  }}
                  placeholder="Enter user email ID"
                  required
                />

              </div>

              {/* ERROR */}

              {addUserMessage && (
                <div
                  style={{
                    marginTop: "-4px",
                    marginBottom: "4px",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background:
                      "#fff1f2",
                    border:
                      "1px solid #fecdd3",
                    color:
                      "#be123c",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {addUserMessage}
                </div>
              )}

              {/* INFO */}

              <div className="admin-assignment-note">

                <span>
                  💡
                </span>

                <p>
                  Only registered Normal Users
                  can be added to your user list.
                </p>

              </div>

              {/* ACTIONS */}

              <div className="admin-modal-actions">

                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={
                    closeAddUserModal
                  }
                  disabled={addingUser}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={addingUser}
                >
                  {addingUser
                    ? "Checking..."
                    : "Check & Add User"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          CREATE TASK MODAL
      ===================================================== */}

      {showCreateModal && (
        <div
          className="admin-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
                event.currentTarget &&
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

                <h2>
                  Create & Assign Task
                </h2>

                <p>
                  Create a task and assign it
                  to one of your Normal Users.
                </p>

              </div>

              <button
                type="button"
                className="admin-modal-close"
                onClick={
                  closeCreateModal
                }
                disabled={creatingTask}
              >
                ×
              </button>

            </div>

            <form
              className="admin-task-form"
              onSubmit={
                createAdminTask
              }
            >

              {/* TITLE */}

              <div className="admin-form-group">

                <label>
                  Task Title{" "}
                  <span>*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    taskForm.title
                  }
                  onChange={
                    handleTaskInput
                  }
                  placeholder="Enter task title"
                  required
                  autoFocus
                />

              </div>

              {/* DESCRIPTION */}

              <div className="admin-form-group">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    taskForm.description
                  }
                  onChange={
                    handleTaskInput
                  }
                  placeholder="Enter task description"
                  rows="4"
                ></textarea>

              </div>

              {/* CATEGORY + PRIORITY */}

              <div className="admin-form-row">

                <div className="admin-form-group">

                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      taskForm.category
                    }
                    onChange={
                      handleTaskInput
                    }
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

                  <label>
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={
                      taskForm.priority
                    }
                    onChange={
                      handleTaskInput
                    }
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

              {/* DUE DATE + ASSIGN */}

              <div className="admin-form-row">

                <div className="admin-form-group">

                  <label>
                    Due Date
                  </label>

                  <input
                    type="date"
                    name="dueDate"
                    value={
                      taskForm.dueDate
                    }
                    min={todayDate}
                    onChange={
                      handleTaskInput
                    }
                  />

                  <small
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Today or a future date only
                  </small>

                </div>

                <div className="admin-form-group">

                  <label>
                    Assign To{" "}
                    <span>*</span>
                  </label>

                  <select
                    name="assignedTo"
                    value={
                      taskForm.assignedTo
                    }
                    onChange={
                      handleTaskInput
                    }
                    required
                  >

                    <option value="">
                      {normalUsers.length === 0
                        ? "Add User First"
                        : "Select My User"}
                    </option>

                    {normalUsers.map(
                      (person) => {

                        const personId =
                          getUserId(person);

                        return (
                          <option
                            key={personId}
                            value={personId}
                          >
                            {getUserName(
                              person
                            ) || "User"}
                          </option>
                        );
                      }
                    )}

                  </select>

                </div>

              </div>

              {/* INFO */}

              <div className="admin-assignment-note">

                <span>
                  💡
                </span>

                <p>
                  Tasks can be assigned only to
                  Normal Users in your user list.
                  {normalUsers.length === 0 &&
                    " Add a user first."}
                </p>

              </div>

              {/* ACTIONS */}

              <div className="admin-modal-actions">

                <button
                  type="button"
                  className="admin-cancel-btn"
                  onClick={
                    closeCreateModal
                  }
                  disabled={
                    creatingTask
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={
                    creatingTask ||
                    normalUsers.length === 0
                  }
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

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="admin-footer">

        <p>
          ©{" "}
          {new Date().getFullYear()}{" "}
          TaskFlow. Admin Control Panel.
        </p>

      </footer>

    </div>
  );
}

export default AdminDashboard;