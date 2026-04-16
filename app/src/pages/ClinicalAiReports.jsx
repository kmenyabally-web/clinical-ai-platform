import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { buildStandardClinicalReport } from "../utils/buildStandardClinicalReport";
import { exportToPDF } from "../utils/exportPdf";
import { generatePDF } from "../utils/professionalReportPdf";
import { saveClinicalReportDocument } from "../services/savedClinicalReportsService";
import { generateReport, mapDropdownToPipelineType, pipelineTypeToDropdown } from "../services/clinicalReportPipeline";
import { legacyReportToUnified } from "../services/reportEngine";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import { REPORT_TYPES } from "../config/reportConfig";
import {
  REPORT_DISCIPLINE_OPTIONS,
  isPrivilegedReportRole,
  normalizeUserDiscipline,
} from "../utils/reportDiscipline";
import { canAccessTribunalReport } from "../utils/tribunalReportAccess";
import { CPA_DISCIPLINE_OPTIONS, mapCanonicalDisciplineToCpaKey } from "../templates/cpa";
import { usePatients } from "../hooks/usePatients";
import { getReportPipelineValuesForOrganisation, isCareLikeOrganisation } from "../config/documentRegistry";
import { getReportTemplate } from "../utils/reportTemplates";
import { useAppContext } from "../context/AppContext";

function toIsoMillis(value) {
  if (!value) return "";
  const ms = value?.toMillis?.() ?? 0;
  if (!ms) return "";
  return new Date(ms).toISOString();
}

const DROPDOWN_OPTIONS_ALL = [
  { value: "CPA", label: "CPA Report" },
  { value: "Tribunal", label: "Tribunal Report" },
  { value: "Management_Hearing", label: "Management Hearing" },
  { value: "MDT_SUMMARY", label: "MDT Summary" },
  { value: "WEEKLY", label: "Weekly Patient Summary" },
  { value: "MONTHLY", label: "Monthly Patient Summary" },
];

const REPORT_WORKFLOW_DISCIPLINE_OPTIONS = [
  { value: "nursing", label: "Nursing" },
  { value: "responsible_clinician", label: "Responsible Clinician" },
];

const TRIBUNAL_MANAGEMENT_ACCESS_ERROR = "This report is only available for Nurse or Responsible Clinician.";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "1rem 1.1rem",
  marginBottom: 12,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
};

function buildProfessionalSections(reportType, unifiedSections, sectionFallback) {
  const getByNeedle = (needles) => {
    const keys = (Array.isArray(needles) ? needles : []).map((x) => String(x).toLowerCase());
    const hit = (unifiedSections ?? []).find((s) =>
      keys.some((k) => String(s?.heading ?? "").toLowerCase().includes(k))
    );
    return String(hit?.content ?? "").trim() || null;
  };

  if (reportType === "CPA") {
    return [
      "Current Presentation",
      "Physical Health",
      "Risk",
      "Engagement",
      "Recommendation",
    ].map((title, idx) => ({
      heading: title,
      content:
        getByNeedle([title, title.toLowerCase()]) ||
        sectionFallback(title, idx) ||
        "No information recorded.",
    }));
  }

  if (reportType === "MDT_SUMMARY") {
    return [
      "Nursing Summary",
      "Psychiatry Summary",
      "Psychology Summary",
      "OT Summary",
      "SALT Summary",
      "Overall MDT Summary",
    ].map((title, idx) => ({
      heading: title,
      content:
        getByNeedle([title, title.replace(" Summary", ""), title.toLowerCase()]) ||
        sectionFallback(title, idx) ||
        "No information recorded.",
    }));
  }

  if (reportType === "Tribunal") {
    return [
      "Mental State",
      "Risk Summary",
      "Medication Adherence",
      "Legal Status",
      "Recommendation",
    ].map((title, idx) => ({
      heading: title,
      content:
        getByNeedle([title, title.toLowerCase()]) ||
        sectionFallback(title, idx) ||
        "No information recorded.",
    }));
  }

  return (unifiedSections ?? []).map((s) => ({
    heading: String(s?.heading ?? "Section"),
    content: String(s?.content ?? "").trim() || "No information recorded.",
  }));
}

