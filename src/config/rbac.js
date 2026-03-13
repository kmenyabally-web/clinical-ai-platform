/**
 * RBAC permission mapping. See docs/rbac.md.
 * Role → list of permission strings (e.g. audit:create, user:manage).
 */

export const ROLE_PERMISSIONS = {
  Admin: [
    "audit:create",
    "audit:update",
    "audit:delete",
    "audit:view",
    "user:manage",
    "organisation:manage",
  ],
  Manager: ["audit:create", "audit:update", "audit:view"],
  QualityLead: ["audit:create", "audit:update", "audit:view"],
  Staff: ["audit:create", "audit:view"],
  Auditor: ["audit:view"],
};

const ROLE_ALIASES = { ADMIN: "Admin", admin: "Admin", Manager: "Manager", QualityLead: "QualityLead", Staff: "Staff", Auditor: "Auditor" };

/**
 * @param {string | null} role
 * @returns {string[]} Permissions for the role; empty if role unknown or null.
 */
export function getPermissionsForRole(role) {
  if (!role || typeof role !== "string") return [];
  const normalised = ROLE_ALIASES[role] ?? role;
  return ROLE_PERMISSIONS[normalised] ?? [];
}
