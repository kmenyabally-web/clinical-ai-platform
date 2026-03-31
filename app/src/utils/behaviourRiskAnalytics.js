/**
 * Real-time behaviour risk signals (pattern, trend, alerts) from structured logs.
 * Expects `behaviours` sorted newest-first (e.g. from Firestore orderBy createdAt desc).
 */

function severityStr(b) {
  return String(b?.severity ?? "").trim();
}

/**
 * @param {Array<{ severity?: string, medicationRefused?: boolean }>} behaviours - valid structured rows, newest first
 * @returns {{
 *   recentBehaviours: typeof behaviours,
 *   highSeverity: number,
 *   mediumSeverity: number,
 *   medicationRefusal: number,
 *   patternDetected: boolean,
 *   riskTrend: "stable" | "increasing",
 *   alertTriggered: boolean,
 *   riskScore: number
 * }}
 */
export function analyseBehaviourRiskSignals(behaviours) {
  const list = Array.isArray(behaviours) ? behaviours : [];
  const recentBehaviours = list.slice(0, 5);

  const highSeverity = list.filter((b) => severityStr(b) === "High").length;
  const mediumSeverity = list.filter((b) => severityStr(b) === "Medium").length;
  const medicationRefusal = list.filter((b) => b?.medicationRefused === true).length;

  let patternDetected = false;
  if (recentBehaviours.length >= 2) {
    patternDetected = true;
  }

  let riskTrend = "stable";
  if (highSeverity >= 1 || medicationRefusal >= 1) {
    riskTrend = "increasing";
  }

  let alertTriggered = false;
  if (highSeverity >= 1 && medicationRefusal >= 1) {
    alertTriggered = true;
  }

  const riskScore = highSeverity * 30 + mediumSeverity * 10 + medicationRefusal * 20;

  return {
    recentBehaviours,
    highSeverity,
    mediumSeverity,
    medicationRefusal,
    patternDetected,
    riskTrend,
    alertTriggered,
    riskScore,
  };
}
