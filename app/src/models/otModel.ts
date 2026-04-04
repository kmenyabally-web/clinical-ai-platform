/**
 * Structured occupational therapy — collection `ot_structured`.
 */

export interface OTData {
  patientId: string;
  adlScore: number;
  independenceLevel: "low" | "medium" | "high";
  activityParticipation: string;
  routineStructure: string;
  cognitiveFunction: string;
  dischargeReadiness: string;
}

export interface OTRecord extends OTData {
  id: string;
  organisationId: string;
  createdBy?: string;
  createdAt: unknown;
}
