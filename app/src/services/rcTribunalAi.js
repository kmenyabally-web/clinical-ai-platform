import { generateAIContent } from "./geminiAiService.js";

const RULES =
  "You are drafting a formal Responsible Clinician tribunal report section for use in mental health proceedings in England & Wales. " +
  "Write structured clinical narrative: objective, tribunal-ready, professional tone. " +
  "Use ONLY facts supported by the PROVIDED DATA. Do not invent dates, legal outcomes, diagnoses, or risks. " +
  "If data are insufficient, state: Insufficient information in the records provided. " +
  "Do not produce a generic summary of the whole case — only address THIS section title.";

/**
 * One AI call per section (no full-report generation).
 * @param {{ sectionTitle: string, sectionNumber?: number, evidenceText: string }} args
 * @returns {Promise<string | null>}
 */
export async function generateRcTribunalSectionAI({ sectionTitle, sectionNumber, evidenceText }) {
  const num = sectionNumber != null ? `Section ${sectionNumber}: ` : "";
  const prompt = `${RULES}

Generate only the narrative for this section:
${num}"${sectionTitle}"

Output: continuous prose suitable for the tribunal bundle (one or more paragraphs). No bullet labels like "Section:". No JSON.

--- PROVIDED DATA ---
${evidenceText || "(no records supplied)"}
`;

  return generateAIContent(prompt, { temperature: 0.12 });
}
