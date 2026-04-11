/**
 * Organisation user directory (Firestore `users/{uid}` with orgId / hospital / ward).
 * System `role` is for RBAC only; `mdtRole` is clinical identity.
 */

import { collection, doc, getDoc, getDocs, query, updateDoc, where, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase";
import { assertManagementWrite } from "./managementPermissions";
import { logManagementAudit } from "./managementAuditLog";

async function ensureAuthTokenForCallable() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be signed in to create users.");
  }
  await user.getIdToken(true);
}
import { getUserContext } from "./authService";
import { isPlatformAdmin } from "./platformAdminService";
import { hasPermission } from "../config/rbac";
import { logAudit, logAuditEvent } from "./auditService";
import { SYSTEM_ROLES } from "../constants/systemRoles";
import { MDT_ROLES } from "../constants/mdtRoles";

const USERS_COLLECTION = "users";

/** @deprecated Use SYSTEM_ROLES */
const APP_ROLES = [...SYSTEM_ROLES];

/**
 * @param {string} organisationId
 */
export async function listUsersInOrganisation(organisationId) {
  if (!organisationId?.trim()) return [];
  const uid = auth.currentUser?.uid;
  if (uid && (await isPlatformAdmin(uid))) {
    // platform admin may list any tenant directory
  } else {
    const { organisationId: ctx } = await getUserContext();
    if (ctx !== organisationId) throw new Error("403 Forbidden: organisation scope mismatch");
  }

  const q = query(collection(db, USERS_COLLECTION), where("orgId", "==", organisationId));
  const snap = await getDocs(q);
  return (snap?.docs ?? [])
    .filter((d) => (d?.data?.()?.isDeleted !== true))
    .map((d) => {
      const x = d?.data?.() ?? {};
      return {
        id: d?.id ?? "",
        email: typeof x.email === "string" ? x.email : undefined,
        displayName: typeof x.displayName === "string" ? x.displayName : undefined,
        role: x.role ?? null,
        mdtRole: typeof x.mdtRole === "string" ? x.mdtRole : null,
        orgId: x.orgId ?? x.organisationId ?? null,
        hospitalId: typeof x.hospitalId === "string" ? x.hospitalId : null,
        wardId: typeof x.wardId === "string" ? x.wardId : null,
        status: x.status ?? null,
      };
    });
}

/**
 * @param {string} userId - Firebase Auth uid
 * @param {{ role?: string, mdtRole?: string, hospitalId?: string | null, wardId?: string | null }} updates
 */
export async function updateUserAssignment(userId, updates) {
  if (!userId?.trim()) throw new Error("userId required");
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  await assertManagementWrite();
  const ref = doc(db, USERS_COLLECTION, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  const cur = snap.data() ?? {};
  if (cur.isDeleted === true) throw new Error("User record has been removed from the directory.");
  const ctx = await getUserContext();
  if (!(await isPlatformAdmin(uid))) {
    const rowOrg = cur.orgId ?? cur.organisationId ?? null;
    if (rowOrg !== ctx.organisationId) throw new Error("403 Forbidden: organisation scope mismatch");
  }
  const payload = {};
  if (updates.role != null) payload.role = updates.role;
  if (updates.mdtRole !== undefined) payload.mdtRole = updates.mdtRole || null;
  if (updates.hospitalId !== undefined) payload.hospitalId = updates.hospitalId || null;
  if (updates.wardId !== undefined) payload.wardId = updates.wardId || null;
  if (Object.keys(payload).length === 0) return;
  payload.updatedAt = serverTimestamp();
  payload.updatedBy = uid;
  await updateDoc(ref, payload);
  const orgId = cur.orgId ?? cur.organisationId ?? null;
  void logManagementAudit({
    action: "ORG_ADMIN_UPDATE",
    entityType: "user",
    entityId: userId,
    organisationId: typeof orgId === "string" ? orgId : null,
  });
}

/**
 * Soft-delete a user directory row (does not delete Firebase Auth).
 * @param {string} userId
 */
export async function softDeleteUserDirectoryEntry(userId) {
  const id = (userId ?? "").toString().trim();
  if (!id) throw new Error("userId required");
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  if (id === uid) throw new Error("You cannot remove your own account from the directory.");
  await assertManagementWrite();
  const ref = doc(db, USERS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("User not found.");
  const cur = snap.data() ?? {};
  if (cur.isDeleted === true) throw new Error("Already removed.");
  const ctx = await getUserContext();
  if (!(await isPlatformAdmin(uid))) {
    const rowOrg = cur.orgId ?? cur.organisationId ?? null;
    if (rowOrg !== ctx.organisationId) throw new Error("403 Forbidden: organisation scope mismatch");
  }
  await updateDoc(ref, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    status: "inactive",
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  const orgId = cur.orgId ?? cur.organisationId ?? null;
  void logManagementAudit({
    action: "ORG_ADMIN_DELETE",
    entityType: "user",
    entityId: id,
    organisationId: typeof orgId === "string" ? orgId : null,
  });
}

/**
 * Create a Firebase Auth user + Firestore users/{uid} (Admin SDK; callable).
 * @param {{ email: string, password: string, displayName: string, role: string, mdtRole: string, organisationId: string, hospitalId?: string | null, wardId?: string | null }} payload
 */
export async function createOrganisationUserAccount(payload) {
  const ctx = await getUserContext();
  const uid = auth.currentUser?.uid;
  const platform = uid ? await isPlatformAdmin(uid) : false;
  if (!platform && !hasPermission(ctx.role, "CREATE_USER")) {
    throw new Error("Permission denied");
  }
  const targetOrg = (payload?.organisationId ?? "").toString().trim();
  const activeOrg = (ctx?.organisationId ?? "").toString().trim();
  if (targetOrg && activeOrg && targetOrg !== activeOrg) {
    if (!(platform && import.meta.env.DEV)) {
      throw new Error("403 Forbidden: organisation scope mismatch");
    }
  }
  await ensureAuthTokenForCallable();
  const fn = httpsCallable(functions, "createOrganisationUser");
  const res = await fn(payload);
  const data = res.data ?? {};
  await logAudit("CREATE_USER", {
    userId: data.uid ?? data.userId ?? null,
    organisationId: payload?.organisationId ?? ctx.organisationId ?? null,
  });
  void logAuditEvent({
    action: "CREATE_USER",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      role: ctx?.role ?? null,
    },
    organisationId: payload?.organisationId ?? ctx.organisationId ?? null,
    hospitalId: payload?.hospitalId ?? null,
    wardId: payload?.wardId ?? null,
    metadata: {
      createdUserId: data.uid ?? data.userId ?? null,
      createdUserEmail: payload?.email ?? null,
      createdUserRole: payload?.role ?? null,
      createdUserMdtRole: payload?.mdtRole ?? null,
    },
  });
  return data;
}

/**
 * Same as {@link createOrganisationUserAccount}; callable name `createOrganisationUser` (HTTPS onCall).
 * @param {{ email: string, password: string, displayName?: string, name?: string, role: string, mdtRole: string, organisationId: string, hospitalId: string, wardId?: string | null }} data
 */
export async function createUser(data) {
  return createOrganisationUserAccount({
    email: data.email,
    password: data.password,
    displayName: (data.displayName ?? data.name ?? "").trim(),
    role: data.role,
    mdtRole: data.mdtRole,
    organisationId: data.organisationId,
    hospitalId: data.hospitalId,
    wardId: data.wardId ?? null,
  });
}

export { SYSTEM_ROLES, MDT_ROLES, APP_ROLES };
