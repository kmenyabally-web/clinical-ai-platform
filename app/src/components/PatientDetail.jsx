/** [ENABLEMENT GATE: STAGE 5 - PATIENT DETAIL VIEW] */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById } from "../services/patientService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import PatientClinicalIntelligenceTabs from "./PatientClinicalIntelligenceTabs";
import { calculateRisk } from "../utils/riskEngine";
import { formatUkDateTime } from "../utils/dateFormat";
import { useRole } from "../context/RoleContext";
import { requireAdminRole } from "../lib/requireAdminAction";
import { useOrganisation } from "../context/OrganisationContext";
import { logAuditEvent } from "../services/auditService";
import { generateDailySummary } from "../services/summaryService";
import { generateCPAReport, generateTribunalReport } from "../services/reportService";
import { generateMDTReview } from "../services/mdtService";
import { generateManagementReport } from "../services/managementService";

export default function PatientDetail() {
  const { id } = useParams();
  const { isInspectorRole, role: userRole } = useRole();
  const { hasFeature, organisationId, hospitalId: profileHospitalId } = useOrganisation();
  const redactSensitive = isInspectorRole();
  const showRiskUi = hasFeature("risk");
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [mdtSummary, setMdtSummary] = useState("");
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [mdtSummaryLoading, setMdtSummaryLoading] = useState(false);
  const [dailySummaryError, setDailySummaryError] = useState(null);

  // Ensures existing report UI works (CPA/Tribunal) and enables additional report flows.
  const [report, setReport] = useState(null);
  const [reportGenLoading, setReportGenLoading] = useState(false);
  const [reportGenError, setReportGenError] = useState(null);

  const [mdtData, setMdtData] = useState(null);
  const [mdtWardRoundLoading, setMdtWardRoundLoading] = useState(false);
  const [mdtWardRoundError, setMdtWardRoundError] = useState(null);

  const [managementReport, setManagementReport] = useState(null);
  const [managementReportLoading, setManagementReportLoading] = useState(false);
  const [managementReportError, setManagementReportError] = useState(null);

  useEffect(() => {
    if (!id) return;
    void logAuditEvent("PATIENT_OPENED", { patientId: id });
  }, [id]);

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
    fetchClinicalNotesForPatient(id, { limitCount: 50 })
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

  async function refreshNotes() {
    if (!id) return;
    setNotesLoading(true);
    setNotesError(null);
    try {
      const list = await fetchClinicalNotesForPatient(id, { limitCount: 50 });
      setNotes(Array.isArray(list) ? list : []);
    } catch (err) {
      setNotes([]);
      setNotesError(err);
    } finally {
      setNotesLoading(false);
    }
  }

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

  const risk = useMemo(() => {
    if (!showRiskUi) return { level: "low", score: 0 };
    return calculateRisk(notes || []);
  }, [notes, showRiskUi]);

  const reportContext = useMemo(() => {
    const oid = organisationId ?? patient?.organisationId ?? null;
    const hid =
      (patient?.hospitalId && String(patient.hospitalId).trim()) ||
      (profileHospitalId && String(profileHospitalId).trim()) ||
      null;
    return { organisationId: oid, hospitalId: hid };
  }, [organisationId, patient?.organisationId, patient?.hospitalId, profileHospitalId]);

  const reportContextReady = Boolean(
    reportContext.organisationId &&
      reportContext.hospitalId &&
      (patient?.id ?? id)
  );

  async function handleDailySummary() {
    if (!requireAdminRole(userRole)) return;
    if (!id) return;
    setDailySummaryLoading(true);
    setDailySummaryError(null);
    try {
      const summary = await generateDailySummary(id, new Date());
      setAiSummary(summary || "");
    } catch (e) {
      setDailySummaryError(e?.message ?? "Failed to generate daily summary.");
      setAiSummary("");
    } finally {
      setDailySummaryLoading(false);
    }
  }

  async function handleMDTSummary() {
    setMdtSummaryLoading(true);
    try {
      const grouped = {};
      (notes || []).forEach((n) => {
        const role = n.mdtRole || "Unknown";
        if (!grouped[role]) grouped[role] = [];
        grouped[role].push(n.aiSummary || n.correctedText || n.content);
      });
      const parts = Object.entries(grouped).map(([role, texts]) => {
        const body = texts
          .map((t) => String(t ?? "").trim())
          .filter(Boolean)
          .join("\n---\n");
        return `${role}\n${body || "—"}`;
      });
      setMdtSummary(parts.join("\n\n"));
    } finally {
      setMdtSummaryLoading(false);
    }
  }

  async function handleMDT() {
    const patientId = patient?.id ?? id;
    if (!patientId || !reportContext.organisationId) return;

    setMdtWardRoundLoading(true);
    setMdtWardRoundError(null);
    try {
      const result = await generateMDTReview(patientId, reportContext);
      setMdtData(result || null);
    } catch (e) {
      setMdtWardRoundError(e?.message ?? "Failed to generate MDT Ward Round.");
      setMdtData(null);
    } finally {
      setMdtWardRoundLoading(false);
    }
  }

  async function handleCPA() {
    if (!requireAdminRole(userRole)) return;
    const patientId = patient?.id ?? id;
    if (!patientId) return;
    if (!reportContext.organisationId || !reportContext.hospitalId) {
      setReportGenError(
        "Organisation and hospital are required to load notes for this report."
      );
      return;
    }
    setReportGenLoading(true);
    setReportGenError(null);
    try {
      const r = await generateCPAReport(patientId, reportContext);
      setReport(r);
    } catch (e) {
      setReportGenError(e?.message ?? "Failed to generate CPA report.");
    } finally {
      setReportGenLoading(false);
    }
  }

  async function handleTribunal() {
    if (!requireAdminRole(userRole)) return;
    const patientId = patient?.id ?? id;
    if (!patientId) return;
    if (!reportContext.organisationId || !reportContext.hospitalId) {
      setReportGenError(
        "Organisation and hospital are required to load notes for this report."
      );
      return;
    }
    setReportGenLoading(true);
    setReportGenError(null);
    try {
      const r = await generateTribunalReport(patientId, reportContext);
      setReport(r);
    } catch (e) {
      setReportGenError(e?.message ?? "Failed to generate Tribunal report.");
    } finally {
      setReportGenLoading(false);
    }
  }

  async function handleManagement() {
    const patientId = patient?.id ?? id;
    if (!patientId) return;
    if (!reportContext.organisationId) {
      setManagementReportError("Organisation context is missing.");
      return;
    }

    setManagementReportLoading(true);
    setManagementReportError(null);
    try {
      const result = await generateManagementReport(patientId, reportContext);
      setManagementReport(result || null);
    } catch (e) {
      setManagementReportError(e?.message ?? "Failed to generate Management Hearing Report.");
      setManagementReport(null);
    } finally {
      setManagementReportLoading(false);
    }
  }

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

      {showRiskUi && !redactSensitive && !notesLoading && !notesError && (
        <div style={styles.riskStrip}>
          <span style={styles.riskStripLabel}>Behaviour risk</span>
          <span
            style={{
              ...styles.riskScore,
              ...(risk.level === "high"
                ? styles.riskScoreHigh
                : risk.level === "medium"
                  ? styles.riskScoreMedium
                  : styles.riskScoreLow),
            }}
          >
            {risk.level.toUpperCase()} · score {risk.score}
          </span>
        </div>
      )}

      {showRiskUi && !redactSensitive && risk.level === "high" && !notesLoading && !notesError ? (
        <div role="alert" style={styles.highRiskBanner}>
          ⚠️ High Risk — Early intervention required
        </div>
      ) : null}

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
        {(patient?.hospitalName || patient?.hospitalId) ? (
          <div style={styles.row}>
            <div style={styles.label}>Hospital</div>
            <div style={styles.value}>{patient.hospitalName || patient.hospitalId || "—"}</div>
          </div>
        ) : null}
        {(patient?.wardName || patient?.wardId) ? (
          <div style={styles.row}>
            <div style={styles.label}>Ward</div>
            <div style={styles.value}>{patient.wardName || patient.wardId || "—"}</div>
          </div>
        ) : null}
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

      {!redactSensitive ? (
        <div style={styles.clinicalIntelSection}>
          <h2 style={styles.clinicalIntelHeading}>Clinical Intelligence</h2>
          <p style={styles.clinicalIntelIntro}>
            Daily summaries, MDT roll-ups by author clinical role, and structured fields on each note below.
          </p>
          {(reportGenLoading || dailySummaryLoading) ? (
            <p style={{ margin: "0 0 12px 0", fontWeight: 700, color: "#1e1b4b" }} aria-live="polite">
              ⏳ Processing…
            </p>
          ) : null}

          <div style={styles.clinicalIntelRow}>
            <div style={styles.clinicalIntelCard}>
              <h3 style={styles.clinicalIntelCardTitle}>Daily summary</h3>
              <p style={styles.clinicalIntelHint}>Combine AI summaries from today&apos;s notes (tenant-scoped).</p>
              <button
                type="button"
                style={styles.clinicalIntelBtn}
                onClick={handleDailySummary}
                disabled={dailySummaryLoading || !id}
              >
                {dailySummaryLoading ? "Generating…" : "Generate Daily Summary"}
              </button>
              {dailySummaryError ? (
                <div role="alert" style={styles.clinicalIntelError}>
                  {dailySummaryError}
                </div>
              ) : null}
              {aiSummary ? (
                <div style={styles.aiSummaryBox}>
                  <h4 style={styles.aiSummaryTitle}>AI Daily Summary</h4>
                  <p style={styles.aiSummaryText}>{aiSummary}</p>
                </div>
              ) : null}
            </div>

            <div style={styles.clinicalIntelCard}>
              <h3 style={styles.clinicalIntelCardTitle}>MDT summary</h3>
              <p style={styles.clinicalIntelHint}>Group note text by author MDT role (mdtRole).</p>
              <button
                type="button"
                style={styles.clinicalIntelBtnSecondary}
                onClick={handleMDTSummary}
                disabled={mdtSummaryLoading || !(notes?.length)}
              >
                {mdtSummaryLoading ? "Building…" : "Generate MDT Summary"}
              </button>
              {mdtSummary ? (
                <div style={styles.aiSummaryBox}>
                  <h4 style={styles.aiSummaryTitle}>MDT roll-up</h4>
                  <pre style={styles.mdtPre}>{mdtSummary}</pre>
                </div>
              ) : null}

              <div style={{ height: 12 }} />
              <button
                type="button"
                style={styles.clinicalIntelBtn}
                onClick={handleMDT}
                disabled={mdtWardRoundLoading || !reportContext.organisationId}
              >
                {mdtWardRoundLoading ? "Generating…" : "Generate MDT Ward Round"}
              </button>
              {mdtWardRoundError ? (
                <div role="alert" style={styles.clinicalIntelError}>
                  {mdtWardRoundError}
                </div>
              ) : null}
              {mdtData ? (
                <div style={styles.aiSummaryBox}>
                  <h4 style={styles.aiSummaryTitle}>MDT Ward Round</h4>
                  {Object.entries(mdtData).map(([role, notes]) => (
                    <div key={role}>
                      <h4 style={{ margin: "8px 0 6px 0", fontSize: 13, color: "#0f172a", fontWeight: 900 }}>
                        {role}
                      </h4>
                      <ul style={{ margin: "0 0 0 18px", padding: 0 }}>
                        {(notes ?? []).map((n, i) => (
                          <li key={i} style={{ marginBottom: 6 }}>
                            {String(n ?? "")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div style={styles.reportGeneratorCard}>
            <h3 style={styles.clinicalIntelCardTitle}>Clinical reports</h3>
            <p style={styles.clinicalIntelHint}>
              CPA and Tribunal outputs from aggregated notes (organisation + hospital scoped).
            </p>
            <div style={styles.reportButtonRow}>
              <button
                type="button"
                style={styles.clinicalIntelBtn}
                onClick={handleCPA}
                disabled={reportGenLoading || !reportContextReady}
              >
                {reportGenLoading ? "Generating…" : "Generate CPA Report"}
              </button>
              <button
                type="button"
                style={styles.clinicalIntelBtnSecondary}
                onClick={handleTribunal}
                disabled={reportGenLoading || !reportContextReady}
              >
                {reportGenLoading ? "Generating…" : "Generate Tribunal Report"}
              </button>
                <button
                  type="button"
                  style={styles.clinicalIntelBtnSecondary}
                  onClick={handleManagement}
                  disabled={managementReportLoading || !reportContext.organisationId}
                >
                  {managementReportLoading ? "Generating…" : "Generate Management Hearing Report"}
                </button>
            </div>
            {reportGenError ? (
              <div role="alert" style={styles.clinicalIntelError}>
                {reportGenError}
              </div>
            ) : null}
            {report ? (
              <div className="report-box" style={styles.reportBox}>
                <h3 style={styles.aiSummaryTitle}>Generated Report</h3>
                <pre style={styles.reportPre}>{JSON.stringify(report, null, 2)}</pre>
              </div>
            ) : null}
              {managementReportError ? (
                <div role="alert" style={styles.clinicalIntelError}>
                  {managementReportError}
                </div>
              ) : null}
              {managementReport ? (
                <div style={styles.reportBox}>
                  <h3 style={styles.aiSummaryTitle}>Management Hearing Report</h3>
                  <pre style={styles.reportPre}>
                    {JSON.stringify(managementReport, null, 2)}
                  </pre>
                </div>
              ) : null}
          </div>
        </div>
      ) : (
        <div style={styles.clinicalIntelSectionMuted}>
          Clinical intelligence is restricted for your role.
        </div>
      )}

      <div style={styles.tabsWrap}>
        <PatientClinicalIntelligenceTabs
          patientId={id}
          notes={notes.slice(0, 50)}
          incidents={incidents.slice(0, 10)}
          notesLoading={notesLoading}
          incidentsLoading={incidentsLoading}
          redactSensitive={redactSensitive}
          formatWhen={formatWhen}
          refreshNotes={refreshNotes}
        />
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
  return formatUkDateTime(value, "");
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
  riskStrip: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    padding: "10px 14px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
  },
  riskStripLabel: {
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  riskScore: {
    fontSize: 13,
    fontWeight: 900,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #cbd5e1",
  },
  riskScoreLow: {
    color: "#166534",
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
  },
  riskScoreMedium: {
    color: "#92400e",
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  riskScoreHigh: {
    color: "#991b1b",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  highRiskBanner: {
    marginBottom: 14,
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    fontWeight: 900,
    fontSize: 14,
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
  clinicalIntelSection: {
    marginTop: 16,
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid #c7d2fe",
    background: "linear-gradient(180deg, #eef2ff 0%, #ffffff 48%)",
  },
  clinicalIntelHeading: {
    margin: "0 0 6px 0",
    fontSize: 18,
    color: "#1e1b4b",
    fontWeight: 900,
  },
  clinicalIntelIntro: {
    margin: "0 0 14px 0",
    fontSize: 13,
    color: "#475569",
    lineHeight: 1.45,
  },
  clinicalIntelRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  reportGeneratorCard: {
    marginTop: 14,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  reportButtonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  reportBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  reportPre: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: "#334155",
    whiteSpace: "pre-wrap",
    fontFamily: "ui-monospace, Consolas, monospace",
    overflowX: "auto",
  },
  clinicalIntelCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  clinicalIntelCardTitle: {
    margin: "0 0 6px 0",
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
  },
  clinicalIntelHint: {
    margin: "0 0 10px 0",
    fontSize: 12,
    color: "#64748b",
  },
  clinicalIntelBtn: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#4f46e5",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  clinicalIntelBtnSecondary: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #6366f1",
    backgroundColor: "#fff",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  clinicalIntelError: {
    marginTop: 8,
    padding: "8px 10px",
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontSize: 12,
    fontWeight: 700,
  },
  aiSummaryBox: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  aiSummaryTitle: {
    margin: "0 0 6px 0",
    fontSize: 13,
    fontWeight: 900,
    color: "#0f172a",
  },
  aiSummaryText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.5,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
  mdtPre: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.45,
    color: "#334155",
    whiteSpace: "pre-wrap",
    fontFamily: "system-ui, sans-serif",
  },
  clinicalIntelSectionMuted: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  tabsWrap: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
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
  timelinePreviewCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
  },
  timelinePreviewHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    flexWrap: "wrap",
  },
  timelinePreviewTitle: {
    fontWeight: 900,
    color: "#0f172a",
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

