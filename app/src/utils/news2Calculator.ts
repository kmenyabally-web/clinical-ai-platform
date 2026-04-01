/**
 * Simplified NEWS2-style score from key vitals (governance helper — not a full NHS NEWS2 engine).
 */

export type VitalsForNews = {
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  temperature?: number | null;
  pulse?: number | null;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function calculateNEWS2(vitals: VitalsForNews): number {
  let score = 0;
  const rr = num(vitals.respiratoryRate);
  const spo2 = num(vitals.oxygenSaturation);
  const temp = num(vitals.temperature);
  const pulse = num(vitals.pulse);

  if (rr !== null && rr > 25) score += 3;
  if (spo2 !== null && spo2 < 92) score += 3;
  if (temp !== null && temp > 38) score += 1;
  if (pulse !== null && pulse > 120) score += 2;

  return score;
}

export type NewsRiskLevel = "low" | "medium" | "high";

export function getRiskLevel(score: number): NewsRiskLevel {
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}
