import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { fetchIncidents } from "./incidentService";
import { fetchEvidence } from "./evidenceService";
import { fetchComplianceActions } from "./complianceService";

export const COMPLIANCE_SCORES_COLLECTION = "compliance_scores";

/** CQC domain keys used in scoring. */
export const CQC_DOMAINS = ["safe", "effective", "caring", "responsive", "wellLed"];

/** Score band colours: 90-100 green, 70-89 amber, below 70 red. */
export function getScoreBand(score) {
  const n = typeof score === "number" ? score : 0;
  if (n >= 90) return "green";
  if (n >= 70) return "amber";
  return "red";
}

/**
 * Get the document id for compliance_scores (one doc per organisationId + serviceId).
 */
function getScoreDocId(organisationId, serviceId) {
  const sid = serviceId && String(serviceId).trim() ? String(serviceId).trim() : "_org";
  return `${String(organisationId).trim()}_${sid}`;
}

/**
 * Fetch raw data for a service needed for scoring. All queries filter by organisationId and serviceId.
 */
async function fetchScoringData(organisationId, serviceId) {
  const [incidents, evidence, actions] = await Promise.all([
    fetchIncidents(organisationId, { serviceId: serviceId || null }),
    fetchEvidence(organisationId, serviceId || null),
    fetchComplianceActions(organisationId, { serviceId: serviceId || null, limitCount: 500 }),
  ]);

  const incidentsList = Array.isArray(incidents) ? incidents : [];
  const evidenceList = Array.isArray(evidence) ? evidence : [];
  const actionsList = Array.isArray(actions) ? actions : [];

  // STOMP medication governance (LD/autism psychotropic use)
  let stompMonitoredCount = 0;
  let stompCompliantCount = 0;
  try {
    const patientsRef = collection(db, "patients");
    const patientsConstraints = [where("organisationId", "==", organisationId), limit(1000)];
    if (serviceId) patientsConstraints.push(where("serviceId", "==", serviceId));
    const patientsQ = query(patientsRef, ...patientsConstraints);
    const patientsSnap = await getDocs(patientsQ);
    (patientsSnap?.docs ?? []).forEach((d) => {
      const p = d?.data?.() ?? {};
      if (p.stompMonitoring !== true) return;
      stompMonitoredCount += 1;
      const meds = Array.isArray(p.medications) ? p.medications : [];
      const hasMedications = meds.length > 0;
      if (!hasMedications) {
        stompCompliantCount += 1;
        return;
      }
      const allHaveReasonAndReview = meds.every((m) => {
        const reason = String(m?.reason ?? "").trim();
        const reviewDate = String(m?.reviewDate ?? "").trim();
        return Boolean(reason && reviewDate);
      });
      const hasReductionPlan = meds.every((m) => String(m?.reductionPlan ?? "").trim().length > 0);
      if (allHaveReasonAndReview && hasReductionPlan) {
        stompCompliantCount += 1;
      }
    });
  } catch (_) {
    // Optional metric: do not fail full compliance score if STOMP dataset/index not available.
  }

  // Care plans count (by service)
  let carePlansCount = 0;
  const carePlansRef = collection(db, "carePlans");
  const carePlansConstraints = [
    where("organisationId", "==", organisationId),
    limit(500),
  ];
  if (serviceId) carePlansConstraints.push(where("serviceId", "==", serviceId));
  const carePlansQ = query(carePlansRef, ...carePlansConstraints);
  const carePlansSnap = await getDocs(carePlansQ);
  carePlansCount = carePlansSnap?.docs?.length ?? 0;

  // Patient timeline: clinical_note and assessment counts (proxy for clinical documentation)
  let clinicalNoteCount = 0;
  let assessmentCount = 0;
  const timelineRef = collection(db, "patient_timeline");
  const timelineConstraints = [
    where("organisationId", "==", organisationId),
    orderBy("createdAt", "desc"),
    limit(300),
  ];
  if (serviceId) timelineConstraints.splice(2, 0, where("serviceId", "==", serviceId));
  try {
    const timelineQ = query(timelineRef, ...timelineConstraints);
    const timelineSnap = await getDocs(timelineQ);
    const timelineDocs = timelineSnap?.docs ?? [];
    timelineDocs.forEach((d) => {
      const data = d?.data?.() ?? {};
      const et = data.eventType ?? "";
      if (et === "clinical_note") clinicalNoteCount += 1;
      if (et === "assessment") assessmentCount += 1;
    });
  } catch (_) {
    // Index may not exist; skip timeline-based metrics
  }

  return {
    incidents: incidentsList,
    evidence: evidenceList,
    actions: actionsList,
    carePlansCount,
    clinicalNoteCount,
    assessmentCount,
    stompMonitoredCount,
    stompCompliantCount,
  };
}

