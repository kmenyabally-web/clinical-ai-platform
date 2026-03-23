import { useMemo } from "react";
import { formatUkDate, formatUkDateTime } from "../utils/dateFormat";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];

function formatDate(value) {
  return formatUkDate(value, "—");
}

function formatDateTime(value) {
  return formatUkDateTime(value, "—");
}

/**
 * Reusable table of compliance actions.
 * Displays: title, domain, severity, status, assigned user, due date, last updated.
 * Status can be updated from the table when canUpdateStatus is true.
 * Highlights overdue, high severity, and upcoming due dates.
 */
export default function ActionTable({
  actions = [],
  domains = [],
  canUpdateStatus = false,
  onStatusChange,
  updatingId,
}) {
  const domainMap = useMemo(() => {
    const m = new Map();
    domains.forEach((d) => m.set(d.id, d.name || d.domainKey));
    return m;
  }, [domains]);

  const now = useMemo(() => Date.now(), []);
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  function getRowStyle(action) {
    const due = action.dueDate?.toMillis?.();
    const isOverdue = due && action.status !== "complete" && due < now;
    const isHighSeverity = action.riskLevel === "high" || action.priority === "high";
    const isUpcoming = due && action.status !== "complete" && due >= now && due - now <= oneWeek;
    if (isOverdue) return { background: "#ffebee" };
    if (isHighSeverity && action.status !== "complete") return { background: "#fff8e1" };
    if (isUpcoming) return { background: "#e3f2fd" };
    return {};
  }

  function getDueLabel(action) {
    const due = action.dueDate?.toMillis?.();
    if (!due) return "—";
    if (action.status === "complete") return formatDate(action.dueDate);
    if (due < now) return `${formatDate(action.dueDate)} (overdue)`;
    if (due - now <= oneWeek) return `${formatDate(action.dueDate)} (upcoming)`;
    return formatDate(action.dueDate);
  }

  if (actions.length === 0) {
    return (
      <p style={{ color: "#666", padding: "1rem 0" }}>No actions. Create one to get started.</p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle} aria-label="Compliance actions">
        <thead>
          <tr>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Severity</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Assigned to</th>
            <th style={thStyle}>Due date</th>
            <th style={thStyle}>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action) => (
            <tr key={action.id} style={getRowStyle(action)}>
              <td style={tdStyle}>
                <strong>{action.title || "—"}</strong>
              </td>
              <td style={tdStyle}>{domainMap.get(action.domainId) ?? action.domainId ?? "—"}</td>
              <td style={tdStyle}>
                <span style={{ textTransform: "capitalize" }}>
                  {action.riskLevel || action.priority || "—"}
                </span>
              </td>
              <td style={tdStyle}>
                {canUpdateStatus && action.status !== "complete" ? (
                  <select
                    value={action.status}
                    onChange={(e) => onStatusChange?.(action, e.target.value)}
                    disabled={updatingId === action.id}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
                    aria-label={`Update status for ${action.title}`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ textTransform: "capitalize" }}>
                    {action.status === "in-progress" ? "In progress" : action.status || "—"}
                  </span>
                )}
              </td>
              <td style={tdStyle}>{action.assignedTo ?? "—"}</td>
              <td style={tdStyle}>{getDueLabel(action)}</td>
              <td style={tdStyle}>{formatDateTime(action.updatedAt || action.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  background: "#f5f5f5",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

const tdStyle = {
  padding: "12px 16px",
  borderTop: "1px solid #eee",
  fontSize: 14,
};
