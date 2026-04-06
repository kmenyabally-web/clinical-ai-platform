/** [ENABLEMENT GATE: STAGE 12 - AI CARE PLAN GENERATOR] */

import { DEFAULT_GEMINI_MODEL_ID } from "../config/geminiModel.js";

/** Global model — Gemini REST v1beta generateContent. */
export const MODEL = DEFAULT_GEMINI_MODEL_ID;

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Single entry for all Gemini text generation (REST).
 * @param {string} prompt
 * @param {{ responseMimeType?: string, temperature?: number }} [options]
 * @returns {Promise<string | null>}
 */
export async function generateAIContent(prompt, options = {}) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== "string" || !key.trim()) {
    console.error("AI ERROR:", new Error("Missing VITE_GEMINI_API_KEY"));
    return null;
  }

  const body = {
    contents: [{ parts: [{ text: String(prompt ?? "") }] }],
  };
  const gc = {};
  if (options.responseMimeType) gc.responseMimeType = options.responseMimeType;
  if (typeof options.temperature === "number") gc.temperature = options.temperature;
  if (Object.keys(gc).length) body.generationConfig = gc;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key.trim(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("AI ERROR:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (import.meta.env.DEV) {
      console.log("AI RESPONSE:", typeof text === "string" ? text.slice(0, 800) : text);
    }
    return text || null;
  } catch (err) {
    console.error("AI ERROR:", err);
    return null;
  }
}

function isUncertain(text) {
  const t = String(text ?? "").toLowerCase();
  return (
    t.includes("not sure") ||
    t.includes("unsure") ||
    t.includes("insufficient information") ||
    t.includes("cannot determine")
  );
}

const STRICT_DATA_ONLY_RULES =
  "STRICT MODE: Do not invent facts, dates, diagnoses, or care details. Use ONLY information explicitly present in the provided data. If information is missing or unclear, write exactly: Insufficient data.";

const SYSTEM_PROMPT =
  "You are a CQC Clinical Consultant. Create a Regulation 9 compliant care plan. Use professional, person-centred language (e.g., 'Amina prefers...' instead of 'The patient needs...'). " +
  STRICT_DATA_ONLY_RULES;

function buildPrompt(details) {
  const patientName = (details?.patientName ?? "").toString().trim();
  const patientDob = (details?.patientDob ?? "").toString().trim();
  const keyObservationsRisks = (details?.keyObservationsRisks ?? "").toString().trim();

  return [
    `System: ${SYSTEM_PROMPT}`,
    "",
    "Task:",
    "Create a care plan draft that is clear, structured, and tailored to the named person.",
    "",
    `Patient: ${patientName || "Unknown"}${patientDob ? ` (DOB: ${patientDob})` : ""}`,
    "",
    "Key Observations / Risks (source notes):",
    keyObservationsRisks || "—",
    "",
    "Required sections (use these exact Markdown headings):",
    "- ## Personal Preferences",
    "- ## Risk Mitigation",
    "- ## Mobility Support",
    "- ## Nutrition/Hydration",
    "",
    "Quality requirements:",
    "- Use person-centred language throughout.",
    "- Include practical actions that support safety and dignity.",
    "- Do not include private or sensitive identifiers beyond what is provided.",
    "",
    STRICT_DATA_ONLY_RULES,
  ].join("\n");
}

export async function generateClinicalCarePlan(details) {
  const prompt = buildPrompt(details);
  const text = await generateAIContent(prompt);
  if (!text?.trim() || isUncertain(text)) {
    return null;
  }
  return text.trim();
}

export async function generateCarePlanDraft(patientName, observations) {
  return generateClinicalCarePlan({
    patientName,
    patientDob: "",
    keyObservationsRisks: observations ?? "",
  });
}

