/**
 * Enterprise MDT Ward Round + Management Hearing structured reports (Gemini JSON + fallbacks).
 */

import { DEFAULT_GEMINI_MODEL_ID } from "../config/geminiModel.js";
import { generateAIContent } from "./geminiAiService.js";
import { fetchClinicalNotesForPatient } from "./noteService";
import {
  groupNotesByDiscipline,
  summariseNotes,
  getNoteBodyText,
} from "../utils/mdtNoteGrouping.js";

function safeParseJson(text) {
  if (!text || typeof text !== "string") return null;
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function formatGroupedForPrompt(grouped) {
  const labels = {
    nursing: "Nursing",
    psychiatry: "Psychiatry",
    psychology: "Psychology",
    occupationalTherapy: "Occupational Therapy",
    speechAndLanguage: "Speech and Language",
    supportWorker: "Support / other",
  };
  return Object.entries(grouped)
    .map(([key, arr]) => {
      const texts = (arr ?? []).map((n) => getNoteBodyText(n)).filter(Boolean);
      const body = texts.length ? texts.join("\n---\n") : "(no notes in this bucket)";
      return `### ${labels[key] || key}\n${body}`;
    })
    .join("\n\n");
}

/** @returns {import("../types/clinical").MdtWardRoundReport} */
export function buildMdtWardFallback(grouped) {
  return {
    kind: "mdtWardRound",
    title: "MDT Ward Round Report",
    sections: {
      nursingSummary: summariseNotes(grouped.nursing),
      psychiatrySummary: summariseNotes(grouped.psychiatry),
      psychologySummary: summariseNotes(grouped.psychology),
      otSummary: summariseNotes(grouped.occupationalTherapy),
      saltSummary: summariseNotes(grouped.speechAndLanguage),
      supportSummary: summariseNotes(grouped.supportWorker),
      overallSummary:
        "Automated summary from discipline-grouped notes. A full MDT discussion should integrate these excerpts with live assessment.",
      riskLevel: "Medium",
      plan: "Confirm risks at the next MDT; update care plan and legal review dates as required.",
    },
  };
}

/** @returns {import("../types/clinical").ManagementHearingReport} */
export function buildManagementHearingFallback(notes) {
  const bundle = summariseNotes(notes);
  return {
    kind: "managementHearing",
    title: "Management Hearing Report",
    sections: {
      patientBackground: bundle.slice(0, 2500) || "Insufficient note content to summarise background.",
      currentConcerns:
        "Current concerns should be taken from the most recent multidisciplinary entries and risk assessments.",
      incidentSummary: "Cross-reference with the organisation incident management system for formal incidents.",
      riskAssessment: "Complete a fresh risk formulation using current observation and nursing data.",
      legalStatus: "Verify detention, capacity, and consent status against authority records.",
      recommendation: "Proceed with a formal management hearing when records and risk review are complete.",
    },
  };
}

function normaliseMdtParsed(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  const title = typeof o.title === "string" && o.title.trim() ? o.title.trim() : "MDT Ward Round Report";
  const s = o.sections && typeof o.sections === "object" ? o.sections : {};
  const pick = (k) => (typeof s[k] === "string" ? s[k].trim() : "");
  return {
    kind: "mdtWardRound",
    title,
    sections: {
      nursingSummary: pick("nursingSummary"),
      psychiatrySummary: pick("psychiatrySummary"),
      psychologySummary: pick("psychologySummary"),
      otSummary: pick("otSummary"),
      saltSummary: pick("saltSummary"),
      supportSummary: pick("supportSummary"),
      overallSummary: pick("overallSummary"),
      riskLevel: pick("riskLevel"),
      plan: pick("plan"),
    },
  };
}

function normaliseManagementParsed(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  const title = typeof o.title === "string" && o.title.trim() ? o.title.trim() : "Management Hearing Report";
  const s = o.sections && typeof o.sections === "object" ? o.sections : {};
  const pick = (k) => (typeof s[k] === "string" ? s[k].trim() : "");
  return {
    kind: "managementHearing",
    title,
    sections: {
      patientBackground: pick("patientBackground"),
      currentConcerns: pick("currentConcerns"),
      incidentSummary: pick("incidentSummary"),
      riskAssessment: pick("riskAssessment"),
      legalStatus: pick("legalStatus"),
      recommendation: pick("recommendation"),
    },
  };
}

async function resolveNotes(notesOverride, patientId, organisationId) {
  if (Array.isArray(notesOverride) && notesOverride.length) return notesOverride;
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];
  void organisationId;
  return fetchClinicalNotesForPatient(pid, { limitCount: 100 });
}

