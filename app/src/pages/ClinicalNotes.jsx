/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { listPatients } from "../services/patientService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { useRole } from "../context/RoleContext";
import { analyseClinicalNote } from "../services/aiService";
import { addAddendum, addClinicalNote, fetchAddendumsForNote, fetchClinicalNotesForOrganisation } from "../services/noteService";
import { logAuditEvent } from "../services/auditService";
import ClinicalNoteForm from "../components/ClinicalNoteForm";
import { formatUkDateTime } from "../utils/dateFormat";
import { MDT_ROLES } from "../constants/mdtRoles";
import ActionBar from "../components/ActionBar";
import { usePermissions } from "../hooks/usePermissions";
import { listPolicies } from "../services/policyService";

function formatDate(value) {
  return formatUkDateTime(value, "—");
}

export default function ClinicalNotes() {
  const { organisationId, organisation, hasFeature, userProfile } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { user } = useAuth();
  const { role, canViewNotes, canEditNotes, loading: roleLoading } = useRole();
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
      .then((list) => setNotes(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load clinical notes."));
        setNotes([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, isManager, filterPatientId, canViewNotes]);

  useEffect(() => {
    if (!organisationId) return;

    setPatientsLoading(true);
    listPatients()
      .then((list) => {
        setPatients(Array.isArray(list) ? list : []);
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

  const currentServiceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        "Current service"
      : "All services";

  const createdBy = user?.email || user?.displayName || "Unknown";

  function generatePatientSummary() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { patientSummary: "generate" });
    }
  }

  if (roleLoading) {
    return (
      <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  if (!canViewNotes()) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
        <p style={{ color: "#64748b" }}>Your role does not have access to clinical notes for this organisation.</p>
      </div>
    );
  }

  // UX-level role template gate (separate from backend RBAC).
  if (!permissions?.canWriteNotes) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
        <p style={{ color: "#64748b" }}>Your role does not have permission to use clinical note tools.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1120, margin: "0 auto" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
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
      <div style={{ marginTop: 10, marginBottom: 12, padding: "10px 12px", border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 8, color: "#92400e", fontSize: 13, fontWeight: 700 }}>
        This record cannot be edited. Add addendum instead.
      </div>

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
              {!patientsLoading && patients.length === 0 && <option value="">No patients available</option>}
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

      {loading && <p style={{ color: "#666" }}>Loading clinical notes…</p>}

      {!loading && !error && notes.length === 0 && (
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
          No data available. Start by adding a clinical note with Add Note.
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
                {n.discipline ? (
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
                    [{n.discipline}]
                  </span>
                ) : null}
                {n.mood && (
                  <span style={{ marginLeft: 8, fontSize: "0.95rem" }} aria-hidden="true">
                    {n.mood}
                  </span>
                )}
                <span style={{ marginLeft: 8, color: "#64748b", fontSize: "0.875rem" }}>
                  {formatDate(n.createdAt)} · by {n.authorEmail || "—"}
                </span>
              </div>
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
              {n.content && (
                <p style={{ margin: "8px 0 0 0", color: "#334155", fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>
                  {n.content}
                </p>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (!addendumsByNote[n.id]) {
                      try {
                        const rows = await fetchAddendumsForNote(n.id);
                        setAddendumsByNote((prev) => ({ ...prev, [n.id]: rows }));
                      } catch {
                        setAddendumsByNote((prev) => ({ ...prev, [n.id]: [] }));
                      }
                    }
                  }}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Show addendums
                </button>
              </div>
              <div style={{ marginTop: 8 }}>
                <textarea
                  rows={2}
                  value={addendumDrafts[n.id] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAddendumDrafts((prev) => ({ ...prev, [n.id]: value }));
                  }}
                  placeholder="Add addendum (record remains immutable)"
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
                              createdAt: new Date(),
                            },
                          ],
                        }));
                      } catch (e) {
                        setAddendumError((prev) => ({ ...prev, [n.id]: e?.message ?? "Failed to add addendum." }));
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
              {(addendumsByNote[n.id] ?? []).length > 0 ? (
                <div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  {(addendumsByNote[n.id] ?? []).map((a) => (
                    <div key={a.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {formatDate(a.createdAt)} · {a.authorEmail || "—"}
                      </div>
                      <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{a.text}</div>
                    </div>
                  ))}
                </div>
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
          onSubmit={async ({ patientId, content, mood, discipline }) => {
            if (!canEditNotes() || !permissions?.canWriteNotes) {
              setCreateError("Access restricted");
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
            if (hasFeature("ai")) {
              setAnalysing(true);
              try {
                try {
                  aiResult = await analyseClinicalNote({
                    content,
                    authorRole: resolvedDiscipline,
                    patientId,
                  });
                } catch (aiErr) {
                  console.error("AI failed:", aiErr);
                  aiResult = null;
                }
              } finally {
                setAnalysing(false);
              }
            }

            try {
              const structured = aiResult?.structuredData
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

              await addClinicalNote(patientId, {
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
              console.error("Clinical note pipeline failed:", err);
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
  const [discipline, setDiscipline] = useState("");
  const [roleError, setRoleError] = useState(null);

  useEffect(() => {
    const p = (defaultMdtFromProfile ?? "").trim();
    setDiscipline(p || "Clinical");
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
          {isManager && (
            <p style={{ margin: "0.5rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
              Manager view is restricted to a single patient.
            </p>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 700 }}>
            Discipline *
          </label>
          <input
            type="text"
            value={discipline}
            onChange={(e) => {
              setDiscipline(e.target.value);
              setRoleError(null);
            }}
            list="clinical-discipline-options"
            placeholder="e.g. Nurse"
            required
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
          />
          <datalist id="clinical-discipline-options">
            {MDT_ROLES.map((role) => (
              <option key={role} value={role} />
            ))}
          </datalist>
          <p style={{ margin: "0.45rem 0 0 0", color: "#64748b", fontSize: "0.8rem" }}>
            Tip: Press Ctrl + Enter to submit quickly.
          </p>
        </div>

        <ClinicalNoteForm
          loading={loading || analysing}
          onSubmit={({ content, mood }) => {
            if (!patientId?.trim()) return;
            if (!discipline.trim()) {
              setRoleError("Please enter a discipline");
              return;
            }
            setRoleError(null);

            onSubmit({
              patientId: patientId.trim(),
              content,
              mood: mood ?? null,
              discipline: discipline.trim(),
              currentServiceId,
              createdBy,
            });
          }}
        />
      </div>
    </div>
  );
}
