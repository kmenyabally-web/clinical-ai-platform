/**
 * CPA patient data shapes: full aggregate (fetch) vs prompt payload (full or per-section slice).
 */

import type { RiskScore } from "../../models/riskModel";
import type { Alert } from "../../models/alertModel";

/** Result of {@link ../cpaDataAggregator#getPatientCPAData}. */
export type CpaAggregatedPatientData = {
  notes: unknown[];
  behaviours: unknown[];
  incidents: unknown[];
  physicalHealth: unknown[];
  careLogs: unknown[];
  medications: unknown[];
  mdtReviews: unknown[];
  /** ABC (antecedent–behaviour–consequence) logs from `abc_logs`. */
  abcLogs: unknown[];
  /** Structured nursing observations from `nursing_observations`. */
  nursingObs: unknown[];
  /** Latest psychology formulation document, or null. */
  formulation: unknown | null;
  /** Latest structured psychology tracking (V2), or null. */
  psychology: unknown | null;
  /** Latest structured psychiatry record (V2), or null. */
  psychiatry: unknown | null;
  /** Latest structured OT record (V2), or null. */
  ot: unknown | null;
  /** Latest structured SALT record (V2), or null. */
  salt: unknown | null;
  /** Aggregate risk (ABC, incidents, nursing obs, formulation). */
  risk: RiskScore;
  /** Early warning alerts (multi-disciplinary, sorted high → medium → low). */
  alerts: Alert[];
  capacityAssessment?: unknown | null;
  mdtSummaryText?: string;
  /** Pre-built Sanctum LD/MH/ward/org instructions for Gemini (CPA section prompts). */
  clinicalContextBlock?: string;
};

/**
 * JSON-serialisable object passed into CPA prompts (aggregate or section slice).
 */
export type CpaPromptPatientData = Record<string, unknown>;

/**
 * Optional override when callers already hold evidence (legacy shape included carePlans).
 */
export type CpaPatientDataBundle = {
  notes: unknown[];
  incidents: unknown[];
  behaviours: unknown[];
  physicalHealth: unknown[];
  medications: unknown[];
  carePlans: unknown[];
  careLogs?: unknown[];
  mdtReviews?: unknown[];
  mdtSummaryText?: string;
  capacityAssessment?: unknown | null;
  abcLogs?: unknown[];
  nursingObs?: unknown[];
  formulation?: unknown | null;
  psychology?: unknown | null;
  psychiatry?: unknown | null;
  ot?: unknown | null;
  salt?: unknown | null;
};
