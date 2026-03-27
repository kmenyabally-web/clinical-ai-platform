/**
 * Subscription tiers — feature matrix for organisation-scoped gating.
 * Billing (Stripe) maps to these keys; see {@link ../utils/featureAccess.ts}.
 */
export type PlanKey = "BASIC" | "PRO" | "ENTERPRISE";

export type FeatureId = "notes" | "ai" | "risk" | "reports" | "audit" | "tasks";

export const PLANS = {
  BASIC: {
    name: "Basic",
    price: 0,
    features: ["notes"] as const,
  },
  PRO: {
    name: "Pro",
    price: 49,
    features: ["notes", "ai", "risk", "tasks"] as const,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 199,
    features: ["notes", "ai", "risk", "reports", "audit", "tasks"] as const,
  },
} as const;
