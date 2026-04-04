/**
 * Plain-text blocks for MDT / CPA summary from structured discipline records (V2).
 */

import type { PsychologyTrackingRecord } from "../models/psychologyModel";
import type { PsychiatryRecord } from "../models/psychiatryModel";
import type { OTRecord } from "../models/otModel";
import type { SALTRecord } from "../models/saltModel";

export function buildPsychologyTrackingSummary(p: PsychologyTrackingRecord | null): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.triggers?.length) lines.push(`Triggers: ${p.triggers.join("; ")}`);
  if (p.copingStrategies?.length) lines.push(`Coping strategies: ${p.copingStrategies.join("; ")}`);
  lines.push(`Therapy engagement: ${p.therapyEngagement}`);
  if (p.behaviourPatterns.trim()) lines.push(`Behaviour patterns: ${p.behaviourPatterns.trim()}`);
  if (p.riskFormulation.trim()) lines.push(`Risk formulation: ${p.riskFormulation.trim()}`);
  return lines.join("\n");
}

export function buildPsychiatryStructuredSummary(p: PsychiatryRecord | null): string {
  if (!p) return "";
  const medLines = (p.medication ?? [])
    .filter((m) => m.name.trim() || m.dose.trim() || m.changes.trim())
    .map((m) => `${m.name.trim() || "—"} — ${m.dose.trim() || "—"} (changes: ${m.changes.trim() || "—"})`);
  const lines = [
    p.diagnosis.trim() ? `Diagnosis: ${p.diagnosis.trim()}` : "",
    medLines.length ? `Medication:\n${medLines.join("\n")}` : "",
    p.sideEffects.trim() ? `Side effects: ${p.sideEffects.trim()}` : "",
    `MSE — mood: ${p.mse.mood || "—"}; thought: ${p.mse.thought || "—"}; perception: ${p.mse.perception || "—"}; insight: ${p.mse.insight || "—"}`,
    `Risk level: ${p.riskLevel}`,
    p.capacity.trim() ? `Capacity: ${p.capacity.trim()}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildOTStructuredSummary(p: OTRecord | null): string {
  if (!p) return "";
  return [
    `ADL score: ${p.adlScore}`,
    `Independence level: ${p.independenceLevel}`,
    p.activityParticipation.trim() ? `Activity participation: ${p.activityParticipation.trim()}` : "",
    p.routineStructure.trim() ? `Routine / structure: ${p.routineStructure.trim()}` : "",
    p.cognitiveFunction.trim() ? `Cognitive function: ${p.cognitiveFunction.trim()}` : "",
    p.dischargeReadiness.trim() ? `Discharge readiness: ${p.dischargeReadiness.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildSALTStructuredSummary(p: SALTRecord | null): string {
  if (!p) return "";
  return [
    `Communication: ${p.communicationLevel}`,
    `Understanding: ${p.understandingLevel}`,
    p.aidsUsed.trim() ? `Aids: ${p.aidsUsed.trim()}` : "",
    `Swallow risk: ${p.swallowRisk}`,
    p.dietLevel.trim() ? `Diet / texture: ${p.dietLevel.trim()}` : "",
    p.mealtimeSupport.trim() ? `Mealtime support: ${p.mealtimeSupport.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
