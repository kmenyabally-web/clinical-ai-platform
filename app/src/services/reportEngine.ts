/**
 * Central report engine: organisation mode routing, discipline grouping, AI + unified fallbacks.
 */

import type {
  ManagementHearingReport,
  MdtWardRoundReport,
  StructuredClinicalReport,
  StructuredClinicalReportSections,
} from "../types/clinical";
import type { OrganisationType, ReportTypeKey } from "../config/reportConfig";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import { generateAIContent, stripJsonFence } from "./geminiAiService.js";
import { generateClinicalReportSection, structuredReportFallback } from "./aiService.js";
import {
  generateMdtWardRoundReport,
  generateManagementHearingReport,
  buildMdtWardFallback,
  buildManagementHearingFallback,
} from "./enterpriseReportsService.js";
import { groupNotesByDiscipline, summariseNotes, getNoteBodyText } from "../utils/mdtNoteGrouping.js";
import { getTargetDiscipline, filterNotesByDiscipline } from "../utils/reportDiscipline.js";

export type UnifiedReport = {
  kind: "unified";
  title: string;
  summary: string;
  sections: { heading: string; content: string }[];
  recommendations: string[];
};

export type MdtMode = "ward" | "clinical";

export type GenerateReportInput = {
  organisationType: OrganisationType;
  reportType: ReportTypeKey;
  notes: unknown[];
  patientId?: string;
  organisationId?: string | null;
  /** For Summary report type */
  summaryWindow?: "7d" | "30d" | "all";
  /** For MDT: ward round vs nine-section clinical MDT review */
  mdtMode?: MdtMode;
  /** Role-based reporting (required for hospital scope) */
  userRole?: string;
  /** Canonical discipline key, e.g. nurse, psychologist, ot */
  userDiscipline?: string;
  /** Only for admin/manager when choosing scope */
  selectedDiscipline?: string;
};

const STRUCTURED_AI_FALLBACK: UnifiedReport = {
  kind: "unified",
  title: "Report",
  summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
  sections: [],
  recommendations: [],
};

/** User-specified grouping keyed by note role (with discipline fallbacks). */
export function groupByDiscipline(notes: unknown[]): Record<string, unknown[]> {
  const grouped: Record<string, unknown[]> = {};
  const list = Array.isArray(notes) ? notes : [];
  for (const note of list) {
    const n = note && typeof note === "object" ? (note as Record<string, unknown>) : {};
    const role =
      (typeof n.role === "string" && n.role.trim()) ||
      (typeof n.discipline === "string" && n.discipline.trim()) ||
      (typeof n.authorRole === "string" && n.authorRole.trim()) ||
      "unknown";
    if (!grouped[role]) grouped[role] = [];
    grouped[role].push(note);
  }
  return grouped;
}

