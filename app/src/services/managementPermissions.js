/**
 * Organisation Admin (or platform admin) checks for tenant structure / directory mutations.
 * Managers and Staff cannot mutate organisation-wide admin resources here.
 */

import { auth } from "../firebase";
import { getUserContext } from "./authService";
import { isPlatformAdmin } from "./platformAdminService";
import { isOrganisationAdminRole } from "../utils/organisationAdmin";

/**
 * Throws if the caller cannot perform org-wide admin writes (soft delete, update org, hospitals, etc.).
 * Platform admins bypass tenant role checks.
 */
export async function assertOrganisationAdminWrite() {
  const user = auth.currentUser;
  if (!user) {
    if (import.meta.env.DEV) return;
    throw new Error("Not authenticated");
  }
  if (await isPlatformAdmin(user.uid)) return;
  const { role } = await getUserContext();
  if (!isOrganisationAdminRole(role)) {
    throw new Error("Permission denied: Organisation Admin only.");
  }
}

/** @deprecated Use {@link assertOrganisationAdminWrite} */
export async function assertManagementWrite() {
  return assertOrganisationAdminWrite();
}
