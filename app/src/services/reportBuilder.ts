/**
 * Hospital AI Reports routing — discipline CPA (strict templates), MDT combined summary, tribunal gate.
 */

import type { UnifiedReport } from "./reportEngine";
import { simpleTextToUnified } from "./reportEngine";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import {
  getCpaTemplateForDiscipline,
  mapCanonicalDisciplineToCpaKey,
  cpaDisciplineDisplayName,
  type CpaDisciplineKey,
} from "../templates/cpa";
import { generateCPASection } from "./ai/cpaSectionGenerator";
import { listCpaDisciplineReportsForPatient } from "./cpaDisciplineReportService";
import { buildReportsPayloadFromCpaDocuments } from "./mdtSummariesService";
import { generateMDTSummaryWithActivityTrend, type MDTSummaryStructured } from "./mdtSummaryEngine";
import { canAccessTribunalReport } from "../utils/tribunalReportAccess";
import { isPrivilegedReportRole } from "../utils/reportDiscipline";
import { canAccessRCTribunalReport } from "../utils/rcTribunalAccess";
import { generateManagementHearingReport } from "./enterpriseReportsService";
import { managementHearingToUnified } from "./reportEngine";
import { buildNursingTribunalUnifiedReport, buildRcTribunalUnifiedReport } from "./tribunalUnifiedGenerators";
export { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";

export function resolveCpaDisciplineKeyForReport(args: {
  showDisciplineSelect: boolean;
  selectedDiscipline: string;
  userDiscipline: string;
}): CpaDisciplineKey {
  if (args.showDisciplineSelect) {
    const v = String(args.selectedDiscipline ?? "").trim();
    const allowed: CpaDisciplineKey[] = [
      "nurse",
      "psychiatrist",
      "psychologist",
      "occupational_therapist",
      "speech_language_therapist",
    ];
    if (allowed.includes(v as CpaDisciplineKey)) return v as CpaDisciplineKey;
  }
  return mapCanonicalDisciplineToCpaKey(args.userDiscipline);
}

export async function buildDisciplineCPAUnifiedReport(
  patientId: string,
  organisationId: string,
  disciplineKey: CpaDisciplineKey
): Promise<UnifiedReport> {
  const pid = String(patientId ?? "").trim();
  const org = String(organisationId ?? "").trim();
  if (!pid || !org) {
    return simpleTextToUnified("CPA Report", STRUCTURED_CLINICAL_REPORT_TAGLINE);
  }

  const template = getCpaTemplateForDiscipline(disciplineKey);
  const sections: { heading: string; content: string }[] = [];

  for (const row of template) {
    const out = await generateCPASection({
      discipline: disciplineKey,
      sectionName: row.title,
      patientId: pid,
      organisationId: org,
    });
    sections.push({
      heading: `${row.id}. ${row.title}`,
      content: (out.content ?? "").trim() || STRUCTURED_CLINICAL_REPORT_TAGLINE,
    });
  }

  return {
    kind: "unified",
    title: `${cpaDisciplineDisplayName(disciplineKey)} — CPA Report`,
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections,
    recommendations: [],
  };
}

function mdtStructuredToUnified(s: MDTSummaryStructured): UnifiedReport {
  return {
    kind: "unified",
    title: "MDT clinical summary",
    summary: [STRUCTURED_CLINICAL_REPORT_TAGLINE, s.overallSummary].filter(Boolean).join("\n\n"),
    sections: [
      { heading: "1. Overall Clinical Summary", content: s.overallSummary?.trim() || "No information recorded" },
      { heading: "2. Nursing Summary", content: s.nursing?.trim() || "No information recorded" },
      { heading: "3. Psychiatry Summary", content: s.psychiatry?.trim() || "No information recorded" },
      { heading: "4. Psychology Summary", content: s.psychology?.trim() || "No information recorded" },
      { heading: "5. Occupational Therapy Summary", content: s.ot?.trim() || "No information recorded" },
      { heading: "6. Speech & Language Summary", content: s.salt?.trim() || "No information recorded" },
      {
        heading: "7. Key Risks",
        content: s.keyRisks?.length ? s.keyRisks.join("\n") : "No information recorded",
      },
      { heading: "8. Risk Trend", content: s.riskTrend?.trim() || "No information recorded" },
      {
        heading: "9. MDT Recommendations",
        content: s.recommendations?.length
          ? s.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")
          : "No information recorded",
      },
      {
        heading: "10. Care Plan Adjustments",
        content: s.carePlanChanges?.length
          ? s.carePlanChanges.map((r, i) => `${i + 1}. ${r}`).join("\n")
          : "No information recorded",
      },
    ],
    recommendations: [...(s.recommendations ?? []), ...(s.keyRisks ?? []).map((r) => `Risk: ${r}`)],
  };
}

export async function buildMdtSummaryUnifiedReport(patientId: string, organisationId: string): Promise<UnifiedReport> {
  const pid = String(patientId ?? "").trim();
  const org = String(organisationId ?? "").trim();
  if (!pid || !org) {
    return simpleTextToUnified("MDT Summary", STRUCTURED_CLINICAL_REPORT_TAGLINE);
  }

  const rows = await listCpaDisciplineReportsForPatient(org, pid, { limitCount: 50 });
  const payload = buildReportsPayloadFromCpaDocuments(rows);
  const structured = await generateMDTSummaryWithActivityTrend(payload, pid);
  return mdtStructuredToUnified(structured);
}

export function buildTribunalAccessDeniedReport(): UnifiedReport {
  return {
    kind: "unified",
    title: "Tribunal Report",
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections: [
      {
        heading: "Access",
        content:
          "This report is only available for Nurse or Responsible Clinician. Use AI Reports with the correct report discipline.",
      },
    ],
    recommendations: [],
  };
}

export type ReportWorkflowDiscipline = "nursing" | "responsible_clinician";

export type HospitalPipelineArgs = {
  pipelineType: string;
  patientId: string;
  organisationId: string | null | undefined;
  notes: unknown[];
  userRole?: string;
  userDiscipline?: string;
  selectedDiscipline?: string;
  userMdtRole?: string | null;
  showDisciplineSelect?: boolean;
  /** Tribunal + Management Hearing — nursing vs RC structured generators */
  reportDiscipline?: ReportWorkflowDiscipline | string | null;
  organisationName?: string | null;
  userSystemRole?: string | null;
  /** When true, explicit reportDiscipline is honoured without role match (admin / platform admin). */
  privilegedDisciplinePicker?: boolean;
};

function normalizeReportWorkflowDiscipline(raw: string | null | undefined): ReportWorkflowDiscipline | null {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "nursing" || v === "nurse") return "nursing";
  if (v === "responsible_clinician" || v === "rc" || v === "responsible clinician") return "responsible_clinician";
  return null;
}