/**
 * @param {{ notes?: unknown[], patientId: string, organisationId?: string | null }} args
 */
export async function generateMdtWardRoundReport({ notes: notesOverride, patientId, organisationId }) {
  const notes = await resolveNotes(notesOverride, patientId, organisationId);
  const grouped = groupNotesByDiscipline(notes);
  const contextBlock = formatGroupedForPrompt(grouped);

  const jsonShape = `Return STRICT JSON only (no markdown fences):
{
  "title": "MDT Ward Round Report",
  "sections": {
    "nursingSummary": "string",
    "psychiatrySummary": "string",
    "psychologySummary": "string",
    "otSummary": "string",
    "saltSummary": "string",
    "supportSummary": "string",
    "overallSummary": "string",
    "riskLevel": "Low | Medium | High",
    "plan": "string"
  }
}`;

  const prompt = `You are a senior multidisciplinary clinical team.

Generate a PROFESSIONAL MDT ward round report.

Rules:
- Summarise each discipline separately
- Do NOT repeat notes verbatim; synthesise
- Use clinical language
- Identify key risks
- Provide clear MDT plan

Structure EXACTLY:

1. Nursing Summary
2. Psychiatry Summary
3. Psychology Summary
4. Occupational Therapy Summary
5. Speech and Language Summary
6. Support Worker Observations
7. Overall MDT Summary
8. Risk Level (Low / Medium / High)
9. MDT Plan

Use paragraphs only.

Patient / record context (IDs are for orientation only; do not paste identifiers into prose):
patientId: ${patientId}

Grouped clinical notes:
${contextBlock}

${jsonShape}`;

  console.log("Using model:", DEFAULT_GEMINI_MODEL_ID, "report: mdtWardRound");
  try {
    const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!text) {
      return buildMdtWardFallback(grouped);
    }
    const parsed = safeParseJson(text);
    const norm = normaliseMdtParsed(parsed);
    if (norm) return norm;
    return buildMdtWardFallback(grouped);
  } catch (e) {
    console.error("AI ERROR:", e);
    return buildMdtWardFallback(grouped);
  }
}

/**
 * @param {{ notes?: unknown[], patientId: string, organisationId?: string | null }} args
 */
export async function generateManagementHearingReport({ notes: notesOverride, patientId, organisationId }) {
  const notes = await resolveNotes(notesOverride, patientId, organisationId);
  const grouped = groupNotesByDiscipline(notes);
  const contextBlock = formatGroupedForPrompt(grouped);
  const bundle = summariseNotes(notes);

  const jsonShape = `Return STRICT JSON only (no markdown fences):
{
  "title": "Management Hearing Report",
  "sections": {
    "patientBackground": "string",
    "currentConcerns": "string",
    "incidentSummary": "string",
    "riskAssessment": "string",
    "legalStatus": "string",
    "recommendation": "string"
  }
}`;

  const prompt = `You are a senior clinical lead preparing a management hearing report.

Write a formal report including:

1. Patient Background
2. Current Concerns
3. Incident Summary
4. Risk Assessment
5. Legal Status
6. Recommendation

Use formal UK clinical language. Use paragraphs only. Do not invent facts not supported by the notes.

Patient / record context:
patientId: ${patientId}

Discipline-grouped notes:
${contextBlock}

Full note bundle (chronological excerpts):
${bundle.slice(0, 12000)}

${jsonShape}`;

  console.log("Using model:", DEFAULT_GEMINI_MODEL_ID, "report: managementHearing");
  try {
    const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!text) {
      return buildManagementHearingFallback(notes);
    }
    const parsed = safeParseJson(text);
    const norm = normaliseManagementParsed(parsed);
    if (norm) return norm;
    return buildManagementHearingFallback(notes);
  } catch (e) {
    console.error("AI ERROR:", e);
    return buildManagementHearingFallback(notes);
  }
}
