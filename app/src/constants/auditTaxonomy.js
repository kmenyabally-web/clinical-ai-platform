/** [ENABLEMENT GATE: STAGE 5 - CLINICAL READ ENABLED]
 *
 * Centralised audit taxonomy for actions and entities.
 * This prevents string typos and keeps the audit trail
 * consistent and analyzable for governance and inspection.
 */

export const AUDIT_ACTIONS = Object.freeze({
  VIEW: "VIEW",
  VIEW_CONTENT: "VIEW_CONTENT",
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  ARCHIVE: "ARCHIVE",
  LOGIN: "LOGIN",
  EXPORT: "EXPORT",
});

export const AUDIT_ENTITIES = Object.freeze({
  ORGANISATION: "ORGANISATION",
  SERVICE: "SERVICE",
  PATIENT: "PATIENT",
  CARE_PLAN: "CARE_PLAN",
  INCIDENT: "INCIDENT",
  DOCUMENT: "DOCUMENT",
  DOCUMENT_METADATA: "DOCUMENT_METADATA",
});

