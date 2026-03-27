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

export function getInspectionInsights({
  patient,
  notes,
  policies,
  training,
  incidents,
  tasks = [],
  careType = null,
  mdtReviews,
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
