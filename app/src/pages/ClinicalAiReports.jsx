import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import ActionBar from "../components/ActionBar";
import { buildStandardClinicalReport } from "../utils/buildStandardClinicalReport";
import { exportToPDF } from "../utils/exportPdf";
import { saveClinicalReportDocument } from "../services/savedClinicalReportsService";
import {
  generateReport,
  generateFallbackReport,
  mapDropdownToPipelineType,
  pipelineTypeToDropdown,
} from "../services/clinicalReportPipeline";
import { REPORT_TYPES } from "../config/reportConfig";
import {
  REPORT_DISCIPLINE_OPTIONS,
  isPrivilegedReportRole,
  normalizeUserDiscipline,
} from "../utils/reportDiscipline";
import { usePatients } from "../hooks/usePatients";
import { isCareSetting } from "../utils/orgHelpers";
import { getReportTemplate } from "../utils/reportTemplates";

function toIsoMillis(value) {
  if (!value) return "";
  const ms = value?.toMillis?.() ?? 0;
  if (!ms) return "";
  return new Date(ms).toISOString();
}

const DROPDOWN_OPTIONS = [
  { value: "CPA", label: "CPA Report" },
  { value: "Tribunal", label: "Tribunal Report" },
  { value: "Management_Hearing", label: "Management Hearing" },
  { value: "MDT", label: "MDT — ward round" },
  { value: "MDT_CLINICAL", label: "MDT — clinical review" },
  { value: "Summary", label: "Notes summary (all)" },
  { value: "WEEKLY", label: "Weekly summary (7 days)" },
  { value: "MONTHLY", label: "Monthly summary (30 days)" },
];

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "1rem 1.1rem",
  marginBottom: 12,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
};

