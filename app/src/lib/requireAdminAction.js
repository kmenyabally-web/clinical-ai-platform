/**
 * Pre-flight guard for critical actions (user spec: Admin-only).
 * @param {string | null | undefined} role
 * @returns {boolean} true if allowed
 */
export function requireAdminRole(role) {
  const r = (role ?? "").toString().trim();
  if (r !== "Admin" && r !== "ADMIN") {
    alert("Access restricted");
    return false;
  }
  return true;
}
