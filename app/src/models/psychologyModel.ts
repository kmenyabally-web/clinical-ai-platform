/**
 * Psychology tracking (structured) — collection `psychology_tracking`.
 * Complements formulation narrative; used for CPA / MDT / risk V2.
 */

export interface PsychologyData {
  patientId: string;
  triggers: string[];
  copingStrategies: string[];
  therapyEngagement: "good" | "partial" | "poor";
  behaviourPatterns: string;
  riskFormulation: string;
}

export interface PsychologyTrackingRecord extends PsychologyData {
  id: string;
  organisationId: string;
  createdBy?: string;
  createdAt: unknown;
}
