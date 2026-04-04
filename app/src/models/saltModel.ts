/**
 * Structured SALT — collection `salt_structured`.
 */

export interface SALTData {
  patientId: string;
  communicationLevel: "verbal" | "non-verbal" | "limited";
  understandingLevel: "good" | "partial" | "poor";
  aidsUsed: string;
  swallowRisk: "low" | "medium" | "high";
  dietLevel: string;
  mealtimeSupport: string;
}

export interface SALTRecord extends SALTData {
  id: string;
  organisationId: string;
  createdBy?: string;
  createdAt: unknown;
}
