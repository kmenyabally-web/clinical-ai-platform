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

/** AI Reports (CPA / Tribunal / MDT) — nine narrative sections, no raw JSON in UI. */
export type StructuredClinicalReportSections = {
  patientOverview: string;
  currentPresentation: string;
  riskAssessment: string;
  incidentsSummary: string;
  behaviourAnalysis: string;
  medicationCompliance: string;
  MDTObservations: string;
  legalContext: string;
  recommendation: string;
};

export type StructuredClinicalReport = {
  title: string;
  summary: string;
  sections: StructuredClinicalReportSections;
  recommendations: string[];
};

/** MDT Ward Round — discipline summaries + plan (AI Reports / Patient detail). */
export type MdtWardRoundReport = {
  kind: "mdtWardRound";
  title: string;
  sections: {
    nursingSummary: string;
    psychiatrySummary: string;
    psychologySummary: string;
    otSummary: string;
    saltSummary: string;
    supportSummary: string;
    overallSummary: string;
    riskLevel: string;
    plan: string;
  };
};

/** Management hearing — governance-facing sections. */
export type ManagementHearingReport = {
  kind: "managementHearing";
  title: string;
  sections: {
    patientBackground: string;
    currentConcerns: string;
    incidentSummary: string;
    riskAssessment: string;
    legalStatus: string;
    recommendation: string;
  };
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

/** Snapshot of note body before a draft edit (pre-approval audit trail). */
export type ClinicalNoteVersionEntry = {
  content: string;
  updatedBy: string;
  updatedAt: unknown;
};

/** Legal addendum appended after finalisation; never replaces original note text. */
export type ClinicalNoteAddendumEntry = {
  id: string;
  content: string;
  createdBy: string;
  role: string;
  createdAt: unknown;
  /** Denormalised from parent note for audit / consistency (not session-derived). */
  organisationId?: string;
  hospitalId?: string;
  wardId?: string;
  patientId?: string;
};

export type ClinicalNote = {
  id: string;
  patientId: string;

  discipline: string;
  /** Governance discipline label (mirrors discipline on create; used for approval rules). */
  role?: string;
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

  /** Draft → final → approved (governance). */
  status?: "draft" | "final" | "approved";

  createdBy?: string;
  /** MDT / clinical role of author at creation. */
  createdByRole?: string;
  approvedBy?: string;
  approvedAt?: unknown;
  /** MDT role of the approver at approval time. */
  approvedByRole?: string;

  /** AI generated MDT review notes (used in MDT Reviews tab). */
  mdtReview?: ClinicalMdtReview | null;

  /** AI generated report outputs (used in Reports tab and buttons). */
  reports?: ClinicalReports | null;

  /** AI suggested content placement for the care folder. */
  careFolder?: ClinicalCareFolder | null;

  createdAt: unknown;
  /** Last content edit (draft notes). */
  updatedAt?: unknown;
  updatedBy?: string;
  updatedByEmail?: string;

  authorEmail?: string;

  // Author identity (stored for auditing & report generation)
  authorId?: string;
  authorRole?: string | null;
  /** MDT / clinical role of the author (from user profile at write time). */
  mdtRole?: string | null;

  /** Soft-delete flag (from Firestore). */
  isDeleted?: boolean;

  /** Pre-approval edit history (previous `content` values). */
  versions?: ClinicalNoteVersionEntry[];

  /** Addenda appended after finalisation / approval (embedded on note document). */
  addendums?: ClinicalNoteAddendumEntry[];
};
