/**
 * Clinical report generation for AI Reports — delegates to {@link ./reportEngine.ts}.
 */

import { fetchClinicalNotesForPatient } from "./noteService";
import { structuredReportFallback } from "./aiService";
import {
  generateMdtWardRoundReport,
  generateManagementHearingReport,
  buildMdtWardFallback,
  buildManagementHearingFallback,
} from "./enterpriseReportsService";
import { groupNotesByDiscipline, summariseNotes } from "../utils/mdtNoteGrouping.js";
import {
  generateReport as generateReportCore,
  resolveOrganisationType,
  legacyReportToUnified,
} from "./reportEngine";
import { runHospitalReportPipeline } from "./reportBuilder";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import { enrichUnifiedReportWithExecutiveLayers } from "./executiveReportEnrichment";

/** @typedef {"weekly"|"monthly"|"summary"|"tribunal"|"cpa"|"mdtReview"|"mdt"|"hearing"|"mdt_summary"} ReportPipelineType */

/**
 * @param {unknown} n
 */
function noteToMillis(n) {
  if (!n || typeof n !== "object") return 0;
  const x = /** @type {Record<string, unknown>} */ (n);
  const ca = x.createdAt;
  if (ca && typeof ca === "object" && "toMillis" in ca && typeof ca.toMillis === "function") {
    return /** @type {number} */ (ca.toMillis());
  }
  if (ca && typeof ca === "object" && "seconds" in ca && typeof ca.seconds === "number") {
    return ca.seconds * 1000;
  }
  return 0;
}

/**
 * @param {unknown[]} notes
 * @param {number} daysBack
 */
function filterNotesByDays(notes, daysBack) {
  const start = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return (notes ?? []).filter((n) => noteToMillis(n) >= start);
}

/**
 * @param {unknown[]} notes
 */
function buildWeeklySummary(notes) {
  const filtered = filterNotesByDays(notes, 7);
  const pool = filtered.length ? filtered : notes;
  const body = summariseNotes(pool);
  const title = "Weekly Patient Summary";
  const text = filtered.length
    ? `Clinical notes from the last 7 days (${filtered.length} note(s)):\n\n${body}`
    : `No notes dated in the last 7 days. Showing all available notes (${(notes ?? []).length}):\n\n${body}`;
  return { kind: "simpleText", title, text };
}

/**
 * @param {unknown[]} notes
 */
function buildMonthlySummary(notes) {
  const filtered = filterNotesByDays(notes, 30);
  const pool = filtered.length ? filtered : notes;
  const body = summariseNotes(pool);
  const title = "Monthly Patient Summary";
  const text = filtered.length
    ? `Clinical notes from the last 30 days (${filtered.length} note(s)):\n\n${body}`
    : `No notes dated in the last 30 days. Showing all available notes (${(notes ?? []).length}):\n\n${body}`;
  return { kind: "simpleText", title, text };
}

function buildFullSummary(notes) {
  const body = summariseNotes(notes);
  return { kind: "simpleText", title: "Clinical notes summary", text: body || "No note text to summarise." };
}

/**
 * @param {unknown[] | undefined} notesOverride
 * @param {string} patientId
 */
async function resolveNotes(notesOverride, patientId) {
  if (Array.isArray(notesOverride) && notesOverride.length > 0) return notesOverride;
  const pid = String(patientId ?? "").trim();
  if (!pid) return [];
  const list = await fetchClinicalNotesForPatient(pid, { limitCount: 100 });
  return Array.isArray(list) ? list : [];
}

/**
 * @param {ReportPipelineType | string} type
 */
function mapPipelineToEngine(type) {
  switch (type) {
    case "weekly":
      return { reportType: "Summary", summaryWindow: "7d", mdtMode: undefined };
    case "monthly":
      return { reportType: "Summary", summaryWindow: "30d", mdtMode: undefined };
    case "summary":
      return { reportType: "Summary", summaryWindow: "all", mdtMode: undefined };
    case "cpa":
      return { reportType: "CPA", summaryWindow: undefined, mdtMode: undefined };
    case "tribunal":
      return { reportType: "Tribunal", summaryWindow: undefined, mdtMode: undefined };
    case "mdtReview":
      return { reportType: "MDT", summaryWindow: undefined, mdtMode: "clinical" };
    case "mdt":
      return { reportType: "MDT", summaryWindow: undefined, mdtMode: "ward" };
    case "hearing":
      return { reportType: "Management_Hearing", summaryWindow: undefined, mdtMode: undefined };
    default:
      return { reportType: "CPA", summaryWindow: undefined, mdtMode: undefined };
  }
}

/**
 * @param {{
 *   patientId: string,
 *   organisationId?: string | null,
 *   type: ReportPipelineType | string,
 *   notes?: unknown[],
 *   organisation?: { type?: string | null } | null,
 *   userRole?: string,
 *   userDiscipline?: string,
 *   selectedDiscipline?: string,
 *   reportDiscipline?: string | null,
 *   organisationName?: string | null,
 *   userSystemRole?: string | null,
 *   privilegedDisciplinePicker?: boolean,
 * }} args
 */
