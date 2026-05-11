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

  const API_BASE = "http://localhost:3000";

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
    urgent: { label: "Urgent", color: "red" },
    high: { label: "High", color: "orange" },
    medium: { label: "Medium", color: "blue" },
    low: { label: "Low", color: "gray" },
  };

  const statusColor = (status) => {
    switch (status) {
      case "completed":
        return "green";
      case "in_progress":
        return "blue";
      case "assigned":
        return "orange";
      default:
        return "gray";
    }
  };

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
  }, [statusFilter, sortByPriority]);

  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser, fetchTasks]);

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

  useEffect(() => {
    apiFetch(`${API_BASE}/me`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((user) => setCurrentUser(user)) // 👈 THIS IS MISSING
      .catch(() => setCurrentUser(null));
  }, []);

  const logout = () => {
    apiFetch(`${API_BASE}/logout`, {
      method: "DELETE",
    }).finally(() => {
      setCurrentUser(null);
      setTasks([]);
    });
  };

  const getButtonStyle = (disabled) => ({
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#eee" : "white",
    color: disabled ? "#999" : "#000",
  });

  const createDisabled = !title.trim();

  if (!currentUser) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Sign In</h2>

        <form onSubmit={login}>
          <input
            type="text"
            placeholder="Enter your name"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginRight: "10px",
            }}
          />

          <input
            type="password"
            placeholder="Enter password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginRight: "10px",
            }}
          />

          <button
            type="submit"
            disabled={!loginName.trim()}
            style={getButtonStyle(!loginName.trim())}
          >
            Sign In
          </button>
        </form>

        {loginError && (
          <p style={{ color: "red", marginTop: "12px" }}>{loginError}</p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1
          style={{
            marginBottom: "20px",
            textAlign: "center",
            color: "#000",
          }}
        >
          Taskflow
        </h1>

        <p style={{ color: "#555", marginBottom: "12px", textAlign: "center" }}>
          Manage workflow tasks, transitions, and audit history.
        </p>

        <p style={{ textAlign: "center", color: "#333" }}>
          Signed in as <strong>{currentUser.name}</strong>
        </p>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <button onClick={logout} style={getButtonStyle(false)}>
            Logout
          </button>
        </div>

        <form
          onSubmit={createTask}
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
            background: "white",
            padding: "16px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <input
            type="text"
            placeholder="New task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "white",
              color: "#000",
            }}
          />

        Set priority:{" "}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                background: "white",
                color: "#000",
              }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            type="submit"
            disabled={createDisabled}
            style={getButtonStyle(createDisabled)}
          >
            Create
          </button>
        </form>


        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <label>
            Filter by status:{" "}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                background: "white",
                color: "#000",
              }}
            >
              <option value="">All</option>
              <option value="queued">{STATUS_LABELS.queued}</option>
              <option value="assigned">{STATUS_LABELS.assigned}</option>
              <option value="in_progress">{STATUS_LABELS.in_progress}</option>
              <option value="completed">{STATUS_LABELS.completed}</option>
            </select>
          </label>

          <button
            onClick={() => setSortByPriority((prev) => !prev)}
            style={getButtonStyle(false)}
          >
            {sortByPriority ? "Disable Priority Sort" : "Sort by Priority"}
          </button>

          <label>
            My tasks{" "}
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
          </label>
        </div>

        {visibleTasks.map((task) => {
          const priorityKey = task.priority?.toLowerCase();
          const priority = PRIORITY_CONFIG[priorityKey];

          const assignDisabled =
            task.status !== "queued" || task.assigned_to_id;

          const startDisabled =
            task.status !== "assigned" ||
            task.assigned_to_id !== currentUser.id;

          const completeDisabled =
            task.status !== "in_progress" ||
            task.assigned_to_id !== currentUser.id;

          return (
            <div
              key={task.id}
              style={{
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "10px",
                marginBottom: "16px",
                padding: "18px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {task.title}
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                <button
                  onClick={() => assignTask(task.id)}
                  disabled={assignDisabled}
                  style={getButtonStyle(assignDisabled)}
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
                  style={getButtonStyle(startDisabled)}
                >
                  Start
                </button>

                <button
                  onClick={() => transitionTask(task.id, "completed")}
                  disabled={completeDisabled}
                  style={getButtonStyle(completeDisabled)}
                >
                  Complete
                </button>

                <button onClick={() => deleteTask(task.id)}>Delete</button>
              </div>

              <div
                style={{
                  maxWidth: "400px",
                  margin: "0 auto",
                  textAlign: "left",
                }}
              >
                <p style={{ margin: "6px 0" }}>
                  <strong>Assigned To:</strong>{" "}
                  <span>{task.assigned_to_name || "Unassigned"}</span>
                </p>

                <p style={{ margin: "6px 0" }}>
                  <strong>Status:</strong>{" "}
                  <strong style={{ color: statusColor(task.status) }}>
                    {STATUS_LABELS[task.status] || task.status}
                  </strong>
                </p>

                <p style={{ margin: "6px 0" }}>
                  <strong>Priority:</strong>{" "}
                  <strong style={{ color: priority?.color || "gray" }}>
                    {priority?.label || task.priority}
                  </strong>
                </p>

                <div style={{ marginTop: "12px" }}>
                  <h4
                    style={{
                      marginBottom: "8px",
                      textAlign: "left",
                      fontWeight: "bold",
                    }}
                  >
                    Audit History
                  </h4>

                  {task.task_events?.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        paddingLeft: 0,
                        margin: 0,
                        textAlign: "left",
                      }}
                    >
                      {task.task_events.map((event) => (
                        <li key={event.id} style={{ padding: "4px 0" }}>
                          {event.event_type}: {event.from_value || "none"} →{" "}
                          {event.to_value}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: "#777", textAlign: "left" }}>
                      No events yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;