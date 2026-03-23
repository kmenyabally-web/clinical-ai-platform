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
