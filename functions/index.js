/**
 * PHASE B – Cloud Functions Audit Bridge
 *
 * Trusted backend implementation for append-only audit logging.
 * This file defines a callable Cloud Function that accepts an
 * audit payload from the client, enriches it with trusted
 * identity and scope from the caller's auth context, and writes
 * an immutable record to the auditLog collection.
 *
 * No deletes. No client-controlled organisationId. All timestamps
 * use server-side values.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * onAuditEventCreated
 *
 * Callable function for trusted audit event creation.
 *
 * Security and enforcement:
 * - context.auth MUST be present (no unauthenticated callers).
 * - organisationId and role are taken from context.auth.token;
 *   the client payload is ignored for these fields.
 * - serverTimestamp() is injected on the backend.
 * - Writes to the auditLog collection only; no updates or deletes.
 */
exports.onAuditEventCreated = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication is required to write audit events."
    );
  }

  const token = context.auth.token || {};
  const organisationId = token.organisationId;
  const userRole = token.role || "";
  const userId = context.auth.uid;

  if (!organisationId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Missing organisation context in user claims."
    );
  }

  // Whitelist of allowed client-supplied fields.
  const {
    action = "",
    entityType = "",
    entityId = "",
    entityName = "",
    previousValue = null,
    newValue = null,
    serviceId = null,
  } = data || {};

  const payload = {
    organisationId: String(organisationId),
    userId: String(userId),
    userRole: String(userRole),
    action: String(action),
    entityType: String(entityType),
    entityId: String(entityId),
    entityName: String(entityName),
    previousValue: previousValue !== undefined ? previousValue : null,
    newValue: newValue !== undefined ? newValue : null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (serviceId) {
    payload.serviceId = String(serviceId);
  }

  await db.collection("auditLog").add(payload);

  // Return a minimal acknowledgement with no sensitive data.
  return { ok: true };
});

