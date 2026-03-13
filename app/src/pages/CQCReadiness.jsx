import { useEffect, useMemo, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { fetchCqcScores } from "../services/cqcScoreService";

const DOMAINS = [
  { key: "governance", label: "Governance" },
  { key: "safeguarding", label: "Safeguarding" },
  { key: "mental-capacity", label: "Mental Capacity" },
  { key: "staffing", label: "Staffing & Training" },
  { key: "care-planning", label: "Care Planning" },
];

function riskColour(level) {
  if (level === "Low") return { bg: "#e8f5e9", border: "#a5d6a7" };
  if (level === "Medium") return { bg: "#fff8e1", border: "#ffcc80" };
  return { bg: "#ffebee", border: "#ef9a9a" };
}

export default function CQCReadiness() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();

  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setScores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCqcScores(organisationId)
      .then((list) => setScores(Array.isArray(list) ? list : []))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load CQC scores", err);
        setError(err?.message ?? "Failed to load CQC readiness scores.");
        setScores([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId]);

  const domainScores = useMemo(() => {
    const byDomain = new Map();
    for (const s of scores) {
      if (!s.domain) continue;
      byDomain.set(s.domain, s);
    }
    return DOMAINS.map((d) => {
      const entry = byDomain.get(d.key) || {};
      const score = typeof entry.score === "number" ? entry.score : 0;
      let riskLevel = entry.riskLevel || "High";
      if (!entry.riskLevel) {
        if (score >= 71) riskLevel = "Low";
        else if (score >= 41) riskLevel = "Medium";
        else riskLevel = "High";
      }
      return {
        key: d.key,
        label: d.label,
        score,
        riskLevel,
        openActions: typeof entry.openActions === "number" ? entry.openActions : 0,
      };
    });
  }, [scores]);

  const overallScore = useMemo(() => {
    if (!domainScores.length) return 0;
    const total = domainScores.reduce((sum, d) => sum + (d.score ?? 0), 0);
    return Math.round(total / domainScores.length);
  }, [domainScores]);

  const overallRisk = useMemo(() => {
    if (overallScore >= 71) return "Low";
    if (overallScore >= 41) return "Medium";
    return "High";
  }, [overallScore]);

  const overallColours = riskColour(overallRisk);

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>CQC Readiness</h1>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
          Inspection readiness scores for your organisation by key CQC domains.
        </p>
        <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.85rem", color: "#777" }}>
          Organisation: {organisation?.name ?? organisationId ?? "—"}
        </p>
        {currentServiceId && (
          <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8rem", color: "#999" }}>
            Service scope: {currentServiceId}
          </p>
        )}
        {user?.email && (
          <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8rem", color: "#999" }}>
            Viewing as {user.email}
          </p>
        )}
      </header>

      {loading && (
        <section aria-busy="true">
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              color: "#666",
            }}
          >
            Loading CQC readiness scores…
          </div>
        </section>
      )}

      {!loading && error && (
        <section style={{ marginTop: "0.75rem" }}>
          <div
            role="alert"
            style={{
              background: "#ffebee",
              border: "1px solid #ef9a9a",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              color: "#b71c1c",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        </section>
      )}

      {!loading && !error && (
        <>
          <section aria-label="Overall CQC readiness">
            <div
              style={{
                minWidth: "200px",
                padding: "1.25rem",
                background: overallColours.bg,
                borderRadius: 12,
                border: `1px solid ${overallColours.border}`,
                display: "inline-block",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.9rem", color: "#555", marginBottom: 4 }}>
                Inspection Readiness
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 700 }}>{overallScore}%</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: 4 }}>
                Overall risk: {overallRisk}
              </div>
            </div>
          </section>

          <section aria-label="Domain readiness scores" style={{ marginTop: "0.5rem" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Domain scores</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {domainScores.map((d) => {
                const colours = riskColour(d.riskLevel);
                return (
                  <div
                    key={d.key}
                    style={{
                      padding: "0.9rem 1rem",
                      background: colours.bg,
                      borderRadius: 10,
                      border: `1px solid ${colours.border}`,
                    }}
                  >
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{d.score}%</div>
                    <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", color: "#555" }}>
                      Risk: {d.riskLevel}
                    </div>
                    <div style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "#64748b" }}>
                      Open actions: {d.openActions}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

