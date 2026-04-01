/**
 * Behaviour risk scoring from structured notes stored in Firestore.
 * Deterministic rules — replace or extend when clinical governance updates thresholds.
 */

import type { ClinicalNote } from "../types/clinical";
import {
  BEHAVIOUR_TYPES_HIGH_RISK,
  BEHAVIOUR_TYPES_MEDIUM_RISK,
  normalizeLegacyBehaviourType,
} from "../constants/behaviours";

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
  /** ISO string — used by analytics / timelines; scoring ignores time. */
  clinicalTime?: string;
  eventAt?: unknown;
  createdAt?: unknown;
};

/**
 * Risk from structured behaviour events (used with clinical note risk for dashboards).
 */
const HIGH_RISK_TYPE_SET = new Set<string>(BEHAVIOUR_TYPES_HIGH_RISK);
const MEDIUM_RISK_TYPE_SET = new Set<string>(BEHAVIOUR_TYPES_MEDIUM_RISK);

export function calculateBehaviourRiskFromLogs(logs: BehaviourLogLike[]): RiskAssessment {
  let score = 0;
  let hasHighRiskBehaviourType = false;
  let hasMediumRiskBehaviourType = false;

  (logs ?? []).forEach((log) => {
    const sev = String(log?.severity ?? "").toLowerCase();
    if (sev === "high") score += 25;
    else if (sev === "medium") score += 15;
    else if (sev === "low") score += 5;

    if (log?.stompRelated === true) score += 10;
    if (log?.medicationRefused === true) score += 15;

    const canonical = normalizeLegacyBehaviourType(String(log?.behaviourType ?? ""));
    if (HIGH_RISK_TYPE_SET.has(canonical)) {
      score += 35;
      hasHighRiskBehaviourType = true;
    } else if (MEDIUM_RISK_TYPE_SET.has(canonical)) {
      score += 18;
      hasMediumRiskBehaviourType = true;
    }
  });

  let level: RiskLevel = "low";
  if (score > 60) level = "high";
  else if (score > 30) level = "medium";

  if (hasHighRiskBehaviourType) level = "high";
  else if (hasMediumRiskBehaviourType && level === "low") level = "medium";

  return { score: Math.min(score, 100), level };
}

/** Latest physical observation row shape (Firestore `physical_observations`). */
export type PhysicalObservationRiskLike = {
  riskLevel?: string;
  newsScore?: number;
};

/**
 * Extra risk weight from physical health monitoring (NEWS2-style).
 */
export function physicalHealthRiskAdjustment(
  observations: PhysicalObservationRiskLike[]
): { addScore: number; escalateToHigh: boolean } {
  if (!observations?.length) return { addScore: 0, escalateToHigh: false };
  const latest = observations[0];
  const rl = String(latest?.riskLevel ?? "").toLowerCase();
  const news = typeof latest?.newsScore === "number" ? latest.newsScore : null;

  if (rl === "high" || (news !== null && news >= 5)) {
    return { addScore: 35, escalateToHigh: true };
  }
  if (rl === "medium" || (news !== null && news >= 3)) {
    return { addScore: 18, escalateToHigh: false };
  }
  return { addScore: 0, escalateToHigh: false };
}

export function combineRiskWithPhysicalHealth(
  base: RiskAssessment,
  physical: ReturnType<typeof physicalHealthRiskAdjustment>
): RiskAssessment {
  let score = base.score + physical.addScore;
  let level: RiskLevel = base.level;
  if (physical.escalateToHigh) level = "high";
  else if (score > 60) level = "high";
  else if (score > 30) level = "medium";
  else level = "low";
  return { score: Math.min(score, 100), level };
}
