/**
 * Unified clinical data model — single source of truth for notes and future AI/risk payloads.
 */

export type ClinicalStructuredFields = {
  behaviour?: string;
  mood?: string;
  engagement?: string;
  /**
   * AI / clinical documentation summary of risk derived from `riskIndicators`.
   * (Optional: some legacy notes may only have `riskIndicators`.)
   */
  risk?: string;
  physicalHealth?: string;
  /** AI / clinical documentation — medication concerns */
  medicationIssues?: string;
  /** AI / clinical documentation progress statement derived from `summary`. */
  progress?: string;
  /** Short AI-generated synopsis */
  summary?: string;
  riskIndicators?: string[];
  incidents?: string[];
};

export type ClinicalSummary = {
  title: string;
  text: string;
};

export type ClinicalMdtReview = {
  discipline: string;
  summary: string;
  recommendations?: string[];
  risksToAddress?: string[];
  nextActions?: string[];
};

export type ClinicalReportSection = {
  title: string;
  content: string;
};

export type ClinicalReports = {
  cpa?: ClinicalReportSection;
  tribunal?: ClinicalReportSection;
  mdtReview?: ClinicalReportSection;
};

export type ClinicalCareFolder = {
  suggestedPlacements?: Array<{
    section: string;
    documentType: string;
    title: string;
    content: string;
  }>;
};

export type ClinicalStructuredData = ClinicalStructuredFields & {
  discipline?: string;
};

export type ClinicalNote = {
  id: string;
  patientId: string;

  discipline: string;
  category?: string;

  // Tenant scoping (denormalised for security rules + fast queries)
  organisationId?: string;
  hospitalId?: string;
  wardId?: string;

  /** Raw, staff-authored note text (source of truth; persisted as corrected narrative when AI runs). */
  content: string;
  /** Raw note text before AI correction (when stored). */
  originalText?: string;
  /** AI-corrected narrative (when stored). */
  correctedText?: string;

  /** AI daily-style summary line for this note. */
  aiSummary?: string | null;
  /** Top-level structured extraction (Gemini / engine). */
  behaviour?: string | null;
  risk?: string | null;
  engagement?: string | null;
  /** Top-level mood (Gemini / form). */
  mood?: string | null;

  structured?: ClinicalStructuredFields;

  /** AI corrected narrative version of `content` (never overwrites the raw note). */
  correctedNote?: string;

  /** AI structured payload (stored separately from the legacy `structured`). */
  structuredData?: ClinicalStructuredData | null;

  /** AI generated document sections used in Summaries / MDT Review views. */
  summaries?: ClinicalSummary[];

  /** AI generated MDT review notes (used in MDT Reviews tab). */
  mdtReview?: ClinicalMdtReview | null;

  /** AI generated report outputs (used in Reports tab and buttons). */
  reports?: ClinicalReports | null;

  /** AI suggested content placement for the care folder. */
  careFolder?: ClinicalCareFolder | null;

  createdAt: unknown;
  authorEmail?: string;

  // Author identity (stored for auditing & report generation)
  authorId?: string;
  authorRole?: string | null;
  /** MDT / clinical role of the author (from user profile at write time). */
  mdtRole?: string | null;
};
