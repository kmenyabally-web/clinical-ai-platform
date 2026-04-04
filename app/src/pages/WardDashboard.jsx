import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { listHospitals, listWards } from "../services/structureService";
import { getWardPatients } from "../services/wardService";
import { fetchWardDashboardRows, sortWardRowsByRisk, ALERT_TYPE_LABEL } from "../services/wardDashboardDataService";
import { filterAlertsForRole, sortAlertsBySeverity } from "../services/earlyWarningEngine";
import { formatUkDateTime } from "../utils/dateFormat";

function trendArrow(trend) {
  if (trend === "deteriorating") return "↑";
  if (trend === "improving") return "↓";
  return "→";
}

function trendTitle(trend) {
  if (trend === "deteriorating") return "Deteriorating";
  if (trend === "improving") return "Improving";
  if (trend === "stable") return "Stable";
  return "Unknown";
}

function riskBadgeStyle(level) {
  const l = String(level ?? "").toLowerCase();
  if (l === "high") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (l === "medium") return { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" };
  if (l === "low") return { background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0" };
  return { background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" };
}

function riskLabel(level) {
  const l = String(level ?? "").toLowerCase();
  if (l === "high" || l === "medium" || l === "low") return l.toUpperCase();
  return "—";
}

function alertLabel(type) {
  const t = String(type ?? "");
  return ALERT_TYPE_LABEL[t] || t.replace(/_/g, " ") || "Alert";
}

const cardBase = {
  background: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e2e8f0",
  padding: "14px 16px",
  textDecoration: "none",
  color: "inherit",
  display: "block",
  transition: "box-shadow 0.15s ease",
};

export default function WardDashboard() {
  const [searchParams] = useSearchParams();
  const { organisationId, userProfile, hasFeature } = useOrganisation();
  const { mdtRole, role, enterpriseRoleCode } = useRole();
  const showRisk = hasFeature("risk");

  const profileHospitalId = userProfile?.hospitalId != null ? String(userProfile.hospitalId).trim() : "";
  const profileWardId = userProfile?.wardId != null ? String(userProfile.wardId).trim() : "";

  const [hospitals, setHospitals] = useState([]);
  const [wards, setWards] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [hasAlertsOnly, setHasAlertsOnly] = useState(false);

  const [basePatients, setBasePatients] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organisationId) return;
    let cancelled = false;
    listHospitals(organisationId)
      .then((h) => {
        if (!cancelled) setHospitals(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        if (!cancelled) setHospitals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || !hospitalId) {
      setWards([]);
      return;
    }
    let cancelled = false;
    listWards(organisationId, hospitalId)
      .then((w) => {
        if (!cancelled) setWards(Array.isArray(w) ? w : []);
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId, hospitalId]);

  useEffect(() => {
    const h = searchParams.get("hospitalId")?.trim();
    const w = searchParams.get("wardId")?.trim();
    if (h) setHospitalId(h);
    if (w) setWardFilter(w);
  }, [searchParams]);

  useEffect(() => {
    if (profileHospitalId && !hospitalId) {
      setHospitalId(profileHospitalId);
    }
  }, [profileHospitalId, hospitalId]);

  useEffect(() => {
    if (profileWardId && wardFilter === "" && wards.some((w) => w.id === profileWardId)) {
      setWardFilter(profileWardId);
    }
  }, [profileWardId, wards, wardFilter]);

  const loadDashboard = useCallback(async () => {
    if (!organisationId || !hospitalId || !showRisk) {
      setBasePatients([]);
      setRawRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const wid = wardFilter.trim() ? wardFilter : null;
      const patients = await getWardPatients(wid, hospitalId);
      setBasePatients(patients);
      const ids = patients.map((p) => p.id).filter(Boolean);
      if (ids.length === 0) {
        setRawRows([]);
        setLoading(false);
        return;
      }
      const rows = await fetchWardDashboardRows(organisationId, patients);
      setRawRows(rows);
    } catch (e) {
      setError(e?.message ?? "Failed to load ward dashboard.");
      setBasePatients([]);
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, [organisationId, hospitalId, wardFilter, showRisk]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!showRisk || !organisationId || !hospitalId) return;
    const t = window.setInterval(() => {
      void loadDashboard();
    }, 45_000);
    return () => window.clearInterval(t);
  }, [loadDashboard, showRisk, organisationId, hospitalId]);

  const roleCtx = useMemo(
    () => ({ mdtRole, role, enterpriseRoleCode }),
    [mdtRole, role, enterpriseRoleCode]
  );

  const mergedRows = useMemo(() => {
    return rawRows.map((r) => {
      const vis = sortAlertsBySeverity(filterAlertsForRole(r.allAlerts, roleCtx));
      return {
        ...r,
        allAlerts: vis,
        topAlerts: vis.slice(0, 2),
      };
    });
  }, [rawRows, roleCtx]);

  const sortedRows = useMemo(() => sortWardRowsByRisk(mergedRows), [mergedRows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter((r) => {
      if (riskFilter !== "all") {
        if (riskFilter === "unknown") {
          if (r.overallRisk !== "unknown") return false;
        } else if (r.overallRisk !== riskFilter) return false;
      }
      if (needsReviewOnly) {
        const highAlert = r.allAlerts.some((a) => String(a.severity).toLowerCase() === "high");
        if (r.overallRisk !== "high" && !highAlert) return false;
      }
      if (hasAlertsOnly && r.allAlerts.length === 0) return false;
      return true;
    });
  }, [sortedRows, riskFilter, needsReviewOnly, hasAlertsOnly]);

  const highRiskRows = useMemo(
    () => mergedRows.filter((r) => r.overallRisk === "high").sort((a, b) => b.lastUpdatedMs - a.lastUpdatedMs),
    [mergedRows]
  );

  if (!showRisk) {
    return (
      <div style={{ padding: "2rem", maxWidth: 720 }}>
        <h1 style={{ marginTop: 0 }}>Ward dashboard</h1>
        <p style={{ color: "#64748b" }}>Risk features are not enabled for this organisation.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem 2.5rem", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Ward dashboard</h1>
        <span style={{ fontSize: 13, color: "#64748b" }}>Refreshes every 45s · Risk, alerts, and nursing (batched)</span>
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
              setWardFilter("");
            }}
            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8, minWidth: 200 }}
          >
            <option value="">Select hospital</option>
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
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            disabled={!hospitalId}
            style={{ display: "block", marginTop: 4, padding: "6px 10px", borderRadius: 8, minWidth: 200 }}
          >
            <option value="">All wards in hospital</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || w.id}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontWeight: 700, fontSize: 13 }}>
          Risk level
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
          <input type="checkbox" checked={needsReviewOnly} onChange={(e) => setNeedsReviewOnly(e.target.checked)} />
          Needs review
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
          <input type="checkbox" checked={hasAlertsOnly} onChange={(e) => setHasAlertsOnly(e.target.checked)} />
          Has alerts
        </label>
        <button
          type="button"
          onClick={() => void loadDashboard()}
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

      {!hospitalId ? (
        <p style={{ marginTop: 24, color: "#64748b" }}>Select a hospital to view patients.</p>
      ) : loading ? (
        <p style={{ marginTop: 24, color: "#64748b" }}>Loading ward data…</p>
      ) : basePatients.length === 0 ? (
        <p style={{ marginTop: 24, color: "#64748b", fontSize: 16 }}>No patients in this ward.</p>
      ) : (
        <>
          {highRiskRows.length > 0 ? (
            <section style={{ marginTop: 24 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "1.1rem" }}>⚠️ High risk patients</h2>
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }}>
                  {highRiskRows.map((r) => (
                    <li key={r.patientId} style={{ marginBottom: 10, lineHeight: 1.45 }}>
                      <strong>{r.displayName}</strong>
                      <div style={{ fontSize: 13, color: "#9a3412", marginTop: 4 }}>
                        {r.drivers?.length ? r.drivers.slice(0, 3).join(" · ") : "Review clinical record and risk drivers."}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link
                          to={`/patients/${encodeURIComponent(r.patientId)}`}
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#ea580c",
                            color: "#fff",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 13,
                            textDecoration: "none",
                          }}
                        >
                          Open record
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <h2 style={{ marginTop: 28, marginBottom: 12, fontSize: "1.05rem" }}>
            All patients ({filteredRows.length}
            {filteredRows.length !== sortedRows.length ? ` of ${sortedRows.length}` : ""})
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {filteredRows.map((r) => (
              <Link
                key={r.patientId}
                to={`/patients/${encodeURIComponent(r.patientId)}`}
                style={cardBase}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = cardBase.boxShadow;
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{r.displayName}</div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span
                    style={{
                      ...riskBadgeStyle(r.overallRisk),
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {riskLabel(r.overallRisk)}
                  </span>
                  <span style={{ fontSize: 18, color: "#334155" }} title={trendTitle(r.trend)}>
                    {trendArrow(r.trend)}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{trendTitle(r.trend)}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Top alerts</div>
                {r.topAlerts.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>None</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: "#334155" }}>
                    {r.topAlerts.map((a) => (
                      <li key={a.id} style={{ marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>{alertLabel(a.type)}</span>
                        {a.severity ? (
                          <span style={{ color: "#64748b", marginLeft: 6 }}>({a.severity})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
                  Last update:{" "}
                  {r.lastUpdatedMs > 0 ? formatUkDateTime(new Date(r.lastUpdatedMs)) : "—"}
                </div>
                {r.nursingSummary ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.4 }}>
                    <strong>Nursing:</strong> {r.nursingSummary}
                  </div>
                ) : null}
              </Link>
            ))}
          </div>
          {filteredRows.length === 0 && sortedRows.length > 0 ? (
            <p style={{ marginTop: 20, color: "#64748b" }}>No patients match the current filters.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
