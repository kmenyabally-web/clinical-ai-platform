/**
 * Behaviour risk scoring from structured notes stored in Firestore.
 * Deterministic rules — replace or extend when clinical governance updates thresholds.
 */

import type { ClinicalNote } from "../types/clinical";

export type RiskLevel = "low" | "medium" | "high";

export type RiskAssessment = {
  score: number;
  level: RiskLevel;
};

/**
 * Aggregates risk from structured clinical notes (same logic across all UI surfaces).
 */
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

/** Minimal shape for structured behaviour log rows (Firestore `behaviours`). */
export type BehaviourLogLike = {
  severity?: string;
  behaviourType?: string;
  stompRelated?: boolean;
  medicationRefused?: boolean;
};

/**
 * Risk from structured behaviour events (used with clinical note risk for dashboards).
 */
export function calculateBehaviourRiskFromLogs(logs: BehaviourLogLike[]): RiskAssessment {
  let score = 0;

  (logs ?? []).forEach((log) => {
    const sev = String(log?.severity ?? "").toLowerCase();
    if (sev === "high") score += 25;
    else if (sev === "medium") score += 15;
    else if (sev === "low") score += 5;

    if (log?.stompRelated === true) score += 10;
    if (log?.medicationRefused === true) score += 15;

    const t = String(log?.behaviourType ?? "");
    if (/self-harm|aggression/i.test(t)) score += 12;
  });

  let level: RiskLevel = "low";
  if (score > 60) level = "high";
  else if (score > 30) level = "medium";

  return { score: Math.min(score, 100), level };
}
