/**
 * Stage 20E — AI invocation audit log (immutable).
 * Every AI use is logged. AI must never read or write audit logs (care folder auditLogs).
 */

export type AiFeatureUsed =
  | 'readiness_reflection'
  | 'policy_gap_prompt'
  | 'care_record_summary'
  | 'improvement_suggestions';

/** Document under /organisations/{orgId}/aiLogs/{logId}. Create-only; no update/delete. */
export type AiLogEntryDoc = {
  userId: string;
  role: string;
  timestamp: string;
  featureUsed: AiFeatureUsed;
  recordId?: string;
};
