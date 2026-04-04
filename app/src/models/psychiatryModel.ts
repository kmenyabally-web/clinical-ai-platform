/**
 * Structured psychiatry — collection `psychiatry_structured`.
 */

export interface PsychiatryMedicationRow {
  name: string;
  dose: string;
  changes: string;
}

export interface PsychiatryMse {
  mood: string;
  thought: string;
  perception: string;
  insight: string;
}

export interface PsychiatryData {
  patientId: string;
  diagnosis: string;
  medication: PsychiatryMedicationRow[];
  sideEffects: string;
  mse: PsychiatryMse;
  riskLevel: "low" | "medium" | "high";
  capacity: string;
}

export interface PsychiatryRecord extends PsychiatryData {
  id: string;
  organisationId: string;
  createdBy?: string;
  createdAt: unknown;
}
