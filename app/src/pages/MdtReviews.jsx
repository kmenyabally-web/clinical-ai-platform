import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";
import ActionBar from "../components/ActionBar";
import { usePermissions } from "../hooks/usePermissions";
import { usePatients } from "../hooks/usePatients";
import { useAppContext } from "../context/AppContext";
import { buildStructuredMdtSummary, disciplineToBucket } from "../utils/mdtSummaryEngine";
import { formatBehaviourClinicalUk } from "../utils/behaviourClinicalTime";

function safeString(v) {
  return typeof v === "string" ? v : "";
}

function formatWhen(value) {
  if (!value) return "—";
  try {
    if (typeof value === "object" && value !== null && typeof value.toMillis === "function") {
      return new Date(value.toMillis()).toLocaleString("en-GB");
    }
    if (value instanceof Date) return value.toLocaleString("en-GB");
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB");
  } catch {
    return "—";
  }
}

const BUCKET_LABELS = {
  nurse: "Nursing & support",
  doctor: "Medical",
  psychologist: "Psychology",
  ot: "Occupational therapy",
  salt: "Speech & language",
  other: "Other disciplines",
};

export default function MdtReviews() {
  const { organisationId } = useOrganisation();
  const { isInspectorRole } = useRole();
  const permissions = usePermissions();
  const { demoMode, patientId: appPatientId } = useAppContext();
  const DEMO_PATIENT_ID = appPatientId ?? "patient001";

  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState(() => (demoMode ? DEMO_PATIENT_ID : ""));
  const [notes, setNotes] = useState([]);
  const [behaviours, setBehaviours] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState(null);

  const options = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        id: safeString(p?.id),
        label:
          `${safeString(p?.firstName)} ${safeString(p?.lastName)}`.trim() ||
          safeString(p?.name) ||
          p?.id ||
          "Patient",
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
    async function loadBundle() {
      setBundleLoading(true);
      setBundleError(null);
      try {
        const [noteList, behList, incList] = await Promise.all([
          fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 120 }).catch(() => []),
          fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 80 }).catch(() => []),
          fetchIncidentsForPatient(selectedPatientId, { limitCount: 40 }).catch(() => []),
        ]);
        if (!mounted) return;
        setNotes(Array.isArray(noteList) ? noteList : []);
        setBehaviours(Array.isArray(behList) ? behList : []);
        setIncidents(Array.isArray(incList) ? incList : []);
      } catch (e) {
        if (!mounted) return;
        setBundleError(e?.message ?? "Failed to load MDT data.");
        setNotes([]);
        setBehaviours([]);
        setIncidents([]);
      } finally {
        if (mounted) setBundleLoading(false);
      }
    }
    loadBundle();
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

  const summary = useMemo(
    () =>
      buildStructuredMdtSummary({
        notes,
        behaviours,
        incidents,
      }),
    [notes, behaviours, incidents]
  );

  const mdtRows = (notes ?? [])
    .map((n) => ({ note: n, mdt: n?.mdtReview ?? null }))
    .filter((x) => x.mdt && typeof x.mdt.summary === "string" && x.mdt.summary.trim())
    .sort((a, b) => {
      const ta = a.note?.createdAt?.toMillis?.() ?? 0;
      const tb = b.note?.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

  return (
    <div style={{ padding: "2rem", width: "100%", fontFamily: "sans-serif" }}>
      <h1 style={{ marginTop: 0 }} data-demo-guide="mdt-reviews-title">
        MDT Reviews
      </h1>

      {permissions?.canAccessMDT ? (
        <ActionBar
          actions={[
            {
              label: "⚡ Generate MDT Review",
              type: "generate",
              onClick: () => generateMDTReview(),
            },
          ]}
        />
      ) : null}

      {!organisationId ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          Loading organisation...
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
            {!organisationId ? (
              <option value="">Loading organisation...</option>
            ) : options.length ? (
              options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">No patients registered yet</option>
            )}
          </select>
        </label>
        <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
          Open patient list
        </Link>
      </div>

      {!patientsLoading && options.length === 0 && organisationId ? (
        <div style={{ color: "#64748b", marginBottom: 16, fontSize: "0.95rem" }}>No patients registered yet</div>
      ) : null}

      {bundleError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          {bundleError}
        </div>
      ) : null}

      {bundleLoading ? (
        <div style={{ color: "#64748b" }}>Loading MDT data…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }} data-demo-guide="mdt-structured-summary">
              Structured MDT summary
            </h2>
            {redactSensitive ? (
              <p style={{ color: "#92400e", fontSize: 13 }}>Structured summary restricted for this role.</p>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#475569" }}>Current presentation</div>
                  <p style={{ margin: "6px 0 0 0", whiteSpace: "pre-wrap", color: "#0f172a" }}>{summary.currentPresentation}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#475569" }}>Risks</div>
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {summary.risks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#475569" }}>Behaviour trends</div>
                  <p style={{ margin: "6px 0 0 0", color: "#334155" }}>{summary.behaviourTrends}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#475569" }}>Medication concerns</div>
                  <p style={{ margin: "6px 0 0 0", color: "#334155" }}>{summary.medicationConcerns}</p>
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", marginBottom: 8 }}>
                    Recommendations by discipline
                  </div>
                  {Object.entries(summary.recommendationsByDiscipline).map(([k, lines]) => (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{BUCKET_LABELS[k] ?? k}</div>
                      <ul style={{ margin: "4px 0 0 18px" }}>
                        {(lines ?? []).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Notes by discipline (grouped)</h2>
            {["nurse", "doctor", "psychologist", "ot", "salt", "other"].map((bucket) => {
              const arr = summary.grouped?.[bucket] ?? [];
              return (
                <div key={bucket} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{BUCKET_LABELS[bucket] ?? bucket}</div>
                  {arr.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>No notes in this group.</div>
                  ) : (
                    <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                      {arr.slice(0, 8).map((n) => (
                        <li key={n.id} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
                          <span style={{ color: "#64748b" }}>{formatWhen(n.createdAt)}</span> · {safeString(n.discipline)} —{" "}
                          {(n.content ?? "").toString().slice(0, 160)}
                          {(n.content ?? "").toString().length > 160 ? "…" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Behaviour logs (sample)</h2>
            {behaviours.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>No structured behaviour logs for this patient.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {behaviours.slice(0, 10).map((b) => (
                  <li key={b.id} style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>{b.behaviourType}</strong> ({b.severity}) — {formatBehaviourClinicalUk(b)}
                    {b.trigger ? <span style={{ color: "#475569" }}> — trigger: {b.trigger}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Incidents (sample)</h2>
            {incidents.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>No incidents on file for this patient in scope.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {incidents.slice(0, 10).map((i) => (
                  <li key={i.id} style={{ marginBottom: 8, fontSize: 13 }}>
                    <strong>{i.severity}</strong> · {i.status ?? "—"} — {formatWhen(i.createdAt)}
                    {i.description ? <div style={{ color: "#475569", marginTop: 4 }}>{String(i.description).slice(0, 200)}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: "1.05rem" }}>AI-generated MDT blocks (from notes)</h2>
            {mdtRows.length === 0 ? (
              <div style={{ color: "#64748b" }}>No AI MDT review blocks stored on notes yet.</div>
            ) : (
              mdtRows.map(({ note, mdt }) => (
                <div key={note.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900 }}>
                      [{note.discipline || "MDT"}] · bucket: {disciplineToBucket(note.discipline)}
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
          </section>
        </div>
      )}
    </div>
  );
}
