/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { getPatientsByOrganisation } from "../services/patientService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { useRole } from "../context/RoleContext";
import { analyseClinicalNote } from "../services/aiService";
import {
  addAddendum,
  addClinicalNote,
  approveClinicalNote,
  deleteClinicalNote,
  fetchAddendumsForNote,
  fetchClinicalNotesForOrganisation,
  finalizeClinicalNote,
  mapFirestoreClinicalNote,
  NOTES_COLLECTION,
  softDeleteClinicalNoteAsAuthor,
  updateDraftClinicalNoteContent,
} from "../services/noteService";
import { logAuditEvent } from "../services/auditService";
import ClinicalNoteForm from "../components/ClinicalNoteForm";
import { formatUkDateTime } from "../utils/dateFormat";
import { MDT_ROLES } from "../constants/mdtRoles";
import ActionBar from "../components/ActionBar";
import { usePermissions } from "../hooks/usePermissions";
import { listPolicies } from "../services/policyService";
import { fetchIncidents } from "../services/incidentService";
import { getInspectionInsights } from "../engine/inspectionInsights";
import { canApproveNote } from "../utils/clinicalNoteApproval";
import { showToast } from "../utils/toast";

function ConfirmDialog({ title, body, confirmLabel, danger, onCancel, onConfirm }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", maxWidth: 420, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{title}</h2>
        <p style={{ color: "#475569", fontSize: 14 }}>{body}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              background: danger ? "#991b1b" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  return formatUkDateTime(value, "—");
}

/** Defensive dedupe if merge + UI state ever produce the same id twice. */
function dedupeNotesById(list) {
  if (!Array.isArray(list)) return [];
  const m = new Map();
  for (const n of list) {
    if (n?.id && !m.has(n.id)) m.set(n.id, n);
  }
  return Array.from(m.values());
}

function noteStatusLabel(status) {
  const s = (status ?? "draft").toString().trim().toLowerCase();
  if (s === "approved") return "approved";
  if (s === "final") return "final";
  return "draft";
}

function noteCreatedByLabel(n) {
  if (!n || typeof n !== "object") return "—";
  // Prefer authorEmail for display; fall back to createdBy/authorId when present.
  return n.authorEmail || n.createdBy || n.authorId || n.createdByRole || "—";
}

function noteRoleLabel(n) {
  if (!n || typeof n !== "object") return "—";
  return n.role || n.discipline || "—";
}

