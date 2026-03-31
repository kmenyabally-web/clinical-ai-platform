/**
 * Organisation Admin — tenant-scoped full control of directory and structure (not platform operators).
 * Legacy deployments use role "Admin"; new deployments may use "Organisation Admin".
 */

export const ROLE_ORGANISATION_ADMIN = "Organisation Admin";

/**
 * @param {string | null | undefined} role - Normalised or raw system role from profile / claims.
 * @returns {boolean}
 */
export function isOrganisationAdminRole(role) {
  if (role == null) return false;
  const r = String(role).trim();
  return r === ROLE_ORGANISATION_ADMIN || r === "Admin";
}

/**
 * @param {{ role?: string | null; systemRole?: string | null } | null | undefined} user
 */
export function isOrganisationAdminUser(user) {
  if (!user || typeof user !== "object") return false;
  return isOrganisationAdminRole(user.role ?? user.systemRole);
}
