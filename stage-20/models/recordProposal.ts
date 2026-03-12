/**
 * Stage 20D — Proposed edits to patient records (QualityLead).
 * Stored separately; no direct edit of live record.
 */

import type { CreateRecordPayload, UpdateRecordPayload } from './patientRecord';

/** Proposal document under organisations/{orgId}/careFolders/{folderId}/recordProposals/{proposalId}. */
export type RecordProposalDoc = {
  recordId: string;
  proposedChanges: UpdateRecordPayload;
  proposedBy: string;
  proposedAt: string;
  status: 'pending';
};
