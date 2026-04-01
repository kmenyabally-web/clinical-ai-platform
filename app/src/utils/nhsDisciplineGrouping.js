import { getNoteBodyText, summariseNotes } from "./mdtNoteGrouping.js";

/**
 * NHS-style MDT buckets (multi-discipline summaries).
 * @returns {{
 *   Nurse: unknown[],
 *   Doctor: unknown[],
 *   Psychologist: unknown[],
 *   OT: unknown[],
 *   SALT: unknown[],
 *   SupportWorker: unknown[],
 * }}
 */
export function groupNotesByNhsRole(notes) {
  const grouped = {
    Nurse: [],
    Doctor: [],
    Psychologist: [],
    OT: [],
    SALT: [],
    SupportWorker: [],
  };

  const list = Array.isArray(notes) ? notes : [];

  for (const note of list) {
    const role = [
      note?.role,
      note?.mdtRole,
      note?.discipline,
      note?.authorRole,
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase())
      .join(" ")
      .trim();

    if (!role) {
      grouped.SupportWorker.push(note);
      continue;
    }

    if (role.includes("nurse") || role.includes("nursing") || role.includes("hca")) {
      grouped.Nurse.push(note);
    } else if (
      role.includes("psychiatrist") ||
      role.includes("psychiatry") ||
      role.includes("doctor") ||
      role.includes("medical") ||
      role.includes("physician") ||
      role.includes("registrar") ||
      role.includes("consultant")
    ) {
      grouped.Doctor.push(note);
    } else if (role.includes("psychologist") || role.includes("psychology")) {
      grouped.Psychologist.push(note);
    } else if (role.includes("occupational") || /\bot\b/.test(role)) {
      grouped.OT.push(note);
    } else if (role.includes("speech") || role.includes("salt") || role.includes("slt")) {
      grouped.SALT.push(note);
    } else {
      grouped.SupportWorker.push(note);
    }
  }

  return grouped;
}

/**
 * @param {ReturnType<typeof groupNotesByNhsRole>} grouped
 */
export function formatNhsMdtDisciplineBlock(grouped) {
  const lines = [
    ["Nursing", grouped.Nurse],
    ["Medical", grouped.Doctor],
    ["Psychology", grouped.Psychologist],
    ["Occupational Therapy", grouped.OT],
    ["Speech & Language Therapy", grouped.SALT],
    ["Support Staff", grouped.SupportWorker],
  ];
  return lines
    .map(([label, arr]) => `${label}:\n${summariseNotes(arr)}`)
    .join("\n\n");
}
