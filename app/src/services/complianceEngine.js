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
import { orgPatientsCollection } from "../utils/tenantCollections";
import { fetchIncidents } from "./incidentService";
import { fetchEvidence } from "./evidenceService";
import { fetchComplianceActions } from "./complianceService";
import { listWardsForOrganisation } from "./structureService";

export const COMPLIANCE_SCORES_COLLECTION = "compliance_scores";

/** CQC domain keys used in scoring. */
export const CQC_DOMAINS = ["safe", "effective", "caring", "responsive", "wellLed"];
export const COMPLIANCE_RULE_WEIGHTS = {
  notesCompletion: 20,
  capacityAssessments: 20,
  carePlans: 20,
  mdtReviews: 20,
  incidentsLogging: 20,
};

/** Score band colours: 90-100 green, 70-89 amber, below 70 red. */
export function getScoreBand(score) {
  const n = typeof score === "number" ? score : 0;
  if (n >= 90) return "green";
  if (n >= 70) return "amber";
  return "red";
}

export function getComplianceStatus(score) {
  const n = typeof score === "number" ? score : 0;
  if (n >= 80) return "Good";
  if (n >= 60) return "Warning";
  return "Risk";
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
    fetchIncidents(organisationId, {}),
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
    const patientsRef = orgPatientsCollection(db, organisationId);
    const patientsConstraints = [limit(1000)];
    if (serviceId) patientsConstraints.unshift(where("serviceId", "==", serviceId));
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
  const carePlansRef = collection(db, "care_plans");
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

  // Notes + capacity + MDT summaries
  let notesCount = 0;
  let capacityCompletedCount = 0;
  let mdtReviewsCount = 0;
  try {
    const [notesSnap, capacitySnap, mdtSnap] = await Promise.all([
      getDocs(query(collection(db, "notes"), where("organisationId", "==", organisationId), limit(1000))).catch(() => null),
      getDocs(query(collection(db, "capacityAssessments"), where("organisationId", "==", organisationId), limit(1000))).catch(() => null),
      getDocs(query(collection(db, "mdt_summaries"), where("organisationId", "==", organisationId), limit(1000))).catch(() => null),
    ]);
    notesCount = notesSnap?.docs?.length ?? 0;
    capacityCompletedCount = (capacitySnap?.docs ?? []).filter((d) => {
      const x = d?.data?.() ?? {};
      return String(x.status ?? "completed").toLowerCase() !== "pending";
    }).length;
    mdtReviewsCount = mdtSnap?.docs?.length ?? 0;
  } catch {
    notesCount = 0;
    capacityCompletedCount = 0;
    mdtReviewsCount = 0;
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
    notesCount,
    capacityCompletedCount,
    mdtReviewsCount,
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
    notesCount,
    capacityCompletedCount,
    mdtReviewsCount,
  } = data;
  const patientCount = Math.max(1, Number(data?.patientCount ?? 0));

  const openIncidents = incidents.filter((i) => (i.status || "open") !== "closed");
  const totalIncidents = incidents.length;
  const incidentLoggingRatio =
    totalIncidents === 0
      ? 1
      : incidents.filter((i) => {
          const hasCore = Boolean(String(i?.patientId ?? "").trim() && String(i?.severity ?? "").trim());
          const hasDesc = Boolean(String(i?.description ?? i?.title ?? "").trim());
          return hasCore && hasDesc;
        }).length / totalIncidents;

  const notesCompletionScore = Math.round(Math.min(100, (notesCount / patientCount) * 100));
  const capacityAssessmentsScore = Math.round(Math.min(100, (capacityCompletedCount / patientCount) * 100));
  const carePlansScore = Math.round(Math.min(100, (carePlansCount / patientCount) * 100));
  const mdtReviewsScore = Math.round(Math.min(100, (mdtReviewsCount / patientCount) * 100));
  const incidentsLoggingScore = Math.round(Math.min(100, incidentLoggingRatio * 100));

  // Backward-compatible domain mapping for existing UI cards.
  const safeScore = incidentsLoggingScore;
  const effectiveScore = notesCompletionScore;
  const caringScore = carePlansScore;
  const responsiveScore = capacityAssessmentsScore;
  const wellLedScore = mdtReviewsScore;

  const weightedOverall =
    (notesCompletionScore * COMPLIANCE_RULE_WEIGHTS.notesCompletion +
      capacityAssessmentsScore * COMPLIANCE_RULE_WEIGHTS.capacityAssessments +
      carePlansScore * COMPLIANCE_RULE_WEIGHTS.carePlans +
      mdtReviewsScore * COMPLIANCE_RULE_WEIGHTS.mdtReviews +
      incidentsLoggingScore * COMPLIANCE_RULE_WEIGHTS.incidentsLogging) /
    100;

  return {
    safeScore,
    effectiveScore,
    caringScore,
    responsiveScore,
    wellLedScore,
    notesCompletionScore,
    capacityAssessmentsScore,
    carePlansScore,
    mdtReviewsScore,
    incidentsLoggingScore,
    weightedOverall,
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
  data.patientCount = await (async () => {
    try {
      const constraints = [limit(1000)];
      if (serviceId) constraints.unshift(where("serviceId", "==", String(serviceId).trim()));
      const q = query(orgPatientsCollection(db, organisationId), ...constraints);
      const snap = await getDocs(q);
      return snap?.docs?.length ?? 0;
    } catch {
      return 0;
    }
  })();
  const domainScores = computeDomainScores(data);

  const overallScore = Math.round(domainScores.weightedOverall);

  const payload = {
    organisationId: organisationId.trim(),
    serviceId: serviceId && String(serviceId).trim() ? String(serviceId).trim() : null,
    safeScore: domainScores.safeScore,
    effectiveScore: domainScores.effectiveScore,
    caringScore: domainScores.caringScore,
    responsiveScore: domainScores.responsiveScore,
    wellLedScore: domainScores.wellLedScore,
    notesCompletionScore: domainScores.notesCompletionScore,
    capacityAssessmentsScore: domainScores.capacityAssessmentsScore,
    carePlansScore: domainScores.carePlansScore,
    mdtReviewsScore: domainScores.mdtReviewsScore,
    incidentsLoggingScore: domainScores.incidentsLoggingScore,
    overallScore: Math.max(0, Math.min(100, overallScore)),
    status: getComplianceStatus(Math.max(0, Math.min(100, overallScore))),
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
      status: typeof d.status === "string" ? d.status : getComplianceStatus(typeof d.overallScore === "number" ? d.overallScore : 0),
      notesCompletionScore: typeof d.notesCompletionScore === "number" ? d.notesCompletionScore : 0,
      capacityAssessmentsScore: typeof d.capacityAssessmentsScore === "number" ? d.capacityAssessmentsScore : 0,
      carePlansScore: typeof d.carePlansScore === "number" ? d.carePlansScore : 0,
      mdtReviewsScore: typeof d.mdtReviewsScore === "number" ? d.mdtReviewsScore : 0,
      incidentsLoggingScore: typeof d.incidentsLoggingScore === "number" ? d.incidentsLoggingScore : 0,
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
      status: getComplianceStatus(result.overallScore),
      notesCompletionScore: result.notesCompletionScore ?? 0,
      capacityAssessmentsScore: result.capacityAssessmentsScore ?? 0,
      carePlansScore: result.carePlansScore ?? 0,
      mdtReviewsScore: result.mdtReviewsScore ?? 0,
      incidentsLoggingScore: result.incidentsLoggingScore ?? 0,
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
      status: typeof x.status === "string" ? x.status : getComplianceStatus(typeof x.overallScore === "number" ? x.overallScore : 0),
      notesCompletionScore: typeof x.notesCompletionScore === "number" ? x.notesCompletionScore : 0,
      capacityAssessmentsScore: typeof x.capacityAssessmentsScore === "number" ? x.capacityAssessmentsScore : 0,
      carePlansScore: typeof x.carePlansScore === "number" ? x.carePlansScore : 0,
      mdtReviewsScore: typeof x.mdtReviewsScore === "number" ? x.mdtReviewsScore : 0,
      incidentsLoggingScore: typeof x.incidentsLoggingScore === "number" ? x.incidentsLoggingScore : 0,
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

export async function getWardComplianceScores(organisationId) {
  const org = String(organisationId ?? "").trim();
  if (!org) return [];
  const wards = await listWardsForOrganisation(org).catch(() => []);
  const wardList = Array.isArray(wards) ? wards : [];
  const [notesSnap, capSnap, carePlansSnap, mdtSnap] = await Promise.all([
    getDocs(query(collection(db, "notes"), where("organisationId", "==", org), limit(2000))).catch(() => null),
    getDocs(query(collection(db, "capacityAssessments"), where("organisationId", "==", org), limit(2000))).catch(() => null),
    getDocs(query(collection(db, "care_plans"), where("organisationId", "==", org), limit(2000))).catch(() => null),
    getDocs(query(collection(db, "mdt_summaries"), where("organisationId", "==", org), limit(2000))).catch(() => null),
  ]);
  const incidents = await fetchIncidents(org, {}).catch(() => []);
  const patientsSnap = await getDocs(query(orgPatientsCollection(db, org), limit(2000))).catch(() => null);
  const patients = (patientsSnap?.docs ?? []).map((d) => d.data() ?? {});
  const notes = (notesSnap?.docs ?? []).map((d) => d.data() ?? {});
  const caps = (capSnap?.docs ?? []).map((d) => d.data() ?? {});
  const carePlans = (carePlansSnap?.docs ?? []).map((d) => d.data() ?? {});
  const mdts = (mdtSnap?.docs ?? []).map((d) => d.data() ?? {});
  const incidentRows = Array.isArray(incidents) ? incidents : [];

  return wardList.map((w) => {
    const wid = String(w?.id ?? "").trim();
    const patientCount = patients.filter((p) => String(p?.wardId ?? "").trim() === wid).length;
    const denom = Math.max(1, patientCount);
    const notesScore = Math.min(100, Math.round((notes.filter((n) => String(n?.wardId ?? "").trim() === wid).length / denom) * 100));
    const capScore = Math.min(
      100,
      Math.round(
        (caps.filter((x) => String(x?.wardId ?? "").trim() === wid && String(x?.status ?? "completed").toLowerCase() !== "pending").length / denom) * 100
      )
    );
    const carePlanScore = Math.min(100, Math.round((carePlans.filter((x) => String(x?.wardId ?? "").trim() === wid).length / denom) * 100));
    const mdtScore = Math.min(100, Math.round((mdts.filter((x) => String(x?.wardId ?? "").trim() === wid).length / denom) * 100));
    const wardIncidents = incidentRows.filter((x) => String(x?.wardId ?? "").trim() === wid);
    const incidentScore =
      wardIncidents.length === 0
        ? 100
        : Math.round(
            (wardIncidents.filter((i) => {
              const hasCore = Boolean(String(i?.patientId ?? "").trim() && String(i?.severity ?? "").trim());
              const hasDesc = Boolean(String(i?.description ?? i?.title ?? "").trim());
              return hasCore && hasDesc;
            }).length /
              wardIncidents.length) *
              100
          );
    const wardScore = Math.round((notesScore + capScore + carePlanScore + mdtScore + incidentScore) / 5);
    return {
      wardId: wid,
      wardName: String(w?.name ?? wid),
      wardScore,
      status: getComplianceStatus(wardScore),
      notesCompletionScore: notesScore,
      capacityAssessmentsScore: capScore,
      carePlansScore: carePlanScore,
      mdtReviewsScore: mdtScore,
      incidentsLoggingScore: incidentScore,
    };
  });
}
