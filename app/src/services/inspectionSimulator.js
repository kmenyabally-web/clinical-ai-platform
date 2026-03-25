import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";
import { getComplianceScore, calculateComplianceScore } from "./complianceEngine";
import { fetchIncidents } from "./incidentService";
import { fetchComplianceActions } from "./complianceService";

export const INSPECTION_SIMULATIONS_COLLECTION = "inspection_simulations";

/** Official CQC rating scale. */
export const CQC_RATINGS = ["Outstanding", "Good", "Requires Improvement", "Inadequate"];

/**
 * Map a numeric score (0–100) to CQC rating.
 * Score ≥ 90 → Outstanding; 80–89 → Good; 65–79 → Requires Improvement; < 65 → Inadequate.
 */
export function scoreToRating(score) {
  const n = typeof score === "number" ? score : 0;
  if (n >= 90) return "Outstanding";
  if (n >= 80) return "Good";
  if (n >= 65) return "Requires Improvement";
  return "Inadequate";
}

/**
 * Overall inspection risk level from overall score or worst domain.
 * 90+ Low, 70–89 Medium, <70 High.
 */
export function getInspectionRiskLevel(overallScore, domainScores = []) {
  const overall = typeof overallScore === "number" ? overallScore : 0;
  const minDomain = domainScores.length
    ? Math.min(...domainScores.map((s) => (typeof s === "number" ? s : 0)))
    : overall;
  const effective = Math.min(overall, minDomain);
  if (effective >= 90) return "LOW RISK";
  if (effective >= 70) return "MEDIUM RISK";
  return "HIGH RISK";
}

/**
 * Generate risk areas from operational data. All inputs are scoped by organisationId/serviceId.
 */
function identifyRiskAreas(incidents, actions) {
  const areas = [];
  const openIncidents = (incidents || []).filter((i) => (i.status || "open") !== "closed");
  const openSafeguarding = openIncidents.filter((i) => (i.type || "").toLowerCase() === "safeguarding");
  const highSeverity = openIncidents.filter(
    (i) =>
      (i.severity || "").toLowerCase() === "high" ||
      (i.severity || "").toLowerCase() === "critical"
  );
  const openActions = (actions || []).filter(
    (a) => (a.status || "").toLowerCase() !== "completed" && (a.status || "").toLowerCase() !== "closed"
  );

  if (openIncidents.length > 3) {
    areas.push("High number of unresolved incidents");
  }
  if (openSafeguarding.length > 0) {
    areas.push("Open safeguarding concerns");
  }
  if (highSeverity.length > 0) {
    areas.push("High or critical severity incidents outstanding");
  }
  if (openActions.length > 5) {
    areas.push("Many outstanding compliance actions");
  }
  if (openIncidents.some((i) => !(i.actionsTaken || "").trim())) {
    areas.push("Incident investigations incomplete");
  }

  return areas;
}

/**
 * Generate recommendations from risk areas and domain ratings.
 */
function generateRecommendations(riskAreas, ratings) {
  const recs = [];
  const ratingKeys = ["safeRating", "effectiveRating", "caringRating", "responsiveRating", "wellLedRating"];
  const domainLabels = { safeRating: "Safe", effectiveRating: "Effective", caringRating: "Caring", responsiveRating: "Responsive", wellLedRating: "Well-led" };

  if (riskAreas.some((a) => a.toLowerCase().includes("incident"))) {
    recs.push("Improve incident investigation documentation");
    recs.push("Review incident investigation procedures");
  }
  if (riskAreas.some((a) => a.toLowerCase().includes("safeguarding"))) {
    recs.push("Review safeguarding processes");
    recs.push("Update safeguarding training");
  }
  if (riskAreas.some((a) => a.toLowerCase().includes("action"))) {
    recs.push("Complete outstanding compliance actions");
  }
  ratingKeys.forEach((key) => {
    const r = (ratings || {})[key];
    if (r === "Requires Improvement" || r === "Inadequate") {
      recs.push(`Strengthen ${domainLabels[key] || key} domain evidence and processes`);
    }
  });
  recs.push("Update care plans where review dates are due");
  recs.push("Ensure clinical notes and assessments are up to date");

  return [...new Set(recs)];
}