export default function ClinicalAiReports() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    organisationId,
    organisationName,
    organisation,
    userProfile,
    isPlatformAdmin,
    hasFeature,
  } = useOrganisation();
  const { demoMode, patientId: appPatientId } = useAppContext();
  const DEMO_PATIENT_ID = appPatientId ?? "patient001";

  const orgType = organisation?.type ?? "hospital";
  const careSetting = isCareLikeOrganisation(orgType);

  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState(() => (demoMode ? DEMO_PATIENT_ID : ""));
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [reportType, setReportType] = useState("CPA");
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
  const [cpaDisciplineKey, setCpaDisciplineKey] = useState("nurse");
  const [reportWorkflowDiscipline, setReportWorkflowDiscipline] = useState("nursing");
  const [reportMeta, setReportMeta] = useState(null);
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

  const canRunTribunalOrManagement = useMemo(
    () => canAccessTribunalReport(userProfile?.mdtRole, userDiscipline),
    [userProfile?.mdtRole, userDiscipline]
  );

  const dropdownOptions = useMemo(() => {
    const allowed = new Set(getReportPipelineValuesForOrganisation(orgType));
    return DROPDOWN_OPTIONS_ALL.filter((o) => {
      if (!allowed.has(o.value)) return false;
      if (o.value === "Tribunal" && !canRunTribunalOrManagement) return false;
      return true;
    });
  }, [orgType, canRunTribunalOrManagement]);

  useEffect(() => {
    const allowed = getReportPipelineValuesForOrganisation(orgType);
    if (!allowed.includes(reportType)) setReportType(allowed[0] ?? "CPA");
  }, [orgType, reportType]);

  useEffect(() => {
    setCpaDisciplineKey(mapCanonicalDisciplineToCpaKey(userDiscipline));
  }, [userDiscipline]);

  useEffect(() => {
    if (demoMode) {
      setSelectedPatientId(DEMO_PATIENT_ID);
      return;
    }
    const p = (searchParams.get("patient") ?? "").trim();
    if (p) setSelectedPatientId(p);
    const rt = (searchParams.get("reportType") ?? searchParams.get("type") ?? "").trim();
    if (rt === "Tribunal" || rt === "Management_Hearing") setReportType(rt);
  }, [searchParams, demoMode, DEMO_PATIENT_ID]);

  useEffect(() => {
    if (reportType !== "Tribunal" && reportType !== "Management_Hearing") return;
    if (!canRunTribunalOrManagement) return;
    if (showDisciplineSelect) return;
    setReportWorkflowDiscipline(userDiscipline === "nurse" ? "nursing" : "responsible_clinician");
  }, [reportType, userDiscipline, canRunTribunalOrManagement, showDisciplineSelect]);

  const shouldShowCpaDiscipline = !careSetting && reportType === "CPA";
  const shouldShowReportWorkflowDiscipline =
    !careSetting &&
    (reportType === "Tribunal" || reportType === "Management_Hearing") &&
    canRunTribunalOrManagement;

  const effectiveDisciplineForPipeline =
    reportType === "CPA"
      ? cpaDisciplineKey
      : showDisciplineSelect
        ? selectedDiscipline
        : userDiscipline;

  const disciplineForTemplate =
    reportType === "CPA"
      ? cpaDisciplineKey
      : reportType === "MDT_SUMMARY"
        ? null
        : ["WEEKLY", "MONTHLY"].includes(reportType)
          ? null
          : reportType === "Tribunal" || reportType === "Management_Hearing"
            ? reportWorkflowDiscipline
            : effectiveDisciplineForPipeline === "ALL"
              ? null
              : effectiveDisciplineForPipeline;

  const templateSections = getReportTemplate(
    reportType,
    disciplineForTemplate,
    orgType,
    reportType === "Tribunal" ? reportWorkflowDiscipline : null
  );

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
    if (demoMode && String(selectedPatientId) === String(DEMO_PATIENT_ID)) return "Daniel K";
    const p = patientOptions.find((x) => x.id === selectedPatientId);
    return p?.label ?? "Patient";
  }, [patientOptions, selectedPatientId, demoMode, DEMO_PATIENT_ID]);

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
    if (!careSetting && (type === "tribunal" || type === "hearing") && !canRunTribunalOrManagement) {
      setReportError(TRIBUNAL_MANAGEMENT_ACCESS_ERROR);
      setReport(null);
      return;
    }

    reportRunLock.current = true;
    setReportError(null);
    setReportWarning(null);
    setSaveMessage(null);
    setSaveError(null);
    setReport(null);
    setReportMeta(null);
    setGenerating(true);
    setLastGenerated(null);
    setReportType(pipelineTypeToDropdown(String(type)));

    if (import.meta.env.DEV) {
      console.log("Generating report type:", type);
      console.log("Patient:", selectedPatientId);
      console.log("Notes count:", notes?.length ?? 0);
    }

    try {
      const selForPipeline = type === "cpa" ? cpaDisciplineKey : selectedDiscipline;

      const privilegedPick =
        !careSetting && showDisciplineSelect && (type === "tribunal" || type === "hearing");

      const result = await generateReport({
        patientId: selectedPatientId,
        organisationId,
        type,
        notes: notes?.length ? notes : undefined,
        organisation,
        userRole: userProfile?.role ?? userProfile?.systemRole ?? "staff",
        userDiscipline,
        selectedDiscipline: selForPipeline,
        userMdtRole: userProfile?.mdtRole,
        showDisciplineSelect: type === "cpa" ? showDisciplineSelect : false,
        reportDiscipline:
          !careSetting && (type === "tribunal" || type === "hearing")
            ? privilegedPick
              ? reportWorkflowDiscipline
              : undefined
            : undefined,
        organisationName: organisationName ?? null,
        userSystemRole: userProfile?.systemRole ?? null,
        privilegedDisciplinePicker: privilegedPick,
      });
      setReport(result);
      setLastGenerated({ reportType: String(type), noteId: latestNote?.id ?? null, savedToNote: false });
      const isPatientPeriodSummary = type === "weekly" || type === "monthly";
      const typeLabel = isPatientPeriodSummary
        ? type === "weekly"
          ? "Weekly Patient Summary"
          : "Monthly Patient Summary"
        : DROPDOWN_OPTIONS_ALL.find((o) => mapDropdownToPipelineType(o.value) === String(type))?.label ?? String(type);
      const discLabel = isPatientPeriodSummary
        ? null
        : type === "cpa"
          ? CPA_DISCIPLINE_OPTIONS.find((o) => o.value === cpaDisciplineKey)?.label ?? cpaDisciplineKey
          : !careSetting && (type === "tribunal" || type === "hearing")
            ? REPORT_WORKFLOW_DISCIPLINE_OPTIONS.find((o) => o.value === reportWorkflowDiscipline)?.label ??
              reportWorkflowDiscipline
            : REPORT_DISCIPLINE_OPTIONS.find((o) => o.value === userDiscipline)?.label ?? userDiscipline;
      setReportMeta({
        reportTypeLabel: typeLabel,
        disciplineLabel: discLabel,
        roleLabel: userProfile?.mdtRole || userProfile?.role || userProfile?.systemRole || "—",
        at: new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      });
      setReportWarning(null);
    } catch (err) {
      console.error("Report error:", err);
      setReport(legacyReportToUnified({ kind: "simpleText", title: "Report", text: STRUCTURED_CLINICAL_REPORT_TAGLINE }, type));
      setLastGenerated({ reportType: String(type), noteId: latestNote?.id ?? null, savedToNote: false });
      setReportWarning(null);
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
      if (unified) {
        const sectionsForPdf = buildProfessionalSections(
          reportType,
          unifiedSectionsForRender,
          (title, idx) => resolveTemplateSectionContent(title, idx)
        );
        generatePDF({
          fileName: `${base}.pdf`,
          reportType: reportType === "MDT_SUMMARY" ? "MDT Summary" : reportType,
          organisationName: organisationName || "SanctumCare Demo org",
          hospitalName: selectedPatient?.hospitalName || "SanctumCare Main Hospital",
          wardName: selectedPatient?.wardName || "PICU Ward",
          patientName: selectedPatientLabel || "Patient",
          nhsNumber: selectedPatient?.nhsNumber ?? null,
          generatedAt:
            reportMeta?.at ??
            new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
          title: unified.title || "Clinical Report",
          summary: unified.summary || "",
          sections: sectionsForPdf,
        });
      } else {
        await exportToPDF("clinical-ai-report-export", `${base}.pdf`);
      }
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

  const resolveTemplateSectionContent = (sectionTitle, idx) => {
    if (!unified) return "No information recorded";

    if (
      templateSections.length > 0 &&
      unifiedSectionsForRender.length === templateSections.length &&
      unifiedSectionsForRender[idx] != null
    ) {
      const c = unifiedSectionsForRender[idx]?.content;
      if (typeof c === "string" && c.trim()) return c.trim();
    }

    const key = stripTemplateNumber(sectionTitle);

    // Care templates
    if (careSetting) {
      if (key.includes("daily care summary")) return getByHeadingNeedles(["notes summary", "clinical summary"]) ?? unified.summary ?? "Pending...";
      if (key.includes("recommendations")) return unifiedRecommendationsText || getByHeadingNeedles(["recommendation"]) || "Pending...";
      const bestEffort =
        getByHeadingNeedles(["physical", "nutrition", "hydration", "behaviour", "behavior", "risk", "action"]) ?? null;
      return bestEffort ?? "Pending...";
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

    return STRUCTURED_CLINICAL_REPORT_TAGLINE;
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
            disabled={demoMode || patientsLoading || patientOptions.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {!organisationId ? (
              <option value="">Loading organisation...</option>
            ) : patientOptions.length ? (
              <>
                {demoMode && !patientOptions.some((o) => o.id === DEMO_PATIENT_ID) ? (
                  <option value={DEMO_PATIENT_ID}>Daniel K</option>
                ) : null}
                {patientOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </>
            ) : (
              <option value="">{demoMode ? "Daniel K" : "No patients registered yet"}</option>
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

        {shouldShowCpaDiscipline ? (
          showDisciplineSelect ? (
            <label style={{ fontWeight: 900 }}>
              Discipline:
              <select
                value={cpaDisciplineKey}
                onChange={(e) => setCpaDisciplineKey(e.target.value)}
                style={{ marginLeft: 10, padding: "6px 10px" }}
              >
                {CPA_DISCIPLINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span style={{ color: "#64748b", fontSize: 14 }}>
              Discipline: <strong>{CPA_DISCIPLINE_OPTIONS.find((o) => o.value === cpaDisciplineKey)?.label ?? cpaDisciplineKey}</strong> (role-based)
            </span>
          )
        ) : null}

        {shouldShowReportWorkflowDiscipline ? (
          showDisciplineSelect ? (
            <label style={{ fontWeight: 900 }}>
              Report Discipline:
              <select
                value={reportWorkflowDiscipline}
                onChange={(e) => setReportWorkflowDiscipline(e.target.value)}
                style={{ marginLeft: 10, padding: "6px 10px" }}
              >
                {REPORT_WORKFLOW_DISCIPLINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span style={{ color: "#64748b", fontSize: 14 }}>
              Report Discipline:{" "}
              <strong>
                {REPORT_WORKFLOW_DISCIPLINE_OPTIONS.find((o) => o.value === reportWorkflowDiscipline)?.label ??
                  reportWorkflowDiscipline}
              </strong>{" "}
              (role-based)
            </span>
          )
        ) : null}

        <button
          type="button"
          onClick={() => void handleGenerateReport(mapDropdownToPipelineType(reportType))}
          data-demo-guide="generate-cpa-report"
          disabled={
            generating ||
            !selectedPatientId ||
            (!careSetting &&
              (reportType === "Tribunal" || reportType === "Management_Hearing") &&
              !canRunTribunalOrManagement)
          }
          style={{
            padding: "10px 16px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor:
              generating ||
              !selectedPatientId ||
              (!careSetting &&
                (reportType === "Tribunal" || reportType === "Management_Hearing") &&
                !canRunTribunalOrManagement)
                ? "not-allowed"
                : "pointer",
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
      {!demoMode && !patientsLoading && patientOptions.length === 0 && organisationId ? (
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
        <div
          data-demo-guide={String(lastGenerated?.reportType ?? "").toLowerCase() === "cpa" ? "generated-cpa-report" : undefined}
          style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", padding: 12, borderRadius: 10, color: "#166534", marginTop: 14 }}
        >
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
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900 }}>Report Header</h3>
              <div style={{ marginTop: 10, color: "#334155", fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>Organisation Name:</strong> {organisationName || "SanctumCare Demo org"}</div>
                <div><strong>Hospital:</strong> {selectedPatient?.hospitalName || "SanctumCare Main Hospital"}</div>
                <div><strong>Ward:</strong> {selectedPatient?.wardName || "PICU Ward"}</div>
                <div><strong>Patient Name:</strong> {selectedPatientLabel || "Patient"}</div>
                <div><strong>NHS No:</strong> {selectedPatient?.nhsNumber || "Not recorded"}</div>
                <div>
                  <strong>Date:</strong>{" "}
                  {reportMeta?.at ?? new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                <div><strong>Report Type:</strong> {reportType === "MDT_SUMMARY" ? "MDT Summary" : reportType}</div>
              </div>
            </div>
            {reportMeta ? (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <strong>Report Type:</strong> {reportMeta.reportTypeLabel}
                </div>
                {reportMeta.disciplineLabel != null && String(reportMeta.disciplineLabel).trim() !== "" ? (
                  <div>
                    <strong>Discipline:</strong> {reportMeta.disciplineLabel}
                  </div>
                ) : null}
                <div>
                  <strong>Generated by:</strong> {reportMeta.roleLabel}
                </div>
                <div>
                  <strong>Date:</strong> {reportMeta.at}
                </div>
              </div>
            ) : null}
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>{unified.title || "Report"}</h2>
            {unified.summary ? (
              <div style={{ marginBottom: 16, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                <strong>Summary</strong>
                <p style={{ margin: "8px 0 0" }}>{unified.summary}</p>
              </div>
            ) : null}

            {buildProfessionalSections(
              reportType,
              unifiedSectionsForRender,
              (sectionTitle, idx) => resolveTemplateSectionContent(sectionTitle, idx)
            ).map((section, idx) => {
              const content = section.content;
              return (
                <div key={`${section.heading}-${idx}`} style={cardStyle} className="report-section">
                  <h3
                    className="report-section-heading"
                    style={{ margin: "0 0 10px", fontSize: "1.05rem", color: "#0f172a", fontWeight: 800 }}
                  >
                    {section.heading}
                  </h3>
                  <p
                    className="report-section-body"
                    style={{
                      margin: 0,
                      color: "#334155",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.65,
                      marginBottom: 4,
                    }}
                  >
                    {content}
                  </p>
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
        #clinical-ai-report-export .report-section {
          margin-bottom: 4px;
        }
        #clinical-ai-report-export .report-section-body {
          text-align: justify;
          hyphens: auto;
        }
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
            max-width: 100%;
            padding: 12mm 14mm !important;
            background: #fff !important;
            box-sizing: border-box;
          }
          #clinical-ai-report-export .report-section {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 14px;
          }
          #clinical-ai-report-export .report-section-heading {
            font-weight: 800 !important;
            margin-bottom: 8px !important;
          }
          #clinical-ai-report-export .report-section-body {
            line-height: 1.6 !important;
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
          <div style={{ color: "#64748b" }}>
            {notesLoading ? "Loading notes…" : demoMode ? "Loading notes…" : "No clinical notes found for this patient."}
          </div>
        )}
      </div>
    </div>
  );
}
