/**
 * System (tenant / SaaS) roles — used only for RBAC and Auth claims.
 * Do not use for clinical identity; use {@link ../constants/mdtRoles#MDT_ROLES} for that.
 */
export const SYSTEM_ROLES = [
  "Admin",
  "Organisation Admin",
  "Manager",
  "Staff",
  "Inspector",
  "GROUP_ADMIN",
  "SUPER_ADMIN",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Legacy Firestore values still accepted by {@link ../config/rbac#normalizeRole}. */
export const LEGACY_SYSTEM_ROLES = ["QualityLead", "Auditor"] as const;
