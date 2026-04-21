import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Activity, ShieldCheck } from "lucide-react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { getComplianceScore } from "../services/complianceEngine";
import { formatUkDateTime } from "../utils/dateFormat";
import { getLatestSimulation, getInspectionRiskLevel } from "../services/inspectionSimulator";
import { listPatients } from "../services/patientService";
import { fetchIncidents } from "../services/incidentService";
import { fetchDocuments } from "../services/documentService";
import { countCarePlansDueForReview } from "../services/carePlanManagementService";
import { listCarePlansForOrganisation } from "../services/carePlanManagementService";
import { listPolicies } from "../services/policyService";
import { listStaffTraining } from "../services/staffTrainingService";
import { fetchClinicalNotesForOrganisation } from "../services/noteService";
import ComplianceScoreCard from "../components/ComplianceScoreCard";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { logAuditEventNonBlocking } from "../services/auditService";
import InspectionInsightsPanel from "../components/InspectionInsightsPanel";
import DomainScoreCards from "../components/DomainScoreCards";
import InspectionTrendChart from "../components/InspectionTrendChart";
import InspectionPredictionCard from "../components/InspectionPredictionCard";
import {
  calculateDomainScores,
  calculateOverallScore,
  getInspectionInsights,
} from "../engine/inspectionInsights";
import {
  explainPrediction,
  predictInspectionRisk,
} from "../engine/inspectionPredictor";
import { getInspectionAlerts } from "../utils/inspectionAlerts";
import { getTrend } from "../utils/inspectionTrend";
import {
  listInspectionScores,
  saveInspectionScore,
} from "../services/inspectionScoreService";
import { listRecentRiskScoreSnapshots } from "../services/riskScoreHistoryService";
import { listRecentAlertSnapshots, parseStoredAlerts } from "../services/alertHistoryService";
import { filterAlertsForRole, sortAlertsBySeverity } from "../services/earlyWarningEngine";
import { useRole } from "../context/RoleContext";
import { getInspectionSimulationSnapshot } from "../services/inspectionSimulationService";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAppContext } from "../context/AppContext";
import { getCapacityDashboardStats } from "../services/capacityAssessmentService";
import { getLibertySafeguardsDashboardStats, listDolsAlertsForOrganisation } from "../services/libertySafeguardsService";

function earlyWarningCardStyle(severity) {
  const s = String(severity ?? "").toLowerCase();
  if (s === "high") return { borderLeft: "4px solid #dc2626", background: "#fef2f2" };
  if (s === "medium") return { borderLeft: "4px solid #d97706", background: "#fffbeb" };
  return { borderLeft: "4px solid #16a34a", background: "#f0fdf4" };
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function complianceStatusFromScore(score) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Requires Improvement";
  return "Risk";
}

