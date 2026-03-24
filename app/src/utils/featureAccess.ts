import { PLANS, type PlanKey } from "../constants/plans";

/**
 * Maps legacy subscription labels and missing values to canonical plan keys.
 */
export function normalizePlanKey(raw: string | null | undefined): PlanKey {
  if (!raw) return "BASIC";
  const u = String(raw).trim().toUpperCase();
  if (u === "BASIC" || u === "STARTER") return "BASIC";
  if (u === "PRO" || u === "PROFESSIONAL") return "PRO";
  if (u === "ENTERPRISE") return "ENTERPRISE";
  return "BASIC";
}

/**
 * Whether the organisation's effective plan includes a feature slug from {@link PLANS}.*.features.
 */
export function hasFeature(plan: string | null | undefined, feature: string): boolean {
  const key = normalizePlanKey(plan);
  const def = PLANS[key];
  if (!def) return false;
  return (def.features as readonly string[]).includes(feature);
}
