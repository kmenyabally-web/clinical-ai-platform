import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPatients } from "../services/patientService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";
import ActionBar from "../components/ActionBar";

function safeString(v) {
  return typeof v === "string" ? v : "";
}

export default function MdtReviews() {
  const { organisationId } = useOrganisation();
  const { isInspectorRole } = useRole();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState([]);
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
      })),
    [patients]
  );

  useEffect(() => {
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
      } catch (e) {
        if (!mounted) return;
        setNotesError(e?.message ?? "Failed to load MDT reviews.");
        setNotes([]);
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

  function generateMDTReview() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { mdtReview: "generate" });
    }
  }

  const redactSensitive = Boolean(isInspectorRole());
  const mdtRows = (notes ?? [])
    .map((n) => ({ note: n, mdt: n?.mdtReview ?? null }))
    .filter((x) => x.mdt && typeof x.mdt.summary === "string" && x.mdt.summary.trim())
    .sort((a, b) => {
      const ta = a.note?.createdAt?.toMillis?.() ?? 0;
      const tb = b.note?.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

  return (
    <div style={{ padding: "2rem", maxWidth: 980, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>MDT Reviews</h1>

      <ActionBar
        actions={[
          {
            label: "⚡ Generate MDT Review",
            type: "generate",
            onClick: () => generateMDTReview(),
          },
        ]}
      />

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
        <div style={{ color: "#64748b" }}>Loading MDT reviews…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mdtRows.length === 0 ? (
            <div style={{ color: "#64748b" }}>No MDT review outputs available for this patient.</div>
          ) : (
            mdtRows.map(({ note, mdt }) => (
              <div key={note.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>
                    [{note.discipline || "MDT"}] MDT summary
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {note?.createdAt?.toMillis ? new Date(note.createdAt.toMillis()).toISOString() : "—"}
                  </div>
                </div>
                <div style={{ marginTop: 8, color: "#0f172a", whiteSpace: "pre-wrap" }}>
                  {redactSensitive ? "" : mdt.summary}
                </div>

                {redactSensitive ? (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", padding: "8px 10px", borderRadius: 8 }}>
                    Structured details restricted for this role.
                  </div>
                ) : null}

                {redactSensitive ? null : (
                  <>
                    {Array.isArray(mdt.recommendations) && mdt.recommendations.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, color: "#334155" }}>Recommendations</div>
                        <ul style={{ margin: "6px 0 0 18px" }}>
                          {mdt.recommendations.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {Array.isArray(mdt.risksToAddress) && mdt.risksToAddress.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, color: "#334155" }}>Risks to address</div>
                        <ul style={{ margin: "6px 0 0 18px" }}>
                          {mdt.risksToAddress.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {Array.isArray(mdt.nextActions) && mdt.nextActions.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, color: "#334155" }}>Next actions</div>
                        <ul style={{ margin: "6px 0 0 18px" }}>
                          {mdt.nextActions.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

