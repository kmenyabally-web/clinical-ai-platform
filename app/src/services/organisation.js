import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { normalizePlanKey } from "../utils/featureAccess";

/**
 * Fetch the current user's document to get organisationId.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{ orgId: string, role: string, status: string, mdtRole?: string | null, hospitalId?: string | null, wardId?: string | null, email?: string | null, displayName?: string | null } | null>}
 */
export async function getCurrentUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  if (!userRef) return null;
  const userSnap = await getDoc(userRef);
  if (!userSnap || typeof userSnap.exists !== "function" || !userSnap.exists()) {
    return null;
  }
  const data = userSnap.data?.() ?? {};
  return {
    orgId: data.orgId ?? data.organisationId ?? null,
    role: data.role ?? null,
    mdtRole: typeof data.mdtRole === "string" && data.mdtRole.trim() ? data.mdtRole.trim() : null,
    status: data.status ?? null,
    hospitalId: typeof data.hospitalId === "string" ? data.hospitalId : null,
    wardId: typeof data.wardId === "string" ? data.wardId : null,
    email: typeof data.email === "string" ? data.email : null,
    displayName: typeof data.displayName === "string" ? data.displayName : null,
  };
}

/**
 * Fetch organisation metadata by organisationId.
 * organisations/: Metadata, CQC Provider IDs, subscription status (see architecture).
 * Never accesses ref.path; only uses ref after confirming it exists.
 * @param {string} organisationId
 * @returns {Promise<{ id: string, name: string, plan?: string, providerId?: string, serviceType?: string, status?: string, openActionCount?: number, highRiskActionCount?: number } | null>}
 */
export async function getOrganisation(organisationId) {
  if (!organisationId) return null;
  const orgRef = doc(db, "organisations", organisationId);
  if (!orgRef) return null;
  const orgSnap = await getDoc(orgRef);
  if (!orgSnap || typeof orgSnap.exists !== "function" || !orgSnap.exists()) {
    return null;
  }
  const data = orgSnap.data?.() ?? {};
  const rawPlan = data.plan ?? data.subscriptionPlan ?? null;
  const organisation = {
    id: orgSnap.id ?? organisationId,
    name: data.name ?? "",
    plan: rawPlan != null && String(rawPlan).trim() !== "" ? normalizePlanKey(rawPlan) : undefined,
    providerId: data.providerId ?? data.cqcProviderId ?? null,
    serviceType: data.serviceType ?? null,
    status: data.status ?? null,
    openActionCount: typeof data.openActionCount === "number" ? data.openActionCount : 0,
    highRiskActionCount: typeof data.highRiskActionCount === "number" ? data.highRiskActionCount : 0,
  };
  return organisation;
}

/**
 * Create an organisation document. Used by signup flow or admin provisioning.
 * @param {string} organisationId - Firestore document ID for organisations/{organisationId}
 * @param {{ name: string, status?: string, plan?: string }} data
 * @returns {Promise<void>}
 */
export async function createOrganisation(organisationId, data) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  if (!data?.name?.trim()) throw new Error("Organisation name required");
  const orgRef = doc(db, "organisations", organisationId);
  const plan = data.plan != null ? normalizePlanKey(data.plan) : "BASIC";
  await setDoc(orgRef, {
    name: data.name.trim(),
    plan,
    status: data.status ?? "active",
    createdAt: serverTimestamp(),
  });
}

/**
 * @param {string} organisationId
 * @param {{ name?: string }} data
 */
export async function updateOrganisation(organisationId, data) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const orgRef = doc(db, "organisations", organisationId);
  const payload = {};
  if (data?.name?.trim()) payload.name = data.name.trim();
  if (data?.plan != null && String(data.plan).trim() !== "") {
    payload.plan = normalizePlanKey(data.plan);
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(orgRef, { ...payload, updatedAt: serverTimestamp() });
}

/**
 * List organisations for admin UI: all (platform admin) or current tenant only.
 * @param {boolean} isPlatformAdmin
 * @param {string | null} organisationId - current user's tenant id
 * @returns {Promise<Array<{ id: string, name: string, plan?: string, status?: string | null }>>}
 */
export async function listOrganisationsForManagement(isPlatformAdmin, organisationId) {
  if (isPlatformAdmin) {
    const snap = await getDocs(query(collection(db, "organisations"), limit(500)));
    return (snap?.docs ?? []).map((d) => {
      const x = d?.data?.() ?? {};
      const rawPlan = x.plan ?? x.subscriptionPlan ?? null;
      return {
        id: d?.id ?? "",
        name: typeof x.name === "string" ? x.name : "",
        plan:
          rawPlan != null && String(rawPlan).trim() !== ""
            ? normalizePlanKey(rawPlan)
            : undefined,
        status: x.status ?? null,
      };
    });
  }
  if (!organisationId?.trim()) return [];
  const o = await getOrganisation(organisationId);
  return o ? [o] : [];
}
