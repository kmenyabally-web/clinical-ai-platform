import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useOrganisation } from "../context/OrganisationContext";
import {
  getOrganisationOverview,
  aggregateOrganisationOverview,
} from "../services/executiveService";
import { ALERT_TYPE_LABEL } from "../services/wardDashboardDataService";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

const card = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
  padding: "14px 16px",
};

const KPI_KEYS = [
  { label: "Total patients", field: "totalPatients", color: "#0f172a" },
  { label: "High risk", field: "highRisk", color: "#991b1b" },
  { label: "Medium risk", field: "mediumRisk", color: "#854d0e" },
  { label: "Low risk", field: "lowRisk", color: "#166534" },
  { label: "Active alerts", field: "totalAlertInstances", subtitle: "instances", color: "#7c3aed" },
];

const RISK_PIE_COLORS = { high: "#dc2626", medium: "#ca8a04", low: "#16a34a", unknown: "#94a3b8" };

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
        <h1 style={{ marginTop: 0 }}>Executive dashboard</h1>
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
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Executive dashboard</h1>
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
                        <td style={{ padding: "10px 14px", textTransform: "uppercase", fontSize: 12, fontWeight: 800 }}>
                          {p.overallRisk}
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
        </>
      ) : (
        <p style={{ marginTop: 24, color: "#64748b" }}>No data.</p>
      )}
    </div>
  );
}
