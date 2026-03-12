import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Immutable audit logging. Append-only; no update or delete.
 * See docs/audit-model.md. Call from UI via useAuditLogger() so organisationId, userId, userRole come from context.
 *
 * @param {Object} params
 * @param {string} params.organisationId
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {string} params.entityId
 * @param {string} params.entityName
 * @param {*} [params.previousValue]
 * @param {*} [params.newValue]
 * @param {string} [params.serviceId] Optional. Service scope for the event.
 * @returns {Promise<void>} Resolves when written; never throws (logging failures are swallowed so main flow is not broken).
 */
export async function logAuditEvent({
  organisationId,
  userId,
  userRole,
  action,
  entityType,
  entityId,
  entityName,
  previousValue,
  newValue,
  serviceId,
}) {
  if (!organisationId || !userId) return;

  const payload = {
    organisationId: String(organisationId),
    userId: String(userId),
    userRole: String(userRole ?? ""),
    action: String(action ?? ""),
    entityType: String(entityType ?? ""),
    entityId: String(entityId ?? ""),
    entityName: String(entityName ?? ""),
    previousValue: previousValue !== undefined ? previousValue : null,
    newValue: newValue !== undefined ? newValue : null,
    timestamp: serverTimestamp(),
  };
  if (serviceId) payload.serviceId = String(serviceId);

  try {
    const ref = collection(db, "audit_logs");
    await addDoc(ref, payload);
  } catch (err) {
    console.error("[audit] logAuditEvent failed:", err);
  }
}

/**
 * Fire-and-forget audit log. Use from services so main operation is not blocked or broken by logging.
 * @param {Parameters<typeof logAuditEvent>[0]} params
 */
export function logAuditEventNonBlocking(params) {
  logAuditEvent(params).catch(() => {});
}
