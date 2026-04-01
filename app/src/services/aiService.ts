/**
 * Clinical note analysis via Google Gemini + care-plan / inspection helpers from {@link ./geminiAiService.js}.
 *
 * Requires `VITE_GEMINI_API_KEY` in `.env` (see `.env.example`). Key is compile-time only — never log or render it.
 */

/* eslint-disable no-console -- model id debug for Gemini integration */
import type {
  ClinicalCareFolder,
  ClinicalMdtReview,
  ClinicalReportSection,
  ClinicalReports,
  ClinicalStructuredData,
  ClinicalSummary,
  StructuredClinicalReport,
  StructuredClinicalReportSections,
} from "../types/clinical";
import { DEFAULT_GEMINI_MODEL_ID } from "../config/geminiModel.js";
import { generateAIContent } from "./geminiAiService.js";

export * from "./geminiAiService.js";

const NOTE_ANALYSIS_MODEL = DEFAULT_GEMINI_MODEL_ID;

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
  const prompt = `You are a clinical documentation assistant for UK health and social care.

STRICT MODE: Do not hallucinate. Use ONLY information in the note text below. If there is no usable content, set string fields to "Insufficient data" and arrays to [].

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
- Use "Insufficient data" where the note provides no information on that field.
- Use "Not documented" only where the topic is relevant but not described.
- Use professional, person-centred clinical language.
- riskIndicators: short lowercase tags where appropriate (e.g. "aggression", "medication refusal").
- incidents: brief descriptors if relevant, else [].
- Do not include explanations outside the JSON.`;

  const disc = discipline || "Clinical";
  // eslint-disable-next-line no-console
  console.log("Using model:", NOTE_ANALYSIS_MODEL);
  try {
    const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!text) {
      return parseFailureFallback(disc, "AI generation unavailable. Showing structured fallback report.");
    }

    const parsed = safeParse(text);
    if (!parsed) {
      console.error("Gemini clinical note parse error (safeParse returned null):", text);
      return parseFailureFallback(disc, "AI parsing failed");
    }
    return normaliseResult(parsed, disc);
  } catch (err) {
    console.error("AI ERROR:", err);
    return parseFailureFallback(disc, "AI generation unavailable. Showing structured fallback report.");
  }
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
  const safeDiscipline = discipline || "Clinical";
  const prompt = `You are a clinical documentation assistant for UK health and social care.

STRICT MODE: Do not hallucinate clinical events, medications, or risks. Derive every output field ONLY from the note text. If the note is empty or unusable, use "Insufficient data" for narrative fields and empty arrays where appropriate.

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
- Use "Insufficient data" when the note does not support a section.
- Use "Not documented" only where the topic applies but is not described in the note.
- Do not invent clinical events that are not in the note.
- riskIndicators must be short lowercase tags (e.g. "aggression", "medication refusal").
- incidents must be brief descriptors if relevant, else [].
- Do not include explanations outside the JSON.
- correctedNote should not include PHI that isn't already in the note.`;

  console.log("Using model:", NOTE_ANALYSIS_MODEL);
  try {
    const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!text) {
      return parseEngineFallback(safeDiscipline, "AI generation unavailable. Showing structured fallback report.");
    }

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
  } catch (err) {
    console.error("AI ERROR:", err);
    return parseEngineFallback(safeDiscipline, "AI generation unavailable. Showing structured fallback report.");
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

function defaultStructuredTitle(reportType: ClinicalReportType): string {
  if (reportType === "cpa") return "Care Programme Approach (CPA) Report";
  if (reportType === "tribunal") return "Mental Health Tribunal Report";
  return "Multi-Disciplinary Team Review Report";
}

function emptyStructuredSections(): StructuredClinicalReportSections {
  return {
    patientOverview: "",
    currentPresentation: "",
    riskAssessment: "",
    incidentsSummary: "",
    behaviourAnalysis: "",
    medicationCompliance: "",
    MDTObservations: "",
    legalContext: "",
    recommendation: "",
  };
}

/** Deterministic placeholder when AI is unavailable or parse fails. */
export function structuredReportFallback(reportType: ClinicalReportType): StructuredClinicalReport {
  const base = emptyStructuredSections();
  if (reportType === "tribunal") {
    const sections = {
      ...base,
      patientOverview: "Patient currently admitted; confirm status and legal framework from the live record.",
      currentPresentation: "Patient presents with difficulties as documented in available notes; expand with latest assessment.",
      riskAssessment: "Risk remains elevated; multidisciplinary review and formal risk tools are required.",
      incidentsSummary: "Recent incidents include those recorded in supplied notes; verify against the full incident log.",
      behaviourAnalysis: "Behavioural patterns indicate ongoing need for structured observation and care planning.",
      medicationCompliance: "Medication adherence is inconsistent where noted; confirm with MAR and prescriber.",
      MDTObservations: "MDT reports indicate ongoing care coordination; align with latest meeting records.",
      legalContext: "Patient detained under the Mental Health Act; confirm section and authority from statutory documentation.",
      recommendation: "Continued detention and treatment in accordance with the care plan and legal framework is recommended pending review.",
    };
    return {
      title: "Tribunal Report",
      summary:
        "Structured tribunal report placeholder. Populate from live records and multidisciplinary review before submission.",
      sections,
      recommendations: [
        "Confirm legal status and detention authority from statutory records.",
        "Complete formal risk formulation with the multidisciplinary team.",
      ],
    };
  }
  if (reportType === "cpa") {
    const sections = {
      ...base,
      patientOverview: "Care Programme Approach summary; confirm identifiers and legal status from the live record.",
      currentPresentation: "Current presentation as documented in available notes; expand with latest observations.",
      riskAssessment: "Risks identified in the record require ongoing review and mitigation planning.",
      incidentsSummary: "Incident history should be cross-checked with the organisation’s incident system.",
      behaviourAnalysis: "Behavioural themes reflect entries in the supplied notes only.",
      medicationCompliance: "Medication issues require validation with the MAR and prescriber.",
      MDTObservations: "MDT input should be updated after the next scheduled review.",
      legalContext: "Regulatory and consent matters must reflect current documentation.",
      recommendation: "Recommendations are interim until a full CPA review is completed.",
    };
    return {
      title: "CPA Report",
      summary:
        "Structured CPA report placeholder. Use only verified note content and complete a full CPA review meeting.",
      sections,
      recommendations: [
        "Schedule a full CPA review with the care team and service user.",
        "Update the care plan and risk assessment after review.",
      ],
    };
  }
  const sections = {
    ...base,
    patientOverview: "Patient overview to be completed from multidisciplinary records.",
    currentPresentation: "Current presentation reflects available note content.",
    riskAssessment: "Risk assessment requires confirmation with the clinical team.",
    incidentsSummary: "Incident summary is indicative only; verify with formal logs.",
    behaviourAnalysis: "Behavioural analysis is based on supplied documentation.",
    medicationCompliance: "Medication compliance to be confirmed with clinical staff.",
    MDTObservations: "MDT observations to be aligned with latest meeting minutes.",
    legalContext: "Legal context to be verified by responsible clinicians.",
    recommendation: "Further MDT follow-up recommended.",
  };
  return {
    title: "MDT Review Report",
    summary: "Structured MDT review placeholder. Synthesise from current multidisciplinary records and governance.",
    sections,
    recommendations: ["Convene MDT to confirm risks and next actions.", "Document decisions in the clinical record."],
  };
}

const HEADING_TO_SECTION_KEY: Record<string, keyof StructuredClinicalReportSections> = {
  "patient overview": "patientOverview",
  "current presentation": "currentPresentation",
  "risk assessment": "riskAssessment",
  "incident summary": "incidentsSummary",
  "incidents summary": "incidentsSummary",
  "behavioural analysis": "behaviourAnalysis",
  "behavior analysis": "behaviourAnalysis",
  "medication compliance": "medicationCompliance",
  "mdt observations": "MDTObservations",
  "legal context": "legalContext",
  "clinical recommendation": "recommendation",
  recommendation: "recommendation",
};

function sectionsFromHeadingArray(arr: unknown): Partial<Record<keyof StructuredClinicalReportSections, string>> | null {
  if (!Array.isArray(arr)) return null;
  const out: Partial<Record<keyof StructuredClinicalReportSections, string>> = {};
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const heading = typeof row.heading === "string" ? row.heading.trim().toLowerCase() : "";
    const content = typeof row.content === "string" ? row.content.trim() : "";
    if (!heading || !content) continue;
    const key = HEADING_TO_SECTION_KEY[heading];
    if (key) out[key] = content;
  }
  return Object.keys(out).length ? out : null;
}

