import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";
import { getOverdueActions, detectMissingEvidence, calculateReadinessScore } from "./readinessService";

const NOTIFICATIONS_COLLECTION = "notifications";

/** Notification type constants. */
export const NOTIFICATION_TYPES = {
  ACTION_OVERDUE: "ACTION_OVERDUE",
  HIGH_RISK_ACTION: "HIGH_RISK_ACTION",
  MISSING_EVIDENCE: "MISSING_EVIDENCE",
  READINESS_DROP: "READINESS_DROP",
  INSPECTION_HIGH_RISK: "INSPECTION_HIGH_RISK",
};

const READINESS_DROP_THRESHOLD = 60;

/**
 * Create a notification and log NOTIFICATION_CREATED.
 * @param {string} organisationId
 * @param {{ type: string, title: string, message: string, severity?: string, relatedEntityType?: string, relatedEntityId?: string }} payload
 * @param {{ organisationId: string, userId: string, userRole: string } | undefined} auditContext
 * @param {string | null} [serviceId] Optional. Service scope.
 * @returns {Promise<{ id: string }>}
 */
export async function createNotification(organisationId, payload, auditContext, serviceId) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const ctx = await getUserContext();
  const tenant = tenantFieldsFromContext({
    organisationId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);
  const ref = collection(db, NOTIFICATIONS_COLLECTION);
  const docData = {
    organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    serviceId: serviceId ?? null,
    type: payload.type ?? "",
    title: payload.title ?? "",
    message: payload.message ?? "",
    severity: payload.severity ?? "medium",
    relatedEntityType: payload.relatedEntityType ?? null,
    relatedEntityId: payload.relatedEntityId ?? null,
    createdAt: serverTimestamp(),
    read: false,
  };
  const snap = await addDoc(ref, docData);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      serviceId: serviceId ?? undefined,
      userRole: auditContext.userRole ?? "",
      action: "NOTIFICATION_CREATED",
      entityType: "NOTIFICATION",
      entityId: snap.id,
      entityName: payload.title ?? "",
      previousValue: null,
      newValue: { type: payload.type, severity: docData.severity },
    });
  }
  return { id: snap.id };
}

/**
 * Mark a notification as read (resolved). RBAC must be enforced by caller (Admin/Manager only).
 * @param {string} organisationId
 * @param {string} notificationId
 * @returns {Promise<void>}
 */
export async function markNotificationRead(organisationId, notificationId) {
  if (!organisationId?.trim() || !notificationId) return;
  const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
  if (!ref) return;
  await updateDoc(ref, { read: true });
}

/**
 * Fetch notifications for an organisation. Uses compliance_stats / existing data; single query.
 * @param {string} organisationId
 * @param {{ limitCount?: number, unreadOnly?: boolean, type?: string, serviceId?: string | null }} options
 * @returns {Promise<Array<{ id: string, organisationId: string, type: string, title: string, message: string, severity: string, relatedEntityType: string | null, relatedEntityId: string | null, createdAt: unknown, read: boolean }>>}
 */
export async function fetchNotifications(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const { limitCount = 50, unreadOnly = false, type, serviceId } = options;
  const ref = collection(db, NOTIFICATIONS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  if (unreadOnly) constraints.push(where("read", "==", false));
  if (type) constraints.push(where("type", "==", type));
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      organisationId: x.organisationId ?? organisationId,
      type: x.type ?? "",
      title: x.title ?? "",
      message: x.message ?? "",
      severity: x.severity ?? "medium",
      relatedEntityType: x.relatedEntityType ?? null,
      relatedEntityId: x.relatedEntityId ?? null,
      createdAt: x.createdAt ?? null,
      read: x.read === true,
    };
  });
}

/**
 * Evaluate triggers and create notifications for overdue actions, missing evidence, and readiness drop.
 * @param {string} organisationId
 * @param {{ organisationId: string, userId: string, userRole: string } | undefined} auditContext
 * @param {string | null} [serviceId] Optional. When set, evaluate for that service only.
 * @returns {Promise<{ created: number }>}
 */
export async function evaluateAndCreateNotifications(organisationId, auditContext, serviceId) {
  if (!organisationId?.trim()) return { created: 0 };
  const [overdueResult, missingEvidence, readiness, existingUnread] = await Promise.all([
    getOverdueActions(organisationId, serviceId),
    detectMissingEvidence(organisationId, serviceId),
    calculateReadinessScore(organisationId, serviceId),
    fetchNotifications(organisationId, { limitCount: 200, unreadOnly: true, serviceId: serviceId ?? undefined }),
  ]);

  const existingByKey = new Set(
    existingUnread.map((n) => `${n.type}:${n.relatedEntityId ?? "none"}`)
  );
  let created = 0;

  for (const action of overdueResult.actions) {
    const key = `${NOTIFICATION_TYPES.ACTION_OVERDUE}:${action.id}`;
    if (existingByKey.has(key)) continue;
    await createNotification(
      organisationId,
      {
        type: NOTIFICATION_TYPES.ACTION_OVERDUE,
        title: "Overdue compliance action",
        message: action.title,
        severity: "high",
        relatedEntityType: "compliance_action",
        relatedEntityId: action.id,
      },
      auditContext,
      serviceId
    );
    existingByKey.add(key);
    created++;
  }

  for (const m of missingEvidence) {
    const key = `${NOTIFICATION_TYPES.MISSING_EVIDENCE}:${m.domainKey}`;
    if (existingByKey.has(key)) continue;
    await createNotification(
      organisationId,
      {
        type: NOTIFICATION_TYPES.MISSING_EVIDENCE,
        title: "Missing evidence",
        message: `No evidence documents for ${m.label}.`,
        severity: "medium",
        relatedEntityType: "domain",
        relatedEntityId: m.domainKey,
      },
      auditContext,
      serviceId
    );
    existingByKey.add(key);
    created++;
  }

  if (readiness.overallReadinessScore < READINESS_DROP_THRESHOLD) {
    const key = `${NOTIFICATION_TYPES.READINESS_DROP}:readiness`;
    if (!existingByKey.has(key)) {
      await createNotification(
        organisationId,
        {
          type: NOTIFICATION_TYPES.READINESS_DROP,
          title: "Readiness score below threshold",
          message: `CQC readiness is ${readiness.overallReadinessScore}% (${readiness.riskLevel}). Consider addressing overdue actions and missing evidence.`,
          severity: "high",
          relatedEntityType: "readiness",
          relatedEntityId: null,
        },
        auditContext,
        serviceId
      );
      existingByKey.add(key);
      created++;
    }
  }

  return { created };
}
