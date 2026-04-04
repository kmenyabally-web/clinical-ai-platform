/**
 * Structured recommendations for clinical reports (risk, MDT, and discipline triggers).
 */

export type RecommendationInput = {
  risk?: { overallRisk?: string } | null;
  psychiatry?: { medication?: unknown[] } | null;
  abcLogs?: unknown[] | null;
  formulation?: unknown | null;
  ot?: { independenceLevel?: string } | null;
  salt?: { swallowRisk?: string } | null;
};

export function buildRecommendations(data: RecommendationInput): string[] {
  const recommendations: string[] = [];

  if (String(data.risk?.overallRisk ?? "").toLowerCase() === "high") {
    recommendations.push("Urgent MDT review is recommended due to elevated risk.");
  }

  if (Array.isArray(data.psychiatry?.medication) && data.psychiatry.medication.length > 0) {
    recommendations.push("Continue to monitor medication adherence and review effectiveness.");
  }

  if (Array.isArray(data.abcLogs) && data.abcLogs.length > 0) {
    recommendations.push("Maintain behavioural monitoring and reinforce de-escalation strategies.");
  }

  if (data.formulation != null && typeof data.formulation === "object") {
    recommendations.push("Continue psychological interventions targeting identified triggers.");
  }

  if (String(data.ot?.independenceLevel ?? "").toLowerCase() === "low") {
    recommendations.push("Increase occupational therapy input to support functional independence.");
  }

  if (String(data.salt?.swallowRisk ?? "").toLowerCase() === "high") {
    recommendations.push("Immediate SALT review required due to swallowing risk.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Continue current care plan with routine MDT review.");
  }

  return recommendations;
}
