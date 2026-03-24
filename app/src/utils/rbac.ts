/**
 * Enterprise RBAC helpers.
 * System roles (Admin, Manager, Staff, Inspector) drive permissions.
 * Clinical identity comes from `mdtRole` (Nurse, Psychologist, …) — do not mix into system role.
 */

/** High-level codes for enterprise checks (optional). */
export type EnterpriseRoleCode = "ADMIN" | "MANAGER" | "STAFF" | "INSPECTOR";

/**
 * Maps stored system `role` to enterprise code. Does not interpret MDT/clinical strings.
 */
export function mapSystemRoleToEnterpriseCode(
  appRole: string | null | undefined
): EnterpriseRoleCode | null {
  if (!appRole || typeof appRole !== "string") return null;
  const r = appRole.trim();
  const table: Record<string, EnterpriseRoleCode> = {
    Admin: "ADMIN",
    ADMIN: "ADMIN",
    Manager: "MANAGER",
    MANAGER: "MANAGER",
    Staff: "STAFF",
    STAFF: "STAFF",
    Inspector: "INSPECTOR",
    INSPECTOR: "INSPECTOR",
    Auditor: "INSPECTOR",
    AUDITOR: "INSPECTOR",
  };
  return table[r] ?? null;
}

/** Page access: clinical notes — system role + MDT required for Staff/QualityLead. */
export function canViewClinicalNotesAccess(
  systemRole: string | null | undefined,
  mdtRole: string | null | undefined
): boolean {
  const s = (systemRole ?? "").trim();
  if (["Admin", "Manager", "Inspector", "Auditor"].includes(s)) return true;
  if (s === "Staff" || s === "QualityLead") return Boolean((mdtRole ?? "").trim());
  return false;
}

export function canEditClinicalNotesAccess(
  systemRole: string | null | undefined,
  mdtRole: string | null | undefined
): boolean {
  const s = (systemRole ?? "").trim();
  if (["Admin", "Manager"].includes(s)) return true;
  if (s === "Inspector" || s === "Auditor") return false;
  if (s === "Staff" || s === "QualityLead") return Boolean((mdtRole ?? "").trim());
  return false;
}

/** Reports / readiness — system RBAC only. */
export function canViewReportsFromSystemRole(systemRole: string | null | undefined): boolean {
  const code = mapSystemRoleToEnterpriseCode(systemRole);
  return code === "ADMIN" || code === "MANAGER" || code === "INSPECTOR";
}

export function isInspectorSystemRole(systemRole: string | null | undefined): boolean {
  const s = (systemRole ?? "").trim();
  return s === "Inspector" || s === "Auditor";
}
