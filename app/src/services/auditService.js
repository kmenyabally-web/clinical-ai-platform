/** * [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 * * MASTER AUDIT SERVICE
 * Standardised to prevent import errors in clinical services.
 */

/**
 * Placeholder for non-blocking audit events.
 * Stage 2 Governance: This does NOT write to Firestore yet.
 */
export const logAuditEventNonBlocking = async (eventData) => {
  console.warn("[Stage 2 Governance] Audit Event Captured (No-Op):", eventData?.action);
  return Promise.resolve({ ok: true, message: "Governance placeholder active." });
};

/**
 * Main Event Logger (Phase B Bridge)
 */
export const logEvent = async (eventData) => {
  return logAuditEventNonBlocking(eventData);
};

/**
 * Legacy init stub
 */
export const logAppInitStub = () => {
  return logAuditEventNonBlocking({ action: "APP_INIT" });
};

// Default export for flexibility
export default {
  logEvent,
  logAuditEventNonBlocking,
  logAppInitStub
};