import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { fetchIncidentsForPatient } from "./incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "./behaviourService";
import { getLatestMdtSummaryForPatient } from "./mdtSummariesService";

const CAPACITY_COLLECTION = "capacityAssessments";
export const MCA_DECISION_TYPES = Object.freeze([
  "residence",
  "medication",
  "finances",
  "care",
  "treatment",
  "contact",
  "safeguarding",
]);
export const MCA_DECISION_TYPE_LABELS = Object.freeze({
  residence: "Residence",
  medication: "Medication",
  finances: "Finances",
  care: "Care",
  treatment: "Treatment",
  contact: "Contact",
  safeguarding: "Safeguarding",
});
const ADMISSION_DECISIONS = ["care", "residence", "medication"];

function normalizeDecisionType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (MCA_DECISION_TYPES.includes(raw)) return raw;
  // Backward compatibility for legacy free-text records.
  if (raw === "consent to care" || raw === "consent") return "care";
  if (raw.includes("residence")) return "residence";
  if (raw.includes("medication")) return "medication";
  if (raw.includes("finance")) return "finances";
  if (raw.includes("treatment")) return "treatment";
  if (raw.includes("contact")) return "contact";
  if (raw.includes("safeguard")) return "safeguarding";
  return "";
}

function formatDecisionTypeLabel(value) {
  const key = normalizeDecisionType(value);
  if (key) return MCA_DECISION_TYPE_LABELS[key];
  return String(value ?? "").trim() || "Clinical decision";
}

function toBool(v) {
  return v === true;
}

function normalizeAbilityReasoning(value) {
  const x = value && typeof value === "object" ? value : {};
  return {
    questionAsked: String(x.questionAsked ?? "").trim(),
    patientResponse: String(x.patientResponse ?? "").trim(),
    clinicianInterpretation: String(x.clinicianInterpretation ?? "").trim(),
  };
}

function buildReasoningPayload(payload, assessmentWarning, outcomeSummary) {
  return {
    stage1: {
      impairment: toBool(payload?.stage1Impairment),
      details: String(payload?.stage1Details ?? "").trim(),
    },
    stage2: {
      understand: {
        hasAbility: toBool(payload?.understand),
        ...normalizeAbilityReasoning(payload?.understandReasoning),
      },
      retain: {
        hasAbility: toBool(payload?.retain),
        ...normalizeAbilityReasoning(payload?.retainReasoning),
      },
      weigh: {
        hasAbility: toBool(payload?.weigh),
        ...normalizeAbilityReasoning(payload?.weighReasoning),
      },
      communicate: {
        hasAbility: toBool(payload?.communicate),
        ...normalizeAbilityReasoning(payload?.communicateReasoning),
      },
    },
    warning: assessmentWarning ?? null,
    summary: String(outcomeSummary ?? "").trim(),
  };
}

