/**
 * Tribunal prompt engine — nursing (Q&A / yes/no) vs RC (narrative).
 * One section per generation; legal-safe; factual only (no hallucination).
 */

import { TRIBUNAL_PRESERVE_SECTION_FORMAT_HEADER } from "./preserveDisciplineFormatsPolicy";

export type NursingTribunalSectionType = "structured" | "yesno_text" | "text" | "yesno";

const FACTUAL_ONLY =
  "Use ONLY the information explicitly present in PROVIDED DATA below. " +
  "Do not invent incidents, dates, diagnoses, risks, or legal conclusions. " +
  "If the data do not support a clear answer, write exactly: Insufficient data.";

const RC_INSUFFICIENT_PHRASE =
  "For Responsible Clinician narrative sections, if records are insufficient you may use: " +
  "Insufficient information in the records provided.";

const LEGAL_SAFE_NURSING =
  "LEGAL-SAFE: Describe what appears in the records. Do not predict tribunal outcomes, " +
  "do not assert that statutory detention criteria are or are not met, and do not give legal advice. " +
  "Use neutral, factual clinical language.";

const LEGAL_SAFE_RC =
  "LEGAL-SAFE: Describe clinical findings and record content only. " +
  "Do not predict tribunal decisions or give legal conclusions. " +
  "If information is missing, state that clearly. Formal, objective register.";

const NURSING_ROLE =
  "You are assisting a registered nurse to draft ONE section of a UK mental health tribunal nursing report. " +
  "Generate content for THIS section only — not a full report.";

const RC_ROLE =
  "You are drafting ONE section of a formal Responsible Clinician tribunal report for mental health proceedings in England & Wales. " +
  "Use a formal consultant tone: objective, precise, professional. " +
  "Generate ONLY this section — not the full report.";

/**
 * Nursing tribunal: Q&A-style per section; yes/no types require Yes/No on line 1 where applicable.
 */
export function buildNursingTribunalPrompt(args: {
  sectionTitle: string;
  sectionType: string;
  evidenceText: string;
}): string {
  const { sectionTitle, sectionType, evidenceText } = args;
  const data = evidenceText?.trim() || "(no records supplied)";

  let formatBlock: string;
  if (sectionType === "yesno") {
    formatBlock = [
      "FORMAT (Q&A — strict):",
      `QUESTION (as per section): "${sectionTitle}"`,
      "LINE 1: Answer with exactly one word: Yes or No — based ONLY on PROVIDED DATA.",
      "LINE 2 onwards: One short factual explanation citing only what in the data supports that answer; if the data do not support Yes or No, write Insufficient data instead of guessing.",
      "Do not add bullet lists unless essential.",
    ].join("\n");
  } else if (sectionType === "yesno_text") {
    formatBlock = [
      "FORMAT (Q&A with narrative):",
      `QUESTION (as per section): "${sectionTitle}"`,
      "LINE 1: Yes or No — based ONLY on PROVIDED DATA.",
      "Following lines: Short factual explanation drawn only from the data; if unclear, say Insufficient data.",
      "Do not fabricate detail.",
    ].join("\n");
  } else {
    formatBlock = [
      "FORMAT (factual narrative):",
      `SECTION: "${sectionTitle}"`,
      "Provide concise factual prose suitable for the tribunal bundle (paragraphs). No bullet lists unless essential.",
      "No Yes/No line unless the section clearly requires it.",
    ].join("\n");
  }

  return `${TRIBUNAL_PRESERVE_SECTION_FORMAT_HEADER}

${NURSING_ROLE}

${formatBlock}

${FACTUAL_ONLY}

${LEGAL_SAFE_NURSING}

--- PROVIDED DATA (notes, incidents, behaviour, physical health) ---
${data}
`;
}

/**
 * RC tribunal: narrative section; formal consultant tone.
 */
export function buildRcTribunalPrompt(args: {
  sectionTitle: string;
  sectionNumber?: number;
  evidenceText: string;
}): string {
  const { sectionTitle, sectionNumber, evidenceText } = args;
  const data = evidenceText?.trim() || "(no records supplied)";
  const num = sectionNumber != null ? `Section ${sectionNumber}: ` : "";

  return `${TRIBUNAL_PRESERVE_SECTION_FORMAT_HEADER}

${RC_ROLE}

${FACTUAL_ONLY}

${RC_INSUFFICIENT_PHRASE}

${LEGAL_SAFE_RC}

OUTPUT: Continuous formal prose for this section only (one or more paragraphs). No bullet labels like "Section:". No JSON.

${num}"${sectionTitle}"

--- PROVIDED DATA ---
${data}
`;
}
