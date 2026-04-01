import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import IncidentForm from "../components/IncidentForm";
import {
  fetchIncidents,
  createIncidentLegacy,
  closeIncident,
  updateIncident,
  INCIDENT_SEVERITY,
} from "../services/incidentService";
import { showToast } from "../utils/toast";
import { listHospitals, listWards } from "../services/structureService";
import { getPatientById } from "../services/patientService";
import { generateCandourLetter } from "../services/aiService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { formatUkDateTime } from "../utils/dateFormat";
import ActionBar from "../components/ActionBar";

/** Regulation 20 candour: show draft letter for medium/high severity incidents. */
function isDutyOfCandourSeverity(severity) {
  const s = String(severity ?? "").toLowerCase();
  return s === "medium" || s === "high";
}

function formatDate(value) {
  return formatUkDateTime(value, "—");
}

export default function Incidents() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const { role } = useRole();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHospitalId, setFilterHospitalId] = useState("");
  const [filterWardId, setFilterWardId] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [wards, setWards] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);

  const [candourModalOpen, setCandourModalOpen] = useState(false);
  const [candourLetterText, setCandourLetterText] = useState("");
  const [candourLoadingId, setCandourLoadingId] = useState(null);
  const [candourError, setCandourError] = useState(null);

  const [editIncident, setEditIncident] = useState(null);
  const [editDraft, setEditDraft] = useState({
    description: "",
    severity: "medium",
    actionTaken: "",
    linkedSafeguardingIds: "",
  });
  const [incidentMutating, setIncidentMutating] = useState(false);
  const [closingId, setClosingId] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setHospitals([]);
      return;
    }
    let cancelled = false;
    setStructureLoading(true);
    listHospitals(organisationId)
      .then((list) => {
        if (!cancelled) setHospitals(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setHospitals([]);
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || !filterHospitalId) {
      setWards([]);
      return;
    }
    let cancelled = false;
    listWards(organisationId, filterHospitalId)
      .then((list) => {
        if (!cancelled) setWards(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId, filterHospitalId]);

  const loadIncidents = useCallback(() => {
    if (!organisationId) {
      setIncidents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchIncidents(organisationId, {
      hospitalId: filterHospitalId || undefined,
      wardId: filterWardId || undefined,
      severity: filterSeverity || undefined,
      status: filterStatus || undefined,
    })
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        console.log("Loaded incidents:", rows);
        setIncidents(rows);
      })
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load incidents."));
        setIncidents([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, filterHospitalId, filterWardId, filterSeverity, filterStatus]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  async function handleCreateIncident(payload) {
    if (!organisationId) {
      const msg = "Organisation not loaded. Refresh the page or check your account.";
      setError(msg);
      // eslint-disable-next-line no-alert
      alert(msg);
      throw new Error(msg);
    }
    if (!user?.uid) {
      const msg = "You must be signed in to report an incident.";
      setError(msg);
      // eslint-disable-next-line no-alert
      alert(msg);
      throw new Error(msg);
    }

    const savePayload = {
      type: payload.type,
      severity: payload.severity,
      description: payload.description,
      organisationId,
      patientId: payload.patientId,
      createdBy: user.uid,
    };
    console.log("Saving incident:", savePayload);

    setCreating(true);
    setError(null);
    try {
      await createIncidentLegacy({
        organisationId,
        patientId: payload.patientId,
        type: payload.type,
        severity: payload.severity,
        description: payload.description,
        actionsTaken: payload.actionsTaken,
        reportedBy: user.email || user.uid,
        linkedEvidence: [],
        status: "open",
      });
      await loadIncidents();
      showToast("Incident logged", "success");
    } catch (err) {
      console.error("INCIDENT SAVE ERROR:", err);
      // eslint-disable-next-line no-alert
      alert(`Failed to save incident: ${err?.message ?? "Unknown error"}`);
      setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to create incident."));
      throw err;
    } finally {
      setCreating(false);
    }
  }

  const reportSectionRef = useRef(null);

  function openIncidentReportSection() {
    reportSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }

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

  function openEditIncident(incident) {
    if (!incident?.id) return;
    setEditIncident(incident);
    setEditDraft({
      description: incident.description ?? "",
      severity: (incident.severity ?? "medium").toString().toLowerCase(),
      actionTaken: incident.actionTaken ?? incident.actionsTaken ?? "",
      linkedSafeguardingIds: (incident.linkedSafeguardingIds ?? []).join(", "),
    });
  }

  async function saveEditIncident() {
    if (!editIncident?.id) return;
    setIncidentMutating(true);
    try {
      const ids = editDraft.linkedSafeguardingIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateIncident(editIncident.id, {
        description: editDraft.description,
        severity: editDraft.severity,
        actionTaken: editDraft.actionTaken,
        linkedSafeguardingIds: ids,
      });
      showToast("Incident updated", "success");
      setEditIncident(null);
      loadIncidents();
    } catch (e) {
      console.error(e);
      showToast(e?.message ?? "Something went wrong");
    } finally {
      setIncidentMutating(false);
    }
  }

  async function handleCloseIncidentRow(id) {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!globalThis.confirm("Close this incident? It will no longer be editable.")) return;
    setClosingId(id);
    try {
      await closeIncident(id);
      showToast("Incident closed", "success");
      loadIncidents();
    } catch (e) {
      console.error(e);
      showToast(e?.message ?? "Something went wrong");
    } finally {
      setClosingId(null);
    }
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
    <div style={{ padding: "24px", width: "100%" }}>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: "1.5rem" }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>Incidents & Safeguarding</h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
            Record and review safeguarding concerns and incidents linked to patients.
          </p>
          {user?.email && (
            <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8rem", color: "#94a3b8" }}>
              Signed in as {user.email} ({role || "Staff"})
            </p>
          )}
        </div>
      </div>

      <ActionBar
        actions={[
          {
            label: "➕ Add Incident",
            onClick: openIncidentReportSection,
          },
        ]}
      />

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
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Hospital</label>
            <select
              value={filterHospitalId}
              onChange={(e) => {
                setFilterHospitalId(e.target.value);
                setFilterWardId("");
              }}
              disabled={structureLoading}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: 160 }}
            >
              <option value="">All hospitals</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Ward</label>
            <select
              value={filterWardId}
              onChange={(e) => setFilterWardId(e.target.value)}
              disabled={!filterHospitalId}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: 160 }}
            >
              <option value="">{filterHospitalId ? "All wards" : "Select hospital first"}</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id}
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
          organisationId={organisationId}
          onDraftCandour={handleDraftCandourFromForm}
          draftCandourLoading={candourLoadingId === "preview-form"}
        />
      </section>

      <section
        aria-label="Incidents list"
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
        }}
      >
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
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Hospital</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Ward</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Severity</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Reported by</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Description</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Actions</th>
                  <th style={{ textAlign: "left", padding: "0.5rem 0.75rem" }}>Safeguarding links</th>
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
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#475569" }}>
                      {hospitals.find((h) => h.id === incident.hospitalId)?.name || incident.hospitalId || "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#475569" }}>
                      {incident.wardId || "—"}
                    </td>
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
                      {incident.description || "No description provided"}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", verticalAlign: "top" }}>
                      {(incident.status || "open").toString().toLowerCase() !== "closed" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                          <button
                            type="button"
                            onClick={() => openEditIncident(incident)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={closingId === incident.id}
                            onClick={() => handleCloseIncidentRow(incident.id)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #fecaca",
                              background: "#fff1f2",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: closingId === incident.id ? "wait" : "pointer",
                            }}
                          >
                            {closingId === incident.id ? "Closing…" : "Close"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#475569" }}>
                      {(incident.linkedSafeguardingIds ?? []).length > 0
                        ? (incident.linkedSafeguardingIds ?? []).join(", ")
                        : "—"}
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

      {editIncident && (
        <div
          role="dialog"
          aria-modal="true"
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
              maxWidth: 520,
              width: "100%",
              padding: "1.25rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.05rem" }}>Edit incident (open only)</h2>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Description</label>
            <textarea
              value={editDraft.description}
              onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              rows={4}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 10, boxSizing: "border-box" }}
            />
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Severity</label>
            <select
              value={editDraft.severity}
              onChange={(e) => setEditDraft((d) => ({ ...d, severity: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 10 }}
            >
              {INCIDENT_SEVERITY.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>Action taken</label>
            <textarea
              value={editDraft.actionTaken}
              onChange={(e) => setEditDraft((d) => ({ ...d, actionTaken: e.target.value }))}
              rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 10, boxSizing: "border-box" }}
            />
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 4 }}>
              Safeguarding alert IDs (comma-separated)
            </label>
            <input
              value={editDraft.linkedSafeguardingIds}
              onChange={(e) => setEditDraft((d) => ({ ...d, linkedSafeguardingIds: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 12, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setEditIncident(null)}
                disabled={incidentMutating}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditIncident}
                disabled={incidentMutating}
                style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#005eb8", color: "#fff", fontWeight: 600 }}
              >
                {incidentMutating ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

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

