/**
 * Prepends Executive Summary and appends Recommendations to unified clinical reports.
 */

import type { UnifiedReport } from "./reportEngine";
import { calculateAggregateRisk } from "./aggregatePatientRiskEngine";
import { buildPatientAlerts } from "./earlyWarningEngine";
import { getABCLogsForPatient } from "./abcService";
import { fetchIncidentsForPatient } from "./incidentService";
import { getNursingObservationsForPatient } from "./nursingObservationsService";
import { getLatestFormulationForPatient } from "./formulationService";
import { getPatientById } from "./patientService";
import { listPhysicalObservationsForPatient } from "./physicalObservationsService";
import {
  getLatestPsychiatryStructuredForPatient,
  getLatestOTStructuredForPatient,
  getLatestSALTStructuredForPatient,
  getLatestPsychologyTrackingForPatient,
} from "./structuredDisciplineServices";
import { buildExecutiveSummary, type ExecutiveSummaryInput } from "./executiveSummaryBuilder";
import { buildRecommendations, type RecommendationInput } from "./recommendationBuilder";

export type ExecutiveRecommendationBundle = ExecutiveSummaryInput & RecommendationInput;

function asPsychiatryMed(p: unknown): { medication?: unknown[] } | null {
  if (!p || typeof p !== "object") return null;
  const m = (p as Record<string, unknown>).medication;
  return { medication: Array.isArray(m) ? m : [] };
}

function asOt(p: unknown): { independenceLevel?: string } | null {
  if (!p || typeof p !== "object") return null;
  const v = (p as Record<string, unknown>).independenceLevel;
  return typeof v === "string" ? { independenceLevel: v } : null;
}

function asSalt(p: unknown): { swallowRisk?: string } | null {
  if (!p || typeof p !== "object") return null;
  const v = (p as Record<string, unknown>).swallowRisk;
  return typeof v === "string" ? { swallowRisk: v } : null;
}

/**
 * Load aggregate risk, alerts, and discipline fields used by executive summary + recommendations.
 */
export async function loadExecutiveRecommendationData(
  organisationId: string,
  patientId: string
): Promise<ExecutiveRecommendationBundle> {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();

  const empty: ExecutiveRecommendationBundle = {
    risk: { overallRisk: "low", trend: "stable" },
    alerts: [],
    abcLogs: [],
    formulation: null,
    psychiatry: null,
    ot: null,
    salt: null,
    summaryHighlights: null,
  };

  if (!pid || !org) return empty;

  const [
    abcLogs,
    incidents,
    nursingObs,
    formulation,
    psychiatryStructured,
    otStructured,
    saltStructured,
    psychologyStructured,
    patient,
    physicalHealth,
  ] = await Promise.all([
    getABCLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchIncidentsForPatient(pid, { limitCount: 35 }).catch(() => []),
    getNursingObservationsForPatient(pid, { limitCount: 40 }).catch(() => []),
    getLatestFormulationForPatient(pid).catch(() => null),
    getLatestPsychiatryStructuredForPatient(pid).catch(() => null),
    getLatestOTStructuredForPatient(pid).catch(() => null),
    getLatestSALTStructuredForPatient(pid).catch(() => null),
    getLatestPsychologyTrackingForPatient(pid).catch(() => null),
    getPatientById(pid).catch(() => null),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 25 }).catch(() => []),
  ]);

  const abc = Array.isArray(abcLogs) ? abcLogs : [];
  const inc = Array.isArray(incidents) ? incidents : [];
  const nobs = Array.isArray(nursingObs) ? nursingObs : [];
  const phys = Array.isArray(physicalHealth) ? physicalHealth : [];
  const medications = patient && typeof patient === "object" && Array.isArray((patient as Record<string, unknown>).medications)
    ? ((patient as Record<string, unknown>).medications as unknown[])
    : [];

  const riskScore = calculateAggregateRisk(pid, {
    abcLogs: abc,
    incidents: inc,
    nursingObs: nobs,
    formulation,
    psychiatryStructured,
    otStructured,
    saltStructured,
    psychologyStructured,
  });

  const alerts = buildPatientAlerts(pid, {
    abcLogs: abc,
    incidents: inc,
    nursingObs: nobs,
    formulation,
    physicalHealth: phys,
    medications,
    psychiatryStructured,
    otStructured,
    saltStructured,
  });

  const drivers = riskScore.riskDrivers?.length ? riskScore.riskDrivers.slice(0, 4).join("; ") : "";

  return {
    risk: { overallRisk: riskScore.overallRisk, trend: riskScore.trend },
    alerts,
    abcLogs: abc,
    formulation,
    psychiatry: asPsychiatryMed(psychiatryStructured),
    ot: asOt(otStructured),
    salt: asSalt(saltStructured),
    summaryHighlights: drivers || null,
  };
}

export function applyExecutiveLayersToUnified(
  unified: UnifiedReport,
  data: ExecutiveRecommendationBundle
): UnifiedReport {
  const exec = buildExecutiveSummary(data);
  const recs = buildRecommendations(data);
  const recContent = recs.map((r, i) => `${i + 1}. ${r}`).join("\n\n");

  const execSection = { heading: "Executive Summary", content: exec };
  const recSection = { heading: "Recommendations", content: recContent };

  return {
    ...unified,
    sections: [execSection, ...(unified.sections ?? []), recSection],
    recommendations: [],
  };
}

/**
 * Idempotent: skips if an Executive Summary section is already present.
 */
export async function enrichUnifiedReportWithExecutiveLayers(
  unified: UnifiedReport | null | undefined,
  organisationId: string | null | undefined,
  patientId: string | null | undefined
): Promise<UnifiedReport> {
  if (!unified || unified.kind !== "unified") {
    return unified as UnifiedReport;
  }

  const first = unified.sections?.[0]?.heading?.trim().toLowerCase() ?? "";
  if (first === "executive summary") {
    return unified;
  }

  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) {
    return applyExecutiveLayersToUnified(unified, {
      risk: { overallRisk: "low", trend: "stable" },
      alerts: [],
      abcLogs: [],
      formulation: null,
      psychiatry: null,
      ot: null,
      salt: null,
      summaryHighlights: null,
    });
  }

  const data = await loadExecutiveRecommendationData(org, pid);
  return applyExecutiveLayersToUnified(unified, data);
}
