/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { listPatients } from "../services/patientService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { useRole } from "../context/RoleContext";
import { analyseNote } from "../services/aiService";
import { addClinicalNote, fetchClinicalNotesForOrganisation } from "../services/noteService";
import { logAuditEvent } from "../services/auditService";
import ClinicalNoteForm from "../components/ClinicalNoteForm";
import { formatUkDateTime } from "../utils/dateFormat";
import { MDT_OTHER, MDT_ROLES } from "../constants/mdtRoles";

function formatDate(value) {
  return formatUkDateTime(value, "—");
}

export default function ClinicalNotes() {
  const { organisationId, organisation, hasFeature, userProfile } = useOrganisation();
  const { currentServiceId, services } = useService();
  const { user } = useAuth();
  const { role, canViewNotes, canEditNotes, loading: roleLoading } = useRole();
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

  if (roleLoading) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "#666" }}>Loading…</p>
      </div>
    );
  }

  if (!canViewNotes()) {
    return (
      <div style={{ padding: 40, maxWidth: 560 }}>
        <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
        <p style={{ color: "#64748b" }}>Your role does not have access to clinical notes for this organisation.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Clinical Notes</h1>
          <p style={{ margin: 0, color: "#555", fontSize: "0.95rem" }}>
            {organisation?.name ? `${organisation.name}${currentServiceId ? ` · ${currentServiceName}` : ""}` : "Manage clinical notes for this organisation."}
          </p>
        </div>
        {canEditNotes() ? (
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
        ) : null}
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
          onSubmit={async ({ patientId, category, content, mood, discipline }) => {
            const resolvedDiscipline = (discipline ?? "").toString().trim();
            if (!resolvedDiscipline) {
              setCreateError("Please select a role");
              return;
            }

            setCreating(true);
            setCreateError(null);

            let analysis = null;
            if (hasFeature("ai")) {
              setAnalysing(true);
              try {
                try {
                  analysis = await analyseNote(content, resolvedDiscipline, patientId);
                } catch (aiErr) {
                  console.error("AI failed:", aiErr);
                  analysis = null;
                }
              } finally {
                setAnalysing(false);
              }
            }

            try {
              const structured = analysis
                ? {
                    behaviour: analysis.behaviour,
                    mood: analysis.mood,
                    engagement: analysis.engagement,
                    physicalHealth: analysis.physicalHealth,
                    medicationIssues: analysis.medicationIssues,
                    incidents: analysis.incidents,
                    riskIndicators: analysis.riskIndicators,
                    summary: analysis.summary,
                  }
                : undefined;

              await addClinicalNote(patientId, {
                category,
                content,
                mood: mood ?? analysis?.mood ?? null,
                authorEmail: createdBy,
                serviceId: currentServiceId ?? null,
                discipline: resolvedDiscipline,
                ...(structured ? { structured } : {}),
              });
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
  const [category, setCategory] = useState("Routine");
  const [mdtRole, setMdtRole] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [roleError, setRoleError] = useState(null);

  useEffect(() => {
    const p = (defaultMdtFromProfile ?? "").trim();
    if (!p) return;
    if (MDT_ROLES.includes(p)) {
      setMdtRole(p);
      setCustomRole("");
    } else {
      setMdtRole(MDT_OTHER);
      setCustomRole(p);
    }
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
            MDT role / clinical role *
          </label>
          <select
            required
            value={mdtRole}
            onChange={(e) => {
              setMdtRole(e.target.value);
              setRoleError(null);
            }}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="">Select role…</option>
            {MDT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {mdtRole === MDT_OTHER && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4, fontWeight: 700 }}>
              Enter role *
            </label>
            <input
              type="text"
              value={customRole}
              onChange={(e) => {
                setCustomRole(e.target.value);
                setRoleError(null);
              }}
              placeholder="e.g. Art Therapist"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="Routine">Routine</option>
            <option value="Emergency">Emergency</option>
            <option value="Wellbeing">Wellbeing</option>
          </select>
        </div>

        <ClinicalNoteForm
          loading={loading || analysing}
          onSubmit={({ content, mood }) => {
            if (!patientId?.trim()) return;

            if (!mdtRole) {
              setRoleError("Please select a role");
              return;
            }
            if (mdtRole === MDT_OTHER && !customRole.trim()) {
              setRoleError("Please enter your role");
              return;
            }
            setRoleError(null);

            const discipline = mdtRole === MDT_OTHER ? customRole.trim() : mdtRole;

            onSubmit({
              patientId: patientId.trim(),
              category,
              content,
              mood: mood ?? null,
              discipline,
              currentServiceId,
              createdBy,
            });
          }}
        />
      </div>
    </div>
  );
}
