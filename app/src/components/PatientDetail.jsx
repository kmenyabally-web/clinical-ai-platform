/** [ENABLEMENT GATE: STAGE 5 - PATIENT DETAIL VIEW] */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPatientById, updatePatientStomp } from "../services/patientService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import PatientClinicalIntelligenceTabs from "./PatientClinicalIntelligenceTabs";
import {
  calculateRisk,
  combineRiskWithPhysicalHealth,
  physicalHealthRiskAdjustment,
} from "../utils/riskEngine";
import { fetchPatientAggregateRiskScore } from "../services/aggregatePatientRiskEngine";
import { fetchPatientEarlyWarnings, filterAlertsForRole, sortAlertsBySeverity } from "../services/earlyWarningEngine";
import { formatUkDateTime } from "../utils/dateFormat";
import { useRole } from "../context/RoleContext";
import { requireAdminRole } from "../lib/requireAdminAction";
import { useOrganisation } from "../context/OrganisationContext";
import { logAuditEvent } from "../services/auditService";
import { generateDailySummary } from "../services/summaryService";
import { generateCPAReport } from "../services/reportService";
import { generateMdtWardRoundReport } from "../services/enterpriseReportsService";
import { generateManagementReport } from "../services/managementService";
import GenericSectionedReport from "./GenericSectionedReport";
import { MDT_WARD_SECTION_ORDER, MANAGEMENT_HEARING_SECTION_ORDER } from "../config/enterpriseReportSections";
import { getStompAlerts } from "../utils/stompAlerts";
import { getCqcInsight } from "../utils/cqcInsights";
import { getInspectionInsights } from "../engine/inspectionInsights";
import PatientTasks from "./PatientTasks";
import { getTasksByPatient } from "../services/taskService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import HealthTrendChart from "./HealthTrendChart";
import { buildTrendData, sortObservationsByCreatedAtDesc } from "../utils/healthTrends";
import { detectDeterioration } from "../utils/deterioration";
import { isCareSetting, isClinicalSetting } from "../utils/orgHelpers";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";
import { getWardById } from "../services/structureService";
import { deriveClinicalContext } from "../engine/clinicalContextEngine";

const openedAuditKeys = new Set();

