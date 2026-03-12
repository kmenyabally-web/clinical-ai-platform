/**
 * Stage 20E — AI assistance guard and logging.
 * AI is assistive only; never decides, scores, or modifies records. No access to audit logs.
 */

import type { Role } from '../permissions';
import { canUseAi } from '../permissions';
import type { AiFeatureUsed, AiLogEntryDoc } from '../models/aiLog';

/** Manager only; org aiEnabled must be true. Hide AI features if either fails. */
export function assertCanUseAi(role: Role, aiEnabled: boolean): void {
  if (!canUseAi(role)) {
    throw new Error('Permission denied: AI assistance is available to Manager role only.');
  }
  if (!aiEnabled) {
    throw new Error('AI assistance is not enabled for this organisation.');
  }
}

/** Build AI log entry for Firestore. Call after each AI invocation; create-only. */
export function buildAiLogEntry(
  userId: string,
  role: string,
  featureUsed: AiFeatureUsed,
  recordId?: string
): AiLogEntryDoc {
  const entry: AiLogEntryDoc = {
    userId,
    role,
    timestamp: new Date().toISOString(),
    featureUsed,
  };
  if (recordId != null) entry.recordId = recordId;
  return entry;
}

/** UI disclaimer for all AI panels. */
export const AI_DISCLAIMER = 'AI support tool. Does not replace professional judgement.';

/** Label for AI-generated content that must be human-reviewed. */
export const AI_DRAFT_LABEL = 'AI-Generated Draft – Human Review Required';
