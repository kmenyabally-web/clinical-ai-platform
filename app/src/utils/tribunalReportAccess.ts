/**
 * AI Reports — Tribunal Report access (Nursing or Responsible Clinician pathways).
 */

import { canAccessRCTribunalReport } from "./rcTribunalAccess";

export function canAccessTribunalReport(
  userMdtRole: string | null | undefined,
  userDiscipline: string | null | undefined
): boolean {
  const d = String(userDiscipline ?? "")
    .trim()
    .toLowerCase();
  if (d === "nurse") return true;
  if (canAccessRCTribunalReport(userMdtRole)) return true;
  if (d === "psychiatrist" || d === "doctor") return true;
  return false;
}