function normaliseStructuredReport(raw: unknown, reportType: ClinicalReportType): StructuredClinicalReport {
  const fallback = structuredReportFallback(reportType);
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  const title =
    typeof o.title === "string" && o.title.trim() ? o.title.trim() : defaultStructuredTitle(reportType);
  const summary = typeof o.summary === "string" && o.summary.trim() ? o.summary.trim() : "";

  let recs: string[] = [];
  if (Array.isArray(o.recommendations)) {
    recs = o.recommendations.map((x) => String(x ?? "").trim()).filter(Boolean);
  }

  const secRaw = o.sections;
  let fromArray: Partial<Record<keyof StructuredClinicalReportSections, string>> | null = null;
  if (Array.isArray(secRaw)) {
    fromArray = sectionsFromHeadingArray(secRaw);
  }
  const sec =
    secRaw && typeof secRaw === "object" && secRaw !== null && !Array.isArray(secRaw)
      ? (secRaw as Record<string, unknown>)
      : {};
  const pick = (key: keyof StructuredClinicalReportSections): string => {
    if (fromArray && fromArray[key]) return fromArray[key] as string;
    const v = sec[key];
    return typeof v === "string" ? v.trim() : "";
  };

  const sections: StructuredClinicalReportSections = {
    patientOverview: pick("patientOverview"),
    currentPresentation: pick("currentPresentation"),
    riskAssessment: pick("riskAssessment"),
    incidentsSummary: pick("incidentsSummary"),
    behaviourAnalysis: pick("behaviourAnalysis"),
    medicationCompliance: pick("medicationCompliance"),
    MDTObservations: pick("MDTObservations") || pick("mdtObservations"),
    legalContext: pick("legalContext"),
    recommendation: pick("recommendation"),
  };

  const summaryOut =
    summary ||
    [sections.patientOverview, sections.currentPresentation].filter(Boolean).join("\n\n").trim() ||
    fallback.summary;

  const recommendationsOut = recs.length ? recs : sections.recommendation ? [sections.recommendation] : fallback.recommendations;

  return {
    title,
    summary: summaryOut,
    sections,
    recommendations: recommendationsOut,
  };
}

