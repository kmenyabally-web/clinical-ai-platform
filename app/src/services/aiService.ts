/**
 * Clinical note analysis via Google Gemini + care-plan / inspection helpers from {@link ./geminiAiService.js}.
 *
 * Requires `VITE_GEMINI_API_KEY` in `.env` (see `.env.example`). Key is compile-time only — never log or render it.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ClinicalCareFolder, ClinicalMdtReview, ClinicalReportSection, ClinicalReports, ClinicalStructuredData, ClinicalSummary } from "../types/clinical";

export * from "./geminiAiService.js";

const NOTE_ANALYSIS_MODEL = "gemini-2.0-flash";

export type NoteAnalysisResult = {
  discipline: string;
  behaviour: string;
  mood: string;
  engagement: string;
  physicalHealth: string;
  medicationIssues: string;
  incidents: string[];
  riskIndicators: string[];
  summary: string;
};

export type ClinicalNoteEngineResult = {
  correctedNote: string;
  structuredData: ClinicalStructuredData;
  summaries: ClinicalSummary[];
  mdtReview: ClinicalMdtReview;
  reports: ClinicalReports;
  careFolder: ClinicalCareFolder;
};

function requireGeminiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== "string" || !key.trim()) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Copy app/.env.example to app/.env and add your key.");
  }
  return key.trim();
}

function parseFailureFallback(discipline: string, detail?: string): NoteAnalysisResult {
  return {
    discipline: discipline || "Clinical",
    behaviour: "Not documented",
    mood: "Not documented",
    engagement: "Not documented",
    physicalHealth: "Not documented",
    medicationIssues: "Not documented",
    incidents: [],
    riskIndicators: [],
    summary: detail ?? "AI parsing failed",
  };
}

/** Strip markdown / code fences; Gemini often wraps JSON. */
function safeParse(text: string): unknown | null {
  try {
    const cleaned = text
      .replace(/`json/gi, "")
      .replace(/`/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function normaliseResult(raw: unknown, discipline: string): NoteAnalysisResult {
  if (!raw || typeof raw !== "object") {
    return parseFailureFallback(discipline);
  }
  const o = raw as Record<string, unknown>;
  return {
    discipline: typeof o.discipline === "string" && o.discipline.trim() ? o.discipline.trim() : discipline || "Clinical",
    behaviour: typeof o.behaviour === "string" ? o.behaviour : "Not documented",
    mood: typeof o.mood === "string" ? o.mood : "Not documented",
    engagement: typeof o.engagement === "string" ? o.engagement : "Not documented",
    physicalHealth: typeof o.physicalHealth === "string" ? o.physicalHealth : "Not documented",
    medicationIssues: typeof o.medicationIssues === "string" ? o.medicationIssues : "Not documented",
    incidents: asStringArray(o.incidents),
    riskIndicators: asStringArray(o.riskIndicators),
    summary: typeof o.summary === "string" ? o.summary : "Not documented",
  };
}

function safeString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
}

function asStringArraySafe(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function parseEngineFallback(discipline: string, detail?: string): ClinicalNoteEngineResult {
  const safeDiscipline = discipline || "Clinical";
  return {
    correctedNote: safeString(detail) ?? "AI correction unavailable for this note.",
    structuredData: {
      discipline: safeDiscipline,
      behaviour: "Not documented",
      mood: "Not documented",
      engagement: "Not documented",
      risk: "Not documented",
      physicalHealth: "Not documented",
      medicationIssues: "Not documented",
      incidents: [],
      riskIndicators: [],
      progress: safeString(detail) ?? "AI parsing failed",
      summary: safeString(detail) ?? "AI parsing failed",
    },
    summaries: [
      { title: "Clinical snapshot", text: safeString(detail) ?? "AI parsing failed" },
    ],
    mdtReview: {
      discipline: safeDiscipline,
      summary: safeString(detail) ?? "AI parsing failed",
      recommendations: [],
      risksToAddress: [],
      nextActions: [],
    },
    reports: {
      cpa: { title: "CPA report", content: "Report generation unavailable for this note." },
      tribunal: { title: "Tribunal report", content: "Report generation unavailable for this note." },
      mdtReview: { title: "MDT review", content: "MDT review generation unavailable for this note." },
    },
    careFolder: {
      suggestedPlacements: [],
    },
  };
}

function normaliseEngineResult(raw: unknown, discipline: string, content: string): ClinicalNoteEngineResult {
  if (!raw || typeof raw !== "object") return parseEngineFallback(discipline);
  const o = raw as Record<string, unknown>;

  const correctedNote = safeString(o.correctedNote) ?? content.trim() ?? "";

  const sd = o.structuredData && typeof o.structuredData === "object" ? (o.structuredData as Record<string, unknown>) : {};
  const riskIndicators = asStringArraySafe(sd.riskIndicators);
  const incidents = asStringArraySafe(sd.incidents);
  const summary = safeString(sd.summary) ?? "Not documented";
  const structuredData: ClinicalStructuredData = {
    discipline: safeString(sd.discipline) ?? discipline ?? "Clinical",
    behaviour: safeString(sd.behaviour) ?? "Not documented",
    mood: safeString(sd.mood) ?? "Not documented",
    engagement: safeString(sd.engagement) ?? "Not documented",
    physicalHealth: safeString(sd.physicalHealth) ?? "Not documented",
    medicationIssues: safeString(sd.medicationIssues) ?? "Not documented",
    risk: riskIndicators.length ? riskIndicators.join(", ") : "Not documented",
    progress: summary,
    summary,
    riskIndicators,
    incidents,
  };

  const summariesRaw = Array.isArray(o.summaries) ? o.summaries : [];
  const summaries: ClinicalSummary[] = summariesRaw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const item = x as Record<string, unknown>;
      const title = safeString(item.title) ?? "Summary";
      const text = safeString(item.text) ?? "";
      if (!text) return null;
      return { title, text };
    })
    .filter(Boolean) as ClinicalSummary[];
  const safeSummaries = summaries.length ? summaries : [{ title: "Clinical snapshot", text: structuredData.summary ?? "Not documented" }];

  const mr = o.mdtReview && typeof o.mdtReview === "object" ? (o.mdtReview as Record<string, unknown>) : {};
  const mdtReview: ClinicalMdtReview = {
    discipline: safeString(mr.discipline) ?? structuredData.discipline ?? discipline ?? "Clinical",
    summary: safeString(mr.summary) ?? structuredData.summary ?? "Not documented",
    recommendations: asStringArraySafe(mr.recommendations),
    risksToAddress: asStringArraySafe(mr.risksToAddress),
    nextActions: asStringArraySafe(mr.nextActions),
  };

  const rep = o.reports && typeof o.reports === "object" ? (o.reports as Record<string, unknown>) : {};
  const toSection = (v: unknown): { title: string; content: string } | undefined => {
    if (!v || typeof v !== "object") return undefined;
    const x = v as Record<string, unknown>;
    const title = safeString(x.title);
    const content = safeString(x.content);
    if (!title && !content) return undefined;
    return { title: title ?? "Report section", content: content ?? "" };
  };

  const reports: ClinicalReports = {
    cpa: toSection(rep.cpa),
    tribunal: toSection(rep.tribunal),
    mdtReview: toSection(rep.mdtReview),
  };

  const cf = o.careFolder && typeof o.careFolder === "object" ? (o.careFolder as Record<string, unknown>) : {};
  const placementsRaw = Array.isArray(cf.suggestedPlacements) ? cf.suggestedPlacements : [];
  const suggestedPlacements = placementsRaw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const item = x as Record<string, unknown>;
      const section = safeString(item.section);
      const documentType = safeString(item.documentType);
      const title = safeString(item.title);
      const content = safeString(item.content);
      if (!section || !documentType || !title || !content) return null;
      return { section, documentType, title, content };
    })
    .filter(Boolean) as ClinicalCareFolder["suggestedPlacements"] extends Array<infer T> ? T[] : any;

  const careFolder: ClinicalCareFolder = { suggestedPlacements: suggestedPlacements.length ? suggestedPlacements : [] };

  return {
    correctedNote: correctedNote.trim() || parseEngineFallback(discipline).correctedNote,
    structuredData,
    summaries: safeSummaries,
    mdtReview,
    reports,
    careFolder,
  };
}

