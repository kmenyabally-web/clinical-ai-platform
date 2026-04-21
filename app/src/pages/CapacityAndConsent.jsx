import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePatients } from "../hooks/usePatients";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import {
  createCapacityAssessment,
  computeLacksCapacity,
  buildCapacityOutcomeSummary,
  getCapacityAssessmentWarning,
  getMcaRiskFlags,
  getCapacityReassessmentRecommendation,
  getCapacityReassessmentDueState,
  getDolsTriggerState,
  MCA_DECISION_TYPES,
  MCA_DECISION_TYPE_LABELS,
  getCapacityAssessmentById,
} from "../services/capacityAssessmentService";
import { logAuditEventNonBlocking, logEnterpriseAudit } from "../services/auditService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { fetchIncidentsForPatient } from "../services/incidentService";

const MDT_OPTIONS = ["Nursing", "Psychiatry", "Psychology", "OT", "SALT", "Social Work"];
const ABILITY_KEYS = ["understand", "retain", "weigh", "communicate"];
const DEFAULT_DECISION_QUESTIONS = {
  understand: "Can the patient explain, in their own words, what decision is being made?",
  retain: "Can the patient retain the key information long enough to make this decision?",
  weigh: "Can the patient weigh the benefits, risks, and alternatives before deciding?",
  communicate: "Can the patient communicate a clear and consistent choice?",
};
const MCA_DECISION_SPECIFIC_QUESTIONS = {
  medication: {
    understand: "Can the patient describe what the medication is for and how it should be taken?",
    retain: "Can the patient remember the dosing and key safety advice long enough to decide?",
    weigh: "Can the patient balance treatment benefits against side effects and refusal risks?",
    communicate: "Can the patient clearly communicate consent or refusal for this medication plan?",
  },
  finances: {
    understand: "Can the patient explain the financial decision (e.g. bill payment, spending, contracts)?",
    retain: "Can the patient retain the key financial information and amounts during discussion?",
    weigh: "Can the patient weigh consequences, risks of loss/exploitation, and available options?",
    communicate: "Can the patient clearly communicate a stable financial choice?",
  },
  residence: {
    understand: "Can the patient explain the proposed residence/care setting options?",
    retain: "Can the patient retain key details of placement options long enough to decide?",
    weigh: "Can the patient weigh safety, support needs, and personal preferences for residence?",
    communicate: "Can the patient communicate a clear choice about where they live?",
  },
  care: {
    understand: "Can the patient explain the care package or support being proposed?",
    retain: "Can the patient retain key care information long enough to decide?",
    weigh: "Can the patient weigh benefits and burdens of accepting or declining care support?",
    communicate: "Can the patient communicate a clear decision about care arrangements?",
  },
  treatment: {
    understand: "Can the patient explain the proposed treatment and expected outcomes?",
    retain: "Can the patient retain treatment information long enough to make a decision?",
    weigh: "Can the patient weigh treatment benefits, risks, and alternatives?",
    communicate: "Can the patient clearly communicate consent or refusal for treatment?",
  },
  contact: {
    understand: "Can the patient explain the decision about contact with family/others?",
    retain: "Can the patient retain key contact-related information and boundaries?",
    weigh: "Can the patient weigh emotional, relational, and safeguarding implications of contact?",
    communicate: "Can the patient communicate a clear and consistent contact preference?",
  },
  safeguarding: {
    understand: "Can the patient explain the safeguarding concern and proposed protective actions?",
    retain: "Can the patient retain key safety information long enough to decide?",
    weigh: "Can the patient weigh immediate safety risks versus personal wishes?",
    communicate: "Can the patient clearly communicate agreement or disagreement with safeguarding actions?",
  },
};

function emptyReasoning() {
  return {
    questionAsked: "",
    patientResponse: "",
    clinicianInterpretation: "",
  };
}

