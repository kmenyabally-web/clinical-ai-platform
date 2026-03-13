import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";

/**
 * Protects routes by auth, organisation, and optional role.
 * Use allowedRoles to restrict by role (e.g. <ProtectedRoute allowedRoles={["Manager"]}>).
 * If allowPlatformAdmin is true, platform admins can access without an organisation (e.g. /admin).
 */
export default function ProtectedRoute({ children, allowedRoles, allowPlatformAdmin }) {
  const { user, loading: authLoading } = useAuth();
  const { organisationId, loading: orgLoading, error: orgError, isPlatformAdmin } = useOrganisation();
  const { role, isAllowed } = useRole();

  const canAccessWithoutOrg = allowPlatformAdmin && isPlatformAdmin;

  if (authLoading) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (orgLoading) {
    return <div style={{ padding: 32 }}>Loading organisation...</div>;
  }

  if (!canAccessWithoutOrg && !organisationId) {
    return (
      <div style={{ padding: 32 }}>
        <p style={{ color: "#c62828" }}>{orgError ?? "No organisation assigned."}</p>
        <p>Contact your administrator or sign out.</p>
      </div>
    );
  }

  if (allowPlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/unauthorised" replace />;
  }

  if (!canAccessWithoutOrg && allowedRoles != null && Array.isArray(allowedRoles) && allowedRoles.length > 0 && !isAllowed(allowedRoles)) {
    return <Navigate to="/unauthorised" replace />;
  }

  return children;
}
