/** [ENABLEMENT GATE: STAGE 6 - INCIDENT REPORTING SYSTEM] */

import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createIncident } from "../services/incidentService";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: "15px",
  boxSizing: "border-box",
};

export default function IncidentFormPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Fall");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const trimmedPatientId = useMemo(() => (patientId || "").toString().trim(), [patientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!trimmedPatientId) return;
    if (!title.trim() || !category || !severity || !description.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await createIncident({
        patientId: trimmedPatientId,
        title: title.trim(),
        category,
        severity,
        description: description.trim(),
      });
      setSuccess(true);
      setTimeout(() => navigate("/patients"), 750);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 4px",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h2 style={{ margin: "8px 0 14px 0" }}>Report New Incident</h2>
        <span
          style={{
            display: "inline-block",
            backgroundColor: "#dcfce7",
            color: "#166534",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          Stage 6
        </span>
      </div>

      <div style={{ marginBottom: 12, color: "#475569", fontSize: 13 }}>
        Linked patientId: <strong>{trimmedPatientId || "—"}</strong>
      </div>

      {success ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #bbf7d0",
            backgroundColor: "#f0fdf4",
            color: "#166534",
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Success. Redirecting back to the Patient List…
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            color: "#7f1d1d",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Submission failed</div>
          <div style={{ fontSize: 13 }}>{error?.message || String(error)}</div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.5rem 1.75rem 1.75rem",
        }}
      >
        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="inc-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
            Title *
          </label>
          <input
            id="inc-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
            placeholder="Short incident title"
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="inc-category" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
            Category *
          </label>
          <select
            id="inc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            {["Fall", "Medication", "Behaviour", "Other"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="inc-severity" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
            Severity *
          </label>
          <select
            id="inc-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            style={inputStyle}
          >
            {["Low", "Medium", "High"].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="inc-desc" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
            Description *
          </label>
          <textarea
            id="inc-desc"
            required
            rows={8}
            style={{ ...inputStyle, resize: "vertical", minHeight: 180 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "#1976d2",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}

