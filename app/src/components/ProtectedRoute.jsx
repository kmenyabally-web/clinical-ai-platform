import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";

/**
 * Protects routes by auth, organisation, and optional role.
 * - allowMissingOrganisationForPlatformAdmin: platform admins may access without a tenant org (others still need organisationId).
 * - platformAdminOnly: only platform admins (e.g. /admin).
 * - allowedRoles: e.g. ["Admin","Manager"]; platform admins are treated as allowed for management routes.
 * - requireOrganisation: when false, signed-in users may access without organisationId (e.g. /unauthorised).
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
  platformAdminOnly,
  allowMissingOrganisationForPlatformAdmin,
  requireOrganisation = true,
}) {
  const { user, loading: authLoading } = useAuth();
  const { organisationId, loading: orgLoading, error: orgError, isPlatformAdmin } = useOrganisation();
  const { role, isAllowed } = useRole();

  const canBypassMissingOrg =
    Boolean(allowMissingOrganisationForPlatformAdmin) && isPlatformAdmin;

  if (authLoading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (orgLoading) {
    return <div style={{ padding: 32 }}>Loading organisation...</div>;
  }

  if (requireOrganisation !== false && !canBypassMissingOrg && !organisationId) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#c62828" }}>{orgError ?? "No organisation assigned."}</p>
        <p>Contact your administrator or sign out.</p>
      </div>
    );
  }

  if (platformAdminOnly && !isPlatformAdmin) {
    return <Navigate to="/unauthorised" replace />;
  }

  if (
    !canBypassMissingOrg &&
    allowedRoles != null &&
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0
  ) {
    const managementBypass =
      isPlatformAdmin &&
      allowedRoles.some((r) => r === "Admin" || r === "Manager");
    if (!isAllowed(allowedRoles) && !managementBypass) {
      return <Navigate to="/unauthorised" replace />;
    }
  }

  return children;
}
