/** Live care plan risk detection + AI refinement (real-time scoring). */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { usePatients } from "../hooks/usePatients";

import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import { listCareLogsForPatient } from "../services/careLogsService";

import { runCarePlanEngine } from "../services/carePlanEngine";
import { runCarePlanEngineWithAI } from "../services/carePlanEngine";
import { runPredictionEngine } from "../services/predictionEngine";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

function formatDateTime(ts) {
  if (!ts) return "";
  try {
    const d = ts instanceof Date ? ts : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function newRiskAlertText() {
  return "⚠️ New risk identified";
}

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

export default function CarePlan() {
  const { organisationId } = useOrganisation();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

  const patientFromQuery = (searchParams.get("patient") ?? "").trim();
  const [selectedPatientId, setSelectedPatientId] = useState(patientFromQuery);

  useEffect(() => {
    if (patientFromQuery) setSelectedPatientId(patientFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientFromQuery]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [basePlan, setBasePlan] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);

  const riskSetRef = useRef(new Set());
  const [alertText, setAlertText] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const evidenceRef = useRef(null);
  const [predictionOut, setPredictionOut] = useState(null);

  const [refreshTick, setRefreshTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setRefreshTick(Date.now()), 25000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!organisationId) return;
    if (!selectedPatientId) {
      setBasePlan(null);
      setAiPlan(null);
      setAlertText(null);
      riskSetRef.current = new Set();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [notes, incidents, behaviourLogs, physicalHealth, careLogs] = await Promise.all([
        fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 50 }).catch(() => []),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }).catch(() => []),
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 80 }).catch(() => []),
        listPhysicalObservationsForPatient(organisationId, selectedPatientId, { limitCount: 120 }).catch(() => []),
        listCareLogsForPatient(organisationId, selectedPatientId, { limitCount: 250 }).catch(() => []),
      ]);

      evidenceRef.current = { notes, incidents, behaviourLogs, physicalHealth, careLogs };

      const nextBase = runCarePlanEngine({
        notes,
        behaviourLogs,
        physicalHealth,
        careLogs,
        incidents,
      });

      setBasePlan(nextBase);
      setPredictionOut(
        runPredictionEngine({
          behaviourLogs,
          physicalHealth,
          careLogs,
          incidents,
        })
      );
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.message ?? "Failed to compute care plan.");
    } finally {
      setLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void load();
  }, [load, refreshTick]);

  // Alert when a new risk category appears.
  useEffect(() => {
    if (!basePlan) return;
    const current = new Set(basePlan.risks ?? []);
    const currentHasAny = current.size > 0;
    if (currentHasAny) {
      const prev = riskSetRef.current;
      const newOnes = [...current].filter((r) => !prev.has(r));
      if (newOnes.length > 0) setAlertText(newRiskAlertText());
    } else {
      setAlertText(null);
    }
    riskSetRef.current = current;
  }, [basePlan]);

  // AI refinement when basePlan risks change.
  const risksKey = useMemo(() => {
    const list = basePlan?.risks ?? [];
    return list.slice().sort().join("|");
  }, [basePlan]);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      if (!basePlan) {
        setAiPlan(null);
        return;
      }
      if (!risksKey) {
        setAiPlan(basePlan);
        return;
      }
      setAiPlan(null);
      setAiBusy(true);
      try {
        const evidence = evidenceRef.current;
        const refined = evidence ? await runCarePlanEngineWithAI(evidence).catch(() => null) : null;
        if (!cancelled) setAiPlan(refined ?? basePlan);
      } finally {
        if (!cancelled) setAiBusy(false);
      }
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [risksKey]);

  const activePlan = aiPlan ?? basePlan;

  function onPatientChange(id) {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("patient", id);
    else next.delete("patient");
    setSearchParams(next, { replace: true });
    setSelectedPatientId(id);
  }

  const hasRisks = (activePlan?.risks ?? []).length > 0;

  return (
    <div style={{ padding: "24px", maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>Care plan (risk engine)</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        Real-time risk detection with an auto-generated care plan and AI-refined wording.
      </p>

      {!organisationId ? (
        <div role="status" style={{ ...card, background: "#fffbeb", borderColor: "#fcd34d" }}>
          Select an organisation to generate a care plan.
        </div>
      ) : null}

      <div style={card}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "#334155", marginBottom: 6 }}>Patient</label>
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
            Selected: {safeName(patients.find((p) => p.id === selectedPatientId) ?? null)}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div role="status" style={{ ...card, color: "#475569" }}>
          Computing care plan…
        </div>
      ) : null}

      {error ? (
        <div role="alert" style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          {error}
        </div>
      ) : null}

      {activePlan ? (
        <div id="care-plan-export" style={{ marginTop: 16 }}>
          {alertText && hasRisks ? (
            <div style={{ ...card, background: "#fff7ed", borderColor: "#fdba74", marginBottom: 12 }}>
              {alertText}
            </div>
          ) : null}

          <div style={{ ...card, ...(activePlan?.overallScore != null ? scoreColour(activePlan.overallScore) : {}) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 1000, fontSize: 16, color: "#0f172a" }}>
                Overall score: {activePlan.overallScore} / 100 · {activePlan.rating === "GREEN" ? "Green" : activePlan.rating === "AMBER" ? "Amber" : "Red"}
              </div>
              <span style={scorePillStyle(activePlan.overallScore)}>{activePlan.rating}</span>
            </div>
          </div>

          {lastUpdated ? (
            <p style={{ color: "#64748b", marginTop: 0, marginBottom: 12, fontSize: 13, fontWeight: 700 }}>
              Last updated: {formatDateTime(lastUpdated)}
            </p>
          ) : null}

          {predictionOut ? (
            <div style={{ ...card, marginBottom: 12 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Predictions</h2>
              {predictionOut.predictions.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                  {predictionOut.predictions.map((p, i) => (
                    <li key={`pred-${i}`}>{p}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: "#166534", fontWeight: 900 }}>No predictions detected from current evidence.</p>
              )}
              <div style={{ marginTop: 10, fontWeight: 900, color: "#475569", fontSize: 13 }}>
                Confidence: <span style={scorePillStyle(predictionOut.confidence === "High" ? 85 : 70)}>{predictionOut.confidence}</span>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            <div style={card}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Risks</h2>
              {(activePlan.risks ?? []).length ? (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                  {activePlan.risks.map((r, i) => (
                    <li key={`risk-${i}`}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#166534", fontWeight: 900 }}>No risks detected.</p>
              )}
            </div>

            <div style={card}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Interventions</h2>
              {(activePlan.interventions ?? []).length ? (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                  {activePlan.interventions.map((it, i) => (
                    <li key={`int-${i}`}>{it}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#64748b", fontWeight: 800 }}>No interventions.</p>
              )}
              {aiBusy ? <p style={{ marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: 800 }}>Refining with AI…</p> : null}
            </div>

            <div style={card}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Monitoring plan</h2>
              {(activePlan.monitoring ?? []).length ? (
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                  {activePlan.monitoring.map((it, i) => (
                    <li key={`mon-${i}`}>{it}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: "10px 0 0", color: "#64748b", fontWeight: 800 }}>No monitoring entries.</p>
              )}
            </div>
          </div>

          {selectedPatientId ? (
            <div style={{ marginTop: 14 }}>
              <Link
                to={`/patients/${selectedPatientId}`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  textDecoration: "none",
                  color: "#0f172a",
                  fontWeight: 900,
                }}
              >
                Open patient
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

