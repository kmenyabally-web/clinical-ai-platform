import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { getCurrentUserProfile, getOrganisation } from "../services/organisation";
import { isPlatformAdmin } from "../services/platformAdminService";

/**
 * OrganisationContext – multi-tenant scoping (see docs/architecture.md).
 * Loads the organisation for the authenticated user from Firestore:
 * users/{uid} → organisationId → organisations/{organisationId}.
 * Exposes organisationId so all Firestore queries can scope by tenant.
 * Waits for AuthContext to finish loading before running; avoids duplicate reads.
 */
const OrganisationContext = createContext(null);

export function useOrganisation() {
  const ctx = useContext(OrganisationContext);
  if (!ctx)
    throw new Error("useOrganisation must be used within OrganisationProvider");
  return ctx;
}

export function OrganisationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [organisationId, setOrganisationId] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastLoadedUidRef = useRef(null);

  const loadOrganisation = useCallback(async (uid) => {
    if (!uid) {
      setOrganisationId(null);
      setOrganisation(null);
      setUserProfile(null);
      setLoading(false);
      setError(null);
      lastLoadedUidRef.current = null;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await getCurrentUserProfile(uid);
      if (!profile?.orgId) {
        const platformAdmin = await isPlatformAdmin(uid);
        if (platformAdmin) {
          setOrganisationId(null);
          setOrganisation(null);
          setUserProfile({ ...profile, isPlatformAdmin: true });
          setError(null);
          setLoading(false);
          return;
        }
        setOrganisationId(null);
        setOrganisation(null);
        setUserProfile(profile ?? null);
        setError("No organisation assigned to this account.");
        setLoading(false);
        return;
      }
      if (profile.status != null && profile.status !== "active") {
        setOrganisationId(null);
        setOrganisation(null);
        setUserProfile(profile);
        setError("Account is not active.");
        setLoading(false);
        return;
      }
      setUserProfile(profile);
      setOrganisationId(profile.orgId);
      const org = await getOrganisation(profile.orgId);
      setOrganisation(org);
      if (!org) {
        setError("Organisation not found.");
      } else if (org.status === "suspended") {
        setOrganisationId(null);
        setOrganisation(org);
        setError("This organisation has been suspended. Contact support.");
      }
    } catch (err) {
      setError(err.message ?? "Failed to load organisation.");
      setOrganisationId(null);
      setOrganisation(null);
      setUserProfile(null);
    } finally {
      lastLoadedUidRef.current = uid;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setOrganisationId(null);
      setOrganisation(null);
      setUserProfile(null);
      setLoading(false);
      setError(null);
      lastLoadedUidRef.current = null;
      return;
    }
    const uid = user.uid;
    // Only skip when we've already completed a load for this user (lastLoadedUidRef is set in loadOrganisation's finally).
    if (lastLoadedUidRef.current === uid) {
      setLoading(false);
      return;
    }
    loadOrganisation(uid);
  }, [authLoading, user?.uid, loadOrganisation]);

  const value = {
    organisationId: organisationId ?? null,
    organisation: organisation ?? null,
    userProfile,
    loading,
    error: error ?? null,
    isPlatformAdmin: !!userProfile?.isPlatformAdmin,
    reload: () => {
      if (user?.uid) {
        lastLoadedUidRef.current = null;
        loadOrganisation(user.uid);
      }
    },
  };

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
}
