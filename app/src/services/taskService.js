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
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { orgPatientDocumentRef } from "../utils/tenantCollections";
import { logAuditEvent } from "./auditService";

const TASKS_COLLECTION = "tasks";

export const TASK_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
};

export const TASK_SHIFTS = ["morning", "afternoon", "night"];

function requireOrgId(organisationId) {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");
  return org;
}

function normalizeStatus(s) {
  const x = String(s ?? "pending").trim().toLowerCase();
  return x === "completed" ? TASK_STATUS.COMPLETED : TASK_STATUS.PENDING;
}

function normalizeShift(s) {
  const x = String(s ?? "morning").trim().toLowerCase();
  return TASK_SHIFTS.includes(x) ? x : "morning";
}

/** UK-local heuristic: morning 06–14, afternoon 14–22, night 22–06 */
export function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "afternoon";
  return "night";
}

async function assertPatientInOrganisation(patientId, organisationId) {
  const pid = String(patientId ?? "").trim();
  if (!pid) throw new Error("patientId is required");
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");
  const ref = orgPatientDocumentRef(db, org, pid);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found");
  const patientOrgId = String(snap.data()?.organisationId ?? "").trim();
  if (patientOrgId !== org) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  return pid;
}

function mapTaskDoc(d, organisationId, patientId) {
  const x = d.data() ?? {};
  return {
    id: d.id,
    organisationId: x.organisationId ?? organisationId,
    patientId: x.patientId ?? patientId,
    title: x.title ?? "",
    description: typeof x.description === "string" ? x.description : "",
    status: normalizeStatus(x.status),
    assignedTo: x.assignedTo ?? null,
    shift: normalizeShift(x.shift),
    dueAt: x.dueAt ?? null,
    completedAt: x.completedAt ?? null,
    completedBy: x.completedBy ?? null,
    createdAt: x.createdAt ?? null,
    createdBy: x.createdBy ?? null,
  };
}

/**
 * @param {object} data
 * @param {{ uid: string, organisationId: string }} context
 */
export async function createTask(data, context) {
  const organisationId = requireOrgId(data?.organisationId ?? context?.organisationId);
  const uid = String(context?.uid ?? auth.currentUser?.uid ?? "").trim();
  if (!uid) throw new Error("Authentication required");

  const patientId = await assertPatientInOrganisation(data?.patientId, organisationId);
  const title = String(data?.title ?? "").trim();
  if (!title) throw new Error("title is required");

  const description = String(data?.description ?? "").trim();
  const assignedTo = String(data?.assignedTo ?? "").trim() || null;
  const shift = normalizeShift(data?.shift);

  const ctx = await getUserContext();

  const docRef = await addDoc(collection(db, TASKS_COLLECTION), {
    organisationId,
    patientId,
    title,
    description,
    status: TASK_STATUS.PENDING,
    assignedTo,
    shift,
    dueAt: serverTimestamp(),
    completedAt: null,
    completedBy: null,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });

  await logAuditEvent({
    action: "TASK_CREATED",
    organisationId,
    hospitalId: ctx?.hospitalId ?? null,
    wardId: ctx?.wardId ?? null,
    patientId,
    metadata: { entityId: docRef.id, title, shift },
  });

  return docRef;
}

/**
 * @param {string} taskId
 * @param {{ uid: string, organisationId: string }} context
 */
export async function completeTask(taskId, context) {
  const id = String(taskId ?? "").trim();
  if (!id) throw new Error("taskId is required");
  const organisationId = requireOrgId(context?.organisationId);
  const uid = String(context?.uid ?? auth.currentUser?.uid ?? "").trim();
  if (!uid) throw new Error("Authentication required");

  const ctx = await getUserContext();
  if (String(ctx?.organisationId ?? "").trim() !== organisationId) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }

  const ref = doc(db, TASKS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Task not found");
  const data = snap.data() ?? {};
  if (String(data.organisationId ?? "").trim() !== organisationId) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  if (normalizeStatus(data.status) !== TASK_STATUS.PENDING) {
    throw new Error("Task is already completed");
  }

  await updateDoc(ref, {
    status: TASK_STATUS.COMPLETED,
    completedAt: serverTimestamp(),
    completedBy: uid,
  });

  await logAuditEvent({
    action: "TASK_COMPLETED",
    organisationId,
    hospitalId: ctx?.hospitalId ?? null,
    wardId: ctx?.wardId ?? null,
    patientId: data.patientId ?? null,
    metadata: { entityId: id, title: data.title ?? "" },
  });
}

/**
 * @param {string} patientId
 * @param {string} organisationId
 */
export async function getTasksByPatient(patientId, organisationId) {
  const org = requireOrgId(organisationId);
  const pid = await assertPatientInOrganisation(patientId, org);

  const q = query(
    collection(db, TASKS_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("dueAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => mapTaskDoc(d, org, pid));
}

/**
 * All tasks for an organisation (carer dashboards, managers).
 * @param {string} organisationId
 * @param {{ limitCount?: number }} [options]
 */
export async function listTasksForOrganisation(organisationId, options = {}) {
  const org = requireOrgId(organisationId);
  const ctx = await getUserContext();
  if (String(ctx?.organisationId ?? "").trim() !== org) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  const cap = Math.min(200, Math.max(20, options.limitCount ?? 100));
  const q = query(
    collection(db, TASKS_COLLECTION),
    where("organisationId", "==", org),
    orderBy("dueAt", "desc"),
    limit(cap)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const pid = String(d.data()?.patientId ?? "").trim();
    return mapTaskDoc(d, org, pid);
  });
}

/**
 * @param {string} patientId
 * @param {{ organisationId?: string, limitCount?: number }} [options]
 */
export async function listTasksForPatient(patientId, options = {}) {
  const ctx = await getUserContext();
  const organisationId = requireOrgId(options.organisationId ?? ctx?.organisationId);
  return getTasksByPatient(patientId, organisationId);
}
