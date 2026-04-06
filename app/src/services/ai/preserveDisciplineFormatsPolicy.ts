/**
 * Policy: structure (templates, section names, order) stays fixed; model output adapts wording, tone, risk.
 * Injected into CPA and tribunal prompts — does not replace discipline templates or section lists elsewhere.
 */

/** Prepended to CPA section prompts from {@link ./cpaPromptBuilder#buildPrompt}. */
export const CPA_PRESERVE_DISCIPLINE_FORMATS_HEADER = [
  "=== PRESERVE DISCIPLINE FORMATS ===",
  "STRUCTURE is FIXED — CONTENT is ADAPTIVE.",
  "- The numbered canonical section list for this discipline in the instructions below is authoritative: do NOT rename, merge, split, reorder, or renumber those sections.",
  "- Generate ONLY the body for the ONE requested section; the section title must match the requested name exactly.",
  "- Do NOT output a full report, outline, table of contents, or other sections.",
  "- You MAY adapt wording, tone, clinical emphasis, and risk level within that section based on Patient Data and context.",
  "===",
].join("\n");

/** Prepended to tribunal one-section prompts (nursing + RC). */
export const TRIBUNAL_PRESERVE_SECTION_FORMAT_HEADER = [
  "=== PRESERVE SECTION FORMAT ===",
  "STRUCTURE is FIXED — CONTENT is ADAPTIVE.",
  "- The section title and required format (e.g. Yes/No line, narrative) are fixed; do NOT invent sibling sections or substitute headings.",
  "- You MAY adapt wording, tone, and factual risk-related description within this section according to PROVIDED DATA.",
  "===",
].join("\n");
