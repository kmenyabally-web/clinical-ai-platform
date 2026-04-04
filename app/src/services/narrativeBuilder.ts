/**
 * Utilities for prose-style clinical narratives (weekly / monthly patient summaries).
 */

export type NarrativeEntry = string | { text?: string | null } | null | undefined;

/**
 * Join narrative fragments into a single paragraph with normalised whitespace.
 */
export function buildNarrative(entries: NarrativeEntry[] = []): string {
  const list = (entries ?? [])
    .map((e) => {
      if (e == null) return "";
      if (typeof e === "string") return e.trim();
      if (typeof e === "object" && e !== null && "text" in e) {
        const t = (e as { text?: string | null }).text;
        return typeof t === "string" ? t.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
  if (!list.length) {
    return "No significant clinical updates recorded during this period.";
  }
  return list.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Return professional prose, or a standard empty-state sentence including the section label.
 */
export function buildClinicalParagraph(sectionTitle: string, content: string | null | undefined): string {
  const c = typeof content === "string" ? content.replace(/\s+/g, " ").trim() : "";
  if (!c) {
    return `${sectionTitle}: No significant concerns or changes identified during this period.`;
  }
  return c;
}

/** Global fallback when an entire report period has no usable signal. */
export const NARRATIVE_EMPTY_PERIOD =
  "No significant clinical changes observed during this reporting period.";
