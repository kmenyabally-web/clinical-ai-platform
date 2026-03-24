import { isInspectorSystemRole } from "./rbac";

/** Inspector / audit system roles: hide structured risk and similar for oversight views. */
export function shouldRedactClinicalSensitive(systemRole: string | null | undefined): boolean {
  return isInspectorSystemRole(systemRole);
}
