import { useEffect, useState } from "react";
import { INCIDENT_TYPES, INCIDENT_SEVERITY } from "../services/incidentService";
import { getPatientsByOrganisation, listPatients } from "../services/patientService";

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
function isDutyOfCandourSeverity(severity) {
  const s = String(severity ?? "").toLowerCase();
  return s === "medium" || s === "high";
}

export default function IncidentForm({
  onSubmit,
  loading,
  legacy = false,
  initialPatientId = "",
  onDraftCandour,
  draftCandourLoading = false,
  organisationId = null,
}) {
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
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setPatientsLoading(true);
      const load =
        organisationId?.trim()
          ? getPatientsByOrganisation(organisationId.trim())
          : legacy === true
            ? listPatients({ allInOrganisation: true })
            : listPatients();
      load
        .then((list) => {
          if (!mounted) return;
          const rows = Array.isArray(list) ? list : [];
          console.log("Loaded patients:", rows);
          setPatientOptions(rows);
        })
        .catch(() => {
          if (!mounted) return;
          setPatientOptions([]);
        })
        .finally(() => {
          if (mounted) setPatientsLoading(false);
        });
    });
    return () => {
      mounted = false;
    };
  }, [legacy, organisationId]);

  function handleDraftCandourClick(e) {
    e.preventDefault();
    if (!legacy || !onDraftCandour) return;
    if (!patientId.trim() || !type || !severity || !description.trim()) return;
    onDraftCandour({
      patientId: patientId.trim(),
      type,
      severity,
      description: description.trim(),
      actionsTaken: actionsTaken.trim(),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!patientId.trim()) return;

    if (legacy) {
      if (!type || !severity || !description.trim()) return;
      try {
        await onSubmit({
          patientId: patientId.trim(),
          type,
          severity,
          description: description.trim(),
          actionsTaken: actionsTaken.trim(),
        });
      } catch {
        return;
      }
      setDescription("");
      setActionsTaken("");
      setType("safeguarding");
      setSeverity("medium");
      return;
    }

    if (!title.trim() || !dateTime || !location.trim() || !severity || !description.trim()) return;
    try {
      await onSubmit({
        patientId: patientId.trim(),
        title: title.trim(),
        dateTime,
        location: location.trim(),
        severity,
        description: description.trim(),
      });
    } catch {
      return;
    }
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
              {(p.name ?? `${(p.firstName || "").trim()} ${(p.lastName || "").trim()}`).trim() || p.id}
            </option>
          ))}
        </select>
        {!patientsLoading && patientOptions.length === 0 ? (
          <p style={{ margin: "8px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
            No patients found — please add patient in Patients section
          </p>
        ) : null}
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
          rows={6}
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
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

        {legacy && onDraftCandour && isDutyOfCandourSeverity(severity) && (
          <button
            type="button"
            onClick={handleDraftCandourClick}
            disabled={loading || draftCandourLoading}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #0f766e",
              background: "#f0fdfa",
              color: "#0f766e",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading || draftCandourLoading ? "default" : "pointer",
            }}
          >
            {draftCandourLoading ? "Drafting…" : "Draft Duty of Candour letter"}
          </button>
        )}
      </div>
      {legacy && onDraftCandour && isDutyOfCandourSeverity(severity) && (
        <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.8rem", color: "#64748b", maxWidth: 520 }}>
          Uses the details above (you can draft before or after submitting). For Low severity, Regulation 20 candour may not
          apply — use the table below after save if severity is upgraded.
        </p>
      )}
    </form>
  );
}

