/**
 * Stage 20D — Audit log entry (immutable).
 * Full audit trail for create, update, archive. No edit/delete.
 */

export type AuditActionType = 'create' | 'update' | 'archive';

/** Audit log document under organisations/{orgId}/careFolders/{folderId}/auditLogs/{logId}. */
export type AuditLogEntryDoc = {
  actionType: AuditActionType;
  performedBy: string;
  timestamp: string;
  recordId?: string;
  fieldChanged?: string;
};
