/**
 * Shared clinical types (mirror of `app/src/types/clinical.ts`).
 * Prefer importing from `app/src` in the Vite application.
 */

export type ClinicalStructuredFields = {
  behaviour?: string;
  mood?: string;
  engagement?: string;
  physicalHealth?: string;
  medicationIssues?: string;
  summary?: string;
  riskIndicators?: string[];
  incidents?: string[];
};

export type ClinicalNote = {
  id: string;
  patientId: string;

  discipline: string;
  category?: string;

  content: string;

  structured?: ClinicalStructuredFields;

  createdAt: unknown;
  authorEmail?: string;
};