export default function Dashboard() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { mdtRole, role: rbacRole, enterpriseRoleCode } = useRole();
  const { demoMode } = useAppContext();

  const DEMO_PATIENT_ID = "patient001";
  const DEMO_ORG_ID = "demo-org";

  const DEMO_RISK_SCORE_FEED = [
    {
      id: "demo-risk-1",
      patientId: DEMO_PATIENT_ID,
      organisationId: DEMO_ORG_ID,
      overallRisk: "High",
      score: 92,
      trend: "improving",
      drivers: ["High incident density", "Safeguarding vulnerability"],
      behaviourRisk: 30,
      incidentRisk: 32,
      clinicalRisk: 30,
      createdAt: "2026-04-16T12:00:00.000Z",
    },
    {
      id: "demo-risk-2",
      patientId: DEMO_PATIENT_ID,
      organisationId: DEMO_ORG_ID,
      overallRisk: "Medium",
      score: 78,
      trend: "deteriorating",
      drivers: ["Medication non-adherence", "ABC escalation signals"],
      behaviourRisk: 26,
      incidentRisk: 28,
      clinicalRisk: 24,
      createdAt: "2026-04-16T06:00:00.000Z",
    },
  ];

  const DEMO_ALERT_FEED = [
    {
      id: "demo-alert-snap-1",
      patientId: DEMO_PATIENT_ID,
      organisationId: DEMO_ORG_ID,
      createdAt: "2026-04-16T12:00:00.000Z",
      alerts: [
        {
          id: "demo-alert-a1",
          type: "verbal_aggression",
          severity: "high",
          message: "Daniel K shows recurrent verbal aggression incidents without effective de-escalation.",
          source: "nursing",
        },
      ],
    },
  ];

  const DEMO_INSPECTION_READINESS = {
    overallScore: 82,
    rating: "Good",
    domains: {
      Safe: 86,
      Effective: 80,
      Caring: 74,
      Responsive: 68,
      WellLed: 66,
    },
    warnings: ["Review safeguarding documentation completeness for the last 30 days."],
  };

  const DEMO_COMPLIANCE_SCORE = {
    overallScore: 68,
    safeScore: 65,
    effectiveScore: 66,
    caringScore: 69,
    responsiveScore: 68,
    wellLedScore: 60,
  };

  const DEMO_RECENT_INCIDENTS = [
    {
      id: "demo-incident-1",
      title: "Aggression episode (verbal) — Daniel K",
      severity: "high",
      status: "open",
      createdAt: "2026-04-16T12:00:00.000Z",
      patientId: DEMO_PATIENT_ID,
    },
    {
      id: "demo-incident-2",
      title: "Safeguarding concern — Daniel K",
      severity: "medium",
      status: "open",
      createdAt: "2026-04-16T06:00:00.000Z",
      patientId: DEMO_PATIENT_ID,
    },
  ];

  const [incidentStatsLoading, setIncidentStatsLoading] = useState(demoMode ? false : true);
  const [incidentStats, setIncidentStats] = useState(
    demoMode
      ? { totalIncidents: DEMO_RECENT_INCIDENTS.length, highSeverityIncidents: 1, pendingActions: 2 }
      : { totalIncidents: 0, highSeverityIncidents: 0, pendingActions: 0 }
  );
  const [recentIncidents, setRecentIncidents] = useState(demoMode ? DEMO_RECENT_INCIDENTS : []);
  const [auditLogsCountLoading, setAuditLogsCountLoading] = useState(true);
  const [auditLogsCount, setAuditLogsCount] = useState(0);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    openIncidents: 0,
    safeguardingAlerts: 0,
    documentsUploaded: 0,
    carePlansDue: 0,
  });
  const [capacityMetricsLoading, setCapacityMetricsLoading] = useState(true);
  const [capacityMetrics, setCapacityMetrics] = useState({
    assessmentsDue: 0,
    patientsLackingCapacity: 0,
    highRiskDecisions: 0,
  });
  const [dolsMetricsLoading, setDolsMetricsLoading] = useState(true);
  const [dolsMetrics, setDolsMetrics] = useState({
    activeSafeguards: 0,
    expiringNext30Days: 0,
    overdue: 0,
  });
  const [dolsAlerts, setDolsAlerts] = useState([]);
  const [carePlanRows, setCarePlanRows] = useState([]);
  const [complianceScore, setComplianceScore] = useState(demoMode ? DEMO_COMPLIANCE_SCORE : null);
  const [complianceLoading, setComplianceLoading] = useState(demoMode ? false : true);
  const [complianceError, setComplianceError] = useState(null);
  const [inspectionRiskLevel, setInspectionRiskLevel] = useState(null);
  const [inspectionDataLoading, setInspectionDataLoading] = useState(true);
  const [inspectionReadiness, setInspectionReadiness] = useState(demoMode ? DEMO_INSPECTION_READINESS : null);
  const [inspectionReadinessLoading, setInspectionReadinessLoading] = useState(demoMode ? false : true);
  const [inspectionData, setInspectionData] = useState({
    patient: null,
    notes: [],
    policies: [],
    training: [],
    incidents: [],
  });
  const [scoreHistory, setScoreHistory] = useState([]);
  const [savingScore, setSavingScore] = useState(false);

  const [riskScoreFeed, setRiskScoreFeed] = useState(demoMode ? DEMO_RISK_SCORE_FEED : []);
  const [riskScoreFeedLoading, setRiskScoreFeedLoading] = useState(false);

  const [alertFeed, setAlertFeed] = useState(demoMode ? DEMO_ALERT_FEED : []);
  const [alertFeedLoading, setAlertFeedLoading] = useState(false);

  const currentServiceName =
    Array.isArray(services) && services.length > 0 && currentServiceId
      ? (services.find((s) => s?.id === currentServiceId)?.serviceName ||
          services.find((s) => s?.id === currentServiceId)?.name) ?? "Current service"
      : "All services";

  useEffect(() => {
    logAuditEventNonBlocking({ action: "DASHBOARD_REPORTS_GENERATED" }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRiskFeed() {
      if (!organisationId) {
        setRiskScoreFeed(demoMode ? DEMO_RISK_SCORE_FEED : []);
        setRiskScoreFeedLoading(false);
        return;
      }
      setRiskScoreFeedLoading(true);
      try {
        const rows = await listRecentRiskScoreSnapshots(organisationId, { limitCount: 20 });
        if (!cancelled) {
          const list = Array.isArray(rows) ? rows : [];
          setRiskScoreFeed(list.length ? list : demoMode ? DEMO_RISK_SCORE_FEED : []);
        }
      } catch {
        if (!cancelled) setRiskScoreFeed(demoMode ? DEMO_RISK_SCORE_FEED : []);
      } finally {
        if (!cancelled) setRiskScoreFeedLoading(false);
      }
    }
    void loadRiskFeed();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadDolsAlerts() {
      if (!organisationId) {
        setDolsAlerts([]);
        return;
      }
      const rows = await listDolsAlertsForOrganisation(organisationId, { limitCount: 500 }).catch(() => []);
      if (!cancelled) setDolsAlerts(Array.isArray(rows) ? rows : []);
    }
    void loadDolsAlerts();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadDolsMetrics() {
      if (!organisationId) {
        setDolsMetrics({ activeSafeguards: 0, expiringNext30Days: 0, overdue: 0 });
        setDolsMetricsLoading(false);
        return;
      }
      setDolsMetricsLoading(true);
      try {
        const stats = await getLibertySafeguardsDashboardStats(organisationId);
        if (!cancelled) {
          setDolsMetrics({
            activeSafeguards: Number(stats?.activeSafeguards ?? 0),
            expiringNext30Days: Number(stats?.expiringNext30Days ?? 0),
            overdue: Number(stats?.overdue ?? 0),
          });
        }
      } catch {
        if (!cancelled) setDolsMetrics({ activeSafeguards: 0, expiringNext30Days: 0, overdue: 0 });
      } finally {
        if (!cancelled) setDolsMetricsLoading(false);
      }
    }
    void loadDolsMetrics();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAlertFeed() {
      if (!organisationId) {
        setAlertFeed(demoMode ? DEMO_ALERT_FEED : []);
        setAlertFeedLoading(false);
        return;
      }
      setAlertFeedLoading(true);
      try {
        const rows = await listRecentAlertSnapshots(organisationId, { limitCount: 15 });
        if (!cancelled) {
          const list = Array.isArray(rows) ? rows : [];
          setAlertFeed(list.length ? list : demoMode ? DEMO_ALERT_FEED : []);
        }
      } catch {
        if (!cancelled) setAlertFeed(demoMode ? DEMO_ALERT_FEED : []);
      } finally {
        if (!cancelled) setAlertFeedLoading(false);
      }
    }
    void loadAlertFeed();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInspectionReadiness() {
      if (!organisationId) {
        setInspectionReadiness(demoMode ? DEMO_INSPECTION_READINESS : null);
        setInspectionReadinessLoading(false);
        return;
      }
      setInspectionReadinessLoading(true);
      try {
        const snap = await getInspectionSimulationSnapshot(organisationId);
        if (!cancelled) setInspectionReadiness(snap ?? (demoMode ? DEMO_INSPECTION_READINESS : null));
      } catch {
        if (!cancelled) setInspectionReadiness(demoMode ? DEMO_INSPECTION_READINESS : null);
      } finally {
        if (!cancelled) setInspectionReadinessLoading(false);
      }
    }

    void loadInspectionReadiness();
    const t = window.setInterval(() => void loadInspectionReadiness(), 90_000);
    function onVisibility() {
      if (document.visibilityState === "visible" && organisationId) void loadInspectionReadiness();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadIncidentStats() {
      if (!organisationId) {
        setIncidentStats(
          demoMode
            ? { totalIncidents: DEMO_RECENT_INCIDENTS.length, highSeverityIncidents: 1, pendingActions: 2 }
            : { totalIncidents: 0, highSeverityIncidents: 0, pendingActions: 0 }
        );
        setRecentIncidents(demoMode ? DEMO_RECENT_INCIDENTS : []);
        setIncidentStatsLoading(false);
        return;
      }
      setIncidentStatsLoading(true);
      try {
        const q = query(
          collection(db, "incidents"),
          where("organisationId", "==", organisationId)
        );
        const snapshot = await getDocs(q);
        const docs = snapshot?.docs ?? [];

        const list = docs.map((d) => {
          const x = d?.data?.() ?? {};
          return { id: d?.id ?? "", ...x };
        });

        const normalizeSeverity = (s) => (s ?? "").toString().trim().toLowerCase();
        const isHigh = (s) => normalizeSeverity(s) === "high";

        const totalIncidents = list.length;
        const highSeverityIncidents = list.filter((i) => isHigh(i?.severity)).length;
        const pendingActions = list.filter((i) => (i?.status || "").toString().toLowerCase() === "open").length;

        const getSortMillis = (i) => {
          const v = i?.occurredAt ?? i?.reportedAt ?? i?.createdAt ?? null;
          if (!v) return 0;
          if (v instanceof Date) return v.getTime();
          if (typeof v?.toDate === "function") {
            try {
              return v.toDate().getTime();
            } catch {
              return 0;
            }
          }
          const d = new Date(v);
          // eslint-disable-next-line no-restricted-globals
          return isNaN(d.getTime()) ? 0 : d.getTime();
        };

        const recent = [...list]
          .sort((a, b) => getSortMillis(b) - getSortMillis(a))
          .slice(0, 5)
          .map((i) => ({
            id: i?.id ?? i?.incidentId ?? "",
            title:
              i?.title ??
              i?.name ??
              (i?.type ? String(i.type).replace(/_/g, " ") : "Incident"),
            severity: i?.severity ?? "",
            status: i?.status ?? "open",
            createdAt: i?.occurredAt ?? i?.reportedAt ?? i?.createdAt ?? null,
            patientId: i?.patientId ?? "",
          }));

        if (!cancelled) {
          const totalForRender = demoMode && totalIncidents === 0 ? DEMO_RECENT_INCIDENTS.length : totalIncidents;
          const highForRender = demoMode && totalIncidents === 0 ? 1 : highSeverityIncidents;
          const pendingForRender = demoMode && totalIncidents === 0 ? 2 : pendingActions;
          setIncidentStats({ totalIncidents: totalForRender, highSeverityIncidents: highForRender, pendingActions: pendingForRender });
          setRecentIncidents(recent.length ? recent : demoMode ? DEMO_RECENT_INCIDENTS : []);
        }
      } catch (err) {
        if (!cancelled) {
          setIncidentStats(
            demoMode
              ? { totalIncidents: DEMO_RECENT_INCIDENTS.length, highSeverityIncidents: 1, pendingActions: 2 }
              : { totalIncidents: 0, highSeverityIncidents: 0, pendingActions: 0 }
          );
          setRecentIncidents(demoMode ? DEMO_RECENT_INCIDENTS : []);
        }
      } finally {
        if (!cancelled) setIncidentStatsLoading(false);
      }
    }

    loadIncidentStats();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAuditLogsCount() {
      if (!organisationId) {
        setAuditLogsCount(0);
        setAuditLogsCountLoading(false);
        return;
      }
      setAuditLogsCountLoading(true);
      try {
        const q = query(
          collection(db, "audit_logs"),
          where("organisationId", "==", organisationId),
          orderBy("timestamp", "desc"),
          limit(50)
        );
        const snapshot = await getDocs(q);
        if (!cancelled) setAuditLogsCount(snapshot?.docs?.length ?? 0);
      } catch (_) {
        if (!cancelled) setAuditLogsCount(0);
      } finally {
        if (!cancelled) setAuditLogsCountLoading(false);
      }
    }

    loadAuditLogsCount();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!organisationId) {
        setMetrics({ totalPatients: 0, openIncidents: 0, safeguardingAlerts: 0, documentsUploaded: 0 });
        setMetricsLoading(false);
        return;
      }
      setMetricsLoading(true);
      try {
        const [patients, incidents, { documents }, carePlansDue] = await Promise.all([
          listPatients(organisationId, { serviceId: currentServiceId ?? undefined }),
          fetchIncidents(organisationId, {}),
          fetchDocuments(organisationId, { limitCount: 500, serviceId: currentServiceId ?? undefined }),
          countCarePlansDueForReview(organisationId, { serviceId: currentServiceId ?? undefined, withinDays: 7 }),
        ]);
        const patientList = Array.isArray(patients) ? patients : [];
        const incidentList = Array.isArray(incidents) ? incidents : [];
        const openIncidents = incidentList.filter((i) => (i.status || "open") !== "closed");
        const safeguardingAlerts = incidentList.filter((i) => (i.type || "").toLowerCase() === "safeguarding");
        const docList = Array.isArray(documents) ? documents : [];
        if (!cancelled) {
          setMetrics({
            totalPatients: patientList.length,
            openIncidents: openIncidents.length,
            safeguardingAlerts: safeguardingAlerts.length,
            documentsUploaded: docList.length,
            carePlansDue: typeof carePlansDue === "number" ? carePlansDue : 0,
          });
        }
      } catch (_) {
        if (!cancelled) {
          setMetrics({ totalPatients: 0, openIncidents: 0, safeguardingAlerts: 0, documentsUploaded: 0, carePlansDue: 0 });
        }
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    let cancelled = false;
    async function loadCarePlanRows() {
      if (!organisationId) {
        setCarePlanRows([]);
        return;
      }
      const rows = await listCarePlansForOrganisation(organisationId, { limitCount: 400 }).catch(() => []);
      if (!cancelled) setCarePlanRows(Array.isArray(rows) ? rows : []);
    }
    void loadCarePlanRows();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadCapacityMetrics() {
      if (!organisationId) {
        setCapacityMetrics({ assessmentsDue: 0, patientsLackingCapacity: 0, highRiskDecisions: 0 });
        setCapacityMetricsLoading(false);
        return;
      }
      setCapacityMetricsLoading(true);
      try {
        const stats = await getCapacityDashboardStats(organisationId);
        if (!cancelled) setCapacityMetrics(stats);
      } catch {
        if (!cancelled) {
          setCapacityMetrics({ assessmentsDue: 0, patientsLackingCapacity: 0, highRiskDecisions: 0 });
        }
      } finally {
        if (!cancelled) setCapacityMetricsLoading(false);
      }
    }
    void loadCapacityMetrics();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadInspectionData() {
      if (!organisationId) {
        setInspectionData({ patient: null, notes: [], policies: [], training: [], incidents: [] });
        setInspectionDataLoading(false);
        return;
      }
      setInspectionDataLoading(true);
      try {
        const [patients, notes, policies, training, incidents] = await Promise.all([
          listPatients(organisationId, { serviceId: currentServiceId ?? undefined }),
          fetchClinicalNotesForOrganisation({ patientId: null, limitCount: 200 }),
          listPolicies(organisationId),
          listStaffTraining(organisationId, currentServiceId ?? null),
          fetchIncidents(organisationId, {}),
        ]);
        if (cancelled) return;
        const patientList = Array.isArray(patients) ? patients : [];
        const focusPatient =
          demoMode
            ? patientList.find((p) => String(p?.id ?? "") === DEMO_PATIENT_ID) ?? patientList[0] ?? null
            : patientList.find((p) => p?.stompMonitoring === true) ?? patientList[0] ?? null;
        setInspectionData({
          patient: focusPatient,
          notes: Array.isArray(notes) ? notes : [],
          policies: Array.isArray(policies) ? policies : [],
          training: Array.isArray(training) ? training : [],
          incidents: Array.isArray(incidents) ? incidents : [],
        });
      } catch {
        if (cancelled) return;
        setInspectionData({ patient: null, notes: [], policies: [], training: [], incidents: [] });
      } finally {
        if (!cancelled) setInspectionDataLoading(false);
      }
    }

    loadInspectionData();
    return () => {
      cancelled = true;
    };
  }, [organisationId, currentServiceId]);

  const insights = useMemo(
    () =>
      getInspectionInsights({
        patient: inspectionData.patient,
        notes: inspectionData.notes,
        policies: inspectionData.policies,
        training: inspectionData.training,
        incidents: inspectionData.incidents,
      }),
    [inspectionData]
  );
  const domainScores = useMemo(() => calculateDomainScores(insights), [insights]);
  const overallScore = useMemo(() => calculateOverallScore(domainScores), [domainScores]);
  const inspectionAlerts = useMemo(() => getInspectionAlerts(domainScores), [domainScores]);
  const trend = useMemo(() => getTrend(scoreHistory), [scoreHistory]);
  const prediction = useMemo(
    () =>
      predictInspectionRisk({
        domainScores,
        insights,
        trend,
      }),
    [domainScores, insights, trend]
  );
  const predictionReasons = useMemo(
    () => explainPrediction({ insights }),
    [insights]
  );
  const criticalAlert = inspectionAlerts.find((x) => x.level === "critical");

  useEffect(() => {
    let cancelled = false;
    if (!organisationId) {
      setScoreHistory([]);
      return;
    }
    listInspectionScores(organisationId, 20)
      .then((rows) => {
        if (cancelled) return;
        setScoreHistory(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setScoreHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  async function persistInspectionScore() {
    if (!organisationId) return;
    setSavingScore(true);
    try {
      await saveInspectionScore({
        organisationId,
        overallScore,
        domainScores,
      });
      const rows = await listInspectionScores(organisationId, 20);
      setScoreHistory(Array.isArray(rows) ? rows : []);
    } catch {
      // Non-blocking; UI still shows dynamic score from live data.
    } finally {
      setSavingScore(false);
    }
  }

  useEffect(() => {
    if (!organisationId || inspectionDataLoading) return;
    // Save on dashboard load/update to build trend history over time.
    void persistInspectionScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId, inspectionDataLoading, overallScore]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompliance() {
      if (!organisationId) {
        setComplianceScore(demoMode ? DEMO_COMPLIANCE_SCORE : null);
        setComplianceLoading(false);
        return;
      }
      setComplianceLoading(true);
      setComplianceError(null);
      try {
        const score = await getComplianceScore(organisationId, currentServiceId ?? undefined, {
          calculateIfMissing: true,
        });
        if (!cancelled) {
          setComplianceScore(score ?? (demoMode ? DEMO_COMPLIANCE_SCORE : null));
        }
      } catch (err) {
        console.error("Dashboard compliance score error:", err);
        if (!cancelled) {
          setComplianceScore(demoMode ? DEMO_COMPLIANCE_SCORE : null);
          setComplianceError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load compliance score."));
        }
      } finally {
        if (!cancelled) setComplianceLoading(false);
      }
    }

    loadCompliance();
    return () => { cancelled = true; };
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    let cancelled = false;
    if (!organisationId) {
      setInspectionRiskLevel(null);
      return;
    }
    getLatestSimulation(organisationId, currentServiceId ?? undefined)
      .then((sim) => {
        if (cancelled) return;
        if (sim && typeof sim.overallScore === "number") {
          setInspectionRiskLevel(getInspectionRiskLevel(sim.overallScore, []));
        } else {
          setInspectionRiskLevel(null);
        }
      })
      .catch(() => {
        if (!cancelled) setInspectionRiskLevel(null);
      });
    return () => { cancelled = true; };
  }, [organisationId, currentServiceId]);

  const displayRiskLevel = inspectionRiskLevel ?? (complianceScore && typeof complianceScore.overallScore === "number" ? getInspectionRiskLevel(complianceScore.overallScore, []) : null);

  const hasLowScore =
    complianceScore &&
    (complianceScore.safeScore < 70 ||
      complianceScore.effectiveScore < 70 ||
      complianceScore.caringScore < 70 ||
      complianceScore.responsiveScore < 70 ||
      complianceScore.wellLedScore < 70);

  const stage7HighAlert =
    !incidentStatsLoading && incidentStats.highSeverityIncidents > 0;

  const complianceV2Domains = useMemo(() => {
    const incidentsCount = Array.isArray(inspectionData.incidents) ? inspectionData.incidents.length : 0;
    const safeguardingCount = Array.isArray(inspectionData.incidents)
      ? inspectionData.incidents.filter((x) => String(x?.type ?? x?.incidentType ?? "").toLowerCase().includes("safeguard")).length
      : 0;
    const riskPenalty = Math.min(30, Number(incidentStats.highSeverityIncidents ?? 0) * 6);
    const safeScore = clampPercent(
      100 -
        Math.min(35, incidentsCount * 2) -
        Math.min(20, safeguardingCount * 5) -
        Math.min(20, Number(dolsMetrics.overdue ?? 0) * 10) -
        riskPenalty
    );

    const totalCarePlans = Array.isArray(carePlanRows) ? carePlanRows.length : 0;
    const dueCarePlans = Number(metrics.carePlansDue ?? 0);
    const carePlanCoverage = totalCarePlans > 0 ? Math.max(0, 100 - (dueCarePlans / totalCarePlans) * 100) : 60;
    const notesCount = Array.isArray(inspectionData.notes) ? inspectionData.notes.length : 0;
    const mdtEvidenceCount = Array.isArray(inspectionData.notes)
      ? inspectionData.notes.filter((n) => n?.mdtReview || n?.reports?.mdtReview).length
      : 0;
    const notesScore = Math.min(100, notesCount * 2);
    const mdtScore = Math.min(100, mdtEvidenceCount * 12);
    const effectiveScore = clampPercent(carePlanCoverage * 0.45 + mdtScore * 0.3 + notesScore * 0.25);

    const caringScore = clampPercent(
      100 - Math.min(20, safeguardingCount * 5) - Math.min(20, Number(incidentStats.highSeverityIncidents ?? 0) * 5)
    );
    const responsiveScore = clampPercent(100 - Math.min(40, Number(metrics.openIncidents ?? 0) * 4) - Math.min(30, Number(dolsMetrics.expiringNext30Days ?? 0) * 5));
    const wellLedScore = clampPercent(100 - Math.min(30, Number(metrics.carePlansDue ?? 0) * 4) - Math.min(25, Number(dolsAlerts.length ?? 0) * 4));

    return [
      { key: "SAFE", score: safeScore, status: complianceStatusFromScore(safeScore) },
      { key: "EFFECTIVE", score: effectiveScore, status: complianceStatusFromScore(effectiveScore) },
      { key: "CARING", score: caringScore, status: complianceStatusFromScore(caringScore) },
      { key: "RESPONSIVE", score: responsiveScore, status: complianceStatusFromScore(responsiveScore) },
      { key: "WELL_LED", score: wellLedScore, status: complianceStatusFromScore(wellLedScore) },
    ];
  }, [inspectionData.incidents, inspectionData.notes, incidentStats.highSeverityIncidents, dolsMetrics.overdue, dolsMetrics.expiringNext30Days, carePlanRows, metrics.carePlansDue, metrics.openIncidents, dolsAlerts.length]);

  const systemSecureStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(34, 197, 94, 0.10)",
    border: "1px solid rgba(34, 197, 94, 0.35)",
    color: "#166534",
    fontWeight: 900,
    marginBottom: 24,
    boxShadow:
      "0 0 0 4px rgba(34, 197, 94, 0.12), 0 0 18px rgba(34, 197, 94, 0.35)",
  };

  const systemSecureDotStyle = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.18)",
    flexShrink: 0,
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes urgentPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.01); opacity: 0.92; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes urgentDotPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          60% { transform: scale(1.12); box-shadow: 0 0 0 10px rgba(239,68,68,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        .stat-card {
          transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
          will-change: transform;
        }

        .stat-card:hover {
          transform: scale(1.02);
          box-shadow: 0 18px 40px rgba(0,0,0,0.10);
        }

        .urgent-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #ef4444;
          animation: urgentDotPulse 1.1s ease-in-out infinite;
          flex-shrink: 0;
        }
      `}</style>
      <h1 style={styles.title} data-demo-guide="dashboard-overview">
        Compliance Dashboard
      </h1>
      {organisation?.name && (
        <p style={styles.subtitle}>
          {organisation.name}
          {currentServiceId ? ` · ${currentServiceName}` : ""}
        </p>
      )}
      <div style={systemSecureStyle}>
        <span style={systemSecureDotStyle} aria-hidden="true" />
        System Secure
      </div>

      <section
        style={{
          marginBottom: "24px",
          padding: "20px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Inspection readiness (CQC engine)
        </h2>
        {inspectionReadinessLoading ? (
          <p style={{ margin: 0, color: "#64748b" }}>Calculating live simulation…</p>
        ) : inspectionReadiness ? (
          <>
            <p style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
              Overall: {Math.round(inspectionReadiness.overallScore)} → {inspectionReadiness.rating}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {Object.entries(inspectionReadiness.domains ?? {}).map(([k, v]) => (
                <span key={k} style={{ padding: "4px 8px", background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                  {k}: {Math.round(v)}
                </span>
              ))}
            </div>
            {(inspectionReadiness.warnings ?? []).length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#9a3412", fontWeight: 600, fontSize: 14 }}>
                {(inspectionReadiness.warnings ?? []).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: "#166534", fontWeight: 600 }}>No critical warnings from this ruleset.</p>
            )}
            <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b" }}>
              Trend: coming soon · Refreshes every 90s and when you navigate back to this page.
            </p>
          </>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>Simulation unavailable.</p>
        )}
      </section>

      <h2 className="section-title" style={{ marginTop: 0 }}>
        CQC Readiness: {inspectionDataLoading ? "..." : `${overallScore}%`}
      </h2>
      <DomainScoreCards scores={domainScores} />
      <InspectionPredictionCard risk={prediction} reasons={predictionReasons} />
      <div style={{ marginBottom: "1rem", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            void persistInspectionScore();
          }}
          disabled={savingScore || !organisationId}
          style={{ cursor: savingScore ? "default" : "pointer" }}
        >
          {savingScore ? "Saving..." : "Save score snapshot"}
        </button>
      </div>
      {criticalAlert ? (
        <div className="alert warning" role="alert" style={{ marginBottom: "0.9rem", borderLeftColor: "#dc2626", background: "#fef2f2", color: "#991b1b" }}>
          Immediate action required: {criticalAlert.domain} domain critical.
        </div>
      ) : null}
      {prediction === "CRITICAL" ? (
        <div
          role="alert"
          style={{
            marginBottom: "0.9rem",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #dc2626",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
          }}
        >
          {"\u26A0\uFE0F"} High likelihood of inspection failure - immediate action required.
        </div>
      ) : null}
      {inspectionAlerts.map((a, idx) => (
        <div
          key={`${a.domain}-${a.level}-${idx}`}
          role="alert"
          style={{
            marginBottom: "0.5rem",
            padding: "10px 12px",
            borderRadius: 8,
            borderLeft: `4px solid ${a.level === "critical" ? "#dc2626" : "#f59e0b"}`,
            background: a.level === "critical" ? "#fef2f2" : "#fff7ed",
            color: a.level === "critical" ? "#991b1b" : "#9a3412",
            fontWeight: 700,
          }}
        >
          {a.message}
        </div>
      ))}
      <section style={{ marginBottom: "1rem" }}>
        <InspectionInsightsPanel insights={insights} />
      </section>
      <section style={{ marginBottom: "1rem" }}>
        <InspectionTrendChart scores={scoreHistory} />
      </section>

      <div style={{ marginBottom: "1rem" }}>
        <Link
          to="/evidence-pack"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "0.85rem",
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Evidence Pack – Generate inspection evidence
        </Link>
      </div>

      {complianceError && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {complianceError}
        </div>
      )}

      {hasLowScore && (
        <div
          role="alert"
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>⚠</span>
          <span>
            <strong>Service at risk of CQC concern.</strong> One or more domain scores are below 70%.
            <Link to="/compliance" style={{ marginLeft: "0.5rem", color: "#b91c1c", fontWeight: 600 }}>
              View compliance overview →
            </Link>
          </span>
        </div>
      )}

      {metrics.carePlansDue > 0 && (
        <div
          role="alert"
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "#fef9c3",
            border: "1px solid #facc15",
            borderRadius: 12,
            color: "#854d0e",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}>⚠</span>
          <span>
            <strong>Care plan review due.</strong> {metrics.carePlansDue} care plan
            {metrics.carePlansDue === 1 ? "" : "s"} require review in the next 7 days.
            <Link to="/care-plans" style={{ marginLeft: "0.5rem", color: "#854d0e", fontWeight: 600 }}>
              View care plans →
            </Link>
          </span>
        </div>
      )}

      {stage7HighAlert ? (
        <div
          role="alert"
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "rgba(185, 28, 28, 0.18)",
            border: "1px solid rgba(185, 28, 28, 0.35)",
            borderRadius: 16,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            animation: "urgentPulse 1.1s ease-in-out infinite",
            backdropFilter: "blur(12px)",
            boxShadow: "0 20px 60px rgba(185, 28, 28, 0.22)",
          }}
        >
          <span className="urgent-dot" aria-hidden="true" />
          <AlertTriangle size={22} color="#ffffff" />
          <span style={{ fontWeight: 900, lineHeight: 1.3 }}>
            Immediate Action Required: {incidentStats.highSeverityIncidents} Critical Clinical Risks
            Detected.
          </span>
        </div>
      ) : null}

      <section style={styles.section}>
        <h2 className="section-title">Dashboard</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Total Patients</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.totalPatients}</p>
            <Link to="/patients" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Open Incidents</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.openIncidents}</p>
            <Link to="/incidents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Activity size={16} style={{ color: "#2563eb" }} />
              Total Incidents
            </h3>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800 }}>
              {incidentStatsLoading ? "—" : incidentStats.totalIncidents}
            </p>
          </div>
          <div className="stat-card" style={{ padding: 20, background: stage7HighAlert ? "#fef2f2" : "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Critical Alerts (High)</h3>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800 }}>
              {incidentStatsLoading ? "—" : incidentStats.highSeverityIncidents}
            </p>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Open Cases</h3>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800 }}>
              {incidentStatsLoading ? "—" : incidentStats.pendingActions}
            </p>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={16} style={{ color: "#22c55e" }} />
              Audit Logs
            </h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {auditLogsCountLoading ? "—" : auditLogsCount}
            </p>
            <Link
              to="/audit-log"
              style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}
            >
              View →
            </Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: metrics.safeguardingAlerts > 0 ? "#fef2f2" : "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Safeguarding Alerts</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.safeguardingAlerts}</p>
            <Link to="/incidents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Documents Uploaded</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.documentsUploaded}</p>
            <Link to="/documents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Care Plans Due for Review</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {metricsLoading ? "—" : metrics.carePlansDue}
            </p>
            <Link to="/care-plans" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#fff7ed", borderRadius: 12, border: "1px solid #fdba74" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Capacity Assessments Due</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {capacityMetricsLoading ? "—" : capacityMetrics.assessmentsDue}
            </p>
            <Link to="/capacity" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Patients Lacking Capacity</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {capacityMetricsLoading ? "—" : capacityMetrics.patientsLackingCapacity}
            </p>
            <Link to="/capacity" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fca5a5" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>High Risk Decisions</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {capacityMetricsLoading ? "—" : capacityMetrics.highRiskDecisions}
            </p>
            <Link to="/capacity" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#eff6ff", borderRadius: 12, border: "1px solid #bfdbfe" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Active DoLS/LPS</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {dolsMetricsLoading ? "—" : dolsMetrics.activeSafeguards}
            </p>
            <Link to="/patients" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#fffbeb", borderRadius: 12, border: "1px solid #fde68a" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>DoLS/LPS Expiring (next 30 days)</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {dolsMetricsLoading ? "—" : dolsMetrics.expiringNext30Days}
            </p>
            <Link to="/patients" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>DoLS/LPS Overdue</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {dolsMetricsLoading ? "—" : dolsMetrics.overdue}
            </p>
            <Link to="/patients" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div className="stat-card" style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Compliance Score</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {complianceLoading ? "—" : complianceScore != null ? `${complianceScore.overallScore ?? "—"}%` : "—"}
            </p>
            <Link to="/compliance" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div
            className="stat-card"
            style={{
              padding: 20,
              borderRadius: 12,
              border: `2px solid ${
                displayRiskLevel === "LOW RISK"
                  ? "#22c55e"
                  : displayRiskLevel === "MEDIUM RISK"
                  ? "#f59e0b"
                  : displayRiskLevel === "HIGH RISK"
                  ? "#ef4444"
                  : "#e5e7eb"
              }`,
              background:
                displayRiskLevel === "LOW RISK"
                  ? "#dcfce7"
                  : displayRiskLevel === "MEDIUM RISK"
                  ? "#fef3c7"
                  : displayRiskLevel === "HIGH RISK"
                  ? "#fef2f2"
                  : "#f8fafc",
            }}
          >
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Inspection Risk</h3>
            <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              {displayRiskLevel ?? "—"}
            </p>
            <Link to="/inspection-simulation" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>
              Run simulation →
            </Link>
          </div>
        </div>
        {dolsAlerts.length > 0 ? (
          <div role="alert" style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontWeight: 700, fontSize: 13 }}>
            ⚠️ DoLS/LPS alerts active: {dolsAlerts.length} (expiring in 30 days, not applied, or overdue)
          </div>
        ) : null}

        <div style={{ marginTop: 16, padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>CQC Compliance Dashboard V2</h3>
          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13 }}>
            Domain scoring with explicit source mapping. SAFE: incidents, safeguarding, liberty safeguards, risk. EFFECTIVE: care plans, MDT, notes.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {complianceV2Domains.map((row) => (
              <div key={row.key} style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: "10px 12px" }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 4 }}>{row.key}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{row.score}%</div>
                <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: row.status === "Good" ? "#166534" : row.status === "Requires Improvement" ? "#92400e" : "#991b1b" }}>
                  {row.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "1rem 1.25rem",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>Clinical aggregate risk (V1)</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
            From ABC logs, incidents, nursing observations, and psychology formulation. Saved to risk history when CPA data loads.
          </p>
          {riskScoreFeedLoading ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Loading risk snapshots…</p>
          ) : riskScoreFeed.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No risk snapshots yet.</p>
          ) : (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>
                High-risk snapshots in feed:{" "}
                {riskScoreFeed.filter((r) => String(r.overallRisk).toLowerCase() === "high").length}
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                {riskScoreFeed.slice(0, 5).map((r) => (
                  <li key={r.id} style={{ marginBottom: 8 }}>
                    <Link
                      to={`/patients/${encodeURIComponent(r.patientId)}`}
                      style={{ fontWeight: 700, color: "#1d4ed8" }}
                      data-demo-guide={demoMode && r?.patientId === DEMO_PATIENT_ID ? "dashboard-daniel-k-link" : undefined}
                    >
                      Patient {r.patientId.slice(0, 8)}…
                    </Link>
                    <span style={{ marginLeft: 8 }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 800,
                          fontSize: 11,
                          textTransform: "uppercase",
                          background:
                            String(r.overallRisk).toLowerCase() === "high"
                              ? "#fee2e2"
                              : String(r.overallRisk).toLowerCase() === "medium"
                                ? "#fef9c3"
                                : "#dcfce7",
                          color:
                            String(r.overallRisk).toLowerCase() === "high"
                              ? "#991b1b"
                              : String(r.overallRisk).toLowerCase() === "medium"
                                ? "#854d0e"
                                : "#166534",
                        }}
                      >
                        {String(r.overallRisk || "—")}
                      </span>
                      <span style={{ marginLeft: 8, color: "#64748b" }}>
                        {r.trend === "improving" ? "↑" : r.trend === "deteriorating" ? "↓" : "→"} {r.trend}
                      </span>
                    </span>
                    {r.drivers?.length ? (
                      <div style={{ marginTop: 4, color: "#475569" }}>
                        Top drivers: {r.drivers.slice(0, 3).join(" · ")}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "1rem 1.25rem",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>Early warning alerts (V1)</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
            Multi-disciplinary flags from ABC logs, incidents, formulation, nursing observations, medications, and
            physical-health notes. Saved when CPA data loads. Sorted high → medium → low.
          </p>
          {alertFeedLoading ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Loading alert snapshots…</p>
          ) : alertFeed.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>No alert snapshots yet.</p>
          ) : (
            <>
              {alertFeed.some((row) => {
                const models = parseStoredAlerts(row.patientId, row.alerts);
                const vis = sortAlertsBySeverity(
                  filterAlertsForRole(models, { mdtRole, role: rbacRole, enterpriseRoleCode })
                );
                return vis.some((a) => String(a.severity).toLowerCase() === "high");
              }) ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  ⚠️ High-risk patient — review required
                </div>
              ) : null}
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 13, color: "#334155" }}>
                {alertFeed.slice(0, 6).map((row) => {
                  const models = parseStoredAlerts(row.patientId, row.alerts);
                  const visible = sortAlertsBySeverity(
                    filterAlertsForRole(models, { mdtRole, role: rbacRole, enterpriseRoleCode })
                  );
                  if (visible.length === 0) return null;
                  return (
                    <li
                      key={row.id}
                      style={{
                        marginBottom: 16,
                        paddingBottom: 14,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ marginBottom: 8 }}>
                        <Link
                          to={`/patients/${encodeURIComponent(row.patientId)}`}
                          style={{ fontWeight: 800, color: "#1d4ed8" }}
                        >
                          Patient {row.patientId.slice(0, 8)}…
                        </Link>
                        <span style={{ marginLeft: 8, color: "#64748b", fontSize: 12 }}>
                          {visible.length} active alert{visible.length === 1 ? "" : "s"} (for your role)
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {visible.map((a) => (
                          <div
                            key={a.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 8,
                              ...earlyWarningCardStyle(a.severity),
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: 11, textTransform: "uppercase", color: "#475569" }}>
                              {a.severity} · {a.source}
                            </div>
                            <div style={{ fontWeight: 600, marginTop: 2 }}>{a.type.replace(/_/g, " ")}</div>
                            <div style={{ marginTop: 2, lineHeight: 1.4 }}>{a.message}</div>
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      <section aria-label="Recent incidents" style={styles.section}>
        <h2 className="section-title">Recent Activity (Last 5 incidents)</h2>
        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={tableStyles.th}>Title</th>
                <th style={tableStyles.th}>Severity</th>
                <th style={tableStyles.th}>Status</th>
                <th style={tableStyles.th}>When</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((x, idx) => (
                <tr
                  key={x.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#f8fafc" : "#ffffff",
                  }}
                >
                  <td style={tableStyles.td}>{x.title}</td>
                  <td style={tableStyles.td}>{String(x.severity || "").toUpperCase()}</td>
                  <td style={tableStyles.td}>{x.status}</td>
                  <td style={tableStyles.td}>{formatWhen(x.createdAt) || "—"}</td>
                </tr>
              ))}
              {recentIncidents.length === 0 && !incidentStatsLoading ? (
                <tr>
                  <td style={tableStyles.td} colSpan={4}>
                    No incidents recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-label="CQC compliance scores" style={styles.section}>
        <h2 className="section-title">CQC compliance scores</h2>
        {complianceLoading && (
          <p style={{ color: "#666" }}>Loading compliance scores…</p>
        )}
        {!complianceLoading && !complianceScore && (
          <p style={{ color: "#666" }}>No compliance score calculated yet. Scores update when incidents, care plans or evidence change.</p>
        )}
        {!complianceLoading && complianceScore && (
          <>
            <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", color: "#555" }}>
              {currentServiceId ? currentServiceName : "Organisation"} · Last calculated on load
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 16,
              }}
            >
              <ComplianceScoreCard label="Safe" score={complianceScore.safeScore} />
              <ComplianceScoreCard label="Effective" score={complianceScore.effectiveScore} />
              <ComplianceScoreCard label="Caring" score={complianceScore.caringScore} />
              <ComplianceScoreCard label="Responsive" score={complianceScore.responsiveScore} />
              <ComplianceScoreCard label="Well-Led" score={complianceScore.wellLedScore} />
            </div>
            <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>
              Overall: <strong>{complianceScore.overallScore}%</strong>
              {" · "}
              <Link to="/compliance" style={{ color: "#2563eb" }}>View full compliance overview</Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function formatWhen(value) {
  return formatUkDateTime(value, "");
}

const tableStyles = {
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: "0.85rem",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontSize: "0.85rem",
  },
};

const styles = {
  page: {
    width: "100%",
    padding: "24px",
  },
  title: {
    marginTop: 0,
    marginBottom: 6,
    color: "#0f172a",
    fontSize: 26,
    fontWeight: 700,
  },
  subtitle: {
    margin: "0 0 1rem 0",
    color: "#64748b",
    fontSize: "0.95rem",
  },
  section: {
    marginBottom: "24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "var(--shadow-card)",
  },
};
