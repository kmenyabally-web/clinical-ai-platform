/**
 * Discipline-specific CPA templates and role → template mapping.
 * Canonical keys match Firestore / UI: nurse, psychiatrist, psychologist, occupational_therapist, speech_language_therapist.
 */

import type { CpaTemplateSection } from "./nursingTemplate";
import { nursingTemplate } from "./nursingTemplate";
import { psychiatryTemplate } from "./psychiatryTemplate";
import { psychologyTemplate } from "./psychologyTemplate";
import { otTemplate } from "./otTemplate";
import { saltTemplate } from "./saltTemplate";

export type { CpaTemplateSection } from "./nursingTemplate";

export const reportMap: Record<
  "nurse" | "psychiatrist" | "psychologist" | "occupational_therapist" | "speech_language_therapist",
  CpaTemplateSection[]
> = {
  nurse: nursingTemplate,
  psychiatrist: psychiatryTemplate,
  psychologist: psychologyTemplate,
  occupational_therapist: otTemplate,
  speech_language_therapist: saltTemplate,
};

export type CpaDisciplineKey = keyof typeof reportMap;

export const CPA_DISCIPLINE_OPTIONS: { value: CpaDisciplineKey; label: string }[] = [
  { value: "nurse", label: "Nursing" },
  { value: "psychiatrist", label: "Psychiatry" },
  { value: "psychologist", label: "Psychology" },
  { value: "occupational_therapist", label: "Occupational Therapy" },
  { value: "speech_language_therapist", label: "Speech & Language Therapy" },
];

/**
 * Map {@link normalizeUserDiscipline} output to a CPA template key.
 */
export function mapCanonicalDisciplineToCpaKey(canonical: string | null | undefined): CpaDisciplineKey {
  const c = String(canonical ?? "")
    .trim()
    .toLowerCase();
  if (c === "psychiatrist") return "psychiatrist";
  if (c === "psychologist") return "psychologist";
  if (c === "ot") return "occupational_therapist";
  if (c === "salt" || c === "speech") return "speech_language_therapist";
  if (c === "doctor" || c === "medical") return "psychiatrist";
  if (c === "nurse" || c === "support_worker") return "nurse";
  return "nurse";
}

export function getCpaTemplateForDiscipline(key: CpaDisciplineKey): CpaTemplateSection[] {
  return reportMap[key] ?? nursingTemplate;
}

export function cpaDisciplineDisplayName(key: CpaDisciplineKey): string {
  const row = CPA_DISCIPLINE_OPTIONS.find((o) => o.value === key);
  return row?.label ?? key;
}
