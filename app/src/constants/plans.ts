/**
 * Subscription tiers — feature matrix for organisation-scoped gating.
 * Billing (Stripe) maps to these keys; see {@link ../utils/featureAccess.ts}.
 */
export type PlanKey = "BASIC" | "PRO" | "ENTERPRISE";

export type FeatureId = "notes" | "ai" | "risk" | "reports" | "audit" | "tasks";

export const PLANS = {
  BASIC: {
    name: "Starter",
    price: 59,
    features: ["notes"] as const,
  },
  PRO: {
    name: "Professional",
    price: 99,
    features: ["notes", "ai", "risk", "tasks"] as const,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 249,
    features: ["notes", "ai", "risk", "reports", "audit", "tasks"] as const,
  },
} as const;