/**
 * Calculate domain scores (0–100) from raw data.
 */
function computeDomainScores(data) {
  const {
    incidents,
    evidence,
    actions,
    carePlansCount,
    clinicalNoteCount,
    assessmentCount,
    stompMonitoredCount,
    stompCompliantCount,
  } = data;

  const openIncidents = incidents.filter((i) => (i.status || "open") !== "closed");
  const safeguardingCount = incidents.filter((i) => (i.type || "") === "safeguarding");
  const openSafeguarding = safeguardingCount.filter((i) => (i.status || "open") !== "closed");
  const highSeverityCount = incidents.filter(
    (i) => (i.severity || "").toLowerCase() === "high" || (i.severity || "").toLowerCase() === "critical"
  );

  // —— SAFE: Start 100, subtract for unresolved incidents, safeguarding, high severity ——
  let safeScore = 100;
  safeScore -= Math.min(30, openIncidents.length * 5);
  safeScore -= Math.min(25, openSafeguarding.length * 8);
  safeScore -= Math.min(25, highSeverityCount.length * 6);
  safeScore = Math.max(0, Math.min(100, Math.round(safeScore)));

  // —— EFFECTIVE: Care plan updates, clinical docs, assessments ——
  const hasCarePlans = carePlansCount > 0;
  const effectiveEvidenceCount = evidence.filter(
    (e) => (e.domain || "").toLowerCase() === "effective"
  ).length;
  const effectiveScore = Math.min(
    100,
    Math.round(
      30 + (hasCarePlans ? 25 : 0) + Math.min(25, effectiveEvidenceCount * 8) + Math.min(20, (clinicalNoteCount + assessmentCount) * 2)
    )
  );
  const stompRatio =
    stompMonitoredCount > 0 ? stompCompliantCount / stompMonitoredCount : 1;
  const stompAdjustment = Math.round((stompRatio - 1) * 20); // up to -20 when non-compliant
  const effectiveScoreWithStomp = Math.max(0, Math.min(100, effectiveScore + stompAdjustment));

  // —— CARING: Evidence in caring domain, incident response (closed ratio) ——
  const caringEvidenceCount = evidence.filter((e) => (e.domain || "").toLowerCase() === "caring").length;
  const totalIncidents = incidents.length;
  const closedIncidents = incidents.filter((i) => (i.status || "") === "closed").length;
  const closureRatio = totalIncidents > 0 ? closedIncidents / totalIncidents : 1;
  const caringScore = Math.min(
    100,
    Math.round(40 + Math.min(30, caringEvidenceCount * 10) + Math.min(30, closureRatio * 30))
  );

  // —— RESPONSIVE: Action completion speed, incident closure ——
  const totalActions = actions.length;
  const completedActions = actions.filter((a) => (a.status || "").toLowerCase() === "completed" || (a.status || "").toLowerCase() === "closed").length;
  const actionCompletionRatio = totalActions > 0 ? completedActions / totalActions : 1;
  const responsiveScore = Math.min(
    100,
    Math.round(30 + Math.min(40, actionCompletionRatio * 40) + Math.min(30, closureRatio * 30))
  );

  // —— WELL-LED: Policy/evidence in well-led, governance (evidence + actions completed) ——
  const wellLedEvidenceCount = evidence.filter(
    (e) => (e.domain || "").toLowerCase() === "well-led"
  ).length;
  const wellLedScore = Math.min(
    100,
    Math.round(30 + Math.min(35, wellLedEvidenceCount * 12) + Math.min(35, actionCompletionRatio * 35))
  );

  return {
    safeScore,
    effectiveScore: effectiveScoreWithStomp,
    caringScore,
    responsiveScore,
    wellLedScore,
  };
}

/**
 * Calculate overall score (average of five domains) and persist to Firestore.
 * All queries and writes are scoped by organisationId and serviceId.
 *
 * @param {string} organisationId - Required.
 * @param {string} [serviceId] - If omitted, score is stored for org-level (serviceId stored as null).
 * @returns {Promise<{ safeScore, effectiveScore, caringScore, responsiveScore, wellLedScore, overallScore, calculatedAt }>}
 */