function formatRecord(value) {
  if (!value) return "N/A";
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return "N/A";
    }
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function buildInspectorPrompt(data) {
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const carePlans = Array.isArray(data?.carePlans) ? data.carePlans : [];

  const incidentBlock =
    incidents.length === 0
      ? "- No recent incidents found."
      : incidents
          .map(
            (i, idx) =>
              `${idx + 1}) type=${i?.type ?? "N/A"}, severity=${i?.severity ?? "N/A"}, status=${i?.status ?? "N/A"}, patientId=${i?.patientId ?? "N/A"}, reportedAt=${formatRecord(i?.reportedAt ?? i?.createdAt)}, description=${i?.description ?? "N/A"}`
          )
          .join("\n");

  const carePlanBlock =
    carePlans.length === 0
      ? "- No recent care plans found."
      : carePlans
          .map(
            (c, idx) =>
              `${idx + 1}) patientId=${c?.patientId ?? "N/A"}, status=${c?.status ?? "N/A"}, updatedAt=${formatRecord(c?.updatedAt ?? c?.createdAt)}, riskAssessment=${(c?.riskAssessment ?? "N/A").toString().slice(0, 300)}`
          )
          .join("\n");

  return [
    STRICT_DATA_ONLY_RULES,
    "",
    "You are a Senior CQC Inspector.",
    "Review the provided incidents and care plans.",
    "Find one inconsistency or gap where a risk was identified but the care plan wasn't updated.",
    "Ask the manager to explain how they are mitigating this risk.",
    "",
    "Return exactly:",
    "1) One concise observation",
    "2) One challenge question to the manager",
    "3) Two follow-up evidence requests",
    "",
    "Recent incidents:",
    incidentBlock,
    "",
    "Recent care plans:",
    carePlanBlock,
  ].join("\n");
}

export async function generateInspectorChallenge(data) {
  const prompt = buildInspectorPrompt(data);
  const text = await generateAIContent(prompt);
  if (!text?.trim() || isUncertain(text)) {
    return null;
  }
  return text.trim();
}

function buildInspectorAuditPrompt(data, managerResponse) {
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const carePlans = Array.isArray(data?.carePlans) ? data.carePlans : [];
  const response = String(managerResponse ?? "").trim() || "No manager response provided.";

  const incidentBlock = incidents
    .map(
      (i, idx) =>
        `${idx + 1}) patientId=${i?.patientId ?? "N/A"}, type=${i?.type ?? "N/A"}, severity=${i?.severity ?? "N/A"}, status=${i?.status ?? "N/A"}, createdAt=${formatRecord(i?.reportedAt ?? i?.createdAt)}, description=${i?.description ?? "N/A"}`
    )
    .join("\n");

  const carePlanBlock = carePlans
    .map(
      (c, idx) =>
        `${idx + 1}) patientId=${c?.patientId ?? "N/A"}, status=${c?.status ?? "N/A"}, updatedAt=${formatRecord(c?.updatedAt ?? c?.createdAt)}, riskAssessment=${(c?.riskAssessment ?? "").toString().slice(0, 300)}`
    )
    .join("\n");

  return [
    STRICT_DATA_ONLY_RULES,
    "",
    "You are a strict CQC Lead Inspector.",
    "First line MUST be exactly this sentence and quoted text:",
    "I've reviewed your Safeguarding logs. You said 'Yes' to protecting people, but I see an open incident for Amina Diallo from yesterday. Why hasn't this been closed yet?",
    "",
    "Then provide:",
    "- A concise critique of the manager response (2-3 lines).",
    "- A Regulation 13/17 governance risk rating (Low/Medium/High) with one-line reason.",
    "- Two corrective actions required before inspection close-out.",
    "",
    "Recent incidents:",
    incidentBlock || "- No incidents found.",
    "",
    "Recent care plans:",
    carePlanBlock || "- No care plans found.",
    "",
    `Manager response: ${response}`,
  ].join("\n");
}

export async function generateInspectorAuditFeedback(data, managerResponse) {
  const prompt = buildInspectorAuditPrompt(data, managerResponse);
  const text = await generateAIContent(prompt);
  if (!text?.trim() || isUncertain(text)) {
    return null;
  }
  return text.trim();
}

