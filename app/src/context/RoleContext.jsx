import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useOrganisation } from "./OrganisationContext";
import { getPermissionsForRole, normalizeRole } from "../config/rbac";
import {
  mapSystemRoleToEnterpriseCode,
  canViewClinicalNotesAccess,
  canEditClinicalNotesAccess,
  canViewReportsFromSystemRole,
  isInspectorSystemRole,
} from "../utils/rbac";

/**
 * RoleContext – RBAC uses `role` (system) only. Clinical identity is `mdtRole` on userProfile.
 */
const RoleContext = createContext(null);

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}

export function RoleProvider({ children }) {
  const { user } = useAuth();
  const { userProfile, loading: orgLoading, organisationId } = useOrganisation();
  const [claimRole, setClaimRole] = useState(null);

  useEffect(() => {
    if (!user) {
      setClaimRole(null);
      return;
    }
    let cancelled = false;
    user
      .getIdTokenResult(true)
      .then((r) => {
        const cr = r?.claims?.role;
        if (cancelled) return;
        setClaimRole(typeof cr === "string" && cr.trim() ? cr.trim() : null);
      })
      .catch(() => {
        if (!cancelled) setClaimRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const role = useMemo(() => {
    const raw = userProfile?.role ?? claimRole ?? null;
    return normalizeRole(raw) ?? raw;
  }, [userProfile?.role, claimRole]);

  const mdtRole = userProfile?.mdtRole ?? null;

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const enterpriseRoleCode = useMemo(() => mapSystemRoleToEnterpriseCode(role), [role]);

  const value = useMemo(
    () => ({
      role,
      /** Clinical MDT label (Nurse, Psychologist, …). Not used for RBAC. */
      mdtRole,
      /** ADMIN | MANAGER | STAFF | INSPECTOR for display / analytics. */
      enterpriseRoleCode,
      /** @deprecated Use enterpriseRoleCode / mdtRole instead. */
      canonicalRole: enterpriseRoleCode,
      organisationId: organisationId ?? null,
      currentUser: user ?? null,
      currentUserId: user?.uid ?? null,
      permissions,
      loading: orgLoading,
      hasRole: (r) => role === r,
      can: (permission) =>
        typeof permission === "string" && permissions.includes(permission),
      isAllowed: (allowedRoles) =>
        !allowedRoles ||
        (Array.isArray(allowedRoles) && role != null && allowedRoles.includes(role)),
      canViewNotes: () => canViewClinicalNotesAccess(role, mdtRole),
      canEditNotes: () => canEditClinicalNotesAccess(role, mdtRole),
      canViewReports: () => canViewReportsFromSystemRole(role),
      isInspectorRole: () => isInspectorSystemRole(role),
    }),
    [role, mdtRole, permissions, orgLoading, enterpriseRoleCode, organisationId, user]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
