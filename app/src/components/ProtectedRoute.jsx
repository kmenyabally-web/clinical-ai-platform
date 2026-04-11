import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";
import { Navigate, useLocation } from "react-router-dom";

let devNoAuthBypassWarned = false;

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string[]=} props.allowedRoles - If set, user role must be listed (e.g. Admin, Organisation Admin) or platform admin.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { loading, user } = useAuth();
  const { role, isGlobalAdmin } = useRole();
  const { isPlatformAdmin } = useOrganisation();
  const location = useLocation();

  const isSuperAdmin = role === "SUPER_ADMIN" || isGlobalAdmin === true;

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  if (!user) {
    if (import.meta.env.DEV) {
      if (!devNoAuthBypassWarned) {
        devNoAuthBypassWarned = true;
        console.warn("⚠️ No auth user — allowing access in dev mode");
      }
      return children;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (location.pathname.startsWith("/system-admin") && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const mayAccess =
      Boolean(isPlatformAdmin) || (role != null && allowedRoles.includes(role));
    if (!mayAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
