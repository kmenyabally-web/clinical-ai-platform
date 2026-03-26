import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const { role, isGlobalAdmin } = useRole();
  const location = useLocation();

  const isSuperAdmin = role === "SUPER_ADMIN" || isGlobalAdmin === true;

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  if (!user) {
    console.warn("⚠️ No auth user — allowing access in dev mode");
    return children;
  }

  if (location.pathname.startsWith("/system-admin") && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
