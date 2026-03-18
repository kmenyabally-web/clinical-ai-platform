/** [ENABLEMENT GATE: STAGE 12 - AI CARE PLAN GENERATOR] */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

function requireApiKey() {
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("Missing VITE_GEMINI_API_KEY. Add it to your .env file.");
  }
  return apiKey.trim();
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
  const key = requireApiKey();
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = buildPrompt(details);
  const result = await model.generateContent(prompt);

  const text = result?.response?.text?.() ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
  return text.trim();
}

