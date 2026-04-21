import { useState } from "react";

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "complete", label: "Complete" },
];
const LINK_TYPE_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "incident", label: "Incident" },
  { value: "capacity", label: "Capacity" },
  { value: "dols", label: "DoLS / LPS" },
  { value: "compliance_issue", label: "Compliance issue" },
];

/**
 * Modal form for creating a compliance action.
 * Fields: title, description, domainType (domainId), severity (riskLevel), assignedTo, dueDate.
 * On submit: save to compliance_actions with organisationId, status="open", createdAt.
 */
export default function CreateActionModal({ open, onClose, domains = [], onSubmit, loading }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domainType, setDomainType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("open");
  const [linkedEntityType, setLinkedEntityType] = useState("");
  const [linkedEntityId, setLinkedEntityId] = useState("");

  function reset() {
    setTitle("");
    setDescription("");
    setDomainType("");
    setSeverity("medium");
    setAssignedTo("");
    setDueDate("");
    setStatus("open");
    setLinkedEntityType("");
    setLinkedEntityId("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const due = dueDate ? new Date(dueDate) : null;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      domainId: domainType || null,
      riskLevel: severity,
      priority: severity,
      assignedTo: assignedTo.trim() || null,
      dueDate: due,
      status,
      linkedEntityType: linkedEntityType || null,
      linkedEntityId: linkedEntityId.trim() || null,
      issueCategory: linkedEntityType || null,
    });
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-action-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "1.5rem 2rem",
          minWidth: 420,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="create-action-title" style={{ marginTop: 0, marginBottom: "1rem" }}>
          Create action
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Title *
            </label>
            <input
              id="action-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="Action title"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-description" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              id="action-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Optional description"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-domain" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Domain
            </label>
            <select
              id="action-domain"
              value={domainType}
              onChange={(e) => setDomainType(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Select domain —</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.domainKey}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-severity" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Severity
            </label>
            <select
              id="action-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={inputStyle}
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-status" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Status
            </label>
            <select
              id="action-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="action-assigned" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Assigned to
            </label>
            <input
              id="action-assigned"
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              style={inputStyle}
              placeholder="User name or email"
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="action-link-type" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Link type
            </label>
            <select
              id="action-link-type"
              value={linkedEntityType}
              onChange={(e) => setLinkedEntityType(e.target.value)}
              style={inputStyle}
            >
              {LINK_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="action-link-id" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Linked record ID
            </label>
            <input
              id="action-link-id"
              type="text"
              value={linkedEntityId}
              onChange={(e) => setLinkedEntityId(e.target.value)}
              style={inputStyle}
              placeholder="Incident / capacity / DoLS / compliance issue ID"
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="action-due" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Due date
            </label>
            <input
              id="action-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={handleClose} style={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()} style={buttonPrimary}>
              {loading ? "Creating…" : "Create action"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

const buttonPrimary = {
  padding: "8px 16px",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const buttonSecondary = {
  padding: "8px 16px",
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
};
