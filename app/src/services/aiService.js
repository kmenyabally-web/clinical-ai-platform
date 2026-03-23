/** [ENABLEMENT GATE: STAGE 12 - AI CARE PLAN GENERATOR] */

import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL && String(import.meta.env.VITE_GEMINI_MODEL).trim()) ||
  "gemini-2.5-flash";

function requireApiKey() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key || typeof key !== "string" || !key.trim()) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add it to your .env file.");
  }
}

const SYSTEM_PROMPT =
  "You are a CQC Clinical Consultant. Create a Regulation 9 compliant care plan. Use professional, person-centred language (e.g., 'Amina prefers...' instead of 'The patient needs...').";

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
  ].join("\n");
}

export async function generateClinicalCarePlan(details) {
  requireApiKey();
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = buildPrompt(details);
  const result = await model.generateContent(prompt);

  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
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
  requireApiKey();
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = buildInspectorPrompt(data);
  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty inspection challenge.");
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
  requireApiKey();
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = buildInspectorAuditPrompt(data, managerResponse);
  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned empty audit feedback.");
  }
  return text.trim();
}

/**
 * Duty of Candour letter (draft) for families — Regulation 20 (Health and Social Care Act 2008 (Regulated Activities) Regulations 2014).
 * @param {Record<string, unknown>} incidentData
 * @param {Record<string, unknown>} patientData
 */
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
  requireApiKey();
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = buildCandourLetterPrompt(incidentData, patientData);
  const result = await model.generateContent(prompt);
  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty Duty of Candour letter.");
  }
  return text.trim();
}

// --- Staff competency vs care plan needs (clinical governance) ---

/**
 * Deterministic fallback: match care text to training types and warn if valid staff count is below threshold.
 * @param {{ combinedCareText: string, validCountsByTraining: Record<string, number> }} args
 * @returns {string|null}
 */
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

/**
 * Uses Gemini when VITE_GEMINI_API_KEY is set; otherwise falls back to {@link heuristicCompetencyGapWarning}.
 * @param {{ patientDisplayName?: string, careNeeds?: string, riskAssessment?: string, supportStrategies?: string, planContent?: string, validCountsByTraining: Record<string, number> }} args
 * @returns {Promise<string|null>}
 */
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

  let aiText = "";
  try {
    requireApiKey();
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = buildCompetencyGapPrompt(patientDisplayName, combined, trainingSummaryLines);
    const result = await model.generateContent(prompt);
    aiText = (result?.response?.text?.() ?? "").trim();
  } catch {
    aiText = "";
  }

  if (aiText && !/^NONE$/i.test(aiText) && !/^no warning\.?$/i.test(aiText)) {
    return aiText.replace(/^["']|["']$/g, "").trim();
  }

  return heuristicCompetencyGapWarning({ combinedCareText: combined, validCountsByTraining });
}
