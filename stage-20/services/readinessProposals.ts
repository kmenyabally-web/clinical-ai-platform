/**
 * Stage 20B — Readiness proposals (QualityLead or Manager).
 * Writes to /organisations/{orgId}/readinessProposals/. No live readiness change.
 */

import type { Role } from '../permissions';
import { canProposeReadiness } from '../permissions';
import type { ReadinessDomainKey, ReadinessLevel } from './readinessUpdate';

export type ReadinessProposalDoc = {
  orgId: string;
  domainKey: ReadinessDomainKey;
  proposedLevel: ReadinessLevel;
  proposedDescription: string;
  proposedBy: string;   // Firebase UID
  proposedAt: string;   // ISO timestamp
  status: 'pending';    // future: approved | rejected
};

/**
 * Build a proposal document. Caller must have propose permission and use Firestore add().
 */
export function buildReadinessProposal(
  orgId: string,
  domainKey: ReadinessDomainKey,
  payload: { proposedLevel: ReadinessLevel; proposedDescription: string },
  uid: string
): ReadinessProposalDoc {
  return {
    orgId,
    domainKey,
    proposedLevel: payload.proposedLevel,
    proposedDescription: payload.proposedDescription,
    proposedBy: uid,
    proposedAt: new Date().toISOString(),
    status: 'pending',
  };
}

/**
 * Enforce at logic level: only Manager or QualityLead may submit proposals.
 */
export function assertCanPropose(role: Role): void {
  if (!canProposeReadiness(role)) {
    throw new Error('Permission denied: cannot submit readiness proposals.');
  }
}