function buildCandourLetterPrompt(incidentData, patientData) {
  const inc = incidentData && typeof incidentData === "object" ? incidentData : {};
  const pat = patientData && typeof patientData === "object" ? patientData : {};

  const patientName = [pat.firstName, pat.lastName].filter(Boolean).join(" ").trim() || pat.id || "the person we support";
  const patientLine = `Patient / service user: ${patientName}${pat.id ? ` (ID: ${pat.id})` : ""}${pat.dob ? `; DOB: ${formatRecord(pat.dob)}` : ""}`;

  const incidentBlock = [
    `Incident type: ${inc.type ?? inc.incidentType ?? "N/A"}`,
    `Severity: ${inc.severity ?? "N/A"}`,
    `Status: ${inc.status ?? "N/A"}`,
    `Reported at: ${formatRecord(inc.reportedAt ?? inc.createdAt)}`,
    `Description (facts as recorded): ${inc.description ?? "N/A"}`,
    `Immediate actions taken: ${inc.actionsTaken ?? inc.immediateActions ?? "N/A"}`,
    `Reported by: ${inc.reportedBy ?? "N/A"}`,
  ].join("\n");

  return [
    "You are an experienced Care Manager writing a formal letter to the family or representative of a person using the service.",
    "",
    "Legal and regulatory tone: The letter must align with the Duty of Candour requirements under Regulation 20 of the Health and Social Care Act 2008 (Regulated Activities) Regulations 2014:",
    "- Be open and transparent; offer a sincere apology where harm or distress has occurred or could have occurred.",
    "- Set out clearly the facts known at the time of writing (do not speculate).",
    "- Explain what immediate actions were taken to keep people safe and support those affected.",
    "- Commit to providing further information after any investigation concludes, and how the family can ask questions or raise concerns.",
    "- Use respectful, compassionate, professional language; avoid blame, jargon, or admissions of legal liability beyond factual transparency.",
    "",
    "Structure the letter as:",
    "1) Date and salutation (Dear …)",
    "2) Opening: sincere apology and regret where appropriate",
    "3) Factual account: what happened, as known",
    "4) Immediate safety and support actions",
    "5) What happens next and follow-up after investigation",
    "6) Closing and contact for questions",
    "",
    "Do not invent clinical details not in the data. If something is unknown, say so.",
    "",
    patientLine,
    "",
    "Incident / event details:",
    incidentBlock,
  ].join("\n");
}

export async function generateCandourLetter(incidentData, patientData) {
  const prompt = buildCandourLetterPrompt(incidentData, patientData);
  const text = await generateAIContent(prompt);
  if (!text?.trim() || isUncertain(text)) {
    return null;
  }
  return text.trim();
}

export function heuristicCompetencyGapWarning({ combinedCareText, validCountsByTraining }) {
  const text = (combinedCareText ?? "").toLowerCase();
  const counts = validCountsByTraining ?? {};
  const rules = [
    { keywords: ["insulin support", "insulin administration", "insulin"], training: "Insulin Support", min: 3 },
    { keywords: ["manual handling", "moving and handling"], training: "Manual Handling", min: 3 },
    { keywords: ["peg feeding", "peg tube"], training: "PEG Feeding", min: 3 },
    { keywords: ["catheter care", "catheter"], training: "Catheter Care", min: 3 },
    { keywords: ["tracheostomy"], training: "Tracheostomy Care", min: 3 },
  ];
  for (const r of rules) {
    if (!r.keywords.some((k) => text.includes(k))) continue;
    const n = counts[r.training] ?? 0;
    if (n < r.min) {
      return `Warning: Only ${n} staff member${n === 1 ? "" : "s"} ${n === 1 ? "is" : "are"} currently trained for ${r.training}. Update training records soon.`;
    }
  }
  return null;
}