function buildStructuredReportPrompt(
  reportType: ClinicalReportType,
  patientId: string,
  discipline: string,
  contextBlock: string
): string {
  const jsonFooter = `Return STRICT JSON only (no markdown fences) with exactly this shape:
{
  "title": "string",
  "summary": "string",
  "recommendations": ["string"],
  "sections": {
    "patientOverview": "string",
    "currentPresentation": "string",
    "riskAssessment": "string",
    "incidentsSummary": "string",
    "behaviourAnalysis": "string",
    "medicationCompliance": "string",
    "MDTObservations": "string",
    "legalContext": "string",
    "recommendation": "string"
  }
}

Alternatively you may use "sections" as an array of { "heading": "Section name", "content": "..." } with headings matching the nine section titles above.

Use "Insufficient data" for a section only when the notes contain no relevant information. Do not invent clinical facts.`;

  if (reportType === "tribunal") {
    return `You are a senior consultant psychiatrist.

Generate a PROFESSIONAL UK mental health tribunal report.

Rules:
- Use formal clinical tone
- No bullet points
- No hallucination
- Only use provided data

Structure EXACTLY:

1. Patient Overview
2. Current Presentation
3. Risk Assessment
4. Incident Summary
5. Behavioural Analysis
6. Medication Compliance
7. MDT Observations
8. Legal Context
9. Clinical Recommendation

Write in paragraphs. Map each section to the corresponding JSON field under "sections".

Context record ID (do not repeat verbatim in output): ${patientId}
Discipline / MDT role: ${discipline}

Clinical notes context:
${contextBlock}

${jsonFooter}`;
  }

  if (reportType === "cpa") {
    return `You are a senior UK clinician preparing a Regulation 9 aligned Care Programme Approach (CPA) report.

Rules:
- Formal clinical tone; continuous prose only (no bullet points)
- No hallucination; only use provided data
- Populate all nine sections from the structure below

Sections:
1. Patient Overview
2. Current Presentation
3. Risk Assessment
4. Incident Summary
5. Behavioural Analysis
6. Medication Compliance
7. MDT Observations
8. Legal Context
9. Clinical Recommendation

Context record ID: ${patientId}
Discipline: ${discipline}

Clinical notes:
${contextBlock}

${jsonFooter}`;
  }

  return `You are a senior UK clinician preparing a multi-disciplinary team (MDT) review summary for governance and care planning.

Rules:
- Formal clinical tone; paragraphs only (no bullet points)
- No hallucination; only use provided data

Use the same nine sections:

1. Patient Overview
2. Current Presentation
3. Risk Assessment
4. Incident Summary
5. Behavioural Analysis
6. Medication Compliance
7. MDT Observations
8. Legal Context
9. Clinical Recommendation

Context record ID: ${patientId}
Discipline: ${discipline}

Clinical notes:
${contextBlock}

${jsonFooter}`;
}

/**
 * Generates a structured clinical report (nine narrative sections) from note context.
 */
export async function generateClinicalReportSection(params: {
  reportType: ClinicalReportType;
  patientId: string;
  discipline: string;
  contextNotes: Array<{ rawNote: string; correctedNote?: string | null; structuredSummary?: string | null }>;
}): Promise<StructuredClinicalReport> {
  const { reportType, patientId, discipline, contextNotes } = params;

  const context = (contextNotes ?? [])
    .map((n, idx) => {
      const corrected = n.correctedNote ? `Corrected note:\n${n.correctedNote}` : "";
      const summary = n.structuredSummary ? `AI summary:\n${n.structuredSummary}` : "";
      return `Note ${idx + 1}:\nRaw note:\n${n.rawNote}\n${corrected}\n${summary}`.trim();
    })
    .join("\n\n---\n\n");

  const prompt = buildStructuredReportPrompt(reportType, patientId, discipline, context || "(none)");

  console.log("Using model:", NOTE_ANALYSIS_MODEL);
  try {
    const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!text) {
      return structuredReportFallback(reportType);
    }
    const parsed = safeParse(text);
    if (!parsed || typeof parsed !== "object") {
      console.error("Gemini structured report parse error:", text);
      return structuredReportFallback(reportType);
    }
    return normaliseStructuredReport(parsed, reportType);
  } catch (err) {
    console.error("AI ERROR:", err);
    return structuredReportFallback(reportType);
  }
}
