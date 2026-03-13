import { useOrganisation } from "../context/OrganisationContext";

/**
 * Convenience hook for organisation-scoped data.
 * Use organisationId for all Firestore queries under organisations/{organisationId}/...
 */
export function useOrganisationScope() {
  const { organisationId, organisation, userProfile, loading, error, reload } = useOrganisation();
  return {
    organisationId,
    organisation,
    userProfile,
    loading,
    error,
    reload,
    /** True when user is authenticated and has a valid active org (ready for scoped queries). */
    isReady: Boolean(organisationId && organisation && !loading && !error),
  };
}