function buildBestInterestsPayload(payload, lacksCapacity) {
  return {
    required: lacksCapacity === true,
    notes: String(payload?.bestInterestsNotes ?? "").trim(),
    optionsConsidered: String(payload?.optionsConsidered ?? "").trim(),
    chosenOption: String(payload?.chosenOption ?? "").trim(),
    justification: String(payload?.justification ?? "").trim(),
    leastRestrictiveOption: toBool(payload?.leastRestrictiveOption),
    mdtInvolved: Array.isArray(payload?.mdtInvolved) ? payload.mdtInvolved.map((x) => String(x).trim()).filter(Boolean) : [],
    familyConsulted: toBool(payload?.familyConsulted),
  };
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function computeLacksCapacity(input) {
  const understand = toBool(input?.understand);
  const retain = toBool(input?.retain);
  const weigh = toBool(input?.weigh);
  const communicate = toBool(input?.communicate);
  return !understand || !retain || !weigh || !communicate;
}

export function getCapacityAssessmentWarning(input) {
  const values = [
    toBool(input?.understand),
    toBool(input?.retain),
    toBool(input?.weigh),
    toBool(input?.communicate),
  ];
  const allTrue = values.every(Boolean);
  const allFalse = values.every((v) => v === false);
  const mixed = !allTrue && !allFalse;
  if (mixed) return "Inconsistent assessment — consider reassessment";
  if (allTrue) return "Capacity likely present";
  return null;
}

export function getMcaRiskFlags(input) {
  const flags = [];
  const highRiskDecision = String(input?.urgencyLevel ?? "").toLowerCase() === "high";
  const noMdt = !Array.isArray(input?.mdtInvolved) || input.mdtInvolved.length === 0;
  const noFamily = toBool(input?.familyConsulted) === false;
  if (highRiskDecision) flags.push("High-risk decision — senior review advised");
  if (noMdt) flags.push("Consider MDT involvement");
  if (noFamily) flags.push("Family consultation recommended");
  return flags;
}

export function getCapacityReassessmentRecommendation(input) {
  const behaviours = Array.isArray(input?.behaviours) ? input.behaviours : [];
  const incidents = Array.isArray(input?.incidents) ? input.incidents : [];
  const agitationCount = behaviours.filter((row) => {
    const t = String(row?.behaviourType ?? "").toLowerCase();
    const custom = String(row?.behaviourCustom ?? "").toLowerCase();
    return t.includes("agitation") || custom.includes("agitation");
  }).length;
  const repeatedAgitation = agitationCount >= 2;
  const medicationRefusal = behaviours.some((row) => {
    const t = String(row?.behaviourType ?? "").toLowerCase();
    const tr = String(row?.trigger ?? "").toLowerCase();
    const action = String(row?.action ?? "").toLowerCase();
    return row?.medicationRefused === true || t.includes("medication refusal") || tr.includes("medication refus") || action.includes("medication refus");
  });
  const safeguardingConcern = incidents.some((row) => {
    const type = String(row?.type ?? row?.incidentType ?? row?.category ?? "").toLowerCase();
    const title = String(row?.title ?? "").toLowerCase();
    const desc = String(row?.description ?? "").toLowerCase();
    return type.includes("safeguarding") || title.includes("safeguarding") || desc.includes("safeguarding");
  });
  const shouldRecommend = repeatedAgitation || medicationRefusal || safeguardingConcern;
  const reasons = [];
  if (repeatedAgitation) reasons.push("Repeated agitation");
  if (medicationRefusal) reasons.push("Medication refusal");
  if (safeguardingConcern) reasons.push("Safeguarding concern");
  return {
    shouldRecommend,
    title: shouldRecommend ? "Capacity reassessment recommended" : "",
    reasons,
  };
}

export function buildCapacityOutcomeSummary(input) {
  const lacks = computeLacksCapacity(input);
  const decisionType = formatDecisionTypeLabel(input?.decisionType);
  const stage1 = toBool(input?.stage1Impairment);
  const verdict = lacks ? "DOES NOT have capacity" : "DOES have capacity";
  const stage1Text = stage1
    ? "Stage 1 impairment of mind/brain is present."
    : "Stage 1 impairment of mind/brain is not clearly evidenced.";
  return `Based on the assessment, the patient ${verdict} for ${decisionType}. ${stage1Text}`;
}

export async function createCapacityAssessment(payload) {
  const lacksCapacity = computeLacksCapacity(payload);
  const assessmentWarning = getCapacityAssessmentWarning(payload);
  const decisionType = normalizeDecisionType(payload.decisionType);
  const hasBestInterestsNotes = String(payload?.bestInterestsNotes ?? "").trim().length > 0;
  const hasBestInterestsJustification = String(payload?.justification ?? "").trim().length > 0;
  const hasMdtInput = Array.isArray(payload?.mdtInvolved) && payload.mdtInvolved.some((x) => String(x ?? "").trim().length > 0);
  const medicationLacksCapacity = decisionType === "medication" && lacksCapacity === true;
  const financesLacksCapacity = decisionType === "finances" && lacksCapacity === true;

  if (medicationLacksCapacity && (!hasBestInterestsNotes || !hasBestInterestsJustification)) {
    throw new Error("Medication decision lacking capacity requires best interests notes and justification.");
  }

  const riskFlags = getMcaRiskFlags(payload);
  if (medicationLacksCapacity) {
    riskFlags.push("MDT review flagged for medication decision lacking capacity");
  }
  if (financesLacksCapacity) {
    riskFlags.push("Safeguarding alert triggered for finances decision lacking capacity");
  }
  const outcomeSummary = buildCapacityOutcomeSummary({ ...payload, lacksCapacity });
  const reasoning = buildReasoningPayload(payload, assessmentWarning, outcomeSummary);
  const bestInterests = buildBestInterestsPayload(payload, lacksCapacity);
  const docPayload = {
    organisationId: String(payload.organisationId ?? "").trim() || null,
    hospitalId: String(payload.hospitalId ?? "").trim() || null,
    wardId: String(payload.wardId ?? "").trim() || null,
    patientId: String(payload.patientId ?? "").trim() || null,
    decisionType,
    decisionDescription: String(payload.decisionDescription ?? "").trim(),
    urgencyLevel: ["low", "medium", "high"].includes(String(payload.urgencyLevel ?? "").toLowerCase())
      ? String(payload.urgencyLevel).toLowerCase()
      : "medium",
    assessmentDate: String(payload.assessmentDate ?? "").trim() || new Date().toISOString().slice(0, 10),
    nextReviewDate: String(payload.nextReviewDate ?? "").trim() || null,
    assessorRole: String(payload.assessorRole ?? "").trim() || "Unknown",
    stage1Impairment: toBool(payload.stage1Impairment),
    stage1Details: String(payload.stage1Details ?? "").trim(),
    understand: toBool(payload.understand),
    understandReasoning: normalizeAbilityReasoning(payload.understandReasoning),
    retain: toBool(payload.retain),
    retainReasoning: normalizeAbilityReasoning(payload.retainReasoning),
    weigh: toBool(payload.weigh),
    weighReasoning: normalizeAbilityReasoning(payload.weighReasoning),
    communicate: toBool(payload.communicate),
    communicateReasoning: normalizeAbilityReasoning(payload.communicateReasoning),
    lacksCapacity,
    reasoning,
    bestInterests,
    assessmentWarning,
    bestInterestsRequired: lacksCapacity,
    bestInterestsNotes: String(payload.bestInterestsNotes ?? "").trim(),
    optionsConsidered: String(payload.optionsConsidered ?? "").trim(),
    chosenOption: String(payload.chosenOption ?? "").trim(),
    justification: String(payload.justification ?? "").trim(),
    leastRestrictiveOption: toBool(payload.leastRestrictiveOption),
    mdtInvolved: Array.isArray(payload.mdtInvolved) ? payload.mdtInvolved.map((x) => String(x).trim()).filter(Boolean) : [],
    familyConsulted: toBool(payload.familyConsulted),
    riskFlags,
    mdtReviewRequired: medicationLacksCapacity,
    mdtReviewFlagged: medicationLacksCapacity && !hasMdtInput,
    safeguardingAlertTriggered: financesLacksCapacity,
    safeguardingAlertReason: financesLacksCapacity ? "Finances decision lacks capacity" : null,
    safeguardingAlertAt: financesLacksCapacity ? new Date().toISOString() : null,
    outcomeSummary,
    status: String(payload.status ?? "").toLowerCase() === "pending" ? "pending" : "completed",
    createdAt: serverTimestamp(),
  };
  if (!docPayload.decisionType) {
    throw new Error("decisionType must be one of: residence, medication, finances, care, treatment, contact, safeguarding.");
  }
  const ref = await addDoc(collection(db, CAPACITY_COLLECTION), docPayload);
  return { id: ref.id, ...docPayload };
}

export async function getLatestCapacityAssessment(organisationId, patientId) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return null;
  const q = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  const row = (snap?.docs ?? []).find((d) => String(d?.data?.()?.status ?? "completed").toLowerCase() !== "pending");
  if (!row) return null;
  const data = row.data() ?? {};
  return {
    id: row.id,
    ...data,
    decisionType: normalizeDecisionType(data?.decisionType),
  };
}

