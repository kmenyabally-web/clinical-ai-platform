/**
 * Hospital / ward hierarchy (Firestore `hospitals/`, `wards/`).
 * All records are scoped by organisationId.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { getUserContext } from "./authService";
import { isPlatformAdmin } from "./platformAdminService";
import { assertTenantContext, TENANT_UNSCOPED_WARD } from "../utils/tenantContext";
import { logAuditEvent } from "./auditService";

const HOSPITALS_COLLECTION = "hospitals";
const WARDS_COLLECTION = "wards";

/**
 * @param {string} organisationId
 * @returns {Promise<Array<{ id: string, name: string, organisationId: string }>>}
 */
export async function listHospitals(organisationId) {
  if (!organisationId?.trim()) return [];
  await assertSameOrganisation(organisationId);
  const q = query(
    collection(db, HOSPITALS_COLLECTION),
    where("organisationId", "==", organisationId),
    orderBy("name")
  );
  try {
    const snap = await getDocs(q);
    return mapHospitalDocs(snap?.docs ?? []);
  } catch {
    const q2 = query(collection(db, HOSPITALS_COLLECTION), where("organisationId", "==", organisationId));
    const snap = await getDocs(q2);
    const rows = mapHospitalDocs(snap?.docs ?? []);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return rows;
  }
}

function mapHospitalDocs(docs) {
  return docs.map((d) => {
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
    return mapWardDocs(snap?.docs ?? []);
  } catch {
    const q2 = query(
      collection(db, WARDS_COLLECTION),
      where("organisationId", "==", organisationId),
      where("hospitalId", "==", hospitalId)
    );
    const snap = await getDocs(q2);
    const rows = mapWardDocs(snap?.docs ?? []);
    rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return rows;
  }
}

function mapWardDocs(docs) {
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      name: typeof x.name === "string" ? x.name : "",
      hospitalId: x.hospitalId ?? "",
      organisationId: x.organisationId ?? "",
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
    wardId: TENANT_UNSCOPED_WARD,
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
    wardId: TENANT_UNSCOPED_WARD,
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
  await assertSameOrganisation(organisationId);
  assertTenantContext(organisationId, hospitalId);
  const ref = doc(collection(db, WARDS_COLLECTION));
  await setDoc(ref, {
    name: data.name.trim(),
    hospitalId,
    organisationId,
    wardId: ref.id,
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

async function assertSameOrganisation(organisationId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (await isPlatformAdmin(user.uid)) return;
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
