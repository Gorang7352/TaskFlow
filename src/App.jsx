import "./App.css";
import { useEffect, useMemo, useState } from "react";
import AdminDashboard from "./AdminDashboard";

const API = "https://taskflow-odcc.onrender.com/api/tasks";
const AUTH_API = "https://taskflow-odcc.onrender.com/api/auth";
const USERS_API =
  "https://taskflow-odcc.onrender.com/api/tasks/users/list";

const CATEGORIES = [
  "Work",
  "Study",
  "Personal",
  "Shopping",
  "Other",
];

const CATEGORY_ICONS = {
  Work: "💼",
  Study: "📚",
  Personal: "👤",
  Shopping: "🛒",
  Other: "📌",
};

function normalizeUser(rawUser) {
  if (!rawUser) return null;

  const roles = Array.isArray(rawUser.roles)
    ? rawUser.roles
    : String(rawUser.role || "").toLowerCase() === "admin"
    ? ["user", "admin"]
    : ["user"];

  return {
    ...rawUser,
    id: rawUser.id || rawUser._id,
    _id: rawUser._id || rawUser.id,
    roles: roles.includes("user")
      ? roles
      : ["user", ...roles],
  };
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("taskflowToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      const storedUser = JSON.parse(
        localStorage.getItem("taskflowUser")
      );

      return normalizeUser(storedUser);
    } catch {
      return null;
    }
  });

  /*
   * Admin account has two modes:
   * 1. Admin Mode
   * 2. User Mode
   *
   * Normal user only uses User Mode.
   */
  const [activeMode, setActiveMode] = useState(() => {
    const storedMode = localStorage.getItem(
      "taskflowActiveMode"
    );

    return storedMode === "admin" ? "admin" : "user";
  });

  const [authMode, setAuthMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    accountType: "user",
  });

  const [authLoading, setAuthLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Personal",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");

  const [editingTask, setEditingTask] = useState(null);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  /* ================= NOTIFICATIONS ================= */

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [seenNotifications, setSeenNotifications] = useState(
    () => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "taskflowSeenNotifications"
          ) || "[]"
        );
      } catch {
        return [];
      }
    }
  );

  /* ================= USER ROLES ================= */

  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : String(user?.role || "").toLowerCase() === "admin"
    ? ["user", "admin"]
    : ["user"];

  const isAdmin = userRoles.some(
    (role) => String(role).toLowerCase() === "admin"
  );

  /* ================= CLOSE NOTIFICATIONS ================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!showNotifications) return;

      if (
        !event.target.closest(".notification-wrapper")
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [showNotifications]);

  /* ================= MESSAGE ================= */

  const showMessage = (
    text,
    type = "success"
  ) => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  /* ================= SCROLL ================= */

  const scrollToSection = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  /* ================= MODE SWITCH ================= */

  const switchToUserMode = () => {
    setActiveMode("user");

    localStorage.setItem(
      "taskflowActiveMode",
      "user"
    );

    setShowNotifications(false);

    showMessage("Switched to User Mode.");
  };

  const switchToAdminMode = () => {
    if (!isAdmin) {
      showMessage(
        "Admin access is not available for this account.",
        "error"
      );
      return;
    }

    setActiveMode("admin");

    localStorage.setItem(
      "taskflowActiveMode",
      "admin"
    );

    showMessage("Switched to Admin Mode.");
  };

  /* ================= API REQUEST ================= */

  const request = async (
    url,
    options = {}
  ) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

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
        data.message || "Something went wrong"
      );
    }

    return data;
  };

  /* ================= AUTH ================= */

  const handleAuth = async (e) => {
    e.preventDefault();

    const email = authForm.email
      .trim()
      .toLowerCase();

    if (!email || !authForm.password) {
      showMessage(
        "Please enter email and password.",
        "error"
      );
      return;
    }

    if (
      authMode === "register" &&
      !authForm.name.trim()
    ) {
      showMessage(
        "Please enter your name.",
        "error"
      );
      return;
    }

    if (
      authMode === "register" &&
      !["user", "admin"].includes(
        authForm.accountType
      )
    ) {
      showMessage(
        "Please select an account type.",
        "error"
      );
      return;
    }

    setAuthLoading(true);

    try {
      /* ================= REGISTER ================= */

      if (authMode === "register") {
        const registerData = await request(
          `${AUTH_API}/register`,
          {
            method: "POST",

            body: JSON.stringify({
              name: authForm.name.trim(),
              email,
              password: authForm.password,
              accountType:
                authForm.accountType,
            }),
          }
        );

        showMessage(
          registerData.message ||
            "Account created successfully! Please login."
        );

        setAuthMode("login");

        setAuthForm({
          name: "",
          email,
          password: "",
          accountType: "user",
        });

        return;
      }

      /* ================= LOGIN ================= */

      const data = await request(
        `${AUTH_API}/login`,
        {
          method: "POST",

          body: JSON.stringify({
            email,
            password:
              authForm.password,
          }),
        }
      );

      const newToken =
        data.token || data.accessToken;

      if (!newToken) {
        throw new Error(
          "Token not received from server."
        );
      }

      const backendUser =
        data.user || {};

      const backendRoles =
        Array.isArray(backendUser.roles)
          ? backendUser.roles
          : [];

      const backendRole = String(
        backendUser.role || ""
      ).toLowerCase();

      const adminUser =
        backendRole === "admin" ||
        backendRoles.some(
          (role) =>
            String(role).toLowerCase() ===
            "admin"
        );

      const finalUser = normalizeUser({
        ...backendUser,

        id:
          backendUser.id ||
          backendUser._id,

        _id:
          backendUser._id ||
          backendUser.id,

        role: adminUser
          ? "admin"
          : "user",

        roles: adminUser
          ? ["user", "admin"]
          : ["user"],
      });

      localStorage.setItem(
        "taskflowToken",
        newToken
      );

      localStorage.setItem(
        "taskflowUser",
        JSON.stringify(finalUser)
      );

      /*
       * Admin login starts in Admin Mode.
       * Normal user starts in User Mode.
       */
      const initialMode = adminUser
        ? "admin"
        : "user";

      localStorage.setItem(
        "taskflowActiveMode",
        initialMode
      );

      setActiveMode(initialMode);

      setToken(newToken);
      setUser(finalUser);

      setAuthForm({
        name: "",
        email: "",
        password: "",
        accountType: "user",
      });

      showMessage(
        adminUser
          ? "Welcome Admin! Login successful."
          : "Welcome back! Login successful."
      );
    } catch (error) {
      console.error(
        "AUTH ERROR:",
        error
      );

      showMessage(
        error.message ||
          "Something went wrong.",
        "error"
      );
    } finally {
      setAuthLoading(false);
    }
  };

  /* ================= LOGOUT ================= */

  const logout = () => {
    localStorage.removeItem(
      "taskflowToken"
    );

    localStorage.removeItem(
      "taskflowUser"
    );

    localStorage.removeItem(
      "taskflowActiveMode"
    );

    setToken("");
    setUser(null);
    setTasks([]);
    setUsers([]);
    setShowNotifications(false);
    setActiveMode("user");

    showMessage(
      "You have been logged out."
    );
  };

  /* ================= FETCH TASKS ================= */

  const fetchTasks = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const data = await request(API);

      const receivedTasks =
        Array.isArray(data)
          ? data
          : Array.isArray(data.tasks)
          ? data.tasks
          : [];

      setTasks(receivedTasks);
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    if (!token) return;

    try {
      const data = await request(
        USERS_API
      );

      const receivedUsers =
        Array.isArray(data)
          ? data
          : Array.isArray(data.users)
          ? data.users
          : [];

      setUsers(receivedUsers);
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  };

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchUsers();
    }
  }, [token]);

  /* ================= USER NAME ================= */

  const getUserName = (person) => {
    if (!person) {
      return "Unknown User";
    }

    return (
      person.name ||
      person.fullName ||
      person.username ||
      person.email ||
      "Unknown User"
    );
  };

  const getAssignedUser = (task) => {
    if (!task?.assignedTo) {
      return null;
    }

    if (
      typeof task.assignedTo ===
      "object"
    ) {
      return task.assignedTo;
    }

    return (
      users.find(
        (person) =>
          String(person._id) ===
          String(task.assignedTo)
      ) || null
    );
  };

  const getCreatedByUser = (task) => {
    if (!task?.user) {
      return null;
    }

    if (
      typeof task.user === "object"
    ) {
      return task.user;
    }

    return (
      users.find(
        (person) =>
          String(person._id) ===
          String(task.user)
      ) || null
    );
  };

  /* ================= DATE ================= */

  const getTodayInputDate = () => {
    const today = new Date();

    const year =
      today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getAssignedDate = (task) =>
    task?.assignedTo
      ? task.assignedAt ||
        task.createdAt ||
        null
      : null;

  const formatAssignedDate = (
    date
  ) => {
    if (!date) return null;

    const d = new Date(date);

    if (
      Number.isNaN(d.getTime())
    ) {
      return null;
    }

    return `${String(
      d.getDate()
    ).padStart(2, "0")}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const isTaskOwner = (task) => {
    const currentUserId = String(
      user?._id ||
        user?.id ||
        ""
    );

    const taskOwnerId = String(
      task?.user?._id ||
        task?.user?.id ||
        task?.user ||
        ""
    );

    return (
      currentUserId !== "" &&
      taskOwnerId !== "" &&
      currentUserId === taskOwnerId
    );
  };

  /* ================= ASSIGNED TASK NOTIFICATIONS ================= */

  const assignedTasks = useMemo(() => {
    if (!user || !tasks.length) {
      return [];
    }

    return tasks.filter((task) => {
      if (
        !task.assignedTo ||
        task.completed
      ) {
        return false;
      }

      if (
        typeof task.assignedTo ===
        "object"
      ) {
        return (
          String(
            task.assignedTo?._id
          ) ===
            String(user?._id) ||
          String(
            task.assignedTo?.id
          ) ===
            String(user?.id) ||
          String(
            task.assignedTo?.email ||
              ""
          ).toLowerCase() ===
            String(
              user?.email || ""
            ).toLowerCase()
        );
      }

      return (
        String(task.assignedTo) ===
          String(user?._id) ||
        String(task.assignedTo) ===
          String(user?.id)
      );
    });
  }, [tasks, user]);

  const unreadNotifications =
    useMemo(() => {
      return assignedTasks.filter(
        (task) =>
          !seenNotifications.includes(
            task._id
          )
      );
    }, [
      assignedTasks,
      seenNotifications,
    ]);

  const markNotificationSeen = (
    taskId
  ) => {
    const updated = [
      ...new Set([
        ...seenNotifications,
        taskId,
      ]),
    ];

    setSeenNotifications(updated);

    localStorage.setItem(
      "taskflowSeenNotifications",
      JSON.stringify(updated)
    );
  };

  const markAllNotificationsSeen =
    () => {
      const allIds =
        assignedTasks.map(
          (task) => task._id
        );

      setSeenNotifications(allIds);

      localStorage.setItem(
        "taskflowSeenNotifications",
        JSON.stringify(allIds)
      );
    };

  const openNotificationTask = (
    task
  ) => {
    markNotificationSeen(
      task._id
    );

    setViewingTask(task);
    setShowNotifications(false);
  };

  /* ================= CREATE ================= */

  const handleCreateTask = async (
    e
  ) => {
    e.preventDefault();

    if (!form.title.trim()) {
      showMessage(
        "Please enter a task title.",
        "error"
      );
      return;
    }

    if (
      form.dueDate &&
      form.dueDate <
        getTodayInputDate()
    ) {
      showMessage(
        "Due date cannot be in the past. Please select today or a future date.",
        "error"
      );
      return;
    }

    try {
      const data = await request(
        API,
        {
          method: "POST",

          body: JSON.stringify({
            title:
              form.title.trim(),

            description:
              form.description.trim(),

            category:
              form.category,

            priority:
              form.priority,

            dueDate:
              form.dueDate ||
              null,

            completed: false,

            assignedTo:
              isAdmin &&
              activeMode === "admin"
                ? form.assignedTo ||
                  null
                : null,
          }),
        }
      );

      const newTask =
        data.task || data;

      setTasks((prev) => [
        newTask,
        ...prev,
      ]);

      setForm({
        title: "",
        description: "",
        category: "Personal",
        priority: "Medium",
        dueDate: "",
        assignedTo: "",
      });

      showMessage(
        isAdmin &&
          activeMode === "admin" &&
          form.assignedTo
          ? "Task created and assigned successfully!"
          : "Task added successfully!"
      );

      setTimeout(() => {
        scrollToSection(
          "tasks-section"
        );
      }, 300);
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  };

  /* ================= COMPLETE ================= */

  const toggleComplete = async (
    task
  ) => {
    try {
      const data = await request(
        `${API}/${task._id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            title: task.title,

            description:
              task.description ||
              "",

            category:
              task.category ||
              "Other",

            priority:
              task.priority ||
              "Medium",

            dueDate:
              task.dueDate ||
              null,

            completed:
              !task.completed,

            assignedTo:
              typeof task.assignedTo ===
              "object"
                ? task.assignedTo?._id ||
                  null
                : task.assignedTo ||
                  null,
          }),
        }
      );

      const updatedTask =
        data.task || data;

      setTasks((prev) =>
        prev.map((item) =>
          item._id === task._id
            ? updatedTask
            : item
        )
      );

      showMessage(
        !task.completed
          ? "Task completed successfully!"
          : "Task marked as pending."
      );
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  };

  /* ================= EDIT ================= */

  const openEdit = (task) => {
    setEditingTask({
      ...task,

      category:
        task.category || "Other",

      priority:
        task.priority || "Medium",

      dueDate: task.dueDate
        ? String(
            task.dueDate
          ).slice(0, 10)
        : "",

      _originalDueDate:
        task.dueDate
          ? String(
              task.dueDate
            ).slice(0, 10)
          : "",

      assignedTo:
        typeof task.assignedTo ===
        "object"
          ? task.assignedTo?._id ||
            ""
          : task.assignedTo ||
            "",
    });
  };

  const updateTask = async (
    e
  ) => {
    e.preventDefault();

    if (
      !editingTask.title.trim()
    ) {
      showMessage(
        "Task title cannot be empty.",
        "error"
      );
      return;
    }

    const selectedDueDate =
      editingTask.dueDate || "";

    const originalDueDate =
      editingTask._originalDueDate ||
      "";

    if (
      selectedDueDate &&
      selectedDueDate <
        getTodayInputDate() &&
      selectedDueDate !==
        originalDueDate
    ) {
      showMessage(
        "Due date cannot be in the past. Please select today or a future date.",
        "error"
      );
      return;
    }

    try {
      const data = await request(
        `${API}/${editingTask._id}`,
        {
          method: "PUT",

          body: JSON.stringify({
            title:
              editingTask.title.trim(),

            description:
              editingTask.description ||
              "",

            category:
              editingTask.category ||
              "Other",

            priority:
              editingTask.priority ||
              "Medium",

            dueDate:
              editingTask.dueDate ||
              null,

            completed:
              !!editingTask.completed,

            assignedTo:
              editingTask.assignedTo ||
              null,
          }),
        }
      );

      const updatedTask =
        data.task || data;

      setTasks((prev) =>
        prev.map((item) =>
          item._id ===
          editingTask._id
            ? updatedTask
            : item
        )
      );

      setEditingTask(null);

      showMessage(
        "Task updated successfully!"
      );
    } catch (error) {
      showMessage(
        error.message,
        "error"
      );
    }
  };

  /* ================= DELETE ================= */

  const askDeleteTask = (
    task
  ) => {
    if (!isTaskOwner(task)) {
      showMessage(
        "You cannot delete this task. Only the task you created yourself can be deleted.",
        "error"
      );

      return;
    }

    setDeleteTaskInfo(task);
  };

  const cancelDelete = () => {
    setDeleteTaskInfo(null);
  };

  const confirmDelete =
    async () => {
      if (!deleteTaskInfo) {
        return;
      }

      if (
        !isTaskOwner(
          deleteTaskInfo
        )
      ) {
        setDeleteTaskInfo(null);

        showMessage(
          "You cannot delete this task. Only the task you created yourself can be deleted.",
          "error"
        );

        return;
      }

      try {
        await request(
          `${API}/${deleteTaskInfo._id}`,
          {
            method: "DELETE",
          }
        );

        setTasks((prev) =>
          prev.filter(
            (item) =>
              item._id !==
              deleteTaskInfo._id
          )
        );

        setDeleteTaskInfo(null);

        showMessage(
          "Task deleted successfully!"
        );
      } catch (error) {
        showMessage(
          error.message,
          "error"
        );
      }
    };

  /* ================= DATE ================= */

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "No due date";
    }

    const d = new Date(date);

    if (
      Number.isNaN(d.getTime())
    ) {
      return "No due date";
    }

    return d.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const isOverdue = (
    task
  ) => {
    if (
      !task.dueDate ||
      task.completed
    ) {
      return false;
    }

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const due = new Date(
      task.dueDate
    );

    due.setHours(
      0,
      0,
      0,
      0
    );

    return due < today;
  };

  const isToday = (
    task
  ) => {
    if (!task.dueDate) {
      return false;
    }

    const today = new Date();
    const due = new Date(
      task.dueDate
    );

    return (
      today.getFullYear() ===
        due.getFullYear() &&
      today.getMonth() ===
        due.getMonth() &&
      today.getDate() ===
        due.getDate()
    );
  };

  /* ================= FILTER ================= */

  const filteredTasks =
    useMemo(() => {
      let result = [...tasks];

      if (search.trim()) {
        const q =
          search.toLowerCase();

        result = result.filter(
          (task) =>
            `${task.title || ""} ${
              task.description || ""
            } ${
              task.category || ""
            } ${
              getUserName(
                getAssignedUser(
                  task
                )
              ) || ""
            }`
              .toLowerCase()
              .includes(q)
        );
      }

      if (
        categoryFilter !==
        "All"
      ) {
        result =
          result.filter(
            (task) =>
              (task.category ||
                "Other") ===
              categoryFilter
          );
      }

      if (
        priorityFilter !==
        "All"
      ) {
        result =
          result.filter(
            (task) =>
              (task.priority ||
                "Medium") ===
              priorityFilter
          );
      }

      if (
        statusFilter ===
        "Pending"
      ) {
        result =
          result.filter(
            (task) =>
              !task.completed
          );
      }

      if (
        statusFilter ===
        "Completed"
      ) {
        result =
          result.filter(
            (task) =>
              task.completed
          );
      }

      if (
        statusFilter ===
        "Overdue"
      ) {
        result =
          result.filter(
            (task) =>
              isOverdue(task)
          );
      }

      const priorityValue = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      result.sort((a, b) => {
        if (
          sortBy ===
          "Newest"
        ) {
          return (
            new Date(
              b.createdAt || 0
            ) -
            new Date(
              a.createdAt || 0
            )
          );
        }

        if (
          sortBy ===
          "Oldest"
        ) {
          return (
            new Date(
              a.createdAt || 0
            ) -
            new Date(
              b.createdAt || 0
            )
          );
        }

        if (
          sortBy ===
          "Priority High"
        ) {
          return (
            (priorityValue[
              b.priority
            ] || 2) -
            (priorityValue[
              a.priority
            ] || 2)
          );
        }

        if (
          sortBy ===
          "Priority Low"
        ) {
          return (
            (priorityValue[
              a.priority
            ] || 2) -
            (priorityValue[
              b.priority
            ] || 2)
          );
        }

        if (
          sortBy ===
          "Due Date"
        ) {
          return (
            new Date(
              a.dueDate ||
                "9999-12-31"
            ) -
            new Date(
              b.dueDate ||
                "9999-12-31"
            )
          );
        }

        return 0;
      });

      return result;
    }, [
      tasks,
      users,
      search,
      categoryFilter,
      priorityFilter,
      statusFilter,
      sortBy,
    ]);

  /* ================= STATS ================= */

  const completedTasks =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  const pendingTasks =
    tasks.filter(
      (task) =>
        !task.completed
    ).length;

  const todayTasks =
    tasks.filter(
      isToday
    ).length;

  const overdueTasks =
    tasks.filter(
      isOverdue
    ).length;

  const highPriorityTasks =
    tasks.filter(
      (task) =>
        !task.completed &&
        (task.priority ||
          "Medium") ===
          "High"
    ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedTasks /
            tasks.length) *
            100
        );

  const categoryStats =
    CATEGORIES.reduce(
      (acc, category) => {
        acc[category] =
          tasks.filter(
            (task) =>
              (task.category ||
                "Other") ===
              category
          ).length;

        return acc;
      },
      {}
    );

  const priorityStats = {
    High: tasks.filter(
      (task) =>
        (task.priority ||
          "Medium") ===
        "High"
    ).length,

    Medium: tasks.filter(
      (task) =>
        (task.priority ||
          "Medium") ===
        "Medium"
    ).length,

    Low: tasks.filter(
      (task) =>
        (task.priority ||
          "Medium") ===
        "Low"
    ).length,
  };

  const pendingByPriority = {
    High: tasks.filter(
      (task) =>
        !task.completed &&
        (task.priority ||
          "Medium") ===
          "High"
    ).length,

    Medium: tasks.filter(
      (task) =>
        !task.completed &&
        (task.priority ||
          "Medium") ===
          "Medium"
    ).length,

    Low: tasks.filter(
      (task) =>
        !task.completed &&
        (task.priority ||
          "Medium") ===
          "Low"
    ).length,
  };

  const maxCategoryCount =
    Math.max(
      ...Object.values(
        categoryStats
      ),
      1
    );

  const maxPriorityCount =
    Math.max(
      ...Object.values(
        priorityStats
      ),
      1
    );

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    (user?.email
      ? user.email
          .split("@")[0]
          .replace(
            /[._-]/g,
            " "
          )
          .replace(
            /\b\w/g,
            (char) =>
              char.toUpperCase()
          )
      : "User");

  /* =========================================================
     ADMIN MODE
     ========================================================= */

  if (
    isAdmin &&
    activeMode === "admin"
  ) {
    return (
      <div className="admin-mode-wrapper">
        <AdminDashboard
          user={user}
          token={token}
          onLogout={logout}
          onSwitchToUser={
            switchToUserMode
          }
        />
      </div>
    );
  }

  /* ================= AUTH SCREEN ================= */

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <div className="brand-mark">
            ✓
          </div>

          <span>
            TaskFlow
          </span>
        </div>

        <div className="auth-card">
          <div className="auth-icon">
            ✓
          </div>

          <h1>
            {authMode ===
            "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>
            {authMode ===
            "login"
              ? "Login to manage your tasks and stay productive."
              : "Start organizing your work with TaskFlow."}
          </p>

          <form
            className="auth-form"
            onSubmit={
              handleAuth
            }
          >
            {authMode ===
              "register" && (
              <>
                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={
                    authForm.name
                  }
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target
                        .value,
                    })
                  }
                />

                <label>
                  Account Type
                </label>

                <select
                  value={
                    authForm.accountType
                  }
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      accountType:
                        e.target
                          .value,
                    })
                  }
                >
                  <option value="user">
                    User
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>
              </>
            )}

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              value={
                authForm.email
              }
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  email: e.target
                    .value,
                })
              }
            />

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={
                authForm.password
              }
              onChange={(e) =>
                setAuthForm({
                  ...authForm,
                  password:
                    e.target.value,
                })
              }
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={
                authLoading
              }
            >
              {authLoading
                ? "Please wait..."
                : authMode ===
                  "login"
                ? "Login to TaskFlow"
                : "Create Account"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode ===
            "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button
              type="button"
              onClick={() =>
                setAuthMode(
                  authMode ===
                    "login"
                    ? "register"
                    : "login"
                )
              }
            >
              {authMode ===
              "login"
                ? "Create one"
                : "Login"}
            </button>
          </div>
        </div>

        <div className="auth-footer">
          © 2026 TaskFlow •
          Simple • Focused •
          Productive
        </div>
      </div>
    );
  }

  /* ================= MAIN USER MODE ================= */

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-mark">
              ✓
            </div>

            <span>
              TaskFlow
            </span>
          </div>

          <nav className="top-navigation">
            <button
              onClick={() =>
                scrollToSection(
                  "dashboard-section"
                )
              }
            >
              Dashboard
            </button>

            <button
              onClick={() =>
                scrollToSection(
                  "analytics-section"
                )
              }
            >
              Analytics
            </button>

            <button
              onClick={() =>
                scrollToSection(
                  "tasks-section"
                )
              }
            >
              My Tasks
            </button>
          </nav>

          <div className="header-right">
            {/* ADMIN MODE BUTTON */}

            {isAdmin && (
              <button
                className="logout-btn"
                onClick={
                  switchToAdminMode
                }
                type="button"
              >
                Admin Mode
              </button>
            )}

            {/* NOTIFICATIONS */}

            <div className="notification-wrapper">
              <button
                className={`notification-btn ${
                  showNotifications
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setShowNotifications(
                    (prev) =>
                      !prev
                  )
                }
                aria-label="Notifications"
                title="Notifications"
              >
                <span className="notification-bell">
                  🔔
                </span>

                {unreadNotifications.length >
                  0 && (
                  <span className="notification-count">
                    {unreadNotifications.length >
                    99
                      ? "99+"
                      : unreadNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div
                    className="notification-backdrop"
                    onClick={() =>
                      setShowNotifications(
                        false
                      )
                    }
                  />

                  <div className="notification-panel">
                    <div className="notification-header">
                      <div>
                        <strong>
                          Notifications
                        </strong>

                        <span>
                          {unreadNotifications.length >
                          0
                            ? `${unreadNotifications.length} unread`
                            : "You're all caught up"}
                        </span>
                      </div>

                      {assignedTasks.length >
                        0 && (
                        <button
                          className="mark-all-btn"
                          onClick={
                            markAllNotificationsSeen
                          }
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="notification-list">
                      {assignedTasks.length ===
                      0 ? (
                        <div className="notification-empty">
                          <div className="notification-empty-icon">
                            🔔
                          </div>

                          <h3>
                            No notifications
                          </h3>

                          <p>
                            You don't have
                            any assigned
                            tasks right now.
                          </p>
                        </div>
                      ) : (
                        assignedTasks
                          .slice()
                          .reverse()
                          .map(
                            (
                              task
                            ) => {
                              const assignedBy =
                                getCreatedByUser(
                                  task
                                );

                              const isUnread =
                                !seenNotifications.includes(
                                  task._id
                                );

                              return (
                                <button
                                  key={
                                    task._id
                                  }
                                  className={`notification-item ${
                                    isUnread
                                      ? "unread"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    openNotificationTask(
                                      task
                                    )
                                  }
                                >
                                  <div className="notification-item-icon">
                                    📋
                                  </div>

                                  <div className="notification-item-content">
                                    <div className="notification-item-top">
                                      <strong>
                                        {isUnread
                                          ? "New Task Assigned"
                                          : "Assigned Task"}
                                      </strong>

                                      {isUnread && (
                                        <span className="notification-dot" />
                                      )}
                                    </div>

                                    <h4>
                                      {
                                        task.title
                                      }
                                    </h4>

                                    <p>
                                      {assignedBy
                                        ? `Assigned by ${getUserName(
                                            assignedBy
                                          )}`
                                        : "A task has been assigned to you"}
                                    </p>

                                    <div className="notification-meta">
                                      <span>
                                        {
                                          CATEGORY_ICONS[
                                            task.category ||
                                              "Other"
                                          ]
                                        }{" "}
                                        {task.category ||
                                          "Other"}
                                      </span>

                                      {task.dueDate && (
                                        <span>
                                          📅{" "}
                                          {formatDate(
                                            task.dueDate
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    <span className="notification-view">
                                      View Task →
                                    </span>
                                  </div>
                                </button>
                              );
                            }
                          )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="welcome-user">
              Hi, {displayName} 👋
            </div>

            <div className="user-email">
              {user?.email ||
                "User"}
            </div>

            <button
              className="logout-btn"
              onClick={
                logout
              }
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* ================= DASHBOARD ================= */}

        <section
          className="welcome-section"
          id="dashboard-section"
        >
          <div>
            <span className="welcome-label">
              YOUR PERSONAL
              WORKSPACE
            </span>

            <h1>
              Good to see you{" "}
              <span className="wave">
                👋
              </span>
            </h1>

            <p>
              Stay organized and
              make progress one
              task at a time.
            </p>
          </div>
        </section>

        {/* ================= QUICK ACTIONS ================= */}

        <section className="quick-actions-section">
          <div className="quick-actions-header">
            <div>
              <span className="section-kicker">
                QUICK ACTIONS
              </span>

              <h2>
                What would you like
                to do?
              </h2>

              <p>
                Jump directly to the
                most important parts
                of your workspace.
              </p>
            </div>
          </div>

          <div className="quick-actions-grid">
            <button
              className="quick-action-card primary-action"
              onClick={() =>
                scrollToSection(
                  "create-task-section"
                )
              }
            >
              <div className="quick-action-icon">
                ＋
              </div>

              <div>
                <strong>
                  Create New Task
                </strong>

                <span>
                  Add a new task to
                  your workspace
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-action-card"
              onClick={() =>
                scrollToSection(
                  "analytics-section"
                )
              }
            >
              <div className="quick-action-icon">
                📊
              </div>

              <div>
                <strong>
                  View Analytics
                </strong>

                <span>
                  Check your
                  productivity insights
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-action-card"
              onClick={() =>
                scrollToSection(
                  "tasks-section"
                )
              }
            >
              <div className="quick-action-icon">
                📋
              </div>

              <div>
                <strong>
                  Manage Tasks
                </strong>

                <span>
                  Search, edit and
                  organize tasks
                </span>
              </div>

              <b>→</b>
            </button>

            <button
              className="quick-action-card"
              onClick={
                fetchTasks
              }
              disabled={
                loading
              }
            >
              <div className="quick-action-icon">
                ↻
              </div>

              <div>
                <strong>
                  {loading
                    ? "Refreshing..."
                    : "Refresh Tasks"}
                </strong>

                <span>
                  Load your latest
                  task data
                </span>
              </div>

              <b>→</b>
            </button>
          </div>
        </section>

        {/* ================= STATS ================= */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              📅
            </div>

            <div className="stat-content">
              <span>
                Today's Tasks
              </span>

              <strong>
                {todayTasks}
              </strong>

              <small>
                Tasks due today
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red">
              ⚠️
            </div>

            <div className="stat-content">
              <span>
                Overdue
              </span>

              <strong>
                {overdueTasks}
              </strong>

              <small>
                Unfinished past
                deadlines
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              🔥
            </div>

            <div className="stat-content">
              <span>
                High Priority
              </span>

              <strong>
                {highPriorityTasks}
              </strong>

              <small>
                Important tasks
              </small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              ✓
            </div>

            <div className="stat-content">
              <span>
                Completion Rate
              </span>

              <strong>
                {progress}%
              </strong>

              <small>
                Overall productivity
              </small>
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

              <h2>
                Overall Progress
              </h2>

              <p>
                {progress ===
                100
                  ? "Excellent work — everything is completed!"
                  : "Keep going — you're making progress!"}
              </p>
            </div>

            <div className="progress-number">
              <strong>
                {completedTasks}
              </strong>

              <span>
                of {tasks.length}{" "}
                completed
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
            <span>
              {progress}% complete
            </span>

            <span>
              {pendingTasks}{" "}
              pending
            </span>
          </div>
        </section>

        {/* ================= ANALYTICS ================= */}

        <section
          className="analytics-section"
          id="analytics-section"
        >
          <div className="section-title-row">
            <div>
              <div className="section-kicker">
                INSIGHTS
              </div>

              <h2>
                Task Analytics
              </h2>

              <p>
                Understand your
                workload and task
                distribution at a
                glance.
              </p>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <span className="analytics-label">
                    CATEGORY
                    DISTRIBUTION
                  </span>

                  <h3>
                    Tasks by Category
                  </h3>
                </div>

                <span className="analytics-total">
                  {tasks.length}
                </span>
              </div>

              <div className="analytics-bars">
                {CATEGORIES.map(
                  (category) => {
                    const count =
                      categoryStats[
                        category
                      ] || 0;

                    const percentage =
                      tasks.length ===
                      0
                        ? 0
                        : Math.round(
                            (count /
                              tasks.length) *
                              100
                          );

                    return (
                      <div
                        className="analytics-bar-row"
                        key={
                          category
                        }
                      >
                        <div className="analytics-bar-info">
                          <span>
                            {
                              CATEGORY_ICONS[
                                category
                              ]
                            }{" "}
                            {category}
                          </span>

                          <strong>
                            {count}{" "}
                            <small>
                              ({percentage}
                              %)
                            </small>
                          </strong>
                        </div>

                        <div className="analytics-track">
                          <div
                            className="analytics-fill"
                            style={{
                              width: `${
                                (count /
                                  maxCategoryCount) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <div>
                  <span className="analytics-label">
                    PRIORITY
                    BREAKDOWN
                  </span>

                  <h3>
                    Tasks by Priority
                  </h3>
                </div>

                <span className="analytics-total">
                  {tasks.length}
                </span>
              </div>

              <div className="priority-analytics">
                {[
                  "High",
                  "Medium",
                  "Low",
                ].map(
                  (priority) => {
                    const count =
                      priorityStats[
                        priority
                      ];

                    const pending =
                      pendingByPriority[
                        priority
                      ];

                    const percentage =
                      tasks.length ===
                      0
                        ? 0
                        : Math.round(
                            (count /
                              tasks.length) *
                              100
                          );

                    return (
                      <div
                        className="priority-analytics-row"
                        key={
                          priority
                        }
                      >
                        <div
                          className={`priority-dot ${priority.toLowerCase()}`}
                        />

                        <div className="priority-main">
                          <div>
                            <strong>
                              {
                                priority
                              }
                            </strong>

                            <span>
                              {pending}{" "}
                              pending
                            </span>
                          </div>

                          <div className="priority-count">
                            {count}
                          </div>
                        </div>

                        <div className="priority-mini-track">
                          <div
                            className={`priority-mini-fill ${priority.toLowerCase()}`}
                            style={{
                              width: `${
                                (count /
                                  maxPriorityCount) *
                                100
                              }%`,
                            }}
                          />
                        </div>

                        <small>
                          {
                            percentage
                          }
                          %
                        </small>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          <div className="analytics-summary">
            <div>
              <span>
                📊 Total Tasks
              </span>

              <strong>
                {tasks.length}
              </strong>
            </div>

            <div>
              <span>
                ✅ Completed
              </span>

              <strong>
                {completedTasks}
              </strong>
            </div>

            <div>
              <span>
                ⏳ Pending
              </span>

              <strong>
                {pendingTasks}
              </strong>
            </div>

            <div>
              <span>
                ⚠️ Overdue
              </span>

              <strong>
                {overdueTasks}
              </strong>
            </div>
          </div>
        </section>

        {/* ================= CREATE TASK ================= */}

        <section
          className="create-card"
          id="create-task-section"
        >
          <div className="section-heading">
            <div className="heading-icon">
              ✨
            </div>

            <div>
              <div className="section-kicker">
                GET THINGS DONE
              </div>

              <h2>
                Create New Task
              </h2>

              <p>
                Add something to
                your task list
              </p>
            </div>
          </div>

          <form
            className="create-form"
            onSubmit={
              handleCreateTask
            }
          >
            <div className="form-field full">
              <label>
                Task Title
              </label>

              <input
                type="text"
                placeholder="e.g. Prepare semester exam"
                value={
                  form.title
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            <div className="form-field full">
              <label>
                Description
              </label>

              <textarea
                placeholder="Add task details..."
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            <div className="form-field">
              <label>
                Category
              </label>

              <select
                value={
                  form.category
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    category:
                      e.target
                        .value,
                  })
                }
              >
                {CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-field">
              <label>
                Priority
              </label>

              <select
                value={
                  form.priority
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority:
                      e.target
                        .value,
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

            <div className="form-field">
              <label>
                Due Date
              </label>

              <input
                type="date"
                min={
                  getTodayInputDate()
                }
                value={
                  form.dueDate
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    dueDate:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            {isAdmin &&
              activeMode ===
                "admin" && (
                <div className="form-field assign-field">
                  <label>
                    Assign To
                  </label>

                  <select
                    value={
                      form.assignedTo ||
                      ""
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assignedTo:
                          e.target
                            .value,
                      })
                    }
                  >
                    <option value="">
                      Select User
                    </option>

                    {users
                      .filter(
                        (person) =>
                          String(
                            person._id
                          ) !==
                            String(
                              user?.id
                            ) &&
                          String(
                            person._id
                          ) !==
                            String(
                              user?._id
                            )
                      )
                      .map(
                        (
                          person
                        ) => (
                          <option
                            key={
                              person._id
                            }
                            value={
                              person._id
                            }
                          >
                            {getUserName(
                              person
                            )}
                          </option>
                        )
                      )}
                  </select>
                </div>
              )}

            <div className="form-field button-field">
              <label>
                &nbsp;
              </label>

              <button
                className="add-task-btn"
                type="submit"
              >
                <span>
                  ＋
                </span>

                Add Task
              </button>
            </div>
          </form>
        </section>

        {/* ================= CATEGORY ================= */}

        <section className="category-section">
          <div className="section-title-row">
            <div>
              <div className="section-kicker">
                ORGANIZE
              </div>

              <h2>
                Category Overview
              </h2>

              <p>
                Tasks grouped by
                category
              </p>
            </div>
          </div>

          <div className="category-grid">
            {CATEGORIES.map(
              (category) => (
                <div
                  className="category-stat-card"
                  key={
                    category
                  }
                >
                  <div className="category-icon">
                    {
                      CATEGORY_ICONS[
                        category
                      ]
                    }
                  </div>

                  <div className="category-info">
                    <span>
                      {category}
                    </span>

                    <strong>
                      {
                        categoryStats[
                          category
                        ]
                      }
                    </strong>

                    <small>
                      {categoryStats[
                        category
                      ] === 1
                        ? "task"
                        : "tasks"}
                    </small>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* ================= TASK MANAGER ================= */}

        <section
          className="task-manager-card"
          id="tasks-section"
        >
          <div className="manager-header">
            <div>
              <div className="section-kicker">
                YOUR WORKSPACE
              </div>

              <h2>
                Your Tasks
              </h2>

              <p>
                {
                  filteredTasks.length
                }{" "}
                {filteredTasks.length ===
                1
                  ? "task"
                  : "tasks"}{" "}
                shown
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={
                fetchTasks
              }
              disabled={
                loading
              }
            >
              ↻ Refresh
            </button>
          </div>

          <div className="task-controls">
            <div className="search-box">
              <span>
                🔍
              </span>

              <input
                type="text"
                placeholder="Search tasks..."
                value={
                  search
                }
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />
            </div>

            <select
              value={
                categoryFilter
              }
              onChange={(e) =>
                setCategoryFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Categories
              </option>

              {CATEGORIES.map(
                (item) => (
                  <option
                    key={item}
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            <select
              value={
                priorityFilter
              }
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value
                )
              }
            >
              <option value="All">
                All Priorities
              </option>

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

            <select
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
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
                setSortBy(
                  e.target.value
                )
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

          <div className="task-list">
            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />

                <h3>
                  Loading tasks...
                </h3>

                <p>
                  Please wait while
                  your tasks are
                  loading.
                </p>
              </div>
            ) : filteredTasks.length ===
              0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  📝
                </div>

                <h3>
                  No tasks found
                </h3>

                <p>
                  Create a task or
                  change your
                  filters.
                </p>
              </div>
            ) : (
              filteredTasks.map(
                (task) => {
                  const assignedUser =
                    getAssignedUser(
                      task
                    );

                  return (
                    <div
                      className={`task-item ${
                        task.completed
                          ? "completed-task"
                          : ""
                      }`}
                      key={
                        task._id
                      }
                    >
                      <div className="task-main">
                        <button
                          className={`complete-btn ${
                            task.completed
                              ? "completed"
                              : ""
                          }`}
                          onClick={() =>
                            toggleComplete(
                              task
                            )
                          }
                        >
                          {task.completed
                            ? "✓"
                            : ""}
                        </button>

                        <div className="task-content">
                          <div className="task-title-row">
                            <h3>
                              {
                                task.title
                              }
                            </h3>

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
                              {
                                task.description
                              }
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

                            {assignedUser && (
                              <span className="assigned-badge">
                                👤{" "}
                                {getUserName(
                                  assignedUser
                                )}
                              </span>
                            )}

                            {task.assignedTo &&
                              getAssignedDate(
                                task
                              ) && (
                                <span className="assigned-date-meta">
                                  📌 Assigned on:{" "}
                                  {formatAssignedDate(
                                    getAssignedDate(
                                      task
                                    )
                                  )}
                                </span>
                              )}

                            {isOverdue(
                              task
                            ) && (
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
                          className="view-btn"
                          onClick={() =>
                            setViewingTask(
                              task
                            )
                          }
                        >
                          View
                        </button>

                        <button
                          className="edit-btn"
                          onClick={() =>
                            openEdit(
                              task
                            )
                          }
                        >
                          Edit
                        </button>

                        {isTaskOwner(
                          task
                        ) && (
                          <button
                            className="delete-btn"
                            onClick={() =>
                              askDeleteTask(
                                task
                              )
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-row">
              <div className="footer-mark">
                ✓
              </div>

              <span>
                TaskFlow
              </span>
            </div>

            <p>
              Smart task management
              made simple. Plan your
              work, stay organized,
              and get things done
              efficiently.
            </p>
          </div>

          <div className="footer-column">
            <h3>
              Product
            </h3>

            <span>
              Task Management
            </span>

            <span>
              Priority Tracking
            </span>

            <span>
              Due Date Management
            </span>

            <span>
              Progress Tracking
            </span>

            <span>
              Task Analytics
            </span>
          </div>

          <div className="footer-column">
            <h3>
              Stay Productive
            </h3>

            <p>
              Simple tools designed
              to help you stay
              focused, organized and
              productive.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © 2026 TaskFlow. All
            rights reserved.
          </span>

          <span>
            Built for better
            productivity
            <b> • </b>
            Simple • Focused •
            Productive
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
            {messageType ===
            "error"
              ? "!"
              : "✓"}
          </span>

          <span>
            {message}
          </span>
        </div>
      )}

      {/* ================= VIEW MODAL ================= */}

      {viewingTask && (
        <div
          className="modal-overlay"
          onClick={() =>
            setViewingTask(null)
          }
        >
          <div
            className="view-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="view-modal-header">
              <div>
                <div className="section-kicker">
                  TASK DETAILS
                </div>

                <h2>
                  Task Information
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setViewingTask(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="view-task-title">
              <div className="view-task-icon">
                {viewingTask.completed
                  ? "✓"
                  : "📝"}
              </div>

              <div>
                <h3>
                  {
                    viewingTask.title
                  }
                </h3>

                <span
                  className={`priority-badge ${String(
                    viewingTask.priority ||
                      "Medium"
                  ).toLowerCase()}`}
                >
                  {viewingTask.priority ||
                    "Medium"}
                </span>
              </div>
            </div>

            <div className="view-detail-box">
              <span>
                Description
              </span>

              <p>
                {viewingTask.description ||
                  "No description added for this task."}
              </p>
            </div>

            <div className="view-details-grid">
              <div className="view-detail-item">
                <span>
                  Category
                </span>

                <strong>
                  {
                    CATEGORY_ICONS[
                      viewingTask.category ||
                        "Other"
                    ]
                  }{" "}
                  {viewingTask.category ||
                    "Other"}
                </strong>
              </div>

              <div className="view-detail-item">
                <span>
                  Priority
                </span>

                <strong>
                  {viewingTask.priority ||
                    "Medium"}
                </strong>
              </div>

              <div className="view-detail-item">
                <span>
                  Due Date
                </span>

                <strong>
                  📅{" "}
                  {formatDate(
                    viewingTask.dueDate
                  )}
                </strong>
              </div>

              <div className="view-detail-item">
                <span>
                  Status
                </span>

                <strong>
                  {viewingTask.completed
                    ? "✓ Completed"
                    : isOverdue(
                        viewingTask
                      )
                    ? "⚠ Overdue"
                    : "⏳ Pending"}
                </strong>
              </div>

              <div className="view-detail-item">
                <span>
                  Assigned To
                </span>

                <strong>
                  {getAssignedUser(
                    viewingTask
                  )
                    ? `👤 ${getUserName(
                        getAssignedUser(
                          viewingTask
                        )
                      )}`
                    : "Select User"}
                </strong>

                {getAssignedUser(
                  viewingTask
                )?.email && (
                  <small>
                    📧{" "}
                    {
                      getAssignedUser(
                        viewingTask
                      ).email
                    }
                  </small>
                )}
              </div>

              <div className="view-detail-item">
                <span>
                  Assigned By
                </span>

                <strong>
                  {getCreatedByUser(
                    viewingTask
                  )
                    ? `👤 ${getUserName(
                        getCreatedByUser(
                          viewingTask
                        )
                      )}`
                    : user
                    ? `👤 ${getUserName(
                        user
                      )}`
                    : "Unknown User"}
                </strong>

                {(getCreatedByUser(
                  viewingTask
                )?.email ||
                  user?.email) && (
                  <small>
                    📧{" "}
                    {getCreatedByUser(
                      viewingTask
                    )?.email ||
                      user?.email}
                  </small>
                )}

                {viewingTask.assignedTo &&
                  getAssignedDate(
                    viewingTask
                  ) && (
                    <small>
                      📌 Assigned on:{" "}
                      {formatAssignedDate(
                        getAssignedDate(
                          viewingTask
                        )
                      )}
                    </small>
                  )}
              </div>
            </div>

            <div className="view-modal-actions">
              <button
                className="cancel-btn"
                onClick={() =>
                  setViewingTask(
                    null
                  )
                }
              >
                Close
              </button>

              <button
                className="primary-btn"
                onClick={() => {
                  setViewingTask(
                    null
                  );

                  openEdit(
                    viewingTask
                  );
                }}
              >
                Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}

      {editingTask && (
        <div
          className="modal-overlay"
          onClick={() =>
            setEditingTask(null)
          }
        >
          <div
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              maxHeight:
                "calc(100vh - 40px)",
              overflow: "hidden",
              display: "flex",
              flexDirection:
                "column",
            }}
          >
            <div className="modal-header">
              <div>
                <div className="section-kicker">
                  TASK UPDATE
                </div>

                <h2>
                  Edit Task
                </h2>

                <p>
                  Update your task
                  details.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setEditingTask(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                updateTask
              }
              className="edit-form"
              style={{
                minHeight: 0,
                overflowY:
                  "auto",
                overflowX:
                  "hidden",
              }}
            >
              <label>
                Task Title
              </label>

              <input
                type="text"
                value={
                  editingTask.title
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    title:
                      e.target
                        .value,
                  })
                }
              />

              <label>
                Description
              </label>

              <textarea
                value={
                  editingTask.description ||
                  ""
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    description:
                      e.target
                        .value,
                  })
                }
              />

              <div className="form-row">
                <div>
                  <label>
                    Category
                  </label>

                  <select
                    value={
                      editingTask.category ||
                      "Other"
                    }
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        category:
                          e.target
                            .value,
                      })
                    }
                  >
                    {CATEGORIES.map(
                      (item) => (
                        <option
                          key={
                            item
                          }
                          value={
                            item
                          }
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label>
                    Priority
                  </label>

                  <select
                    value={
                      editingTask.priority ||
                      "Medium"
                    }
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority:
                          e.target
                            .value,
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

              <label>
                Due Date
              </label>

              <input
                type="date"
                min={
                  getTodayInputDate()
                }
                value={
                  editingTask.dueDate ||
                  ""
                }
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    dueDate:
                      e.target
                        .value,
                  })
                }
              />

              {isAdmin &&
                activeMode ===
                  "admin" && (
                  <div className="edit-assign-field">
                    <label>
                      Assign To
                    </label>

                    <select
                      value={
                        editingTask.assignedTo ||
                        ""
                      }
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          assignedTo:
                            e.target
                              .value,
                        })
                      }
                    >
                      <option value="">
                        No Assignee
                      </option>

                      {users
                        .filter(
                          (
                            person
                          ) =>
                            String(
                              person._id
                            ) !==
                              String(
                                user?.id
                              ) &&
                            String(
                              person._id
                            ) !==
                              String(
                                user?._id
                              )
                        )
                        .map(
                          (
                            person
                          ) => (
                            <option
                              key={
                                person._id
                              }
                              value={
                                person._id
                              }
                            >
                              {getUserName(
                                person
                              )}
                            </option>
                          )
                        )}
                    </select>
                  </div>
                )}

              <label>
                Status
              </label>

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
                      e.target
                        .value ===
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
                    setEditingTask(
                      null
                    )
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
        <div
          className="modal-overlay"
          onClick={
            cancelDelete
          }
        >
          <div
            className="delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="delete-icon">
              🗑️
            </div>

            <h2>
              Delete Task?
            </h2>

            <p>
              Are you sure you
              want to delete{" "}
              <strong>
                "{deleteTaskInfo.title}"
              </strong>
              ?
            </p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={
                  cancelDelete
                }
              >
                Cancel
              </button>

              <button
                className="delete-confirm-btn"
                onClick={
                  confirmDelete
                }
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