/**
 * Analyses raw note text with Gemini; returns structured fields for Firestore.
 * Throws on missing API key or transport errors — callers should catch and optionally save without structured data.
 * JSON parse failures return a safe fallback object (never throw).
 */
export async function analyseNote(
  content: string,
  discipline: string,
  patientId: string
): Promise<NoteAnalysisResult> {
  const apiKey = requireGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: NOTE_ANALYSIS_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = `You are a clinical documentation assistant for UK health and social care.

Analyse the following note and return STRICT JSON only (no markdown, no commentary).

Patient record ID (context only): ${patientId}

MDT role / clinical discipline (use exactly this label in the "discipline" field unless clearly wrong):
${discipline}

Note text:
${content}

Return exactly this JSON shape with string values and string arrays:

{
  "discipline": "...",
  "behaviour": "...",
  "mood": "...",
  "engagement": "...",
  "physicalHealth": "...",
  "medicationIssues": "...",
  "incidents": [],
  "riskIndicators": [],
  "summary": "..."
}

Rules:
- Use "Not documented" where information is missing.
- Use professional, person-centred clinical language.
- riskIndicators: short lowercase tags where appropriate (e.g. "aggression", "medication refusal").
- incidents: brief descriptors if relevant, else [].
- Do not include explanations outside the JSON.`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() ?? "";

  const parsed = safeParse(text);
  if (!parsed) {
    console.error("Gemini clinical note parse error (safeParse returned null):", text);
    return parseFailureFallback(discipline || "Clinical", "AI parsing failed");
  }
  return normaliseResult(parsed, discipline || "Clinical");
}

