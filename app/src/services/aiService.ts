/**
 * Clinical note analysis via Google Gemini + care-plan / inspection helpers from {@link ./geminiAiService.js}.
 *
 * Requires `VITE_GEMINI_API_KEY` in `.env` (see `.env.example`). Key is compile-time only — never log or render it.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

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
