/**
 * CPA prompt engine — section-based generation only; discipline-specific templates;
 * optional clinical context injected separately from Patient Data JSON.
 */

import type { CpaPromptPatientData } from "./cpaPatientDataTypes";
import {
  nursingPrompt,
  otPrompt,
  psychiatryPrompt,
  psychologyPrompt,
  saltPrompt,
} from "./cpaPrompts";
import { CPA_PRESERVE_DISCIPLINE_FORMATS_HEADER } from "./preserveDisciplineFormatsPolicy";

export type CpaPromptDiscipline =
  | "psychology"
  | "psychiatry"
  | "nursing"
  | "occupational_therapist"
  | "speech_language_therapist";

/** Extra context (Sanctum LD/MH/ward/org block, or structured meta). Injected before Patient Data. */
export type CpaPromptContext = string | Record<string, unknown> | null | undefined;

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

function formatContextBlock(context: CpaPromptContext): string {
  if (context == null) return "";
  if (typeof context === "string") {
    const t = context.trim();
    return t;
  }
  if (typeof context === "object") {
    try {
      return JSON.stringify(context, null, 2);
    } catch {
      return "";
    }
  }
  return "";
}

/**
 * Insert additional context immediately before the `Patient Data:` block (or append if marker missing).
 */
function injectContextBeforePatientData(basePrompt: string, contextBlock: string): string {
  if (!contextBlock.trim()) return basePrompt;
  const marker = "\nPatient Data:\n";
  const idx = basePrompt.indexOf(marker);
  const injection = `ADDITIONAL CONTEXT (apply together with Patient Data; section output only):\n${contextBlock}\n`;
  if (idx === -1) {
    return `${basePrompt}\n\n${injection}`;
  }
  return `${basePrompt.slice(0, idx)}\n\n${injection}${basePrompt.slice(idx)}`;
}

function disciplineBasePrompt(
  discipline: CpaPromptDiscipline,
  sectionName: string,
  patientData: CpaPromptPatientData
): string {
  switch (discipline) {
    case "nursing":
      return nursingPrompt(sectionName, patientData);
    case "psychiatry":
      return psychiatryPrompt(sectionName, patientData);
    case "psychology":
      return psychologyPrompt(sectionName, patientData);
    case "occupational_therapist":
      return otPrompt(sectionName, patientData);
    case "speech_language_therapist":
      return saltPrompt(sectionName, patientData);
    default:
      throw new Error("Unsupported discipline");
  }
}

/**
 * Build a single-section CPA prompt for Gemini.
 *
 * @param discipline — nursing | psychiatry | psychology | occupational_therapist | speech_language_therapist (aliases normalised)
 * @param sectionName — CPA section title to generate
 * @param patientData — JSON-serialised slice for this section + aggregates
 * @param context — optional Sanctum / org / ward / pathway context (never replaces Patient Data)
 */
export function buildPrompt(
  discipline: CpaPromptDiscipline | string,
  sectionName: string,
  patientData: CpaPromptPatientData,
  context?: CpaPromptContext
): string {
  const d =
    typeof discipline === "string" ? normalizeCpaDisciplineForPrompt(discipline) : discipline;
  const base = disciplineBasePrompt(d, sectionName, patientData);
  const block = formatContextBlock(context);
  const withContext = injectContextBeforePatientData(base, block);
  return `${CPA_PRESERVE_DISCIPLINE_FORMATS_HEADER}\n\n${withContext}`;
}

/**
 * @deprecated Use {@link buildPrompt} with explicit `context` when available.
 */
export function buildCPAPrompt(
  discipline: CpaPromptDiscipline,
  sectionName: string,
  patientData: CpaPromptPatientData
): string {
  return buildPrompt(discipline, sectionName, patientData, undefined);
}
