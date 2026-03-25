import { useOrganisation } from "../context/OrganisationContext";

const ProtectedRoute = ({ children }) => {
  const { loading, organisationId, hospitalId } = useOrganisation();

  if (loading) {
    return <div>Loading...</div>;
  }

  // 🔥 TEMP: DO NOT BLOCK NAVIGATION
  // Only warn, don't block

  if (!organisationId) {
    console.warn("No organisationId — allowing access for now");
  }

  if (!hospitalId) {
    console.warn("No hospitalId — allowing access for now");
  }

  return children;
};

export default ProtectedRoute;