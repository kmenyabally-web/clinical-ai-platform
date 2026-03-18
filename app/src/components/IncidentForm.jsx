import { useEffect, useState } from "react";
import { INCIDENT_TYPES, INCIDENT_SEVERITY } from "../services/incidentService";
import { listPatients } from "../services/patientService";

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
 * - onSubmit(payload)
 * - loading (boolean) to disable submit while saving
 *
 * Stage 6 mode (default):
 * - fields: title, dateTime, location, severity (low/medium/high), description, patientId (dropdown)
 *
 * Legacy mode:
 * - set legacy=true to use the previous payload shape used by Incidents page
 * - loading (boolean) to disable submit while saving
 */
export default function IncidentForm({ onSubmit, loading, legacy = false, initialPatientId = "" }) {
  const [patientId, setPatientId] = useState(initialPatientId || "");

  // Stage 6 fields
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");

  // Legacy fields
  const [type, setType] = useState("safeguarding");
  const [actionsTaken, setActionsTaken] = useState("");

  const [patientOptions, setPatientOptions] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  useEffect(() => {
    if (legacy) return;
    let mounted = true;
    setPatientsLoading(true);
    listPatients()
      .then((list) => {
        if (!mounted) return;
        setPatientOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setPatientOptions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setPatientsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [legacy]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!patientId.trim()) return;

    if (legacy) {
      if (!type || !severity || !description.trim()) return;
      onSubmit({
        patientId: patientId.trim(),
        type,
        severity,
        description: description.trim(),
        actionsTaken: actionsTaken.trim(),
      });
      setDescription("");
      setActionsTaken("");
      return;
    }

    if (!title.trim() || !dateTime || !location.trim() || !severity || !description.trim()) return;
    onSubmit({
      patientId: patientId.trim(),
      title: title.trim(),
      dateTime,
      location: location.trim(),
      severity,
      description: description.trim(),
    });
    setTitle("");
    setLocation("");
    setDescription("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="incident-patient" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Patient *
        </label>
        {legacy ? (
          <input
            id="incident-patient"
            type="text"
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={inputStyle}
            placeholder="e.g. patient_123"
          />
        ) : (
          <select
            id="incident-patient"
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={inputStyle}
            disabled={patientsLoading}
          >
            <option value="">{patientsLoading ? "Loading patients…" : "Select a patient"}</option>
            {patientOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.firstName || "").trim()} {(p.lastName || "").trim()}
              </option>
            ))}
          </select>
        )}
      </div>

      {!legacy ? (
        <>
          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="incident-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Title *
            </label>
            <input
              id="incident-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="Short incident title"
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="incident-datetime" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Date/Time *
            </label>
            <input
              id="incident-datetime"
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="incident-location" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Location *
            </label>
            <input
              id="incident-location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Lounge, Bedroom 2, Community outing"
            />
          </div>
        </>
      ) : null}

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
          {(legacy ? INCIDENT_SEVERITY : ["low", "medium", "high"]).map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {legacy ? (
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
      ) : null}

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

      {legacy ? (
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
      ) : null}

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
        {loading ? "Submitting…" : "Submit incident report"}
      </button>
    </form>
  );
}

