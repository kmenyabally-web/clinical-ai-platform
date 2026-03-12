/**
 * Stage 20D — Audit log entries (immutable, append-only).
 * Create only; no update/delete. Full trail for create, update, archive.
 */

import type { AuditActionType, AuditLogEntryDoc } from '../models/auditLog';

export function buildAuditEntry(
  actionType: AuditActionType,
  uid: string,
  recordId?: string,
  fieldChanged?: string
): AuditLogEntryDoc {
  const entry: AuditLogEntryDoc = {
    actionType,
    performedBy: uid,
    timestamp: new Date().toISOString(),
  };
  if (recordId != null) entry.recordId = recordId;
  if (fieldChanged != null) entry.fieldChanged = fieldChanged;
  return entry;
}
