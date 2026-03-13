import { useState } from "react";
import { INCIDENT_TYPES, INCIDENT_SEVERITY } from "../services/incidentService";

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: "14px",
};

/**
 * Incident form for reporting safeguarding and other incidents.
 *
 * Props:
 * - onSubmit(payload) where payload = { patientId, type, severity, description, actionsTaken }
 * - loading (boolean) to disable submit while saving
 */
export default function IncidentForm({ onSubmit, loading }) {
  const [patientId, setPatientId] = useState("");
  const [type, setType] = useState("safeguarding");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!patientId.trim() || !type || !severity || !description.trim()) {
      return;
    }
    onSubmit({
      patientId: patientId.trim(),
      type,
      severity,
      description: description.trim(),
      actionsTaken: actionsTaken.trim(),
    });
    setDescription("");
    setActionsTaken("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-patient" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Patient ID *
        </label>
        <input
          id="incident-patient"
          type="text"
          required
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={inputStyle}
          placeholder="e.g. patient_123"
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-type" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Incident type *
        </label>
        <select
          id="incident-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={inputStyle}
        >
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-severity" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Severity *
        </label>
        <select
          id="incident-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          style={inputStyle}
        >
          {INCIDENT_SEVERITY.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-description" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Description *
        </label>
        <textarea
          id="incident-description"
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Describe what happened"
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-actions" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Actions taken
        </label>
        <textarea
          id="incident-actions"
          rows={2}
          value={actionsTaken}
          onChange={(e) => setActionsTaken(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Immediate actions, notifications, follow-up (optional)"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          background: "#1976d2",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Reporting…" : "Report incident"}
      </button>
    </form>
  );
}

