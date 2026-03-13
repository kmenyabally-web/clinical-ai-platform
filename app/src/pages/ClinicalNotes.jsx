import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { fetchClinicalNotesForOrganisation } from "../services/patientTimelineService";
import { addTimelineEntry } from "../services/patientTimelineService";
import { listPatients } from "../services/patientService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";

function formatDate(value) {
  if (!value) return "—";
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString();
    } catch {
      return "—";
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function ClinicalNotes() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = useCallback(() => {
    if (!organisationId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchClinicalNotesForOrganisation(organisationId, {
      serviceId: currentServiceId ?? undefined,
      limitCount: 300,
    })
      .then((list) => setNotes(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load clinical notes."));
        setNotes([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentServiceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        "Current service"
      : "All services";

  const createdBy = user?.email || user?.displayName || "Unknown";

  return (
    <div style={{ padding: 40 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
          <p style={{ margin: 0, color: "#555", fontSize: "0.95rem" }}>
            {organisation?.name ? `${organisation.name}${currentServiceId ? ` · ${currentServiceName}` : ""}` : "Manage clinical notes for this organisation."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreateModal(true); setCreateError(null); }}
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
          Add Clinical Note
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#666" }}>Loading clinical notes…</p>}

      {!loading && !error && notes.length === 0 && (
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
          No clinical notes yet. Click Add Clinical Note to create one.
        </p>
      )}

      {!loading && notes.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {notes.map((n) => (
            <li
              key={n.id}
              style={{
                padding: "1rem 1.25rem",
                marginBottom: 8,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <strong>{n.eventTitle || "Clinical note"}</strong>
                <span style={{ marginLeft: 8, color: "#64748b", fontSize: "0.875rem" }}>
                  {formatDate(n.createdAt)} · by {n.createdBy || "—"}
                </span>
              </div>
              {n.patientId && (
                <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#475569" }}>
                  Patient: <Link to={`/patients/${n.patientId}/timeline`}>{n.patientId}</Link>
                </p>
              )}
              {n.eventDescription && (
                <p style={{ margin: "8px 0 0 0", color: "#334155", fontSize: "0.9rem" }}>{n.eventDescription}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showCreateModal && (
        <CreateClinicalNoteModal
          organisationId={organisationId}
          currentServiceId={currentServiceId}
          createdBy={createdBy}
          onClose={() => { setShowCreateModal(false); setCreateError(null); }}
          onSubmit={async (data) => {
            setCreating(true);
            setCreateError(null);
            try {
              await addTimelineEntry({
                organisationId,
                patientId: data.patientId,
                serviceId: data.serviceId || currentServiceId || null,
                eventType: "clinical_note",
                eventTitle: data.title?.trim() || "Clinical note",
                eventDescription: data.note ?? "",
                createdBy: data.createdBy || createdBy,
              });
              setShowCreateModal(false);
              load();
            } catch (err) {
              console.error("Firestore query failed:", err);
              setCreateError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to create clinical note."));
            } finally {
              setCreating(false);
            }
          }}
          loading={creating}
          error={createError}
        />
      )}
    </div>
  );
}

function CreateClinicalNoteModal({ organisationId, currentServiceId, createdBy, onClose, onSubmit, loading, error }) {
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [serviceId, setServiceId] = useState(currentServiceId || "");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);

  useEffect(() => {
    if (!organisationId) {
      setPatients([]);
      setPatientsLoading(false);
      return;
    }
    setPatientsLoading(true);
    listPatients(organisationId, { serviceId: serviceId || undefined })
      .then((list) => setPatients(Array.isArray(list) ? list : []))
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [organisationId, serviceId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientId?.trim()) return;
    onSubmit({
      patientId: patientId.trim(),
      serviceId: serviceId || null,
      title: title.trim() || "Clinical note",
      note: note.trim(),
      createdBy,
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Add Clinical Note</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">×</button>
        </div>
        {error && <p role="alert" style={{ color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Patient *</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              disabled={patientsLoading}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name || "Unnamed patient"} ({p.id})</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief title" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Note content" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading || !patientId?.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#005eb8", color: "#fff", fontWeight: 600, cursor: loading ? "default" : "pointer" }}>{loading ? "Saving…" : "Add Clinical Note"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
