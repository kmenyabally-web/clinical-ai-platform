import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import { getCurrentUserProfile, getOrganisation } from "../services/organisation";
import { getSubscription } from "../services/billingService";
import { isPlatformAdmin } from "../services/platformAdminService";
import { DEV_AUTH_BYPASS } from "../config/devAuth";
import { hasFeature as planHasFeature, normalizePlanKey } from "../utils/featureAccess";

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
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastLoadedUidRef = useRef(null);

  const loadOrganisation = useCallback(async (uid) => {
    if (DEV_AUTH_BYPASS) {
      const devOrgId = "dev-organisation";
      const devOrg = {
        id: devOrgId,
        name: "Dev Organisation",
        status: "active",
        plan: "BASIC",
      };
      const devProfile = {
        orgId: devOrgId,
        role: "Admin",
        mdtRole: "Nurse",
        status: "active",
        isPlatformAdmin: true,
      };
      setOrganisationId(devOrgId);
      setOrganisation(devOrg);
      setSubscription(null);
      setUserProfile(devProfile);
      setError(null);
      lastLoadedUidRef.current = uid ?? "dev-user";
      setLoading(false);
      return;
    }
    if (!uid) {
      setOrganisationId(null);
      setOrganisation(null);
      setSubscription(null);
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
          setSubscription(null);
          setUserProfile({ ...profile, isPlatformAdmin: true });
          setError(null);
          setLoading(false);
          return;
        }
        setOrganisationId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(profile ?? null);
        setError("No organisation assigned to this account.");
        setLoading(false);
        return;
      }
      if (profile.status != null && profile.status !== "active") {
        setOrganisationId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(profile);
        setError("Account is not active.");
        setLoading(false);
        return;
      }
      setUserProfile(profile);
      setOrganisationId(profile.orgId);
      const org = await getOrganisation(profile.orgId);
      let sub = null;
      if (org && org.status !== "suspended") {
        try {
          sub = await getSubscription(profile.orgId);
        } catch {
          sub = null;
        }
      }
      setOrganisation(org);
      setSubscription(sub);
      if (!org) {
        setError("Organisation not found.");
      } else if (org.status === "suspended") {
        setOrganisationId(null);
        setOrganisation(org);
        setSubscription(null);
        setError("This organisation has been suspended. Contact support.");
      }
    } catch (err) {
      setError(err.message ?? "Failed to load organisation.");
      setOrganisationId(null);
      setOrganisation(null);
      setSubscription(null);
      setUserProfile(null);
    } finally {
      lastLoadedUidRef.current = uid;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      // In dev bypass mode, loadOrganisation will synchronously set a dev organisation.
      loadOrganisation("dev-user");
      return;
    }
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setOrganisationId(null);
      setOrganisation(null);
      setSubscription(null);
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

  const effectivePlanKey = useMemo(
    () => normalizePlanKey(organisation?.plan ?? subscription?.planName ?? "BASIC"),
    [organisation?.plan, subscription?.planName]
  );

  const hasFeature = useCallback(
    (feature) => planHasFeature(effectivePlanKey, feature),
    [effectivePlanKey]
  );

  const value = {
    organisationId: organisationId ?? null,
    organisation: organisation ?? null,
    subscription: subscription ?? null,
    effectivePlanKey,
    hasFeature,
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
