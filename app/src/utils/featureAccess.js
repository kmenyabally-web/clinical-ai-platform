import { PLANS } from "../constants/plans";

export function normalizePlanKey(raw) {
  if (!raw) return "BASIC";
  const u = String(raw).trim().toUpperCase();
  if (u === "BASIC" || u === "STARTER" || u === "FREE") return "BASIC";
  if (u === "PRO" || u === "PROFESSIONAL") return "PRO";
  if (u === "ENTERPRISE") return "ENTERPRISE";
  return "BASIC";
}

export const hasFeature = (subscriptionOrPlan, feature) => {
  if (!subscriptionOrPlan || !feature) return false;

  // Pre-Stripe shape: { features: { evidencePack: true } }
  if (typeof subscriptionOrPlan === "object") {
    const value = subscriptionOrPlan?.features?.[feature];
    if (value === true) return true;
    const planFromSub = normalizePlanKey(subscriptionOrPlan?.plan ?? subscriptionOrPlan?.planName);
    return (PLANS[planFromSub]?.features ?? []).includes(feature);
  }

  // Existing shape: "BASIC" | "PRO" | "ENTERPRISE"
  const plan = normalizePlanKey(subscriptionOrPlan);
  return (PLANS[plan]?.features ?? []).includes(feature);
};
