import { useEffect, useState, useCallback } from "react";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortByPriority, setSortByPriority] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [priority, setPriority] = useState("medium");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const apiFetch = (url, options = {}) =>
    fetch(url, {
      credentials: "include",
      ...options,
    });

  const STATUS_LABELS = {
    queued: "Queued",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
  };

  const PRIORITY_CONFIG = {
    urgent: {
      label: "Urgent",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    high: {
      label: "High",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    },
    medium: {
      label: "Medium",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    low: {
      label: "Low",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
  };

  const STATUS_CONFIG = {
    completed: "border-green-200 bg-green-50 text-green-700",
    in_progress: "border-blue-200 bg-blue-50 text-blue-700",
    assigned: "border-orange-200 bg-orange-50 text-orange-700",
    queued: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const buttonClass = (disabled = false, variant = "secondary") => {
    const base =
      "rounded-lg px-4 py-2 text-sm font-semibold transition shadow-sm";

    if (disabled) {
      return `${base} cursor-not-allowed bg-slate-200 text-slate-400`;
    }

    if (variant === "primary") {
      return `${base} bg-slate-900 text-white hover:bg-slate-800`;
    }

    if (variant === "danger") {
      return `${base} bg-red-600 text-white hover:bg-red-700`;
    }

    return `${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

  const fetchTasks = useCallback(() => {
    const params = new URLSearchParams();

    if (statusFilter) params.append("status", statusFilter);
    if (sortByPriority) params.append("sort", "priority");
    params.append("per_page", "100");

    apiFetch(`${API_BASE}/tasks?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tasks");
        return res.json();
      })
      .then((data) => {
        setTasks(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error(error);
        setTasks([]);
      });
  }, [API_BASE, statusFilter, sortByPriority]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser, fetchTasks]);

  useEffect(() => {
    apiFetch(`${API_BASE}/me`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, [API_BASE]);

  const visibleTasks =
    onlyMine && currentUser
      ? tasks.filter((task) => task.assigned_to_id === currentUser.id)
      : tasks;

  const createTask = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    apiFetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: {
          title,
          priority,
        },
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create task");
        if (res.status === 204) return null;
        return res.json();
      })
      .then(() => {
        setTitle("");
        setPriority("medium");
        fetchTasks();
      })
      .catch(console.error);
  };

  const assignTask = (taskId) => {
    apiFetch(`${API_BASE}/tasks/${taskId}/assign`, {
      method: "PATCH",
    }).then(() => fetchTasks());
  };

  const deleteTask = (taskId) => {
    apiFetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        fetchTasks();
      })
      .catch(console.error);
  };

  const transitionTask = (taskId, status) => {
    apiFetch(`${API_BASE}/tasks/${taskId}/transition`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).then(() => fetchTasks());
  };

  const login = (e) => {
    e.preventDefault();
    setLoginError("");

    apiFetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: loginName,
        password: loginPassword,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid name or password");
        return res.json();
      })
      .then((user) => {
        setCurrentUser(user);
        setLoginName("");
        setLoginPassword("");
      })
      .catch((error) => {
        setLoginError(error.message);
      });
  };

  const logout = () => {
    apiFetch(`${API_BASE}/logout`, {
      method: "DELETE",
    }).finally(() => {
      setCurrentUser(null);
      setTasks([]);
    });
  };

  const createDisabled = !title.trim();

  const totalTasks = tasks.length;
  const queuedTasks = tasks.filter((task) => task.status === "queued").length;
  const inProgressTasks = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;
  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
              Taskflow
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in to manage tasks and workflow history.
            </p>
          </div>

          <form onSubmit={login} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="Enter your name"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className={inputClass}
            />

            <input
              type="password"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={inputClass}
            />

            <button
              type="submit"
              disabled={!loginName.trim()}
              className={`w-full ${buttonClass(!loginName.trim(), "primary")}`}
            >
              Sign In
            </button>
          </form>

          {loginError && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-700">
              {loginError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-6 py-8 font-sans text-slate-900">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-3xl bg-slate-950 px-6 py-6 text-white shadow-sm md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">
                Taskflow
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                Workflow dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Manage task ownership, status transitions, priority, and audit
                history.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm">
                Signed in as{" "}
                <span className="font-bold text-white">{currentUser.name}</span>
              </div>

              <button
                onClick={logout}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Total Tasks</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalTasks}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Queued</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {queuedTasks}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {inProgressTasks}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {completedTasks}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">Create task</h2>
            <p className="text-sm text-slate-500">
              Add a new workflow item and choose its starting priority.
            </p>
          </div>

          <form
            onSubmit={createTask}
            className="grid gap-4 md:grid-cols-[1fr_auto_auto]"
          >
            <input
              type="text"
              placeholder="New task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={selectClass}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent priority</option>
            </select>

            <button
              type="submit"
              disabled={createDisabled}
              className={buttonClass(createDisabled, "primary")}
            >
              Create
            </button>
          </form>
        </section>

        <section className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-slate-600">
              Filter by status
            </label>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All</option>
              <option value="queued">{STATUS_LABELS.queued}</option>
              <option value="assigned">{STATUS_LABELS.assigned}</option>
              <option value="in_progress">{STATUS_LABELS.in_progress}</option>
              <option value="completed">{STATUS_LABELS.completed}</option>
            </select>

            <button
              onClick={() => setSortByPriority((prev) => !prev)}
              className={buttonClass(false)}
            >
              {sortByPriority ? "Priority Sort On" : "Sort by Priority"}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            My tasks only
          </label>
        </section>

        <section className="grid gap-5">
          {visibleTasks.map((task) => {
            const priorityKey = task.priority?.toLowerCase();
            const priorityInfo = PRIORITY_CONFIG[priorityKey];

            const assignDisabled =
              task.status !== "queued" || task.assigned_to_id;

            const startDisabled =
              task.status !== "assigned" ||
              task.assigned_to_id !== currentUser.id;

            const completeDisabled =
              task.status !== "in_progress" ||
              task.assigned_to_id !== currentUser.id;

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                      {task.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Assigned to{" "}
                      <span className="font-semibold text-slate-700">
                        {task.assigned_to_name || "Unassigned"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        STATUS_CONFIG[task.status] ||
                        "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {STATUS_LABELS[task.status] || task.status}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        priorityInfo?.className ||
                        "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {priorityInfo?.label || task.priority}
                    </span>
                  </div>
                </div>

                <div className="mb-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => assignTask(task.id)}
                    disabled={assignDisabled}
                    className={buttonClass(assignDisabled)}
                  >
                    {task.assigned_to_id
                      ? task.assigned_to_id === currentUser.id
                        ? "Assigned to you"
                        : `Assigned to ${task.assigned_to_name}`
                      : `Assign to ${currentUser.name}`}
                  </button>

                  <button
                    onClick={() => transitionTask(task.id, "in_progress")}
                    disabled={startDisabled}
                    className={buttonClass(startDisabled)}
                  >
                    Start
                  </button>

                  <button
                    onClick={() => transitionTask(task.id, "completed")}
                    disabled={completeDisabled}
                    className={buttonClass(completeDisabled)}
                  >
                    Complete
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Delete
                  </button>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                    Audit History
                  </h3>

                  {task.task_events?.length > 0 ? (
                    <ul className="space-y-2">
                      {task.task_events.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                        >
                          {event.event_type === "assigned" ? (
                        <>
                          Assigned to{" "}
                          <span className="font-semibold">
                            {event.to_value}
                          </span>
                        </>
                      ) : event.event_type === "status_changed" ? (
                        <>
                          Status changed from{" "}
                          <span className="font-semibold">
                            {STATUS_LABELS[event.from_value] || event.from_value || "None"}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold">
                            {STATUS_LABELS[event.to_value] || event.to_value}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{event.event_type}</span>:{" "}
                          {event.from_value || "none"} → {event.to_value}
                        </>
                      )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">No events yet</p>
                  )}
                </div>
              </article>
            );
          })}

          {visibleTasks.length === 0 && (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-slate-700">No tasks found.</p>
              <p className="mt-1 text-sm text-slate-500">
                Create one above or change your filters.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;