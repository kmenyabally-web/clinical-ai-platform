/**
 * Safeguarding intelligence from structured behaviours + incidents (per-patient).
 */

function isAggressionBehaviour(b) {
  return /aggression/i.test(String(b?.behaviourType ?? ""));
}

/**
 * @param {{ behaviours?: unknown[], incidents?: unknown[] }} input
 * @returns {{
 *   safeguardingSignals: {
 *     aggressionCount: number,
 *     highSeverityCount: number,
 *     medicationRefusalCount: number,
 *     stompCount: number,
 *     incidentCount: number,
 *   },
 *   safeguardingRisk: "LOW" | "MEDIUM" | "HIGH",
 *   safeguardingAlert: string | null,
 *   recommendedAction: string,
 * }}
 */
export function analyzeSafeguardingIntelligence({ behaviours = [], incidents = [] } = {}) {
  const list = Array.isArray(behaviours) ? behaviours : [];
  const inc = Array.isArray(incidents) ? incidents : [];

  const aggressionCount = list.filter(isAggressionBehaviour).length;
  const highSeverityCount = list.filter((b) => String(b?.severity ?? "").trim() === "High").length;
  const medicationRefusalCount = list.filter((b) => b?.medicationRefused === true).length;
  const stompCount = list.filter((b) => b?.stompRelated === true).length;
  const incidentCount = inc.length;

  const safeguardingSignals = {
    aggressionCount,
    highSeverityCount,
    medicationRefusalCount,
    stompCount,
    incidentCount,
  };

  let safeguardingRisk = "LOW";

  if (highSeverityCount >= 1 || incidentCount >= 1) {
    safeguardingRisk = "MEDIUM";
  }

  if (
    highSeverityCount >= 2 ||
    aggressionCount >= 2 ||
    (medicationRefusalCount >= 1 && stompCount >= 1)
  ) {
    safeguardingRisk = "HIGH";
  }

  let safeguardingAlert = null;
  if (safeguardingRisk === "HIGH") {
    safeguardingAlert = "🚨 Safeguarding concern detected — immediate review required";
  } else if (safeguardingRisk === "MEDIUM") {
    safeguardingAlert = "⚠️ Potential safeguarding risk — monitor closely";
  }

  const recommendedAction =
    safeguardingRisk === "HIGH"
      ? "Immediate safeguarding review, duty manager notification, and MDT follow-up per policy."
      : safeguardingRisk === "MEDIUM"
        ? "Increase monitoring, review care plan and risk assessment, and document supervision decisions."
        : "Continue routine observation and proportionate recording.";

  return {
    safeguardingSignals,
    safeguardingRisk,
    safeguardingAlert,
    recommendedAction,
  };
}

/**
 * Short inspection-ready narrative (optional report block).
 */
export function buildSafeguardingSummary({ behaviours = [], incidents = [], result }) {
  const r = result ?? analyzeSafeguardingIntelligence({ behaviours, incidents });
  const s = r.safeguardingSignals;
  const recentBehaviours = (Array.isArray(behaviours) ? behaviours : []).slice(0, 5);
  const recentIncidents = (Array.isArray(incidents) ? incidents : []).slice(0, 5);

  const lines = [
    "Safeguarding Summary",
    `Risk level: ${r.safeguardingRisk}`,
    "",
    "Signals:",
    `· Aggression-related behaviours: ${s.aggressionCount}`,
    `· High-severity behaviour events: ${s.highSeverityCount}`,
    `· Medication refusals: ${s.medicationRefusalCount}`,
    `· STOMP-related behaviours: ${s.stompCount}`,
    `· Incidents logged: ${s.incidentCount}`,
    "",
    `Recommended action: ${r.recommendedAction}`,
    "",
    "Recent behaviours (sample):",
    ...recentBehaviours.map(
      (b) =>
        `· ${String(b?.behaviourType ?? "—")} (${String(b?.severity ?? "—")})${b?.medicationRefused ? " — medication refused" : ""}`
    ),
    "",
    "Recent incidents (sample):",
    ...recentIncidents.map((i) => `· ${String(i?.title ?? i?.id ?? "Incident")} (${String(i?.severity ?? "—")})`),
  ];

  return lines.join("\n");
}
