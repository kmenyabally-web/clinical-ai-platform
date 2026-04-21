import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { useOrganisation } from "../context/OrganisationContext";
import {
  getOrganisationOverview,
  aggregateOrganisationOverview,
} from "../services/executiveService";
import { fetchIncidents } from "../services/incidentService";
import { getComplianceScore } from "../services/complianceEngine";
import { getCapacityDashboardStats } from "../services/capacityAssessmentService";
import { ALERT_TYPE_LABEL } from "../services/wardDashboardDataService";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";
import { CLINICAL_EMPTY_ORG_VIEW } from "../constants/clinicalCopy";
import RiskLevelTag from "../components/RiskLevelTag";
import { generatePDF } from "../utils/professionalReportPdf";

const card = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.04)",
  border: "1px solid #e2e8f0",
  padding: "20px",
};

const KPI_KEYS = [
  { label: "Total patients", field: "totalPatients", color: "#0f172a" },
  { label: "High risk", field: "highRisk", color: "#dc2626" },
  { label: "Medium risk", field: "mediumRisk", color: "#f59e0b" },
  { label: "Low risk", field: "lowRisk", color: "#16a34a" },
  { label: "Active alerts", field: "totalAlertInstances", subtitle: "instances", color: "#7c3aed" },
];

const ENTERPRISE_KPI_KEYS = [
  { label: "Total Patients", field: "totalPatients", color: "#0f172a" },
  { label: "High Risk Patients", field: "highRiskPatients", color: "#dc2626" },
  { label: "Incidents Last 7 Days", field: "incidentsLast7Days", color: "#7c3aed" },
  { label: "Safeguarding Alerts", field: "safeguardingAlerts", color: "#b45309" },
  { label: "Capacity Assessments Due", field: "capacityAssessmentsDue", color: "#dc2626" },
  { label: "Compliance Score", field: "complianceScore", color: "#2563eb", suffix: "%" },
];

const RISK_PIE_COLORS = { high: "#dc2626", medium: "#f59e0b", low: "#16a34a", unknown: "#94a3b8" };

const PRIMARY_ALERT_TYPES = [
  "behaviour_escalation",
  "medication_non_compliance",
  "dysphagia_risk",
  "functional_decline",
];

function trendArrow(trend) {
  if (trend === "deteriorating") return "↑";
  if (trend === "improving") return "↓";
  return "→";
}

function trendTitle(trend) {
  if (trend === "deteriorating") return "Deteriorating";
  if (trend === "improving") return "Improving";
  if (trend === "stable") return "Stable";
  return "—";
}

function alertLabel(type) {
  const t = String(type ?? "");
  return ALERT_TYPE_LABEL[t] || t.replace(/_/g, " ") || "Alert";
}

function buildExecutiveRecommendations({ enterpriseKpis, wardComparisonRows, enterpriseAlerts }) {
  const recommendations = [];
  if ((enterpriseKpis?.capacityAssessmentsDue ?? 0) > 0) {
    recommendations.push(
      `Complete overdue capacity reassessments (${enterpriseKpis.capacityAssessmentsDue}) within 72 hours and document ownership at ward level.`
    );
  }
  if ((enterpriseKpis?.complianceScore ?? 0) < 70) {
    recommendations.push(
      `Launch a focused compliance recovery plan for low-performing wards and review progress at weekly governance huddle.`
    );
  }
  const highestRiskWard = Array.isArray(wardComparisonRows) ? wardComparisonRows[0] : null;
  if (highestRiskWard) {
    recommendations.push(
      `Prioritise senior clinical review in ${highestRiskWard.wardName} due to current risk profile and incident pressure.`
    );
  }
  if ((enterpriseKpis?.safeguardingAlerts ?? 0) > 0) {
    recommendations.push("Run immediate safeguarding case review for all alerts raised in the past 7 days.");
  }
  if (recommendations.length === 0 && Array.isArray(enterpriseAlerts) && enterpriseAlerts.length === 0) {
    recommendations.push("Maintain current controls and continue weekly trend surveillance across all wards.");
  }
  return recommendations.slice(0, 5);
}

function filterRowsByRisk(rows, riskFilter) {
  if (riskFilter === "all") return rows;
  if (riskFilter === "unknown") return rows.filter((r) => r.overallRisk === "unknown");
  return rows.filter((r) => r.overallRisk === riskFilter);
}

