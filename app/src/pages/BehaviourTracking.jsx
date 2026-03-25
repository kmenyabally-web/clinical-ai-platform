import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPatients } from "../services/patientService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import PatientTimeline from "../components/PatientTimeline";
import { fetchBehaviourForPatient } from "../services/behaviourService";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";

function safeString(v) {
  return typeof v === "string" ? v : "";
}

export default function BehaviourTracking() {
  const { organisationId, hasFeature } = useOrganisation();
  const { isInspectorRole } = useRole();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState([]);
  const [behaviourEvents, setBehaviourEvents] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const list = await listPatients();
        if (!mounted) return;
        setPatients(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setPatientsError(e?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (!mounted) return;
        setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        id: safeString(p?.id),
        label: `${safeString(p?.firstName)} ${safeString(p?.lastName)}`.trim() || p?.id || "Patient",
        wardId: safeString(p?.wardId),
      })),
    [patients]
  );

  useEffect(() => {
    // Default selection for convenience.
    if (!selectedPatientId && options.length) {
      const first = options[0]?.id ?? "";
      setSelectedPatientId(first);
    }
  }, [options, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let mounted = true;
    async function loadNotes() {
      setNotesLoading(true);
      setNotesError(null);
      try {
        const list = await fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 80 });
        if (!mounted) return;
        setNotes(Array.isArray(list) ? list : []);
        const events = await fetchBehaviourForPatient(selectedPatientId, { limitCount: 80 });
        if (!mounted) return;
        setBehaviourEvents(Array.isArray(events) ? events : []);
      } catch (e) {
        if (!mounted) return;
        setNotesError(e?.message ?? "Failed to load behaviour logs.");
        setNotes([]);
        setBehaviourEvents([]);
      } finally {
        if (!mounted) return;
        setNotesLoading(false);
      }
    }
    loadNotes();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId]);

  const redactSensitive = Boolean(isInspectorRole());

  return (
    <div style={{ padding: "2rem", maxWidth: 980, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Behaviour Tracking</h1>

      {!organisationId ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          Organisation context missing. Select a patient after governance is configured.
        </div>
      ) : null}

      {patientsError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          {patientsError}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ fontWeight: 800 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || options.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {options.length ? (
              options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">No patients</option>
            )}
          </select>
        </label>
        <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
          Open patient list
        </Link>
      </div>

      {notesError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          {notesError}
        </div>
      ) : null}

      {notesLoading ? (
        <div style={{ color: "#64748b" }}>Loading behaviour logs…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PatientTimeline
            variant="notes"
            notes={notes}
            loadingNotes={false}
            formatWhen={(v) => (v ? new Date(v).toISOString() : "—")}
            redactSensitive={redactSensitive}
            noteTextMode="corrected"
            emptyNotesMessage="No clinical notes (behaviour logs) available for this patient."
          />
          {behaviourEvents?.length ? (
            <div>
              <h2 style={{ fontSize: 14, margin: "0 0 8px 0", color: "#0f172a" }}>Behaviour events (derived)</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {behaviourEvents.slice(0, 15).map((ev) => (
                  <span
                    key={ev.id ?? ev.noteId}
                    style={{ fontSize: 12, fontWeight: 800, color: "#1e3a8a", background: "#dbeafe", border: "1px solid #93c5fd", padding: "2px 8px", borderRadius: 999 }}
                  >
                    {ev.behaviour}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {!hasFeature("risk") ? (
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>
          Risk tagging is not available on this plan.
        </p>
      ) : null}
    </div>
  );
}

