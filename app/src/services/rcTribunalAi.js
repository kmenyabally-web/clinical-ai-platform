import { generateAIContent } from "./geminiAiService.js";
import { buildRcTribunalPrompt } from "./ai/tribunalPromptBuilder.ts";

/**
 * One AI call per RC tribunal section — prompts from {@link ./ai/tribunalPromptBuilder}.
 * @param {{ sectionTitle: string, sectionNumber?: number, evidenceText: string }} args
 * @returns {Promise<string | null>}
 */
export async function generateRcTribunalSectionAI({ sectionTitle, sectionNumber, evidenceText }) {
  const prompt = buildRcTribunalPrompt({ sectionTitle, sectionNumber, evidenceText });
  return generateAIContent(prompt, { temperature: 0.12 });
}
