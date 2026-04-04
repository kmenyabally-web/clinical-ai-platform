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

  const [patientSnap, n, inc, beh, phys] = await Promise.all([
    getPatientById(pid).catch(() => null),
    fetchClinicalNotesForPatient(pid, { limitCount: 45 }),
    fetchIncidentsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 30 }).catch(() => []),
  ]);

  const patient = patientSnap && typeof patientSnap === "object" ? (patientSnap as Record<string, unknown>) : null;
  const notes = Array.isArray(n) ? n : [];
  const incidents = Array.isArray(inc) ? inc : [];
  const behaviourLogs = Array.isArray(beh) ? beh : [];
  const physicalHealth = Array.isArray(phys) ? phys : [];

  const evidenceText = buildTribunalEvidenceContext({ notes, incidents, behaviourLogs, physicalHealth });
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

  const [patientSnap, n, inc, beh, phys, cp] = await Promise.all([
    getPatientById(pid).catch(() => null),
    fetchClinicalNotesForPatient(pid, { limitCount: 45 }),
    fetchIncidentsForPatient(pid, { limitCount: 40 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 30 }).catch(() => []),
    listCarePlansForPatient(org, pid, { limitCount: 25 }).catch(() => []),
  ]);

  const patient = patientSnap && typeof patientSnap === "object" ? (patientSnap as Record<string, unknown>) : null;
  const notes = Array.isArray(n) ? n : [];
  const incidents = Array.isArray(inc) ? inc : [];
  const behaviourLogs = Array.isArray(beh) ? beh : [];
  const physicalHealth = Array.isArray(phys) ? phys : [];
  const carePlans = Array.isArray(cp) ? cp : [];

  const evidenceText = buildRcTribunalEvidenceContext({
    notes,
    incidents,
    behaviourLogs,
    physicalHealth,
    carePlans,
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

  return {
    kind: "unified",
    title: "Tribunal Report (Responsible Clinician)",
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections,
    recommendations: [],
  };
}
