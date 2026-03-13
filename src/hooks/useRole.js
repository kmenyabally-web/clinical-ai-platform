import { useRole } from "../context/RoleContext";

/**
 * RBAC hook. Use for role checks in UI and route protection.
 * @returns {{ role: string | null, permissions: string[], loading: boolean, hasRole: (r: string) => boolean, can: (permission: string) => boolean, isAllowed: (allowedRoles: string[]) => boolean }}
 */
export function useRoleCheck() {
  return useRole();
}
