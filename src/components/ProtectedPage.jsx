import { Navigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";

/**
 * Protects a page by permission. Use after auth and organisation are already resolved
 * (e.g. inside ProtectedRoute). Redirects to /unauthorised if the user lacks the required permission.
 *
 * @example
 * <ProtectedRoute>
 *   <ProtectedPage permission="organisation:manage">
 *     <SettingsPage />
 *   </ProtectedPage>
 * </ProtectedRoute>
 */
export default function ProtectedPage({ permission, children }) {
  const { can, loading } = useRole();

  if (loading) {
    return (
      <div style={{ padding: 32 }} aria-busy="true">
        Loading…
      </div>
    );
  }

  if (!permission || !can(permission)) {
    return <Navigate to="/unauthorised" replace />;
  }

  return children;
}