function noteToMillis(n: unknown): number {
  if (!n || typeof n !== "object") return 0;
  const x = n as Record<string, unknown>;
  const ca = x.createdAt;
  if (ca && typeof ca === "object" && ca !== null && "toMillis" in ca && typeof (ca as { toMillis?: () => number }).toMillis === "function") {
    return (ca as { toMillis: () => number }).toMillis();
  }
  if (ca && typeof ca === "object" && ca !== null && "seconds" in ca && typeof (ca as { seconds: number }).seconds === "number") {
    return (ca as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function filterNotesByDays(notes: unknown[], daysBack: number): unknown[] {
  const start = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return (notes ?? []).filter((n) => noteToMillis(n) >= start);
}

function buildContextNotes(notes: unknown[]) {
  return (notes ?? [])
    .slice()
    .sort((a, b) => noteToMillis(b) - noteToMillis(a))
    .slice(0, 20)
    .map((n) => {
      const x = (n ?? {}) as Record<string, unknown>;
      const st = x.structured;
      const summary =
        st && typeof st === "object" && st !== null && "summary" in st
          ? typeof (st as Record<string, unknown>).summary === "string"
            ? (st as Record<string, unknown>).summary
            : null
          : null;
      return {
        rawNote: String(x.content ?? ""),
        correctedNote: x.correctedNote ?? null,
        structuredSummary: summary,
      };
    })
    .filter((row) => String(row.rawNote ?? "").trim());
}

function latestDiscipline(notes: unknown[]): string {
  const sorted = [...(notes ?? [])].sort((a, b) => noteToMillis(b) - noteToMillis(a));
  const x = sorted[0];
  if (x && typeof x === "object" && "discipline" in x) {
    return String((x as Record<string, unknown>).discipline ?? "Clinical");
  }
  return "Clinical";
}

const SECTION_LABELS: Array<[keyof StructuredClinicalReportSections, string]> = [
  ["patientOverview", "Patient overview"],
  ["currentPresentation", "Current presentation"],
  ["riskAssessment", "Risk assessment"],
  ["incidentsSummary", "Incident summary"],
  ["behaviourAnalysis", "Behavioural analysis"],
  ["medicationCompliance", "Medication compliance"],
  ["MDTObservations", "MDT observations"],
  ["legalContext", "Legal context"],
  ["recommendation", "Clinical recommendation"],
];

export function structuredClinicalToUnified(report: StructuredClinicalReport): UnifiedReport {
  const s = report.sections;
  const sections = SECTION_LABELS.map(([key, heading]) => ({
    heading,
    content: String(s[key] ?? "").trim() || "—",
  }));
  return {
    kind: "unified",
    title: report.title,
    summary: report.summary?.trim() || "",
    sections,
    recommendations: Array.isArray(report.recommendations) ? [...report.recommendations] : [],
  };
}

export function mdtWardToUnified(r: MdtWardRoundReport): UnifiedReport {
  const s = r.sections;
  return {
    kind: "unified",
    title: r.title,
    summary: s.overallSummary?.trim() || "",
    sections: [
      { heading: "Nursing", content: s.nursingSummary?.trim() || "—" },
      { heading: "Psychiatry", content: s.psychiatrySummary?.trim() || "—" },
      { heading: "Psychology", content: s.psychologySummary?.trim() || "—" },
      { heading: "Occupational therapy", content: s.otSummary?.trim() || "—" },
      { heading: "Speech and language", content: s.saltSummary?.trim() || "—" },
      { heading: "Support", content: s.supportSummary?.trim() || "—" },
      { heading: "MDT plan", content: s.plan?.trim() || "—" },
    ],
    recommendations: [
      s.riskLevel ? `Risk level: ${s.riskLevel}` : "",
      s.plan ? `Plan: ${s.plan}` : "",
    ].filter(Boolean),
  };
}

export function managementHearingToUnified(r: ManagementHearingReport): UnifiedReport {
  const s = r.sections;
  return {
    kind: "unified",
    title: r.title,
    summary: [s.patientBackground, s.currentConcerns].filter(Boolean).join("\n\n").trim() || "",
    sections: [
      { heading: "Patient background", content: s.patientBackground?.trim() || "—" },
      { heading: "Current concerns", content: s.currentConcerns?.trim() || "—" },
      { heading: "Incident summary", content: s.incidentSummary?.trim() || "—" },
      { heading: "Risk assessment", content: s.riskAssessment?.trim() || "—" },
      { heading: "Legal status", content: s.legalStatus?.trim() || "—" },
      { heading: "Recommendation", content: s.recommendation?.trim() || "—" },
    ],
    recommendations: s.recommendation ? [s.recommendation] : [],
  };
}

export function simpleTextToUnified(title: string, text: string): UnifiedReport {
  return {
    kind: "unified",
    title,
    summary: text.slice(0, 800),
    sections: [{ heading: "Summary", content: text }],
    recommendations: [],
  };
}

export function resolveOrganisationType(org: { type?: string | null } | null | undefined): OrganisationType {
  const t = String(org?.type ?? "").toUpperCase();
  if (t === "CARE_HOME" || t === "NURSING_HOME") return "care_home";
  if (t === "SUPPORTED_LIVING" || t === "SUPPORTED") return "supported_living";
  return "hospital";
}

function parseUnifiedJson(text: string | null): UnifiedReport | null {
  if (!text) return null;
  try {
    const cleaned = stripJsonFence(text);
    const raw = JSON.parse(cleaned) as Record<string, unknown>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "Report";
    const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
    const recs = Array.isArray(raw.recommendations)
      ? raw.recommendations.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    const secRaw = raw.sections;
    const sections: { heading: string; content: string }[] = [];
    if (Array.isArray(secRaw)) {
      for (const item of secRaw) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const h =
          (typeof o.heading === "string" && o.heading.trim()) ||
          (typeof o.title === "string" && o.title.trim()) ||
          "";
        const c = typeof o.content === "string" ? o.content : "";
        if (h || c) sections.push({ heading: h || "Section", content: c.trim() || "—" });
      }
    }
    if (!title && !summary && sections.length === 0) return null;
    return {
      kind: "unified",
      title: title || "Report",
      summary,
      sections,
      recommendations: recs,
    };
  } catch {
    return null;
  }
}

async function generateSummaryFromAI(notes: unknown[], windowLabel: string): Promise<UnifiedReport | null> {
  const bundle = summariseNotes(notes);
  const prompt = `You are a UK clinical documentation assistant.

Summarise the following clinical notes for ${windowLabel}.

Return STRICT JSON only (no markdown):
{
  "title": "string",
  "summary": "string",
  "sections": [ { "heading": "string", "content": "string" } ],
  "recommendations": [ "string" ]
}

Use professional language. Do not invent facts not supported by the notes.

NOTES:
${bundle.slice(0, 14000)}`;

  const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  const parsed = parseUnifiedJson(text);
  if (parsed) return parsed;
  return null;
}

async function generateCareHomeFromAI(notes: unknown[]): Promise<UnifiedReport | null> {
  const bundle = summariseNotes(notes);
  const prompt = `You are a UK care home registered manager preparing a governance report.

Return STRICT JSON only:
{
  "title": "string",
  "summary": "string",
  "sections": [ { "heading": "string", "content": "string" } ],
  "recommendations": [ "string" ]
}

Cover: safety, safeguarding, staffing, medication, families, CQC-style themes.

NOTES:
${bundle.slice(0, 14000)}`;

  const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  return parseUnifiedJson(text);
}

function buildWindowedNotes(notes: unknown[], summaryWindow?: GenerateReportInput["summaryWindow"]): unknown[] {
  if (summaryWindow === "7d") {
    const f = filterNotesByDays(notes, 7);
    return f.length ? f : notes;
  }
  if (summaryWindow === "30d") {
    const f = filterNotesByDays(notes, 30);
    return f.length ? f : notes;
  }
  return notes;
}

/** Apply time window for Summary report type before discipline filtering. */
function scopeNotesForReport(input: GenerateReportInput): unknown[] {
  const list = Array.isArray(input.notes) ? input.notes : [];
  if (input.reportType === "Summary") {
    return buildWindowedNotes(list, input.summaryWindow);
  }
  return list;
}

const NO_DATA_DISCIPLINE: UnifiedReport = {
  kind: "unified",
  title: "⚠️ No data available for this patient yet",
  summary: "No notes available for this discipline",
  sections: [],
  recommendations: [],
};

function disciplineDisplayName(key: string): string {
  const map: Record<string, string> = {
    nurse: "Nursing",
    doctor: "Doctor",
    psychologist: "Psychology",
    ot: "Occupational Therapy",
    speech: "Speech & Language Therapy",
    salt: "Speech & Language Therapy",
    psychiatrist: "Psychiatry",
    support_worker: "Support",
    unknown: "Clinical",
  };
  return map[key] || key;
}

function buildGroupedExcerptForPrompt(notes: unknown[]): string {
  const grouped = groupNotesByDiscipline(notes);
  const labels: Record<string, string> = {
    nursing: "Nursing",
    psychiatry: "Psychiatry",
    psychology: "Psychology",
    occupationalTherapy: "Occupational Therapy",
    speechAndLanguage: "Speech & Language",
    supportWorker: "Support / other",
  };
  return Object.entries(grouped)
    .map(([k, arr]) => {
      const body = summariseNotes(arr ?? []);
      return `### ${labels[k] || k}\n${body}`;
    })
    .join("\n\n");
}

async function generateFullDisciplineAIReport(
  reportKind: "CPA" | "Tribunal" | "Summary" | "Management",
  notes: unknown[]
): Promise<UnifiedReport | null> {
  const grouped = buildGroupedExcerptForPrompt(notes);
  const prompt = `You are generating a professional UK ${reportKind} report from multi-disciplinary notes.

STRICT RULES:
- Each clinical discipline section must be clearly separated.
- Do not merge disciplines into one undifferentiated narrative.
- Do not invent facts; use only the excerpts below.

Return STRICT JSON only:
{
  "title": "string",
  "summary": "string",
  "sections": [ { "heading": "string", "content": "string" } ],
  "recommendations": [ "string" ]
}

DISCIPLINE-GROUPED NOTES:
${grouped.slice(0, 16000)}`;

  const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  return parseUnifiedJson(text);
}

async function generateSingleDisciplineAIReport(
  disciplineKey: string,
  notes: unknown[],
  reportTypeLabel: string
): Promise<UnifiedReport | null> {
  const label = disciplineDisplayName(disciplineKey);
  const compact = (notes ?? [])
    .slice(0, 40)
    .map((n) => getNoteBodyText(n as Record<string, unknown>))
    .filter(Boolean)
    .join("\n---\n")
    .slice(0, 12000);

  const prompt = `You are generating a professional ${label} clinical report (${reportTypeLabel}).

STRICT RULES:
- Only include ${label} information derived from the notes below.
- Do NOT reference or summarise other disciplines.
- Maintain professional clinical tone.

Return STRICT JSON only:
{
  "title": "string",
  "summary": "string",
  "sections": [
    { "heading": "Summary", "content": "string" },
    { "heading": "Observations", "content": "string" },
    { "heading": "Risks", "content": "string" },
    { "heading": "Recommendations", "content": "string" }
  ],
  "recommendations": [ "string" ]
}

NOTES (${label} only):
${compact}`;

  const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  return parseUnifiedJson(text);
}

async function generateHospitalFullReport(input: GenerateReportInput, list: unknown[]): Promise<UnifiedReport> {
  const { reportType, patientId = "", organisationId, mdtMode = "ward" } = input;
  const pid = String(patientId).trim();

  try {
    if (reportType === "MDT" && mdtMode === "ward") {
      const raw = await generateMdtWardRoundReport({
        patientId: pid,
        organisationId: organisationId ?? null,
        notes: list,
      });
      return mdtWardToUnified(raw as MdtWardRoundReport);
    }
    if (reportType === "MDT" && mdtMode === "clinical") {
      const sec = await generateClinicalReportSection({
        reportType: "mdtReview",
        patientId: pid,
        discipline: latestDiscipline(list),
        contextNotes: buildContextNotes(list),
      });
      return structuredClinicalToUnified(sec);
    }
    if (reportType === "Management_Hearing") {
      const raw = await generateManagementHearingReport({
        patientId: pid,
        organisationId: organisationId ?? null,
        notes: list,
      });
      return managementHearingToUnified(raw as ManagementHearingReport);
    }
    if (reportType === "CPA") {
      const ai = await generateFullDisciplineAIReport("CPA", list);
      if (ai) return ai;
      const sec = await generateClinicalReportSection({
        reportType: "cpa",
        patientId: pid,
        discipline: latestDiscipline(list),
        contextNotes: buildContextNotes(list),
      });
      return structuredClinicalToUnified(sec);
    }
    if (reportType === "Tribunal") {
      const ai = await generateFullDisciplineAIReport("Tribunal", list);
      if (ai) return ai;
      const sec = await generateClinicalReportSection({
        reportType: "tribunal",
        patientId: pid,
        discipline: latestDiscipline(list),
        contextNotes: buildContextNotes(list),
      });
      return structuredClinicalToUnified(sec);
    }
    if (reportType === "Summary") {
      const ai = await generateFullDisciplineAIReport("Summary", list);
      if (ai) return ai;
      const sw = input.summaryWindow ?? "all";
      const label =
        sw === "7d" ? "the last 7 days" : sw === "30d" ? "the last 30 days" : "the full note set";
      const sumAi = await generateSummaryFromAI(list, label);
      if (sumAi) return sumAi;
      const body = summariseNotes(list);
      const title =
        sw === "7d" ? "Weekly Patient Summary" : sw === "30d" ? "Monthly Patient Summary" : "Clinical notes summary";
      return simpleTextToUnified(title, `${title} (${label}):\n\n${body}`);
    }
  } catch (e) {
    console.error("AI ERROR:", e);
  }

  if (reportType === "Management_Hearing") {
    return managementHearingToUnified(buildManagementHearingFallback(list) as ManagementHearingReport);
  }
  if (reportType === "MDT" && mdtMode === "clinical") {
    const u = structuredClinicalToUnified(structuredReportFallback("mdtReview"));
    return { ...u, summary: STRUCTURED_CLINICAL_REPORT_TAGLINE };
  }
  if (reportType === "MDT") {
    return mdtWardToUnified(buildMdtWardFallback(groupNotesByDiscipline(list)));
  }
  if (reportType === "Summary") {
    const sw = input.summaryWindow ?? "all";
    const label =
      sw === "7d" ? "the last 7 days" : sw === "30d" ? "the last 30 days" : "the full note set";
    const body = summariseNotes(list);
    const title =
      sw === "7d" ? "Weekly Patient Summary" : sw === "30d" ? "Monthly Patient Summary" : "Clinical notes summary";
    return simpleTextToUnified(title, `${title} (${label}):\n\n${body}`);
  }
  const fb = reportType === "Tribunal" ? "tribunal" : "cpa";
  const u = structuredClinicalToUnified(structuredReportFallback(fb));
  return { ...u, summary: STRUCTURED_CLINICAL_REPORT_TAGLINE };
}

async function generateHospitalScopedReport(
  input: GenerateReportInput,
  disciplineKey: string
): Promise<UnifiedReport> {
  const list = Array.isArray(input.notes) ? input.notes : [];
  const { reportType, patientId = "", organisationId, mdtMode = "ward", summaryWindow = "all" } = input;
  const pid = String(patientId).trim();
  const disc = disciplineDisplayName(disciplineKey);

  try {
    if (reportType === "CPA" || reportType === "Tribunal" || reportType === "MDT") {
      if (reportType === "MDT" && mdtMode === "clinical") {
        const sec = await generateClinicalReportSection({
          reportType: "mdtReview",
          patientId: pid,
          discipline: disc,
          contextNotes: buildContextNotes(list),
        });
        return structuredClinicalToUnified(sec);
      }
      if (reportType === "MDT" && mdtMode === "ward") {
        const ai = await generateSingleDisciplineAIReport(disciplineKey, list, "MDT ward contribution");
        if (ai) return ai;
        const raw = await generateMdtWardRoundReport({
          patientId: pid,
          organisationId: organisationId ?? null,
          notes: list,
        });
        return mdtWardToUnified(raw as MdtWardRoundReport);
      }
      if (reportType === "CPA") {
        const sec = await generateClinicalReportSection({
          reportType: "cpa",
          patientId: pid,
          discipline: disc,
          contextNotes: buildContextNotes(list),
        });
        return structuredClinicalToUnified(sec);
      }
      const sec = await generateClinicalReportSection({
        reportType: "tribunal",
        patientId: pid,
        discipline: disc,
        contextNotes: buildContextNotes(list),
      });
      return structuredClinicalToUnified(sec);
    }
    if (reportType === "Management_Hearing") {
      const raw = await generateManagementHearingReport({
        patientId: pid,
        organisationId: organisationId ?? null,
        notes: list,
      });
      return managementHearingToUnified(raw as ManagementHearingReport);
    }
    if (reportType === "Summary") {
      const ai = await generateSummaryFromAI(list, "this discipline scope");
      if (ai) return ai;
      const body = summariseNotes(list);
      return simpleTextToUnified(`${disc} summary`, body);
    }
  } catch (e) {
    console.error("AI ERROR:", e);
  }

  if (reportType === "Management_Hearing") {
    return managementHearingToUnified(buildManagementHearingFallback(list) as ManagementHearingReport);
  }
  if (reportType === "MDT" && mdtMode === "clinical") {
    const u = structuredClinicalToUnified(structuredReportFallback("mdtReview"));
    return { ...u, summary: STRUCTURED_CLINICAL_REPORT_TAGLINE };
  }
  if (reportType === "MDT") {
    return mdtWardToUnified(buildMdtWardFallback(groupNotesByDiscipline(list)));
  }
  if (reportType === "Summary") {
    const sw = summaryWindow ?? "all";
    const label =
      sw === "7d" ? "the last 7 days" : sw === "30d" ? "the last 30 days" : "this discipline scope";
    const body = summariseNotes(list);
    return simpleTextToUnified(`${disc} summary`, body || `No notes in ${label} for this discipline.`);
  }
  const fb = reportType === "Tribunal" ? "tribunal" : "cpa";
  const u = structuredClinicalToUnified(structuredReportFallback(fb));
  return { ...u, summary: STRUCTURED_CLINICAL_REPORT_TAGLINE };
}

async function generateCareHomeReport(input: GenerateReportInput): Promise<UnifiedReport> {
  const list = Array.isArray(input.notes) ? input.notes : [];
  const ai = await generateCareHomeFromAI(list);
  if (ai) return ai;

  const body = summariseNotes(list);
  return {
    kind: "unified",
    title: "Care home management report",
    summary: STRUCTURED_AI_FALLBACK.summary,
    sections: [{ heading: "Notes summary", content: body || "—" }],
    recommendations: ["Review risk and safeguarding at the next management meeting."],
  };
}

/**
 * Main entry: role/discipline scope, then organisation + report type, returns unified shape for UI + PDF.
 */
export async function generateReport(input: GenerateReportInput): Promise<UnifiedReport> {
  const rawList = Array.isArray(input.notes) ? input.notes : [];

  if (!rawList.length) {
    return {
      kind: "unified",
      title: "⚠️ No data available for this patient yet",
      summary: "No clinical notes available for this patient. Add notes before generating a report.",
      sections: [],
      recommendations: [],
    };
  }

  const list = scopeNotesForReport(input);
  if (input.reportType === "Summary" && !list.length) {
    return {
      kind: "unified",
      title: "No notes in the selected time window",
      summary: "No notes in the selected time window.",
      sections: [],
      recommendations: [],
    };
  }

  if (input.organisationType !== "hospital") {
    return generateCareHomeReport({ ...input, notes: list.length ? list : rawList });
  }

  const target = getTargetDiscipline({
    userRole: input.userRole ?? "staff",
    userDiscipline: input.userDiscipline ?? "nurse",
    selectedDiscipline: input.selectedDiscipline,
  });

  const workList = list.length ? list : rawList;

  if (target === "ALL") {
    return generateHospitalFullReport(input, workList);
  }

  const filtered = filterNotesByDiscipline(workList, target);
  if (!filtered.length) {
    return { ...NO_DATA_DISCIPLINE };
  }

  return generateHospitalScopedReport({ ...input, notes: filtered }, target);
}

/** Convert legacy pipeline outputs (simpleText, structured, mdt, management) to unified for UI. */
export function legacyReportToUnified(report: unknown, fallbackType: string): UnifiedReport {
  if (report && typeof report === "object" && (report as UnifiedReport).kind === "unified") {
    return report as UnifiedReport;
  }

  if (report && typeof report === "object" && (report as { kind?: string }).kind === "simpleText") {
    const r = report as { title?: string; text?: string };
    return simpleTextToUnified(String(r.title ?? "Report"), String(r.text ?? ""));
  }

  if (report && typeof report === "object" && (report as { kind?: string }).kind === "mdtWardRound") {
    return mdtWardToUnified(report as MdtWardRoundReport);
  }

  if (report && typeof report === "object" && (report as { kind?: string }).kind === "managementHearing") {
    return managementHearingToUnified(report as ManagementHearingReport);
  }

  if (report && typeof report === "object" && (report as StructuredClinicalReport).sections) {
    const s = (report as StructuredClinicalReport).sections;
    if (typeof s.patientOverview === "string") {
      return structuredClinicalToUnified(report as StructuredClinicalReport);
    }
  }

  return {
    kind: "unified",
    title: "Report",
    summary: STRUCTURED_CLINICAL_REPORT_TAGLINE,
    sections: [
      {
        heading: "Details",
        content: String(JSON.stringify(report ?? {}, null, 2)).slice(0, 8000) || STRUCTURED_CLINICAL_REPORT_TAGLINE,
      },
    ],
    recommendations: [],
  };
}

export { STRUCTURED_AI_FALLBACK };
export { getTargetDiscipline } from "../utils/reportDiscipline.js";
