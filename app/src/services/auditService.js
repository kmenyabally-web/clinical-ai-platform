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

function isAlreadyExistsError(err) {
  const code = typeof err?.code === "string" ? err.code.toLowerCase() : "";
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  return code.includes("already-exists") || message.includes("document already exists");
}

function normalizeAuditPayload(input = {}) {
  return {
    action: input.action ?? input.eventType ?? "UNKNOWN",
    user: input.user ?? null,
    userId: input.userId ?? input.user?.uid ?? auth.currentUser?.uid ?? null,
    userEmail: input.userEmail ?? input.user?.email ?? auth.currentUser?.email ?? null,
    role: input.role ?? input.user?.role ?? null,
    organisationId: input.organisationId ?? null,
    hospitalId: input.hospitalId ?? null,
    wardId: input.wardId ?? null,
    patientId: input.patientId ?? null,
    metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
  };
}

/**
 * Canonical audit writer (compliance events collection: `audit_logs`).
 * Supports rich actor + tenant context payloads.
 * @param {object} payload
 */
/**
 * Compliance entity audit (collection `audit_logs`) — use for UPDATE/DELETE/APPROVE with entity scope.
 * @param {{ action: string, entityType?: string | null, entityId?: string | null, metadata?: Record<string, unknown> }} p
 */
export async function logEntityAudit(p) {
  const action = (p?.action ?? "").toString().trim();
  if (!action) return;
  let organisationId = null;
  try {
    const ctx = await getUserContext();
    organisationId = ctx?.organisationId ?? null;
  } catch {
    /* non-fatal */
  }
  try {
    const uid = auth.currentUser?.uid ?? null;
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action,
      entityType: p?.entityType ?? null,
      entityId: p?.entityId ?? null,
      organisationId: p?.organisationId ?? organisationId,
      performedBy: p?.performedBy ?? uid,
      userId: uid,
      role: p?.role ?? null,
      timestamp: serverTimestamp(),
      metadata: p?.metadata && typeof p.metadata === "object" ? p.metadata : {},
    });
  } catch (err) {
    if (!isAlreadyExistsError(err)) {
      console.error("[audit] logEntityAudit failed:", err);
    }
  }
}

export async function writeAuditEvent(payload) {
  const row = normalizeAuditPayload(payload);
  try {
    if (!row.action || !String(row.action).trim()) {
      throw new Error("Missing audit action");
    }
    if (!row.organisationId || !String(row.organisationId).trim()) {
      throw new Error("Missing audit organisationId");
    }
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action: String(row.action),
      userId: row.userId,
      userEmail: row.userEmail,
      role: row.role,
      organisationId: row.organisationId ?? null,
      hospitalId: row.hospitalId ?? null,
      wardId: row.wardId ?? null,
      patientId: row.patientId ?? null,
      metadata: row.metadata,
      createdAt: serverTimestamp(),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    if (!isAlreadyExistsError(err)) {
      console.error("Audit log failed:", err);
    }
  }
}

/**
 * Mandatory compliance-style audit row (Stage 10B).
 * @param {string} action
 * @param {Record<string, unknown>} [metadata]
 */
export async function logAudit(action, metadata = {}) {
  try {
    let organisationId = metadata.organisationId ?? null;
    if (!organisationId) {
      try {
        const ctx = await getUserContext();
        organisationId = ctx?.organisationId ?? null;
      } catch {
        organisationId = null;
      }
    }
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action,
      metadata,
      userId: metadata.userId ?? auth.currentUser?.uid ?? null,
      organisationId,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    if (!isAlreadyExistsError(err)) {
      console.warn("Audit log failed:", err);
    }
  }
}

/**
 * @param {string} action
 * @param {string | null | undefined} userId
 */
export async function logAction(action, userId, organisationId = null) {
  try {
    let resolvedOrg = organisationId;
    if (!resolvedOrg) {
      try {
        const ctx = await getUserContext();
        resolvedOrg = ctx?.organisationId ?? null;
      } catch {
        resolvedOrg = null;
      }
    }
    await addDoc(collection(db, AUDIT_ACTIONS_COLLECTION), {
      action,
      userId: userId ?? null,
      organisationId: resolvedOrg,
      createdAt: serverTimestamp(),
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    if (!isAlreadyExistsError(e)) {
      console.warn("[audit] logAction failed:", e);
    }
  }
}

/**
 * @param {string} eventType
 * @param {{ userId?: string | null, patientId?: string | null, organisationId?: string | null, metadata?: Record<string, unknown> | null }} [options]
 */
export async function logAuditEvent(eventTypeOrPayload, options = {}) {
  // New shape: logAuditEvent({ action, user, organisationId, ... })
  if (eventTypeOrPayload && typeof eventTypeOrPayload === "object" && !Array.isArray(eventTypeOrPayload)) {
    const incoming = normalizeAuditPayload(eventTypeOrPayload);
    let ctx = null;
    if (!incoming.organisationId || !incoming.hospitalId || !incoming.wardId) {
      try {
        ctx = await getUserContext();
      } catch {
        ctx = null;
      }
    }
    return writeAuditEvent({
      ...incoming,
      organisationId: incoming.organisationId ?? ctx?.organisationId ?? null,
      hospitalId: incoming.hospitalId ?? ctx?.hospitalId ?? null,
      wardId: incoming.wardId ?? ctx?.wardId ?? null,
    });
  }

  const eventType = eventTypeOrPayload;
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

  await writeAuditEvent({
    action: String(eventType ?? "UNKNOWN"),
    userId: payload.userId,
    organisationId: payload.organisationId,
    hospitalId: payload.hospitalId,
    wardId: payload.wardId,
    patientId: payload.patientId,
    metadata: payload.metadata ?? {},
  });

  // Keep legacy collection for backward compatibility.
  try {
    await addDoc(collection(db, AUDIT_LOGS_COLLECTION), payload);
  } catch {
    /* non-fatal legacy sink */
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
  logEntityAudit,
};
