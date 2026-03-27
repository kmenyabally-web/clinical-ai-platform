export function predictInspectionRisk({ domainScores, insights, trend }) {
  let riskScore = 0;

  // DOMAIN WEIGHTING
  Object.entries(domainScores ?? {}).forEach(([, score]) => {
    if (score < 50) riskScore += 30;
    else if (score < 70) riskScore += 15;
  });

  // INSIGHT WEIGHTING
  (insights ?? []).forEach((i) => {
    if (i?.level === "high") riskScore += 20;
    if (i?.level === "medium") riskScore += 10;
  });

  // TREND IMPACT
  if (trend === "declining") riskScore += 20;
  if (trend === "improving") riskScore -= 10;

  // FINAL CLASSIFICATION
  if (riskScore >= 80) return "CRITICAL";
  if (riskScore >= 50) return "HIGH";
  if (riskScore >= 25) return "MODERATE";
  return "LOW";
}

export function explainPrediction({ insights }) {
  return (insights ?? [])
    .slice(0, 3)
    .map((i) => String(i?.message ?? "").trim())
    .filter(Boolean);
}
