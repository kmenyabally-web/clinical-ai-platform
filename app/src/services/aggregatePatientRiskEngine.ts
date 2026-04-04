/**
 * Aggregate clinical risk: ABC, incidents, nursing, formulation, and structured MDT disciplines (V2).
 */

import type { RiskScore } from "../models/riskModel";
import { getABCLogsForPatient } from "./abcService";
import { fetchIncidentsForPatient } from "./incidentService";
import { getNursingObservationsForPatient } from "./nursingObservationsService";
import { getLatestFormulationForPatient } from "./formulationService";
import {
  getLatestPsychiatryStructuredForPatient,
  getLatestOTStructuredForPatient,
  getLatestSALTStructuredForPatient,
  getLatestPsychologyTrackingForPatient,
} from "./structuredDisciplineServices";
import {
  readOTIndependenceLow,
  readPsychiatryRiskLevel,
  readPsychologyTherapyPoor,
  readSaltSwallowRisk,
} from "../utils/structuredClinicalSignals";

export type AggregateRiskInput = {
  abcLogs?: unknown[] | null;
  incidents?: unknown[] | null;
  nursingObs?: unknown[] | null;
  formulation?: unknown | null;
  psychiatryStructured?: unknown | null;
  otStructured?: unknown | null;
  saltStructured?: unknown | null;
  psychologyStructured?: unknown | null;
};

