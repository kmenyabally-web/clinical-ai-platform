/**
 * Unified AI Reports — nursing & RC tribunal using the same per-section flows as the legacy tribunal pages.
 */

import type { UnifiedReport } from "./reportEngine";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import { tribunalTemplate } from "../templates/tribunalNursingReport";
import { rcTemplate } from "../templates/rcTribunalTemplate";
import { fetchClinicalNotesForPatient } from "./noteService";
import { fetchIncidentsForPatient } from "./incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "./behaviourService";
import { listPhysicalObservationsForPatient } from "./physicalObservationsService";
import { listCarePlansForPatient } from "./carePlanManagementService";
import { getPatientById } from "./patientService";
import { buildTribunalEvidenceContext, generateTribunalSectionAI } from "./tribunalReportAi";
import { buildRcTribunalEvidenceContext } from "./rcReportEvidence";
import { generateRcTribunalSectionAI } from "./rcTribunalAi";
import { listCapacityAssessmentsForPatient, MCA_DECISION_TYPES, MCA_DECISION_TYPE_LABELS } from "./capacityAssessmentService";
import { listLibertySafeguardsForPatient } from "./libertySafeguardsService";

function buildCapacityReportContent(capacityAssessments: Record<string, unknown>[]): string {
  const rows = Array.isArray(capacityAssessments) ? capacityAssessments : [];
  if (rows.length === 0) return "No recent capacity assessments recorded.";
  const latestByDecision = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const decisionType = String(row?.decisionType ?? "").trim();
    if (!decisionType) continue;
    if (!latestByDecision.has(decisionType)) latestByDecision.set(decisionType, row);
  }
  const orderedDecisionTypes = [
    ...MCA_DECISION_TYPES,
    ...Array.from(latestByDecision.keys()).filter((key) => !MCA_DECISION_TYPES.includes(key)),
  ];
  const lines: string[] = [];
  for (const decisionType of orderedDecisionTypes) {
    const row = latestByDecision.get(decisionType);
    if (!row) continue;
    const status = row?.lacksCapacity === true ? "Lacks capacity" : "Capacity present";
    const assessed = String(row?.assessmentDate ?? "").trim() || "Not recorded";
    const bestInterests =
      String(row?.chosenOption ?? "").trim() ||
      String(row?.justification ?? "").trim() ||
      String(row?.bestInterestsNotes ?? "").trim() ||
      "Not recorded";
    const label = MCA_DECISION_TYPE_LABELS[decisionType] || decisionType;
    lines.push(`${label}: ${status} | Last assessed: ${assessed} | Best interests: ${bestInterests}`);
  }
  return lines.length ? lines.join("\n") : "No recent capacity assessments recorded.";
}

function buildDolsReportContent(libertyRows: Record<string, unknown>[]): string {
  const rows = Array.isArray(libertyRows) ? libertyRows : [];
  if (rows.length === 0) return "No DoLS/LPS record currently documented.";
  return rows
    .slice(0, 6)
    .map((row) => {
      const type = String(row?.type ?? "").trim() || "DoLS/LPS";
      const status = String(row?.status ?? "").trim() || "Not recorded";
      const applicationDate = String(row?.applicationDate ?? "").trim() || "Not recorded";
      const authorisationDate = String(row?.authorisationDate ?? "").trim() || "Not recorded";
      const expiryDate = String(row?.expiryDate ?? "").trim() || "Not recorded";
      const reasoning = String(row?.reasonForDeprivation ?? "").trim() || "Not recorded";
      return `${type}: status ${status} | Application ${applicationDate} | Authorisation ${authorisationDate} | Expiry ${expiryDate} | Reasoning ${reasoning}`;
    })
    .join("\n");
}

function formatDobValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (typeof v === "object" && v !== null && "toDate" in v && typeof (v as { toDate?: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function nursingPatientDetailsBlock(patient: Record<string, unknown> | null): string {
  if (!patient) {
    return `${STRUCTURED_CLINICAL_REPORT_TAGLINE}\n\nComplete structured patient details (name, DOB, NHS number, ward, Responsible Clinician, legal status) from the master record before tribunal submission.`;
  }
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "—";
  const nhs = (patient.nhsNumber ?? patient.nhs ?? "").toString().trim() || "—";
  const ward = (patient.wardName ?? patient.ward ?? "").toString().trim() || "—";
  const legal = (patient.legalStatus ?? patient.section ?? "").toString().trim() || "—";
  const rc = (patient.responsibleClinician ?? patient.rcName ?? "").toString().trim() || "—";
  const dob = formatDobValue(patient.dateOfBirth ?? patient.dob);
  return [
    `Full name: ${name}`,
    `Date of birth: ${dob || "—"}`,
    `NHS number: ${nhs}`,
    `Ward / location: ${ward}`,
    `Responsible Clinician: ${rc}`,
    `Legal status / section: ${legal}`,
    "",
    "Verify all identifiers against the authority patient record before use in proceedings.",
  ].join("\n");
}

function rcHeaderBlock(patient: Record<string, unknown> | null, organisationName?: string): string {
  if (!patient) {
    return `${STRUCTURED_CLINICAL_REPORT_TAGLINE}\n\nComplete RC tribunal header fields from the formal record.`;
  }
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || "—";
  const dob = formatDobValue(patient.dateOfBirth ?? patient.dob);
  const nhs = (patient.nhsNumber ?? patient.nhs ?? "").toString().trim() || "—";
  const ward = (patient.wardName ?? patient.ward ?? "").toString().trim() || "—";
  const mha = (patient.legalStatus ?? patient.section ?? patient.mhaSection ?? "").toString().trim() || "—";
  const hosp = (patient.hospitalName ?? organisationName ?? "").toString().trim() || "—";
  return [
    `Patient: ${name}`,
    `DOB: ${dob || "—"}`,
    `NHS: ${nhs}`,
    `Ward: ${ward}`,
    `MHA / legal: ${mha}`,
    `Hospital: ${hosp}`,
    `Report date: ${new Date().toISOString().slice(0, 10)}`,
  ].join("\n");
}

export async function buildNursingTribunalUnifiedReport(
  patientId: string,
  organisationId: string
): Promise<UnifiedReport> {
  const pid = String(patientId ?? "").trim();
  const org = String(organisationId ?? "").trim();
  if (!pid || !org) {
    return {
      kind: "unified",
      title: "Tribunal Report (Nursing)",
      summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
      sections: [{ heading: "Error", content: "Patient or organisation missing." }],
      recommendations: [],
    };
  }

  const [patientSnap, n, inc, beh, phys, capacityAssessments, libertySafeguards] = await Promise.all([
    getPatientById(pid).catch(() => null),
    fetchClinicalNotesForPatient(pid, { limitCount: 45 }),
    fetchIncidentsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 30 }).catch(() => []),
    listCapacityAssessmentsForPatient(org, pid, { limitCount: 120 }).catch(() => []),
    listLibertySafeguardsForPatient(org, pid, { limitCount: 40 }).catch(() => []),
  ]);

  const patient = patientSnap && typeof patientSnap === "object" ? (patientSnap as Record<string, unknown>) : null;
  const notes = Array.isArray(n) ? n : [];
  const incidents = Array.isArray(inc) ? inc : [];
  const behaviourLogs = Array.isArray(beh) ? beh : [];
  const physicalHealth = Array.isArray(phys) ? phys : [];

  const latestCapacityAssessment =
    Array.isArray(capacityAssessments) && capacityAssessments.length > 0 ? capacityAssessments[0] : null;
  const evidenceText = buildTribunalEvidenceContext({
    notes,
    incidents,
    behaviourLogs,
    physicalHealth,
    capacityAssessment: latestCapacityAssessment,
  });
  const sections: { heading: string; content: string }[] = [];

  for (const row of tribunalTemplate) {
    if (row.type === "structured") {
      sections.push({
        heading: `${row.id}. ${row.title}`,
        content: nursingPatientDetailsBlock(patient),
      });
      continue;
    }
    const text =
      (await generateTribunalSectionAI({
        sectionTitle: row.title,
        sectionType: row.type,
        evidenceText,
      }))?.trim() || "Insufficient data.";
    sections.push({
      heading: `${row.id}. ${row.title}`,
      content: text,
    });
  }
  sections.push({
    heading: `${tribunalTemplate.length + 1}. Capacity Assessment`,
    content: buildCapacityReportContent((capacityAssessments ?? []) as Record<string, unknown>[]),
  });
  sections.push({
    heading: `${tribunalTemplate.length + 2}. DoLS / LPS Safeguards`,
    content: buildDolsReportContent((libertySafeguards ?? []) as Record<string, unknown>[]),
  });

  return {
    kind: "unified",
    title: "Tribunal Report (Nursing)",
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections,
    recommendations: [],
  };
}

export async function buildRcTribunalUnifiedReport(
  patientId: string,
  organisationId: string,
  organisationName?: string | null
): Promise<UnifiedReport> {
  const pid = String(patientId ?? "").trim();
  const org = String(organisationId ?? "").trim();
  if (!pid || !org) {
    return {
      kind: "unified",
      title: "Tribunal Report (Responsible Clinician)",
      summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
      sections: [{ heading: "Error", content: "Patient or organisation missing." }],
      recommendations: [],
    };
  }

  const [patientSnap, n, inc, beh, phys, cp, capacityAssessments, libertySafeguards] = await Promise.all([
    getPatientById(pid).catch(() => null),
    fetchClinicalNotesForPatient(pid, { limitCount: 45 }),
    fetchIncidentsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 30 }).catch(() => []),
    listCarePlansForPatient(org, pid, { limitCount: 25 }).catch(() => []),
    listCapacityAssessmentsForPatient(org, pid, { limitCount: 120 }).catch(() => []),
    listLibertySafeguardsForPatient(org, pid, { limitCount: 40 }).catch(() => []),
  ]);

  const patient = patientSnap && typeof patientSnap === "object" ? (patientSnap as Record<string, unknown>) : null;
  const notes = Array.isArray(n) ? n : [];
  const incidents = Array.isArray(inc) ? inc : [];
  const behaviourLogs = Array.isArray(beh) ? beh : [];
  const physicalHealth = Array.isArray(phys) ? phys : [];
  const carePlans = Array.isArray(cp) ? cp : [];

  const latestCapacityAssessment =
    Array.isArray(capacityAssessments) && capacityAssessments.length > 0 ? capacityAssessments[0] : null;
  const evidenceText = buildRcTribunalEvidenceContext({
    notes,
    incidents,
    behaviourLogs,
    physicalHealth,
    carePlans,
    capacityAssessment: latestCapacityAssessment,
  });

  const sections: { heading: string; content: string }[] = [];

  sections.push({
    heading: "1. Patient header (Responsible Clinician)",
    content: rcHeaderBlock(patient, organisationName ?? undefined),
  });

  for (const row of rcTemplate) {
    if (row.id === "header") continue;
    const num = typeof row.id === "number" ? row.id + 1 : row.id;
    const text =
      (await generateRcTribunalSectionAI({
        sectionTitle: row.title,
        sectionNumber: row.id,
        evidenceText,
      }))?.trim() || "Insufficient information in the records provided.";
    sections.push({
      heading: `${num}. ${row.title}`,
      content: text,
    });
  }
  sections.push({
    heading: `${rcTemplate.length + 1}. Capacity Assessment`,
    content: buildCapacityReportContent((capacityAssessments ?? []) as Record<string, unknown>[]),
  });
  sections.push({
    heading: `${rcTemplate.length + 2}. DoLS / LPS Safeguards`,
    content: buildDolsReportContent((libertySafeguards ?? []) as Record<string, unknown>[]),
  });

  return {
    kind: "unified",
    title: "Tribunal Report (Responsible Clinician)",
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections,
    recommendations: [],
  };
}
