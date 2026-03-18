import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import IncidentForm from "../components/IncidentForm";
import { fetchIncidents, createIncident, INCIDENT_SEVERITY } from "../services/incidentService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";

function formatDate(value) {
  if (!value) return "—";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString();
    } catch {
      return "—";
    }
  }
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function Incidents() {
  const { organisationId } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { user } = useAuth();
  const { role } = useRole();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterServiceId, setFilterServiceId] = useState("");

  const effectiveServiceId = filterServiceId || currentServiceId || null;

  const loadIncidents = useCallback(() => {
    if (!organisationId) {
      setIncidents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchIncidents(organisationId, {
      serviceId: effectiveServiceId ?? undefined,
      severity: filterSeverity || undefined,
      status: filterStatus || undefined,
    })
      .then((list) => setIncidents(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load incidents."));
        setIncidents([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, effectiveServiceId, filterSeverity, filterStatus]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  async function handleCreateIncident(payload) {
    if (!organisationId || !effectiveServiceId || !user?.uid) return;
    setCreating(true);
    setError(null);
    try {
      await createIncident({
        organisationId,
        serviceId: effectiveServiceId,
        patientId: payload.patientId,
        type: payload.type,
        severity: payload.severity,
        description: payload.description,
        actionsTaken: payload.actionsTaken,
        reportedBy: user.email || user.uid,
        linkedEvidence: [],
        status: "open",
      });
      loadIncidents();
    } catch (err) {
      console.error("Failed to create incident", err);
      setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to create incident."));
    } finally {
      setCreating(false);
    }
  }

  const safeServices = Array.isArray(services) ? services : [];
  const reportSectionRef = useRef(null);

  return (
    <div style={{ padding: "2rem" }}>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: "1.5rem" }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>Incidents & Safeguarding</h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
            Record and review safeguarding concerns and incidents linked to patients.
          </p>
          {user?.email && (
            <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8rem", color: "#999" }}>
              Signed in as {user.email} ({role || "Staff"})
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => reportSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#005eb8",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Report Incident
        </button>
      </div>

      <section
        aria-label="Incident filters"
        style={{
          marginBottom: "1rem",
          padding: "1rem 1.25rem",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1rem", margin: 0, marginBottom: "0.75rem" }}>Filters</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              <option value="">All</option>
              {INCIDENT_SEVERITY.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Service</label>
            <select
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
            >
              <option value="">Current service</option>
              {safeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName || s.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section
        ref={reportSectionRef}
        aria-label="Report new incident"
        style={{
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1rem", margin: 0, marginBottom: "0.75rem" }}>Report an incident</h2>
        <IncidentForm onSubmit={handleCreateIncident} loading={creating} legacy />
      </section>

      <section aria-label="Incidents list">
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Incidents</h2>
        {loading && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              color: "#666",
            }}
          >
            Loading incidents…
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            style={{
              marginTop: "0.5rem",
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
        )}

        {!loading && !error && incidents.length === 0 && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
            No records yet
          </p>
        )}

        {!loading && !error && incidents.length > 0 && (
          <div
            style={{
              marginTop: "0.75rem",
              background: "#ffffff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Date / time</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Patient</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Severity</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Reported by</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Description</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                      {formatDate(incident.reportedAt)}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{incident.patientId}</td>
                    <td style={{ padding: "0.5rem 0.75rem", textTransform: "capitalize" }}>
                      {incident.type?.replace(/_/g, " ") || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", textTransform: "capitalize" }}>
                      {incident.severity || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", textTransform: "capitalize" }}>
                      {incident.status || "open"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>{incident.reportedBy || "—"}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      {incident.description || "No description"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      {incident.patientId ? (
                        <Link
                          to={`/patients/${incident.patientId}/timeline`}
                          style={{ color: "#2563eb", fontSize: "0.85rem", textDecoration: "none" }}
                        >
                          View timeline
                        </Link>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

