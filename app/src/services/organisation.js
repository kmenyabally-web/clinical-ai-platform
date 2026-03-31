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
import { db, auth } from "../firebase";
import { assertManagementWrite } from "./managementPermissions";
import { logManagementAudit } from "./managementAuditLog";
import { isPlatformAdmin } from "./platformAdminService";
import { getUserContext } from "./authService";
import { normalizePlanKey } from "../utils/featureAccess";
import { getCareTemplate } from "../config/careTemplates";
import {
  getFeaturesForOrganisationType,
  getRolesForOrganisationType,
  getUiModeForOrganisationType,
} from "../config/organisationTemplates";

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
    systemRole: typeof data.systemRole === "string" ? data.systemRole : null,
    isGlobalAdmin: data.isGlobalAdmin === true,
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
  if (data.isDeleted === true) return null;
  const rawPlan = data.plan ?? data.subscriptionPlan ?? null;
  const orgType = data.type ?? data.organisationType ?? data.orgType ?? null;
  const featuresFromDoc = data.features && typeof data.features === "object" ? data.features : null;
  const baseFromType = getFeaturesForOrganisationType(orgType);
  const effectiveFeatures = {
    ...baseFromType,
    ...(featuresFromDoc ? featuresFromDoc : {}),
    audit: true,
  };
  const organisation = {
    id: orgSnap.id ?? organisationId,
    name: data.name ?? "",
    groupId: typeof data.groupId === "string" && data.groupId.trim() ? data.groupId.trim() : null,
    plan: rawPlan != null && String(rawPlan).trim() !== "" ? normalizePlanKey(rawPlan) : undefined,
    providerId: data.providerId ?? data.cqcProviderId ?? null,
    serviceType: data.serviceType ?? null,
    status: data.status ?? null,
    type: orgType,
    uiMode: getUiModeForOrganisationType(orgType, data.uiMode),
    openActionCount: typeof data.openActionCount === "number" ? data.openActionCount : 0,
    highRiskActionCount: typeof data.highRiskActionCount === "number" ? data.highRiskActionCount : 0,
    features: effectiveFeatures,
    roles: Array.isArray(data.roles) ? data.roles : getRolesForOrganisationType(orgType),
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
  const typeField = data.type ?? data.organisationType ?? data.orgType ?? null;
  const baseFromType = getFeaturesForOrganisationType(typeField);
  const effectiveFeatures = {
    ...baseFromType,
    ...(data.features && typeof data.features === "object" ? data.features : {}),
    audit: true,
  };
  const effectiveRoles = Array.isArray(data.roles) ? data.roles : getRolesForOrganisationType(typeField);
  const care = getCareTemplate(typeField);
  const uiMode = data.uiMode ?? care?.uiMode ?? "CLINICAL";
  await setDoc(orgRef, {
    name: data.name.trim(),
    plan,
    status: data.status ?? "active",
    features: effectiveFeatures,
    roles: effectiveRoles,
    ...(typeField ? { type: typeField } : null),
    uiMode,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: serverTimestamp(),
  });
}

/**
 * @param {string} organisationId
 * @param {{ name?: string }} data
 */
export async function updateOrganisation(organisationId, data) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  await assertManagementWrite();
  const ctx = await getUserContext();
  const authUid = auth.currentUser?.uid;
  if (authUid && !(await isPlatformAdmin(authUid)) && ctx.organisationId !== organisationId) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  const orgRef = doc(db, "organisations", organisationId);
  const snap = await getDoc(orgRef);
  if (!snap.exists()) throw new Error("Organisation not found.");
  const cur = snap.data?.() ?? {};
  if (cur.isDeleted === true) throw new Error("Organisation has been deleted.");
  const payload = {};
  if (data?.name?.trim()) payload.name = data.name.trim();
  if (data?.plan != null && String(data.plan).trim() !== "") {
    payload.plan = normalizePlanKey(data.plan);
  }
  if (Object.keys(payload).length === 0) return;
  const uid = authUid ?? null;
  await updateDoc(orgRef, {
    ...payload,
    updatedAt: serverTimestamp(),
    ...(uid ? { updatedBy: uid } : {}),
  });
  void logManagementAudit({
    action: "ORG_ADMIN_UPDATE",
    entityType: "organisation",
    entityId: organisationId,
    organisationId,
  });
}

/**
 * Soft-delete an organisation (hidden from lists; tenant links may still reference id).
 */
export async function softDeleteOrganisation(organisationId) {
  const id = (organisationId ?? "").toString().trim();
  if (!id) throw new Error("organisationId required");
  await assertManagementWrite();
  const ctx = await getUserContext();
  const authUid = auth.currentUser?.uid;
  if (authUid && !(await isPlatformAdmin(authUid)) && ctx.organisationId !== id) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  const orgRef = doc(db, "organisations", id);
  const snap = await getDoc(orgRef);
  if (!snap.exists()) throw new Error("Organisation not found.");
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");
  await updateDoc(orgRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_DELETE",
    entityType: "organisation",
    entityId: id,
    organisationId: id,
  });
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
    return (snap?.docs ?? [])
      .map((d) => {
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
          isDeleted: x.isDeleted === true,
        };
      })
      .filter((row) => row.isDeleted !== true);
  }
  if (!organisationId?.trim()) return [];
  const o = await getOrganisation(organisationId);
  return o ? [o] : [];
}
