/**
 * Mirror of `app/src/utils/riskEngine.ts` — use `app/src` in the Vite app.
 */
import type { ClinicalNote } from "./types/clinical";

export type RiskLevel = "low" | "medium" | "high";

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
};

export function calculateRisk(notes: ClinicalNote[]): RiskAssessment {
  let score = 0;

  notes.forEach((n) => {
    const ri = n.structured?.riskIndicators;
    if (ri?.includes("aggression")) score += 20;
    if (ri?.includes("self-harm")) score += 25;
    if (ri?.includes("medication refusal")) score += 15;
    if (n.structured?.mood === "Agitated") score += 10;
    if (n.structured?.mood === "Distressed") score += 15;
  });

  let level: RiskLevel = "low";
  if (score > 60) level = "high";
  else if (score > 30) level = "medium";

  return { score, level };
}
