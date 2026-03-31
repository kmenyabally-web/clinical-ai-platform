import { analyzeSafeguardingIntelligence } from "../utils/safeguardingIntelligence";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasMedicationReviewDate(patient) {
  const direct = toDate(patient?.medicationReviewDate);
  if (direct) return true;
  const meds = Array.isArray(patient?.medications) ? patient.medications : [];
  return meds.some((m) => Boolean(toDate(m?.reviewDate)));
}

function appendSafeguardingInspectionInsight(insights, behaviours, incidents) {
  const { safeguardingRisk, recommendedAction } = analyzeSafeguardingIntelligence({
    behaviours: behaviours ?? [],
    incidents: incidents ?? [],
  });
  if (safeguardingRisk === "LOW") return;
  insights.push({
    domain: "SAFE",
    level: safeguardingRisk === "HIGH" ? "high" : "medium",
    message: "SAFE domain impacted due to safeguarding signals",
    action: recommendedAction,
  });
}

function appendBehaviourStructuredInsights(insights, behaviours) {
  if (!Array.isArray(behaviours) || behaviours.length === 0) return;

  const high = behaviours.filter((b) => String(b?.severity ?? "").toLowerCase() === "high");
  if (high.length >= 2) {
    insights.push({
      domain: "SAFE",
      level: "high",
      message: `${high.length} high-severity behaviour events on record`,
      action: "Review care plan, triggers, and multi-disciplinary follow-up",
    });
  } else if (high.length === 1) {
    insights.push({
      domain: "SAFE",
      level: "medium",
      message: "High-severity behaviour event recorded",
      action: "Review triggers and interventions",
    });
  }
  if (behaviours.some((b) => b?.medicationRefused === true)) {
    insights.push({
      domain: "SAFE",
      level: "medium",
      message: "Medication refusal recorded in structured behaviour log",
      action: "Review medicines administration and STOMP governance",
    });
  }
  if (behaviours.some((b) => b?.stompRelated === true)) {
    insights.push({
      domain: "EFFECTIVE",
      level: "medium",
      message: "STOMP-related behaviour event recorded",
      action: "Ensure psychotropic review and least-restraint practice is evidenced",
    });
  }
}

/** Insights derived only from structured behaviour logs (for behaviour capture UI). */
export function getBehaviourLogInsights(behaviours = []) {
  const insights = [];
  appendBehaviourStructuredInsights(insights, behaviours);
  return insights;
}

export function getInspectionInsights({
  patient,
  notes,
  policies,
  training,
  incidents,
  tasks = [],
  careType = null,
  mdtReviews,
  /** Structured behaviour log rows (collection `behaviours`). */
  behaviours = [],
}) {
  const insights = [];
  const ct = String(careType ?? "").toUpperCase();

  // SAFE / sector-specific
  if ((ct === "CARE_HOME" || ct === "DOMICILIARY_CARE") && Array.isArray(tasks) && tasks.length === 0) {
    insights.push({
      domain: "SAFE",
      level: "high",
      message: "No care tasks recorded — sector expects structured task evidence",
      action: "Add and complete shift-based care tasks",
    });
  }

  if (
    (ct === "MENTAL_HEALTH" || ct === "LD") &&
    mdtReviews !== undefined &&
    Array.isArray(mdtReviews) &&
    mdtReviews.length === 0
  ) {
    insights.push({
      domain: "EFFECTIVE",
      level: "high",
      message: "No MDT reviews recorded — clinical governance gap",
      action: "Schedule or document multi-disciplinary reviews",
    });
  }

  // SAFE DOMAIN — outstanding tasks (only when tasks exist)
  if (
    Array.isArray(tasks) &&
    tasks.length > 0 &&
    tasks.some((t) => String(t?.status ?? "").toLowerCase() === "pending")
  ) {
    insights.push({
      domain: "SAFE",
      level: "medium",
      message: "Pending care tasks detected",
      action: "Ensure all care tasks are completed",
    });
  }

  if (patient && !hasMedicationReviewDate(patient)) {
    insights.push({
      domain: "SAFE",
      level: "high",
      message: "Medication review missing — STOMP non-compliance risk",
      action: "Add medication review date",
    });
  }

  if (!Array.isArray(incidents) || incidents.length === 0) {
    insights.push({
      domain: "SAFE",
      level: "medium",
      message: "No incidents recorded — may indicate under-reporting",
      action: "Ensure incident logging is active",
    });
  }

  appendBehaviourStructuredInsights(insights, behaviours);
  appendSafeguardingInspectionInsight(insights, behaviours, incidents);

  // EFFECTIVE DOMAIN
  if (!Array.isArray(training) || training.length === 0) {
    insights.push({
      domain: "EFFECTIVE",
      level: "high",
      message: "No staff training records found",
      action: "Add staff training records",
    });
  }

  // WELL-LED DOMAIN
  if (!Array.isArray(policies) || policies.length === 0) {
    insights.push({
      domain: "WELL-LED",
      level: "high",
      message: "No policies found — governance risk",
      action: "Create organisational policies",
    });
  }

  // Keep notes in function contract for future expansion and dynamic context.
  void notes;
  return insights;
}

export function calculateCqcScore(insights) {
  let score = 100;
  (insights ?? []).forEach((i) => {
    if (i?.level === "high") score -= 20;
    if (i?.level === "medium") score -= 10;
  });
  return Math.max(score, 0);
}

export function calculateDomainScores(insights) {
  const domains = {
    SAFE: 100,
    EFFECTIVE: 100,
    CARING: 100,
    RESPONSIVE: 100,
    WELL_LED: 100,
  };

  (insights ?? []).forEach((i) => {
    const domainKey = String(i?.domain ?? "").replace("-", "_").toUpperCase();
    if (domains[domainKey] == null) return;
    if (i?.level === "high") domains[domainKey] -= 20;
    if (i?.level === "medium") domains[domainKey] -= 10;
  });

  Object.keys(domains).forEach((d) => {
    domains[d] = Math.max(domains[d], 0);
  });

  return domains;
}

export function calculateOverallScore(domainScores) {
  const values = Object.values(domainScores ?? {});
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}
