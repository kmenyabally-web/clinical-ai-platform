/** [PHASE B+ AUDIT HARDENING]
 *
 * Audit service – Phase B backend bridge.
 *
 * ATTENTION: Direct client-side writes to the auditLog collection
 * remain prohibited by Firestore Rules. This service calls a trusted
 * Cloud Function (onAuditEventCreated) which enforces identity and
 * scope on the backend and writes to auditLog append-only.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "../constants/auditTaxonomy";

const functions = getFunctions(app);
const onAuditEventCreated = httpsCallable(functions, "onAuditEventCreated");

/** [PHASE B+ AUDIT HARDENING]
 *
 * logEvent(eventData)
 *
 * Sends a high-level audit event to the backend Cloud Function.
 * The backend:
 * - Validates authentication.
 * - Derives organisationId and role from custom claims.
 * - Injects serverTimestamp() and writes to auditLog.
 *
 * If the Cloud Function call fails, this function logs a critical
 * non-PHI error to the console so that developers and operators
 * know the audit trail is broken.
 *
 * @param {Object} eventData
 *   - Must include: action, entityType.
 *   - May include: entityId, entityName,
 *     previousValue, newValue, serviceId.
 *   - Must NOT include organisationId or userId; those are taken
 *     from the auth context on the backend.
 */
export async function logEvent(eventData) {
  const { action, entityType } = eventData || {};

  const validAction = Object.values(AUDIT_ACTIONS).includes(action);
  const validEntity = Object.values(AUDIT_ENTITIES).includes(entityType);

  if (!validAction || !validEntity) {
    // Do not call backend if taxonomy is violated.
    // eslint-disable-next-line no-console
    console.error(
      "[audit] Invalid audit taxonomy. Event not sent.",
      "action=",
      action,
      "entityType=",
      entityType
    );
    return;
  }

  try {
    await onAuditEventCreated(eventData || {});
  } catch (err) {
    // Critical, but non-PHI, error message.
    // Do not log sensitive payload; log only meta-information.
    // eslint-disable-next-line no-console
    console.error(
      "[audit] onAuditEventCreated failed. Audit trail may be incomplete.",
      err && err.message ? err.message : err
    );
  }
}

