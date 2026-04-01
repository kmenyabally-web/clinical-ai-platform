/**
 * Real-time behaviour risk signals (pattern, trend, alerts) from structured logs.
 * Uses **clinical** time (`clinicalTime` / legacy `eventAt` / `createdAt`) for ordering and windows.
 */

import { getBehaviourClinicalTimeMs, sortBehavioursByClinicalTimeDesc } from "./behaviourClinicalTime";

function severityStr(b) {
  return String(b?.severity ?? "").trim();
}

/**
 * @param {Array<{ severity?: string, medicationRefused?: boolean, clinicalTime?: string, eventAt?: unknown, createdAt?: unknown }>} behaviours - valid structured rows
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
  const list = sortBehavioursByClinicalTimeDesc(Array.isArray(behaviours) ? behaviours : []);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  const recentBehaviours = list.slice(0, 5);

  const highSeverity = list.filter((b) => severityStr(b) === "High").length;
  const mediumSeverity = list.filter((b) => severityStr(b) === "Medium").length;
  const medicationRefusal = list.filter((b) => b?.medicationRefused === true).length;

  const inLastDay = list.filter((b) => {
    const t = getBehaviourClinicalTimeMs(b);
    return t > 0 && now - t <= dayMs;
  });

  let patternDetected = inLastDay.length >= 2;
  if (recentBehaviours.length >= 2 && !patternDetected) {
    patternDetected = true;
  }

  const highInWeek = list.filter((b) => {
    if (severityStr(b) !== "High") return false;
    const t = getBehaviourClinicalTimeMs(b);
    return t > 0 && now - t <= weekMs;
  }).length;

  let riskTrend = "stable";
  if (highInWeek >= 2 || highSeverity >= 2) {
    riskTrend = "increasing";
  } else if (highSeverity >= 1 || medicationRefusal >= 1) {
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
