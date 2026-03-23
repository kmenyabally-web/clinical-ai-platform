import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useNavigate, Link } from "react-router-dom";
import { useComplianceData } from "../hooks/useComplianceData";
import { useDocumentCounts } from "../hooks/useDocumentCounts";
import { useRecentDocuments } from "../hooks/useRecentDocuments";
import { useReadinessScore } from "../hooks/useReadinessScore";
import { useRole } from "../context/RoleContext";
import { useService } from "../context/ServiceContext";
import { CQC_DOCUMENT_DOMAINS } from "../config/documentDomains";
import { evaluateAndCreateNotifications } from "../services/notificationService";
import { fetchEvidence } from "../services/evidenceService";
import { fetchOpenIncidents } from "../services/incidentService";
import { calculateReadinessFromEvidence } from "../utils/readinessScore";
import EmptyState from "../components/EmptyState";

const EVIDENCE_READINESS_DOMAINS = [
  { key: "safeScore", label: "Safe", domain: "safe" },
  { key: "effectiveScore", label: "Effective", domain: "effective" },
  { key: "caringScore", label: "Caring", domain: "caring" },
  { key: "responsiveScore", label: "Responsive", domain: "responsive" },
  { key: "wellLedScore", label: "Well-led", domain: "well-led" },
];

const skeletonStyle = {
  background: "linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.2s ease-in-out infinite",
  borderRadius: 6,
};

function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading dashboard" style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              minWidth: "140px",
              padding: "1rem",
              background: "#f0f0f0",
              borderRadius: 8,
            }}
          >
            <div style={{ ...skeletonStyle, height: 14, width: "70%", marginBottom: 8 }} />
            <div style={{ ...skeletonStyle, height: 28, width: "50%" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ padding: "1rem", background: "#f5f5f5", borderRadius: 8 }}>
            <div style={{ ...skeletonStyle, height: 12, width: "80%", marginBottom: 12 }} />
            <div style={{ ...skeletonStyle, height: 20, width: "40%" }} />
          </div>
        ))}
      </div>
      <div style={{ padding: "1rem", background: "#f5f5f5", borderRadius: 8 }}>
        <div style={{ ...skeletonStyle, height: 16, width: "30%", marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...skeletonStyle, height: 36, width: "100%", marginBottom: 8 }} />
        ))}
      </div>
    </section>
  );
}

