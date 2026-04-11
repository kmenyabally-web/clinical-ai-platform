import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "./AuthContext";
import { getOrganisation } from "../services/organisation";
import { getSubscription } from "../services/billingService";
import { isPlatformAdmin } from "../services/platformAdminService";
import { DEV_AUTH_BYPASS } from "../config/devAuth";
import { hasFeature as planHasFeature, normalizePlanKey } from "../utils/featureAccess";
import { auth, db } from "../firebase";
import { getFeaturesForOrganisationType } from "../config/organisationTemplates";
import { applyDevOrganisationFeatures } from "../config/devFeatureOverrides";

/**
 * Dev-only: unlock plan feature `"ai"` while running the Vite dev server (`import.meta.env.DEV` is false in production builds).
 * Does not remove feature flags — org `features.ai` and plan matrix still apply in prod.
 */
function isDevAiFeatureOverride() {
  return import.meta.env.DEV === true;
}

/** Normalise org / hospital / ward ids from Firestore (string, DocumentReference, or number). */
function coerceTenantId(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === "object" && typeof value?.id === "string") {
    const t = value.id.trim();
    return t || null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

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
  const { user } = useAuth();
  const [organisationId, setOrganisationId] = useState(null);
  /** First resolved tenant id after auth — kept stable (not cleared when transient loads flicker). */
  const [activeOrgId, setActiveOrgId] = useState(null);
  /** Bumps when tenant scope finishes resolving — consumers refetch patients / notes / incidents. */
  const [scopeRevision, setScopeRevision] = useState(0);
  const prevTenantKeyRef = useRef(null);
  const [organisation, setOrganisation] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** True when a signed-in tenant user must create or repair an organisation document before using the app. */
  const [needsSetup, setNeedsSetup] = useState(false);

  const lastLoadedUidRef = useRef(null);

  const loadGuestDevOrganisation = useCallback(async () => {
    if (!import.meta.env.DEV) return;
    const demoId = "demo-org";
    setLoading(true);
    setError(null);
    setNeedsSetup(false);
    try {
      const orgSnap = await getDoc(doc(db, "organisations", demoId));
      setOrganisationId(demoId);
      setActiveOrgId(demoId);
      setUserProfile(null);
      setSubscription(null);
      if (orgSnap.exists()) {
        const org = await getOrganisation(demoId);
        setOrganisation(applyDevOrganisationFeatures(org));
        setError(null);
      } else {
        setOrganisation(null);
        setError("⚠️ Organisation not found");
      }
    } catch {
      setOrganisationId(demoId);
      setActiveOrgId(demoId);
      setOrganisation(null);
      setError("⚠️ Organisation not found");
    } finally {
      setLoading(false);
      lastLoadedUidRef.current = null;
    }
  }, []);

  const loadOrganisation = useCallback(async (uid) => {
    if (DEV_AUTH_BYPASS) {
      const devOrgId = "dev-organisation";
      const devOrg = {
        id: devOrgId,
        name: "Dev Organisation",
        status: "active",
        plan: "BASIC",
        type: "hospital",
        uiMode: "CLINICAL",
        features: getFeaturesForOrganisationType("hospital"),
      };
      const devProfile = {
        orgId: devOrgId,
        role: "Admin",
        mdtRole: "Nurse",
        status: "active",
        isPlatformAdmin: true,
        hospitalId: null,
        wardId: null,
      };
      setOrganisationId(devOrgId);
      setActiveOrgId(devOrgId);
      setOrganisation(applyDevOrganisationFeatures(devOrg));
      setSubscription(null);
      setUserProfile(devProfile);
      setError(null);
      setNeedsSetup(false);
      lastLoadedUidRef.current = uid ?? "dev-user";
      setLoading(false);
      return;
    }
    if (!uid) {
      if (import.meta.env.DEV) {
        await loadGuestDevOrganisation();
        return;
      }
      setOrganisationId(null);
      setActiveOrgId(null);
      setOrganisation(null);
      setSubscription(null);
      setUserProfile(null);
      setNeedsSetup(false);
      setLoading(false);
      setError(null);
      lastLoadedUidRef.current = null;
      return;
    }
    setLoading(true);
    setError(null);
    setNeedsSetup(false);
    try {
      // Load the authenticated user's Firestore profile using UID (never email/custom ids).
      const userDoc = await getDoc(doc(db, "users", uid));
      const exists = Boolean(userDoc?.exists?.());
      const data = userDoc?.data?.() ?? {};
      if (import.meta.env.DEV) {
        console.log("Debug:", { profileLoaded: exists });
      }
      // Normalise Firestore user profile fields into a consistent shape.
      const orgId =
        coerceTenantId(data?.organisationId) ||
        coerceTenantId(data?.organizationId) ||
        coerceTenantId(data?.orgId) ||
        null;
      const hospitalId = coerceTenantId(data?.hospitalId);
      const wardId = coerceTenantId(data?.wardId);

      const roleFromDoc =
        (typeof data?.role === "string" && data.role.trim()
          ? data.role.trim()
          : null) ||
        (typeof data?.systemRole === "string" && data.systemRole.trim()
          ? data.systemRole.trim()
          : null) ||
        null;

      let resolvedProfile = exists
        ? {
            // Store normalised values in BOTH `orgId` and `organisationId`.
            orgId,
            organisationId: orgId,
            systemRole:
              typeof data?.systemRole === "string" && data.systemRole.trim()
                ? data.systemRole.trim()
                : null,
            role: roleFromDoc,
            mdtRole:
              typeof data?.mdtRole === "string" && data.mdtRole.trim() ? data.mdtRole.trim() : null,
            status: data?.status ?? null,
            hospitalId,
            wardId,
            email: typeof data?.email === "string" ? data.email.trim() : null,
            displayName: typeof data?.displayName === "string" ? data.displayName.trim() : null,
            groupId: coerceTenantId(data?.groupId),
          }
        : null;
      if (!exists) {
        console.error("User doc missing", { uid });
        console.warn("User profile missing", { uid });
        setOrganisationId(null);
        setActiveOrgId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(null);
        setNeedsSetup(false);
        setError("User profile missing. Contact admin.");
        setLoading(false);
        return;
      }

      if (!resolvedProfile?.orgId) {
        console.warn("User profile loaded but missing orgId/organisationId", {
          userDocKeys: Object.keys(data ?? {}),
        });

        // Fail-safe: fall back to Auth custom claims if Firestore profile is missing orgId.
        // This keeps the app functional while legacy users are backfilled.
        const currentUser = auth.currentUser;
        if (currentUser?.uid === uid) {
          try {
            const tokenResult = await currentUser.getIdTokenResult(true);
            const claims = tokenResult?.claims ?? {};

            const orgIdFromClaims =
              typeof claims.organisationId === "string" && claims.organisationId.trim()
                ? claims.organisationId.trim()
                : typeof claims.orgId === "string" && claims.orgId.trim()
                  ? claims.orgId.trim()
                  : null;

            const hospitalIdFromClaims =
              typeof claims.hospitalId === "string" && claims.hospitalId.trim()
                ? claims.hospitalId.trim()
                : null;

            const wardIdFromClaims =
              typeof claims.wardId === "string" && claims.wardId.trim()
                ? claims.wardId.trim()
                : null;

            if (orgIdFromClaims) {
              const claimsOrgRef = doc(db, "organisations", orgIdFromClaims);
              const claimsOrgSnap = await getDoc(claimsOrgRef);
              if (!claimsOrgSnap.exists()) {
                console.warn("⚠️ Org ID exists but no document found", {
                  source: "auth_claims",
                });
                const platformAdmin = await isPlatformAdmin(uid);
                setOrganisationId(orgIdFromClaims);
                setActiveOrgId(orgIdFromClaims);
                setOrganisation(null);
                setSubscription(null);
                setUserProfile({
                  ...(resolvedProfile ?? {}),
                  orgId: orgIdFromClaims,
                  organisationId: orgIdFromClaims,
                  hospitalId: hospitalIdFromClaims ?? resolvedProfile?.hospitalId ?? null,
                  wardId: wardIdFromClaims ?? resolvedProfile?.wardId ?? null,
                  isPlatformAdmin: platformAdmin,
                });
                if (platformAdmin) {
                  setNeedsSetup(false);
                  setError(null);
                } else {
                  console.warn("⚠️ No organisation found — entering setup mode");
                  setNeedsSetup(true);
                  setError("⚠️ Organisation not found");
                }
                setLoading(false);
                lastLoadedUidRef.current = uid;
                return;
              }
              const org = await getOrganisation(orgIdFromClaims);
              const platformAdmin = await isPlatformAdmin(uid);
              setOrganisationId(orgIdFromClaims);
              setActiveOrgId(orgIdFromClaims);
              setOrganisation(org);
              setSubscription(null);
              setUserProfile({
                ...(resolvedProfile ?? {}),
                orgId: orgIdFromClaims,
                organisationId: orgIdFromClaims,
                hospitalId: hospitalIdFromClaims ?? resolvedProfile?.hospitalId ?? null,
                wardId: wardIdFromClaims ?? resolvedProfile?.wardId ?? null,
                isPlatformAdmin: platformAdmin,
              });
              setNeedsSetup(false);
              setError(null);
              setLoading(false);
              lastLoadedUidRef.current = uid;
              return;
            }
          } catch (e) {
            // If claims reading fails, fall through to the existing error path.
          }
        }

        const platformAdmin = await isPlatformAdmin(uid);
        if (platformAdmin) {
          setOrganisationId(null);
          setActiveOrgId(null);
          setOrganisation(null);
          setSubscription(null);
          setUserProfile({ ...(resolvedProfile ?? {}), isPlatformAdmin: true });
          setNeedsSetup(false);
          setError(null);
          setLoading(false);
          return;
        }
        setOrganisationId(null);
        setActiveOrgId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(resolvedProfile ?? null);
        console.warn("⚠️ No organisation found — entering setup mode");
        setNeedsSetup(true);
        setError("No organisation assigned to this account.");
        setLoading(false);
        return;
      }

      // If organisation exists but hospital/ward are missing, populate hospitalId/wardId from
      // Auth custom claims so Layout's hospital guard doesn't block navigation.
      if (auth.currentUser?.uid === uid && !resolvedProfile?.hospitalId) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
          const claims = tokenResult?.claims ?? {};

          const hospitalIdFromClaims =
            typeof claims.hospitalId === "string" && claims.hospitalId.trim()
              ? claims.hospitalId.trim()
              : null;
          const wardIdFromClaims =
            typeof claims.wardId === "string" && claims.wardId.trim()
              ? claims.wardId.trim()
              : null;

          if (hospitalIdFromClaims) {
            resolvedProfile = {
              ...(resolvedProfile ?? {}),
              hospitalId: hospitalIdFromClaims,
              wardId: wardIdFromClaims ?? resolvedProfile?.wardId ?? null,
            };
          }
        } catch {
          // Ignore claim read failures; existing error handling will apply.
        }
      }

      if (import.meta.env.DEV) {
        console.log("Debug:", {
          tenantScope: "resolved",
          hasHospital: Boolean(resolvedProfile?.hospitalId),
          hasWard: Boolean(resolvedProfile?.wardId),
        });
      }
      if (resolvedProfile.status != null && resolvedProfile.status !== "active") {
        setOrganisationId(null);
        setActiveOrgId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(resolvedProfile);
        setNeedsSetup(false);
        setError("Account is not active.");
        setLoading(false);
        return;
      }
      setUserProfile(resolvedProfile);
      let orgIdToLoad = resolvedProfile.orgId;
      if (orgIdToLoad) orgIdToLoad = String(orgIdToLoad).trim();

      // If `organisationId` was accidentally stored as the organisation *name* (legacy data),
      // try to resolve the correct document id from organisations.name.
      const orgRef = doc(db, "organisations", orgIdToLoad);
      const orgSnap = await getDoc(orgRef);
      if (!orgSnap.exists() && typeof orgIdToLoad === "string" && orgIdToLoad.trim()) {
        try {
          const byNameQ = query(
            collection(db, "organisations"),
            where("name", "==", orgIdToLoad.trim()),
            limit(1)
          );
          const byNameSnap = await getDocs(byNameQ);
          const matched = byNameSnap?.docs?.[0];
          if (matched?.id) {
            orgIdToLoad = matched.id;
            resolvedProfile = {
              ...(resolvedProfile ?? {}),
              orgId: orgIdToLoad,
              organisationId: orgIdToLoad,
            };
            setUserProfile(resolvedProfile);
            setOrganisationId(orgIdToLoad);
            setActiveOrgId(orgIdToLoad);
          }
        } catch (e) {
          // ignore and continue with existing fallback below
        }
      }

      // Re-check after potential name->id resolution.
      const orgRef2 = doc(db, "organisations", orgIdToLoad);
      const orgSnap2 = await getDoc(orgRef2);
      if (!orgSnap2.exists()) {
        console.warn("⚠️ Org ID exists but no document found");
        const platformAdmin = await isPlatformAdmin(uid);
        setOrganisation(null);
        setSubscription(null);
        if (platformAdmin) {
          setNeedsSetup(false);
          setError(null);
        } else {
          console.warn("⚠️ No organisation found — entering setup mode");
          setNeedsSetup(true);
          setError("⚠️ Organisation not found");
        }
        setLoading(false);
        lastLoadedUidRef.current = uid;
        return;
      }

      setOrganisationId(orgIdToLoad);
      setActiveOrgId(orgIdToLoad);
      const org = await getOrganisation(orgIdToLoad);
      if (!org) {
        const platformAdmin = await isPlatformAdmin(uid);
        setOrganisation(null);
        setSubscription(null);
        if (platformAdmin) {
          setNeedsSetup(false);
          setError(null);
        } else {
          console.warn("⚠️ No organisation found — entering setup mode");
          setNeedsSetup(true);
          setError("⚠️ Organisation not found");
        }
        setLoading(false);
        lastLoadedUidRef.current = uid;
        return;
      }
      let sub = null;
      if (org.status !== "suspended") {
        try {
          sub = await getSubscription(orgIdToLoad);
        } catch {
          sub = null;
        }
      }
      setOrganisation(applyDevOrganisationFeatures(org));
      setSubscription(sub);
      setNeedsSetup(false);
      if (org.status === "suspended") {
        setOrganisationId(null);
        setActiveOrgId(null);
        setOrganisation(applyDevOrganisationFeatures(org));
        setSubscription(null);
        setNeedsSetup(false);
        setError("This organisation has been suspended. Contact support.");
      }
    } catch (err) {
      setError(err.message ?? "Failed to load organisation.");
      setOrganisationId(null);
      setActiveOrgId(null);
      setOrganisation(null);
      setSubscription(null);
      setUserProfile(null);
      setNeedsSetup(false);
    } finally {
      lastLoadedUidRef.current = uid;
      setLoading(false);
    }
  }, [loadGuestDevOrganisation]);

  // Load tenant profile from the same auth source Firebase uses (avoids races with React context).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) {
      loadOrganisation("dev-user");
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        if (import.meta.env.DEV) {
          void loadGuestDevOrganisation();
          return;
        }
        setOrganisationId(null);
        setActiveOrgId(null);
        setOrganisation(null);
        setSubscription(null);
        setUserProfile(null);
        setNeedsSetup(false);
        setLoading(false);
        setError(null);
        lastLoadedUidRef.current = null;
        return;
      }
      const uid = authUser.uid;
      if (lastLoadedUidRef.current === uid) {
        setLoading(false);
        return;
      }
      loadOrganisation(uid);
    });
    return () => unsubscribe();
  }, [loadOrganisation, loadGuestDevOrganisation]);

  const effectivePlanKey = useMemo(
    () => normalizePlanKey(organisation?.plan ?? subscription?.planName ?? "BASIC"),
    [organisation?.plan, subscription?.planName]
  );

  // Default type behaviour: if missing, treat as clinical "hospital".
  const orgType = organisation?.type ?? organisation?.organisationType ?? "hospital";

  const hasFeature = useCallback(
    (feature) => {
      if (feature === "ai" && isDevAiFeatureOverride()) {
        return true;
      }
      const orgFeatures = organisation?.features;
      if (orgFeatures && typeof orgFeatures === "object" && orgFeatures[feature] === true) {
        return true;
      }
      return planHasFeature(effectivePlanKey, feature);
    },
    [effectivePlanKey, organisation?.features]
  );

  const organisationWithTypeDefault = useMemo(() => {
    if (!organisation) return null;
    return {
      ...organisation,
      organisationType: organisation.organisationType ?? organisation.type ?? "hospital",
    };
  }, [organisation]);

  /** Prefer locked tenant id so UI/services do not flicker when transient loads clear organisationId. */
  const effectiveOrganisationId = activeOrgId ?? organisationId ?? null;

  useEffect(() => {
    if (user?.organisationId) {
      setActiveOrgId(String(user.organisationId).trim());
    }
  }, [user?.organisationId]);

  useEffect(() => {
    if (organisationId) {
      setActiveOrgId(organisationId);
    }
  }, [organisationId]);

  useEffect(() => {
    if (loading) return;
    const key = effectiveOrganisationId ?? "";
    if (key && key !== prevTenantKeyRef.current) {
      prevTenantKeyRef.current = key;
      setScopeRevision((x) => x + 1);
    }
    if (!key) prevTenantKeyRef.current = null;
  }, [loading, effectiveOrganisationId]);

  const value = {
    profile: userProfile,
    organisationId: effectiveOrganisationId,
    activeOrgId: effectiveOrganisationId,
    organisationName: organisation?.name ?? "",
    groupId: userProfile?.groupId ?? null,
    hospitalId: userProfile?.hospitalId ?? null,
    wardId: userProfile?.wardId ?? null,
    organisation: organisationWithTypeDefault,
    organisationType: orgType,
    orgType,
    subscription: subscription ?? null,
    effectivePlanKey,
    hasFeature,
    userProfile,
    loading,
    error: error ?? null,
    needsSetup,
    isPlatformAdmin: !!userProfile?.isPlatformAdmin,
    scopeRevision,
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
