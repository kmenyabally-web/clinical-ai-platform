/**
 * Audit trail — writes to Firestore `auditLogs` (organisation-scoped).
 * Legacy callers use {@link logAuditEventNonBlocking} which forwards here when possible.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";

const AUDIT_LOGS_COLLECTION = "auditLogs";
/** Lightweight action log collection (pre-flight observability). */
const AUDIT_ACTIONS_COLLECTION = "audit_logs";

/**
 * Mandatory compliance-style audit row (Stage 10B).
 * @param {string} action
 * @param {Record<string, unknown>} [metadata]
 */
export async function logAudit(action, metadata = {}) {
  try {
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action,
      metadata,
      userId: metadata.userId ?? auth.currentUser?.uid ?? null,
      organisationId: metadata.organisationId ?? null,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Audit log failed:", err);
  }
}

/**
 * @param {string} action
 * @param {string | null | undefined} userId
 */
export async function logAction(action, userId) {
  try {
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action,
      userId: userId ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[audit] logAction failed:", e);
  }
}

/**
 * @param {string} eventType
 * @param {{ userId?: string | null, patientId?: string | null, organisationId?: string | null, metadata?: Record<string, unknown> | null }} [options]
 */
export async function logAuditEvent(eventType, options = {}) {
  const userId = options.userId ?? auth.currentUser?.uid ?? null;
  let organisationId = options.organisationId ?? null;
  let ctx = null;
  try {
    ctx = await getUserContext();
  } catch {
    /* non-fatal */
  }
  if (!organisationId) {
    organisationId = ctx?.organisationId ?? null;
  }
  if (!organisationId?.trim()) {
    return;
  }

  const tenant = tenantFieldsFromContext({
    organisationId,
    hospitalId: ctx?.hospitalId,
    wardId: ctx?.wardId,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);

  const payload = {
    eventType: String(eventType ?? "UNKNOWN"),
    userId: userId ?? null,
    patientId: options.patientId ?? null,
    organisationId: tenant.organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    metadata: options.metadata && typeof options.metadata === "object" ? options.metadata : null,
    timestamp: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), payload);
  } catch (e) {
    console.warn("[audit] logAuditEvent write failed:", e);
  }
}

/**
 * Non-blocking bridge for legacy services; maps old shapes into `auditLogs`.
 * @param {Record<string, unknown>} eventData
 */
export const logAuditEventNonBlocking = async (eventData) => {
  const action = eventData?.action ?? eventData?.eventType ?? "LEGACY_EVENT";
  await logAuditEvent(String(action), {
    organisationId: eventData?.organisationId ?? null,
    patientId: eventData?.patientId ?? eventData?.entityId ?? null,
    metadata: eventData && typeof eventData === "object" ? eventData : null,
  });
  return Promise.resolve({ ok: true, message: "Audit logged." });
};

export const logEvent = async (eventData) => {
  return logAuditEventNonBlocking(eventData);
};

export const logAppInitStub = () => {
  return logAuditEventNonBlocking({ action: "APP_INIT" });
};

export default {
  logEvent,
  logAuditEvent,
  logAction,
  logAudit,
  logAuditEventNonBlocking,
  logAppInitStub,
};
