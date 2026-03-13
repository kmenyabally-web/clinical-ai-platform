import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { getComplianceScore } from "../services/complianceEngine";
import { getLatestSimulation, getInspectionRiskLevel } from "../services/inspectionSimulator";
import { listPatients } from "../services/patientService";
import { fetchIncidents } from "../services/incidentService";
import { fetchDocuments } from "../services/documentService";
import { countCarePlansDueForReview } from "../services/carePlanManagementService";
import ComplianceScoreCard from "../components/ComplianceScoreCard";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";

export default function Dashboard() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    openIncidents: 0,
    safeguardingAlerts: 0,
    documentsUploaded: 0,
    carePlansDue: 0,
  });
  const [complianceScore, setComplianceScore] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState(null);
  const [inspectionRiskLevel, setInspectionRiskLevel] = useState(null);

  const currentServiceName =
    Array.isArray(services) && services.length > 0 && currentServiceId
      ? (services.find((s) => s?.id === currentServiceId)?.serviceName ||
          services.find((s) => s?.id === currentServiceId)?.name) ?? "Current service"
      : "All services";

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
          fetchIncidents(organisationId, { serviceId: currentServiceId ?? undefined }),
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

    async function loadCompliance() {
      if (!organisationId) {
        setComplianceScore(null);
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
          setComplianceScore(score);
        }
      } catch (err) {
        console.error("Dashboard compliance score error:", err);
        if (!cancelled) {
          setComplianceScore(null);
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

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginTop: 0 }}>Compliance Dashboard</h1>
      {organisation?.name && (
        <p style={{ margin: "0 0 1rem 0", color: "#555", fontSize: "0.95rem" }}>
          {organisation.name}
          {currentServiceId ? ` · ${currentServiceName}` : ""}
        </p>
      )}

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

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Dashboard</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
          <div style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Total Patients</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.totalPatients}</p>
            <Link to="/patients" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Open Incidents</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.openIncidents}</p>
            <Link to="/incidents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div style={{ padding: 20, background: metrics.safeguardingAlerts > 0 ? "#fef2f2" : "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Safeguarding Alerts</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.safeguardingAlerts}</p>
            <Link to="/incidents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Documents Uploaded</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>{metricsLoading ? "—" : metrics.documentsUploaded}</p>
            <Link to="/documents" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Care Plans Due for Review</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {metricsLoading ? "—" : metrics.carePlansDue}
            </p>
            <Link to="/care-plans" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div style={{ padding: 20, background: "#f3f3f3", borderRadius: 12 }}>
            <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem" }}>Compliance Score</h3>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
              {complianceLoading ? "—" : complianceScore != null ? `${complianceScore.overallScore ?? "—"}%` : "—"}
            </p>
            <Link to="/compliance" style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: 4, display: "inline-block" }}>View →</Link>
          </div>
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              border: "2px solid",
              borderColor:
                displayRiskLevel === "LOW RISK"
                  ? "#22c55e"
                  : displayRiskLevel === "MEDIUM RISK"
                  ? "#f59e0b"
                  : displayRiskLevel === "HIGH RISK"
                  ? "#ef4444"
                  : "#e5e7eb",
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
      </section>

      <section aria-label="CQC compliance scores">
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>CQC compliance scores</h2>
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