/**
 * Full clinical documentation engine for note submission.
 * Returns corrected narrative + richer structured artifacts for UI tabs.
 */
export async function analyseClinicalNoteEngine(
  content: string,
  discipline: string,
  patientId: string
): Promise<ClinicalNoteEngineResult> {
  const apiKey = requireGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: NOTE_ANALYSIS_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const safeDiscipline = discipline || "Clinical";
  const prompt = `You are a clinical documentation assistant for UK health and social care.
Analyse the following raw staff note and produce STRICT JSON only (no markdown, no commentary).

Context (record ID only, do not quote or repeat it in output):
${patientId}

Discipline / MDT role label (use exactly this label where applicable):
${safeDiscipline}

Task:
1) correctedNote: rewrite the note in professional, person-centred clinical documentation style while preserving meaning.
2) structuredData: structured clinical fields for the person described in the note.
3) summaries: 1-3 short narrative summaries useful for rapid review.
4) mdtReview: an MDT review summary plus recommended next actions.
5) reports: draft content for CPA report, Tribunal report, and MDT review.
6) careFolder: suggested care-folder placement(s) (section + documentType) with a short snippet.

Return exactly this JSON shape:
{
  "correctedNote": "string",
  "structuredData": {
    "discipline": "string",
    "behaviour": "string",
    "mood": "string",
    "engagement": "string",
    "physicalHealth": "string",
    "medicationIssues": "string",
    "incidents": ["string"],
    "riskIndicators": ["string"],
    "summary": "string"
  },
  "summaries": [
    { "title": "string", "text": "string" }
  ],
  "mdtReview": {
    "discipline": "string",
    "summary": "string",
    "recommendations": ["string"],
    "risksToAddress": ["string"],
    "nextActions": ["string"]
  },
  "reports": {
    "cpa": { "title": "string", "content": "string" },
    "tribunal": { "title": "string", "content": "string" },
    "mdtReview": { "title": "string", "content": "string" }
  },
  "careFolder": {
    "suggestedPlacements": [
      { "section": "string", "documentType": "string", "title": "string", "content": "string" }
    ]
  }
}

Rules:
- Use "Not documented" where information is missing.
- Do not invent clinical events that are not in the note.
- riskIndicators must be short lowercase tags (e.g. "aggression", "medication refusal").
- incidents must be brief descriptors if relevant, else [].
- Do not include explanations outside the JSON.
- correctedNote should not include PHI that isn't already in the note.`;

  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() ?? "";

  const parsed = safeParse(text);
  if (!parsed) {
    console.error("Gemini clinical note engine parse error (safeParse returned null):", text);
    return parseEngineFallback(safeDiscipline, "AI parsing failed");
  }

  try {
    return normaliseEngineResult(parsed, safeDiscipline, content);
  } catch {
    return parseEngineFallback(safeDiscipline, "AI parsing failed");
  }
}