function validateDecisionSpecificAssessment(form, lacksCapacity) {
  const decisionType = String(form?.decisionType ?? "").trim();
  if (!decisionType) return "Decision type is required.";
  if (!String(form?.decisionDescription ?? "").trim()) return "Decision description is required.";

  // Core MCA documentation quality checks across all decision types.
  for (const key of ABILITY_KEYS) {
    const reasoning = form?.[`${key}Reasoning`] ?? {};
    if (!String(reasoning.questionAsked ?? "").trim()) return `Document question asked for ${key}.`;
    if (!String(reasoning.patientResponse ?? "").trim()) return `Document patient response for ${key}.`;
    if (!String(reasoning.clinicianInterpretation ?? "").trim()) return `Document clinician interpretation for ${key}.`;
  }

  // Decision-specific safeguards.
  if (decisionType === "medication") {
    if (!String(form?.decisionDescription ?? "").toLowerCase().includes("med")) {
      return "Medication assessments should include medication-specific details in decision description.";
    }
    if (lacksCapacity) {
      const hasMdtInput = Array.isArray(form?.mdtInvolved) && form.mdtInvolved.length > 0;
      if (!hasMdtInput) {
        return "Medication decisions lacking capacity require MDT involvement to be flagged.";
      }
    }
  }
  if (decisionType === "finances") {
    const hasSocialWorkInput = Array.isArray(form?.mdtInvolved) && form.mdtInvolved.includes("Social Work");
    if (!hasSocialWorkInput && form?.familyConsulted !== true) {
      return "Finance assessments require either Social Work MDT input or family consultation.";
    }
  }
  if (decisionType === "safeguarding") {
    if (String(form?.urgencyLevel ?? "").toLowerCase() === "low") {
      return "Safeguarding assessments cannot be saved with low urgency.";
    }
  }

  if (lacksCapacity) {
    if (!String(form?.bestInterestsNotes ?? "").trim()) return "Best interests notes are required when capacity is lacking.";
    if (!String(form?.justification ?? "").trim()) return "Justification is required when capacity is lacking.";
  }
  return null;
}

