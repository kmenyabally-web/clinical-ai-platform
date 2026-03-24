/**
 * Audit trail — writes to Firestore `auditLogs` (organisation-scoped).
 * Legacy callers use {@link logAuditEventNonBlocking} which forwards here when possible.
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";

const AUDIT_LOGS_COLLECTION = "auditLogs";

/**
 * @param {string} eventType
 * @param {{ userId?: string | null, patientId?: string | null, organisationId?: string | null, metadata?: Record<string, unknown> | null }} [options]
 */
export async function logAuditEvent(eventType, options = {}) {
  const userId = options.userId ?? auth.currentUser?.uid ?? null;
  let organisationId = options.organisationId ?? null;
  if (!organisationId) {
    try {
      const ctx = await getUserContext();
      organisationId = ctx?.organisationId ?? null;
    } catch {
      /* non-fatal */
    }
  }

  const payload = {
    eventType: String(eventType ?? "UNKNOWN"),
    userId: userId ?? null,
    patientId: options.patientId ?? null,
    organisationId,
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
  logAuditEventNonBlocking,
  logAppInitStub,
};
