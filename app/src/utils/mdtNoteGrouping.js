/**
 * Infer a single lowercased role string from common clinical note fields.
 * @param {Record<string, unknown>} note
 */
export function inferRoleString(note) {
  const parts = [note?.role, note?.mdtRole, note?.discipline, note?.authorRole]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
  return parts.join(" ").trim() || "support";
}

/**
 * Group notes into fixed MDT buckets (nursing, psychiatry, psychology, OT, SALT, support).
 * Order matches user spec: nurse before psychiatrist so "psychiatric nurse" → nursing.
 * @param {Array<Record<string, unknown>>} notes
 * @returns {{
 *   nursing: unknown[],
 *   psychiatry: unknown[],
 *   psychology: unknown[],
 *   occupationalTherapy: unknown[],
 *   speechAndLanguage: unknown[],
 *   supportWorker: unknown[],
 * }}
 */
export function groupNotesByDiscipline(notes) {
  const grouped = {
    nursing: [],
    psychiatry: [],
    psychology: [],
    occupationalTherapy: [],
    speechAndLanguage: [],
    supportWorker: [],
  };

  const list = Array.isArray(notes) ? notes : [];

  for (const note of list) {
    const role = inferRoleString(note);

    if (role.includes("nurse") || role.includes("nursing") || role.includes("hca")) {
      grouped.nursing.push(note);
    } else if (role.includes("psychiatrist") || role.includes("psychiatry")) {
      grouped.psychiatry.push(note);
    } else if (role.includes("psychologist") || role.includes("psychology")) {
      grouped.psychology.push(note);
    } else if (role.includes("occupational") || /\bot\b/.test(role)) {
      grouped.occupationalTherapy.push(note);
    } else if (role.includes("speech") || role.includes("salt") || role.includes("slt")) {
      grouped.speechAndLanguage.push(note);
    } else {
      grouped.supportWorker.push(note);
    }
  }

  return grouped;
}

/**
 * @param {Record<string, unknown>} note
 */
export function getNoteBodyText(note) {
  if (!note) return "";
  const a = typeof note.aiSummary === "string" && note.aiSummary.trim() ? note.aiSummary.trim() : "";
  const c = typeof note.correctedNote === "string" && note.correctedNote.trim() ? note.correctedNote.trim() : "";
  const ct = typeof note.correctedText === "string" && note.correctedText.trim() ? note.correctedText.trim() : "";
  const co = typeof note.content === "string" && note.content.trim() ? note.content.trim() : "";
  return a || c || ct || co || "";
}

/**
 * Deterministic excerpt bundle for a discipline bucket (AI fallback).
 * @param {unknown[]} bucketNotes
 */
export function summariseNotes(bucketNotes) {
  if (!Array.isArray(bucketNotes) || bucketNotes.length === 0) {
    return "No notes recorded for this discipline in the selected period.";
  }
  return bucketNotes
    .map((n, i) => {
      const t = getNoteBodyText(n);
      const excerpt = t.length > 1200 ? `${t.slice(0, 1200)}…` : t;
      return `Entry ${i + 1}: ${excerpt || "(empty)"}`;
    })
    .join("\n\n");
}