/**
 * Requested simpler API for note submission.
 * Uses `authorRole` as the MDT discipline label expected by the engine.
 */
export async function analyseClinicalNote(note: {
  content: string;
  authorRole: string;
  patientId: string;
}): Promise<ClinicalNoteEngineResult> {
  const content = (note?.content ?? "").toString();
  const authorRole = (note?.authorRole ?? "").toString();
  const patientId = (note?.patientId ?? "").toString();

  return analyseClinicalNoteEngine(content, authorRole, patientId);
}

export type ClinicalReportType = "cpa" | "tribunal" | "mdtReview";

function reportFallback(reportType: ClinicalReportType): ClinicalReportSection {
  const title =
    reportType === "cpa"
      ? "CPA report"
      : reportType === "tribunal"
        ? "Tribunal report"
        : "MDT review report";
  return { title, content: "Report generation unavailable." };
}

/**
 * Generates a single report section (title + content) for a given set of clinical notes.
 */
export async function generateClinicalReportSection(params: {
  reportType: ClinicalReportType;
  patientId: string;
  discipline: string;
  contextNotes: Array<{ rawNote: string; correctedNote?: string | null; structuredSummary?: string | null }>;
}): Promise<ClinicalReportSection> {
  const { reportType, patientId, discipline, contextNotes } = params;

  const apiKey = requireGeminiKey();
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: NOTE_ANALYSIS_MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const context = (contextNotes ?? [])
    .map((n, idx) => {
      const corrected = n.correctedNote ? `Corrected note:\n${n.correctedNote}` : "";
      const summary = n.structuredSummary ? `AI summary:\n${n.structuredSummary}` : "";
      return `Note ${idx + 1}:\nRaw note:\n${n.rawNote}\n${corrected}\n${summary}`.trim();
    })
    .join("\n\n---\n\n");

  const reportInstructions =
    reportType === "cpa"
      ? "Create a Regulation 9 compliant Care Programme Approach (CPA) report draft."
      : reportType === "tribunal"
        ? "Create a Tribunal report draft (clear facts as documented; do not speculate)."
        : "Create an MDT review report draft for the provided clinical context.";

  const prompt = `You are a clinical documentation assistant for UK health and social care.
Generate ${reportType} documentation based ONLY on the provided notes.

Context record ID (do not repeat):
${patientId}

Discipline / MDT role:
${discipline}

Task:
${reportInstructions}

Return STRICT JSON only:
{ "title": "string", "content": "string" }

Rules:
- Do not invent facts not present in the notes.
- Use professional, person-centred language.
- Include relevant risks and actions derived from the note context.
- If information is missing, state "Not documented" rather than guessing.
- Content must be plain text (no markdown tables).`;

  const result = await model.generateContent(`${prompt}\n\nClinical notes context:\n${context}`);
  const text = result?.response?.text?.() ?? "";
  const parsed = safeParse(text);
  if (!parsed || !parsed || typeof parsed !== "object") {
    console.error("Gemini report parse error:", text);
    return reportFallback(reportType);
  }

  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : reportFallback(reportType).title;
  const content = typeof o.content === "string" ? o.content.trim() : reportFallback(reportType).content;
  return { title: title || reportFallback(reportType).title, content };
}
