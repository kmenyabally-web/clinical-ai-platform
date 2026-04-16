import React, { useEffect, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import {
  getComplianceScore,
  getComplianceScoresForOrganisation,
  getScoreBand,
  calculateComplianceScore,
} from "../services/complianceEngine";
import ComplianceScoreCard from "../components/ComplianceScoreCard";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { formatUkDateTime } from "../utils/dateFormat";
import { listPolicies } from "../services/policyService";
import { fetchIncidents } from "../services/incidentService";
import { listStaffTraining } from "../services/staffTrainingService";
import { getCqcInsight } from "../utils/cqcInsights";

const BAND_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

function formatCalculatedAt(calculatedAt) {
  return formatUkDateTime(calculatedAt, "—");
}

export default function ComplianceOverview() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [score, setScore] = useState(null);
  const [allScores, setAllScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [insightContext, setInsightContext] = useState({
    noPolicies: false,
    missingIncidents: false,
    noTraining: false,
  });

  const serviceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        currentServiceId
      : "All services";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!organisationId) {
        setScore(null);
        setAllScores([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [current, all] = await Promise.all([
          getComplianceScore(organisationId, currentServiceId ?? undefined, { calculateIfMissing: true }),
          getComplianceScoresForOrganisation(organisationId),
        ]);
        if (!cancelled) {
          setScore(current);
          setAllScores(Array.isArray(all) ? all : []);
        }
      } catch (err) {
        console.error("Compliance overview load error:", err);
        if (!cancelled) {
          setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load compliance scores."));
          setScore(null);
          setAllScores([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [organisationId, currentServiceId]);

  async function handleRecalculate() {
    if (!organisationId || recalculating) return;
    setRecalculating(true);
    setError(null);
    try {
      await calculateComplianceScore(organisationId, currentServiceId ?? undefined);
      const updated = await getComplianceScore(organisationId, currentServiceId ?? undefined);
      setScore(updated);
      const all = await getComplianceScoresForOrganisation(organisationId);
      setAllScores(Array.isArray(all) ? all : []);
    } catch (err) {
      setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Recalculation failed."));
    } finally {
      setRecalculating(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInsights() {
      if (!organisationId) return;
      try {
        const [policies, incidents, training] = await Promise.all([
          listPolicies(organisationId),
          fetchIncidents(organisationId, {}),
          listStaffTraining(organisationId, currentServiceId ?? null),
        ]);
        if (cancelled) return;
        setInsightContext({
          noPolicies: !Array.isArray(policies) || policies.length === 0,
          missingIncidents: !Array.isArray(incidents) || incidents.length === 0,
          noTraining: !Array.isArray(training) || training.length === 0,
        });
      } catch {
        if (cancelled) return;
        setInsightContext((prev) => ({ ...prev }));
      }
    }
    void loadInsights();
    return () => {
      cancelled = true;
    };
  }, [organisationId, currentServiceId]);

  const riskDomains = score
    ? [
        { key: "safe", label: "Safe", value: score.safeScore },
        { key: "effective", label: "Effective", value: score.effectiveScore },
        { key: "caring", label: "Caring", value: score.caringScore },
        { key: "responsive", label: "Responsive", value: score.responsiveScore },
        { key: "wellLed", label: "Well-Led", value: score.wellLedScore },
      ].filter((d) => d.value < 70)
    : [];
  const cqcInsight = getCqcInsight(insightContext);

  return (
    <div style={{ padding: "24px", width: "100%" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>Compliance overview</h1>
        <p style={{ margin: 0, fontSize: "0.95rem", color: "#64748b" }}>
          CQC readiness scores by domain. All data is scoped by organisation and service.
        </p>
        {organisation?.name && (
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
            {organisation.name}
            {currentServiceId ? ` · ${serviceName}` : " · Organisation level"}
          </p>
        )}
      </header>
      {cqcInsight ? (
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${cqcInsight.level === "warning" ? "#fcd34d" : "#bfdbfe"}`,
            background: cqcInsight.level === "warning" ? "#fffbeb" : "#eff6ff",
            color: cqcInsight.level === "warning" ? "#92400e" : "#1e3a8a",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {cqcInsight.message}
        </div>
      ) : null}

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          Loading compliance scores…
        </div>
      )}

      {!loading && score && (
        <>
          <section style={{ marginBottom: "1.5rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.1rem", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Compliance scores</h2>
              <button
                type="button"
                onClick={handleRecalculate}
                disabled={recalculating}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: "0.875rem",
                  cursor: recalculating ? "default" : "pointer",
                }}
              >
                {recalculating ? "Recalculating…" : "Recalculate now"}
              </button>
            </div>
            <p style={{ margin: "0.25rem 0 0.75rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Last calculated: {formatCalculatedAt(score.calculatedAt)}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 16,
              }}
            >
              <ComplianceScoreCard label="Safe" score={score.safeScore} />
              <ComplianceScoreCard label="Effective" score={score.effectiveScore} />
              <ComplianceScoreCard label="Caring" score={score.caringScore} />
              <ComplianceScoreCard label="Responsive" score={score.responsiveScore} />
              <ComplianceScoreCard label="Well-Led" score={score.wellLedScore} />
            </div>
            <p style={{ marginTop: "0.75rem", fontSize: "0.95rem" }}>
              <strong>Overall: {score.overallScore}%</strong>
              {" · "}
              <span style={{ color: "#64748b" }}>
                90–100% Green · 70–89% Amber · Below 70% Red
              </span>
            </p>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>Risk indicators</h2>
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              {riskDomains.length === 0 ? (
                <p style={{ margin: 0, color: "#22c55e", fontWeight: 500 }}>
                  No domains currently below 70%. Risk level: Low.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#b91c1c" }}>
                  {riskDomains.map((d) => (
                    <li key={d.key}>
                      <strong>{d.label}</strong>: {d.value}% — below CQC threshold
                    </li>
                  ))}
                  <p style={{ margin: "0.5rem 0 0 0", fontWeight: 600 }}>
                    ⚠ Service at risk of CQC concern. Address these domains.
                  </p>
                </ul>
              )}
            </div>
          </section>

          <section style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>Trend</h2>
            <div
              style={{
                padding: "1.25rem",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                minHeight: 120,
              }}
            >
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                Overall score over time. Recalculate after incidents, care plan updates or evidence changes to update the current score.
              </p>
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                  height: 80,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    background: BAND_COLORS[getScoreBand(score.overallScore)] ?? BAND_COLORS.red,
                    height: `${Math.max(10, Math.min(100, score.overallScore))}%`,
                    borderRadius: 6,
                    minHeight: 8,
                  }}
                  title={`Overall: ${score.overallScore}%`}
                />
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Current</span>
              </div>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                Trend history can be enabled by storing score snapshots when recalculating.
              </p>
            </div>
          </section>

          {allScores.length > 1 && (
            <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.1rem", boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)" }}>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>Scores by service</h2>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Service</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Overall</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Safe</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Effective</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Caring</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Responsive</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Well-Led</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allScores.map((s) => (
                      <tr key={s.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {s.serviceId ? (services?.find((sv) => sv?.id === s.serviceId)?.serviceName ?? s.serviceId) : "Organisation"}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{s.overallScore}%</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{s.safeScore}%</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{s.effectiveScore}%</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{s.caringScore}%</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{s.responsiveScore}%</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{s.wellLedScore}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {!loading && !score && organisationId && (
        <div className="card clinical-section">
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.55, fontSize: "0.9375rem" }}>
            ⚠️ No compliance data available yet. Scores are calculated when you view the dashboard or this page, and when
            incidents, care plans or clinical notes are updated.
          </p>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="btn btn-secondary"
            style={{ marginTop: "1rem" }}
          >
            {recalculating ? "Calculating…" : "Calculate compliance score"}
          </button>
        </div>
      )}
    </div>
  );
}
