import { collection, getDocs, query, where, limit, addDoc, doc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { createNotification, NOTIFICATION_TYPES } from "./notificationService";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";

/**
 * Compliance service – all queries scoped by organisationId.
 * See docs/data-model.md for schema.
 *
 * @param {string} organisationId - Current tenant (from OrganisationContext). Required for all calls.
 */

/**
 * Fetch compliance domains for an organisation.
 * @param {string} organisationId
 * @returns {Promise<Array<{ id: string, organisationId: string, domainKey: string, name: string, compliancePercent: number, readinessLevel: string, sortOrder: number }>>}
 */
export async function fetchComplianceDomains(organisationId, serviceId) {
  if (!organisationId?.trim()) return [];
  const ref = collection(db, "compliance_domains");
  const constraints = [where("organisationId", "==", organisationId)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const list = docs.map((docSnap) => {
    const d = docSnap?.data?.() ?? {};
    return {
      id: docSnap?.id ?? "",
      organisationId: d.organisationId ?? organisationId,
      serviceId: d.serviceId ?? null,
      domainKey: d.domainKey ?? docSnap?.id ?? "",
      name: d.name ?? "",
      compliancePercent: typeof d.compliancePercent === "number" ? d.compliancePercent : 0,
      readinessLevel: d.readinessLevel ?? "Not started",
      sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
    };
  });
  list.sort((a, b) => a.sortOrder - b.sortOrder);
  return list;
}

/**
 * Fetch compliance actions for an organisation. Optional filter by status; limit applied.
 * @param {string} organisationId
 * @param {{ status?: string, limitCount?: number }} options
 * @returns {Promise<Array<{ id: string, organisationId: string, domainId?: string, title: string, priority: string, riskLevel: string, status: string, dueDate?: import("firebase/firestore").Timestamp, createdAt?: import("firebase/firestore").Timestamp }>>}
 */
export async function fetchComplianceActions(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const { status, limitCount = 50, serviceId } = options;
  const ref = collection(db, "compliance_actions");
  const constraints = [where("organisationId", "==", organisationId), limit(limitCount)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  if (status) constraints.push(where("status", "==", status));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const list = docs.map((docSnap) => {
    const d = docSnap?.data?.() ?? {};
    return {
      id: docSnap?.id ?? "",
      organisationId: d.organisationId ?? organisationId,
      serviceId: d.serviceId ?? null,
      domainId: d.domainId ?? null,
      title: d.title ?? "",
      description: d.description ?? "",
      priority: d.priority ?? "medium",
      riskLevel: d.riskLevel ?? "medium",
      status: d.status ?? "open",
      assignedTo: d.assignedTo ?? null,
      dueDate: d.dueDate ?? null,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  });
  list.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
  return list;
}

/**
 * Fetch high-priority (urgent) open actions for an organisation.
 * @param {string} organisationId
 * @param {number} max
 * @returns {Promise<Array<{ id: string, title: string, priority: string, riskLevel: string, status: string, dueDate?: import("firebase/firestore").Timestamp }>>}
 */
export async function fetchUrgentComplianceActions(organisationId, max = 10, serviceId) {
  if (!organisationId?.trim()) return [];
  const ref = collection(db, "compliance_actions");
  const constraints = [
    where("organisationId", "==", organisationId),
    where("status", "==", "open"),
    where("priority", "==", "high"),
    limit(max),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((docSnap) => {
    const d = docSnap?.data?.() ?? {};
    return {
      id: docSnap?.id ?? "",
      title: d.title ?? "",
      priority: d.priority ?? "high",
      riskLevel: d.riskLevel ?? "medium",
      status: d.status ?? "open",
      dueDate: d.dueDate ?? null,
    };
  });
}

/**
 * Fetch organisation compliance stats (one doc per org).
 * @param {string} organisationId
 * @returns {Promise<{ overallComplianceScore: number, totalDomains: number, openActionCount: number, highRiskActionCount: number, lastUpdated?: import("firebase/firestore").Timestamp } | null>}
 */
export async function fetchComplianceStats(organisationId, serviceId) {
  if (!organisationId?.trim()) return null;
  const ref = collection(db, "compliance_stats");
  const constraints = [where("organisationId", "==", organisationId), limit(1)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docSnap = snapshot?.docs?.[0];
  if (!docSnap?.exists?.()) return null;
  const d = docSnap?.data?.() ?? {};
  return {
    overallComplianceScore: typeof d.overallComplianceScore === "number" ? d.overallComplianceScore : 0,
    totalDomains: typeof d.totalDomains === "number" ? d.totalDomains : 0,
    openActionCount: typeof d.openActionCount === "number" ? d.openActionCount : 0,
    highRiskActionCount: typeof d.highRiskActionCount === "number" ? d.highRiskActionCount : 0,
    lastUpdated: d.lastUpdated ?? null,
  };
}

/**
 * @typedef {{ organisationId: string, userId: string, userRole: string }} AuditContext
 */

/**
 * Create a compliance action and log action_created. Non-blocking audit.
 * @param {string} organisationId
 * @param {{ title: string, description?: string, domainId?: string, priority?: string, riskLevel?: string, assignedTo?: string, dueDate?: import("firebase/firestore").Timestamp }} data
 * @param {AuditContext} [auditContext]
 * @param {string | null} [serviceId] Optional. Service scope.
 * @returns {Promise<{ id: string }>}
 */
export async function createComplianceAction(organisationId, data, auditContext, serviceId) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const ctx = await getUserContext();
  const tenant = tenantFieldsFromContext({
    organisationId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);
  const ref = collection(db, "compliance_actions");
  const docData = {
    organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    serviceId: serviceId ?? null,
    title: data.title ?? "",
    description: data.description ?? "",
    domainId: data.domainId ?? null,
    priority: data.priority ?? "medium",
    riskLevel: data.riskLevel ?? "medium",
    status: "open",
    assignedTo: data.assignedTo ?? null,
    dueDate: data.dueDate ?? null,
    createdAt: serverTimestamp(),
  };
  const snap = await addDoc(ref, docData);
  await incrementComplianceStatsOnActionCreate(organisationId, docData.riskLevel === "high", serviceId);
  if (auditContext?.organisationId && auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      serviceId: serviceId ?? undefined,
      action: "action_created",
      entityType: "compliance_action",
      entityId: snap.id,
      entityName: docData.title,
      previousValue: undefined,
      newValue: docData,
    });
  }
  if (docData.riskLevel === "high") {
    createNotification(
      organisationId,
      {
        type: NOTIFICATION_TYPES.HIGH_RISK_ACTION,
        title: "High severity action created",
        message: docData.title,
        severity: "high",
        relatedEntityType: "compliance_action",
        relatedEntityId: snap.id,
      },
      auditContext,
      serviceId
    ).catch(() => {});
  }
  return { id: snap.id };
}

/**
 * Update a compliance action; log action_updated and status_changed when status changes. Non-blocking audit.
 * When status becomes "complete", decrements compliance_stats counters.
 * @param {string} organisationId
 * @param {string} actionId
 * @param {{ status?: string, title?: string, description?: string, priority?: string, riskLevel?: string, assignedTo?: string, dueDate?: import("firebase/firestore").Timestamp }} updates
 * @param {AuditContext} [auditContext]
 */
export async function updateComplianceAction(organisationId, actionId, updates, auditContext) {
  if (!organisationId?.trim() || !actionId) throw new Error("organisationId and actionId required");
  const actionRef = doc(db, "compliance_actions", actionId);
  const existing = await getDoc(actionRef);
  if (!existing || typeof existing.exists !== "function" || !existing.exists()) throw new Error("Compliance action not found");
  const prev = existing.data?.() ?? {};
  const next = { ...prev, ...updates };
  const wasOpen = (prev.status === "open" || prev.status === "in-progress");
  const wasHighRisk = prev.riskLevel === "high";
  const updatesWithTimestamp = { ...updates, updatedAt: serverTimestamp() };
  await updateDoc(actionRef, updatesWithTimestamp);
  const serviceIdForStats = prev.serviceId ?? null;
  if (updates.status === "complete" && wasOpen) {
    await decrementComplianceStatsOnComplete(organisationId, wasHighRisk, serviceIdForStats);
  }
  if (auditContext?.organisationId && auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      serviceId: serviceIdForStats ?? undefined,
      action: "action_updated",
      entityType: "compliance_action",
      entityId: actionId,
      entityName: next.title ?? prev.title ?? "",
      previousValue: prev,
      newValue: next,
    });
    if (updates.status != null && prev.status !== updates.status) {
      logAuditEventNonBlocking({
        ...auditContext,
        serviceId: serviceIdForStats ?? undefined,
        action: "status_changed",
        entityType: "compliance_action",
        entityId: actionId,
        entityName: next.title ?? prev.title ?? "",
        previousValue: prev.status,
        newValue: updates.status,
      });
    }
  }
}

/**
 * Set compliance action status to complete and log status_changed. Decrements stats. Non-blocking audit.
 */
export async function completeComplianceAction(organisationId, actionId, auditContext) {
  return updateComplianceAction(organisationId, actionId, { status: "complete" }, auditContext);
}

/**
 * Get compliance_stats doc ref for an organisation (and optional service). Creates doc with 0 counts if missing.
 * @param {string} organisationId
 * @param {string | null} [serviceId]
 * @returns {Promise<import("firebase/firestore").DocumentReference | null>}
 */
async function getOrCreateComplianceStatsRef(organisationId, serviceId) {
  if (!organisationId?.trim()) return null;
  const ref = collection(db, "compliance_stats");
  const constraints = [where("organisationId", "==", organisationId), limit(1)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const firstDoc = snapshot?.docs?.[0];
  if (firstDoc?.ref) return firstDoc.ref;
  const ctx = await getUserContext();
  const tenant = tenantFieldsFromContext({
    organisationId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);
  const docData = {
    organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    overallComplianceScore: 0,
    totalDomains: 0,
    openActionCount: 0,
    highRiskActionCount: 0,
    lastUpdated: serverTimestamp(),
  };
  if (serviceId) docData.serviceId = serviceId;
  const newRef = await addDoc(ref, docData);
  return newRef;
}

/**
 * Increment compliance_stats when a new action is created (open + high-risk if applicable).
 */
async function incrementComplianceStatsOnActionCreate(organisationId, isHighRisk, serviceId) {
  const statsRef = await getOrCreateComplianceStatsRef(organisationId, serviceId ?? null);
  if (!statsRef) return;
  const updates = {
    openActionCount: increment(1),
    lastUpdated: serverTimestamp(),
  };
  if (isHighRisk) updates.highRiskActionCount = increment(1);
  await updateDoc(statsRef, updates);
}

/**
 * Decrement compliance_stats when an action is completed.
 */
async function decrementComplianceStatsOnComplete(organisationId, wasHighRisk, serviceId) {
  if (!organisationId?.trim()) return;
  const ref = collection(db, "compliance_stats");
  const constraints = [where("organisationId", "==", organisationId), limit(1)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const statsDoc = snapshot?.docs?.[0];
  if (!statsDoc?.exists?.() || !statsDoc?.ref) return;
  const updates = {
    openActionCount: increment(-1),
    lastUpdated: serverTimestamp(),
  };
  if (wasHighRisk) updates.highRiskActionCount = increment(-1);
  await updateDoc(statsDoc.ref, updates);
}

/**
 * Update a compliance domain's score and log score_updated. Non-blocking audit.
 * @param {string} organisationId
 * @param {string} domainId
 * @param {{ compliancePercent?: number, readinessLevel?: string }} updates
 * @param {AuditContext} [auditContext]
 */
export async function updateComplianceDomainScore(organisationId, domainId, updates, auditContext) {
  if (!organisationId?.trim() || !domainId) throw new Error("organisationId and domainId required");
  const domainRef = doc(db, "compliance_domains", domainId);
  const existing = await getDoc(domainRef);
  if (!existing || typeof existing.exists !== "function" || !existing.exists()) throw new Error("Compliance domain not found");
  const prev = existing.data?.() ?? {};
  const next = { ...prev, ...updates };
  await updateDoc(domainRef, updates);
  if (auditContext?.organisationId && auditContext?.userId) {
    const prevScore = prev.compliancePercent;
    const newScore = updates.compliancePercent ?? prev.compliancePercent;
    if (prevScore !== newScore) {
      logAuditEventNonBlocking({
        ...auditContext,
        action: "score_updated",
        entityType: "compliance_domain",
        entityId: domainId,
        entityName: prev.name ?? next.name ?? domainId,
        previousValue: prevScore,
        newValue: newScore,
      });
    }
  }
}