export async function listCapacityAssessmentsForPatient(organisationId, patientId, { limitCount = 50 } = {}) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return [];
  const lim = Math.max(1, Math.min(200, Number(limitCount) || 50));
  const q = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const row = d?.data?.() ?? {};
    return {
      id: d.id,
      ...row,
      decisionType: normalizeDecisionType(row?.decisionType),
    };
  });
}

export async function getCapacityAssessmentById(organisationId, assessmentId) {
  const org = String(organisationId ?? "").trim();
  const aid = String(assessmentId ?? "").trim();
  if (!org || !aid) return null;
  const ref = doc(db, CAPACITY_COLLECTION, aid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() ?? {};
  if (String(data?.organisationId ?? "").trim() !== org) return null;
  return {
    id: snap.id,
    ...data,
    decisionType: normalizeDecisionType(data?.decisionType),
  };
}

export async function ensureAdmissionPendingCapacityAssessments(input) {
  const organisationId = String(input?.organisationId ?? "").trim();
  const hospitalId = String(input?.hospitalId ?? "").trim();
  const wardId = String(input?.wardId ?? "").trim();
  const patientId = String(input?.patientId ?? "").trim();
  const assessorRole = String(input?.assessorRole ?? "Admission workflow").trim();
  if (!organisationId || !hospitalId || !wardId || !patientId) return [];

  const q = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", organisationId),
    where("patientId", "==", patientId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const existingSnap = await getDocs(q);
  const existingPending = new Set(
    (existingSnap?.docs ?? [])
      .map((d) => String(d?.data?.()?.decisionType ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const created = [];
  for (const decisionType of ADMISSION_DECISIONS) {
    if (existingPending.has(decisionType.toLowerCase())) continue;
    const ref = await addDoc(collection(db, CAPACITY_COLLECTION), {
      organisationId,
      hospitalId,
      wardId,
      patientId,
      decisionType,
      decisionDescription: "Auto-created at admission. Complete this assessment.",
      urgencyLevel: "medium",
      assessmentDate: new Date().toISOString().slice(0, 10),
      nextReviewDate: null,
      assessorRole,
      stage1Impairment: false,
      stage1Details: "",
      understand: false,
      understandReasoning: normalizeAbilityReasoning(null),
      retain: false,
      retainReasoning: normalizeAbilityReasoning(null),
      weigh: false,
      weighReasoning: normalizeAbilityReasoning(null),
      communicate: false,
      communicateReasoning: normalizeAbilityReasoning(null),
      lacksCapacity: null,
      reasoning: {
        stage1: { impairment: false, details: "" },
        stage2: {
          understand: { hasAbility: false, ...normalizeAbilityReasoning(null) },
          retain: { hasAbility: false, ...normalizeAbilityReasoning(null) },
          weigh: { hasAbility: false, ...normalizeAbilityReasoning(null) },
          communicate: { hasAbility: false, ...normalizeAbilityReasoning(null) },
        },
        warning: "Pending admission assessment",
        summary: "Pending admission assessment.",
      },
      bestInterests: {
        required: false,
        notes: "",
        optionsConsidered: "",
        chosenOption: "",
        justification: "",
        leastRestrictiveOption: false,
        mdtInvolved: [],
        familyConsulted: false,
      },
      assessmentWarning: "Pending admission assessment",
      bestInterestsRequired: false,
      bestInterestsNotes: "",
      optionsConsidered: "",
      chosenOption: "",
      justification: "",
      leastRestrictiveOption: false,
      mdtInvolved: [],
      familyConsulted: false,
      riskFlags: [],
      outcomeSummary: "Pending admission assessment.",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    created.push({ id: ref.id, decisionType });
  }
  return created;
}

export async function countPendingCapacityAssessments(organisationId, patientId) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return 0;
  const q = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    where("status", "==", "pending"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap?.size ?? 0;
}

export async function getCapacityReassessmentDueState(organisationId, patientId) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return { due: false, reasons: [] };

  const latest = await getLatestCapacityAssessment(org, pid).catch(() => null);
  if (!latest) return { due: false, reasons: [] };

  const reasons = [];
  const todayIso = new Date().toISOString().slice(0, 10);
  const reviewDate = String(latest?.nextReviewDate ?? "").trim();
  if (reviewDate && reviewDate < todayIso) {
    reasons.push("Review date passed");
  }

  const latestCreatedMs = toMillis(latest?.createdAt);
  const [incidents, behaviours, latestMdt] = await Promise.all([
    fetchIncidentsForPatient(pid, { limitCount: 25 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 25 }).catch(() => []),
    getLatestMdtSummaryForPatient(org, pid).catch(() => null),
  ]);

  const hasNewIncident = (Array.isArray(incidents) ? incidents : []).some(
    (x) => toMillis(x?.createdAt ?? x?.reportedAt) > latestCreatedMs
  );
  if (hasNewIncident) reasons.push("Incident logged");

  const hasBehaviourChange = (Array.isArray(behaviours) ? behaviours : []).some((x) => {
    const afterAssessment = toMillis(x?.createdAt ?? x?.eventAt) > latestCreatedMs;
    if (afterAssessment) return true;
    const t = String(x?.behaviourType ?? x?.behaviourCustom ?? "").toLowerCase();
    return t.includes("agitation") || t.includes("medication refusal") || t.includes("aggression");
  });
  if (hasBehaviourChange) reasons.push("Behaviour change");

  const recommendations = latestMdt?.data?.summary?.recommendations;
  const mdtText = Array.isArray(recommendations) ? recommendations.join(" ") : "";
  if (/capacity|reassess|reassessment/i.test(String(mdtText))) {
    reasons.push("MDT recommendation");
  }

  return { due: reasons.length > 0, reasons };
}

export async function getDolsTriggerState(organisationId, patientId) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return { triggered: false, reasons: [] };

  const residenceQuery = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    where("decisionType", "==", "residence"),
    orderBy("createdAt", "desc"),
    limit(12)
  );
  const residenceSnap = await getDocs(residenceQuery);
  const latestResidence = (residenceSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...(d?.data?.() ?? {}) }))
    .find((row) => String(row?.status ?? "completed").toLowerCase() !== "pending");
  const residenceLacksCapacity = latestResidence?.lacksCapacity === true;
  if (!residenceLacksCapacity) return { triggered: false, reasons: [] };

  const behaviours = await fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 30 }).catch(() => []);
  const hasSupervisionOrRestriction = (Array.isArray(behaviours) ? behaviours : []).some((row) => {
    const text = [
      row?.behaviourType,
      row?.behaviourCustom,
      row?.description,
      row?.trigger,
      row?.action,
      row?.response,
      row?.intervention,
    ]
      .map((x) => String(x ?? "").toLowerCase())
      .join(" ");
    return text.includes("supervision") || text.includes("restrict");
  });
  if (!hasSupervisionOrRestriction) return { triggered: false, reasons: [] };

  return {
    triggered: true,
    title: "⚠️ Possible Deprivation of Liberty",
    reasons: ["Residence decision lacks capacity", "Behaviour indicates supervision/restriction"],
  };
}

