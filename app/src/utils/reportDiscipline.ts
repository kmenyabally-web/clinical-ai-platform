/**
 * Role-based target discipline and note filtering for clinical reports.
 */

import { inferRoleString } from "./mdtNoteGrouping.js";

export const REPORT_DISCIPLINE_OPTIONS = [
  { value: "ALL", label: "All disciplines" },
  { value: "nurse", label: "Nursing" },
  { value: "psychologist", label: "Psychology" },
  { value: "ot", label: "Occupational Therapy" },
  { value: "speech", label: "Speech & Language" },
  { value: "psychiatrist", label: "Psychiatry" },
] as const;

/**
 * Admin/manager may pick a discipline or ALL; everyone else uses their own discipline.
 */
export function getTargetDiscipline(args: {
  userRole: string;
  userDiscipline: string;
  selectedDiscipline?: string;
}): string {
  const r = String(args.userRole ?? "")
    .trim()
    .toLowerCase();
  if (["admin", "manager"].includes(r)) {
    const sel = String(args.selectedDiscipline ?? "").trim();
    return sel || "ALL";
  }
  return String(args.userDiscipline ?? "unknown").trim().toLowerCase() || "unknown";
}

export function isPrivilegedReportRole(userRole: string | null | undefined): boolean {
  const r = String(userRole ?? "")
    .trim()
    .toLowerCase();
  return ["admin", "manager"].includes(r);
}

/**
 * Map profile MDT / job role to a canonical discipline key for matching and auto-scope.
 */
export function normalizeUserDiscipline(
  mdtRole: string | null | undefined,
  role: string | null | undefined
): string {
  const m = `${mdtRole ?? ""} ${role ?? ""}`.toLowerCase();
  if (m.includes("psychiatr")) return "psychiatrist";
  if (m.includes("psycholog")) return "psychologist";
  if (m.includes("occupational") || /\bot\b/.test(m)) return "ot";
  if (m.includes("speech") || m.includes("salt") || m.includes("slt")) return "speech";
  if (m.includes("nurse") || m.includes("nursing") || m.includes("hca")) return "nurse";
  if (m.includes("support")) return "support_worker";
  return "nurse";
}

/**
 * Whether a note belongs to the selected canonical discipline.
 */
export function noteMatchesDiscipline(note: unknown, discipline: string): boolean {
  const t = String(discipline ?? "")
    .trim()
    .toLowerCase();
  if (!t || t === "all") return true;
  const r = inferRoleString(note && typeof note === "object" ? (note as Record<string, unknown>) : {});

  if (t === "nurse") return r.includes("nurse") || r.includes("nursing") || r.includes("hca");
  if (t === "psychologist") return r.includes("psycholog") && !r.includes("psychiatr");
  if (t === "psychiatrist") return r.includes("psychiatr");
  if (t === "ot") return r.includes("occupational") || /\bot\b/.test(r);
  if (t === "speech") return r.includes("speech") || r.includes("salt") || r.includes("slt");
  if (t === "support_worker") return r.includes("support") || r.includes("carer");
  return r.includes(t);
}

/**
 * Notes for a single discipline (strict). Does not handle ALL — caller branches first.
 */
export function filterNotesByDiscipline(notes: unknown[], discipline: string): unknown[] {
  const list = Array.isArray(notes) ? notes : [];
  const t = String(discipline ?? "")
    .trim()
    .toLowerCase();
  if (t === "all") return list;
  return list.filter((n) => noteMatchesDiscipline(n, t));
}