export async function calculateComplianceScore(organisationId, serviceId) {
  if (!organisationId?.trim()) {
    throw new Error("organisationId is required");
  }

  const data = await fetchScoringData(organisationId, serviceId || null);
  const domainScores = computeDomainScores(data);

  const overallScore = Math.round(
    (domainScores.safeScore +
      domainScores.effectiveScore +
      domainScores.caringScore +
      domainScores.responsiveScore +
      domainScores.wellLedScore) /
      5
  );

  const payload = {
    organisationId: organisationId.trim(),
    serviceId: serviceId && String(serviceId).trim() ? String(serviceId).trim() : null,
    safeScore: domainScores.safeScore,
    effectiveScore: domainScores.effectiveScore,
    caringScore: domainScores.caringScore,
    responsiveScore: domainScores.responsiveScore,
    wellLedScore: domainScores.wellLedScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    calculatedAt: serverTimestamp(),
  };

  const docId = getScoreDocId(organisationId, serviceId);
  const ref = doc(db, COMPLIANCE_SCORES_COLLECTION, docId);
  await setDoc(ref, payload);

  return {
    ...domainScores,
    overallScore: payload.overallScore,
    calculatedAt: payload.calculatedAt,
  };
}

/**
 * Get the latest compliance score for a service. Returns null if not yet calculated.
 * Optionally triggers calculation if missing.
 *
 * @param {string} organisationId
 * @param {string} [serviceId]
 * @param {{ calculateIfMissing?: boolean }} [options]
 */
export async function getComplianceScore(organisationId, serviceId, options = {}) {
  if (!organisationId?.trim()) return null;

  const docId = getScoreDocId(organisationId, serviceId);
  const ref = doc(db, COMPLIANCE_SCORES_COLLECTION, docId);
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(ref);

  if (snap?.exists?.()) {
    const d = snap.data?.() ?? {};
    return {
      id: snap.id,
      organisationId: d.organisationId ?? organisationId,
      serviceId: d.serviceId ?? null,
      safeScore: typeof d.safeScore === "number" ? d.safeScore : 0,
      effectiveScore: typeof d.effectiveScore === "number" ? d.effectiveScore : 0,
      caringScore: typeof d.caringScore === "number" ? d.caringScore : 0,
      responsiveScore: typeof d.responsiveScore === "number" ? d.responsiveScore : 0,
      wellLedScore: typeof d.wellLedScore === "number" ? d.wellLedScore : 0,
      overallScore: typeof d.overallScore === "number" ? d.overallScore : 0,
      calculatedAt: d.calculatedAt ?? null,
    };
  }

  if (options.calculateIfMissing) {
    const result = await calculateComplianceScore(organisationId, serviceId);
    return {
      id: docId,
      organisationId: organisationId.trim(),
      serviceId: serviceId && String(serviceId).trim() ? String(serviceId).trim() : null,
      safeScore: result.safeScore,
      effectiveScore: result.effectiveScore,
      caringScore: result.caringScore,
      responsiveScore: result.responsiveScore,
      wellLedScore: result.wellLedScore,
      overallScore: result.overallScore,
      calculatedAt: result.calculatedAt,
    };
  }

  return null;
}

/**
 * Fetch all compliance scores for an organisation (all services + org-level).
 * Use for dashboard or compliance overview.
 *
 * @param {string} organisationId
 * @returns {Promise<Array<{ id, organisationId, serviceId, safeScore, effectiveScore, caringScore, responsiveScore, wellLedScore, overallScore, calculatedAt }>>}
 */
export async function getComplianceScoresForOrganisation(organisationId) {
  if (!organisationId?.trim()) return [];

  const ref = collection(db, COMPLIANCE_SCORES_COLLECTION);
  const q = query(ref, where("organisationId", "==", organisationId.trim()));
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      organisationId: x.organisationId ?? organisationId,
      serviceId: x.serviceId ?? null,
      safeScore: typeof x.safeScore === "number" ? x.safeScore : 0,
      effectiveScore: typeof x.effectiveScore === "number" ? x.effectiveScore : 0,
      caringScore: typeof x.caringScore === "number" ? x.caringScore : 0,
      responsiveScore: typeof x.responsiveScore === "number" ? x.responsiveScore : 0,
      wellLedScore: typeof x.wellLedScore === "number" ? x.wellLedScore : 0,
      overallScore: typeof x.overallScore === "number" ? x.overallScore : 0,
      calculatedAt: x.calculatedAt ?? null,
    };
  });
}

/**
 * Non-blocking trigger to recalculate compliance for a service. Call after incident created/closed,
 * care plan updated, clinical note added, safeguarding created. Fire-and-forget.
 */
export function recalculateComplianceScoreAsync(organisationId, serviceId) {
  if (!organisationId?.trim()) return;
  calculateComplianceScore(organisationId, serviceId).catch((err) =>
    console.error("Compliance score recalculation failed:", err)
  );
}
