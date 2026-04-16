/**
 * Hospital / ward hierarchy (Firestore `hospitals/`, `wards/`).
 * All records are scoped by organisationId.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { getUserContext } from "./authService";
import { isPlatformAdmin } from "./platformAdminService";
import { getCurrentUserProfile } from "./organisation";
import { assertTenantContext } from "../utils/tenantContext";
import { logAuditEvent } from "./auditService";
import { assertManagementWrite } from "./managementPermissions";
import { logManagementAudit } from "./managementAuditLog";

const HOSPITALS_COLLECTION = "hospitals";
const WARDS_COLLECTION = "wards";
export const WARD_TYPES = ["acute", "picu", "rehab", "low_secure", "medium_secure"];

function normalizeWardType(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return null;
  if (!WARD_TYPES.includes(t)) {
    throw new Error("Invalid ward type. Expected acute | picu | rehab | low_secure | medium_secure.");
  }
  return t;
}

/**
 * @param {string} organisationId
 * @returns {Promise<Array<{ id: string, name: string, organisationId: string }>>}
 */
export async function listHospitals(organisationId) {
  if (!organisationId?.trim()) return [];
  await assertSameOrganisation(organisationId);
  const nestedRows = await listNestedHospitals(organisationId).catch(() => []);
  if (nestedRows.length > 0) return nestedRows;
  const q = query(
    collection(db, HOSPITALS_COLLECTION),
    where("organisationId", "==", organisationId),
    orderBy("name")
  );
  try {
    const snap = await getDocs(q);
    const rows = mapHospitalDocs(snap?.docs ?? []);
    if (rows.length > 0) return rows;
    return listNestedHospitals(organisationId);
  } catch {
    const q2 = query(collection(db, HOSPITALS_COLLECTION), where("organisationId", "==", organisationId));
    const snap = await getDocs(q2);
    const rows = mapHospitalDocs(snap?.docs ?? []);
    if (rows.length > 0) {
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return rows;
    }
    return listNestedHospitals(organisationId);
  }
}