export async function generateReport({
  patientId,
  organisationId,
  type,
  notes: notesOverride,
  organisation,
  userRole,
  userDiscipline,
  selectedDiscipline,
  userMdtRole,
  showDisciplineSelect,
  reportDiscipline,
  organisationName,
  userSystemRole,
  privilegedDisciplinePicker,
}) {
  const pid = String(patientId ?? "").trim();
  const oid = String(organisationId ?? "").trim();
  if (!pid || !oid) {
    const missing = legacyReportToUnified(
      {
        kind: "simpleText",
        title: "Report",
        text: "Missing required data",
      },
      String(type)
    );
    return enrichUnifiedReportWithExecutiveLayers(missing, organisationId ?? null, patientId ?? null);
  }

  const notes = await resolveNotes(notesOverride, patientId);
  const orgType = resolveOrganisationType(organisation ?? null);

  if (orgType === "hospital") {
    const early = await runHospitalReportPipeline({
      pipelineType: String(type),
      patientId,
      organisationId,
      notes,
      userRole: userRole ?? "staff",
      userDiscipline: userDiscipline ?? "nurse",
      selectedDiscipline,
      userMdtRole: userMdtRole ?? null,
      showDisciplineSelect,
      reportDiscipline: reportDiscipline ?? null,
      organisationName: organisationName ?? null,
      userSystemRole: userSystemRole ?? null,
      privilegedDisciplinePicker: Boolean(privilegedDisciplinePicker),
    });
    if (early) {
      return enrichUnifiedReportWithExecutiveLayers(early, organisationId, patientId);
    }
  }

  const bypassNotes =
    orgType === "hospital" &&
    (String(type) === "cpa" ||
      String(type) === "mdt_summary" ||
      String(type) === "weekly" ||
      String(type) === "monthly");
  if (!bypassNotes && !notes.length) {
    const emptyUnified = legacyReportToUnified(
      {
        kind: "simpleText",
        title: "Report",
        text: "No clinical notes are available. Add notes for this patient or check access.",
      },
      String(type)
    );
    return enrichUnifiedReportWithExecutiveLayers(emptyUnified, organisationId, patientId);
  }

  const mapped = mapPipelineToEngine(type);

  const core = await generateReportCore({
    organisationType: orgType,
    reportType: /** @type {import("../config/reportConfig").ReportTypeKey} */ (mapped.reportType),
    notes,
    patientId,
    organisationId: organisationId ?? null,
    summaryWindow: mapped.summaryWindow,
    mdtMode: mapped.mdtMode,
    userRole: userRole ?? "staff",
    userDiscipline: userDiscipline ?? "nurse",
    selectedDiscipline,
  });
  return enrichUnifiedReportWithExecutiveLayers(core, organisationId, patientId);
}

/**
 * Deterministic output when generation fails.
 * @param {ReportPipelineType | string} type
 * @param {unknown[]} notes
 */
export function generateFallbackReport(type, notes) {
  const safe = Array.isArray(notes) ? notes : [];
  if (!safe.length) {
    return legacyReportToUnified(
      {
        kind: "simpleText",
        title: "Report",
        text: `${STRUCTURED_CLINICAL_REPORT_TAGLINE}\n\nNo clinical notes are available. Add notes for this patient or check access.`,
      },
      String(type)
    );
  }

  const grouped = groupNotesByDiscipline(safe);

  switch (type) {
    case "weekly":
      return legacyReportToUnified(buildWeeklySummary(safe), String(type));
    case "monthly":
      return legacyReportToUnified(buildMonthlySummary(safe), String(type));
    case "summary":
      return legacyReportToUnified(buildFullSummary(safe), String(type));
    case "tribunal":
      return legacyReportToUnified(structuredReportFallback("tribunal"), String(type));
    case "cpa":
      return legacyReportToUnified(structuredReportFallback("cpa"), String(type));
    case "mdtReview":
      return legacyReportToUnified(structuredReportFallback("mdtReview"), String(type));
    case "mdt":
      return legacyReportToUnified(buildMdtWardFallback(grouped), String(type));
    case "hearing":
      return legacyReportToUnified(buildManagementHearingFallback(safe), String(type));
    case "mdt_summary":
      return legacyReportToUnified(
        {
          kind: "simpleText",
          title: "MDT Summary",
          text: `${STRUCTURED_CLINICAL_REPORT_TAGLINE}\n\nSave discipline CPA reports first, then regenerate the MDT summary.`,
        },
        String(type)
      );
    default:
      return legacyReportToUnified(
        {
          kind: "simpleText",
          title: "Report",
          text: `${STRUCTURED_CLINICAL_REPORT_TAGLINE}\n\nUnknown report type "${type}".`,
        },
        String(type)
      );
  }
}

/**
 * Maps dropdown values on AI Reports page to pipeline types.
 * @param {string} value
 * @returns {ReportPipelineType}
 */
export function mapDropdownToPipelineType(value) {
  switch (value) {
    case "CPA":
      return "cpa";
    case "Tribunal":
      return "tribunal";
    case "Management_Hearing":
      return "hearing";
    case "MDT":
      return "mdt";
    case "MDT_SUMMARY":
      return "mdt_summary";
    case "Summary":
      return "summary";
    case "WEEKLY":
      return "weekly";
    case "MONTHLY":
      return "monthly";
    default:
      return "cpa";
  }
}

/**
 * @param {string} pipelineType
 */
export function pipelineTypeToDropdown(pipelineType) {
  switch (pipelineType) {
    case "weekly":
      return "WEEKLY";
    case "monthly":
      return "MONTHLY";
    case "summary":
      return "Summary";
    case "cpa":
      return "CPA";
    case "tribunal":
      return "Tribunal";
    case "mdtReview":
      return "MDT_CLINICAL";
    case "mdt":
      return "MDT";
    case "hearing":
      return "Management_Hearing";
    case "mdt_summary":
      return "MDT_SUMMARY";
    default:
      return "CPA";
  }
}
