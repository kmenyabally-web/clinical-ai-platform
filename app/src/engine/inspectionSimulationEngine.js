/**
 * Real-time CQC inspection simulation — domain scores from operational data (deterministic rules).
 */

/**
 * @param {{
 *   incidents?: unknown[],
 *   highRiskBehaviours?: unknown[],
 *   medicationRefusals?: unknown[],
 *   training?: unknown[],
 *   carePlans?: unknown[],
 *   patientVoice?: unknown[],
 *   actions?: unknown[],
 *   policies?: unknown[],
 *   auditLogs?: unknown[],
 * }} data
 */
export function scoreSAFE(data) {
  let score = 100;
  if ((data.incidents?.length ?? 0) > 5) score -= 25;
  if ((data.highRiskBehaviours?.length ?? 0) > 3) score -= 20;
  if ((data.medicationRefusals?.length ?? 0) > 2) score -= 15;
  return Math.max(score, 0);
}

export function scoreEFFECTIVE(data) {
  let score = 100;
  if (!(data.training?.length > 0)) score -= 40;
  if (!(data.carePlans?.length > 0)) score -= 30;
  return Math.max(score, 0);
}

export function scoreCARING(data) {
  let score = 100;
  if (!(data.patientVoice?.length > 0)) score -= 30;
  return Math.max(score, 0);
}

export function scoreRESPONSIVE(data) {
  let score = 100;
  const inc = data.incidents?.length ?? 0;
  const actions = data.actions?.length ?? 0;
  if (inc > 3 && actions === 0) score -= 40;
  return Math.max(score, 0);
}

export function scoreWELL_LED(data) {
  let score = 100;
  if (!(data.policies?.length > 0)) score -= 50;
  if (!(data.auditLogs?.length > 0)) score -= 30;
  return Math.max(score, 0);
}

export function getRating(score) {
  if (score >= 80) return "GOOD";
  if (score >= 65) return "REQUIRES IMPROVEMENT";
  return "INADEQUATE";
}

/**
 * @param {{
 *   incidents?: unknown[],
 *   highRiskBehaviours?: unknown[],
 *   medicationRefusals?: unknown[],
 *   training?: unknown[],
 *   carePlans?: unknown[],
 *   patientVoice?: unknown[],
 *   actions?: unknown[],
 *   policies?: unknown[],
 *   auditLogs?: unknown[],
 * }} data
 */
export function runInspectionSimulation(data) {
  const SAFE = scoreSAFE(data);
  const EFFECTIVE = scoreEFFECTIVE(data);
  const CARING = scoreCARING(data);
  const RESPONSIVE = scoreRESPONSIVE(data);
  const WELL_LED = scoreWELL_LED(data);

  const overall = (SAFE + EFFECTIVE + CARING + RESPONSIVE + WELL_LED) / 5;

  return {
    domains: {
      SAFE,
      EFFECTIVE,
      CARING,
      RESPONSIVE,
      WELL_LED,
    },
    overallScore: overall,
    rating: getRating(overall),
  };
}

/**
 * @param {{ SAFE: number, EFFECTIVE: number, CARING: number, RESPONSIVE: number, WELL_LED: number }} scores
 */
export function getWarnings(scores) {
  const warnings = [];
  if (!scores) return warnings;
  if (scores.SAFE < 70) warnings.push("⚠️ High safety risk");
  if (scores.WELL_LED < 60) warnings.push("❌ Governance concerns");
  if (scores.EFFECTIVE < 65) warnings.push("⚠️ Effectiveness / training & care planning gaps");
  if (scores.CARING < 65) warnings.push("⚠️ Person-centred evidence may be insufficient");
  if (scores.RESPONSIVE < 65) warnings.push("⚠️ Responsiveness / incident response review");
  return warnings;
}

/**
 * Map {@link import("./cqcInspectionPack.js").mapEvidenceToDomains} output into simulation input.
 * @param {Record<string, Record<string, unknown[]>>} mapped
 */
export function buildSimulationInputFromMapped(mapped) {
  const safe = mapped?.SAFE ?? {};
  const effective = mapped?.EFFECTIVE ?? {};
  const caring = mapped?.CARING ?? {};
  const responsive = mapped?.RESPONSIVE ?? {};
  const well = mapped?.WELL_LED ?? {};

  const risk = [...(safe.riskNotes ?? []), ...(safe.behaviours ?? [])];

  return {
    incidents: safe.incidents ?? [],
    highRiskBehaviours: risk,
    medicationRefusals: safe.medicationIssues ?? [],
    training: effective.training ?? [],
    carePlans: effective.carePlans ?? [],
    patientVoice: caring.patientVoice ?? [],
    actions: responsive.responseActions ?? [],
    policies: well.policies ?? [],
    auditLogs: well.audits ?? [],
  };
}