export async function getCapacityDashboardStats(organisationId) {
  const org = String(organisationId ?? "").trim();
  if (!org) {
    return {
      assessmentsDue: 0,
      patientsLackingCapacity: 0,
      highRiskDecisions: 0,
    };
  }
  const q = query(
    collection(db, CAPACITY_COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(500)
  );
  const snap = await getDocs(q);
  const rows = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data?.() ?? {}) }));
  const latestByPatient = new Map();
  for (const row of rows) {
    const patientId = String(row?.patientId ?? "").trim();
    if (!patientId) continue;
    const status = String(row?.status ?? "completed").toLowerCase();
    if (status === "pending") continue;
    if (!latestByPatient.has(patientId)) {
      latestByPatient.set(patientId, row);
    }
  }

  let assessmentsDue = 0;
  let patientsLackingCapacity = 0;
  let highRiskDecisions = 0;
  const todayIso = new Date().toISOString().slice(0, 10);

  for (const row of latestByPatient.values()) {
    if (row?.lacksCapacity === true) patientsLackingCapacity += 1;
    if (String(row?.urgencyLevel ?? "").toLowerCase() === "high") highRiskDecisions += 1;
    const nextReviewDate = String(row?.nextReviewDate ?? "").trim();
    if (nextReviewDate && nextReviewDate <= todayIso) assessmentsDue += 1;
  }

  return {
    assessmentsDue,
    patientsLackingCapacity,
    highRiskDecisions,
  };
}
