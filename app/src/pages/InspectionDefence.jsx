/** CQC Inspection defence pack: real-time scoring + actionable improvement plan. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { usePatients } from "../hooks/usePatients";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import { listCareLogsForPatient } from "../services/careLogsService";
import { listPolicies } from "../services/policyService";
import { runInspectionDefenceEngine } from "../services/inspectionEngine";
import { exportToPDF } from "../utils/exportPdf";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function scoreColour(score) {
  if (score >= 80) return { text: "#166534", bg: "#ecfdf5", border: "#86efac" };
  if (score >= 65) return { text: "#92400e", bg: "#fffbeb", border: "#fcd34d" };
  return { text: "#991b1b", bg: "#fef2f2", border: "#fecaca" };
}

function scorePillStyle(score) {
  const c = scoreColour(score);
  return {
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    background: c.bg,
    color: c.text,
    fontWeight: 900,
    fontSize: 13,
    display: "inline-block",
  };
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === "object") {
    if (typeof ts.toMillis === "function") {
      try {
        return ts.toMillis();
      } catch {
        return 0;
      }
    }
    if (typeof ts.toDate === "function") {
      try {
        return ts.toDate().getTime();
      } catch {
        return 0;
      }
    }
  }
  const d = new Date(ts);
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

export default function InspectionDefence() {
  const { organisationId, organisation } = useOrganisation();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

  const patientFromQuery = (searchParams.get("patient") ?? "").trim();
  const [selectedPatientId, setSelectedPatientId] = useState(patientFromQuery);
  useEffect(() => {
    if (patientFromQuery) setSelectedPatientId(patientFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientFromQuery]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [output, setOutput] = useState(null);

  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!organisationId) return;
    if (!selectedPatientId) {
      setOutput(null);
      return;
    }
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const [notes, incidents, behaviourLogs, physicalHealth, careLogs, policies] = await Promise.all([
        fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 60 }).catch(() => []),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }).catch(() => []),
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 80 }).catch(() => []),
        listPhysicalObservationsForPatient(organisationId, selectedPatientId, { limitCount: 120 }).catch(() => []),
        listCareLogsForPatient(organisationId, selectedPatientId, { limitCount: 250 }).catch(() => []),
        listPolicies(organisationId).catch(() => []),
      ]);

      const defence = runInspectionDefenceEngine({
        notes,
        incidents,
        behaviourLogs,
        physicalHealth,
        careLogs,
        policies,
      });

      setOutput(defence);
    } catch (e) {
      setError(e?.message ?? "Failed to build inspection defence pack.");
    } finally {
      setLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void load();
  }, [load]);

  function onPatientChange(id) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("patient", id);
    else next.delete("patient");
    setSearchParams(next, { replace: true });
    setSelectedPatientId(id);
  }

  const combinedWarnings = useMemo(() => {
    if (!output) return [];
    const issues = [];
    Object.values(output.domains).forEach((d) => {
      issues.push(...(d.issues ?? []));
    });
    // De-dupe while keeping order.
    return Array.from(new Set(issues)).slice(0, 30);
  }, [output]);

  const ratingLabel = output?.rating === "GREEN" ? "Strong evidence" : output?.rating === "AMBER" ? "Needs improvement" : "At risk";

  async function handleExportPdf() {
    if (!output) return;
    setPdfBusy(true);
    try {
      const base = `${safeName(selectedPatient)}_inspection_defence`;
      await exportToPDF("inspection-defence-export", `${base}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>CQC inspection defence pack</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        Real-time domain scoring with clear warnings and an actionable improvement plan.
      </p>

      {!organisationId ? (
        <div role="status" style={{ ...card, background: "#fffbeb", borderColor: "#fcd34d" }}>
          Select an organisation to generate a defence pack.
        </div>
      ) : null}

      <div style={card}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
          Patient
        </label>
        <select
          value={selectedPatientId}
          onChange={(e) => onPatientChange(e.target.value)}
          disabled={patientsLoading || !organisationId}
          style={{ width: "100%", maxWidth: 520, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          <option value="">— Select patient —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {safeName(p)}
            </option>
          ))}
        </select>
        {patientsError ? <p style={{ color: "#b91c1c", marginTop: 8 }}>{patientsError}</p> : null}
        {selectedPatientId ? (
          <p style={{ marginTop: 10, marginBottom: 0, color: "#334155", fontSize: 13, fontWeight: 800 }}>
            Selected: {safeName(selectedPatient)}
          </p>
        ) : null}
      </div>

      {loading ? <div role="status" style={{ ...card, color: "#475569" }}>Building inspection defence…</div> : null}
      {error ? <div role="alert" style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div> : null}

      {output ? (
        <div id="inspection-defence-export" style={{ marginTop: 16 }}>
          <div style={{ ...card, ...scoreColour(output.overallScore) }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 18, color: "#0f172a" }}>
                  Overall score: {output.overallScore} / 100 · {ratingLabel}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "#475569", fontWeight: 800 }}>
                  Rating: <span style={{ ...scorePillStyle(output.overallScore), marginLeft: 8 }}>{output.rating}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  disabled={pdfBusy}
                  style={{
                    padding: "10px 16px",
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 900,
                    cursor: pdfBusy ? "wait" : "pointer",
                  }}
                >
                  {pdfBusy ? "Preparing PDF…" : "Export full defence pack"}
                </button>
                {selectedPatientId ? (
                  <Link
                    to={`/patients/${selectedPatientId}`}
                    style={{
                      padding: "10px 16px",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: 10,
                      textDecoration: "none",
                      color: "#0f172a",
                      fontWeight: 900,
                      display: "inline-block",
                    }}
                  >
                    Open patient
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {Object.entries(output.domains).map(([key, domain]) => (
              <div key={key} style={{ ...card, ...scoreColour(domain.score), marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 1000, color: "#0f172a" }}>{key.replace(/_/g, " ")}</h3>
                  <span style={scorePillStyle(domain.score)}>{domain.score}</span>
                </div>
                {domain.issues?.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#475569" }}>Warnings</div>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.4 }}>
                      {domain.issues.slice(0, 5).map((it, i) => (
                        <li key={`${key}-issue-${i}`}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontWeight: 900, fontSize: 13, color: "#166534" }}>No major issues detected.</div>
                )}
                {domain.strengths?.length ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: "#475569" }}>Strengths</div>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.4 }}>
                      {domain.strengths.slice(0, 4).map((it, i) => (
                        <li key={`${key}-str-${i}`}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16 }}>Warnings</h2>
            {combinedWarnings.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                {combinedWarnings.map((w, i) => (
                  <li key={`warn-${i}`}>{w}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, color: "#166534", fontWeight: 900 }}>No critical warnings found in current evidence.</p>
            )}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16 }}>Actions required</h2>
            {output.actionPlan?.length ? (
              <ol style={{ margin: 0, paddingLeft: 20, color: "#334155", fontSize: 14, lineHeight: 1.55 }}>
                {output.actionPlan.map((a, i) => (
                  <li key={`act-${i}`}>{a}</li>
                ))}
              </ol>
            ) : (
              <p style={{ margin: 0, color: "#166534", fontWeight: 900 }}>No actions required based on the evidence provided.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

