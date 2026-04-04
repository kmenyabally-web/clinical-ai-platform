/** Combined MDT clinical summary from all discipline CPA reports (AI + activity-based risk trend). */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePatients } from "../hooks/usePatients";
import { isCareSetting } from "../utils/orgHelpers";
import { APP_CONFIG } from "../config/appConfig";
import {
  generateMDTSummaryWithActivityTrend,
  MDT_SUMMARY_AI_FALLBACK_MESSAGE,
} from "../services/mdtSummaryEngine";
import {
  buildReportsPayloadFromCpaDocuments,
  createMdtSummaryRecord,
  listMdtSummariesForPatient,
} from "../services/mdtSummariesService";
import { listCpaDisciplineReportsForPatient } from "../services/cpaDisciplineReportService";
import { exportMDTReport } from "../services/exportMDT";

const NO_INFO = "No information recorded";

const NHS_BLUE = "#005EB8";

const controlCard = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

function patientNhs(patient) {
  const n = patient?.nhsNumber;
  if (n == null || String(n).trim() === "") return null;
  return String(n).trim();
}

function wardLine(patient) {
  const w = patient?.wardName || patient?.wardId;
  const h = patient?.hospitalName || patient?.hospitalId;
  const parts = [];
  if (w) parts.push(String(w));
  if (h) parts.push(String(h));
  return parts.length ? parts.join(" · ") : null;
}

