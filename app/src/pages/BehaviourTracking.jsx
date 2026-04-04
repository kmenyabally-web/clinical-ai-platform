import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BEHAVIOUR_TYPES } from "../constants/behaviours";
import {
  createBehaviourLog,
  fetchStructuredBehaviourLogsForPatient,
  isValidStructuredBehaviourLog,
} from "../services/behaviourService";
import { addABCEntry, getABCLogsForPatient } from "../services/abcService";
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
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

function severityBadgeStyle(severity) {
  const s = String(severity ?? "").toLowerCase();
  if (s === "high") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (s === "medium") return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  return { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" };
}

/** Clinical behaviour type badge — key types use fixed colours for quick scanning. */
function behaviourTypeBadgeStyle(type) {
  const t = String(type ?? "").toLowerCase();
  if (t === "verbal aggression") return { background: "#ffedd5", color: "#c2410c", border: "1px solid #fdba74" };
  if (t === "physical aggression") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" };
  if (t === "agitation") return { background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" };
  return { background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0" };
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

const textareaStyle = {
  ...inputStyle,
  maxWidth: "100%",
  minHeight: 88,
  resize: "vertical",
  fontFamily: "inherit",
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Clinical instant for display: ISO `clinicalTime` first, then record / legacy fields. */
function formatBehaviourLogTimestamp(entry) {
  const raw = entry?.clinicalTime ?? entry?.createdAt ?? entry?.eventAt;
  if (raw == null) return "—";
  let d;
  if (typeof raw === "string") {
    d = new Date(raw);
  } else if (typeof raw?.toDate === "function") {
    try {
      d = raw.toDate();
    } catch {
      return "—";
    }
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BehaviourTracking() {
  const { organisationId, hospitalId, wardId, hasFeature } = useOrganisation();
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
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [behaviourType, setBehaviourType] = useState(BEHAVIOUR_TYPES[0]);
  const [behaviourCustom, setBehaviourCustom] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [trigger, setTrigger] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [stompRelated, setStompRelated] = useState(false);
  const [medicationRefused, setMedicationRefused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [abcAntecedent, setAbcAntecedent] = useState("");
  const [abcBehaviourNarrative, setAbcBehaviourNarrative] = useState("");
  const [abcConsequence, setAbcConsequence] = useState("");
  const [abcSeverity, setAbcSeverity] = useState("medium");
  const [abcSaving, setAbcSaving] = useState(false);
  const [abcError, setAbcError] = useState(null);
  const [abcEntries, setAbcEntries] = useState([]);

  useEffect(() => {
    if (!selectedPatientId && patients.length) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (timeMode !== "manual") return;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    setManualDate((d) => (d && d.trim() ? d : today));
    setManualTime((t) => (t && t.trim() ? t : timeStr));
  }, [timeMode]);

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
        const [rows, inc, abc] = await Promise.all([
          fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 100 }),
          fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }),
          getABCLogsForPatient(selectedPatientId, { limitCount: 50 }),
        ]);
        if (!mounted) return;
        setBehaviourLogs(Array.isArray(rows) ? rows : []);
        setPatientIncidents(Array.isArray(inc) ? inc : []);
        setAbcEntries(Array.isArray(abc) ? abc : []);
      } catch (e) {
        if (!mounted) return;
        setLogsError(e?.message ?? "Failed to load behaviour or incident data.");
        setBehaviourLogs([]);
        setPatientIncidents([]);
        setAbcEntries([]);
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
    const custom = (behaviourCustom ?? "").toString().trim();
    const sev = (severity ?? "").toString().trim();
    const tr = (trigger ?? "").toString().trim();
    const act = (actionTaken ?? "").toString().trim();
    if (!bt || !sev) {
      const msg = "Behaviour type and severity are required.";
      setSaveError(msg);
      showToast(msg);
      return;
    }
    if (bt === "Other" && !custom) {
      const msg = "Specify the behaviour when type is Other.";
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

    let clinicalTime;
    if (timeMode === "auto") {
      clinicalTime = new Date();
    } else {
      if (!manualDate || !manualTime) {
        const msg = "Please enter date and time";
        setSaveError(msg);
        alert(msg);
        return;
      }
      clinicalTime = new Date(`${manualDate}T${manualTime}`);
      if (Number.isNaN(clinicalTime.getTime())) {
        const msg = "Please enter date and time";
        setSaveError(msg);
        alert(msg);
        return;
      }
    }

    // eslint-disable-next-line no-console -- clinical timestamp debug (behaviour logging)
    console.log("Saving behaviour with time:", clinicalTime);

    const clinicalTimeIso = clinicalTime.toISOString();

    setSaving(true);
    try {
      await createBehaviourLog({
        patientId: selectedPatientId,
        organisationId,
        clinicalTimeIso,
        hospitalId: hospitalId ?? null,
        wardId: wardId ?? null,
        behaviourType: bt,
        behaviourCustom: bt === "Other" ? custom : null,
        severity: sev,
        trigger: trigger.trim(),
        action: actionTaken.trim(),
        stompRelated,
        medicationRefused,
      });
      setTrigger("");
      setActionTaken("");
      setBehaviourCustom("");
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

  async function handleSubmitABC(e) {
    e.preventDefault();
    setAbcError(null);
    if (!permissions?.canAccessBehaviour) {
      const msg = "Your role does not have access to behaviour tracking.";
      setAbcError(msg);
      showToast(msg);
      return;
    }
    if (!organisationId || !selectedPatientId || !user?.uid) {
      setAbcError("Missing organisation, patient, or sign-in.");
      return;
    }
    const ant = (abcAntecedent ?? "").toString().trim();
    const beh = (abcBehaviourNarrative ?? "").toString().trim();
    const cons = (abcConsequence ?? "").toString().trim();
    if (!ant || !beh || !cons) {
      const msg = "Antecedent, behaviour, and consequence are required.";
      setAbcError(msg);
      showToast(msg);
      return;
    }
    const staff =
      (user?.displayName ?? "").toString().trim() ||
      (user?.email ?? "").toString().trim() ||
      user.uid;
    const sevRaw = (abcSeverity ?? "medium").toString().trim().toLowerCase();
    const severity = sevRaw === "high" || sevRaw === "low" ? sevRaw : "medium";

    setAbcSaving(true);
    try {
      await addABCEntry({
        patientId: selectedPatientId,
        organisationId,
        antecedent: ant,
        behaviour: beh,
        consequence: cons,
        severity,
        staff,
      });
      setAbcAntecedent("");
      setAbcBehaviourNarrative("");
      setAbcConsequence("");
      setAbcSeverity("medium");
      showToast("ABC entry saved.");
      const [rows, inc, abc] = await Promise.all([
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 100 }),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 50 }),
        getABCLogsForPatient(selectedPatientId, { limitCount: 50 }),
      ]);
      setBehaviourLogs(Array.isArray(rows) ? rows : []);
      setPatientIncidents(Array.isArray(inc) ? inc : []);
      setAbcEntries(Array.isArray(abc) ? abc : []);
    } catch (err) {
      const msg = err?.message ?? "Could not save ABC entry.";
      setAbcError(msg);
      showToast(msg);
    } finally {
      setAbcSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        width: "100%",
        fontFamily: "sans-serif",
        maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
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

      {selectedPatientId ? (
        <section
          style={{
            marginBottom: 24,
            padding: "1.25rem",
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>ABC Behaviour Log</h2>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#64748b", maxWidth: 640 }}>
            Antecedent–behaviour–consequence entries are stored as structured data and used as the primary source in CPA
            behavioural and risk sections.
          </p>
          {!permissions?.canAccessBehaviour ? (
            <p style={{ color: "#991b1b", fontWeight: 600 }}>Your role cannot save ABC entries.</p>
          ) : (
            <form onSubmit={handleSubmitABC}>
              <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
                <label style={{ fontWeight: 700 }}>
                  Antecedent
                  <textarea
                    value={abcAntecedent}
                    onChange={(e) => setAbcAntecedent(e.target.value)}
                    style={{ ...textareaStyle, display: "block", marginTop: 6 }}
                    rows={3}
                    required
                  />
                </label>
                <label style={{ fontWeight: 700 }}>
                  Behaviour
                  <textarea
                    value={abcBehaviourNarrative}
                    onChange={(e) => setAbcBehaviourNarrative(e.target.value)}
                    style={{ ...textareaStyle, display: "block", marginTop: 6 }}
                    rows={3}
                    required
                  />
                </label>
                <label style={{ fontWeight: 700 }}>
                  Consequence
                  <textarea
                    value={abcConsequence}
                    onChange={(e) => setAbcConsequence(e.target.value)}
                    style={{ ...textareaStyle, display: "block", marginTop: 6 }}
                    rows={3}
                    required
                  />
                </label>
                <label style={{ fontWeight: 700 }}>
                  Severity
                  <select
                    value={abcSeverity}
                    onChange={(e) => setAbcSeverity(e.target.value)}
                    style={{ ...inputStyle, display: "block", marginTop: 6 }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
              {abcError ? (
                <p role="alert" style={{ color: "#991b1b", fontWeight: 600, marginTop: 12 }}>
                  {abcError}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={abcSaving}
                style={{
                  marginTop: 14,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: abcSaving ? "wait" : "pointer",
                }}
              >
                {abcSaving ? "Saving…" : "Save ABC Entry"}
              </button>
            </form>
          )}

          <h3 style={{ fontSize: "1rem", margin: "20px 0 10px" }}>Recent ABC logs</h3>
          {logsLoading ? (
            <p style={{ color: "#64748b" }}>Loading…</p>
          ) : abcEntries.length === 0 ? (
            <p style={{ color: "#64748b" }}>No ABC entries yet for this patient.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {abcEntries.map((a) => (
                <li
                  key={a.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={severityBadgeStyle(a.severity)}>
                      {(a.severity ?? "").toString().toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{formatBehaviourLogTimestamp(a)}</span>
                    {a.staff ? (
                      <span style={{ fontSize: 12, color: "#475569" }}>Staff: {a.staff}</span>
                    ) : null}
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 14 }}>
                    <strong>A:</strong> {a.antecedent}
                  </p>
                  <p style={{ margin: "0 0 6px", fontSize: 14 }}>
                    <strong>B:</strong> {a.behaviour}
                  </p>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    <strong>C:</strong> {a.consequence}
                  </p>
                </li>
              ))}
            </ul>
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
          <p style={{ color: "#64748b" }}>Select a patient above to record behaviour.</p>
        ) : (
          <form onSubmit={handleSubmitBehaviour}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>Time mode</span>
              <label style={{ marginRight: 16 }}>
                <input
                  type="radio"
                  name="timeMode"
                  value="auto"
                  checked={timeMode === "auto"}
                  onChange={() => setTimeMode("auto")}
                />{" "}
                Auto (now)
              </label>
              <label>
                <input
                  type="radio"
                  name="timeMode"
                  value="manual"
                  checked={timeMode === "manual"}
                  onChange={() => setTimeMode("manual")}
                />{" "}
                Manual
              </label>
              {timeMode === "manual" && (
                <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    style={{ ...inputStyle, minWidth: 160, maxWidth: 220 }}
                    aria-label="Behaviour date"
                  />
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    style={{ ...inputStyle, minWidth: 120, maxWidth: 180 }}
                    aria-label="Behaviour time"
                  />
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Behaviour type</label>
              <select
                value={behaviourType}
                onChange={(e) => {
                  const v = e.target.value;
                  setBehaviourType(v);
                  if (v !== "Other") setBehaviourCustom("");
                }}
                style={inputStyle}
                required
              >
                {BEHAVIOUR_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {behaviourType === "Other" ? (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>Specify behaviour</label>
                  <input
                    type="text"
                    value={behaviourCustom}
                    onChange={(e) => setBehaviourCustom(e.target.value)}
                    style={inputStyle}
                    placeholder="Short structured label (required)"
                    autoComplete="off"
                  />
                </div>
              ) : null}
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
              {saving ? "Saving…" : "Record Behaviour"}
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
          <div style={{ color: "#64748b" }}>
            No valid structured behaviour entries yet. Click Record Behaviour above to log the first entry.
          </div>
        ) : (
          validBehaviours.map((entry) => {
            const displayTime = formatBehaviourLogTimestamp(entry);
            const trig = redactSensitive && entry.trigger ? "[Redacted]" : entry.trigger || "—";
            const act = redactSensitive && entry.action ? "[Redacted]" : entry.action || "—";
            return (
              <div key={entry.id} style={cardStyle}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, color: "#0f172a" }}>{displayTime}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: 6,
                      ...behaviourTypeBadgeStyle(entry.behaviourType),
                    }}
                  >
                    {entry.behaviourType || "—"}
                    {entry.behaviourType === "Other" && entry.behaviourCustom
                      ? `: ${redactSensitive ? "[Redacted]" : entry.behaviourCustom}`
                      : ""}
                  </span>
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
