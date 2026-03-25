import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useOrganisation } from "./OrganisationContext";
import { getPermissionsForRole, normalizeRole, canAccess } from "../config/rbac";
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
    let cancelled = false;
    if (!user?.getIdTokenResult) {
      setClaimRole(null);
      return;
    }
    user
      .getIdTokenResult()
      .then((tr) => {
        if (cancelled) return;
        const r = tr.claims?.role;
        setClaimRole(typeof r === "string" && r.trim() ? r.trim() : null);
      })
      .catch(() => {
        if (!cancelled) setClaimRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const role = useMemo(() => {
    const profile = userProfile;
    const rawRole =
      profile?.role ||
      profile?.systemRole ||
      claimRole ||
      "STAFF";
    const finalRole = normalizeRole(String(rawRole)) ?? "Staff";
    if (import.meta.env.DEV) {
      console.log("Debug:", { role: finalRole });
    }
    return finalRole;
  }, [userProfile?.role, userProfile?.systemRole, claimRole]);

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
        typeof permission === "string" && canAccess(role, permission),
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
