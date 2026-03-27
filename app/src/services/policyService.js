import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEvent } from "./auditService";

const POLICIES_COLLECTION = "policies";
const POLICY_TYPES = ["MEDICATION", "SAFEGUARDING", "BEHAVIOUR", "STOMP", "GENERAL"];
const POLICY_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];

function normalizePolicyType(type) {
  const t = String(type ?? "GENERAL").trim().toUpperCase();
  return POLICY_TYPES.includes(t) ? t : "GENERAL";
}

function normalizePolicyStatus(status) {
  const s = String(status ?? "DRAFT").trim().toUpperCase();
  return POLICY_STATUSES.includes(s) ? s : "DRAFT";
}

function requiredOrgId(organisationId) {
  const orgId = String(organisationId ?? "").trim();
  if (!orgId) throw new Error("organisationId is required");
  return orgId;
}

function requiredTitle(title) {
  const value = String(title ?? "").trim();
  if (!value) throw new Error("title is required");
  return value;
}

/**
 * @param {{ organisationId: string, title: string, type?: string, content?: string, user?: { uid?: string } }} params
 */
export async function createPolicy({ organisationId, title, type, content, user }) {
  const orgId = requiredOrgId(organisationId);
  const createdBy = String(user?.uid ?? "").trim() || null;
  const payload = {
    organisationId: orgId,
    title: requiredTitle(title),
    type: normalizePolicyType(type),
    content: String(content ?? "").trim(),
    version: 1,
    status: "DRAFT",
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const created = await addDoc(collection(db, POLICIES_COLLECTION), payload);
  await logAuditEvent("POLICY_CREATE", {
    organisationId: orgId,
    policyId: created.id,
    type: payload.type,
    status: payload.status,
  });
  return { id: created.id };
}

export async function listPolicies(organisationId) {
  const orgId = requiredOrgId(organisationId);
  const q = query(
    collection(db, POLICIES_COLLECTION),
    where("organisationId", "==", orgId),
    orderBy("updatedAt", "desc"),
    limit(500)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      organisationId: x.organisationId ?? orgId,
      title: x.title ?? "",
      type: normalizePolicyType(x.type),
      content: x.content ?? "",
      version: typeof x.version === "number" ? x.version : 1,
      status: normalizePolicyStatus(x.status),
      createdBy: x.createdBy ?? null,
      createdAt: x.createdAt ?? null,
      updatedAt: x.updatedAt ?? null,
    };
  });
}

export async function getPolicy(policyId) {
  const id = String(policyId ?? "").trim();
  if (!id) throw new Error("policyId is required");
  const ref = doc(db, POLICIES_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Policy not found");
  const x = snap.data?.() ?? {};
  return {
    id: snap.id,
    organisationId: x.organisationId ?? "",
    title: x.title ?? "",
    type: normalizePolicyType(x.type),
    content: x.content ?? "",
    version: typeof x.version === "number" ? x.version : 1,
    status: normalizePolicyStatus(x.status),
    createdBy: x.createdBy ?? null,
    createdAt: x.createdAt ?? null,
    updatedAt: x.updatedAt ?? null,
  };
}

export async function updatePolicy(policyId, updates, user) {
  const existing = await getPolicy(policyId);
  const next = {
    title: updates?.title != null ? requiredTitle(updates.title) : existing.title,
    type: updates?.type != null ? normalizePolicyType(updates.type) : existing.type,
    content: updates?.content != null ? String(updates.content).trim() : existing.content,
    status: updates?.status != null ? normalizePolicyStatus(updates.status) : existing.status,
  };
  const ref = doc(db, POLICIES_COLLECTION, existing.id);
  const payload = {
    ...next,
    version: (existing.version ?? 1) + 1,
    updatedAt: serverTimestamp(),
    updatedBy: String(user?.uid ?? "").trim() || null,
  };
  await updateDoc(ref, payload);
  await logAuditEvent("POLICY_UPDATE", {
    organisationId: existing.organisationId,
    policyId: existing.id,
    version: payload.version,
    status: payload.status,
  });
}

export async function archivePolicy(policyId, user) {
  const existing = await getPolicy(policyId);
  const ref = doc(db, POLICIES_COLLECTION, existing.id);
  const payload = {
    status: "ARCHIVED",
    version: (existing.version ?? 1) + 1,
    updatedAt: serverTimestamp(),
    updatedBy: String(user?.uid ?? "").trim() || null,
  };
  await updateDoc(ref, payload);
  await logAuditEvent("POLICY_ARCHIVE", {
    organisationId: existing.organisationId,
    policyId: existing.id,
    version: payload.version,
  });
}

export const POLICY_OPTIONS = POLICY_TYPES;
export const POLICY_STATUS_OPTIONS = POLICY_STATUSES;
