import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useOrganisation } from "./OrganisationContext";
import { getPermissionsForRole, normalizeRole, canAccess } from "../config/rbac";
import {
  mapSystemRoleToEnterpriseCode,
  canViewClinicalNotesAccess,
  canEditClinicalNotesAccess,
  canDeleteClinicalNotesAccess,
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

  /** First resolved role from Firestore profile — avoids STAFF→Admin flicker while claims load. */
  const [lockedRole, setLockedRole] = useState(null);

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
        const r = tr.claims?.role || tr.claims?.claimRole;
        setClaimRole(typeof r === "string" && r.trim() ? r.trim() : null);
      })
      .catch(() => {
        if (!cancelled) setClaimRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLockedRole(null);
      return;
    }
    setLockedRole((prev) => {
      if (prev != null) return prev;
      const r = userProfile?.role || userProfile?.systemRole;
      return r != null && String(r).trim() !== "" ? String(r).trim() : null;
    });
  }, [user, userProfile?.role, userProfile?.systemRole]);

  const roleState = useMemo(() => {
    const profile = userProfile;
    const token = claimRole ? { claimRole } : null;
    const rawRole =
      profile?.role ||
      profile?.systemRole ||
      token?.claimRole ||
      "STAFF";
    const role = String(rawRole).toUpperCase();
    const isSuperAdmin = role === "SUPER_ADMIN";
    const isGroupAdmin = role === "GROUP_ADMIN";
    const isGlobalAdmin = role === "SUPER_ADMIN" || profile?.isGlobalAdmin === true;
    return { role, isGlobalAdmin, isSuperAdmin, isGroupAdmin };
  }, [userProfile?.role, userProfile?.systemRole, claimRole]);

  const role = useMemo(() => {
    if (lockedRole != null) {
      return normalizeRole(lockedRole) ?? lockedRole;
    }
    return normalizeRole(roleState.role) ?? roleState.role;
  }, [lockedRole, roleState.role]);
  const isGlobalAdmin = roleState.isGlobalAdmin;
  const isSuperAdmin = roleState.isSuperAdmin;
  const isGroupAdmin = roleState.isGroupAdmin;

  const mdtRole = userProfile?.mdtRole ?? null;

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const enterpriseRoleCode = useMemo(() => mapSystemRoleToEnterpriseCode(role), [role]);

  const value = useMemo(
    () => ({
      role,
      isGlobalAdmin,
      isSuperAdmin,
      isGroupAdmin,
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
      canDeleteNotes: () => canDeleteClinicalNotesAccess(role),
      canViewReports: () => canViewReportsFromSystemRole(role),
      isInspectorRole: () => isInspectorSystemRole(role),
    }),
    [role, isGlobalAdmin, isSuperAdmin, isGroupAdmin, mdtRole, permissions, orgLoading, enterpriseRoleCode, organisationId, user]
  );

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}
