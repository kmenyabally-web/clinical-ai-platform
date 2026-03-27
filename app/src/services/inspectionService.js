import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";
import { createComplianceAction } from "./complianceService";
import { createNotification, NOTIFICATION_TYPES } from "./notificationService";
import { fetchDocumentCountsByDomain } from "./documentService";
import { DOMAIN_TO_STATS_FIELD } from "../config/documentDomains";
import { CQC_KEY_QUESTIONS } from "../config/inspectionDomains";
import { getInspectionRiskLevel } from "../config/inspectionDomains";

const QUESTIONS_COLLECTION = "inspection_questions";
const SESSIONS_COLLECTION = "inspection_sessions";
const RESPONSES_COLLECTION = "inspection_responses";

const SCORE_YES = 1;
const SCORE_PARTIAL = 0.5;
const SCORE_NO = 0;

/** Default questions when collection is empty (seed). */
const DEFAULT_QUESTIONS = [
  { questionText: "Are people protected from abuse and avoidable harm?", domainType: "safe", guidanceText: "Consider safeguarding policies and incident reporting.", evidenceHint: "Safeguarding policy, incident logs.", riskWeight: 5 },
  { questionText: "Does the service deliver effective care and support?", domainType: "effective", guidanceText: "Consider care planning and outcomes.", evidenceHint: "Care plans, outcome records.", riskWeight: 5 },
  { questionText: "Is the service caring?", domainType: "caring", guidanceText: "Consider dignity and respect in delivery.", evidenceHint: "Surveys, care records.", riskWeight: 4 },
  { questionText: "Is the service responsive to people's needs?", domainType: "responsive", guidanceText: "Consider accessibility and complaints.", evidenceHint: "Complaints policy, feedback.", riskWeight: 4 },
  { questionText: "Is the service well-led?", domainType: "well-led", guidanceText: "Consider governance and leadership.", evidenceHint: "Governance framework, audits.", riskWeight: 5 },
  { questionText: "Is STOMP medication monitoring complete (reason, review date, reduction plan)?", domainType: "effective", guidanceText: "Check psychotropic medication review records for LD/autism patients.", evidenceHint: "Medication review date, rationale, reduction plan.", riskWeight: 5 },
];

/**
 * Fetch all inspection questions. If collection is empty, returns default seed questions (not written to Firestore).
 * @returns {Promise<Array<{ id: string, questionText: string, domainType: string, guidanceText: string, evidenceHint: string, riskWeight: number }>>}
 */
export async function fetchInspectionQuestions() {
  const ref = collection(db, QUESTIONS_COLLECTION);
  const snapshot = await getDocs(ref);
  const docs = snapshot?.docs ?? [];
  if (docs.length === 0) {
    return DEFAULT_QUESTIONS.map((q, i) => ({ id: `default-${i}`, ...q }));
  }
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      questionText: x.questionText ?? "",
      domainType: x.domainType ?? "",
      guidanceText: x.guidanceText ?? "",
      evidenceHint: x.evidenceHint ?? "",
      riskWeight: typeof x.riskWeight === "number" ? x.riskWeight : 1,
    };
  });
}

/**
 * Start an inspection session. Creates document, logs INSPECTION_STARTED.
 * @param {string} organisationId
 * @param {string} userId
 * @param {{ userId: string, userRole: string }} auditContext
 * @param {string | null} [serviceId] Optional. Service scope.
 * @returns {Promise<{ sessionId: string }>}
 */
export async function createSession(organisationId, userId, auditContext, serviceId) {
  if (!organisationId?.trim() || !userId) throw new Error("organisationId and userId required");
  const ctx = await getUserContext();
  const tenant = tenantFieldsFromContext({
    organisationId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);
  const ref = collection(db, SESSIONS_COLLECTION);
  const docData = {
    organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    serviceId: serviceId ?? null,
    startedBy: userId,
    startedAt: serverTimestamp(),
    completedAt: null,
    overallScore: null,
    riskLevel: null,
  };
  const docRef = await addDoc(ref, docData);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "",
      serviceId: serviceId ?? undefined,
      action: "INSPECTION_STARTED",
      entityType: "INSPECTION_SESSION",
      entityId: docRef.id,
      entityName: "Inspection simulation",
      previousValue: null,
      newValue: { sessionId: docRef.id, organisationId },
    });
  }
  return { sessionId: docRef.id };
}

/**
 * @param {string} sessionId
 * @returns {Promise<{ id: string, organisationId: string, startedBy: string, startedAt: unknown, completedAt: unknown, overallScore: number | null, riskLevel: string | null } | null>}
 */
export async function getSession(sessionId) {
  if (!sessionId) return null;
  const ref = doc(db, SESSIONS_COLLECTION, sessionId);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap || typeof snap.exists !== "function" || !snap.exists()) return null;
  const d = snap.data?.() ?? {};
  return {
    id: snap.id ?? sessionId,
    organisationId: d.organisationId ?? "",
    serviceId: d.serviceId ?? null,
    startedBy: d.startedBy ?? "",
    startedAt: d.startedAt ?? null,
    completedAt: d.completedAt ?? null,
    overallScore: d.overallScore ?? null,
    riskLevel: d.riskLevel ?? null,
  };
}

