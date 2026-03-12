import { createContext, useContext, useMemo } from "react";
import { useOrganisation } from "./OrganisationContext";
import { getPermissionsForRole } from "../config/rbac";

/**
 * RoleContext – RBAC derived from OrganisationContext (see docs/rbac.md).
 * Role comes from Firestore users/{uid}.role via OrganisationContext.userProfile.
 * No separate fetch: role and permissions are available when org is ready, so no UI flicker.
 * Depends on AuthContext and OrganisationContext being ready.
 */
const RoleContext = createContext(null);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export function RoleProvider({ children }) {
  const { userProfile, loading: orgLoading } = useOrganisation();
  const role = userProfile?.role ?? null;
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  const value = useMemo(
    () => ({
      role,
      permissions,
      loading: orgLoading,
      hasRole: (r) => role === r,
      can: (permission) =>
        typeof permission === "string" && permissions.includes(permission),
      isAllowed: (allowedRoles) =>
        !allowedRoles ||
        (Array.isArray(allowedRoles) && role && allowedRoles.includes(role)),
    }),
    [role, permissions, orgLoading]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
