import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";

export default function ProtectedRoute({ children }) {
  const { loading: authLoading, user } = useAuth();
  const { loading: orgLoading } = useOrganisation();

  const loading = authLoading || orgLoading;
  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;

  if (!user) {
    console.warn("No authenticated user — allowing render for dev");
  }

  return children;
}
