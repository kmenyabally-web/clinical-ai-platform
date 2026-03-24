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
  Manager: ["audit:create", "audit:update", "audit:view", "user:manage", "organisation:manage"],
  QualityLead: ["audit:create", "audit:update", "audit:view"],
  Staff: ["audit:create", "audit:view"],
  /** System read-only / inspection (replaces legacy Auditor). */
  Inspector: ["audit:view"],
};

const ROLE_ALIASES = {
  ADMIN: "Admin",
  admin: "Admin",
  manager: "Manager",
  Manager: "Manager",
  qualitylead: "QualityLead",
  QualityLead: "QualityLead",
  staff: "Staff",
  Staff: "Staff",
  INSPECTOR: "Inspector",
  Inspector: "Inspector",
  auditor: "Inspector",
  Auditor: "Inspector",
};

/**
 * Map Firestore / token strings to canonical app roles (Admin, Manager, …).
 * @param {string | null | undefined} role
 * @returns {string | null}
 */
export function normalizeRole(role) {
  if (role == null || typeof role !== "string") return null;
  const t = role.trim();
  if (!t) return null;
  const mapped = ROLE_ALIASES[t] ?? (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, t) ? t : null);
  if (mapped === "Auditor") return "Inspector";
  return mapped;
}

/**
 * @param {string | null} role
 * @returns {string[]} Permissions for the role; empty if role unknown or null.
 */
export function getPermissionsForRole(role) {
  if (!role || typeof role !== "string") return [];
  const normalised = normalizeRole(role) ?? role;
  return ROLE_PERMISSIONS[normalised] ?? [];
}