/**
 * Save or update a single response. Response: Yes | Partial | No.
 * @param {string} sessionId
 * @param {string} questionId
 * @param {string} response
 * @param {string} [answeredBy] User ID of respondent (for audit).
 */
export async function saveResponse(sessionId, questionId, response, answeredBy) {
  if (!sessionId || !questionId) return;
  const ref = doc(db, RESPONSES_COLLECTION, `${sessionId}_${questionId}`);
  const now = serverTimestamp();
  await setDoc(ref, {
    sessionId,
    questionId,
    response: response === "Yes" || response === "Partial" || response === "No" ? response : "No",
    answeredBy: answeredBy ?? null,
    answeredAt: now,
    createdAt: now,
  });
}

/**
 * Get all responses for a session.
 * @param {string} sessionId
 * @returns {Promise<Array<{ questionId: string, response: string, answeredBy?: string, answeredAt?: unknown }>>}
 */
export async function getResponsesForSession(sessionId) {
  if (!sessionId) return [];
  const ref = collection(db, RESPONSES_COLLECTION);
  const q = query(ref, where("sessionId", "==", sessionId));
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      questionId: x.questionId ?? "",
      response: x.response ?? "No",
      answeredBy: x.answeredBy ?? undefined,
      answeredAt: x.answeredAt ?? x.createdAt ?? undefined,
    };
  });
}

/**
 * Calculate weighted score from responses and questions. Yes=1, Partial=0.5, No=0.
 * @param {Array<{ questionId: string, response: string }>} responses
 * @param {Array<{ id: string, riskWeight: number }>} questions
 * @returns {{ overallScore: number, totalWeight: number, earnedWeight: number }}
 */
export function calculateInspectionScore(responses, questions) {
  const responseByQuestion = new Map(responses.map((r) => [r.questionId, r.response]));
  let totalWeight = 0;
  let earnedWeight = 0;
  for (const q of questions) {
    const w = q.riskWeight ?? 1;
    totalWeight += w;
    const res = responseByQuestion.get(q.id) ?? "No";
    const factor = res === "Yes" ? SCORE_YES : res === "Partial" ? SCORE_PARTIAL : SCORE_NO;
    earnedWeight += w * factor;
  }
  const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 1000) / 10 : 0;
  return { overallScore, totalWeight, earnedWeight };
}

async function getStompInspectionAdjustment(organisationId, serviceId) {
  if (!organisationId?.trim()) return 0;
  try {
    const constraints = [where("organisationId", "==", organisationId), limit(1000)];
    if (serviceId) constraints.push(where("serviceId", "==", serviceId));
    const snap = await getDocs(query(collection(db, "patients"), ...constraints));
    let monitored = 0;
    let compliant = 0;
    (snap?.docs ?? []).forEach((d) => {
      const p = d?.data?.() ?? {};
      if (p.stompMonitoring !== true) return;
      monitored += 1;
      const meds = Array.isArray(p.medications) ? p.medications : [];
      const medicationCompliant = meds.every((m) => {
        const reason = String(m?.reason ?? "").trim();
        const reviewDate = String(m?.reviewDate ?? "").trim();
        const reductionPlan = String(m?.reductionPlan ?? "").trim();
        return reason && reviewDate && reductionPlan;
      });
      if (medicationCompliant) compliant += 1;
    });
    if (monitored === 0) return 0;
    const ratio = compliant / monitored;
    return Math.round((ratio - 1) * 10); // 0 to -10 penalty
  } catch (_) {
    return 0;
  }
}

/**
 * Complete session: calculate score, update session, create actions for "No" responses, log INSPECTION_COMPLETED.
 * @param {string} sessionId
 * @param {string} organisationId
 * @param {Array<{ id: string, questionText: string, domainType: string, riskWeight: number }>} questions
 * @param {Array<{ questionId: string, response: string }>} responses
 * @param {{ userId: string, userRole: string }} auditContext
 * @returns {Promise<{ overallScore: number, riskLevel: string, createdActionIds: string[] }>}
 */