function buildCompetencyGapPrompt(patientDisplayName, combinedCareText, trainingSummaryLines) {
  return [
    "You are a clinical governance assistant for a UK care service.",
    "Compare the person's documented care needs with how many distinct staff currently hold VALID training certificates for each skill.",
    "",
    "Rules:",
    "- If a required skill appears to be needed (e.g. insulin administration, manual handling, PEG feeding) but fewer than 3 staff are trained for the matching training record name, output ONE short warning sentence in this style:",
    '  Warning: Only N staff members are currently trained for [Training Name]. Update training records soon.',
    "- If training coverage is adequate or needs are unclear, respond with exactly: NONE",
    "- Do not invent training names that are not listed in the coverage summary unless they clearly match a described need (e.g. map insulin care to Insulin Support).",
    "",
    `Person: ${patientDisplayName || "Service user"}`,
    "",
    "Care needs / plan text:",
    (combinedCareText || "—").slice(0, 8000),
    "",
    "Valid training coverage (distinct staff with current certificates per training name):",
    trainingSummaryLines || "—",
  ].join("\n");
}

export async function getCompetencyGapWarning({
  patientDisplayName,
  careNeeds,
  riskAssessment,
  supportStrategies,
  planContent,
  validCountsByTraining,
}) {
  const combined = [careNeeds, riskAssessment, supportStrategies, planContent].filter(Boolean).join("\n\n");
  const trainingSummaryLines = Object.entries(validCountsByTraining ?? {})
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([k, v]) => `${k}: ${v} staff`)
    .join("\n");

  const prompt = buildCompetencyGapPrompt(patientDisplayName, combined, trainingSummaryLines);
  const aiText = (await generateAIContent(prompt))?.trim() ?? "";

  if (aiText && !/^NONE$/i.test(aiText) && !/^no warning\.?$/i.test(aiText)) {
    return aiText.replace(/^["']|["']$/g, "").trim();
  }

  return heuristicCompetencyGapWarning({ combinedCareText: combined, validCountsByTraining });
}

export function sanitizeClinicalText(text) {
  if (!text) return "";

  return text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[NAME]")
    .replace(/\b\d{2,3}[- ]?\d{3}[- ]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "[DATE]")
    .replace(/\bNHS\s?\d{3}\s?\d{3}\s?\d{4}\b/gi, "[NHS]");
}

/** Strip markdown code fences; models often wrap JSON in ```json blocks. */
export function stripJsonFence(text) {
  if (!text || typeof text !== "string") return "";
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  return t;
}

export async function processClinicalNote(noteText) {
  const raw = (noteText ?? "").toString().trim();
  if (!raw) return null;

  const safeText = sanitizeClinicalText(raw);
  const safeInput = JSON.stringify(safeText);

  const prompt = `
You are a clinical documentation assistant.

STRICT MODE (INSPECTION-GRADE):
* Do NOT hallucinate or invent clinical facts, events, medications, or risk levels.
* Use ONLY what appears in the input note below.
* If something cannot be determined from the text alone, use null for that JSON field.
* If the input is empty or unusable, return JSON with all string fields null and correctedText equal to the input.
* Keep language professional and clinical.

---

INPUT NOTE:
${safeInput}

---

RETURN JSON ONLY (no markdown, no commentary):

{
  "correctedText": "...",
  "mood": "...",
  "behaviour": "...",
  "risk": "...",
  "engagement": "...",
  "incidents": "...",
  "summary": "..."
}
`;

  const text = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  if (!text) return null;
  try {
    const cleaned = stripJsonFence(text);
    const parsed = JSON.parse(cleaned);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch (e) {
    console.error("AI ERROR:", e);
    return null;
  }
}

export async function generateGeminiReportFromPrompt(fullPrompt) {
  const raw = (fullPrompt ?? "").toString().trim();
  if (!raw) return null;

  const text = await generateAIContent(raw, { responseMimeType: "application/json", temperature: 0.2 });
  if (!text) return null;
  const cleaned = stripJsonFence(text);
  try {
    const parsed = JSON.parse(cleaned);
    return typeof parsed === "object" && parsed !== null ? parsed : { raw: text };
  } catch {
    return { raw: text };
  }
}
