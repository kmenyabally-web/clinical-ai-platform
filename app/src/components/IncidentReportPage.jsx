/** [ENABLEMENT GATE: STAGE 6 - INCIDENT REPORTING] */

import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import IncidentForm from "./IncidentForm";
import { createIncidentReport } from "../services/incidentService";

export default function IncidentReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(payload) {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const occurredAt = payload?.dateTime ? new Date(payload.dateTime) : null;
      await createIncidentReport({
        patientId: payload.patientId || id,
        title: payload.title,
        occurredAt,
        location: payload.location,
        severity: payload.severity,
        description: payload.description,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/patients/${id}`), 750);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <Link to={`/patients/${id}`} style={styles.backLink}>
          ← Back to Patient
        </Link>
        <span style={styles.badge}>Stage 6</span>
      </div>
      <h2 style={styles.title}>Report an Incident</h2>

      {success ? (
        <div style={styles.successBox}>Success. Redirecting back to the patient record…</div>
      ) : null}

      {error ? (
        <div style={styles.errorBox}>
          <div style={styles.errorTitle}>Submission failed</div>
          <div style={styles.errorText}>{error?.message || String(error)}</div>
        </div>
      ) : null}

      <div style={styles.card}>
        <IncidentForm onSubmit={handleSubmit} loading={submitting} initialPatientId={id} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100%",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 4px",
    boxSizing: "border-box",
    fontFamily: "sans-serif",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 14px 0",
    color: "#0f172a",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1.5rem 1.75rem",
  },
  backLink: {
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: 800,
    fontSize: 13,
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #bbf7d0",
    backgroundColor: "#f0fdf4",
    color: "#166534",
    fontWeight: 800,
    marginBottom: 12,
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
    marginBottom: 12,
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
  },
};