export async function completeSession(sessionId, organisationId, questions, responses, auditContext) {
  if (!sessionId || !organisationId) throw new Error("sessionId and organisationId required");
  const session = await getSession(sessionId);
  const serviceId = session?.serviceId ?? null;
  const { overallScore } = calculateInspectionScore(responses, questions);
  const stompAdjustment = await getStompInspectionAdjustment(organisationId, serviceId);
  const adjustedOverallScore = Math.max(0, Math.min(100, overallScore + stompAdjustment));
  const riskLevel = getInspectionRiskLevel(adjustedOverallScore);
  const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(sessionRef, {
    completedAt: serverTimestamp(),
    overallScore: adjustedOverallScore,
    riskLevel,
    stompAdjustment,
  });

  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const domainLabel = (domainType) => CQC_KEY_QUESTIONS.find((d) => d.value === domainType)?.label ?? domainType;
  const createdActionIds = [];
  const auditContextWithOrg = auditContext ? { ...auditContext, organisationId } : undefined;
  for (const r of responses) {
    if (r.response !== "No") continue;
    const q = questionMap.get(r.questionId);
    if (!q) continue;
    const domainName = domainLabel(q.domainType);
    const { id } = await createComplianceAction(
      organisationId,
      {
        title: `Address inspection gap: ${q.questionText.slice(0, 70)}${q.questionText.length > 70 ? "…" : ""}`,
        description: `Domain: ${domainName}. Auto-created from inspection simulation.`,
        riskLevel: "high",
        priority: "high",
      },
      auditContextWithOrg,
      serviceId
    );
    createdActionIds.push(id);
  }

  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "",
      serviceId: serviceId ?? undefined,
      action: "INSPECTION_COMPLETED",
      entityType: "INSPECTION_SESSION",
      entityId: sessionId,
      entityName: "Inspection simulation",
      previousValue: null,
      newValue: { overallScore: adjustedOverallScore, riskLevel, createdActionIds, stompAdjustment },
    });
  }
  if (riskLevel === "High risk" && auditContext) {
    const auditContextWithOrg = { ...auditContext, organisationId };
    createNotification(
      organisationId,
      {
        type: NOTIFICATION_TYPES.INSPECTION_HIGH_RISK,
        title: "Inspection simulation: high risk",
        message: `Latest inspection score: ${adjustedOverallScore}%. Address gaps to improve readiness.`,
        severity: "high",
        relatedEntityType: "inspection_session",
        relatedEntityId: sessionId,
      },
      auditContextWithOrg,
      serviceId
    ).catch(() => {});
  }
  return { overallScore: adjustedOverallScore, riskLevel, createdActionIds };
}

/**
 * Gap analysis: missing evidence (domains with 0 docs), high-risk domains (domain score < 60), and questions answered "No" (recommended actions).
 * @param {string} organisationId
 * @param {Array<{ id: string, domainType: string, questionText: string }>} questions
 * @param {Array<{ questionId: string, response: string }>} responses
 * @returns {Promise<{ missingEvidence: Array<{ domainKey: string, label: string }>, highRiskDomains: Array<{ domainType: string, label: string, score: number }>, recommendedActions: Array<{ questionId: string, questionText: string }> }>}
 */
export async function getGapAnalysis(organisationId, questions, responses, serviceId) {
  const responseByQuestion = new Map(responses.map((r) => [r.questionId, r.response]));
  const domainScores = new Map();
  const domainWeights = new Map();
  for (const q of questions) {
    const d = q.domainType ?? "";
    const w = q.riskWeight ?? 1;
    domainWeights.set(d, (domainWeights.get(d) ?? 0) + w);
    const res = responseByQuestion.get(q.id) ?? "No";
    const factor = res === "Yes" ? 1 : res === "Partial" ? 0.5 : 0;
    domainScores.set(d, (domainScores.get(d) ?? 0) + w * factor);
  }
  const highRiskDomains = [];
  for (const d of CQC_KEY_QUESTIONS) {
    const total = domainWeights.get(d.value) ?? 1;
    const earned = domainScores.get(d.value) ?? 0;
    const score = total > 0 ? (earned / total) * 100 : 0;
    if (score < 60) highRiskDomains.push({ domainType: d.value, label: d.label, score });
  }
  const recommendedActions = questions
    .filter((q) => responseByQuestion.get(q.id) === "No")
    .map((q) => ({ questionId: q.id, questionText: q.questionText }));

  let missingEvidence = [];
  if (organisationId) {
    const counts = await fetchDocumentCountsByDomain(organisationId, serviceId);
    const docDomainKeys = ["governance", "safeguarding", "mental-capacity", "staffing", "care-planning"];
    for (const key of docDomainKeys) {
      const field = DOMAIN_TO_STATS_FIELD[key];
      const count = field ? counts[field] : 0;
      if (!count || count === 0) {
        const label = key.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        missingEvidence.push({ domainKey: key, label });
      }
    }
  }
  return { missingEvidence, highRiskDomains, recommendedActions };
}

/**
 * List sessions for organisation (for view results). All queries filter by organisationId.
 * @param {string} organisationId
 * @param {{ limitCount?: number }} options
 * @returns {Promise<Array<{ id: string, startedBy: string, startedAt: unknown, completedAt: unknown, overallScore: number | null, riskLevel: string | null }>>}
 */
export async function getSessionsForOrganisation(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const { limitCount = 20, serviceId } = options;
  const ref = collection(db, SESSIONS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("startedAt", "desc"),
    limit(limitCount),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      startedBy: x.startedBy ?? "",
      startedAt: x.startedAt ?? null,
      completedAt: x.completedAt ?? null,
      overallScore: x.overallScore ?? null,
      riskLevel: x.riskLevel ?? null,
    };
  });
}