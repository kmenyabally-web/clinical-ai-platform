/** [ENABLEMENT GATE: STAGE 9 - EVIDENCE PACK EXPORT] */

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "../services/auditService";

export default function EvidencePack() {
  const [incidents, setIncidents] = useState([]);
  const [auditRows, setAuditRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    logAuditEventNonBlocking({ action: "EVIDENCE_PACK_GENERATED" }).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const incidentsQ = query(
          collection(db, "incidents"),
          where("organisationId", "==", "dev-org-001"),
          where("severity", "in", ["High", "high", "HIGH"])
        );
        const incidentsSnap = await getDocs(incidentsQ);
        const incDocs = incidentsSnap?.docs ?? [];

        const incidentList = incDocs.map((d) => {
          const x = d?.data?.() ?? {};
          return {
            id: d?.id ?? "",
            title: x.title ?? x.type ?? "Incident",
            severity: x.severity ?? "",
            patientId: x.patientId ?? "",
            occurredAt: x.occurredAt ?? x.reportedAt ?? x.createdAt ?? null,
            regulation:
              x.regulation ??
              guessRegulation(x),
          };
        });

        const auditQ = query(
          collection(db, "audit_logs"),
          orderBy("timestamp", "desc")
        );
        const auditSnap = await getDocs(auditQ);
        const auditDocs = auditSnap?.docs ?? [];
        const audits = auditDocs.map((d) => {
          const x = d?.data?.() ?? {};
          return {
            id: d?.id ?? "",
            timestamp: x.timestamp ?? null,
            action: x.action ?? "",
            userEmail: x.userEmail ?? x.user ?? "",
            metadata: x.metadata ?? {},
          };
        });

        if (!mounted) return;
        setIncidents(incidentList);
        setAuditRows(audits);
      } catch (err) {
        if (!mounted) return;
        setError(err);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const organisationId = "dev-org-001";
  const generatedOn = new Date();
  const generatedDateStr = generatedOn.toLocaleDateString("en-GB");

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return <div style={styles.text}>Generating inspection report…</div>;
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorTitle}>Failed to generate evidence pack</div>
        <div style={styles.errorText}>{error?.message || String(error)}</div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="evidence-pack-root">
      <style>{printCss}</style>
      <div className="print-only" style={styles.printHeader}>
        <div style={styles.printConfidential}>
          CONFIDENTIAL: CQC Compliance Evidence Pack - Generated on {generatedDateStr}
        </div>
        <div style={styles.printOrgId}>Organisation ID: {organisationId}</div>
      </div>

      <header style={styles.header} className="no-print">
        <div>
          <h1 style={styles.title}>Inspection Evidence Pack</h1>
          <p style={styles.subtitle}>
            High-severity incidents for dev-org-001 with same-day audit activity.
          </p>
        </div>
        <button type="button" onClick={handlePrint} style={styles.printButton} className="no-print">
          Export for CQC Inspector
        </button>
      </header>

      {incidents.length === 0 ? (
        <p style={styles.text}>No high-severity incidents recorded for this organisation.</p>
      ) : (
        incidents.map((incident) => {
          const sameDayAudits = auditRows.filter((a) =>
            isSameDay(a.timestamp, incident.occurredAt)
          );
          return (
            <section key={incident.id} style={styles.incidentSection}>
              <h2 style={styles.incidentTitle}>{incident.title}</h2>
              <div style={styles.incidentMetaRow}>
                <span>
                  <strong>Severity:</strong> {String(incident.severity || "").toUpperCase()}
                </span>
                <span>
                  <strong>Patient ID:</strong> {incident.patientId || "—"}
                </span>
                <span>
                  <strong>Date/Time:</strong> {formatWhen(incident.occurredAt) || "—"}
                </span>
              </div>

              <div style={styles.regulationBox}>
                <div style={styles.regulationLabel}>CQC Regulation</div>
                <div style={styles.regulationText}>{incident.regulation}</div>
              </div>

              <div style={styles.auditBlock}>
                <div style={styles.auditHeader}>Same-day audit trail</div>
                {sameDayAudits.length === 0 ? (
                  <p style={styles.auditEmpty}>No audit entries recorded on the same day.</p>
                ) : (
                  <table style={styles.auditTable}>
                    <thead>
                      <tr>
                        <th style={styles.auditTh}>Time</th>
                        <th style={styles.auditTh}>Action</th>
                        <th style={styles.auditTh}>User</th>
                        <th style={styles.auditTh}>Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sameDayAudits.map((a) => (
                        <tr key={a.id}>
                          <td style={styles.auditTd}>{formatTime(a.timestamp) || "—"}</td>
                          <td style={styles.auditTd}>{a.action || "—"}</td>
                          <td style={styles.auditTd}>{a.userEmail || "—"}</td>
                          <td style={styles.auditTd}>{renderMetadata(a.metadata)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div style={styles.inspectorNotes}>
                <label style={styles.textareaLabel}>
                  Management Response/Actions Taken
                </label>
                <textarea style={styles.textarea} rows={4} />
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function formatWhen(value) {
  if (!value) return "";
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString();
    } catch {
      return "";
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatTime(value) {
  if (!value) return "";
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleTimeString();
    } catch {
      return "";
    }
  }
  const d = value instanceof Date ? value : new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString();
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : typeof a?.toDate === "function" ? a.toDate() : new Date(a);
  const db = b instanceof Date ? b : typeof b?.toDate === "function" ? b.toDate() : new Date(b);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function renderMetadata(meta) {
  if (!meta || typeof meta !== "object") return "—";
  const entries = Object.entries(meta);
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function guessRegulation(x) {
  const title = (x.title ?? x.type ?? "").toString().toLowerCase();
  const desc = (x.description ?? "").toString().toLowerCase();
  const combined = `${title} ${desc}`;

  if (combined.includes("medication") || combined.includes("overdose")) {
    return "Regulation 12: Safe care and treatment (medication safety).";
  }
  if (
    combined.includes("governance") ||
    combined.includes("audit") ||
    combined.includes("policy")
  ) {
    return "Regulation 17: Good governance (records, audit, and oversight).";
  }
  if (
    combined.includes("fall") ||
    combined.includes("injury") ||
    combined.includes("environment")
  ) {
    return "Regulation 12: Safe care and treatment (environmental risks).";
  }
  return "Regulation 17: Good governance.";
}

const printCss = `
/* Hidden by default; shown only for printing. */
.print-only {
  display: none;
}

@page {
  size: A4;
  margin: 10mm;
}
@media print {
  body {
    margin: 0;
    background: #fff;
  }
  .no-print {
    display: none !important;
  }
  .top-nav {
    display: none !important;
  }

  /* Hide sidebar + any global layout header. */
  aside[role="complementary"],
  aside,
  header {
    display: none !important;
  }

  .evidence-pack-root {
    padding: 0 !important;
    max-width: none !important;
    width: 210mm !important;
    margin: 0 !important;
    font-size: 12pt !important;
  }

  .print-only {
    display: block !important;
    page-break-after: avoid;
    margin-bottom: 6mm;
  }
}
`;

const styles = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    fontFamily: "serif",
    padding: 16,
    backgroundColor: "#ffffff",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "#111827",
  },
  subtitle: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#4b5563",
  },
  printButton: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #0f172a",
    backgroundColor: "#111827",
    color: "#ffffff",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  incidentSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #e5e7eb",
  },
  incidentTitle: {
    margin: "0 0 4px 0",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#111827",
  },
  incidentMetaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    fontSize: "0.85rem",
    color: "#4b5563",
    marginBottom: 8,
  },
  regulationBox: {
    borderLeft: "4px solid #2563eb",
    paddingLeft: 10,
    marginBottom: 10,
  },
  regulationLabel: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#6b7280",
  },
  regulationText: {
    fontSize: "0.9rem",
    color: "#111827",
  },
  auditBlock: {
    marginTop: 8,
  },
  auditHeader: {
    fontSize: "0.9rem",
    fontWeight: 700,
    marginBottom: 4,
    color: "#111827",
  },
  auditEmpty: {
    fontSize: "0.85rem",
    color: "#4b5563",
  },
  auditTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.8rem",
  },
  auditTh: {
    textAlign: "left",
    padding: "6px 8px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
  },
  auditTd: {
    padding: "6px 8px",
    borderBottom: "1px solid #f3f4f6",
  },
  text: {
    fontFamily: "sans-serif",
    color: "#374151",
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
    fontFamily: "sans-serif",
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
  },
  printHeader: {
    marginBottom: 12,
  },
  printConfidential: {
    fontWeight: 900,
    fontSize: 14,
    color: "#111827",
    marginBottom: 4,
    letterSpacing: "0.01em",
  },
  printOrgId: {
    fontWeight: 800,
    fontSize: 12,
    color: "#111827",
  },
  inspectorNotes: {
    marginTop: 12,
    paddingTop: 10,
    borderTop: "1px dashed #cbd5e1",
  },
  textareaLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 900,
    color: "#111827",
    marginBottom: 6,
  },
  textarea: {
    width: "100%",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    padding: 10,
    fontSize: 12,
    resize: "vertical",
  },
};

