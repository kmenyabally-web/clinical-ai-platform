import { generateMDTReview } from "./mdtService";
import { processClinicalNote } from "./geminiAiService";

/**
 * Generates Management Hearing Report decision support using organisation-scoped MDT input.
 * @param {string} patientId
 * @param {{ organisationId: string | null | undefined }} context
 */
export async function generateManagementReport(patientId, context) {
  const mdt = await generateMDTReview(patientId, context);
  const entries = Object.entries(mdt ?? {});

  if (!entries.length) return null;

  const combined = entries
    .map(([role, notes]) => `${role}:\n${(notes ?? []).join("\n")}`)
    .join("\n\n");

  if (!combined.trim()) return null;

  const prompt = `
You are generating a Management Hearing Report.

STRICT RULES:
* Do NOT invent information
* Use only provided MDT input

---

INPUT:
${combined}

---

RETURN:
* Overview
* Key Risks
* Progress
* Concerns
* Recommendation
  `;

  // Uses the unified clinical note pipeline (which sanitises before calling Gemini)
  // and fails safely if AI is unavailable.
  return await processClinicalNote(prompt);
}