export default function ExecutiveDashboard() {
  const { organisationId, organisationName, hasFeature } = useOrganisation();
  const showRisk = hasFeature("risk");

  const [hospitalId, setHospitalId] = useState("");
  const [wardId, setWardId] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const [baseOverview, setBaseOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [enterpriseKpis, setEnterpriseKpis] = useState({
    totalPatients: 0,
    highRiskPatients: 0,
    incidentsLast7Days: 0,
    safeguardingAlerts: 0,
    capacityAssessmentsDue: 0,
    complianceScore: 0,
  });
  const [weeklyTrend, setWeeklyTrend] = useState([]);
  const [wardSortBy, setWardSortBy] = useState("risk");
  const [reportGeneratedAt, setReportGeneratedAt] = useState(null);

  const load = useCallback(async () => {
    if (!organisationId || !showRisk) {
      setBaseOverview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const opts = {};
      const h = hospitalId.trim();
      const w = wardId.trim();
      if (h) opts.hospitalId = h;
      if (w) opts.wardId = w;
      const data = await getOrganisationOverview(organisationId, opts);
      setBaseOverview(data);
      const [incidents, compliance, capacityStats] = await Promise.all([
        fetchIncidents(organisationId, {}).catch(() => []),
        getComplianceScore(organisationId).catch(() => null),
        getCapacityDashboardStats(organisationId).catch(() => null),
      ]);
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const incidentRows = Array.isArray(incidents) ? incidents : [];
      const incidentsLast7 = incidentRows.filter((x) => {
        const dt = x?.occurredAt ?? x?.reportedAt ?? x?.createdAt ?? null;
        const ms =
          typeof dt?.toMillis === "function"
            ? dt.toMillis()
            : typeof dt?.toDate === "function"
              ? dt.toDate().getTime()
              : new Date(dt).getTime();
        return Number.isFinite(ms) && ms >= sevenDaysAgo;
      });
      const safeguardingAlerts = incidentsLast7.filter((x) =>
        String(x?.type ?? x?.incidentType ?? x?.category ?? "").toLowerCase().includes("safeguarding")
      ).length;
      const trendMap = new Map();
      for (let i = 6; i >= 0; i -= 1) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        trendMap.set(key, { day: key.slice(5), incidents: 0, safeguarding: 0 });
      }
      for (const row of incidentsLast7) {
        const dt = row?.occurredAt ?? row?.reportedAt ?? row?.createdAt ?? null;
        const ms =
          typeof dt?.toMillis === "function"
            ? dt.toMillis()
            : typeof dt?.toDate === "function"
              ? dt.toDate().getTime()
              : new Date(dt).getTime();
        if (!Number.isFinite(ms)) continue;
        const key = new Date(ms).toISOString().slice(0, 10);
        if (!trendMap.has(key)) continue;
        const item = trendMap.get(key);
        item.incidents += 1;
        if (String(row?.type ?? row?.incidentType ?? row?.category ?? "").toLowerCase().includes("safeguarding")) {
          item.safeguarding += 1;
        }
      }
      setWeeklyTrend(Array.from(trendMap.values()));
      setEnterpriseKpis({
        totalPatients: data?.kpis?.totalPatients ?? 0,
        highRiskPatients: data?.kpis?.highRisk ?? 0,
        incidentsLast7Days: incidentsLast7.length,
        safeguardingAlerts,
        capacityAssessmentsDue: capacityStats?.assessmentsDue ?? 0,
        complianceScore: typeof compliance?.overallScore === "number" ? Math.round(compliance.overallScore) : 0,
      });
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.message ?? "Failed to load executive overview.");
      setBaseOverview(null);
    } finally {
      setLoading(false);
    }
  }, [organisationId, showRisk, hospitalId, wardId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!organisationId || !showRisk) return;
    const t = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(t);
  }, [load, organisationId, showRisk]);

  const filteredPatientRows = useMemo(
    () => filterRowsByRisk(baseOverview?.patientRows ?? [], riskFilter),
    [baseOverview, riskFilter]
  );

  const overview = useMemo(() => {
    if (!baseOverview) return null;
    return aggregateOrganisationOverview(baseOverview.wards, baseOverview.hospitals, filteredPatientRows);
  }, [baseOverview, filteredPatientRows]);

  const enterpriseAlerts = useMemo(() => {
    const alerts = [];
    if (enterpriseKpis.highRiskPatients > 0) {
      alerts.push(`High-risk patients currently flagged: ${enterpriseKpis.highRiskPatients}`);
    }
    if (enterpriseKpis.capacityAssessmentsDue > 0) {
      alerts.push(`Capacity reassessments due: ${enterpriseKpis.capacityAssessmentsDue}`);
    }
    if (enterpriseKpis.safeguardingAlerts > 0) {
      alerts.push(`Safeguarding alerts in last 7 days: ${enterpriseKpis.safeguardingAlerts}`);
    }
    if (enterpriseKpis.complianceScore > 0 && enterpriseKpis.complianceScore < 70) {
      alerts.push(`Compliance score below threshold: ${enterpriseKpis.complianceScore}%`);
    }
    return alerts;
  }, [enterpriseKpis]);

  const wardComparisonRows = useMemo(() => {
    const rows = Array.isArray(overview?.wardPerformance) ? [...overview.wardPerformance] : [];
    const wardRiskRank = (row) => {
      if (row.trend === "deteriorating" || row.highRiskCount >= 3) return 3;
      if (row.highRiskCount > 0 || row.alertsCount >= 4) return 2;
      return 1;
    };
    if (wardSortBy === "compliance") {
      rows.sort((a, b) => a.complianceScore - b.complianceScore);
    } else {
      rows.sort((a, b) => wardRiskRank(b) - wardRiskRank(a) || b.highRiskCount - a.highRiskCount || b.alertsCount - a.alertsCount);
    }
    return rows;
  }, [overview, wardSortBy]);

  const wardRiskMeta = (row) => {
    if (row.trend === "deteriorating" || row.highRiskCount >= 3) {
      return { label: "High", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
    }
    if (row.highRiskCount > 0 || row.alertsCount >= 4) {
      return { label: "Medium", bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
    }
    return { label: "Low", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
  };

  const executiveRecommendations = useMemo(
    () => buildExecutiveRecommendations({ enterpriseKpis, wardComparisonRows, enterpriseAlerts }),
    [enterpriseKpis, wardComparisonRows, enterpriseAlerts]
  );

  const weeklyExecutiveReport = useMemo(() => {
    if (!overview) return null;
    const topWards = wardComparisonRows.slice(0, 5);
    return {
      title: "Weekly Executive Report",
      generatedAt:
        reportGeneratedAt ??
        new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
      organisationPerformance: [
        `Total patients: ${enterpriseKpis.totalPatients}`,
        `High risk patients: ${enterpriseKpis.highRiskPatients}`,
        `Incidents (last 7 days): ${enterpriseKpis.incidentsLast7Days}`,
        `Safeguarding alerts (last 7 days): ${enterpriseKpis.safeguardingAlerts}`,
        `Capacity assessments due: ${enterpriseKpis.capacityAssessmentsDue}`,
        `Compliance score: ${enterpriseKpis.complianceScore}%`,
      ],
      wardComparison: topWards.map((w) => {
        const risk = wardRiskMeta(w);
        return `${w.wardName}: ${w.totalPatients} patients, ${w.highRiskCount} high-risk, ${w.alertsCount} alerts, trend ${w.trend}, risk ${risk.label}, compliance ${w.complianceScore}%`;
      }),
      keyRisks: enterpriseAlerts.length
        ? enterpriseAlerts
        : ["No critical enterprise alerts identified this week."],
      recommendations: executiveRecommendations,
    };
  }, [overview, wardComparisonRows, enterpriseKpis, enterpriseAlerts, executiveRecommendations, reportGeneratedAt]);

  const handleGenerateWeeklyReport = () => {
    setReportGeneratedAt(new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }));
  };

  const handleExportWeeklyReportPdf = () => {
    if (!weeklyExecutiveReport) return;
    generatePDF({
      fileName: `executive-weekly-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      reportType: "Executive Weekly",
      organisationName: organisationName || organisationId || "Organisation",
      hospitalName: hospitalId || "All hospitals",
      wardName: wardId || "All wards",
      patientName: "N/A",
      nhsNumber: null,
      generatedAt: weeklyExecutiveReport.generatedAt,
      title: weeklyExecutiveReport.title,
      summary: "Board-level weekly overview of organisational performance, ward comparison, enterprise risks, and recommendations.",
      sections: [
        {
          heading: "Organisation Performance",
          content: weeklyExecutiveReport.organisationPerformance.join("\n"),
        },
        {
          heading: "Ward Comparison",
          content: weeklyExecutiveReport.wardComparison.join("\n"),
        },
        {
          heading: "Key Risks",
          content: weeklyExecutiveReport.keyRisks.join("\n"),
        },
        {
          heading: "Recommendations",
          content: weeklyExecutiveReport.recommendations.join("\n"),
        },
      ],
    });
  };

  const hospitals = baseOverview?.hospitals ?? [];
  const wardOptions = useMemo(() => {
    if (!baseOverview?.wards?.length) return [];
    const h = hospitalId.trim();
    if (h) return baseOverview.wards.filter((w) => w.hospitalId === h);
    return baseOverview.wards;
  }, [baseOverview, hospitalId]);

  const pieData = useMemo(() => {
    if (!overview) return [];
    const d = overview.riskDistribution;
    return [
      { name: "High", value: d.high, key: "high" },
      { name: "Medium", value: d.medium, key: "medium" },
      { name: "Low", value: d.low, key: "low" },
      ...(d.unknown > 0 ? [{ name: "No score", value: d.unknown, key: "unknown" }] : []),
    ].filter((x) => x.value > 0);
  }, [overview]);

  const barData = useMemo(() => {
    if (!overview) return [];
    const d = overview.riskDistribution;
    return [
      { band: "High", n: d.high, fill: RISK_PIE_COLORS.high },
      { band: "Medium", n: d.medium, fill: RISK_PIE_COLORS.medium },
      { band: "Low", n: d.low, fill: RISK_PIE_COLORS.low },
      ...(d.unknown > 0 ? [{ band: "No score", n: d.unknown, fill: RISK_PIE_COLORS.unknown }] : []),
    ];
  }, [overview]);

  const alertPanelRows = useMemo(() => {
    if (!overview) return { primary: [], other: [] };
    const ag = overview.alertGroups;
    const primary = PRIMARY_ALERT_TYPES.map((k) => ({
      key: k,
      label: alertLabel(k),
      count: ag[k] ?? 0,
    }));
    const seen = new Set(PRIMARY_ALERT_TYPES);
    const other = Object.entries(ag)
      .filter(([k]) => !seen.has(k))
      .map(([k, count]) => ({ key: k, label: alertLabel(k), count }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
    return { primary, other };
  }, [overview]);

  const wardDashboardHref = (hId, wId) => {
    const params = new URLSearchParams();
    if (hId) params.set("hospitalId", hId);
    if (wId) params.set("wardId", wId);
    const q = params.toString();
    return q ? `/ward-dashboard?${q}` : "/ward-dashboard";
  };

  if (!showRisk) {
    return (
      <div style={{ padding: "2rem", maxWidth: 720 }}>
        <h1 className="page-title" style={{ marginTop: 0 }}>
          Executive dashboard
        </h1>
        <p style={{ color: "#64748b" }}>Risk features are not enabled for this organisation.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "1.5rem 2rem 2.5rem",
        width: "100%",
        maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Executive dashboard
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
            Organisation: <strong style={{ color: "#334155" }}>{organisationName || organisationId || "—"}</strong>
          </p>
        </div>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          Auto-refresh 60s
          {lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ""}
        </span>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
          padding: "12px 14px",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
        }}
      >
        <label style={{ fontWeight: 700, fontSize: 13 }}>
          Hospital
          <select
            value={hospitalId}
            onChange={(e) => {
              setHospitalId(e.target.value);
              setWardId("");
            }}
            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8, minWidth: 200 }}
          >
            <option value="">All hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name || h.id}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontWeight: 700, fontSize: 13 }}>
          Ward
          <select
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
            disabled={!baseOverview || wardOptions.length === 0}
            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8, minWidth: 200 }}
          >
            <option value="">All wards</option>
            {wardOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.hospitalName ? `${w.name || w.id} · ${w.hospitalName}` : w.name || w.id}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontWeight: 700, fontSize: 13 }}>
          Risk level (view)
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8 }}
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">No score</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Refresh now
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ marginTop: 16, padding: 12, background: "#fef2f2", color: "#991b1b", borderRadius: 8 }}>
          {error}
        </div>
      ) : null}

      {loading && !overview ? (
        <p style={{ marginTop: 24, color: "#64748b" }}>Loading organisation overview…</p>
      ) : overview ? (
        <>
          <section style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {ENTERPRISE_KPI_KEYS.map((k) => {
              const v = enterpriseKpis[k.field];
              return (
                <div key={k.field} style={{ ...card, borderTop: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 6, lineHeight: 1 }}>
                    {v}
                    {k.suffix ?? ""}
                  </div>
                </div>
              );
            })}
          </section>

          <div style={{ ...card, marginTop: 18 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Weekly trends</h2>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>Last 7 days: incidents and safeguarding trajectory</p>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="incidents" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="safeguarding" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={{ margin: "0 0 10px", fontSize: "1.05rem" }}>Alerts</h2>
            {enterpriseAlerts.length === 0 ? (
              <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>No critical enterprise alerts.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, color: "#991b1b", fontWeight: 700 }}>
                {enterpriseAlerts.map((a) => (
                  <li key={a} style={{ marginBottom: 6 }}>{a}</li>
                ))}
              </ul>
            )}
          </div>

          <section style={{ marginTop: 20 }}>
            <div style={{ ...card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Executive weekly report</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleGenerateWeeklyReport}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Generate weekly report
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWeeklyReportPdf}
                    disabled={!weeklyExecutiveReport}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #1d4ed8",
                      background: "#1d4ed8",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: weeklyExecutiveReport ? "pointer" : "not-allowed",
                    }}
                  >
                    Export PDF
                  </button>
                </div>
              </div>
              {weeklyExecutiveReport ? (
                <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Organisation performance
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {weeklyExecutiveReport.organisationPerformance.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Ward comparison
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {weeklyExecutiveReport.wardComparison.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Key risks
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {weeklyExecutiveReport.keyRisks.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                      Recommendations
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {weeklyExecutiveReport.recommendations.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14 }}>
                  Generate the weekly report to view board-level summary content and enable PDF export.
                </p>
              )}
            </div>
          </section>

          <section style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {KPI_KEYS.map((k) => {
              const v = overview.kpis[k.field];
              return (
                <div key={k.field} style={{ ...card, borderTop: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {k.label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: k.color, marginTop: 6, lineHeight: 1 }}>{v}</div>
                  {k.subtitle ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{k.subtitle}</div> : null}
                </div>
              );
            })}
          </section>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div style={card}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Risk distribution</h2>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#64748b" }}>Latest snapshot per patient in scope</p>
              {pieData.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 14 }}>No patients in current filters.</p>
              ) : (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label>
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={RISK_PIE_COLORS[entry.key] ?? "#64748b"} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div style={card}>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.05rem" }}>Risk by band</h2>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="band" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="n" radius={[6, 6, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell key={entry.band} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            <div style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>⚠️ High risk wards</h2>
              {overview.highRiskWards.length === 0 ? (
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>None in current scope.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {overview.highRiskWards.map((w) => (
                    <li
                      key={w.wardId}
                      style={{
                        padding: "10px 0",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: 14,
                      }}
                    >
                      <Link
                        to={wardDashboardHref(w.hospitalId, w.wardId)}
                        style={{ fontWeight: 800, color: "#0f172a", textDecoration: "none" }}
                      >
                        {w.wardName}
                      </Link>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {w.highRiskPatientCount} high-risk · {w.mainIssue}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>Alert overview</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {alertPanelRows.primary.map((row) => (
                  <li
                    key={row.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: 14,
                    }}
                  >
                    <span>{row.label}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
              {alertPanelRows.other.length > 0 ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginTop: 12, marginBottom: 6 }}>Other</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {alertPanelRows.other.map((row) => (
                      <li
                        key={row.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          borderBottom: "1px solid #f8fafc",
                          fontSize: 13,
                          color: "#475569",
                        }}
                      >
                        <span>{row.label}</span>
                        <span>{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div style={card}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>Trend view</h2>
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: "#166534", marginBottom: 6 }}>Improving wards</div>
                {overview.improvingWards.length === 0 ? (
                  <span style={{ color: "#94a3b8" }}>None</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {overview.improvingWards.map((w) => (
                      <li key={w.wardId}>
                        <Link to={wardDashboardHref(w.hospitalId, w.wardId)} style={{ color: "#15803d" }}>
                          {w.wardName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 800, color: "#991b1b", marginBottom: 6 }}>Deteriorating wards</div>
                {overview.deterioratingWards.length === 0 ? (
                  <span style={{ color: "#94a3b8" }}>None</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {overview.deterioratingWards.map((w) => (
                      <li key={w.wardId}>
                        <Link to={wardDashboardHref(w.hospitalId, w.wardId)} style={{ color: "#b91c1c" }}>
                          {w.wardName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <section style={{ marginTop: 22 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>Top patient risks (organisation)</h2>
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: 12, color: "#64748b" }}>
                    <th style={{ padding: "10px 14px" }}>Patient</th>
                    <th style={{ padding: "10px 14px" }}>Ward</th>
                    <th style={{ padding: "10px 14px" }}>Score</th>
                    <th style={{ padding: "10px 14px" }}>Risk</th>
                    <th style={{ padding: "10px 14px" }}>Drivers</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topRiskPatients.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 16, color: "#94a3b8" }}>
                        No patients in current filters.
                      </td>
                    </tr>
                  ) : (
                    overview.topRiskPatients.map((p) => (
                      <tr key={p.patientId} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <Link to={`/patients/${encodeURIComponent(p.patientId)}`} style={{ fontWeight: 700, color: "#2563eb" }}>
                            {p.displayName}
                          </Link>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{p.wardName}</td>
                        <td style={{ padding: "10px 14px" }}>{p.aggregateScore}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <RiskLevelTag level={p.overallRisk} />
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748b", fontSize: 13 }}>
                          {p.drivers?.length ? p.drivers.join(" · ") : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>Ward performance</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {overview.wardPerformance.map((w) => (
                <Link
                  key={w.wardId}
                  to={wardDashboardHref(w.hospitalId, w.wardId)}
                  style={{
                    ...card,
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{w.wardName}</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                    <div>Patients: {w.totalPatients}</div>
                    <div>High risk: {w.highRiskCount}</div>
                    <div>Alerts: {w.alertsCount}</div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }} title={trendTitle(w.trend)}>
                        {trendArrow(w.trend)}
                      </span>
                      <span style={{ fontWeight: 700 }}>{trendTitle(w.trend)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Ward comparison engine</h2>
              <label style={{ fontSize: 13, fontWeight: 700 }}>
                Sort by{" "}
                <select
                  value={wardSortBy}
                  onChange={(e) => setWardSortBy(e.target.value)}
                  style={{ marginLeft: 6, padding: "4px 8px", borderRadius: 8 }}
                >
                  <option value="risk">Risk</option>
                  <option value="compliance">Compliance</option>
                </select>
              </label>
            </div>
            <div style={{ ...card, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: 12, color: "#64748b" }}>
                    <th style={{ padding: "10px 14px" }}>Ward</th>
                    <th style={{ padding: "10px 14px" }}>Patient count</th>
                    <th style={{ padding: "10px 14px" }}>Incidents / Alerts</th>
                    <th style={{ padding: "10px 14px" }}>Risk trend</th>
                    <th style={{ padding: "10px 14px" }}>Risk level</th>
                    <th style={{ padding: "10px 14px" }}>Compliance score</th>
                  </tr>
                </thead>
                <tbody>
                  {wardComparisonRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 16, color: "#94a3b8" }}>
                        No ward data in current filters.
                      </td>
                    </tr>
                  ) : (
                    wardComparisonRows.map((w) => {
                      const risk = wardRiskMeta(w);
                      return (
                        <tr key={w.wardId} style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                            <Link to={wardDashboardHref(w.hospitalId, w.wardId)} style={{ color: "#2563eb" }}>
                              {w.wardName}
                            </Link>
                          </td>
                          <td style={{ padding: "10px 14px" }}>{w.totalPatients}</td>
                          <td style={{ padding: "10px 14px" }}>{w.highRiskCount} high-risk / {w.alertsCount} alerts</td>
                          <td style={{ padding: "10px 14px", textTransform: "capitalize" }}>{w.trend}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: risk.bg,
                                color: risk.color,
                                border: `1px solid ${risk.border}`,
                                fontWeight: 800,
                                fontSize: 12,
                              }}
                            >
                              {risk.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 800 }}>{w.complianceScore}%</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="clinical-empty" style={{ marginTop: 24 }}>
          {CLINICAL_EMPTY_ORG_VIEW}
        </p>
      )}
    </div>
  );
}
