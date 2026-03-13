import { doc, getDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Fetch the current user's document to get organisationId.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<{ orgId: string, role: string, status: string } | null>}
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
    status: data.status ?? null,
  };
}

/**
 * Fetch organisation metadata by organisationId.
 * organisations/: Metadata, CQC Provider IDs, subscription status (see architecture).
 * Never accesses ref.path; only uses ref after confirming it exists.
 * @param {string} organisationId
 * @returns {Promise<{ id: string, name: string, providerId?: string, serviceType?: string, status?: string, openActionCount?: number, highRiskActionCount?: number } | null>}
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
  const organisation = {
    id: orgSnap.id ?? organisationId,
    name: data.name ?? "",
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
 * @param {{ name: string, status?: string }} data
 * @returns {Promise<void>}
 */
export async function createOrganisation(organisationId, data) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  if (!data?.name?.trim()) throw new Error("Organisation name required");
  const orgRef = doc(db, "organisations", organisationId);
  await setDoc(orgRef, {
    name: data.name.trim(),
    status: data.status ?? "active",
    createdAt: serverTimestamp(),
  });
}