function NoteStatusBadge({ status }) {
  const label = noteStatusLabel(status);
  if (label === "approved") {
    return (
      <span
        style={{
          marginLeft: 8,
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#166534",
          backgroundColor: "#dcfce7",
          border: "1px solid #86efac",
          padding: "3px 10px",
          borderRadius: 999,
        }}
      >
        Approved
      </span>
    );
  }
  if (label === "final") {
    return (
      <span
        style={{
          marginLeft: 8,
          fontSize: "0.75rem",
          fontWeight: 800,
          color: "#1e40af",
          backgroundColor: "#dbeafe",
          border: "1px solid #93c5fd",
          padding: "3px 10px",
          borderRadius: 999,
        }}
      >
        Final
      </span>
    );
  }
  return (
    <span
      style={{
        marginLeft: 8,
        fontSize: "0.75rem",
        fontWeight: 800,
        color: "#475569",
        backgroundColor: "#f1f5f9",
        border: "1px solid #cbd5e1",
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      Draft
    </span>
  );
}

/** Prefer profile MDT when it matches the canonical list; otherwise first standard role. */
function defaultDisciplineFromProfile(mdt) {
  const p = (mdt ?? "").toString().trim();
  if (p && MDT_ROLES.includes(p)) return p;
  return MDT_ROLES[0] ?? "Nurse";
}

export default function ClinicalNotes() {
  const { organisationId, organisation, userProfile } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { user } = useAuth();
  const { role, canViewNotes, canEditNotes, canDeleteNotes, loading: roleLoading } = useRole();
  const permissions = usePermissions();
  const isManager = (role ?? "").toString().toLowerCase() === "manager";

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [filterPatientId, setFilterPatientId] = useState("");
  const [addendumDrafts, setAddendumDrafts] = useState({});
  const [addendumSaving, setAddendumSaving] = useState({});
  const [addendumError, setAddendumError] = useState({});
  const [addendumsByNote, setAddendumsByNote] = useState({});
  const [policyHints, setPolicyHints] = useState([]);
  const [insightIncidents, setInsightIncidents] = useState([]);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [approvingNoteId, setApprovingNoteId] = useState(null);
  const [finalizingNoteId, setFinalizingNoteId] = useState(null);
  const [noteDeleteError, setNoteDeleteError] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteDrafts, setEditNoteDrafts] = useState({});
  const [savingEditNoteId, setSavingEditNoteId] = useState(null);
  const [noteEditError, setNoteEditError] = useState(null);
  const [historyNote, setHistoryNote] = useState(null);
  const [deleteNoteTarget, setDeleteNoteTarget] = useState(null);

  const load = useCallback(() => {
    if (!organisationId) {
      return Promise.resolve();
    }

    if (!canViewNotes()) {
      setNotes([]);
      setLoading(false);
      return Promise.resolve();
    }

    if (isManager && !filterPatientId) {
      setNotes([]);
      setLoading(false);
      return Promise.resolve();
    }

    setLoading(true);
    setError(null);
    return fetchClinicalNotesForOrganisation({
      patientId: isManager ? filterPatientId : null,
      limitCount: 300,
    })
      .then((list) => setNotes(dedupeNotesById(Array.isArray(list) ? list : [])))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load clinical notes."));
        setNotes([]);
      })
      .finally(() => {
        try {
          setLoading(false);
        } catch {
          /* ignore */
        }
      });
  }, [organisationId, isManager, filterPatientId, canViewNotes]);

  useEffect(() => {
    if (!organisationId) return;

    setPatientsLoading(true);
    getPatientsByOrganisation(organisationId)
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        setPatients(rows);
      })
      .catch(() => setPatients([]))
      .finally(() => setPatientsLoading(false));
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || roleLoading) return;
    if (isManager && !filterPatientId && patients.length > 0) {
      setFilterPatientId(patients[0].id ?? "");
      return;
    }
    load();
  }, [organisationId, isManager, filterPatientId, patients, load, roleLoading]);

  useEffect(() => {
    let cancelled = false;
    if (!organisationId) {
      setInsightIncidents([]);
      return;
    }
    fetchIncidents(organisationId, {})
      .then((rows) => {
        if (cancelled) return;
        setInsightIncidents(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setInsightIncidents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const noteInsights = getInspectionInsights({
    patient: null,
    notes,
    policies: policyHints,
    training: [],
    incidents: insightIncidents,
  });
  const hasSafeRisk = noteInsights.some((i) => i.domain === "SAFE");

  const currentServiceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        "Current service"
      : "All services";

  const createdBy = user?.email || user?.displayName || "Unknown";

  function noteRecordForApproval(n) {
    return {
      role: n.role ?? n.discipline,
      discipline: n.discipline,
      status: n.status,
      createdBy: n.createdBy ?? n.authorId,
      authorId: n.authorId,
      isDeleted: n.isDeleted,
    };
  }

  /** Draft-only; author must match creator (legacy notes may only have authorId). */
  function canEditOwnDraftNote(n) {
    const uid = user?.uid ?? "";
    if (!uid || n.status !== "draft" || n.isDeleted) return false;
    const owner = n.createdBy ?? n.authorId;
    return owner === uid;
  }

  function generatePatientSummary() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { patientSummary: "generate" });
    }
  }

  if (roleLoading) {
    return (
      <div style={{ padding: 24, width: "100%" }}>
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  if (!canViewNotes()) {
    return (
      <div style={{ padding: 24, width: "100%" }}>
        <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
        <p style={{ color: "#64748b" }}>Your role does not have access to clinical notes for this organisation.</p>
      </div>
    );
  }

  // UX-level role template gate (separate from backend RBAC).
  if (!permissions?.canWriteNotes) {
    return (
      <div style={{ padding: 24, width: "100%" }}>
        <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
        <p style={{ color: "#64748b" }}>Your role does not have permission to use clinical note tools.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, width: "100%" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
          <h3 style={{ margin: "6px 0 0", fontSize: "0.95rem", color: "#334155" }}>Create → Final → Approve</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
            {organisation?.name ? `${organisation.name}${currentServiceId ? ` · ${currentServiceName}` : ""}` : "Manage clinical notes for this organisation."}
          </p>
        </div>
      </div>

      {canEditNotes() && permissions?.canWriteNotes ? (
        <ActionBar
          actions={[
            {
              label: "➕ Add Note",
              onClick: () => {
                setShowCreateModal(true);
                setCreateError(null);
              },
            },
            {
              label: "⚡ Generate Summary",
              type: "generate",
              onClick: () => generatePatientSummary(),
            },
          ]}
        />
      ) : null}

      {isManager && (
        <div
          style={{
            marginBottom: 16,
            padding: "1rem 1.25rem",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Filter patient</h2>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
              Manager view is restricted to a single patient.
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              disabled={patientsLoading}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              {patientsLoading && <option value="">{`Loading patients…`}</option>}
              {!patientsLoading && patients.length === 0 && (
                <option value="">No patients in this organisation</option>
              )}
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.name ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`)?.trim() || p.id} ({p.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {error}
        </div>
      )}
      {noteDeleteError && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {noteDeleteError}{" "}
          <button type="button" onClick={() => setNoteDeleteError(null)} style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
            Dismiss
          </button>
        </div>
      )}

      {(creating || analysing) && (
        <p style={{ color: "#0f172a", marginBottom: "0.75rem", fontWeight: 600 }} aria-live="polite">
          ⏳ Processing…
        </p>
      )}

      {policyHints.length > 0 ? (
        <div style={{ marginBottom: "0.75rem", padding: "10px 12px", border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, color: "#1e3a8a", fontSize: 13, fontWeight: 700 }}>
          Relevant policy guidance available: {policyHints.map((p) => p.title || p.type).slice(0, 3).join(", ")}
        </div>
      ) : null}
      {hasSafeRisk ? (
        <div className="alert warning" role="alert" style={{ marginBottom: "0.75rem" }}>
          {"\u26A0\uFE0F"} SAFE domain risks detected - review medication and incidents.
        </div>
      ) : null}

      {loading && <p style={{ color: "#666" }}>Loading clinical notes…</p>}

      {!organisationId ? (
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>Loading organisation…</p>
      ) : null}

      {organisationId && !loading && !error && notes.length === 0 && (
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
          No clinical notes yet. Add a note to begin the record.
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
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                borderLeft: "4px solid #2563eb",
              }}
            >
              <div style={{ marginBottom: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <strong>{n.category || "Clinical note"}</strong>
                {noteRoleLabel(n) !== "—" ? (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#0f172a",
                      backgroundColor: "#e0f2fe",
                      border: "1px solid #7dd3fc",
                      padding: "3px 10px",
                      borderRadius: 6,
                    }}
                    title="MDT role"
                  >
                    Role: {noteRoleLabel(n)}
                  </span>
                ) : null}
                {n.mood && (
                  <span style={{ marginLeft: 8, fontSize: "0.95rem" }} aria-hidden="true">
                    {n.mood}
                  </span>
                )}
                <span style={{ marginLeft: 8, color: "#64748b", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                  {formatDate(n.createdAt)} · Created by {noteCreatedByLabel(n)}
                </span>
                <NoteStatusBadge status={n.status} />
              </div>
              {(noteStatusLabel(n.status) === "final" || noteStatusLabel(n.status) === "approved") && (
                <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", color: "#92400e", fontWeight: 600 }}>
                  This record cannot be edited. Add addendum instead.
                </p>
              )}
              {n.status === "approved" && (n.approvedByRole || n.approvedAt) ? (
                <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", color: "#166534" }}>
                  Approved by {n.approvedByRole || "—"} at {formatDate(n.approvedAt)}
                </p>
              ) : null}
              {n.updatedAt && (n.updatedByEmail || n.updatedBy) ? (
                <p style={{ margin: "6px 0 0 0", fontSize: "0.8125rem", color: "#475569" }}>
                  Last updated by {n.updatedByEmail || n.updatedBy || "—"} at {formatDate(n.updatedAt)}
                </p>
              ) : null}
              {n.structured?.summary || n.structured?.risk || n.mood ? (
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {n.mood ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                      Mood: {n.mood}
                    </span>
                  ) : null}
                  {n.structured?.risk ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: "1px solid",
                        color:
                          String(n.structured.risk).toLowerCase() === "high"
                            ? "#991b1b"
                            : String(n.structured.risk).toLowerCase() === "medium"
                              ? "#92400e"
                              : "#166534",
                        backgroundColor:
                          String(n.structured.risk).toLowerCase() === "high"
                            ? "#fef2f2"
                            : String(n.structured.risk).toLowerCase() === "medium"
                              ? "#fffbeb"
                              : "#ecfdf5",
                        borderColor:
                          String(n.structured.risk).toLowerCase() === "high"
                            ? "#fecaca"
                            : String(n.structured.risk).toLowerCase() === "medium"
                              ? "#fcd34d"
                              : "#86efac",
                      }}
                    >
                      Risk: {String(n.structured.risk).toUpperCase()}
                    </span>
                  ) : null}
                  {n.structured?.summary ? (
                    <span style={{ fontSize: 12, color: "#475569" }}>{n.structured.summary}</span>
                  ) : null}
                </div>
              ) : null}
              {n.patientId && (
                <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "#475569" }}>
                  Patient: <Link to={`/patients/${n.patientId}`}>{n.patientId}</Link>
                </p>
              )}
              {n.structured?.summary && (
                <p style={{ margin: "6px 0 0 0", color: "#1e3a5f", fontSize: "0.85rem", fontStyle: "italic" }}>
                  {n.structured.summary}
                </p>
              )}
              {editingNoteId === n.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    rows={6}
                    value={editNoteDrafts[n.id] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditNoteDrafts((prev) => ({ ...prev, [n.id]: value }));
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #94a3b8",
                      boxSizing: "border-box",
                      fontSize: "0.9rem",
                      color: "#334155",
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={savingEditNoteId === n.id}
                      onClick={async () => {
                        const text = (editNoteDrafts[n.id] ?? "").trim();
                        if (!text) return;
                        setNoteEditError(null);
                        setSavingEditNoteId(n.id);
                        try {
                          await updateDraftClinicalNoteContent(n.id, text);
                          const email = user?.email ?? user?.displayName ?? "";
                          setNotes((prev) =>
                            prev.map((x) =>
                              x.id === n.id
                                ? {
                                    ...x,
                                    content: text,
                                    updatedAt: new Date(),
                                    updatedBy: user?.uid,
                                    updatedByEmail: email || x.updatedByEmail,
                                  }
                                : x
                            )
                          );
                          setEditingNoteId(null);
                          setEditNoteDrafts((prev) => {
                            const next = { ...prev };
                            delete next[n.id];
                            return next;
                          });
                          showToast("Note saved", "success");
                        } catch (e) {
                          const msg = e?.message ?? "Could not save note.";
                          setNoteEditError(msg);
                          showToast(msg);
                          console.error(e);
                        } finally {
                          setSavingEditNoteId(null);
                        }
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px solid #2563eb",
                        background: "#2563eb",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: savingEditNoteId === n.id ? "wait" : "pointer",
                      }}
                    >
                      {savingEditNoteId === n.id ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={savingEditNoteId === n.id}
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditNoteDrafts((prev) => {
                          const next = { ...prev };
                          delete next[n.id];
                          return next;
                        });
                        setNoteEditError(null);
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        color: "#334155",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : n.content && noteStatusLabel(n.status) === "draft" ? (
                <p style={{ margin: "8px 0 0 0", color: "#334155", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  {n.content}
                </p>
              ) : null}
              {noteEditError && editingNoteId === n.id ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 12, fontWeight: 700, color: "#991b1b" }}>{noteEditError}</p>
              ) : null}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {canEditNotes() && permissions?.canWriteNotes && canEditOwnDraftNote(n) && editingNoteId !== n.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteEditError(null);
                      if (noteStatusLabel(n.status) !== "draft") {
                        // eslint-disable-next-line no-alert
                        globalThis.alert("This record cannot be edited. Add addendum instead.");
                        return;
                      }
                      setEditingNoteId(n.id);
                      setEditNoteDrafts((prev) => ({ ...prev, [n.id]: n.content ?? "" }));
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                ) : null}
                {canEditNotes() && permissions?.canWriteNotes && canEditOwnDraftNote(n) && editingNoteId !== n.id ? (
                  <button
                    type="button"
                    disabled={finalizingNoteId === n.id}
                    onClick={async () => {
                      setNoteDeleteError(null);
                      setFinalizingNoteId(n.id);
                      try {
                        await finalizeClinicalNote(n.id);
                        setNotes((prev) =>
                          prev.map((x) => (x.id === n.id ? { ...x, status: "final" } : x))
                        );
                        setEditingNoteId((prev) => (prev === n.id ? null : prev));
                        setEditNoteDrafts((prev) => {
                          if (!(n.id in prev)) return prev;
                          const next = { ...prev };
                          delete next[n.id];
                          return next;
                        });
                        showToast("Note saved", "success");
                      } catch (e) {
                        const msg = e?.message ?? "Could not finalise note.";
                        setNoteDeleteError(msg);
                        showToast(msg);
                        console.error(e);
                      } finally {
                        setFinalizingNoteId(null);
                      }
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #93c5fd",
                      background: "#eff6ff",
                      color: "#1e40af",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: finalizingNoteId === n.id ? "wait" : "pointer",
                    }}
                  >
                    {finalizingNoteId === n.id ? "Finalising…" : "Finalise"}
                  </button>
                ) : null}
                {canApproveNote(userProfile?.mdtRole, noteRecordForApproval(n), user?.uid, role) &&
                noteStatusLabel(n.status) === "final" ? (
                  <button
                    type="button"
                    disabled={approvingNoteId === n.id}
                    onClick={async () => {
                      setNoteDeleteError(null);
                      setApprovingNoteId(n.id);
                      try {
                        await approveClinicalNote(n.id);
                        const mdt = (userProfile?.mdtRole ?? "").toString().trim();
                        const sys = (role ?? "").toString().trim();
                        const label =
                          mdt ||
                          (["admin", "manager", "super_admin", "global_admin", "group_admin"].includes(
                            sys.toLowerCase()
                          )
                            ? sys
                            : "");
                        setNotes((prev) =>
                          prev.map((x) =>
                            x.id === n.id
                              ? {
                                  ...x,
                                  status: "approved",
                                  approvedBy: user?.uid,
                                  approvedByRole: label || x.approvedByRole,
                                  approvedAt: new Date(),
                                }
                              : x
                          )
                        );
                        setEditingNoteId((prev) => (prev === n.id ? null : prev));
                        setEditNoteDrafts((prev) => {
                          if (!(n.id in prev)) return prev;
                          const next = { ...prev };
                          delete next[n.id];
                          return next;
                        });
                        showToast("Note approved", "success");
                      } catch (e) {
                        const msg = e?.message ?? "Could not approve note.";
                        setNoteDeleteError(msg);
                        showToast(msg);
                        console.error(e);
                      } finally {
                        setApprovingNoteId(null);
                      }
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #86efac",
                      background: "#ecfdf5",
                      color: "#166534",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: approvingNoteId === n.id ? "wait" : "pointer",
                    }}
                  >
                    {approvingNoteId === n.id ? "Approving…" : "Approve note"}
                  </button>
                ) : null}
                {(canDeleteNotes() && noteStatusLabel(n.status) !== "approved") ||
                (canEditOwnDraftNote(n) && !canDeleteNotes()) ? (
                  <button
                    type="button"
                    disabled={deletingNoteId === n.id}
                    onClick={() => {
                      setNoteDeleteError(null);
                      setDeleteNoteTarget(n);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      background: "#fff1f2",
                      color: "#991b1b",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: deletingNoteId === n.id ? "wait" : "pointer",
                    }}
                  >
                    {deletingNoteId === n.id ? "Deleting…" : "Delete note"}
                  </button>
                ) : null}
                {Array.isArray(n.versions) && n.versions.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setHistoryNote(n)}
                    style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    View history
                  </button>
                ) : null}
              </div>
              {noteStatusLabel(n.status) === "final" || noteStatusLabel(n.status) === "approved" ? (
                <>
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>— Original note —</div>
                    <p style={{ margin: 0, color: "#334155", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{n.content}</p>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      rows={2}
                      value={addendumDrafts[n.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAddendumDrafts((prev) => ({ ...prev, [n.id]: value }));
                      }}
                      placeholder="Add addendum (does not change the original)"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                    />
                    <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={Boolean(addendumSaving[n.id])}
                        onClick={async () => {
                          const text = (addendumDrafts[n.id] ?? "").trim();
                          if (!text) return;
                          setAddendumSaving((prev) => ({ ...prev, [n.id]: true }));
                          setAddendumError((prev) => ({ ...prev, [n.id]: "" }));
                          try {
                            const created = await addAddendum(n.id, text);
                            setAddendumDrafts((prev) => ({ ...prev, [n.id]: "" }));
                            setAddendumsByNote((prev) => ({
                              ...prev,
                              [n.id]: [
                                ...(prev[n.id] ?? []),
                                {
                                  id: created.id,
                                  text,
                                  authorEmail: createdBy,
                                  role: userProfile?.mdtRole ?? role ?? "",
                                  createdAt: new Date(),
                                },
                              ],
                            }));
                            setNotes((prev) =>
                              prev.map((x) =>
                                x.id === n.id
                                  ? {
                                      ...x,
                                      addendums: [
                                        ...(Array.isArray(x.addendums) ? x.addendums : []),
                                        {
                                          id: created.id,
                                          content: text,
                                          createdBy: user?.uid ?? "",
                                          role: (userProfile?.mdtRole ?? role ?? "").toString(),
                                          createdAt: new Date(),
                                        },
                                      ],
                                    }
                                  : x
                              )
                            );
                            showToast("Addendum saved", "success");
                          } catch (e) {
                            const em = e?.message ?? "Failed to add addendum.";
                            setAddendumError((prev) => ({ ...prev, [n.id]: em }));
                            showToast(em);
                            console.error(e);
                          } finally {
                            setAddendumSaving((prev) => ({ ...prev, [n.id]: false }));
                          }
                        }}
                        style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {addendumSaving[n.id] ? "Saving…" : "Add addendum"}
                      </button>
                      {addendumError[n.id] ? (
                        <span style={{ color: "#991b1b", fontSize: 12, fontWeight: 700 }}>{addendumError[n.id]}</span>
                      ) : null}
                    </div>
                  </div>
                  {((addendumsByNote[n.id] ?? []).length > 0 || (Array.isArray(n.addendums) && n.addendums.length > 0)) ? (
                    <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      {(addendumsByNote[n.id] ?? []).length > 0
                        ? (addendumsByNote[n.id] ?? []).map((a) => (
                            <div key={a.id} style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>— Addendum —</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                {formatDate(a.createdAt)} · {a.authorEmail || "—"}
                                {a.role ? ` · ${a.role}` : ""}
                              </div>
                              <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{a.text}</div>
                            </div>
                          ))
                        : (n.addendums ?? []).map((a) => (
                            <div key={a.id} style={{ marginBottom: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>— Addendum —</div>
                              <div style={{ fontSize: 12, color: "#64748b" }}>
                                {formatDate(a.createdAt)} · {a.createdBy || "—"}
                                {a.role ? ` · ${a.role}` : ""}
                              </div>
                              <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{a.content}</div>
                            </div>
                          ))}
                    </div>
                  ) : null}
                </>
              ) : null}
              {n.structured?.riskIndicators?.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {n.structured.riskIndicators.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#9a3412",
                        backgroundColor: "#ffedd5",
                        border: "1px solid #fdba74",
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showCreateModal && (
        <CreateClinicalNoteModal
          isManager={isManager}
          patients={patients}
          patientsLoading={patientsLoading}
          filterPatientId={filterPatientId}
          defaultMdtFromProfile={typeof userProfile?.mdtRole === "string" ? userProfile.mdtRole : ""}
          currentServiceId={currentServiceId}
          createdBy={createdBy}
          onClose={() => { setShowCreateModal(false); setCreateError(null); }}
          onSubmit={async ({ patientId, content, mood, discipline, riskLevel }) => {
            if (!canEditNotes() || !permissions?.canWriteNotes) {
              setCreateError("Access restricted");
              return;
            }
            // eslint-disable-next-line no-console
            console.log("ORG ID:", organisationId);
            if (!organisationId || !String(organisationId).trim()) {
              // eslint-disable-next-line no-alert
              alert("Cannot save: organisation is not loaded. Refresh the page or check your account.");
              setCreateError("Organisation not loaded.");
              return;
            }
            const resolvedDiscipline = (discipline ?? "").toString().trim();
            if (!resolvedDiscipline) {
              setCreateError("Please select a role");
              return;
            }

            setCreating(true);
            setCreateError(null);

            let aiResult = null;
            setAnalysing(true);
            try {
              try {
                aiResult = await analyseClinicalNote({
                  content,
                  authorRole: resolvedDiscipline,
                  patientId,
                });
              } catch (aiErr) {
                console.error("AI ERROR:", aiErr);
                aiResult = null;
              }
            } finally {
              setAnalysing(false);
            }

            try {
              // eslint-disable-next-line no-console
              console.log("Saving note:", {
                content: String(content ?? "").slice(0, 120),
                patientId,
                organisationId,
                createdBy: user?.uid ?? null,
              });

              let structured = aiResult?.structuredData
                ? {
                    behaviour: aiResult.structuredData.behaviour,
                    mood: aiResult.structuredData.mood,
                    engagement: aiResult.structuredData.engagement,
                    risk: aiResult.structuredData.risk,
                    physicalHealth: aiResult.structuredData.physicalHealth,
                    medicationIssues: aiResult.structuredData.medicationIssues,
                    incidents: aiResult.structuredData.incidents,
                    riskIndicators: aiResult.structuredData.riskIndicators,
                    progress: aiResult.structuredData.progress,
                    summary: aiResult.structuredData.summary,
                  }
                : undefined;

              const rl = (riskLevel ?? "auto").toString().trim().toLowerCase();
              if (rl === "low" || rl === "medium" || rl === "high") {
                structured = { ...(structured ?? {}), risk: rl };
              }

              const { id: newNoteId } = await addClinicalNote(patientId, {
                organisationId,
                category: "Routine",
                content,
                mood: mood ?? aiResult?.structuredData?.mood ?? null,
                authorEmail: createdBy,
                serviceId: currentServiceId ?? null,
                discipline: resolvedDiscipline,
                ...(structured ? { structured } : {}),
                correctedNote: aiResult?.correctedNote ?? null,
                structuredData: aiResult?.structuredData ?? null,
                summaries: aiResult?.summaries ?? null,
                mdtReview: aiResult?.mdtReview ?? null,
                reports: aiResult?.reports ?? null,
                careFolder: aiResult?.careFolder ?? null,
              });

              try {
                const snap = await getDoc(doc(db, NOTES_COLLECTION, newNoteId));
                if (snap.exists()) {
                  const newRow = mapFirestoreClinicalNote(snap.id, snap.data());
                  setNotes((prev) => [newRow, ...prev.filter((n) => n.id !== newRow.id)]);
                }
              } catch (refetchErr) {
                console.warn("Could not refetch new note for UI:", refetchErr);
              }
              const text = String(content ?? "").toLowerCase();
              const relevantTypes = new Set();
              if (text.includes("medication")) relevantTypes.add("MEDICATION");
              if (text.includes("refused") || text.includes("incident")) relevantTypes.add("SAFEGUARDING");
              if (organisationId && relevantTypes.size > 0) {
                listPolicies(organisationId)
                  .then((all) => {
                    const matches = (all ?? []).filter(
                      (p) => p?.status === "ACTIVE" && relevantTypes.has(String(p?.type ?? "").toUpperCase())
                    );
                    setPolicyHints(matches.slice(0, 5));
                  })
                  .catch(() => {
                    setPolicyHints([]);
                  });
              } else {
                setPolicyHints([]);
              }
              void logAuditEvent("NOTE_CREATED", { patientId });
              setShowCreateModal(false);
              await load();
            } catch (err) {
              console.error("SAVE ERROR:", err);
              // eslint-disable-next-line no-alert
              alert(`Failed to save note: ${err?.message ?? "Unknown error"}`);
              setCreateError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to create clinical note."));
            } finally {
              setCreating(false);
            }
          }}
          loading={creating || analysing}
          analysing={analysing}
          error={createError}
        />
      )}

      {historyNote ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem 1.5rem", maxWidth: 560, width: "100%", maxHeight: "80vh", overflow: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Version history (pre-approval)</h2>
              <button type="button" onClick={() => setHistoryNote(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">
                ×
              </button>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {(historyNote.versions ?? []).map((v, idx) => (
                <li key={idx} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {formatDate(v.updatedAt)} · {v.updatedBy || "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{v.content}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {deleteNoteTarget ? (
        <ConfirmDialog
          title="Archive this note?"
          body="This will archive the record. It can be restored later."
          confirmLabel="Archive"
          danger
          onCancel={() => setDeleteNoteTarget(null)}
          onConfirm={async () => {
            const n = deleteNoteTarget;
            setDeleteNoteTarget(null);
            if (!n?.id) return;
            setDeletingNoteId(n.id);
            try {
              if (canDeleteNotes() && noteStatusLabel(n.status) !== "approved") {
                await deleteClinicalNote(n.id);
              } else {
                await softDeleteClinicalNoteAsAuthor(n.id);
              }
              setNotes((prev) => prev.filter((x) => x.id !== n.id));
              setAddendumsByNote((prev) => {
                const next = { ...prev };
                delete next[n.id];
                return next;
              });
              setAddendumDrafts((prev) => {
                const next = { ...prev };
                delete next[n.id];
                return next;
              });
              showToast("Note archived", "success");
            } catch (e) {
              const err = e?.message ?? "Could not delete note.";
              setNoteDeleteError(err);
              showToast(err);
              console.error(e);
            } finally {
              setDeletingNoteId(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CreateClinicalNoteModal({
  isManager,
  patients,
  patientsLoading,
  filterPatientId,
  defaultMdtFromProfile = "",
  currentServiceId,
  createdBy,
  onClose,
  onSubmit,
  loading,
  analysing = false,
  error,
}) {
  const [patientId, setPatientId] = useState(filterPatientId || "");
  const [discipline, setDiscipline] = useState(() => defaultDisciplineFromProfile(defaultMdtFromProfile));
  const [riskLevel, setRiskLevel] = useState("auto");
  const [roleError, setRoleError] = useState(null);

  useEffect(() => {
    setDiscipline(defaultDisciplineFromProfile(defaultMdtFromProfile));
  }, [defaultMdtFromProfile]);

  useEffect(() => {
    if (isManager) {
      setPatientId(filterPatientId || "");
    }
  }, [isManager, filterPatientId]);

  useEffect(() => {
    if (!isManager && !patientId && patientsLoading === false && patients.length > 0) {
      setPatientId(patients[0].id ?? "");
    }
  }, [isManager, patients, patientsLoading, patientId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "2rem 2rem",
          maxWidth: 900,
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Add Clinical Note</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">
            ×
          </button>
        </div>

        {(error || roleError) && (
          <p role="alert" style={{ color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            {roleError || error}
          </p>
        )}

        {analysing && (
          <p style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "#0369a1", fontWeight: 700 }}>
            Analysing note (AI Studio mock)…
          </p>
        )}

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Patient *</label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            disabled={isManager || patientsLoading}
            required
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="">{patientsLoading ? "Loading patients…" : "Select patient"}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.name ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`)?.trim() || "Patient"} ({p.id})
              </option>
            ))}
          </select>
          {!patientsLoading && patients.length === 0 ? (
            <p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              No patients in this organisation
            </p>
          ) : null}
          {isManager && patients.length > 0 ? (
            <p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
              Manager view is restricted to a single patient.
            </p>
          ) : null}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 700 }}>
            Discipline (MDT role) *
          </label>
          <select
            value={discipline}
            onChange={(e) => {
              setDiscipline(e.target.value);
              setRoleError(null);
            }}
            required
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: 14 }}
          >
            {MDT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <p style={{ margin: "0.45rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
            Defaults from your profile when it matches a standard role. Tip: Ctrl + Enter to submit the note.
          </p>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 700 }}>
            Risk level
          </label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: 14 }}
          >
            <option value="auto">Auto (use AI when enabled, otherwise unset)</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <p style={{ margin: "0.45rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
            Choose Low / Medium / High to set explicitly; Auto keeps AI-derived risk when available.
          </p>
        </div>

        <ClinicalNoteForm
          loading={loading || analysing}
          onSubmit={({ content, mood }) => {
            if (!patientId?.trim()) return;
            if (!discipline.trim()) {
              setRoleError("Please select a discipline");
              return;
            }
            setRoleError(null);

            onSubmit({
              patientId: patientId.trim(),
              content,
              mood: mood ?? null,
              discipline: discipline.trim(),
              riskLevel,
              currentServiceId,
              createdBy,
            });
          }}
        />
      </div>
    </div>
  );
}
