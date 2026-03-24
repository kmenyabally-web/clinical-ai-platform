/**
 * Unified clinical data model — single source of truth for notes and future AI/risk payloads.
 */

export type ClinicalStructuredFields = {
  behaviour?: string;
  mood?: string;
  engagement?: string;
  physicalHealth?: string;
  /** AI / clinical documentation — medication concerns */
  medicationIssues?: string;
  /** Short AI-generated synopsis */
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
