import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { checkServiceLimit } from "./billingService";

const SERVICES_COLLECTION = "services";

/**
 * Fetch all services for an organisation. Optionally filter by managerId for RBAC (service managers see only their service).
 * @param {string} organisationId
 * @param {{ managerId?: string }} options - Pass managerId to restrict to services assigned to that user.
 * @returns {Promise<Array<{ id: string, organisationId: string, serviceName: string, serviceType: string, location: string, managerId: string | null, createdAt: unknown }>>}
 */
export async function fetchServices(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const { managerId } = options;
  const ref = collection(db, SERVICES_COLLECTION);
  const constraints = [where("organisationId", "==", organisationId)];
  if (managerId) constraints.push(where("managerId", "==", managerId));
  constraints.push(orderBy("serviceName", "asc"), limit(100));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      organisationId: x.organisationId ?? organisationId,
      serviceName: x.serviceName ?? "",
      serviceType: x.serviceType ?? "",
      location: x.location ?? "",
      managerId: x.managerId ?? null,
      createdAt: x.createdAt ?? null,
    };
  });
}

/**
 * Fetch a single service by ID.
 * @param {string} serviceId
 * @returns {Promise<{ id: string, organisationId: string, serviceName: string, serviceType: string, location: string, managerId: string | null, createdAt: unknown } | null>}
 */
export async function getService(serviceId) {
  if (!serviceId) return null;
  const ref = doc(db, SERVICES_COLLECTION, serviceId);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap || typeof snap.exists !== "function" || !snap.exists()) return null;
  const x = snap.data?.() ?? {};
  return {
    id: snap.id ?? serviceId,
    organisationId: x.organisationId ?? "",
    serviceName: x.serviceName ?? "",
    serviceType: x.serviceType ?? "",
    location: x.location ?? "",
    managerId: x.managerId ?? null,
    createdAt: x.createdAt ?? null,
  };
}

/**
 * Create a service. Admins and Managers only (enforce in UI).
 * @param {string} organisationId
 * @param {{ serviceName: string, serviceType?: string, location?: string, managerId?: string }} data
 * @param {{ organisationId: string, userId: string, userRole: string }} [auditContext]
 * @returns {Promise<{ id: string }>}
 */
export async function createService(organisationId, data, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const limitCheck = await checkServiceLimit(organisationId);
  if (!limitCheck.allowed) {
    const max = limitCheck.max ?? "?";
    throw new Error(
      `Service limit reached. Your plan (${limitCheck.planName}) allows ${max} service(s). Upgrade to add more.`
    );
  }
  const ref = collection(db, SERVICES_COLLECTION);
  const docData = {
    organisationId,
    serviceName: (data.serviceName ?? "").trim(),
    serviceType: (data.serviceType ?? "").trim(),
    location: (data.location ?? "").trim(),
    managerId: data.managerId ?? null,
    createdAt: serverTimestamp(),
  };
  const snap = await addDoc(ref, docData);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      serviceId: snap.id,
      action: "service_created",
      entityType: "service",
      entityId: snap.id,
      entityName: docData.serviceName,
      previousValue: null,
      newValue: docData,
    });
  }
  return { id: snap.id };
}

/**
 * Update a service (e.g. assign manager). Admins and Managers only (enforce in UI).
 * @param {string} organisationId
 * @param {string} serviceId
 * @param {{ serviceName?: string, serviceType?: string, location?: string, managerId?: string }} updates
 * @param {{ organisationId: string, userId: string, userRole: string }} [auditContext]
 */
export async function updateService(organisationId, serviceId, updates, auditContext) {
  if (!organisationId?.trim() || !serviceId) throw new Error("organisationId and serviceId required");
  const ref = doc(db, SERVICES_COLLECTION, serviceId);
  if (!ref) throw new Error("Invalid service reference");
  const existing = await getDoc(ref);
  if (!existing || typeof existing.exists !== "function" || !existing.exists()) throw new Error("Service not found");
  const prev = existing.data?.() ?? {};
  const payload = {};
  if (updates.serviceName !== undefined) payload.serviceName = String(updates.serviceName).trim();
  if (updates.serviceType !== undefined) payload.serviceType = String(updates.serviceType).trim();
  if (updates.location !== undefined) payload.location = String(updates.location).trim();
  if (updates.managerId !== undefined) payload.managerId = updates.managerId || null;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(ref, payload);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      serviceId,
      action: "service_updated",
      entityType: "service",
      entityId: serviceId,
      entityName: prev.serviceName ?? "",
      previousValue: prev,
      newValue: { ...prev, ...payload },
    });
  }
}
