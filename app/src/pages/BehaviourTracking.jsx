import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  behaviourTypes,
  createBehaviourLog,
  fetchStructuredBehaviourLogsForPatient,
  isValidStructuredBehaviourLog,
} from "../services/behaviourService";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";
import { getBehaviourLogInsights, calculateCqcScore } from "../engine/inspectionInsights";
import { calculateBehaviourRiskFromLogs } from "../utils/riskEngine";
import { analyseBehaviourRiskSignals } from "../utils/behaviourRiskAnalytics";
import { analyzeSafeguardingIntelligence, buildSafeguardingSummary } from "../utils/safeguardingIntelligence";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { usePatients } from "../hooks/usePatients";
import { showToast } from "../utils/toast";

function formatBehaviourTime(value) {
  if (!value) return "—";
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return "—";
    }
  }
  return "—";
}

function severityBadgeStyle(severity) {
  const s = String(severity ?? "").toLowerCase();
  if (s === "high") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (s === "medium") return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  return { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
}

const inputStyle = {
  width: "100%",
  maxWidth: 420,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 12,
};

const alertStyles = {
  warning: { background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" },
  info: { background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e40af" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
};

function BehaviourRiskAlert({ type, children }) {
  return (
    <div
      role="alert"
      style={{
        ...alertStyles[type],
        padding: "12px 14px",
        borderRadius: 10,
        marginBottom: 12,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}

export default function BehaviourTracking() {
  const { organisationId, hasFeature } = useOrganisation();
  const { user } = useAuth();
  const { isInspectorRole } = useRole();
  const permissions = usePermissions();

  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [behaviourLogs, setBehaviourLogs] = useState([]);
  const [patientIncidents, setPatientIncidents] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const [timeMode, setTimeMode] = useState("auto");
  const [manualTime, setManualTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [behaviourType, setBehaviourType] = useState(behaviourTypes[0]);
  const [severity, setSeverity] = useState("Medium");
  const [trigger, setTrigger] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [stompRelated, setStompRelated] = useState(false);
  const [medicationRefused, setMedicationRefused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (!selectedPatientId && patients.length) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId || !organisationId) {
      setBehaviourLogs([]);
      setPatientIncidents([]);
      return;
    }
    let mounted = true;
    async function loadBehaviourAndIncidents() {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const [rows, inc] = await Promise.all([
          fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 100 }),
          fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }),
        ]);
        if (!mounted) return;
        setBehaviourLogs(Array.isArray(rows) ? rows : []);
        setPatientIncidents(Array.isArray(inc) ? inc : []);
      } catch (e) {
        if (!mounted) return;
        setLogsError(e?.message ?? "Failed to load behaviour or incident data.");
        setBehaviourLogs([]);
        setPatientIncidents([]);
      } finally {
        if (mounted) setLogsLoading(false);
      }
    }
    loadBehaviourAndIncidents();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId, organisationId]);

  const validBehaviours = useMemo(
    () => (Array.isArray(behaviourLogs) ? behaviourLogs.filter((b) => isValidStructuredBehaviourLog(b)) : []),
    [behaviourLogs]
  );

  const behaviourRisk = useMemo(() => calculateBehaviourRiskFromLogs(validBehaviours), [validBehaviours]);

  const safeguardingAnalysis = useMemo(
    () => analyzeSafeguardingIntelligence({ behaviours: validBehaviours, incidents: patientIncidents }),
    [validBehaviours, patientIncidents]
  );

  const behaviourInsights = useMemo(() => {
    const base = getBehaviourLogInsights(validBehaviours);
    if (safeguardingAnalysis.safeguardingRisk === "LOW") return base;
    return [
      ...base,
      {
        domain: "SAFE",
        level: safeguardingAnalysis.safeguardingRisk === "HIGH" ? "high" : "medium",
        message: "SAFE domain impacted due to safeguarding signals",
        action: safeguardingAnalysis.recommendedAction,
      },
    ];
  }, [validBehaviours, safeguardingAnalysis]);

  const insightScore = useMemo(() => calculateCqcScore(behaviourInsights), [behaviourInsights]);

  const behaviourSignals = useMemo(() => analyseBehaviourRiskSignals(validBehaviours), [validBehaviours]);

  const redactSensitive = Boolean(isInspectorRole());

  async function handleSubmitBehaviour(e) {
    e.preventDefault();
    setSaveError(null);
    if (!organisationId || !selectedPatientId || !user?.uid) {
      setSaveError("Missing organisation, patient, or sign-in.");
      return;
    }
    const bt = (behaviourType ?? "").toString().trim();
    const sev = (severity ?? "").toString().trim();
    const tr = (trigger ?? "").toString().trim();
    const act = (actionTaken ?? "").toString().trim();
    if (!bt || !sev) {
      const msg = "Behaviour type and severity are required.";
      setSaveError(msg);
      showToast(msg);
      return;
    }
    if (!tr || !act) {
      const msg = "Trigger and action taken are required.";
      setSaveError(msg);
      showToast(msg);
      return;
    }
    setSaving(true);
    try {
      await createBehaviourLog({
        patientId: selectedPatientId,
        organisationId,
        behaviourType: bt,
        severity: sev,
        trigger: trigger.trim(),
        action: actionTaken.trim(),
        stompRelated,
        medicationRefused,
        useManualEventTime: timeMode === "manual",
        manualEventAt: timeMode === "manual" && manualTime ? new Date(manualTime) : null,
      });
      setTrigger("");
      setActionTaken("");
      setTimeMode("auto");
      const [rows, inc] = await Promise.all([
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 100 }),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }),
      ]);
      setBehaviourLogs(Array.isArray(rows) ? rows : []);
      setPatientIncidents(Array.isArray(inc) ? inc : []);
    } catch (err) {
      const msg = err?.message ?? "Could not save behaviour log.";
      setSaveError(msg);
      showToast(msg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "2rem", width: "100%", fontFamily: "sans-serif", maxWidth: 960 }}>
      <h1 style={{ marginTop: 0 }}>Behaviour Tracking</h1>

      {!permissions?.canAccessBehaviour ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
          Your role does not have access to behaviour tracking.
        </div>
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

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <label style={{ fontWeight: 800 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || patients.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {patientsLoading ? (
              <option value="">Loading patients…</option>
            ) : patients.length ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}
                </option>
              ))
            ) : (
              <option value="">No patients found for this organisation</option>
            )}
          </select>
        </label>
        <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
          Open patient list
        </Link>
      </div>

      {!patientsLoading && patients.length === 0 && organisationId ? (
        <div style={{ color: "#64748b", marginBottom: 16, fontSize: "0.95rem" }}>
          No patients found for this organisation
        </div>
      ) : null}

      {selectedPatientId ? (
        <section
          style={{
            marginBottom: 24,
            padding: "1rem 1.25rem",
            background: "#f8fafc",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h2 style={{ fontSize: "1rem", margin: "0 0 8px 0" }}>Risk & inspection context</h2>
          <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#334155" }}>
            Behaviour risk (structured logs):{" "}
            <strong style={{ textTransform: "uppercase" }}>{behaviourRisk.level}</strong> · score {behaviourRisk.score}
          </p>
          <p style={{ margin: "0 0 8px 0", fontSize: 14, color: "#334155" }}>
            Insight-derived score (from behaviour signals): <strong>{insightScore}</strong>/100
          </p>
          {behaviourInsights.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
              {behaviourInsights.map((i, idx) => (
                <li key={idx}>
                  <strong>{i.domain}</strong> ({i.level}): {i.message}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>No extra inspection flags from behaviour data yet.</p>
          )}
        </section>
      ) : null}

      <section
        style={{
          marginBottom: 24,
          padding: "1.25rem",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Log Behaviour</h2>
        {!selectedPatientId ? (
          <p style={{ color: "#64748b" }}>Select a patient above to log behaviour.</p>
        ) : (
          <form onSubmit={handleSubmitBehaviour}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>Time</span>
              <label style={{ marginRight: 16 }}>
                <input type="radio" name="timeMode" checked={timeMode === "auto"} onChange={() => setTimeMode("auto")} />{" "}
                Auto (now)
              </label>
              <label>
                <input type="radio" name="timeMode" checked={timeMode === "manual"} onChange={() => setTimeMode("manual")} />{" "}
                Manual
              </label>
              {timeMode === "manual" ? (
                <input
                  type="datetime-local"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  style={{ ...inputStyle, marginTop: 8, display: "block" }}
                />
              ) : null}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Behaviour type</label>
              <select value={behaviourType} onChange={(e) => setBehaviourType(e.target.value)} style={inputStyle} required>
                {behaviourTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle} required>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Trigger</label>
              <textarea
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                rows={2}
                style={{ ...inputStyle, maxWidth: "100%" }}
                placeholder="What led to the behaviour?"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Action taken</label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={3}
                style={{ ...inputStyle, maxWidth: "100%" }}
                placeholder="De-escalation, PRN, observation, etc."
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>STOMP related</span>
              <label style={{ marginRight: 16 }}>
                <input type="radio" name="stomp" checked={stompRelated === false} onChange={() => setStompRelated(false)} /> No
              </label>
              <label>
                <input type="radio" name="stomp" checked={stompRelated === true} onChange={() => setStompRelated(true)} /> Yes
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>Medication refused</span>
              <label style={{ marginRight: 16 }}>
                <input
                  type="radio"
                  name="medRef"
                  checked={medicationRefused === false}
                  onChange={() => setMedicationRefused(false)}
                />{" "}
                No
              </label>
              <label>
                <input type="radio" name="medRef" checked={medicationRefused === true} onChange={() => setMedicationRefused(true)} />{" "}
                Yes
              </label>
            </div>

            {saveError ? (
              <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: 14 }}>{saveError}</div>
            ) : null}

            <button
              type="submit"
              disabled={saving || !user?.uid}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: saving ? "#94a3b8" : "#005eb8",
                color: "#fff",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save behaviour log"}
            </button>
          </form>
        )}
      </section>

      <section aria-label="Behaviour log">
        <h2 style={{ fontSize: "1.1rem", marginBottom: 12 }}>Behaviour log</h2>

        {selectedPatientId && !logsLoading ? (
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px 0", fontSize: 14, color: "#0f172a", fontWeight: 800 }}>
              Safeguarding Risk Level:{" "}
              <span
                style={{
                  textTransform: "uppercase",
                  color:
                    safeguardingAnalysis.safeguardingRisk === "HIGH"
                      ? "#b91c1c"
                      : safeguardingAnalysis.safeguardingRisk === "MEDIUM"
                        ? "#b45309"
                        : "#15803d",
                }}
              >
                {safeguardingAnalysis.safeguardingRisk}
              </span>
            </p>
            <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b" }}>
              Signals: aggression {safeguardingAnalysis.safeguardingSignals.aggressionCount} · high-severity{" "}
              {safeguardingAnalysis.safeguardingSignals.highSeverityCount} · medication refusal{" "}
              {safeguardingAnalysis.safeguardingSignals.medicationRefusalCount} · STOMP {safeguardingAnalysis.safeguardingSignals.stompCount}{" "}
              · incidents {safeguardingAnalysis.safeguardingSignals.incidentCount}
            </p>
            {safeguardingAnalysis.safeguardingAlert ? (
              <BehaviourRiskAlert type={safeguardingAnalysis.safeguardingRisk === "HIGH" ? "error" : "warning"}>
                {safeguardingAnalysis.safeguardingAlert}
              </BehaviourRiskAlert>
            ) : null}

            {validBehaviours.length > 0 || patientIncidents.length > 0 ? (
              <details style={{ marginBottom: 12, fontSize: 13, color: "#334155" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>Safeguarding Summary (report)</summary>
                <pre
                  style={{
                    margin: "10px 0 0 0",
                    padding: 12,
                    background: "#f8fafc",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    fontFamily: "inherit",
                  }}
                >
                  {buildSafeguardingSummary({
                    behaviours: validBehaviours,
                    incidents: patientIncidents,
                    result: safeguardingAnalysis,
                  })}
                </pre>
              </details>
            ) : null}

            {validBehaviours.length > 0 ? (
              <>
                <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#475569" }}>
                  <strong>Signal score:</strong> {behaviourSignals.riskScore} · High-severity events: {behaviourSignals.highSeverity} ·
                  Medium: {behaviourSignals.mediumSeverity} · Medication refusals: {behaviourSignals.medicationRefusal}
                </p>
                {behaviourSignals.patternDetected ? (
                  <BehaviourRiskAlert type="warning">⚠️ Behaviour pattern detected</BehaviourRiskAlert>
                ) : null}
                {behaviourSignals.riskTrend === "increasing" ? (
                  <BehaviourRiskAlert type="info">📈 Risk trending upward</BehaviourRiskAlert>
                ) : null}
                {behaviourSignals.alertTriggered ? (
                  <BehaviourRiskAlert type="error">🚨 High-risk alert triggered</BehaviourRiskAlert>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        {logsError ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 14px", borderRadius: 10, color: "#991b1b", marginBottom: 14 }}>
            {logsError}
          </div>
        ) : null}

        {logsLoading ? (
          <div style={{ color: "#64748b" }}>Loading behaviour logs…</div>
        ) : !selectedPatientId ? (
          <div style={{ color: "#64748b" }}>Select a patient to view logs.</div>
        ) : validBehaviours.length === 0 ? (
          <div style={{ color: "#64748b" }}>No valid structured behaviour entries yet. Use Log Behaviour above.</div>
        ) : (
          validBehaviours.map((entry) => {
            const displayTime = formatBehaviourTime(entry.eventAt ?? entry.createdAt);
            const trig = redactSensitive && entry.trigger ? "[Redacted]" : entry.trigger || "—";
            const act = redactSensitive && entry.action ? "[Redacted]" : entry.action || "—";
            return (
              <div key={entry.id} style={cardStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{displayTime}</span>
                  <span style={{ fontWeight: 700, color: "#1e293b" }}>{entry.behaviourType || "—"}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      padding: "2px 8px",
                      borderRadius: 6,
                      ...severityBadgeStyle(entry.severity),
                    }}
                  >
                    {entry.severity || "—"}
                  </span>
                </div>
                <div style={{ fontSize: 14, color: "#334155", marginBottom: 4 }}>
                  <strong>Trigger:</strong> {trig}
                </div>
                <div style={{ fontSize: 14, color: "#334155", marginBottom: 4 }}>
                  <strong>Action:</strong> {act}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  <strong>STOMP:</strong> {entry.stompRelated ? "Yes" : "No"} · <strong>Medication refused:</strong>{" "}
                  {entry.medicationRefused ? "Yes" : "No"}
                </div>
              </div>
            );
          })
        )}
      </section>

      {!hasFeature("risk") ? (
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 13 }}>
          Risk tagging is not available on this plan.
        </p>
      ) : null}
    </div>
  );
}
