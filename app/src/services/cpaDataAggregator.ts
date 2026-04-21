/**
 * Aggregates real clinical sources for CPA AI (V1 data engine).
 */

import { fetchClinicalNotesForPatient } from "./noteService";
import { fetchIncidentsForPatient } from "./incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "./behaviourService";
import { listPhysicalObservationsForPatient } from "./physicalObservationsService";
import { listCareLogsForPatient } from "./careLogsService.js";
import { getPatientById } from "./patientService";
import { buildMdtSummaryForCpa } from "./mdtSummaryEngine";
import { getABCLogsForPatient } from "./abcService";
import { getNursingObservationsForPatient } from "./nursingObservationsService";
import { getLatestFormulationForPatient } from "./formulationService";
import { buildFormulationSummary } from "./formulationSummary";
import { calculateAggregateRisk } from "./aggregatePatientRiskEngine";
import { recordRiskScoreSnapshot } from "./riskScoreHistoryService";
import { buildPatientAlerts } from "./earlyWarningEngine";
import { recordAlertSnapshot } from "./alertHistoryService";
import {
  getPsychologyData,
  getPsychiatryData,
  getOTData,
  getSALTData,
} from "./structuredDisciplineServices";
import {
  buildPsychologyTrackingSummary,
  buildPsychiatryStructuredSummary,
  buildOTStructuredSummary,
  buildSALTStructuredSummary,
} from "./mdtStructuredSummary";
import type { CpaAggregatedPatientData } from "./ai/cpaPatientDataTypes";
import { buildClinicalContextPromptBlock } from "../engine/clinicalContextEngine";
import { getOrganisation } from "./organisation";
import { getWardById } from "./structureService";
import { getLatestCapacityAssessment } from "./capacityAssessmentService";

export function extractMdtReviewsFromNotes(notes: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const raw of notes) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    if (n.mdtReview != null) {
      out.push({ source: "note", noteId: n.id ?? null, mdtReview: n.mdtReview });
    }
    const reports = n.reports;
    if (reports && typeof reports === "object") {
      const r = reports as Record<string, unknown>;
      if (r.mdtReview != null) {
        out.push({ source: "reports", noteId: n.id ?? null, mdtReview: r.mdtReview });
      }
    }
  }
  return out;
}

/**
 * Load notes, behaviours, incidents, physical observations, care monitoring logs, medications, and MDT review extracts.
 * Requires organisationId for org-scoped collections (physical health, care logs).
 */