function mapHospitalDocs(docs) {
  return docs
    .filter((d) => (d?.data?.()?.isDeleted !== true))
    .map((d) => {
      const x = d?.data?.() ?? {};
      return {
        id: d?.id ?? "",
        name: typeof x.name === "string" ? x.name : "",
        organisationId: x.organisationId ?? "",
      };
    });
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 */
export async function listWards(organisationId, hospitalId) {
  if (!organisationId?.trim() || !hospitalId?.trim()) return [];
  await assertSameOrganisation(organisationId);
  const q = query(
    collection(db, WARDS_COLLECTION),
    where("organisationId", "==", organisationId),
    where("hospitalId", "==", hospitalId),
    orderBy("name")
  );
  try {
    const snap = await getDocs(q);
    const rows = mapWardDocs(snap?.docs ?? []);
    if (rows.length > 0) return rows;
    return listNestedWards(organisationId, hospitalId);
  } catch {
    const q2 = query(
      collection(db, WARDS_COLLECTION),
      where("organisationId", "==", organisationId),
      where("hospitalId", "==", hospitalId)
    );
    const snap = await getDocs(q2);
    const rows = mapWardDocs(snap?.docs ?? []);
    if (rows.length > 0) {
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return rows;
    }
    return listNestedWards(organisationId, hospitalId);
  }
}

async function listNestedHospitals(organisationId) {
  const nested = collection(db, "organisations", organisationId, "hospitals");
  const snap = await getDocs(nested);
  const rows = mapHospitalDocs(snap?.docs ?? []);
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return rows;
}

async function listNestedWards(organisationId, hospitalId) {
  const nested = collection(db, "organisations", organisationId, "wards");
  const q = query(nested, where("hospitalId", "==", hospitalId));
  const snap = await getDocs(q);
  const rows = mapWardDocs(snap?.docs ?? []);
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return rows;
}

/**
 * All wards for a tenant (any hospital). Used when UI scope is "All hospitals".
 * @param {string} organisationId
 * @returns {Promise<Array<{ id: string, name: string, hospitalId: string, organisationId: string, type: string, wardType: string }>>}
 */
export async function listWardsForOrganisation(organisationId) {
  if (!organisationId?.trim()) return [];
  await assertSameOrganisation(organisationId);
  const org = organisationId.trim();
  try {
    const nested = collection(db, "organisations", org, "wards");
    const snap = await getDocs(nested);
    const rows = mapWardDocs(snap?.docs ?? []);
    if (rows.length > 0) {
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return rows;
    }
  } catch {
    /* fall through to root collection */
  }
  try {
    const q = query(collection(db, WARDS_COLLECTION), where("organisationId", "==", org), orderBy("name"));
    const snap = await getDocs(q);
    const rows = mapWardDocs(snap?.docs ?? []);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return rows;
  } catch {
    const q2 = query(collection(db, WARDS_COLLECTION), where("organisationId", "==", org));
    const snap = await getDocs(q2);
    const rows = mapWardDocs(snap?.docs ?? []);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return rows;
  }
}

function mapWardDocs(docs) {
  return docs
    .filter((d) => (d?.data?.()?.isDeleted !== true))
    .map((d) => {
      const x = d?.data?.() ?? {};
      let wt = "acute";
      try {
        wt = normalizeWardType(x.type ?? x.wardType) ?? "acute";
      } catch {
        wt = "acute";
      }
      return {
        id: d?.id ?? "",
        name: typeof x.name === "string" ? x.name : "",
        hospitalId: x.hospitalId ?? "",
        organisationId: x.organisationId ?? "",
        type: wt,
        wardType: wt,
      };
    });
}

/**
 * @param {string} organisationId
 * @param {{ name: string }} data
 * @returns {Promise<{ id: string }>}
 */
export async function createHospital(organisationId, data) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  if (!data?.name?.trim()) throw new Error("Hospital name required");
  await assertSameOrganisation(organisationId);
  const ref = doc(collection(db, HOSPITALS_COLLECTION));
  assertTenantContext(organisationId, ref.id);
  await setDoc(ref, {
    name: data.name.trim(),
    organisationId,
    hospitalId: ref.id,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: serverTimestamp(),
  });
  void logAuditEvent({
    action: "CREATE_HOSPITAL",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
    },
    organisationId,
    hospitalId: ref.id,
    wardId: null,
    metadata: { name: data.name.trim() },
  });
  return { id: ref.id };
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 * @param {{ name: string }} data
 * @returns {Promise<{ id: string }>}
 */
export async function createWard(organisationId, hospitalId, data) {
  if (!organisationId?.trim() || !hospitalId?.trim()) throw new Error("organisationId and hospitalId required");
  if (!data?.name?.trim()) throw new Error("Ward name required");
  const wardType = normalizeWardType(data?.type ?? data?.wardType);
  if (!wardType) throw new Error("Ward type required");
  await assertSameOrganisation(organisationId);
  assertTenantContext(organisationId, hospitalId);
  const ref = doc(collection(db, WARDS_COLLECTION));
  await setDoc(ref, {
    name: data.name.trim(),
    hospitalId,
    organisationId,
    wardId: ref.id,
    type: wardType,
    wardType,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: serverTimestamp(),
  });
  void logAuditEvent({
    action: "CREATE_WARD",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
    },
    organisationId,
    hospitalId,
    wardId: ref.id,
    metadata: { name: data.name.trim() },
  });
  return { id: ref.id };
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 * @param {{ name: string }} data
 */