/**
 * Run a CQC inspection simulation for a service. Uses compliance_scores and operational data.
 * All queries filter by organisationId and serviceId.
 *
 * @param {string} organisationId - Required.
 * @param {string} [serviceId] - If omitted, uses org-level compliance score.
 * @returns {Promise<{ id, organisationId, serviceId, simulatedAt, safeRating, effectiveRating, caringRating, responsiveRating, wellLedRating, overallRating, riskAreas, recommendations, overallScore }>}
 */
export async function runInspectionSimulation(organisationId, serviceId) {
  if (!organisationId?.trim()) {
    throw new Error("organisationId is required");
  }

  let score = await getComplianceScore(organisationId, serviceId ?? undefined);
  if (!score) {
    await calculateComplianceScore(organisationId, serviceId ?? undefined);
    score = await getComplianceScore(organisationId, serviceId ?? undefined);
  }
  if (!score) {
    throw new Error("Could not obtain or calculate compliance scores");
  }

  const [incidents, actions] = await Promise.all([
    fetchIncidents(organisationId, { serviceId: serviceId ?? null }),
    fetchComplianceActions(organisationId, { serviceId: serviceId ?? null, limitCount: 200 }),
  ]);

  const safeRating = scoreToRating(score.safeScore);
  const effectiveRating = scoreToRating(score.effectiveScore);
  const caringRating = scoreToRating(score.caringScore);
  const responsiveRating = scoreToRating(score.responsiveScore);
  const wellLedRating = scoreToRating(score.wellLedScore);
  const overallScore = typeof score.overallScore === "number" ? score.overallScore : 0;
  const overallRating = scoreToRating(overallScore);

  const riskAreas = identifyRiskAreas(incidents, actions);
  const recommendations = generateRecommendations(riskAreas, {
    safeRating,
    effectiveRating,
    caringRating,
    responsiveRating,
    wellLedRating,
  });

  const ctx = await getUserContext();
  const tenant = tenantFieldsFromContext({
    organisationId: organisationId.trim(),
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);

  const payload = {
    organisationId: tenant.organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    serviceId: serviceId && String(serviceId).trim() ? String(serviceId).trim() : null,
    simulatedAt: serverTimestamp(),
    safeRating,
    effectiveRating,
    caringRating,
    responsiveRating,
    wellLedRating,
    overallRating,
    overallScore,
    riskAreas,
    recommendations,
  };

  const ref = collection(db, INSPECTION_SIMULATIONS_COLLECTION);
  const snap = await addDoc(ref, payload);

  return {
    id: snap.id,
    organisationId: payload.organisationId,
    serviceId: payload.serviceId,
    simulatedAt: payload.simulatedAt,
    safeRating,
    effectiveRating,
    caringRating,
    responsiveRating,
    wellLedRating,
    overallRating,
    overallScore,
    riskAreas,
    recommendations,
  };
}

/**
 * Get the latest inspection simulation for a service (for dashboard or display).
 * Queries filter by organisationId and serviceId.
 */
export async function getLatestSimulation(organisationId, serviceId) {
  if (!organisationId?.trim()) return null;

  const ref = collection(db, INSPECTION_SIMULATIONS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId.trim()),
    orderBy("simulatedAt", "desc"),
    limit(1),
  ];
  if (serviceId != null && serviceId !== "") {
    constraints.push(where("serviceId", "==", serviceId));
  } else {
    constraints.push(where("serviceId", "==", null));
  }

  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const d = docs[0];
  if (!d) return null;

  const x = d?.data?.() ?? {};
  return {
    id: d?.id ?? "",
    organisationId: x.organisationId ?? organisationId,
    serviceId: x.serviceId ?? null,
    simulatedAt: x.simulatedAt ?? null,
    safeRating: x.safeRating ?? "",
    effectiveRating: x.effectiveRating ?? "",
    caringRating: x.caringRating ?? "",
    responsiveRating: x.responsiveRating ?? "",
    wellLedRating: x.wellLedRating ?? "",
    overallRating: x.overallRating ?? "",
    overallScore: typeof x.overallScore === "number" ? x.overallScore : 0,
    riskAreas: Array.isArray(x.riskAreas) ? x.riskAreas : [],
    recommendations: Array.isArray(x.recommendations) ? x.recommendations : [],
  };
}
