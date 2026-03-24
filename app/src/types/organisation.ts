import type { PlanKey } from "../constants/plans";

/**
 * Tenant / organisation record (Firestore `organisations/{id}`).
 */
export type Organisation = {
  id: string;
  name: string;
  /** Effective commercial tier; defaults to BASIC if absent (see feature gating). */
  plan?: PlanKey;
};