export default function CapacityAndConsent() {
  const [searchParams] = useSearchParams();
  const { data: patients = [] } = usePatients();
  const { organisationId, hospitalId, wardId } = useOrganisation();
  const { role, mdtRole } = useRole();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [contextLoading, setContextLoading] = useState(false);
  const [contextData, setContextData] = useState({ notes: [], behaviourLogs: [], mdtEntries: [] });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [reassessmentDue, setReassessmentDue] = useState({ due: false, reasons: [] });
  const [dolsTriggerState, setDolsTriggerState] = useState({ triggered: false, reasons: [] });
  const [form, setForm] = useState({
    patientId: "",
    decisionType: "",
    decisionDescription: "",
    urgencyLevel: "medium",
    assessmentDate: new Date().toISOString().slice(0, 10),
    nextReviewDate: "",
    assessorRole: mdtRole || role || "Clinician",
    stage1Impairment: false,
    stage1Details: "",
    understand: true,
    understandReasoning: emptyReasoning(),
    retain: true,
    retainReasoning: emptyReasoning(),
    weigh: true,
    weighReasoning: emptyReasoning(),
    communicate: true,
    communicateReasoning: emptyReasoning(),
    bestInterestsNotes: "",
    optionsConsidered: "",
    chosenOption: "",
    justification: "",
    leastRestrictiveOption: false,
    mdtInvolved: [],
    familyConsulted: false,
  });

  const lacksCapacity = useMemo(() => computeLacksCapacity(form), [form]);
  const outcomeSummary = useMemo(() => buildCapacityOutcomeSummary(form), [form]);
  const assessmentWarning = useMemo(() => getCapacityAssessmentWarning(form), [form]);
  const riskFlags = useMemo(() => getMcaRiskFlags(form), [form]);
  const reassessmentRecommendation = useMemo(
    () => getCapacityReassessmentRecommendation({ behaviours: contextData.behaviourLogs, incidents: recentIncidents }),
    [contextData.behaviourLogs, recentIncidents]
  );

  const canNext =
    (step === 1 && !!form.patientId) ||
    (step === 2 && !!form.decisionType.trim() && !!form.decisionDescription.trim()) ||
    step === 3 ||
    step === 4;

  const selectedPatient = patients.find((p) => String(p?.id ?? "") === String(form.patientId));
  const decisionSpecificQuestions =
    MCA_DECISION_SPECIFIC_QUESTIONS[form.decisionType] ?? DEFAULT_DECISION_QUESTIONS;
  const queryPatientId = String(searchParams.get("patient") ?? "").trim();
  const queryAssessmentId = String(searchParams.get("assessment") ?? "").trim();

  useEffect(() => {
    if (queryPatientId) {
      setForm((prev) => (prev.patientId === queryPatientId ? prev : { ...prev, patientId: queryPatientId }));
    }
  }, [queryPatientId]);

  useEffect(() => {
    if (!form.decisionType) return;
    setForm((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const ability of ABILITY_KEYS) {
        const reasoningKey = `${ability}Reasoning`;
        const current = next[reasoningKey] ?? emptyReasoning();
        if (!String(current.questionAsked ?? "").trim()) {
          changed = true;
          next[reasoningKey] = {
            ...current,
            questionAsked: decisionSpecificQuestions[ability] ?? DEFAULT_DECISION_QUESTIONS[ability],
          };
        }
      }
      return changed ? next : prev;
    });
  }, [form.decisionType, decisionSpecificQuestions]);

  useEffect(() => {
    let cancelled = false;
    async function loadRelevantContext() {
      if (!form.patientId) {
        setContextData({ notes: [], behaviourLogs: [], mdtEntries: [] });
        return;
      }
      setContextLoading(true);
      try {
        const [notesRaw, behaviourRaw, incidentsRaw] = await Promise.all([
          fetchClinicalNotesForPatient(form.patientId, { limitCount: 8 }).catch(() => []),
          fetchStructuredBehaviourLogsForPatient(form.patientId, { limitCount: 8 }).catch(() => []),
          fetchIncidentsForPatient(form.patientId, { limitCount: 8 }).catch(() => []),
        ]);
        if (cancelled) return;
        const notes = Array.isArray(notesRaw) ? notesRaw : [];
        const behaviourLogs = Array.isArray(behaviourRaw) ? behaviourRaw : [];
        const incidents = Array.isArray(incidentsRaw) ? incidentsRaw : [];
        const mdtEntries = notes
          .filter((n) => n?.mdtReview || n?.reports?.mdtReview || String(n?.discipline ?? "").toLowerCase().includes("mdt"))
          .slice(0, 6);
        setContextData({
          notes: notes.slice(0, 6),
          behaviourLogs: behaviourLogs.slice(0, 6),
          mdtEntries,
        });
        setRecentIncidents(incidents.slice(0, 8));
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    }
    void loadRelevantContext();
    return () => {
      cancelled = true;
    };
  }, [form.patientId]);

  useEffect(() => {
    let cancelled = false;
    async function loadReassessmentDue() {
      if (!organisationId || !form.patientId) {
        setReassessmentDue({ due: false, reasons: [] });
        return;
      }
      const signal = await getCapacityReassessmentDueState(organisationId, form.patientId).catch(() => ({
        due: false,
        reasons: [],
      }));
      if (!cancelled) setReassessmentDue(signal);
    }
    void loadReassessmentDue();
    return () => {
      cancelled = true;
    };
  }, [organisationId, form.patientId]);

  useEffect(() => {
    let cancelled = false;
    async function loadDolsTrigger() {
      if (!organisationId || !form.patientId) {
        setDolsTriggerState({ triggered: false, reasons: [] });
        return;
      }
      const state = await getDolsTriggerState(organisationId, form.patientId).catch(() => ({
        triggered: false,
        reasons: [],
      }));
      if (!cancelled) setDolsTriggerState(state);
    }
    void loadDolsTrigger();
    return () => {
      cancelled = true;
    };
  }, [organisationId, form.patientId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAssessmentFromQuery() {
      if (!organisationId || !queryAssessmentId) return;
      const row = await getCapacityAssessmentById(organisationId, queryAssessmentId).catch(() => null);
      if (!row || cancelled) return;
      setForm((prev) => ({
        ...prev,
        patientId: String(row?.patientId ?? "").trim() || prev.patientId,
        decisionType: String(row?.decisionType ?? "").trim() || prev.decisionType,
        decisionDescription: String(row?.decisionDescription ?? "").trim() || prev.decisionDescription,
        urgencyLevel: String(row?.urgencyLevel ?? "").trim() || prev.urgencyLevel,
        assessmentDate: String(row?.assessmentDate ?? "").trim() || prev.assessmentDate,
        nextReviewDate: String(row?.nextReviewDate ?? "").trim() || prev.nextReviewDate,
        stage1Impairment: row?.stage1Impairment === true,
        stage1Details: String(row?.stage1Details ?? "").trim(),
        understand: row?.understand !== false,
        retain: row?.retain !== false,
        weigh: row?.weigh !== false,
        communicate: row?.communicate !== false,
        understandReasoning: row?.understandReasoning ?? emptyReasoning(),
        retainReasoning: row?.retainReasoning ?? emptyReasoning(),
        weighReasoning: row?.weighReasoning ?? emptyReasoning(),
        communicateReasoning: row?.communicateReasoning ?? emptyReasoning(),
        bestInterestsNotes: String(row?.bestInterestsNotes ?? row?.bestInterests?.notes ?? "").trim(),
        optionsConsidered: String(row?.optionsConsidered ?? row?.bestInterests?.optionsConsidered ?? "").trim(),
        chosenOption: String(row?.chosenOption ?? row?.bestInterests?.chosenOption ?? "").trim(),
        justification: String(row?.justification ?? row?.bestInterests?.justification ?? "").trim(),
        leastRestrictiveOption: row?.leastRestrictiveOption === true || row?.bestInterests?.leastRestrictiveOption === true,
        mdtInvolved: Array.isArray(row?.mdtInvolved)
          ? row.mdtInvolved
          : Array.isArray(row?.bestInterests?.mdtInvolved)
            ? row.bestInterests.mdtInvolved
            : [],
        familyConsulted: row?.familyConsulted === true || row?.bestInterests?.familyConsulted === true,
      }));
      setStep(4);
      setMessage("Loaded previous assessment for review. Saving will create a new assessment record.");
    }
    void loadAssessmentFromQuery();
    return () => {
      cancelled = true;
    };
  }, [organisationId, queryAssessmentId]);

  async function handleSave() {
    if (!organisationId || !form.patientId || !form.decisionType.trim()) return;
    const validationError = validateDecisionSpecificAssessment(form, lacksCapacity);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const saved = await createCapacityAssessment({
        ...form,
        organisationId,
        hospitalId,
        wardId,
      });
      await logAuditEventNonBlocking({
        action: "CAPACITY_ASSESSMENT_CREATED",
        organisationId,
        patientId: form.patientId,
        metadata: {
          assessmentId: saved?.id ?? null,
          decisionType: form.decisionType,
          urgencyLevel: form.urgencyLevel,
          lacksCapacity,
          riskFlags,
        },
      });
      void logEnterpriseAudit({
        action: "CAPACITY_ASSESSMENT",
        entityId: saved?.id ?? null,
        organisationId,
        hospitalId,
        wardId,
        patientId: form.patientId,
        metadata: {
          assessmentId: saved?.id ?? null,
          decisionType: form.decisionType,
          urgencyLevel: form.urgencyLevel,
        },
      });
      if (saved?.safeguardingAlertTriggered === true) {
        void logEnterpriseAudit({
          action: "SAFEGUARDING_ALERT_TRIGGERED",
          entityId: saved?.id ?? null,
          organisationId,
          hospitalId,
          wardId,
          patientId: form.patientId,
          metadata: {
            assessmentId: saved?.id ?? null,
            decisionType: form.decisionType,
            reason: saved?.safeguardingAlertReason ?? "Finances decision lacks capacity",
          },
        });
      }
      setMessage("Capacity assessment saved successfully.");
      setStep(1);
    } catch (e) {
      setMessage(e?.message ?? "Unable to save capacity assessment.");
    } finally {
      setSaving(false);
    }
  }

  function toggleMdt(member) {
    setForm((prev) => {
      const has = prev.mdtInvolved.includes(member);
      return {
        ...prev,
        mdtInvolved: has ? prev.mdtInvolved.filter((x) => x !== member) : [...prev.mdtInvolved, member],
      };
    });
  }

  function updateAbilityReasoning(abilityKey, field, value) {
    const reasoningKey = `${abilityKey}Reasoning`;
    setForm((prev) => ({
      ...prev,
      [reasoningKey]: {
        ...(prev[reasoningKey] ?? emptyReasoning()),
        [field]: value,
      },
    }));
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 className="page-title">Capacity & Consent</h1>
      <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--warning)" }}>
        <strong>This tool supports decision-making — not a legal determination.</strong>
      </div>
      {reassessmentDue.due ? (
        <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--danger)", background: "#fef2f2" }}>
          <strong>⚠️ Capacity reassessment due</strong>
          {reassessmentDue.reasons.length > 0 ? (
            <p style={{ margin: "8px 0 0", color: "var(--text-primary)" }}>
              Triggered by: {reassessmentDue.reasons.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
      {reassessmentRecommendation.shouldRecommend ? (
        <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--danger)", background: "#fef2f2" }}>
          <strong>⚠️ Capacity reassessment recommended</strong>
          {reassessmentRecommendation.reasons.length > 0 ? (
            <p style={{ margin: "8px 0 0", color: "var(--text-primary)" }}>
              Triggered by: {reassessmentRecommendation.reasons.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
      {dolsTriggerState.triggered ? (
        <div className="card" style={{ marginBottom: 24, borderLeft: "4px solid var(--danger)", background: "#fef2f2" }}>
          <strong>⚠️ Possible Deprivation of Liberty</strong>
          {dolsTriggerState.reasons.length > 0 ? (
            <p style={{ margin: "8px 0 0", color: "var(--text-primary)" }}>
              Triggered by: {dolsTriggerState.reasons.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">Guided MCA Workflow</h2>
        <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 14 }}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{ fontWeight: step === s ? 700 : 500, color: step === s ? "var(--primary)" : "var(--text-muted)" }}>
              Step {s}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div>
            <h3 className="section-title">Step 1: Select patient</h3>
            <select
              value={form.patientId}
              onChange={(e) => setForm((p) => ({ ...p, patientId: e.target.value }))}
              style={{ minWidth: 320, padding: "8px 10px" }}
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p?.id} value={p?.id}>
                  {`${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim() || p?.id}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="section-title">Step 2: Decision type</h3>
            <select
              value={form.decisionType}
              onChange={(e) => setForm((p) => ({ ...p, decisionType: e.target.value }))}
              style={{ minWidth: 420, padding: "8px 10px" }}
            >
              <option value="">Select decision type</option>
              {MCA_DECISION_TYPES.map((key) => (
                <option key={key} value={key}>
                  {MCA_DECISION_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Decision description</label>
              <textarea
                value={form.decisionDescription}
                onChange={(e) => setForm((p) => ({ ...p, decisionDescription: e.target.value }))}
                placeholder="Clinical reasoning, options considered, and specific decision context"
                rows={5}
                style={{ width: "100%", maxWidth: 760, padding: "8px 10px" }}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Urgency level</label>
              <select
                value={form.urgencyLevel}
                onChange={(e) => setForm((p) => ({ ...p, urgencyLevel: e.target.value }))}
                style={{ minWidth: 220, padding: "8px 10px" }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Next review date</label>
              <input
                type="date"
                value={form.nextReviewDate}
                onChange={(e) => setForm((p) => ({ ...p, nextReviewDate: e.target.value }))}
                style={{ minWidth: 220, padding: "8px 10px" }}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h3 className="section-title">Step 3: Stage 1 test</h3>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={form.stage1Impairment}
                onChange={(e) => setForm((p) => ({ ...p, stage1Impairment: e.target.checked }))}
              />
              Is there impairment of mind/brain?
            </label>
            <textarea
              value={form.stage1Details}
              onChange={(e) => setForm((p) => ({ ...p, stage1Details: e.target.value }))}
              placeholder="Stage 1 rationale"
              rows={4}
              style={{ width: "100%", maxWidth: 680, padding: "8px 10px" }}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <h3 className="section-title">Step 4: Stage 2 checklist</h3>
            {ABILITY_KEYS.map((key) => {
              const reasoning = form[`${key}Reasoning`] ?? emptyReasoning();
              const suggestedQuestion = decisionSpecificQuestions[key] ?? DEFAULT_DECISION_QUESTIONS[key];
              return (
                <div key={key} className="card" style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                      style={{ marginRight: 8 }}
                    />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "8px 10px",
                      }}
                    >
                      <strong>Suggested {form.decisionType || "decision"} question:</strong> {suggestedQuestion}
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        What did you explain?
                      </label>
                      <textarea
                        rows={2}
                        value={reasoning.questionAsked}
                        onChange={(e) => updateAbilityReasoning(key, "questionAsked", e.target.value)}
                        placeholder="Document the explanation/question used to assess this ability"
                        style={{ width: "100%", maxWidth: 760, padding: "8px 10px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        What was the patient’s response?
                      </label>
                      <textarea
                        rows={2}
                        value={reasoning.patientResponse}
                        onChange={(e) => updateAbilityReasoning(key, "patientResponse", e.target.value)}
                        placeholder="Document observed response verbatim where possible"
                        style={{ width: "100%", maxWidth: 760, padding: "8px 10px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                        Why does this indicate lack of ability?
                      </label>
                      <textarea
                        rows={2}
                        value={reasoning.clinicianInterpretation}
                        onChange={(e) => updateAbilityReasoning(key, "clinicianInterpretation", e.target.value)}
                        placeholder="Clinical interpretation and rationale"
                        style={{ width: "100%", maxWidth: 760, padding: "8px 10px" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="card" style={{ marginTop: 16, background: lacksCapacity ? "#fef2f2" : "#f0fdf4" }}>
              <strong>Auto result:</strong> {lacksCapacity ? "Lacks capacity (Stage 2 threshold met)" : "Has capacity for this decision"}
            </div>
            {riskFlags.length > 0 ? (
              <div className="card" style={{ marginTop: 12, background: "#fffbeb", borderLeft: "4px solid var(--warning)" }}>
                <strong>MCA risk flags</strong>
                <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                  {riskFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {assessmentWarning ? (
              <div
                className="card"
                style={{
                  marginTop: 12,
                  background: assessmentWarning.includes("Inconsistent") ? "#fffbeb" : "#eff6ff",
                  borderLeft: `4px solid ${assessmentWarning.includes("Inconsistent") ? "var(--warning)" : "var(--primary)"}`,
                }}
              >
                <strong>Logic warning:</strong> {assessmentWarning}
              </div>
            ) : null}

            {lacksCapacity ? (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 className="section-title">Best Interests (required)</h3>
                <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: 14 }}>
                  Explain why this decision is in the patient's best interests.
                </p>
                <textarea
                  value={form.bestInterestsNotes}
                  onChange={(e) => setForm((p) => ({ ...p, bestInterestsNotes: e.target.value }))}
                  placeholder="Best interests rationale and least restrictive options"
                  rows={4}
                  style={{ width: "100%", maxWidth: 680, padding: "8px 10px" }}
                />
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Options considered</label>
                  <textarea
                    value={form.optionsConsidered}
                    onChange={(e) => setForm((p) => ({ ...p, optionsConsidered: e.target.value }))}
                    placeholder="Document all practical options considered"
                    rows={3}
                    style={{ width: "100%", maxWidth: 680, padding: "8px 10px" }}
                  />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Chosen option</label>
                  <input
                    value={form.chosenOption}
                    onChange={(e) => setForm((p) => ({ ...p, chosenOption: e.target.value }))}
                    placeholder="Selected option"
                    style={{ width: "100%", maxWidth: 680, padding: "8px 10px" }}
                  />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Justification</label>
                  <textarea
                    value={form.justification}
                    onChange={(e) => setForm((p) => ({ ...p, justification: e.target.value }))}
                    placeholder="Clinical and ethical justification"
                    rows={3}
                    style={{ width: "100%", maxWidth: 680, padding: "8px 10px" }}
                  />
                </div>
                <label style={{ display: "block", marginTop: 12, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={form.leastRestrictiveOption}
                    onChange={(e) => setForm((p) => ({ ...p, leastRestrictiveOption: e.target.checked }))}
                  />{" "}
                  Least restrictive option confirmed
                </label>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>MDT involved</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {MDT_OPTIONS.map((opt) => (
                      <label key={opt}>
                        <input type="checkbox" checked={form.mdtInvolved.includes(opt)} onChange={() => toggleMdt(opt)} /> {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <label style={{ display: "block", marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={form.familyConsulted}
                    onChange={(e) => setForm((p) => ({ ...p, familyConsulted: e.target.checked }))}
                  />{" "}
                  Family consulted
                </label>
              </div>
            ) : null}

            <div className="card" style={{ marginTop: 16 }}>
              <h3 className="section-title">Auto summary</h3>
              <p style={{ margin: 0 }}>{outcomeSummary}</p>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button className="btn btn-secondary" type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            Back
          </button>
          {step < 4 ? (
            <button className="btn btn-primary" type="button" disabled={!canNext} onClick={() => setStep((s) => Math.min(4, s + 1))}>
              Next
            </button>
          ) : (
            <button className="btn btn-primary" type="button" disabled={saving || !form.patientId || !form.decisionType.trim()} onClick={handleSave}>
              {saving ? "Saving..." : "Save assessment"}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Relevant Clinical Context</h2>
        {contextLoading ? (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading recent clinical context...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
            <div>
              <strong>Recent clinical notes</strong>
              <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                {contextData.notes.map((n, idx) => (
                  <li key={n?.id ?? `note-${idx}`}>{String(n?.content ?? n?.correctedNote ?? "Clinical note").slice(0, 96)}</li>
                ))}
                {!contextData.notes.length ? <li>No recent notes found.</li> : null}
              </ul>
            </div>
            <div>
              <strong>Recent behaviour logs</strong>
              <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                {contextData.behaviourLogs.map((b, idx) => (
                  <li key={b?.id ?? `beh-${idx}`}>{String(b?.behaviourLabel ?? b?.label ?? b?.type ?? "Behaviour entry").slice(0, 96)}</li>
                ))}
                {!contextData.behaviourLogs.length ? <li>No recent behaviour logs found.</li> : null}
              </ul>
            </div>
            <div>
              <strong>Recent MDT entries</strong>
              <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                {contextData.mdtEntries.map((m, idx) => (
                  <li key={m?.id ?? `mdt-${idx}`}>{String(m?.discipline ?? "MDT")} entry available</li>
                ))}
                {!contextData.mdtEntries.length ? <li>No recent MDT entries found.</li> : null}
              </ul>
            </div>
            <div>
              <strong>Recent incidents</strong>
              <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                {recentIncidents.map((x, idx) => (
                  <li key={x?.id ?? `inc-${idx}`}>
                    {String(x?.type ?? x?.incidentType ?? "incident")} - {String(x?.severity ?? "unknown")}
                  </li>
                ))}
                {!recentIncidents.length ? <li>No recent incidents found.</li> : null}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="section-title">Current assessment context</h2>
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Patient: {selectedPatient ? `${selectedPatient?.firstName ?? ""} ${selectedPatient?.lastName ?? ""}`.trim() : "Not selected"} | Assessor role:{" "}
          {form.assessorRole}
        </p>
        {message ? <p style={{ marginTop: 12 }}>{message}</p> : null}
      </div>
    </div>
  );
}
