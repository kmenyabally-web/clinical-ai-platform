/** [ENABLEMENT GATE: STAGE 5 - PATIENT DETAIL VIEW] */

import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById } from "../services/patientService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchClinicalNotesForPatient } from "../services/noteService";

export default function PatientDetail() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const p = await getPatientById(id);
        if (mounted) setPatient(p);
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    setNotesLoading(true);
    setNotesError(null);
    fetchClinicalNotesForPatient(id, { limitCount: 10 })
      .then((list) => {
        if (!mounted) return;
        setNotes(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setNotes([]);
        setNotesError(err);
      })
      .finally(() => {
        if (!mounted) return;
        setNotesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    setIncidentsLoading(true);
    fetchIncidentsForPatient(id, { limitCount: 10 })
      .then((list) => {
        if (!mounted) return;
        setIncidents(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setIncidents([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIncidentsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (isLoading) {
    return <div style={styles.text}>Loading patient…</div>;
  }

  if (error) {
    const message = error?.message || String(error);
    const isForbidden =
      message.includes("403 Forbidden") || Number(error?.status) === 403;
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorTitle}>
          {isForbidden ? "403 Forbidden: Governance Breach" : "Error"}
        </div>
        <div style={styles.errorText}>{message}</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/patients" style={styles.backLink}>
            ← Back to Patient List
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim();

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <Link to="/patients" style={styles.backLink}>
          ← Back to Patient List
        </Link>
        <span style={styles.badge}>Stage 5</span>
      </div>

      <h2 style={styles.title}>{fullName || "Patient record"}</h2>

      <div style={styles.actionsRow}>
        <Link to={`/incidents/new/${id}`} style={styles.primaryAction}>
          Report Incident (Stage 6)
        </Link>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.label}>Full name</div>
          <div style={styles.value}>{fullName || "—"}</div>
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Address</div>
          <div style={styles.value}>{patient?.address || "—"}</div>
        </div>
        <div style={styles.row}>
          <div style={styles.label}>Date of birth</div>
          <div style={styles.value}>{formatDob(patient?.dob) || "—"}</div>
        </div>
        <div style={styles.row}>
          <div style={styles.label}>GP name</div>
          <div style={styles.value}>{patient?.gpName || "—"}</div>
        </div>
        <div style={styles.rowLast}>
          <div style={styles.label}>Emergency contact</div>
          <div style={styles.value}>{patient?.emergencyContact || "—"}</div>
        </div>
      </div>

      <div style={styles.clinicalLocked}>
        <div style={styles.clinicalTitle}>Clinical Records</div>
        <div style={styles.clinicalText}>
          Stage 5 Access: Clinical data is currently restricted. Upgrade governance
          level to view.
        </div>
      </div>

      <div style={styles.notesCard}>
        <div style={styles.notesHeader}>
          <div style={styles.notesTitle}>Notes History</div>
          {notesLoading ? (
            <div style={styles.notesMeta}>Loading…</div>
          ) : notesError ? (
            <div style={styles.notesMeta}>Unable to load notes</div>
          ) : (
            <div style={styles.notesMeta}>{notes.length} recent</div>
          )}
        </div>

        {notes.length === 0 && !notesLoading && !notesError ? (
          <div style={styles.notesEmpty}>No clinical notes recorded for this patient.</div>
        ) : (
          <ul style={styles.notesList}>
            {notes.slice(0, 10).map((n) => (
              <li key={n.id} style={styles.notesItem}>
                <div style={styles.notesItemTop}>
                  <span style={styles.notesCategoryBadge}>{n.category || "Note"}</span>
                  {n.mood && <span style={styles.notesMood}>{n.mood}</span>}
                </div>
                <div style={styles.notesItemSub}>
                  <span>{formatWhen(n.createdAt) || "—"}</span>
                  <span> · </span>
                  <span>{n.authorEmail || "—"}</span>
                </div>
                {n.content && (
                  <div style={styles.notesContent}>
                    {n.content}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={styles.incidentCard}>
        <div style={styles.incidentHeader}>
          <div style={styles.incidentTitle}>Incident History</div>
          {incidentsLoading ? (
            <div style={styles.incidentMeta}>Loading…</div>
          ) : (
            <div style={styles.incidentMeta}>{incidents.length} recent</div>
          )}
        </div>

        {incidents.length === 0 && !incidentsLoading ? (
          <div style={styles.incidentEmpty}>No incidents recorded for this patient.</div>
        ) : (
          <ul style={styles.incidentList}>
            {incidents.map((x) => (
              <li key={x.id} style={styles.incidentItem}>
                <div style={styles.incidentItemTop}>
                  <span style={styles.incidentItemTitle}>{x.title || "Incident"}</span>
                  <span style={styles.incidentSeverity}>{(x.severity || "").toUpperCase()}</span>
                </div>
                <div style={styles.incidentItemSub}>
                  <span>{formatWhen(x.occurredAt || x.createdAt) || "—"}</span>
                  <span> · </span>
                  <span>{x.location || "—"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDob(value) {
  if (!value) return "";
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return "";
}

function formatWhen(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString();
    } catch {
      return "";
    }
  }
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
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
    backgroundColor: "#ede9fe",
    color: "#5b21b6",
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
  actionsRow: {
    display: "flex",
    gap: 10,
    marginBottom: 12,
  },
  primaryAction: {
    display: "inline-block",
    padding: "10px 14px",
    backgroundColor: "#005eb8",
    color: "white",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 12,
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  rowLast: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 12,
    padding: "12px 14px",
  },
  label: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
  },
  value: {
    fontSize: 13,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
  clinicalLocked: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    opacity: 0.75,
  },
  clinicalTitle: {
    fontWeight: 900,
    marginBottom: 6,
    color: "#0f172a",
  },
  clinicalText: {
    fontSize: 13,
  },
  incidentCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  incidentHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  incidentTitle: {
    fontWeight: 900,
    color: "#0f172a",
  },
  incidentMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
  },
  incidentEmpty: {
    padding: "12px 14px",
    color: "#334155",
    fontSize: 13,
  },
  incidentList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  incidentItem: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  incidentItemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "baseline",
  },
  incidentItemTitle: {
    fontWeight: 900,
    color: "#0f172a",
    fontSize: 13,
  },
  incidentSeverity: {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "2px 8px",
    borderRadius: 999,
  },
  incidentItemSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
  },
  notesCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  notesHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  notesTitle: {
    fontWeight: 900,
    color: "#0f172a",
  },
  notesMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
  },
  notesEmpty: {
    padding: "12px 14px",
    color: "#334155",
    fontSize: 13,
  },
  notesList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  notesItem: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  notesItemTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  notesCategoryBadge: {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    backgroundColor: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "2px 8px",
    borderRadius: 999,
  },
  notesMood: {
    fontSize: 16,
    lineHeight: 1,
  },
  notesItemSub: {
    marginTop: 6,
    fontSize: 12,
    color: "#475569",
  },
  notesContent: {
    marginTop: 8,
    fontSize: 12,
    color: "#334155",
    whiteSpace: "pre-wrap",
    lineHeight: 1.4,
  },
  backLink: {
    textDecoration: "none",
    color: "#2563eb",
    fontWeight: 800,
    fontSize: 13,
  },
  text: {
    color: "#334155",
    fontFamily: "sans-serif",
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
    fontFamily: "sans-serif",
    maxWidth: 900,
    margin: "0 auto",
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
  },
};

