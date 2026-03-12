/**
 * Stage 20D — Record edit proposals (QualityLead). Stored separately; no direct edit.
 */

import type { Role } from '../permissions';
import { canProposeRecordEdits } from '../permissions';
import type { UpdateRecordPayload } from '../models/patientRecord';
import type { RecordProposalDoc } from '../models/recordProposal';

export function assertCanProposeRecordEdit(role: Role): void {
  if (!canProposeRecordEdits(role)) {
    throw new Error('Permission denied: only QualityLead or Manager can submit record edit proposals.');
  }
}

export function buildRecordProposalDoc(
  recordId: string,
  proposedChanges: UpdateRecordPayload,
  uid: string
): RecordProposalDoc {
  return {
    recordId,
    proposedChanges,
    proposedBy: uid,
    proposedAt: new Date().toISOString(),
    status: 'pending',
  };
}