export default function PatientDetail() {
  const { id } = useParams();
  const { isInspectorRole, role: userRole, mdtRole, enterpriseRoleCode } = useRole();
  const { hasFeature, organisationId, hospitalId: profileHospitalId, organisation } = useOrganisation();
  const redactSensitive = isInspectorRole();
  const showRiskUi = hasFeature("risk");
  const showStompUi = hasFeature("stomp");
  const showTasksUi = hasFeature("tasks");
  const showVitalsUi = hasFeature("vitals");

  const orgType = organisation?.type ?? "hospital";
  const careSetting = isCareSetting(orgType);
  const clinicalSetting = isClinicalSetting(orgType);
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [wardType, setWardType] = useState(null);
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

  // Ensures existing report UI works (CPA, AI Reports deep links) and enables additional report flows.
  const [report, setReport] = useState(null);
  const [reportGenLoading, setReportGenLoading] = useState(false);
  const [reportGenError, setReportGenError] = useState(null);

  const [mdtData, setMdtData] = useState(null);
  const [mdtWardRoundLoading, setMdtWardRoundLoading] = useState(false);
  const [mdtWardRoundError, setMdtWardRoundError] = useState(null);

  const [managementReport, setManagementReport] = useState(null);
  const [managementReportLoading, setManagementReportLoading] = useState(false);
  const [managementReportError, setManagementReportError] = useState(null);
  const [stompForm, setStompForm] = useState({ stompMonitoring: false, medications: [] });
  const [stompSaving, setStompSaving] = useState(false);
  const [stompError, setStompError] = useState(null);
  const [stompSaved, setStompSaved] = useState(false);
  const [patientTasks, setPatientTasks] = useState([]);
  const [physicalObservations, setPhysicalObservations] = useState([]);
  const [physicalObsLoading, setPhysicalObsLoading] = useState(false);
  const [aggregateClinicalRisk, setAggregateClinicalRisk] = useState(null);
  const [aggregateClinicalRiskLoading, setAggregateClinicalRiskLoading] = useState(false);
  const [earlyWarnings, setEarlyWarnings] = useState([]);
  const [earlyWarningsLoading, setEarlyWarningsLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const key = `PATIENT_OPENED:${id}`;
    if (openedAuditKeys.has(key)) return;
    openedAuditKeys.add(key);
    void logAuditEvent("PATIENT_OPENED", { patientId: id });
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const p = await getPatientById(id);
        if (mounted) {
          setPatient(p);
          setStompForm({
            stompMonitoring: p?.stompMonitoring === true,
            medications: Array.isArray(p?.medications)
              ? p.medications.map((m) => ({
                  name: m?.name ?? "",
                  indication: m?.indication ?? "",
                  startDate: m?.startDate ?? "",
                  reviewDate: m?.reviewDate ?? "",
                  hasReductionPlan: m?.hasReductionPlan === true,
                  lastReviewedAt: m?.lastReviewedAt ?? "",
                }))
              : [],
          });
        }
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

  // Ward type powers the unified clinical context (LD + MH + ward are always combined).
  useEffect(() => {
    let cancelled = false;
    if (!organisationId || !patient?.wardId) {
      setWardType(null);
      return;
    }
    void getWardById(organisationId, patient.wardId)
      .then((w) => {
        if (!cancelled) setWardType(w?.wardType ?? null);
      })
      .catch(() => {
        if (!cancelled) setWardType(null);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId, patient?.wardId]);

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

  const reloadPatientTasks = useCallback(async () => {
    if (!id || !organisationId || !showTasksUi) {
      setPatientTasks([]);
      return;
    }
    try {
      const list = await getTasksByPatient(id, organisationId);
      setPatientTasks(Array.isArray(list) ? list : []);
    } catch {
      setPatientTasks([]);
    }
  }, [id, organisationId, showTasksUi]);

  useEffect(() => {
    void reloadPatientTasks();
  }, [reloadPatientTasks]);

  useEffect(() => {
    let mounted = true;
    if (!id || !organisationId || !showVitalsUi) {
      setPhysicalObservations([]);
      setPhysicalObsLoading(false);
      return () => {
        mounted = false;
      };
    }
    setPhysicalObsLoading(true);
    listPhysicalObservationsForPatient(organisationId, id, { limitCount: 50 })
      .then((list) => {
        if (!mounted) return;
        setPhysicalObservations(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setPhysicalObservations([]);
      })
      .finally(() => {
        if (!mounted) return;
        setPhysicalObsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, organisationId, showVitalsUi]);

  useEffect(() => {
    if (!showRiskUi || !organisationId || !id) {
      setAggregateClinicalRisk(null);
      setAggregateClinicalRiskLoading(false);
      return;
    }
    let mounted = true;
    setAggregateClinicalRiskLoading(true);
    void fetchPatientAggregateRiskScore(id)
      .then((r) => {
        if (mounted) setAggregateClinicalRisk(r);
      })
      .catch(() => {
        if (mounted) setAggregateClinicalRisk(null);
      })
      .finally(() => {
        if (mounted) setAggregateClinicalRiskLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, organisationId, showRiskUi]);

  useEffect(() => {
    if (!showRiskUi || !organisationId || !id || redactSensitive) {
      setEarlyWarnings([]);
      setEarlyWarningsLoading(false);
      return;
    }
    let mounted = true;
    setEarlyWarningsLoading(true);
    void fetchPatientEarlyWarnings(organisationId, id)
      .then((list) => {
        if (mounted) setEarlyWarnings(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setEarlyWarnings([]);
      })
      .finally(() => {
        if (mounted) setEarlyWarningsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, organisationId, showRiskUi, redactSensitive]);

  const visibleEarlyWarnings = useMemo(
    () =>
      sortAlertsBySeverity(
        filterAlertsForRole(Array.isArray(earlyWarnings) ? earlyWarnings : [], {
          mdtRole,
          role: userRole,
          enterpriseRoleCode,
        })
      ),
    [earlyWarnings, mdtRole, userRole, enterpriseRoleCode]
  );

  const hasHighEarlyWarning =
    !redactSensitive &&
    showRiskUi &&
    visibleEarlyWarnings.some((a) => String(a.severity).toLowerCase() === "high");

  /** Newest first (createdAt DESC) for risk engine, deterioration, and tables. */
  const physicalObsDesc = useMemo(
    () => sortObservationsByCreatedAtDesc(physicalObservations),
    [physicalObservations]
  );

  const risk = useMemo(() => {
    if (!showRiskUi) return { level: "low", score: 0 };
    const base = calculateRisk(notes || []);
    if (!showVitalsUi || !physicalObsDesc?.length) return base;
    const phys = physicalHealthRiskAdjustment(physicalObsDesc);
    return combineRiskWithPhysicalHealth(base, phys);
  }, [notes, showRiskUi, showVitalsUi, physicalObsDesc]);

  const physicalTrendData = useMemo(() => buildTrendData(physicalObsDesc), [physicalObsDesc]);
  const physicalDeteriorationStatus = useMemo(() => detectDeterioration(physicalObsDesc), [physicalObsDesc]);
  const latestPhysical = physicalObsDesc[0] ?? null;

  const latestPhysicalRisk = latestPhysical?.riskLevel;
  const showHighNewsPhysicalBanner =
    clinicalSetting &&
    showVitalsUi &&
    !redactSensitive &&
    String(latestPhysicalRisk).toLowerCase() === "high" &&
    !physicalObsLoading;

  const reportContext = useMemo(() => {
    const oid = organisationId ?? patient?.organisationId ?? null;
    const hid =
      (patient?.hospitalId && String(patient.hospitalId).trim()) ||
      (profileHospitalId && String(profileHospitalId).trim()) ||
      null;
    const orgType = organisation?.type ?? "hospital";
    const clinicalContext = deriveClinicalContext({
      hasLD: patient?.hasLD === true,
      hasMentalHealth: patient?.hasMentalHealth === true,
      wardType,
      organisationType: orgType,
    });
    return { organisationId: oid, hospitalId: hid, clinicalContextBlock: clinicalContext.aiContextBlock };
  }, [
    organisationId,
    patient?.organisationId,
    patient?.hospitalId,
    profileHospitalId,
    wardType,
    patient?.hasLD,
    patient?.hasMentalHealth,
    organisation?.type,
  ]);

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
      const result = await generateMdtWardRoundReport({
        patientId,
        organisationId: reportContext.organisationId,
        notes,
      });
      setMdtData(result || null);
    } catch (e) {
      setMdtWardRoundError(e?.message ?? "Failed to generate MDT Ward Round.");
      setMdtData(null);
    } finally {
      setMdtWardRoundLoading(false);
    }
  }

  const latestNote = useMemo(() => {
    if (!Array.isArray(notes) || notes.length === 0) return null;
    return notes
      .slice()
      .sort((a, b) => {
        const aMs = new Date(a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : a?.createdAt ?? 0).getTime();
        const bMs = new Date(b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : b?.createdAt ?? 0).getTime();
        return bMs - aMs;
      })[0];
  }, [notes]);

  const stompWarnings = useMemo(() => {
    return getStompAlerts({ medications: stompForm.medications });
  }, [stompForm.medications]);
  const stompInspectionInsights = useMemo(
    () =>
      getInspectionInsights({
        patient: { ...patient, medications: stompForm.medications },
        notes,
        policies: [],
        training: [],
        incidents,
        tasks: patientTasks,
        careType: organisation?.type ?? null,
      }),
    [patient, stompForm.medications, notes, incidents, patientTasks, organisation?.type]
  );
  const hasSafeRisk = stompInspectionInsights.some((i) => i.domain === "SAFE");
  const stompInsight = getCqcInsight({
    missingReviewDate: stompWarnings.some((w) => String(w?.text ?? "").toLowerCase().includes("review")),
  });

  function updateMedicationRow(index, field, value) {
    setStompForm((prev) => ({
      ...prev,
      medications: (prev.medications ?? []).map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    }));
    setStompSaved(false);
  }

  function addMedicationRow() {
    setStompForm((prev) => ({
      ...prev,
      medications: [
        ...(prev.medications ?? []),
        { name: "", indication: "", startDate: "", reviewDate: "", hasReductionPlan: false, lastReviewedAt: "" },
      ],
    }));
    setStompSaved(false);
  }

  function removeMedicationRow(index) {
    setStompForm((prev) => ({
      ...prev,
      medications: (prev.medications ?? []).filter((_, i) => i !== index),
    }));
    setStompSaved(false);
  }

  async function saveStompMonitoring() {
    if (!patient?.id) return;
    setStompSaving(true);
    setStompError(null);
    setStompSaved(false);
    try {
      await updatePatientStomp(patient.id, stompForm);
      setPatient((prev) =>
        prev
          ? {
              ...prev,
              stompMonitoring: stompForm.stompMonitoring === true,
              medications: stompForm.medications ?? [],
            }
          : prev
      );
      setStompSaved(true);
    } catch (e) {
      setStompError(e?.message ?? "Failed to save STOMP monitoring.");
    } finally {
      setStompSaving(false);
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
      const result = await generateManagementReport(patientId, reportContext, notes);
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

      {showRiskUi && !redactSensitive && aggregateClinicalRiskLoading ? (
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Loading clinical aggregate risk…</p>
      ) : null}

      {showRiskUi && !redactSensitive && aggregateClinicalRisk && !aggregateClinicalRiskLoading ? (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
              padding: "10px 14px",
              background: "#f1f5f9",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 14 }}>Clinical aggregate risk</span>
            <span
              style={{
                ...styles.riskScore,
                ...(aggregateClinicalRisk.overallRisk === "high"
                  ? styles.riskScoreHigh
                  : aggregateClinicalRisk.overallRisk === "medium"
                    ? styles.riskScoreMedium
                    : styles.riskScoreLow),
                textTransform: "uppercase",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {aggregateClinicalRisk.overallRisk}
            </span>
            <span style={{ fontSize: 14, color: "#475569" }}>
              {aggregateClinicalRisk.trend === "improving"
                ? "↑"
                : aggregateClinicalRisk.trend === "deteriorating"
                  ? "↓"
                  : "→"}{" "}
              {aggregateClinicalRisk.trend}
            </span>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              ABC {aggregateClinicalRisk.behaviourRisk} · Incidents {aggregateClinicalRisk.incidentRisk} · Clinical{" "}
              {aggregateClinicalRisk.clinicalRisk}
            </span>
          </div>
          {aggregateClinicalRisk.riskDrivers?.length ? (
            <div style={{ marginBottom: 12, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
              <strong>Top risk drivers:</strong> {aggregateClinicalRisk.riskDrivers.slice(0, 3).join(" · ")}
            </div>
          ) : null}
        </>
      ) : null}

      {showRiskUi && !redactSensitive && aggregateClinicalRisk?.overallRisk === "high" && !aggregateClinicalRiskLoading ? (
        <div role="alert" style={styles.highRiskBanner}>
          ⚠️ High risk patient — immediate review required
        </div>
      ) : null}

      {showRiskUi && !redactSensitive && earlyWarningsLoading ? (
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Loading early warning alerts…</p>
      ) : null}

      {showRiskUi && !redactSensitive && hasHighEarlyWarning && !earlyWarningsLoading ? (
        <div role="alert" style={styles.highRiskBanner}>
          ⚠️ High-risk patient — review required
        </div>
      ) : null}

      {showRiskUi && !redactSensitive && !earlyWarningsLoading && visibleEarlyWarnings.length > 0 ? (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Early warning alerts (V1)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleEarlyWarnings.map((a) => {
              const s = String(a.severity).toLowerCase();
              const cardStyle =
                s === "high"
                  ? { borderLeft: "4px solid #dc2626", background: "#fef2f2" }
                  : s === "medium"
                    ? { borderLeft: "4px solid #d97706", background: "#fffbeb" }
                    : { borderLeft: "4px solid #16a34a", background: "#f0fdf4" };
              return (
                <div key={a.id} style={{ padding: "8px 10px", borderRadius: 8, ...cardStyle }}>
                  <div style={{ fontWeight: 800, fontSize: 11, textTransform: "uppercase", color: "#475569" }}>
                    {a.severity} · {a.source}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{String(a.type).replace(/_/g, " ")}</div>
                  <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.45 }}>{a.message}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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

      {showHighNewsPhysicalBanner ? (
        <div role="alert" style={styles.highRiskBanner}>
          ⚠️ High NEWS score — immediate clinical review required
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 12,
          marginBottom: 12,
          alignItems: "stretch",
        }}
      >
        <div style={{ ...styles.hubCard, marginBottom: 0 }}>
          <div style={styles.hubTitle}>Patient Hub</div>
          <p style={styles.hubText}>Use quick actions to document care and generate MDT outputs from one place.</p>
          <div style={styles.actionsRow}>
            <Link to="/clinical-notes" style={styles.primaryAction}>
              Add Note
            </Link>
            {showVitalsUi ? (
              <Link to={`/physical-health?patient=${id}`} style={styles.secondaryAction}>
                Physical health
              </Link>
            ) : null}
            <Link to={`/incidents/new/${id}`} style={styles.secondaryAction}>
              Add Incident
            </Link>
            {!careSetting ? (
              <button type="button" onClick={handleMDT} disabled={mdtWardRoundLoading} style={styles.secondaryActionBtn}>
                {mdtWardRoundLoading ? "Generating MDT…" : "MDT"}
              </button>
            ) : null}
          </div>
          <div style={styles.hubLinksRow}>
            <a href="#clinical-intelligence" style={styles.hubLink}>Clinical Intelligence</a>
            <a href="#reports-preview" style={styles.hubLink}>Report Preview</a>
            <a href="#timeline" style={styles.hubLink}>Timeline</a>
          </div>
        </div>

        {showVitalsUi && !redactSensitive ? (
        <div style={{ marginBottom: 0, backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
          <div style={styles.hubTitle}>{careSetting ? "Care monitoring" : "Physical health"}</div>
          {careSetting ? (
            <>
              <p style={{ margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                Log fluids, food, stool, and urine to build care monitoring evidence for this patient.
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 12 }}>
                <Link to={`/physical-health?patient=${id}`} style={styles.backLink}>
                  Open care monitoring →
                </Link>
              </p>
            </>
          ) : physicalObsLoading ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Loading vitals…</p>
          ) : !physicalObsDesc.length ? (
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 13 }}>
              No observations yet.{" "}
              <Link to={`/physical-health?patient=${id}`} style={styles.backLink}>
                Record vitals
              </Link>
            </p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 12, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#475569" }}>
                  Latest NEWS: <strong>{latestPhysical?.newsScore ?? "—"}</strong>
                </span>
                <span style={{ fontSize: 13, color: "#475569" }}>
                  Risk:{" "}
                  <span
                    style={{
                      ...styles.riskScore,
                      ...(String(latestPhysical?.riskLevel).toLowerCase() === "high"
                        ? styles.riskScoreHigh
                        : String(latestPhysical?.riskLevel).toLowerCase() === "medium"
                          ? styles.riskScoreMedium
                          : styles.riskScoreLow),
                    }}
                  >
                    {String(latestPhysical?.riskLevel ?? "—").toUpperCase()}
                  </span>
                </span>
              </div>
              {physicalTrendData.length > 0 ? (
                <HealthTrendChart data={physicalTrendData} status={physicalDeteriorationStatus} showPulse />
              ) : null}
              <p style={{ margin: "10px 0 0", fontSize: 12 }}>
                <Link to={`/physical-health?patient=${id}`} style={styles.backLink}>
                  Full physical health module →
                </Link>
              </p>
            </>
          )}
        </div>
      ) : null}
      </div>

      {latestNote && !redactSensitive ? (
        <div style={styles.insightStrip}>
          <span style={styles.insightTitle}>Latest AI Insight</span>
          <span style={styles.insightBadge}>Mood: {latestNote?.structured?.mood || latestNote?.mood || "N/A"}</span>
          <span style={styles.insightBadge}>Risk: {(latestNote?.structured?.risk || latestNote?.risk || "unknown").toString().toUpperCase()}</span>
          <span style={styles.insightSummary}>{latestNote?.structured?.summary || latestNote?.aiSummary || "No AI summary yet."}</span>
        </div>
      ) : null}

      {notesError ? (
        <div role="status" style={styles.softWarning}>
          Notes could not be fully loaded. You can continue working and try refresh shortly.
        </div>
      ) : null}

      {showRiskUi && !redactSensitive && !notesLoading && !notesError && (
        <div style={styles.riskLegendRow}>
          <span style={{ ...styles.riskPill, ...styles.riskScoreHigh }}>High</span>
          <span style={{ ...styles.riskPill, ...styles.riskScoreMedium }}>Medium</span>
          <span style={{ ...styles.riskPill, ...styles.riskScoreLow }}>Low</span>
        </div>
      )}

      <div style={styles.actionsRow}>
        <Link to={`/incidents/new/${id}`} style={styles.primaryAction}>
          Report Incident
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

      {patient?.id && organisationId && showTasksUi ? (
        <div style={{ marginTop: 16 }}>
          <PatientTasks
            patientId={patient.id}
            organisationId={organisationId}
            tasks={patientTasks}
            onTasksUpdated={reloadPatientTasks}
          />
        </div>
      ) : null}

      {showStompUi ? (
      <div style={styles.stompCard}>
        <div style={styles.stompTitleRow}>
          <h3 style={styles.stompTitle}>STOMP Monitoring</h3>
          <label style={styles.stompToggle}>
            <input
              type="checkbox"
              checked={stompForm.stompMonitoring === true}
              onChange={(e) => {
                setStompForm((prev) => ({ ...prev, stompMonitoring: e.target.checked }));
                setStompSaved(false);
              }}
            />
            <span>Enabled</span>
          </label>
        </div>
        <p style={styles.stompHint}>
          Track psychotropic medications and enforce indication, review date, and reduction planning for LD/autism STOMP governance.
        </p>
        {(stompForm.medications ?? []).map((m, idx) => (
          <div key={`med-${idx}`} style={styles.stompMedicationRow}>
            <input
              placeholder="Medication name"
              value={m.name ?? ""}
              onChange={(e) => updateMedicationRow(idx, "name", e.target.value)}
              style={styles.stompInput}
            />
            <input
              placeholder="Indication *"
              value={m.indication ?? ""}
              onChange={(e) => updateMedicationRow(idx, "indication", e.target.value)}
              style={styles.stompInput}
            />
            <input
              type="date"
              value={m.startDate ?? ""}
              onChange={(e) => updateMedicationRow(idx, "startDate", e.target.value)}
              style={styles.stompInput}
            />
            <input
              type="date"
              value={m.reviewDate ?? ""}
              onChange={(e) => updateMedicationRow(idx, "reviewDate", e.target.value)}
              style={styles.stompInput}
            />
            <label style={styles.stompToggleInline}>
              <input
                type="checkbox"
                checked={m.hasReductionPlan === true}
                onChange={(e) => updateMedicationRow(idx, "hasReductionPlan", e.target.checked)}
              />
              <span>Reduction plan</span>
            </label>
            <button type="button" onClick={() => removeMedicationRow(idx)} style={styles.stompRemoveBtn}>
              Remove
            </button>
          </div>
        ))}
        <div style={styles.stompActions}>
          <button type="button" onClick={addMedicationRow} style={styles.stompAddBtn}>
            Add medication
          </button>
          <button type="button" onClick={saveStompMonitoring} disabled={stompSaving} style={styles.stompSaveBtn}>
            {stompSaving ? "Saving..." : "Save STOMP"}
          </button>
        </div>
        {stompError ? <div style={styles.stompError}>{stompError}</div> : null}
        {stompSaved ? <div style={styles.stompSaved}>STOMP details saved.</div> : null}
        {stompWarnings.length > 0 ? (
          <div role="alert" style={styles.stompWarningBox}>
            <strong>STOMP warnings:</strong>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {stompWarnings.map((w, i) => (
                <li key={`sw-${i}`}>
                  {w.severity === "high" ? "🔴" : "🟡"} {w.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasSafeRisk ? (
          <div className="alert warning" role="alert" style={{ marginTop: 10 }}>
            {"\u26A0\uFE0F"} SAFE domain risks detected - review medication and incidents.
          </div>
        ) : null}
        {stompInsight ? (
          <div
            role="status"
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #fcd34d",
              background: "#fffbeb",
              color: "#92400e",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {stompInsight.message}
          </div>
        ) : null}
      </div>
      ) : null}

      <div style={styles.clinicalLocked}>
        <div style={styles.clinicalTitle}>Clinical Records</div>
        <div style={styles.clinicalText}>
          Stage 5 Access: Clinical data is currently restricted. Upgrade governance
          level to view.
        </div>
      </div>

      {!redactSensitive ? (
        <div id="clinical-intelligence" style={styles.clinicalIntelSection}>
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

            {!careSetting ? (
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
                {mdtData && mdtData.kind === "mdtWardRound" && mdtData.sections ? (
                  <GenericSectionedReport
                    report={mdtData}
                    sectionOrder={MDT_WARD_SECTION_ORDER}
                    filenameBase={`Patient_${patient?.id ?? id}_MDT_Ward_Round`}
                    containerId="patient-detail-mdt-ward-container"
                    printRootClassName="patient-detail-mdt-ward-print"
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <div id="reports-preview" style={styles.reportGeneratorCard}>
            <h3 style={styles.clinicalIntelCardTitle}>Clinical reports</h3>
            <p style={styles.clinicalIntelHint}>
              {careSetting
                ? "Management hearing output (care setting)."
                : "CPA from aggregated notes; Tribunal and RC tribunal use AI Reports (role + discipline)."}
            </p>
            <div style={styles.reportButtonRow}>
              {clinicalSetting ? (
                <>
                  <button
                    type="button"
                    style={styles.clinicalIntelBtn}
                    onClick={handleCPA}
                    disabled={reportGenLoading || !reportContextReady}
                  >
                    {reportGenLoading ? "Generating…" : "Generate CPA Report"}
                  </button>
                  <Link
                    to={
                      (patient?.id ?? id)
                        ? `/reports?patient=${encodeURIComponent(patient?.id ?? id)}`
                        : "/reports"
                    }
                    style={{
                      ...styles.clinicalIntelBtnSecondary,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    AI Reports (Tribunal / RC)
                  </Link>
                </>
              ) : null}
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
                <div style={styles.reportPreviewHeader}>
                  <h3 style={styles.aiSummaryTitle}>Report Preview</h3>
                  <button type="button" style={styles.previewPrintBtn} onClick={() => window.print()}>
                    Print Preview
                  </button>
                </div>
                <pre style={styles.reportPre}>{JSON.stringify(report, null, 2)}</pre>
              </div>
            ) : null}
              {managementReportError ? (
                <div role="alert" style={styles.clinicalIntelError}>
                  {managementReportError}
                </div>
              ) : null}
              {managementReport && managementReport.kind === "managementHearing" && managementReport.sections ? (
                <GenericSectionedReport
                  report={managementReport}
                  sectionOrder={MANAGEMENT_HEARING_SECTION_ORDER}
                  filenameBase={`Patient_${patient?.id ?? id}_Management_Hearing`}
                  containerId="patient-detail-management-hearing-container"
                  printRootClassName="patient-detail-management-hearing-print"
                />
              ) : null}
          </div>
        </div>
      ) : (
        <div style={styles.clinicalIntelSectionMuted}>
          Clinical intelligence is restricted for your role.
        </div>
      )}

      <div id="timeline" style={styles.tabsWrap}>
        <PatientClinicalIntelligenceTabs
          patientId={id}
          notes={notes.slice(0, 50)}
          incidents={incidents.slice(0, 10)}
          notesLoading={notesLoading}
          incidentsLoading={incidentsLoading}
          redactSensitive={redactSensitive}
          formatWhen={formatWhen}
          refreshNotes={refreshNotes}
          organisationType={organisation?.type ?? null}
          hasLD={patient?.hasLD === true}
          hasMentalHealth={patient?.hasMentalHealth === true}
          wardType={wardType}
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
    width: "100%",
    maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
    margin: "0 auto",
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
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  hubCard: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 14px",
  },
  hubTitle: {
    margin: "0 0 4px 0",
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
  },
  hubText: {
    margin: "0 0 10px 0",
    color: "#475569",
    fontSize: 13,
  },
  secondaryAction: {
    display: "inline-block",
    padding: "10px 14px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    border: "1px solid #cbd5e1",
  },
  secondaryActionBtn: {
    display: "inline-block",
    padding: "10px 14px",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    border: "1px solid #cbd5e1",
    cursor: "pointer",
  },
  hubLinksRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  hubLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 12,
  },
  insightStrip: {
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
  },
  insightBadge: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "2px 8px",
  },
  insightSummary: {
    fontSize: 12,
    color: "#475569",
  },
  softWarning: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #fde68a",
    backgroundColor: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    fontWeight: 700,
  },
  riskLegendRow: {
    display: "flex",
    gap: 8,
    marginBottom: 10,
  },
  riskPill: {
    fontSize: 11,
    fontWeight: 900,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid transparent",
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
  reportPreviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  previewPrintBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
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
  stompCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    backgroundColor: "#ffffff",
  },
  stompTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  stompTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
    color: "#0f172a",
  },
  stompHint: {
    margin: "0 0 10px 0",
    color: "#475569",
    fontSize: 13,
  },
  stompToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  stompToggleInline: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 10px",
    backgroundColor: "#fff",
  },
  stompMedicationRow: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1.2fr 0.9fr 0.9fr 0.9fr auto",
    gap: 8,
    marginBottom: 8,
  },
  stompInput: {
    minHeight: 36,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
  },
  stompActions: {
    display: "flex",
    gap: 8,
    marginTop: 8,
  },
  stompAddBtn: {
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  stompSaveBtn: {
    border: "none",
    backgroundColor: "#005eb8",
    color: "#ffffff",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  stompRemoveBtn: {
    border: "1px solid #fecaca",
    backgroundColor: "#fff1f2",
    color: "#9f1239",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  stompWarningBox: {
    marginTop: 10,
    backgroundColor: "#fffbeb",
    border: "1px solid #fcd34d",
    borderRadius: 10,
    color: "#92400e",
    padding: "10px 12px",
    fontSize: 13,
  },
  stompError: {
    marginTop: 10,
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    color: "#991b1b",
    padding: "8px 10px",
    fontSize: 13,
  },
  stompSaved: {
    marginTop: 10,
    backgroundColor: "#ecfdf5",
    border: "1px solid #86efac",
    borderRadius: 10,
    color: "#166534",
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 700,
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
    width: "100%",
    maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
    margin: "0 auto",
    boxSizing: "border-box",
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
  },
};

