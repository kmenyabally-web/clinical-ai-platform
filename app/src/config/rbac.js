/**
 * RBAC permission mapping. See docs/rbac.md.
 * Role → list of permission strings (e.g. audit:create, user:manage).
 */

export const ROLE_PERMISSIONS = {
  /** Full access: wildcard handled in getPermissionsForRole / canAccess. */
  Admin: ["*"],
  /** Same tenant scope as Admin; preferred label for enterprise RBAC. */
  "Organisation Admin": ["*"],
  Manager: [
    "audit:create",
    "audit:update",
    "audit:view",
    "user:manage",
    "organisation:manage",
    "group:manage",
  ],
  QualityLead: ["audit:create", "audit:update", "audit:view"],
  Staff: ["audit:create", "audit:view", "read"],
  /** System read-only / inspection (replaces legacy Auditor). */
  Inspector: ["audit:view"],
};

const ROLE_ALIASES = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
  GROUP_ADMIN: "Manager",
  GLOBAL_ADMIN: "Admin",
  STAFF: "Staff",
  staff: "Staff",
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
  Administrator: "Admin",
  administrator: "Admin",
  "Organisation Admin": "Organisation Admin",
  ORGANISATION_ADMIN: "Organisation Admin",
  ORGANIZATION_ADMIN: "Organisation Admin",
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
  const mapped =
    ROLE_ALIASES[t] ??
    ROLE_ALIASES[t.toUpperCase()] ??
    (Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, t) ? t : null);
  if (mapped === "Auditor") return "Inspector";
  return mapped;
}

/** Enterprise-style permission keys for {@link hasPermission} (GDPR / audit gates). */
export const PERMISSIONS = {
  ADMIN: ["ALL"],
  MANAGER: ["CREATE_USER", "VIEW_USERS", "CREATE_PATIENT", "VIEW_PATIENT"],
  STAFF: ["CREATE_NOTE", "VIEW_PATIENT"],
};

/**
 * Map canonical / legacy role strings to {@link PERMISSIONS} keys.
 * @param {string | null | undefined} role
 * @returns {keyof typeof PERMISSIONS}
 */
function roleKeyForPermissions(role) {
  const n = normalizeRole(role) ?? role;
  const t = typeof n === "string" ? n.trim() : "";
  if (t === "Admin") return "ADMIN";
  if (t === "Organisation Admin") return "ADMIN";
  if (t === "Manager") return "MANAGER";
  if (t === "QualityLead") return "MANAGER";
  if (t === "Inspector") return "STAFF";
  if (t === "Staff") return "STAFF";
  const u = String(role ?? "").trim().toUpperCase();
  if (u === "ADMIN" || u === "ADMINISTRATOR") return "ADMIN";
  if (u === "MANAGER") return "MANAGER";
  if (u === "STAFF") return "STAFF";
  return "STAFF";
}

/**
 * @param {string | null | undefined} role
 * @param {string} permission
 */
export function hasPermission(role, permission) {
  const key = roleKeyForPermissions(role);
  const perms = PERMISSIONS[key] || [];
  return perms.includes("ALL") || perms.includes(permission);
}

/**
 * @param {string | null} role
 * @returns {string[]} Permissions for the role; empty if role unknown or null.
 */
export function getPermissionsForRole(role) {
  if (!role || typeof role !== "string") return [];
  const normalised = normalizeRole(role) ?? role;
  const perms = ROLE_PERMISSIONS[normalised] ?? [];
  if (normalised === "Admin" || normalised === "Organisation Admin" || perms.includes("*")) {
    return [
      "*",
      "audit:create",
      "audit:update",
      "audit:delete",
      "audit:view",
      "user:manage",
      "organisation:manage",
      "group:manage",
      "read",
    ];
  }
  return perms;
}

/**
 * @param {string | null | undefined} role
 * @param {string} permission
 */
export function canAccess(role, permission) {
  if (!role) return false;
  const normalised = normalizeRole(role) ?? role;
  if (normalised === "Admin" || normalised === "Organisation Admin") return true;
  const perms = ROLE_PERMISSIONS[normalised] ?? [];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
