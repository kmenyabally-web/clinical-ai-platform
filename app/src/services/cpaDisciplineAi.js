/** @deprecated Prefer {@link ./ai/cpaSectionGenerator#generateCPASection} + {@link ./ai/cpaPromptBuilder}. */

import { generateAIContent } from "./geminiAiService.js";

const RULES =
  "You are drafting ONE section of a Care Programme Approach (CPA) report for a UK mental health service. " +
  "Write a structured clinical narrative in formal, tribunal-ready professional English. " +
  "Address ONLY the named section. Do not summarise the whole CPA. " +
  "Use ONLY information explicitly present in PROVIDED DATA. Do not invent legal outcomes, diagnoses, or risks. " +
  "If data are missing, write: Insufficient information in the records provided.";

/**
 * Generate a single CPA section (one AI call per section).
 * @param {{ sectionTitle: string, disciplineDisplayName: string, evidenceText: string }} args
 * @returns {Promise<string | null>}
 */
export async function generateCpaDisciplineSection({ sectionTitle, disciplineDisplayName, evidenceText }) {
  const prompt = `${RULES}

Discipline: ${disciplineDisplayName}
Section title: "${sectionTitle}"

Output: one or more paragraphs of continuous prose (no JSON, no bullet labels like "Section:").

--- PROVIDED DATA ---
${evidenceText || "(no records supplied)"}
`;

  return generateAIContent(prompt, { temperature: 0.12 });
}