function trendMeta(trend) {
  const t = String(trend ?? "").trim().toLowerCase();
  if (t.includes("deteriorat")) {
    return { arrow: "↑", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", label: "Deteriorating" };
  }
  if (t.includes("improv")) {
    return { arrow: "↓", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", label: "Improving" };
  }
  return { arrow: "→", color: "#b45309", bg: "#fffbeb", border: "#fcd34d", label: "Stable" };
}

function riskBadgeLevel(text) {
  const t = String(text ?? "").toLowerCase();
  if (
    /\b(high|critical|severe|significant|urgent|serious|immediate|red)\b/.test(t) ||
    t.includes("suicid") ||
    t.includes("violence")
  ) {
    return "high";
  }
  if (/\b(low|minimal|mild|green)\b/.test(t)) {
    return "low";
  }
  return "moderate";
}

const BADGE_STYLES = {
  high: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", label: "High" },
  moderate: { bg: "#fffbeb", color: "#92400e", border: "#fcd34d", label: "Moderate" },
  low: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "Low" },
};

function ReportSection({ title, children }) {
  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <h2
        style={{
          margin: 0,
          paddingBottom: 12,
          marginBottom: 14,
          borderBottom: "1px solid #e2e8f0",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>
      <div style={{ color: "#334155", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </section>
  );
}

function displayText(value) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length ? s : NO_INFO;
}

export default function MDTSummary() {
  const { organisationId, organisation, organisationName } = useOrganisation();
  const { user } = useAuth();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const careSetting = isCareSetting(organisation?.type);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [reportsPayload, setReportsPayload] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [generatedAtDisplay, setGeneratedAtDisplay] = useState(null);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const loadHistory = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const rows = await listMdtSummariesForPatient(organisationId, selectedPatientId, { limitCount: 12 });
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleGenerate = async () => {
    if (!organisationId || !selectedPatientId) return;
    setBusy(true);
    setError(null);
    setLastSavedId(null);
    const now = new Date();
    setGeneratedAtDisplay(now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }));
    try {
      const cpaRows = await listCpaDisciplineReportsForPatient(organisationId, selectedPatientId, { limitCount: 50 });
      const payload = buildReportsPayloadFromCpaDocuments(cpaRows);
      setReportsPayload(payload);

      const result = await generateMDTSummaryWithActivityTrend(payload, selectedPatientId);
      setSummary(result);

      const id = await createMdtSummaryRecord({
        organisationId,
        patientId: selectedPatientId,
        reportsUsed: payload,
        summary: result,
        createdBy: user?.uid ?? null,
      });
      setLastSavedId(id);
      await loadHistory();
    } catch (e) {
      setError(e?.message ?? "Generation failed");
      setSummary(null);
    } finally {
      setBusy(false);
    }
  };

  const handleExportPdf = async () => {
    setExportBusy(true);
    try {
      const safe = safeName(selectedPatient).replace(/[^\w\s-]/g, "").slice(0, 40);
      const d = new Date().toISOString().slice(0, 10);
      await exportMDTReport("mdt-report", `MDT_Report_${safe || "Patient"}_${d}.pdf`);
    } catch (e) {
      setError(e?.message ?? "PDF export failed");
    } finally {
      setExportBusy(false);
    }
  };

  const trend = summary ? trendMeta(summary.riskTrend) : trendMeta("Stable");
  const isAiFailure =
    summary &&
    typeof summary.overallSummary === "string" &&
    summary.overallSummary.includes(MDT_SUMMARY_AI_FALLBACK_MESSAGE);

  const reportDateLabel =
    generatedAtDisplay ??
    (summary ? new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null);

  if (!organisationId) {
    return (
      <div style={{ padding: 24 }}>
        <p>Select an organisation.</p>
      </div>
    );
  }

  if (careSetting) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <h1 style={{ marginTop: 0 }}>MDT summary</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          Combined MDT summaries from discipline CPA reports are intended for mental health–style pathways. Use other
          MDT tools in AI Reports where appropriate.
        </p>
        <Link to="/reports" style={{ color: "#2563eb", fontWeight: 800 }}>
          Open AI Reports →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0", maxWidth: 960 }}>
      <style>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .mdt-report-print-root {
            box-shadow: none !important;
          }
          .mdt-discipline-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 720px) {
          .mdt-discipline-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0, color: "#0f172a" }}>MDT clinical summary</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", maxWidth: 760, lineHeight: 1.55 }}>
          Pulls the <strong>latest saved text</strong> from each discipline CPA report for this patient, runs one AI pass
          into structured JSON, and sets <strong>risk trend</strong> from recent vs prior incident and behaviour counts
          (14-day windows).
        </p>
        <p style={{ color: "#92400e", margin: "10px 0 0", fontSize: 14 }}>
          Supports decision-making only. Verify against the clinical record and CPA sources.
        </p>
      </div>

      <div className="no-print" style={controlCard}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Controls</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Select patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setSummary(null);
                setReportsPayload(null);
                setLastSavedId(null);
                setGeneratedAtDisplay(null);
              }}
              style={{ minWidth: 260, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">—</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {safeName(p)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!selectedPatientId || busy}
            onClick={() => void handleGenerate()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: selectedPatientId && !busy ? "#0f766e" : "#94a3b8",
              color: "#fff",
              fontWeight: 800,
              cursor: selectedPatientId && !busy ? "pointer" : "not-allowed",
            }}
          >
            {busy ? "Generating…" : "Generate & save MDT summary"}
          </button>
          <button
            type="button"
            disabled={!selectedPatientId || exportBusy}
            onClick={() => void handleExportPdf()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: `2px solid ${NHS_BLUE}`,
              background: "#fff",
              color: NHS_BLUE,
              fontWeight: 800,
              cursor: selectedPatientId && !exportBusy ? "pointer" : "not-allowed",
            }}
          >
            {exportBusy ? "Exporting…" : "Export MDT Report"}
          </button>
        </div>
        {patientsLoading ? <p style={{ color: "#64748b", marginTop: 10 }}>Loading patients…</p> : null}
        {patientsError ? <p style={{ color: "#b91c1c", marginTop: 10 }}>{patientsError}</p> : null}
        {error ? <p style={{ color: "#b91c1c", marginTop: 10 }}>{error}</p> : null}
        {lastSavedId ? (
          <p style={{ color: "#15803d", marginTop: 10, fontSize: 13 }}>
            Saved to <code style={{ fontSize: 12 }}>mdt_summaries/{lastSavedId.slice(0, 8)}…</code>
          </p>
        ) : null}
      </div>

      {reportsPayload ? (
        <div className="no-print" style={controlCard}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>CPA sources detected</h2>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            {["nursing", "psychiatry", "psychology", "occupational_therapy", "salt"].map((k) => (
              <li key={k}>
                <strong>{k}:</strong>{" "}
                {reportsPayload[k] ? `${String(reportsPayload[k]).slice(0, 120)}…` : "— none —"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        id="mdt-report"
        className="mdt-report-print-root"
        style={{
          background: "#f1f5f9",
          padding: 24,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <header
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            border: "1px solid #e2e8f0",
            borderTop: `4px solid ${NHS_BLUE}`,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: NHS_BLUE, letterSpacing: "-0.02em" }}>
                {APP_CONFIG.name}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Multi-disciplinary team — clinical summary</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
              <div>
                <strong>Date generated:</strong> {reportDateLabel ?? "—"}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
              display: "grid",
              gap: 8,
              fontSize: 14,
              color: "#0f172a",
            }}
          >
            <div>
              <strong>Patient name:</strong> {selectedPatient ? safeName(selectedPatient) : NO_INFO}
            </div>
            <div>
              <strong>NHS number:</strong> {patientNhs(selectedPatient) ?? NO_INFO}
            </div>
            <div>
              <strong>Ward / site:</strong> {wardLine(selectedPatient) ?? NO_INFO}
            </div>
            <div>
              <strong>Organisation:</strong> {organisationName?.trim() || NO_INFO}
            </div>
          </div>
        </header>

        <ReportSection title="Overall Clinical Summary">
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.overallSummary) : NO_INFO}</p>
          {isAiFailure ? (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: "#b45309" }}>{MDT_SUMMARY_AI_FALLBACK_MESSAGE}</p>
          ) : null}
        </ReportSection>

        <div
          className="mdt-discipline-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <ReportSection title="Nursing Summary">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.nursing) : NO_INFO}</p>
          </ReportSection>
          <ReportSection title="Psychiatry Summary">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.psychiatry) : NO_INFO}</p>
          </ReportSection>
          <ReportSection title="Psychology Summary">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.psychology) : NO_INFO}</p>
          </ReportSection>
          <ReportSection title="Occupational Therapy Summary">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.ot) : NO_INFO}</p>
          </ReportSection>
          <div style={{ gridColumn: "1 / -1" }}>
            <ReportSection title="Speech & Language Summary">
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{summary ? displayText(summary.salt) : NO_INFO}</p>
            </ReportSection>
          </div>
        </div>

        <ReportSection title="Key Risks">
          {summary && Array.isArray(summary.keyRisks) && summary.keyRisks.length ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {summary.keyRisks.map((r, i) => {
                const level = riskBadgeLevel(r);
                const b = BADGE_STYLES[level];
                return (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: b.bg,
                      border: `1px solid ${b.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: b.color,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "#fff",
                        border: `1px solid ${b.border}`,
                      }}
                    >
                      {b.label}
                    </span>
                    <span style={{ color: "#0f172a", flex: "1 1 200px" }}>{r}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>{NO_INFO}</p>
          )}
        </ReportSection>

        <ReportSection title="Risk Trend">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 18px",
              borderRadius: 10,
              background: trend.bg,
              border: `1px solid ${trend.border}`,
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: trend.color, lineHeight: 1 }}>{trend.arrow}</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Activity-based (14-day windows)
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: trend.color }}>{trend.label}</div>
            </div>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}>
            ↑ Deteriorating (red) · → Stable (amber) · ↓ Improving (green). Based on incidents and behaviour logs vs
            prior period.
          </p>
        </ReportSection>

        <ReportSection title="MDT Recommendations">
          {summary && Array.isArray(summary.recommendations) && summary.recommendations.length ? (
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {summary.recommendations.map((r, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {r}
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ margin: 0 }}>{NO_INFO}</p>
          )}
        </ReportSection>

        <ReportSection title="Care Plan Adjustments">
          {summary && Array.isArray(summary.carePlanChanges) && summary.carePlanChanges.length ? (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {summary.carePlanChanges.map((r, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>{NO_INFO}</p>
          )}
        </ReportSection>

        <footer
          style={{
            marginTop: 8,
            padding: "16px 20px",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            color: "#64748b",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>
            Generated by <strong style={{ color: NHS_BLUE }}>{APP_CONFIG.name}</strong>
          </span>
          <span>{new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
        </footer>
      </div>

      <div className="no-print" style={controlCard}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Saved summaries</h2>
        {historyLoading ? (
          <p style={{ color: "#64748b" }}>Loading…</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#64748b" }}>No saved MDT summaries for this patient yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#334155" }}>
            {history.map((h) => (
              <li key={h.id} style={{ marginBottom: 8 }}>
                <code style={{ fontSize: 12 }}>{h.id.slice(0, 10)}…</code>
                {organisationName ? <span style={{ color: "#94a3b8" }}> · {organisationName}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="no-print" style={{ marginTop: 8 }}>
        <Link to="/reports" style={{ color: "#2563eb", fontWeight: 700, marginRight: 16 }}>
          AI Reports (CPA & MDT) →
        </Link>
        <Link to="/reports" style={{ color: "#64748b", fontWeight: 700 }}>
          AI Reports →
        </Link>
      </div>
    </div>
  );
}
