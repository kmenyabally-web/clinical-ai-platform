/**
 * Discipline-specific CPA prompt construction — routes to {@link ./cpaPrompts} (V4 strict templates).
 * Switch keys: psychology | psychiatry | nursing | occupational_therapist | speech_language_therapist
 */

import type { CpaPromptPatientData } from "./cpaPatientDataTypes";
import {
  nursingPrompt,
  otPrompt,
  psychiatryPrompt,
  psychologyPrompt,
  saltPrompt,
} from "./cpaPrompts";

export type CpaPromptDiscipline =
  | "psychology"
  | "psychiatry"
  | "nursing"
  | "occupational_therapist"
  | "speech_language_therapist";

/**
 * Map Firestore / UI discipline keys to prompt engine keys.
 */
export function normalizeCpaDisciplineForPrompt(raw: string | null | undefined): CpaPromptDiscipline {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (k === "nurse" || k === "nursing") return "nursing";
  if (k === "psychologist" || k === "psychology") return "psychology";
  if (k === "psychiatrist" || k === "psychiatry") return "psychiatry";
  if (k === "occupational_therapist" || k === "ot") return "occupational_therapist";
  if (k === "speech_language_therapist" || k === "salt" || k === "speech") return "speech_language_therapist";
  throw new Error("Unsupported discipline");
}

export function buildCPAPrompt(
  discipline: CpaPromptDiscipline,
  sectionName: string,
  patientData: CpaPromptPatientData
): string {
  switch (discipline) {
    case "psychology":
      return psychologyPrompt(sectionName, patientData);
    case "psychiatry":
      return psychiatryPrompt(sectionName, patientData);
    case "nursing":
      return nursingPrompt(sectionName, patientData);
    case "occupational_therapist":
      return otPrompt(sectionName, patientData);
    case "speech_language_therapist":
      return saltPrompt(sectionName, patientData);
    default:
      throw new Error("Unsupported discipline");
  }
}
