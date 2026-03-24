/**
 * Organisation user directory (Firestore `users/{uid}` with orgId / hospital / ward).
 * System `role` is for RBAC only; `mdtRole` is clinical identity.
 */

import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "../firebase";
import { getUserContext } from "./authService";
import { isPlatformAdmin } from "./platformAdminService";
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
  return (snap?.docs ?? []).map((d) => {
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
  if (!uid || !(await isPlatformAdmin(uid))) {
    await getUserContext();
  }
  const ref = doc(db, USERS_COLLECTION, userId);
  const payload = {};
  if (updates.role != null) payload.role = updates.role;
  if (updates.mdtRole !== undefined) payload.mdtRole = updates.mdtRole || null;
  if (updates.hospitalId !== undefined) payload.hospitalId = updates.hospitalId || null;
  if (updates.wardId !== undefined) payload.wardId = updates.wardId || null;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(ref, payload);
}

/**
 * Create a Firebase Auth user + Firestore users/{uid} (Admin SDK; callable).
 * @param {{ email: string, password: string, displayName: string, role: string, mdtRole: string, organisationId: string, hospitalId?: string | null, wardId?: string | null }} payload
 */
export async function createOrganisationUserAccount(payload) {
  const fn = httpsCallable(functions, "createOrganisationUser");
  const res = await fn(payload);
  return res.data;
}

export { SYSTEM_ROLES, MDT_ROLES, APP_ROLES };
