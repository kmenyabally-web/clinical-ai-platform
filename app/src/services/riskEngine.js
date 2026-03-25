/**
 * Keyword-based risk flags for clinical note text (stored via `risk_alerts`).
 * @param {{ correctedText?: string }} note
 * @returns {{ riskLevel: "LOW" | "MEDIUM" | "HIGH", requiresReview: boolean }}
 */
export function evaluateRisk(note) {
  const text = (note.correctedText || "").toLowerCase();

  let riskLevel = "LOW";

  if (text.includes("aggressive") || text.includes("violence")) {
    riskLevel = "HIGH";
  } else if (text.includes("refusing") || text.includes("non-compliant")) {
    riskLevel = "MEDIUM";
  }

  return {
    riskLevel,
    requiresReview: riskLevel !== "LOW",
  };
}