export async function getPatientCPAData(
  organisationId: string,
  patientId: string
): Promise<CpaAggregatedPatientData> {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();

  const [
    notes,
    behaviours,
    incidents,
    physicalHealth,
    careLogs,
    patient,
    abcLogs,
    nursingObs,
    formulation,
    psychology,
    psychiatry,
    ot,
    salt,
    capacityAssessment,
  ] = await Promise.all([
    fetchClinicalNotesForPatient(pid, { limitCount: 50 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 35 }).catch(() => []),
    fetchIncidentsForPatient(pid, { limitCount: 35 }).catch(() => []),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 25 }).catch(() => []),
    listCareLogsForPatient(org, pid, { limitCount: 200 }).catch(() => []),
    getPatientById(pid).catch(() => null),
    getABCLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    getNursingObservationsForPatient(pid, { limitCount: 40 }).catch(() => []),
    getLatestFormulationForPatient(pid).catch(() => null),
    getPsychologyData(pid).catch(() => null),
    getPsychiatryData(pid).catch(() => null),
    getOTData(pid).catch(() => null),
    getSALTData(pid).catch(() => null),
    getLatestCapacityAssessment(org, pid).catch(() => null),
  ]);

  const n = Array.isArray(notes) ? notes : [];
  let mdtSummaryText = buildMdtSummaryForCpa(n);
  const mdtReviews = extractMdtReviewsFromNotes(n);

  if (formulation != null && typeof formulation === "object") {
    const block = buildFormulationSummary(formulation as Record<string, unknown>);
    if (block.trim()) {
      mdtSummaryText = `${mdtSummaryText}\n\n=== Psychology formulation (structured) ===\n${block}`.slice(0, 85000);
    }
  }

  const risk = calculateAggregateRisk(pid, {
    abcLogs: Array.isArray(abcLogs) ? abcLogs : [],
    incidents: Array.isArray(incidents) ? incidents : [],
    nursingObs: Array.isArray(nursingObs) ? nursingObs : [],
    formulation: formulation ?? null,
    psychiatryStructured: psychiatry,
    otStructured: ot,
    saltStructured: salt,
    psychologyStructured: psychology,
  });

  void recordRiskScoreSnapshot({ organisationId: org, patientId: pid, risk }).catch(() => {});

  const riskBlock = [
    `Overall: ${risk.overallRisk}`,
    `Trend: ${risk.trend}`,
    `Scores — behaviour: ${risk.behaviourRisk}, incidents: ${risk.incidentRisk}, clinical: ${risk.clinicalRisk}`,
    risk.riskDrivers.length ? `Drivers: ${risk.riskDrivers.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  mdtSummaryText = `${mdtSummaryText}\n\n=== Aggregate clinical risk (V1) ===\n${riskBlock}`.slice(0, 85000);

  const psychTrackBlock = buildPsychologyTrackingSummary(psychology);
  if (psychTrackBlock.trim()) {
    mdtSummaryText = `${mdtSummaryText}\n\n=== Psychology tracking (structured V2) ===\n${psychTrackBlock}`.slice(0, 85000);
  }
  const psychiatryBlock = buildPsychiatryStructuredSummary(psychiatry);
  if (psychiatryBlock.trim()) {
    mdtSummaryText = `${mdtSummaryText}\n\n=== Psychiatry (structured V2) ===\n${psychiatryBlock}`.slice(0, 85000);
  }
  const otBlock = buildOTStructuredSummary(ot);
  if (otBlock.trim()) {
    mdtSummaryText = `${mdtSummaryText}\n\n=== Occupational therapy (structured V2) ===\n${otBlock}`.slice(0, 85000);
  }
  const saltBlock = buildSALTStructuredSummary(salt);
  if (saltBlock.trim()) {
    mdtSummaryText = `${mdtSummaryText}\n\n=== SALT (structured V2) ===\n${saltBlock}`.slice(0, 85000);
  }

  const medications = Array.isArray(patient?.medications) ? patient.medications : [];
  const physicalHealthArr = Array.isArray(physicalHealth) ? physicalHealth : [];

  const alerts = buildPatientAlerts(pid, {
    abcLogs: Array.isArray(abcLogs) ? abcLogs : [],
    incidents: Array.isArray(incidents) ? incidents : [],
    nursingObs: Array.isArray(nursingObs) ? nursingObs : [],
    formulation: formulation ?? null,
    physicalHealth: physicalHealthArr,
    medications,
    psychiatryStructured: psychiatry,
    otStructured: ot,
    saltStructured: salt,
  });

  void recordAlertSnapshot({ organisationId: org, patientId: pid, alerts }).catch(() => {});

  if (alerts.length > 0) {
    const alertLines = alerts.map(
      (a) => `- [${String(a.severity).toUpperCase()}] ${a.source} · ${a.type}: ${a.message}`
    );
    mdtSummaryText =
      `${mdtSummaryText}\n\n=== Active alerts (early warning V1) ===\n${alertLines.join("\n")}`.slice(0, 85000);
  }

  if (capacityAssessment) {
    const summary = String(capacityAssessment?.outcomeSummary ?? "").trim();
    const decisionType = String(capacityAssessment?.decisionType ?? "Decision").trim();
    const keyReasoning =
      String(capacityAssessment?.stage1Details ?? "").trim() ||
      String(capacityAssessment?.assessmentWarning ?? "").trim() ||
      String((capacityAssessment as Record<string, unknown>)?.understandReasoning?.clinicianInterpretation ?? "").trim() ||
      summary;
    const bestInterests =
      String(capacityAssessment?.chosenOption ?? "").trim() ||
      String(capacityAssessment?.justification ?? "").trim() ||
      String(capacityAssessment?.bestInterestsNotes ?? "").trim();
    const capacityBlock = [
      `Decision type: ${decisionType}`,
      `Outcome: ${capacityAssessment?.lacksCapacity === true ? "Lacks capacity" : "Capacity present"}`,
      `Key reasoning: ${keyReasoning || "Not recorded"}`,
      `Best interests: ${bestInterests || "Not recorded"}`,
    ]
      .filter(Boolean)
      .join("\n");
    mdtSummaryText = `${mdtSummaryText}\n\n=== Capacity Assessment ===\n${capacityBlock}`.slice(0, 85000);
  }

  return {
    notes: n,
    behaviours: Array.isArray(behaviours) ? behaviours : [],
    incidents: Array.isArray(incidents) ? incidents : [],
    physicalHealth: Array.isArray(physicalHealth) ? physicalHealth : [],
    careLogs: Array.isArray(careLogs) ? careLogs : [],
    medications: Array.isArray(patient?.medications) ? patient.medications : [],
    mdtReviews,
    abcLogs: Array.isArray(abcLogs) ? abcLogs : [],
    nursingObs: Array.isArray(nursingObs) ? nursingObs : [],
    formulation: formulation ?? null,
    psychology,
    psychiatry,
    ot,
    salt,
    risk,
    alerts,
    capacityAssessment,
    mdtSummaryText,
    clinicalContextBlock,
  };
}
