/**
 * Structured nursing observation — stored in `nursing_observations`.
 * V2 adds structured ADLs and physicalHealth; legacy string `adls` / `notes` still supported when reading old docs.
 */

export type NursingObservationLevel = "1:1" | "intermittent" | "general";

export interface NursingAdls {
  washing: "independent" | "assisted";
  dressing: "independent" | "assisted";
  hygiene: "good" | "poor";
}

export type NursingMedicationAdherence = "yes" | "partial" | "no";
export type NursingNutrition = "good" | "poor";
export type NursingHydration = "adequate" | "low";
export type NursingSleep = "good" | "disturbed";
export type NursingRiskLevel = "low" | "medium" | "high";

export interface NursingObservation {
  id: string;
  patientId: string;
  organisationId: string;

  /** Normalised V2 values or legacy free text from older records. */
  observationLevel: string;
  /** Structured ADLs (V2) or legacy single-line summary string. */
  adls: NursingAdls | string;
  nutrition: string;
  hydration: string;
  sleep: string;
  medicationAdherence: string;
  riskLevel: string;
  /** V2: physical / clinical notes; legacy docs may only have `notes`. */
  physicalHealth: string;
  /** Retained for backwards compatibility when present in Firestore. */
  continence?: string;
  notes?: string;

  createdAt: unknown;
}