const defaultCounts = { totalCount: 0, governance: 0, safeguarding: 0, mentalCapacity: 0, staffing: 0, carePlanning: 0 };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { organisationId, organisation, loading: orgLoading } = useOrganisation();
  const navigate = useNavigate();
  const { domains = [], stats = null, urgentActions = [], loading = false, error = null } = useComplianceData();
  const { counts: documentCounts = defaultCounts } = useDocumentCounts();
  const { documents: recentDocuments = [] } = useRecentDocuments(5);
  const {
    overallScore: readinessScore = 0,
    riskLevel: readinessRiskLevel = "High",
    domainScores = [],
    overdueActions = [],
    missingEvidence = [],
    loading: readinessLoading = false,
    error: readinessError = null,
  } = useReadinessScore();
  const { can, role } = useRole();
  const canViewDetailedRisk = can("audit:update");
  const { currentServiceId, services = [], loading: serviceLoading = false } = useService();
  const auditContext = organisationId && user?.uid ? { organisationId, userId: user.uid, userRole: role ?? "" } : undefined;

  const [evidence, setEvidence] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(true);
  const [openIncidents, setOpenIncidents] = useState([]);
  const [incidentFeedLoading, setIncidentFeedLoading] = useState(true);

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    services: 0,
    users: 0,
    incidents: 0,
    evidence: 0,
  });

  const loadEvidence = useCallback(() => {
    if (!organisationId) {
      setEvidence([]);
      setEvidenceLoading(false);
      return;
    }
    setEvidenceLoading(true);
    fetchEvidence(organisationId, currentServiceId ?? null)
      .then((list) => setEvidence(Array.isArray(list) ? list : []))
      .catch(() => setEvidence([]))
      .finally(() => setEvidenceLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  useEffect(() => {
    if (!organisationId) {
      setOpenIncidents([]);
      setIncidentFeedLoading(false);
      return;
    }
    setIncidentFeedLoading(true);
    fetchOpenIncidents(organisationId, currentServiceId ?? null)
      .then((list) => setOpenIncidents(Array.isArray(list) ? list : []))
      .catch(() => setOpenIncidents([]))
      .finally(() => setIncidentFeedLoading(false));
  }, [organisationId, currentServiceId]);

  const evidenceReadiness = useMemo(
    () => calculateReadinessFromEvidence(evidence),
    [evidence]
  );

  async function loadMetrics() {
    try {
      setMetricsLoading(true);
      // Existing Firestore-backed metrics in this file are unchanged;
      // this stub simply demonstrates where aggregation would live.
      const servicesCount = 0;
      const usersCount = 0;
      const incidentsCount = 0;
      const evidenceCount = 0;

      setMetrics({
        services: servicesCount,
        users: usersCount,
        incidents: incidentsCount,
        evidence: evidenceCount,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Dashboard metrics error:", error);
    } finally {
      setMetricsLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    if (!organisationId || !user?.uid || !auditContext) return;
    evaluateAndCreateNotifications(organisationId, auditContext, currentServiceId).catch(() => {});
  }, [organisationId, user?.uid, currentServiceId]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const overallScore = stats?.overallComplianceScore ?? 0;
  const openActionCount = stats?.openActionCount ?? 0;
  const highRiskActionCount = stats?.highRiskActionCount ?? 0;
  const safeDomains = Array.isArray(domains) ? domains : [];
  const isEmpty = !loading && !error && safeDomains.length === 0 && !stats;
  const notSetUpYet = (organisationId && !loading && organisation == null) || (organisationId && Array.isArray(services) && services.length === 0 && !serviceLoading);

  if (metricsLoading) {
    return (
      <div style={{ padding: 40 }}>
        Loading dashboard metrics...
      </div>
    );
  }

  if (organisation == null) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Dashboard</h1>
        <p>Signed in as {user?.email}</p>
        {orgLoading ? (
          <p style={{ color: "#666" }}>Loading organisation...</p>
        ) : (
          <EmptyState />
        )}
        <button type="button" onClick={handleLogout} style={{ marginTop: "2rem" }}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Dashboard</h1>
      <p>Signed in as {user?.email}</p>
      {organisation != null && (
        <p>Organisation: {organisation.name ?? "—"}</p>
      )}
      <p style={{ fontSize: "14px", color: "#666" }}>
        All data on this dashboard is scoped to organisation ID: <code>{organisationId ?? "—"}</code>
      </p>

      {loading && <DashboardSkeleton />}

      {!loading && !error && organisationId && ((Array.isArray(overdueActions) && overdueActions.length > 0) || (Array.isArray(missingEvidence) && missingEvidence.length > 0) || (Array.isArray(domainScores) && domainScores.some((d) => d?.riskLevel === "High"))) && (
        <section aria-label="Alerts" style={{ marginTop: "1.5rem" }}>
          <div style={{ padding: "1rem 1.25rem", background: "#fff8e1", border: "1px solid #ffcc80", borderRadius: 12 }}>
            <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.5rem" }}>Alerts</h2>
            <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
              {overdueActions.length > 0 && <li>Overdue actions: {overdueActions.length}</li>}
              {missingEvidence.length > 0 && <li>Missing evidence: {missingEvidence.length} domain(s)</li>}
              {domainScores?.filter((d) => d.riskLevel === "High").length > 0 && (
                <li>High risk domains: {domainScores.filter((d) => d.riskLevel === "High").length}</li>
              )}
            </ul>
            <Link to="/notifications" style={{ display: "inline-block", marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>
              View all notifications →
            </Link>
          </div>
        </section>
      )}

      {!loading && error && (
        <p role="alert" style={{ marginTop: "1rem", color: "#c00" }}>
          {error}
        </p>
      )}

      {!loading && !error && notSetUpYet && (
        <section style={{ marginTop: "1.5rem", padding: "1.5rem", background: "#e3f2fd", borderRadius: "8px", border: "1px solid #90caf9" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Your organisation is not set up yet</h2>
          <p style={{ margin: 0, color: "#555" }}>
            Please create your first service to get started.
          </p>
          <Link to="/services" style={{ display: "inline-block", marginTop: "0.75rem", padding: "8px 16px", background: "#1976d2", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
            Go to Services
          </Link>
        </section>
      )}

      {!loading && !error && !notSetUpYet && isEmpty && (
        <section style={{ marginTop: "1.5rem", padding: "1.5rem", background: "#f5f5f5", borderRadius: "8px" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>No compliance data yet</h2>
          <p style={{ margin: 0, color: "#666" }}>
            Domain compliance and actions will appear here once data has been recorded for your organisation.
          </p>
        </section>
      )}

      {!loading && !error && (
        <section aria-label="CQC Readiness" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>CQC Readiness</h2>
          <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.75rem" }}>
            Based on uploaded evidence for the selected service. Each domain needs at least 3 documents for 100%.
          </p>
          {evidenceLoading ? (
            <div style={{ padding: "1rem", color: "#666" }}>Loading readiness…</div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                <div
                  style={{
                    minWidth: "160px",
                    padding: "1.25rem",
                    background:
                      evidenceReadiness.riskLevel === "Low"
                        ? "#e8f5e9"
                        : evidenceReadiness.riskLevel === "Medium"
                        ? "#fff8e1"
                        : "#ffebee",
                    borderRadius: 12,
                    border:
                      evidenceReadiness.riskLevel === "Low"
                        ? "1px solid #a5d6a7"
                        : evidenceReadiness.riskLevel === "Medium"
                        ? "1px solid #ffcc80"
                        : "1px solid #ef9a9a",
                  }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#555", marginBottom: 4 }}>Overall readiness</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>{evidenceReadiness.overallScore}%</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: 4 }}>
                    Risk level: {evidenceReadiness.riskLevel}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Domain scores (evidence-based)</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {EVIDENCE_READINESS_DOMAINS.map((d) => {
                    const score = evidenceReadiness[d.key] ?? 0;
                    const risk = score >= 71 ? "Low" : score >= 41 ? "Medium" : "High";
                    return (
                      <div
                        key={d.key}
                        style={{
                          padding: "0.5rem 0.75rem",
                          background:
                            risk === "Low" ? "#e8f5e9" : risk === "Medium" ? "#fff8e1" : "#ffebee",
                          borderRadius: 8,
                          fontSize: "0.875rem",
                        }}
                      >
                        {d.label}: {score}%
                      </div>
                    );
                  })}
                </div>
              </div>
              {EVIDENCE_READINESS_DOMAINS.some((d) => (evidenceReadiness[d.key] ?? 0) < 100) && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#c62828" }}>
                    Missing evidence
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {EVIDENCE_READINESS_DOMAINS.filter((d) => (evidenceReadiness[d.key] ?? 0) < 100).map((d) => {
                      const count = evidence.filter(
                        (e) => (e.domain || "").toLowerCase() === (d.domain || "")
                      ).length;
                      return (
                        <li key={d.key} style={{ marginBottom: 4 }}>
                          {d.label}: at least 3 evidence documents required (currently {count})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {Array.isArray(overdueActions) && overdueActions.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#d84315" }}>
                    Overdue action alerts
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                    {overdueActions.map((a) => (
                      <li key={a?.id ?? ""} style={{ marginBottom: 4 }}>
                        {a?.title ?? ""}
                        {canViewDetailedRisk && " (-3 points each)"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {!loading && !error && (
        <section aria-label="Live incident feed" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Live Incident Feed</h2>
          {incidentFeedLoading ? (
            <div style={{ color: "#666", fontSize: "0.9rem" }}>Loading open incidents…</div>
          ) : openIncidents.length === 0 ? (
            <div style={{ color: "#555", fontSize: "0.9rem" }}>No open incidents right now.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {openIncidents.map((incident) => (
                <li
                  key={incident.id}
                  style={{
                    padding: "0.75rem 0.9rem",
                    border: "1px solid #fee2e2",
                    background: incident.safeguardingHighPriority ? "#fef2f2" : "#fff",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {incident.type || "Incident"} {incident.safeguardingHighPriority ? "• High Priority Safeguarding" : ""}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#555" }}>
                    Patient: {incident.patientId || "N/A"} · Status: {incident.status || "Open"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#555" }}>
                    {incident.description ? String(incident.description).slice(0, 180) : "No description"}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/incidents" style={{ display: "inline-block", marginTop: "0.5rem", fontWeight: 600 }}>
            Go to incidents →
          </Link>
        </section>
      )}

      {!loading && !error && (
        <section aria-label="Documents" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Documents</h2>
          <div style={{ marginBottom: "0.75rem" }}>
            <span style={{ padding: "0.5rem 1rem", background: "#e8f5e9", borderRadius: 8, fontSize: "0.875rem" }}>
              Total documents uploaded: <strong>{documentCounts?.totalCount ?? 0}</strong>
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
            {CQC_DOCUMENT_DOMAINS.map((d) => {
              const key = d.value === "mental-capacity" ? "mentalCapacity" : d.value === "care-planning" ? "carePlanning" : d.value;
              const count = documentCounts && typeof documentCounts === "object" ? (documentCounts[key] ?? 0) : 0;
              return (
                <div
                  key={d.value}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#f5f5f5",
                    borderRadius: 8,
                    fontSize: "0.875rem",
                  }}
                >
                  {d.label}: <strong>{count}</strong>
                </div>
              );
            })}
          </div>
          {Array.isArray(recentDocuments) && recentDocuments.length > 0 && (
            <>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Recently uploaded</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentDocuments.map((doc) => (
                  <li
                    key={`${doc?.collection ?? ""}-${doc?.id ?? ""}`}
                    style={{
                      padding: "0.5rem 0",
                      borderBottom: "1px solid #eee",
                      fontSize: "0.875rem",
                    }}
                  >
                    {doc?.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        {doc?.title || doc?.fileName || "Document"}
                      </a>
                    ) : (
                      <span>{doc?.title || doc?.fileName || "Document"}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <section aria-label="Reports" style={{ marginTop: "1.5rem" }}>
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "#f5f5f5",
            borderRadius: 12,
            border: "1px solid #e0e0e0",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.5rem" }}>CQC Readiness Report</h2>
          <p style={{ margin: 0, color: "#555", fontSize: "0.875rem" }}>
            Generate or view a structured compliance report with organisation summary, domain scores, risk indicators, evidence coverage, and inspection simulation results.
          </p>
          <Link
            to="/reports"
            style={{
              display: "inline-block",
              marginTop: "0.75rem",
              padding: "8px 16px",
              background: "#1976d2",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            Open Reports
          </Link>
        </div>
      </section>

      {!loading && !error && !isEmpty && (
        <>
          <section aria-label="Compliance overview" style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ minWidth: "140px", padding: "1rem", background: "#f0f7ff", borderRadius: "8px", border: "1px solid #cce" }}>
                <div style={{ fontSize: "0.875rem", color: "#555" }}>Overall compliance</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{overallScore}%</div>
              </div>
              <div style={{ minWidth: "140px", padding: "1rem", background: "#fff8f0", borderRadius: "8px", border: "1px solid #ecc" }}>
                <div style={{ fontSize: "0.875rem", color: "#555" }}>Open actions</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{openActionCount}</div>
              </div>
              <div style={{ minWidth: "140px", padding: "1rem", background: "#fff0f0", borderRadius: "8px", border: "1px solid #ecc" }}>
                <div style={{ fontSize: "0.875rem", color: "#555" }}>High-risk actions</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{highRiskActionCount}</div>
              </div>
            </div>
          </section>

          {safeDomains.length > 0 && (
            <section aria-label="Domain compliance" style={{ marginTop: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Domain compliance</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
                {safeDomains.map((d) => (
                  <div
                    key={d?.id ?? ""}
                    style={{
                      padding: "1rem",
                      background: "#fff",
                      borderRadius: 8,
                      border: "1px solid #e0e0e0",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 4 }}>{d?.name || d?.domainKey || "—"}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1976d2" }}>{d?.compliancePercent ?? 0}%</div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>{d?.readinessLevel ?? "—"}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {Array.isArray(urgentActions) && urgentActions.length > 0 && (
            <section aria-label="Urgent actions" style={{ marginTop: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Urgent actions</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {urgentActions.map((a) => (
                  <li
                    key={a?.id ?? ""}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "#fff8f0",
                      border: "1px solid #ffcc80",
                      borderRadius: 6,
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{a?.title ?? ""}</span>
                    <span style={{ fontSize: "0.875rem", color: "#666", marginLeft: 8 }}>
                      {a?.riskLevel === "high" ? "High risk" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <button type="button" onClick={handleLogout} style={{ marginTop: "2rem" }}>
        Log out
      </button>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