export async function updateHospital(organisationId, hospitalId, data) {
  if (!organisationId?.trim() || !hospitalId?.trim()) throw new Error("organisationId and hospitalId required");
  if (!data?.name?.trim()) throw new Error("Hospital name required");
  await assertManagementWrite();
  await assertSameOrganisation(organisationId);
  const ref = doc(db, HOSPITALS_COLLECTION, hospitalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Hospital not found.");
  const cur = snap.data() ?? {};
  if (cur.organisationId !== organisationId) throw new Error("403 Forbidden: organisation scope mismatch");
  if (cur.isDeleted === true) throw new Error("Hospital has been deleted.");
  const uid = auth.currentUser?.uid ?? null;
  await updateDoc(ref, {
    name: data.name.trim(),
    updatedAt: serverTimestamp(),
    ...(uid ? { updatedBy: uid } : {}),
  });
  void logManagementAudit({
    action: "ORG_ADMIN_UPDATE",
    entityType: "hospital",
    entityId: hospitalId,
    organisationId,
  });
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 */
export async function softDeleteHospital(organisationId, hospitalId) {
  if (!organisationId?.trim() || !hospitalId?.trim()) throw new Error("organisationId and hospitalId required");
  await assertManagementWrite();
  await assertSameOrganisation(organisationId);
  const ref = doc(db, HOSPITALS_COLLECTION, hospitalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Hospital not found.");
  const cur = snap.data() ?? {};
  if (cur.organisationId !== organisationId) throw new Error("403 Forbidden: organisation scope mismatch");
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");
  await updateDoc(ref, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_DELETE",
    entityType: "hospital",
    entityId: hospitalId,
    organisationId,
  });
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 * @param {string} wardId
 * @param {{ name: string }} data
 */
export async function updateWard(organisationId, hospitalId, wardId, data) {
  if (!organisationId?.trim() || !hospitalId?.trim() || !wardId?.trim()) {
    throw new Error("organisationId, hospitalId, and wardId required");
  }
  if (!data || typeof data !== "object") throw new Error("Invalid ward update");
  const nameTrim = typeof data.name === "string" ? data.name.trim() : "";
  if (!nameTrim) throw new Error("Ward name required");
  await assertManagementWrite();
  await assertSameOrganisation(organisationId);
  const ref = doc(db, WARDS_COLLECTION, wardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ward not found.");
  const cur = snap.data() ?? {};
  if (cur.organisationId !== organisationId || cur.hospitalId !== hospitalId) {
    throw new Error("403 Forbidden: scope mismatch");
  }
  if (cur.isDeleted === true) throw new Error("Ward has been deleted.");
  const uid = auth.currentUser?.uid ?? null;
  const patch = {
    name: nameTrim,
    updatedAt: serverTimestamp(),
    ...(uid ? { updatedBy: uid } : {}),
  };
  const patchWardType = normalizeWardType(data?.type ?? data?.wardType);
  if (!patchWardType) throw new Error("Ward type required");
  patch.type = patchWardType;
  patch.wardType = patchWardType;
  await updateDoc(ref, patch);
  void logManagementAudit({
    action: "ORG_ADMIN_UPDATE",
    entityType: "ward",
    entityId: wardId,
    organisationId,
  });
}

/**
 * @param {string} organisationId
 * @param {string} hospitalId
 * @param {string} wardId
 */
export async function softDeleteWard(organisationId, hospitalId, wardId) {
  if (!organisationId?.trim() || !hospitalId?.trim() || !wardId?.trim()) {
    throw new Error("organisationId, hospitalId, and wardId required");
  }
  await assertManagementWrite();
  await assertSameOrganisation(organisationId);
  const ref = doc(db, WARDS_COLLECTION, wardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Ward not found.");
  const cur = snap.data() ?? {};
  if (cur.organisationId !== organisationId || cur.hospitalId !== hospitalId) {
    throw new Error("403 Forbidden: scope mismatch");
  }
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");
  await updateDoc(ref, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_DELETE",
    entityType: "ward",
    entityId: wardId,
    organisationId,
  });
}

/**
 * Single ward for clinical context (e.g. CPA AI). Tenant-scoped.
 * @param {string} organisationId
 * @param {string} wardId
 * @returns {Promise<{ id: string, name: string, hospitalId: string, organisationId: string, wardType: string } | null>}
 */
export async function getWardById(organisationId, wardId) {
  if (!organisationId?.trim() || !wardId?.trim()) return null;
  await assertSameOrganisation(organisationId);
  const ref = doc(db, WARDS_COLLECTION, wardId.trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const x = snap.data() ?? {};
  if (x.organisationId !== organisationId) return null;
  if (x.isDeleted === true) return null;
  const wt = typeof x.wardType === "string" ? x.wardType.trim() : "";
  return {
    id: snap.id,
    name: typeof x.name === "string" ? x.name : "",
    hospitalId: x.hospitalId ?? "",
    organisationId: x.organisationId ?? "",
    wardType: wt || "",
  };
}

async function assertSameOrganisation(organisationId) {
  if (import.meta.env.DEV) return;
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (await isPlatformAdmin(user.uid)) return;
  const profile = await getCurrentUserProfile(user.uid);
  const roleUpper = String(profile?.role || profile?.systemRole || "").toUpperCase();
  if (roleUpper === "SUPER_ADMIN" || roleUpper === "GLOBAL_ADMIN") return;
  if (profile?.isGlobalAdmin === true) return;
  const { organisationId: ctxOrg } = await getUserContext();
  if (ctxOrg !== organisationId) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
}

/**
 * All hospitals (platform admin only). For management filters.
 * @returns {Promise<Array<{ id: string, name: string, organisationId: string }>>}
 */
export async function listAllHospitals() {
  const user = auth.currentUser;
  if (!user && import.meta.env.DEV) {
    const snap = await getDocs(query(collection(db, HOSPITALS_COLLECTION), limit(1000)));
    return mapHospitalDocs(snap?.docs ?? []);
  }
  if (!user) throw new Error("Not authenticated");
  if (!(await isPlatformAdmin(user.uid))) {
    throw new Error("403 Forbidden: platform admin only");
  }
  const snap = await getDocs(query(collection(db, HOSPITALS_COLLECTION), limit(1000)));
  return mapHospitalDocs(snap?.docs ?? []);
}

/**
 * All wards (platform admin only), optional filters.
 * @param {{ organisationId?: string | null, hospitalId?: string | null }} filters
 */
export async function listAllWards(filters = {}) {
  const user = auth.currentUser;
  if (!user && import.meta.env.DEV) {
    const orgId = filters.organisationId != null ? String(filters.organisationId).trim() : "";
    const hospId = filters.hospitalId != null ? String(filters.hospitalId).trim() : "";
    let rows;
    if (orgId) {
      const qy = query(collection(db, WARDS_COLLECTION), where("organisationId", "==", orgId), limit(2000));
      const snap = await getDocs(qy);
      rows = mapWardDocs(snap?.docs ?? []);
    } else {
      const snap = await getDocs(query(collection(db, WARDS_COLLECTION), limit(2000)));
      rows = mapWardDocs(snap?.docs ?? []);
    }
    if (hospId) rows = rows.filter((w) => w.hospitalId === hospId);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return rows;
  }
  if (!user) throw new Error("Not authenticated");
  if (!(await isPlatformAdmin(user.uid))) {
    throw new Error("403 Forbidden: platform admin only");
  }
  const orgId = filters.organisationId != null ? String(filters.organisationId).trim() : "";
  const hospId = filters.hospitalId != null ? String(filters.hospitalId).trim() : "";
  let rows;
  if (orgId) {
    const qy = query(collection(db, WARDS_COLLECTION), where("organisationId", "==", orgId), limit(2000));
    const snap = await getDocs(qy);
    rows = mapWardDocs(snap?.docs ?? []);
  } else {
    const snap = await getDocs(query(collection(db, WARDS_COLLECTION), limit(2000)));
    rows = mapWardDocs(snap?.docs ?? []);
  }
  if (hospId) {
    rows = rows.filter((w) => w.hospitalId === hospId);
  }
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return rows;
}
