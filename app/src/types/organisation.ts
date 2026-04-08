import type { PlanKey } from "../constants/plans";

export type OrganisationType = "hospital" | "care_home" | "nursing_home" | "supported_living";

/**
 * Tenant / organisation record (Firestore `organisations/{id}`).
 */
export type Organisation = {
  id: string;
  name: string;
  type: OrganisationType;
  /** Effective commercial tier; defaults to BASIC if absent (see feature gating). */
  plan?: PlanKey;
};
