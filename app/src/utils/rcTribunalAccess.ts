/**
 * Responsible Clinician tribunal report — clinical identity gate (mdtRole only).
 * Allowed: Responsible Clinician (any casing) / RC, or Consultant Psychiatrist
 * (including {@link ../constants/mdtRoles} "Psychiatrist (Consultant)").
 */
export function canAccessRCTribunalReport(mdtRole: string | null | undefined): boolean {
  const raw = (mdtRole ?? "").toString().trim().toLowerCase();
  if (!raw) return false;
  if (raw === "rc" || raw.includes("responsible clinician")) return true;
  if (raw.includes("consultant psychiatrist")) return true;
  if (raw.includes("psychiatrist") && (raw.includes("consultant") || raw.includes("(consultant)"))) return true;
  return false;
}