function inferReportWorkflowDiscipline(
  userDiscipline: string | undefined,
  userMdtRole: string | null | undefined
): ReportWorkflowDiscipline | null {
  const d = String(userDiscipline ?? "")
    .trim()
    .toLowerCase();
  if (d === "nurse") return "nursing";
  if (canAccessRCTribunalReport(userMdtRole)) return "responsible_clinician";
  if (d === "psychiatrist" || d === "doctor") return "responsible_clinician";
  return null;
}

function resolveReportWorkflowDisciplineForPipeline(args: HospitalPipelineArgs): ReportWorkflowDiscipline | null {
  const privileged =
    Boolean(args.privilegedDisciplinePicker) ||
    isPrivilegedReportRole(args.userRole) ||
    isPrivilegedReportRole(args.userSystemRole);
  const explicit = normalizeReportWorkflowDiscipline(String(args.reportDiscipline ?? ""));
  if (explicit) {
    if (privileged) return explicit;
    const inferred = inferReportWorkflowDiscipline(args.userDiscipline, args.userMdtRole ?? null);
    if (inferred && inferred !== explicit) return null;
    return explicit;
  }
  return inferReportWorkflowDiscipline(args.userDiscipline, args.userMdtRole ?? null);
}

function buildReportDisciplineDeniedReport(title: string): UnifiedReport {
  return {
    kind: "unified",
    title,
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections: [
      {
        heading: "Access",
        content: "This report is only available for Nurse or Responsible Clinician.",
      },
    ],
    recommendations: [],
  };
}

/**
 * Hospital-only pre-routing: strict CPA, MDT summary, tribunal gate; otherwise return null for core engine.
 */
export async function runHospitalReportPipeline(args: HospitalPipelineArgs): Promise<UnifiedReport | null> {
  const type = String(args.pipelineType ?? "");
  const orgId = String(args.organisationId ?? "").trim();
  const pid = String(args.patientId ?? "").trim();

  if (type === "tribunal") {
    if (!canAccessTribunalReport(args.userMdtRole, args.userDiscipline)) {
      return buildTribunalAccessDeniedReport();
    }
    if (!orgId) return null;
    const rwd = resolveReportWorkflowDisciplineForPipeline(args);
    if (!rwd) return buildReportDisciplineDeniedReport("Tribunal Report");
    if (rwd === "nursing") return buildNursingTribunalUnifiedReport(pid, orgId);
    return buildRcTribunalUnifiedReport(pid, orgId, args.organisationName ?? null);
  }

  if (type === "hearing") {
    if (!canAccessTribunalReport(args.userMdtRole, args.userDiscipline)) {
      return buildReportDisciplineDeniedReport("Management Hearing Report");
    }
    if (!orgId) return null;
    const rwd = resolveReportWorkflowDisciplineForPipeline(args);
    if (!rwd) return buildReportDisciplineDeniedReport("Management Hearing Report");
    const raw = await generateManagementHearingReport({
      notes: args.notes,
      patientId: pid,
      organisationId: orgId,
      reportDiscipline: rwd,
    });
    return managementHearingToUnified(raw);
  }

  if (type === "cpa" && orgId) {
    const key = resolveCpaDisciplineKeyForReport({
      showDisciplineSelect: Boolean(args.showDisciplineSelect),
      selectedDiscipline: args.selectedDiscipline ?? "nurse",
      userDiscipline: args.userDiscipline ?? "nurse",
    });
    return buildDisciplineCPAUnifiedReport(pid, orgId, key);
  }

  if (type === "mdt_summary" && orgId) {
    return buildMdtSummaryUnifiedReport(pid, orgId);
  }

  return null;
}
