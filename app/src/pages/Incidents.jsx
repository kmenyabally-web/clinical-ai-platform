import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import IncidentForm from "../components/IncidentForm";
import { fetchIncidents, createIncidentLegacy, INCIDENT_SEVERITY } from "../services/incidentService";
import { getPatientById } from "../services/patientService";
import { generateCandourLetter } from "../services/aiService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";

/** Regulation 20 candour: show draft letter for medium/high severity incidents. */
function isDutyOfCandourSeverity(severity) {
  const s = String(severity ?? "").toLowerCase();
  return s === "medium" || s === "high";
}

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

  const [candourModalOpen, setCandourModalOpen] = useState(false);
  const [candourLetterText, setCandourLetterText] = useState("");
  const [candourLoadingId, setCandourLoadingId] = useState(null);
  const [candourError, setCandourError] = useState(null);

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
      await createIncidentLegacy({
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

  /** Draft from the report form (before/without relying on the saved row). */
  async function handleDraftCandourFromForm(payload) {
    setCandourError(null);
    setCandourLoadingId("preview-form");
    try {
      let patientData = { id: payload.patientId || "", firstName: "", lastName: "" };
      if (payload.patientId) {
        try {
          patientData = await getPatientById(payload.patientId);
        } catch {
          /* minimal metadata */
        }
      }
      const incident = {
        id: "preview",
        type: payload.type,
        severity: payload.severity,
        description: payload.description,
        actionsTaken: payload.actionsTaken,
        status: "open",
        patientId: payload.patientId,
        reportedBy: user?.email || user?.uid,
        reportedAt: new Date(),
      };
      const letter = await generateCandourLetter(incident, patientData);
      setCandourLetterText(letter);
      setCandourModalOpen(true);
    } catch (err) {
      setCandourError(err?.message ?? "Could not generate Duty of Candour letter.");
      setCandourModalOpen(true);
      setCandourLetterText("");
    } finally {
      setCandourLoadingId(null);
    }
  }

  async function handleDraftCandourLetter(incident) {
    if (!incident?.id) return;
    setCandourError(null);
    setCandourLoadingId(incident.id);
    try {
      let patientData = { id: incident.patientId || "", firstName: "", lastName: "" };
      if (incident.patientId) {
        try {
          patientData = await getPatientById(incident.patientId);
        } catch {
          /* use minimal metadata if patient fetch fails */
        }
      }
      const letter = await generateCandourLetter(incident, patientData);
      setCandourLetterText(letter);
      setCandourModalOpen(true);
    } catch (err) {
      setCandourError(err?.message ?? "Could not generate Duty of Candour letter.");
      setCandourModalOpen(true);
      setCandourLetterText("");
    } finally {
      setCandourLoadingId(null);
    }
  }

  function closeCandourModal() {
    setCandourModalOpen(false);
    setCandourLetterText("");
    setCandourError(null);
  }

  async function copyCandourLetter() {
    if (!candourLetterText.trim()) return;
    try {
      await navigator.clipboard.writeText(candourLetterText);
    } catch {
      setCandourError("Copy failed. Select the text and copy manually.");
    }
  }

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
        <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.45 }}>
          <strong>Duty of Candour (Regulation 20):</strong> For <strong>Medium</strong> or <strong>High</strong> severity, use{" "}
          <strong>Draft Duty of Candour letter</strong> below (works from this form), or after saving use the same control in
          the incidents table. It does not appear for Low severity.
        </p>
        <IncidentForm
          onSubmit={handleCreateIncident}
          loading={creating}
          legacy
          onDraftCandour={handleDraftCandourFromForm}
          draftCandourLoading={candourLoadingId === "preview-form"}
        />
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
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Duty of Candour</th>
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
                    <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top" }}>
                      {isDutyOfCandourSeverity(incident.severity) ? (
                        <button
                          type="button"
                          onClick={() => handleDraftCandourLetter(incident)}
                          disabled={candourLoadingId === incident.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            cursor: candourLoadingId === incident.id ? "wait" : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {candourLoadingId === incident.id ? "Drafting…" : "Draft Duty of Candour Letter"}
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
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

      {candourModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="candour-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
              <h2 id="candour-modal-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Duty of Candour letter (draft)
              </h2>
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Regulation 20 — edit before sending. This is a draft; review with your governance lead.
              </p>
            </div>
            <div style={{ padding: "1rem 1.25rem", flex: 1, overflow: "auto" }}>
              {candourError && !candourLetterText ? (
                <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
                  {candourError}
                </p>
              ) : (
                <textarea
                  value={candourLetterText}
                  onChange={(e) => setCandourLetterText(e.target.value)}
                  rows={18}
                  style={{
                    width: "100%",
                    minHeight: 320,
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                  placeholder="Letter will appear here…"
                />
              )}
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={copyCandourLetter}
                disabled={!candourLetterText.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 600,
                  cursor: !candourLetterText.trim() ? "default" : "pointer",
                }}
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={closeCandourModal}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#005eb8",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