function incidentMillis(x: unknown): number {
  if (!x || typeof x !== "object") return 0;
  const o = x as Record<string, unknown>;
  const ca = o.createdAt ?? o.occurredAt ?? o.reportedAt ?? o.date;
  if (ca != null && typeof ca === "object" && typeof (ca as { toMillis?: () => number }).toMillis === "function") {
    try {
      return (ca as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof ca === "string" || typeof ca === "number") {
    const d = new Date(ca);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

function sortIncidentsNewestFirst(incidents: unknown[]): unknown[] {
  return [...(incidents ?? [])].sort((a, b) => incidentMillis(b) - incidentMillis(a));
}

export function extractRiskDrivers(data: AggregateRiskInput): string[] {
  const drivers: string[] = [];
  const abc = Array.isArray(data.abcLogs) ? data.abcLogs : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];
  const nursing = Array.isArray(data.nursingObs) ? data.nursingObs : [];
  const form = data.formulation && typeof data.formulation === "object" ? (data.formulation as Record<string, unknown>) : null;

  if (abc.length > 3) {
    drivers.push("Frequent behavioural incidents (ABC logs)");
  }
  if (abc.some((e) => String((e as Record<string, unknown>)?.severity ?? "").toLowerCase() === "high")) {
    drivers.push("High-severity ABC entries");
  }
  if (incidents.length > 0) {
    drivers.push("Recent incident reports");
  }
  const precip = form?.precipitatingFactors;
  if (typeof precip === "string" && precip.trim()) {
    drivers.push("Identified psychological triggers (formulation)");
  }
  const riskText = form?.riskFormulation;
  if (typeof riskText === "string" && riskText.trim()) {
    drivers.push("Documented psychological risk formulation");
  }
  if (nursing.some((n) => String((n as Record<string, unknown>)?.riskLevel ?? "").toLowerCase() === "high")) {
    drivers.push("High nursing observation risk level");
  }
  if (nursing.some((n) => String((n as Record<string, unknown>)?.riskLevel ?? "").toLowerCase() === "medium")) {
    drivers.push("Elevated nursing observation risk");
  }

  const pr = readPsychiatryRiskLevel(data.psychiatryStructured);
  if (pr === "high") drivers.push("High psychiatry structured risk level");
  else if (pr === "medium") drivers.push("Elevated psychiatry structured risk");

  if (readOTIndependenceLow(data.otStructured)) {
    drivers.push("Low OT independence level (functional decline)");
  }

  const sw = readSaltSwallowRisk(data.saltStructured);
  if (sw === "high") drivers.push("High SALT swallow risk");
  else if (sw === "medium") drivers.push("Moderate SALT swallow risk");

  if (readPsychologyTherapyPoor(data.psychologyStructured)) {
    drivers.push("Poor psychology therapy engagement (structured)");
  }

  return drivers.slice(0, 10);
}

export function calculateTrend(data: AggregateRiskInput): "improving" | "stable" | "deteriorating" {
  const sorted = sortIncidentsNewestFirst(Array.isArray(data.incidents) ? data.incidents : []);
  const recent = sorted.slice(0, 3).length;
  const older = sorted.slice(3, 6).length;
  if (recent > older) return "deteriorating";
  if (recent < older) return "improving";
  return "stable";
}

/**
 * Deterministic scoring from structured inputs (lengths + clinical flags).
 */
export function calculateAggregateRisk(patientId: string, data: AggregateRiskInput): RiskScore {
  const pid = String(patientId ?? "").trim() || "unknown";

  const behaviourScore = Array.isArray(data.abcLogs) ? data.abcLogs.length : 0;
  const incidentScore = Array.isArray(data.incidents) ? data.incidents.length : 0;

  let clinicalScore = 0;
  const nursing = Array.isArray(data.nursingObs) ? data.nursingObs : [];
  if (nursing.some((n) => String((n as Record<string, unknown>)?.riskLevel ?? "").toLowerCase() === "high")) {
    clinicalScore += 3;
  }
  if (nursing.some((n) => String((n as Record<string, unknown>)?.riskLevel ?? "").toLowerCase() === "medium")) {
    clinicalScore += 1;
  }

  const form = data.formulation && typeof data.formulation === "object" ? (data.formulation as Record<string, unknown>) : null;
  const riskForm = form?.riskFormulation;
  if (typeof riskForm === "string" && riskForm.trim()) {
    clinicalScore += 2;
  }

  const pr = readPsychiatryRiskLevel(data.psychiatryStructured);
  if (pr === "high") clinicalScore += 3;
  else if (pr === "medium") clinicalScore += 1;

  if (readOTIndependenceLow(data.otStructured)) {
    clinicalScore += 2;
  } else if (
    data.otStructured &&
    typeof data.otStructured === "object" &&
    String((data.otStructured as Record<string, unknown>).independenceLevel ?? "")
      .trim()
      .toLowerCase() === "medium"
  ) {
    clinicalScore += 1;
  }

  const sw = readSaltSwallowRisk(data.saltStructured);
  if (sw === "high") clinicalScore += 3;
  else if (sw === "medium") clinicalScore += 1;

  if (readPsychologyTherapyPoor(data.psychologyStructured)) {
    clinicalScore += 1;
  }

  const total = behaviourScore + incidentScore + clinicalScore;

  let overallRisk: RiskScore["overallRisk"] = "low";
  if (total > 10) overallRisk = "high";
  else if (total > 5) overallRisk = "medium";

  return {
    patientId: pid,
    overallRisk,
    behaviourRisk: behaviourScore,
    incidentRisk: incidentScore,
    clinicalRisk: clinicalScore,
    riskDrivers: extractRiskDrivers(data),
    trend: calculateTrend(data),
    lastUpdated: new Date(),
  };
}

/** Lightweight fetch for patient header / dashboard-style views (no CPA note load). */
export async function fetchPatientAggregateRiskScore(patientId: string): Promise<RiskScore> {
  const pid = String(patientId ?? "").trim();
  const [
    abcLogs,
    incidents,
    nursingObs,
    formulation,
    psychiatryStructured,
    otStructured,
    saltStructured,
    psychologyStructured,
  ] = await Promise.all([
    getABCLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchIncidentsForPatient(pid, { limitCount: 35 }).catch(() => []),
    getNursingObservationsForPatient(pid, { limitCount: 40 }).catch(() => []),
    getLatestFormulationForPatient(pid).catch(() => null),
    getLatestPsychiatryStructuredForPatient(pid).catch(() => null),
    getLatestOTStructuredForPatient(pid).catch(() => null),
    getLatestSALTStructuredForPatient(pid).catch(() => null),
    getLatestPsychologyTrackingForPatient(pid).catch(() => null),
  ]);

  return calculateAggregateRisk(pid, {
    abcLogs: Array.isArray(abcLogs) ? abcLogs : [],
    incidents: Array.isArray(incidents) ? incidents : [],
    nursingObs: Array.isArray(nursingObs) ? nursingObs : [],
    formulation,
    psychiatryStructured,
    otStructured,
    saltStructured,
    psychologyStructured,
  });
}
