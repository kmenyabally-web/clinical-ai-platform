import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePatients } from "../hooks/usePatients";
import { showToast } from "../utils/toast";
import {
  addPsychologyTracking,
  addPsychiatryStructured,
  addOTStructured,
  addSALTStructured,
  getLatestPsychologyTrackingForPatient,
  getLatestPsychiatryStructuredForPatient,
  getLatestOTStructuredForPatient,
  getLatestSALTStructuredForPatient,
} from "../services/structuredDisciplineServices";

const inputStyle = {
  width: "100%",
  maxWidth: 520,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};
const textareaStyle = { ...inputStyle, minHeight: 80, resize: "vertical", fontFamily: "inherit", maxWidth: "100%" };

const TABS = [
  { id: "psychology", label: "Psychology tracking" },
  { id: "psychiatry", label: "Psychiatry" },
  { id: "ot", label: "Occupational therapy" },
  { id: "salt", label: "SALT" },
];

function linesToArray(s) {
  return String(s ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function MdtStructuredClinical() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [tab, setTab] = useState("psychology");

  const [triggersText, setTriggersText] = useState("");
  const [copingText, setCopingText] = useState("");
  const [therapyEngagement, setTherapyEngagement] = useState("good");
  const [behaviourPatterns, setBehaviourPatterns] = useState("");
  const [psyRiskForm, setPsyRiskForm] = useState("");
  const [psySaving, setPsySaving] = useState(false);

  const [diagnosis, setDiagnosis] = useState("");
  const [medicationRows, setMedicationRows] = useState([{ name: "", dose: "", changes: "" }]);
  const [sideEffects, setSideEffects] = useState("");
  const [mseMood, setMseMood] = useState("");
  const [mseThought, setMseThought] = useState("");
  const [msePerc, setMsePerc] = useState("");
  const [mseInsight, setMseInsight] = useState("");
  const [psychRisk, setPsychRisk] = useState("low");
  const [capacity, setCapacity] = useState("");
  const [psychSaving, setPsychSaving] = useState(false);

  const [adlScore, setAdlScore] = useState(0);
  const [independenceLevel, setIndependenceLevel] = useState("medium");
  const [activityPart, setActivityPart] = useState("");
  const [routineStruct, setRoutineStruct] = useState("");
  const [cognitiveFn, setCognitiveFn] = useState("");
  const [dischargeReadiness, setDischargeReadiness] = useState("");
  const [otSaving, setOtSaving] = useState(false);

  const [commLevel, setCommLevel] = useState("verbal");
  const [understandingLevel, setUnderstandingLevel] = useState("good");
  const [aidsUsed, setAidsUsed] = useState("");
  const [swallowRisk, setSwallowRisk] = useState("low");
  const [dietLevel, setDietLevel] = useState("");
  const [mealtimeSupport, setMealtimeSupport] = useState("");
  const [saltSaving, setSaltSaving] = useState(false);

  useEffect(() => {
    if (!selectedPatientId && patients.length) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId) return;
    let cancelled = false;
    async function loadLatest() {
      const [p, psy, otR, s] = await Promise.all([
        getLatestPsychologyTrackingForPatient(selectedPatientId).catch(() => null),
        getLatestPsychiatryStructuredForPatient(selectedPatientId).catch(() => null),
        getLatestOTStructuredForPatient(selectedPatientId).catch(() => null),
        getLatestSALTStructuredForPatient(selectedPatientId).catch(() => null),
      ]);
      if (cancelled) return;
      if (p) {
        setTriggersText((p.triggers || []).join("\n"));
        setCopingText((p.copingStrategies || []).join("\n"));
        setTherapyEngagement(p.therapyEngagement || "good");
        setBehaviourPatterns(p.behaviourPatterns || "");
        setPsyRiskForm(p.riskFormulation || "");
      } else {
        setTriggersText("");
        setCopingText("");
        setTherapyEngagement("good");
        setBehaviourPatterns("");
        setPsyRiskForm("");
      }
      if (psy) {
        setDiagnosis(psy.diagnosis || "");
        setMedicationRows(
          psy.medication?.length ? psy.medication.map((m) => ({ ...m })) : [{ name: "", dose: "", changes: "" }]
        );
        setSideEffects(psy.sideEffects || "");
        setMseMood(psy.mse?.mood || "");
        setMseThought(psy.mse?.thought || "");
        setMsePerc(psy.mse?.perception || "");
        setMseInsight(psy.mse?.insight || "");
        setPsychRisk(psy.riskLevel || "low");
        setCapacity(psy.capacity || "");
      } else {
        setDiagnosis("");
        setMedicationRows([{ name: "", dose: "", changes: "" }]);
        setSideEffects("");
        setMseMood("");
        setMseThought("");
        setMsePerc("");
        setMseInsight("");
        setPsychRisk("low");
        setCapacity("");
      }
      if (otR) {
        setAdlScore(otR.adlScore ?? 0);
        setIndependenceLevel(otR.independenceLevel || "medium");
        setActivityPart(otR.activityParticipation || "");
        setRoutineStruct(otR.routineStructure || "");
        setCognitiveFn(otR.cognitiveFunction || "");
        setDischargeReadiness(otR.dischargeReadiness || "");
      } else {
        setAdlScore(0);
        setIndependenceLevel("medium");
        setActivityPart("");
        setRoutineStruct("");
        setCognitiveFn("");
        setDischargeReadiness("");
      }
      if (s) {
        setCommLevel(s.communicationLevel || "verbal");
        setUnderstandingLevel(s.understandingLevel || "good");
        setAidsUsed(s.aidsUsed || "");
        setSwallowRisk(s.swallowRisk || "low");
        setDietLevel(s.dietLevel || "");
        setMealtimeSupport(s.mealtimeSupport || "");
      } else {
        setCommLevel("verbal");
        setUnderstandingLevel("good");
        setAidsUsed("");
        setSwallowRisk("low");
        setDietLevel("");
        setMealtimeSupport("");
      }
    }
    void loadLatest();
    return () => {
      cancelled = true;
    };
  }, [selectedPatientId]);

  function guardSave() {
    if (!permissions?.canAccessBehaviour) {
      showToast("Your role does not have access.");
      return false;
    }
    if (!organisationId || !selectedPatientId || !user?.uid) {
      showToast("Missing organisation, patient, or sign-in.");
      return false;
    }
    return true;
  }

  async function savePsychology(e) {
    e.preventDefault();
    if (!guardSave()) return;
    setPsySaving(true);
    try {
      await addPsychologyTracking({
        patientId: selectedPatientId,
        organisationId,
        triggers: linesToArray(triggersText),
        copingStrategies: linesToArray(copingText),
        therapyEngagement,
        behaviourPatterns,
        riskFormulation: psyRiskForm,
      });
      showToast("Psychology tracking saved.");
    } catch (err) {
      showToast(err?.message ?? "Save failed.");
    } finally {
      setPsySaving(false);
    }
  }

  async function savePsychiatry(e) {
    e.preventDefault();
    if (!guardSave()) return;
    setPsychSaving(true);
    try {
      await addPsychiatryStructured({
        patientId: selectedPatientId,
        organisationId,
        diagnosis,
        medication: medicationRows.filter((r) => r.name.trim() || r.dose.trim() || r.changes.trim()),
        sideEffects,
        mse: { mood: mseMood, thought: mseThought, perception: msePerc, insight: mseInsight },
        riskLevel: psychRisk,
        capacity,
      });
      showToast("Psychiatry structured record saved.");
    } catch (err) {
      showToast(err?.message ?? "Save failed.");
    } finally {
      setPsychSaving(false);
    }
  }

  async function saveOT(e) {
    e.preventDefault();
    if (!guardSave()) return;
    setOtSaving(true);
    try {
      await addOTStructured({
        patientId: selectedPatientId,
        organisationId,
        adlScore: Number(adlScore) || 0,
        independenceLevel,
        activityParticipation: activityPart,
        routineStructure: routineStruct,
        cognitiveFunction: cognitiveFn,
        dischargeReadiness,
      });
      showToast("OT structured record saved.");
    } catch (err) {
      showToast(err?.message ?? "Save failed.");
    } finally {
      setOtSaving(false);
    }
  }

  async function saveSALT(e) {
    e.preventDefault();
    if (!guardSave()) return;
    setSaltSaving(true);
    try {
      await addSALTStructured({
        patientId: selectedPatientId,
        organisationId,
        communicationLevel: commLevel,
        understandingLevel,
        aidsUsed,
        swallowRisk,
        dietLevel,
        mealtimeSupport,
      });
      showToast("SALT structured record saved.");
    } catch (err) {
      showToast(err?.message ?? "Save failed.");
    } finally {
      setSaltSaving(false);
    }
  }

  return (
    <div style={{ padding: "2rem", width: "100%", fontFamily: "sans-serif", maxWidth: 960 }}>
      <h1 style={{ marginTop: 0 }}>MDT structured clinical data (V2)</h1>
      <p style={{ color: "#64748b", marginTop: 0, maxWidth: 720 }}>
        Structured entries feed CPA, MDT summaries, aggregate risk, and early-warning alerts. Latest record per patient
        per discipline is loaded when you select a patient. Use with{" "}
        <Link to="/psychology-formulation" style={{ color: "#005eb8", fontWeight: 700 }}>
          Psychology formulation
        </Link>{" "}
        and{" "}
        <Link to="/nursing-observations" style={{ color: "#005eb8", fontWeight: 700 }}>
          Nursing observations
        </Link>
        .
      </p>

      {!permissions?.canAccessBehaviour ? (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "12px 14px",
            borderRadius: 10,
            color: "#991b1b",
            marginBottom: 14,
          }}
        >
          Your role does not have access to this module.
        </div>
      ) : null}

      {patientsError ? (
        <div style={{ color: "#991b1b", marginBottom: 12 }}>{patientsError}</div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ fontWeight: 800 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || patients.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {patientsLoading ? (
              <option value="">Loading…</option>
            ) : patients.length ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}
                </option>
              ))
            ) : (
              <option value="">No patients</option>
            )}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: tab === t.id ? "2px solid #1976d2" : "1px solid #cbd5e1",
              background: tab === t.id ? "#e3f2fd" : "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!selectedPatientId ? (
        <p style={{ color: "#64748b" }}>Select a patient.</p>
      ) : tab === "psychology" ? (
        <form onSubmit={savePsychology} style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 14, color: "#64748b" }}>One trigger or coping strategy per line.</p>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Triggers
            <textarea
              value={triggersText}
              onChange={(e) => setTriggersText(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={4}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Coping strategies
            <textarea
              value={copingText}
              onChange={(e) => setCopingText(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={4}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Therapy engagement
            <select
              value={therapyEngagement}
              onChange={(e) => setTherapyEngagement(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="good">good</option>
              <option value="partial">partial</option>
              <option value="poor">poor</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Behaviour patterns
            <textarea
              value={behaviourPatterns}
              onChange={(e) => setBehaviourPatterns(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={3}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Risk formulation
            <textarea
              value={psyRiskForm}
              onChange={(e) => setPsyRiskForm(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={3}
            />
          </label>
          <button
            type="submit"
            disabled={psySaving || !permissions?.canAccessBehaviour}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontWeight: 800,
              cursor: psySaving ? "wait" : "pointer",
            }}
          >
            {psySaving ? "Saving…" : "Save psychology tracking"}
          </button>
        </form>
      ) : tab === "psychiatry" ? (
        <form onSubmit={savePsychiatry} style={{ maxWidth: 640 }}>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Diagnosis
            <input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            />
          </label>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Medication</div>
            {medicationRows.map((row, idx) => (
              <div key={idx} style={{ display: "grid", gap: 8, marginBottom: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
                <input
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => {
                    const next = [...medicationRows];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setMedicationRows(next);
                  }}
                  style={inputStyle}
                />
                <input
                  placeholder="Dose"
                  value={row.dose}
                  onChange={(e) => {
                    const next = [...medicationRows];
                    next[idx] = { ...next[idx], dose: e.target.value };
                    setMedicationRows(next);
                  }}
                  style={inputStyle}
                />
                <input
                  placeholder="Changes"
                  value={row.changes}
                  onChange={(e) => {
                    const next = [...medicationRows];
                    next[idx] = { ...next[idx], changes: e.target.value };
                    setMedicationRows(next);
                  }}
                  style={inputStyle}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMedicationRows([...medicationRows, { name: "", dose: "", changes: "" }])}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc" }}
            >
              Add medication row
            </button>
          </div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Side effects
            <textarea
              value={sideEffects}
              onChange={(e) => setSideEffects(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>MSE</div>
          <div style={{ display: "grid", gap: 10, marginBottom: 12 }}>
            <input placeholder="Mood" value={mseMood} onChange={(e) => setMseMood(e.target.value)} style={inputStyle} />
            <input
              placeholder="Thought"
              value={mseThought}
              onChange={(e) => setMseThought(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Perception"
              value={msePerc}
              onChange={(e) => setMsePerc(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Insight"
              value={mseInsight}
              onChange={(e) => setMseInsight(e.target.value)}
              style={inputStyle}
            />
          </div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Risk level
            <select
              value={psychRisk}
              onChange={(e) => setPsychRisk(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Capacity
            <textarea
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <button
            type="submit"
            disabled={psychSaving || !permissions?.canAccessBehaviour}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontWeight: 800,
              cursor: psychSaving ? "wait" : "pointer",
            }}
          >
            {psychSaving ? "Saving…" : "Save psychiatry record"}
          </button>
        </form>
      ) : tab === "ot" ? (
        <form onSubmit={saveOT} style={{ maxWidth: 560 }}>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            ADL score (numeric)
            <input
              type="number"
              value={adlScore}
              onChange={(e) => setAdlScore(Number(e.target.value))}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Independence level
            <select
              value={independenceLevel}
              onChange={(e) => setIndependenceLevel(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Activity participation
            <textarea
              value={activityPart}
              onChange={(e) => setActivityPart(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Routine / structure
            <textarea
              value={routineStruct}
              onChange={(e) => setRoutineStruct(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Cognitive function
            <textarea
              value={cognitiveFn}
              onChange={(e) => setCognitiveFn(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Discharge readiness
            <textarea
              value={dischargeReadiness}
              onChange={(e) => setDischargeReadiness(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <button
            type="submit"
            disabled={otSaving || !permissions?.canAccessBehaviour}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontWeight: 800,
              cursor: otSaving ? "wait" : "pointer",
            }}
          >
            {otSaving ? "Saving…" : "Save OT record"}
          </button>
        </form>
      ) : (
        <form onSubmit={saveSALT} style={{ maxWidth: 560 }}>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Communication level
            <select
              value={commLevel}
              onChange={(e) => setCommLevel(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="verbal">verbal</option>
              <option value="non-verbal">non-verbal</option>
              <option value="limited">limited</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Understanding level
            <select
              value={understandingLevel}
              onChange={(e) => setUnderstandingLevel(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="good">good</option>
              <option value="partial">partial</option>
              <option value="poor">poor</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Aids used
            <input
              value={aidsUsed}
              onChange={(e) => setAidsUsed(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Swallow risk
            <select
              value={swallowRisk}
              onChange={(e) => setSwallowRisk(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Diet / texture level
            <input
              value={dietLevel}
              onChange={(e) => setDietLevel(e.target.value)}
              style={{ ...inputStyle, display: "block", marginTop: 6 }}
            />
          </label>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 12 }}>
            Mealtime support
            <textarea
              value={mealtimeSupport}
              onChange={(e) => setMealtimeSupport(e.target.value)}
              style={{ ...textareaStyle, display: "block", marginTop: 6 }}
              rows={2}
            />
          </label>
          <button
            type="submit"
            disabled={saltSaving || !permissions?.canAccessBehaviour}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#1976d2",
              color: "#fff",
              fontWeight: 800,
              cursor: saltSaving ? "wait" : "pointer",
            }}
          >
            {saltSaving ? "Saving…" : "Save SALT record"}
          </button>
        </form>
      )}
    </div>
  );
}