export default function ClinicalAiReports() {
  const { user } = useAuth();
  const {
    organisationId,
    organisationName,
    organisation,
    userProfile,
    isPlatformAdmin,
    hasFeature,
  } = useOrganisation();

  const careSetting = isCareSetting(organisation?.type);
  const orgType = organisation?.type ?? "hospital";

  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [reportType, setReportType] = useState("CPA");
  const dropdownOptions = useMemo(() => {
    if (!careSetting) return DROPDOWN_OPTIONS;
    // Care settings: discipline-based outputs removed; keep management + general summaries.
    const allowed = new Set(["Management_Hearing"]);
    return DROPDOWN_OPTIONS.filter((o) => allowed.has(o.value));
  }, [careSetting]);

  useEffect(() => {
    if (!careSetting) return;
    const allowed = ["Management_Hearing"];
    if (!allowed.includes(reportType)) setReportType("Management_Hearing");
  }, [careSetting, reportType]);
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportWarning, setReportWarning] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [report, setReport] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = useState("ALL");
  const reportRunLock = useRef(false);

  const showDisciplineSelect = useMemo(
    () =>
      isPrivilegedReportRole(userProfile?.role) ||
      isPrivilegedReportRole(userProfile?.systemRole) ||
      Boolean(isPlatformAdmin),
    [userProfile?.role, userProfile?.systemRole, isPlatformAdmin]
  );

  const userDiscipline = useMemo(
    () => normalizeUserDiscipline(userProfile?.mdtRole, userProfile?.role),
    [userProfile?.mdtRole, userProfile?.role]
  );

  const shouldShowDisciplineScope = !careSetting && ["CPA", "Tribunal", "Management_Hearing"].includes(reportType);
  const effectiveDisciplineForUI = showDisciplineSelect ? selectedDiscipline : userDiscipline;
  const disciplineForTemplate = ["MDT", "MDT_CLINICAL"].includes(reportType) ? null : effectiveDisciplineForUI;
  const templateSections = getReportTemplate(reportType, disciplineForTemplate, orgType);

  const patientOptions = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        id: String(p?.id ?? ""),
        label: `${String(p?.firstName ?? "")} ${String(p?.lastName ?? "")}`.trim() || p?.id || "Patient",
      })),
    [patients]
  );

  useEffect(() => {
    if (!selectedPatientId && patientOptions.length) {
      setSelectedPatientId(patientOptions[0]?.id ?? "");
    }
  }, [patientOptions, selectedPatientId]);

  useEffect(() => {
    let mounted = true;
    async function loadNotes() {
      if (!selectedPatientId) return;
      setNotesLoading(true);
      setNotesError(null);
      try {
        const list = await fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 50 });
        if (!mounted) return;
        setNotes(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setNotesError(e?.message ?? "Failed to load clinical notes.");
        setNotes([]);
      } finally {
        if (!mounted) return;
        setNotesLoading(false);
      }
    }
    loadNotes();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId]);

  const selectedPatientLabel = useMemo(() => {
    const p = patientOptions.find((x) => x.id === selectedPatientId);
    return p?.label ?? "Patient";
  }, [patientOptions, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((p) => String(p?.id ?? "") === String(selectedPatientId)),
    [patients, selectedPatientId]
  );

  const orgTypeLabel = organisation?.type ? String(organisation.type) : "—";

  const standardDocument = useMemo(() => {
    if (!report) return null;
    return buildStandardClinicalReport({
      report,
      notes,
      meta: {
        patient: selectedPatientLabel,
        hospital: selectedPatient?.hospitalName || organisationName || "—",
        ward: selectedPatient?.wardName || "—",
        author: user?.displayName || user?.email || "—",
        pipelineType: lastGenerated?.reportType ?? null,
      },
    });
  }, [report, notes, selectedPatientLabel, selectedPatient, organisationName, user, lastGenerated?.reportType]);

  const latestNote = useMemo(() => {
    const rows = (notes ?? []).slice();
    rows.sort((a, b) => {
      const ta = a?.createdAt?.toMillis?.() ?? 0;
      const tb = b?.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    return rows[0] ?? null;
  }, [notes]);

  /** @param {string} type Pipeline type: weekly | monthly | summary | tribunal | cpa | mdtReview | mdt | hearing */
  async function handleGenerateReport(type) {
    if (reportRunLock.current) return;
    if (!selectedPatientId) {
      window.alert("Select a patient first");
      return;
    }
    if (!organisationId) {
      setReportError("Organisation context is missing.");
      setReport(null);
      setReportWarning(null);
      return;
    }

    reportRunLock.current = true;
    setReportError(null);
    setReportWarning(null);
    setSaveMessage(null);
    setSaveError(null);
    setReport(null);
    setGenerating(true);
    setLastGenerated(null);
    setReportType(pipelineTypeToDropdown(String(type)));

    if (import.meta.env.DEV) {
      console.log("Generating report type:", type);
      console.log("Patient:", selectedPatientId);
      console.log("Notes count:", notes?.length ?? 0);
    }

    try {
      const result = await generateReport({
        patientId: selectedPatientId,
        organisationId,
        type,
        notes: notes?.length ? notes : undefined,
        organisation,
        userRole: userProfile?.role ?? userProfile?.systemRole ?? "staff",
        userDiscipline,
        selectedDiscipline: showDisciplineSelect ? selectedDiscipline : undefined,
      });
      setReport(result);
      setLastGenerated({ reportType: String(type), noteId: latestNote?.id ?? null, savedToNote: false });
    } catch (err) {
      console.error("Report error:", err);
      const fallback = generateFallbackReport(type, notes ?? []);
      setReport(fallback);
      setLastGenerated({ reportType: String(type), noteId: latestNote?.id ?? null, savedToNote: false });
      setReportWarning(
        err?.message
          ? `Report generation issue — showing fallback. (${err.message})`
          : "Report generation issue — showing fallback output."
      );
    } finally {
      setGenerating(false);
      reportRunLock.current = false;
    }
  }

  async function handleSaveReport() {
    if (!standardDocument || !organisationId || !selectedPatientId || !lastGenerated?.reportType) return;
    setSaveLoading(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      await saveClinicalReportDocument({
        organisationId,
        patientId: selectedPatientId,
        type: lastGenerated.reportType,
        document: standardDocument,
      });
      setSaveMessage("Report saved to organisation records.");
    } catch (e) {
      console.error("Save report failed:", e);
      setSaveError(e?.message ?? "Could not save report.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfBusy(true);
    try {
      const base = `${selectedPatientLabel}_${lastGenerated?.reportType ?? reportType}`.replace(/[^a-z0-9-_]/gi, "_");
      await exportToPDF("clinical-ai-report-export", `${base}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  const unified = report?.kind === "unified" ? report : null;

  const unifiedSectionsForRender = Array.isArray(unified?.sections) ? unified.sections : [];
  const unifiedRecommendationsForRender = Array.isArray(unified?.recommendations) ? unified.recommendations : [];
  const stripTemplateNumber = (s) => String(s ?? "").replace(/^\s*\d+\.\s*/u, "").trim().toLowerCase();

  const getByHeadingNeedles = (needles) => {
    const list = Array.isArray(needles) ? needles : [];
    const lowerNeedles = list.map((n) => String(n ?? "").toLowerCase()).filter(Boolean);
    if (!lowerNeedles.length) return null;
    const found = unifiedSectionsForRender.find((sec) => {
      const h = String(sec?.heading ?? "").toLowerCase();
      return lowerNeedles.some((needle) => h.includes(needle));
    });
    return found?.content ?? null;
  };

  const unifiedRecommendationsText =
    unifiedRecommendationsForRender.map((x) => String(x ?? "").trim()).filter(Boolean).join("\n\n") || "";

  const resolveTemplateSectionContent = (sectionTitle) => {
    if (!unified) return "Pending...";

    const key = stripTemplateNumber(sectionTitle);

    // Care templates
    if (careSetting) {
      if (key.includes("daily care summary")) return getByHeadingNeedles(["notes summary", "clinical summary"]) ?? unified.summary ?? "Pending...";
      if (key.includes("recommendations")) return unifiedRecommendationsText || getByHeadingNeedles(["recommendation"]) || "Pending...";
      const bestEffort =
        getByHeadingNeedles(["physical", "nutrition", "hydration", "behaviour", "behavior", "risk", "action"]) ?? null;
      return bestEffort ?? "Pending...";
    }

    // MDT templates
    if (["mdt", "mdt_clinical"].includes(String(reportType ?? "").toLowerCase())) {
      if (key.includes("overall summary")) return unified.summary ?? "Pending...";
      if (key.includes("nursing")) return getByHeadingNeedles(["nursing"]) ?? "Pending...";
      if (key.includes("medical")) return getByHeadingNeedles(["psychiatry", "medical"]) ?? "Pending...";
      if (key.includes("psychology")) return getByHeadingNeedles(["psychology"]) ?? "Pending...";
      if (key.includes("occupational therapy")) return getByHeadingNeedles(["occupational therapy", "occupational"]) ?? "Pending...";
      if (key.includes("speech & language") || key.includes("speech and language")) return getByHeadingNeedles(["speech"]) ?? "Pending...";
      if (key.includes("risk summary")) return unifiedRecommendationsText || "Pending...";
      if (key.includes("plan")) return getByHeadingNeedles(["mdt plan", "plan"]) ?? "Pending...";
      return "Pending...";
    }

    // Discipline templates
    if (key.includes("patient overview")) return getByHeadingNeedles(["patient overview"]) ?? "Pending...";
    if (key.includes("current presentation")) return getByHeadingNeedles(["current presentation"]) ?? "Pending...";
    if (key.includes("key risks")) return getByHeadingNeedles(["risk assessment"]) ?? "Pending...";
    if (key.includes("interventions")) return getByHeadingNeedles(["medication compliance"]) ?? "Pending...";
    if (key.includes("progress")) return getByHeadingNeedles(["mdt observations"]) ?? "Pending...";
    if (key.includes("recommendations")) {
      const clinicalRec = getByHeadingNeedles(["clinical recommendation"]) ?? null;
      return [clinicalRec, unifiedRecommendationsText].filter(Boolean).join("\n\n") || "Pending...";
    }
    if (key.includes("plan")) return getByHeadingNeedles(["legal context"]) ?? "Pending...";

    return "Pending...";
  };

  return (
    <div style={{ padding: "2rem", width: "100%", fontFamily: "sans-serif" }} className="clinical-ai-reports-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>AI Reports</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
            Organisation mode: <strong>{orgTypeLabel}</strong> · Supported types: {REPORT_TYPES.join(", ")}
          </p>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>
            Supports decision-making only
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {hasFeature("vitals") ? (
            <Link
              to={selectedPatientId ? `/physical-health?patient=${selectedPatientId}` : "/physical-health"}
              style={{ color: "#005eb8", fontWeight: 700, textDecoration: "none" }}
            >
              Physical health
            </Link>
          ) : null}
          <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
            Patients
          </Link>
        </div>
      </div>

      <ActionBar
        actions={[
          {
            label: "⚡ Weekly Summary",
            type: "generate",
            onClick: () => void handleGenerateReport("weekly"),
          },
          {
            label: "⚡ Monthly Summary",
            type: "generate",
            onClick: () => void handleGenerateReport("monthly"),
          },
          {
            label: "⚡ Tribunal Report",
            type: "generate",
            onClick: () => void handleGenerateReport("tribunal"),
          },
          {
            label: "⚡ CPA Report",
            type: "generate",
            onClick: () => void handleGenerateReport("cpa"),
          },
          {
            label: "⚡ MDT Ward Round",
            type: "generate",
            onClick: () => void handleGenerateReport("mdt"),
          },
          {
            label: "⚡ Management Hearing",
            type: "generate",
            onClick: () => void handleGenerateReport("hearing"),
          },
        ]}
      />

      {!organisationId ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          Loading organisation...
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
        <label style={{ fontWeight: 900 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || patientOptions.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {!organisationId ? (
              <option value="">Loading organisation...</option>
            ) : patientOptions.length ? (
              patientOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">No patients registered yet</option>
            )}
          </select>
        </label>

        <label style={{ fontWeight: 900 }}>
          Report type:
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {dropdownOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {shouldShowDisciplineScope ? (
          showDisciplineSelect ? (
            <label style={{ fontWeight: 900 }}>
              Discipline scope:
              <select
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                style={{ marginLeft: 10, padding: "6px 10px" }}
              >
                {REPORT_DISCIPLINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span style={{ color: "#64748b", fontSize: 14 }}>
              Your report scope: <strong>{userDiscipline}</strong> (role-based)
            </span>
          )
        ) : null}

        <button
          type="button"
          onClick={() => void handleGenerateReport(mapDropdownToPipelineType(reportType))}
          disabled={generating || !selectedPatientId}
          style={{
            padding: "10px 16px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: generating ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {generating ? "Generating…" : "Generate Report"}
        </button>
      </div>

      {generating ? (
        <p style={{ marginTop: 16, fontWeight: 700, color: "#1e40af" }} role="status">
          Generating report…
        </p>
      ) : null}

      {patientsError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {patientsError}
        </div>
      ) : null}
      {!patientsLoading && patientOptions.length === 0 && organisationId ? (
        <div style={{ color: "#64748b", marginTop: 14, fontSize: "0.95rem" }}>
          No patients registered yet. Add a patient first.
        </div>
      ) : null}

      {notesError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {notesError}
        </div>
      ) : null}

      {notesLoading ? (
        <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }} role="status">
          Loading notes for this patient…
        </p>
      ) : null}

      {lastGenerated ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", padding: 12, borderRadius: 10, color: "#166534", marginTop: 14 }}>
          Generated {lastGenerated.reportType} report
          {lastGenerated.savedToNote ? (
            <>
              . Saved to note: <code>{lastGenerated.noteId}</code>
            </>
          ) : (
            <> (not saved to note)</>
          )}
        </div>
      ) : null}

      {reportError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {reportError}
        </div>
      ) : null}

      {reportWarning ? (
        <p style={{ color: "#c2410c", marginTop: 14, fontWeight: 600 }}>{reportWarning}</p>
      ) : null}

      {saveMessage ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", padding: 12, borderRadius: 10, color: "#166534", marginTop: 14 }}>
          {saveMessage}
        </div>
      ) : null}

      {saveError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {saveError}
        </div>
      ) : null}

      {unified ? (
        <div style={{ marginTop: 24 }}>
          <div
            className="clinical-ai-report-toolbar-no-print"
            style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14, alignItems: "center" }}
          >
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfBusy}
              style={{
                padding: "10px 16px",
                background: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                cursor: pdfBusy ? "wait" : "pointer",
              }}
            >
              {pdfBusy ? "Preparing PDF…" : "Export to PDF"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => void handleSaveReport()}
              disabled={saveLoading || !lastGenerated?.reportType || !standardDocument}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #1976d2",
                background: "#1976d2",
                color: "#fff",
                fontWeight: 800,
                cursor: saveLoading ? "wait" : "pointer",
              }}
            >
              {saveLoading ? "Saving…" : "Save to records"}
            </button>
          </div>

          <div id="clinical-ai-report-export" style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>{unified.title || "Report"}</h2>
            {unified.summary ? (
              <div style={{ marginBottom: 16, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                <strong>Summary</strong>
                <p style={{ margin: "8px 0 0" }}>{unified.summary}</p>
              </div>
            ) : null}

            {templateSections.map((sectionTitle, idx) => {
              const content = resolveTemplateSectionContent(sectionTitle);
              return (
                <div key={`${sectionTitle}-${idx}`} style={cardStyle} className="report-section">
                  <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem", color: "#0f172a" }}>{sectionTitle}</h3>
                  <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{content}</p>
                </div>
              );
            })}

            {unified.recommendations?.length ? (
              <div style={{ ...cardStyle, borderLeft: "4px solid #1976d2" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Recommendations</h3>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#334155" }}>
                  {unified.recommendations.map((line) => (
                    <li key={line} style={{ marginBottom: 6 }}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <style>{`
        @media print {
          .clinical-ai-report-toolbar-no-print { display: none !important; }
          body * { visibility: hidden; }
          #clinical-ai-report-export,
          #clinical-ai-report-export * { visibility: visible; }
          #clinical-ai-report-export {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
          }
        }
      `}</style>

      <div style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 14, marginBottom: 10 }}>Latest note context</h2>
        {latestNote ? (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>{latestNote.discipline}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{toIsoMillis(latestNote.createdAt) || "—"}</div>
            </div>
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "#0f172a", fontSize: 13 }}>
              {(latestNote.correctedNote ?? latestNote.content ?? "").slice(0, 500)}
              {(latestNote.correctedNote ?? latestNote.content ?? "").length > 500 ? "…" : ""}
            </div>
          </div>
        ) : (
          <div style={{ color: "#64748b" }}>{notesLoading ? "Loading notes…" : "No clinical notes found for this patient."}</div>
        )}
      </div>
    </div>
  );
}
