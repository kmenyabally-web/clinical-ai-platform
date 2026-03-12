/**
 * Stage 20B — Readiness update logic (Manager only).
 * Writes to /organisations/{orgId}/readiness/{domain}.
 * Logs lastUpdatedBy, lastUpdatedAt. No patient data, no care records.
 */

import type { Role } from '../permissions';
import { canWriteReadiness } from '../permissions';

export type ReadinessDomainKey =
  | 'governance'
  | 'safeguarding'
  | 'mentalCapacityConsent'
  | 'staffingTraining'
  | 'carePlanningFramework';

export type ReadinessLevel = 'Not started' | 'In progress' | 'Defined' | 'Reviewed' | 'Assured';

export type ReadinessDomainDoc = {
  orgId: string;
  domainKey: ReadinessDomainKey;
  readinessLevel: ReadinessLevel;
  description: string;
  lastUpdatedBy: string;  // Firebase UID
  lastUpdatedAt: string;  // ISO timestamp
};

/**
 * Build the update payload for a readiness domain. Caller must be Manager and use Firestore set/update.
 */
export function buildReadinessUpdate(
  orgId: string,
  domainKey: ReadinessDomainKey,
  payload: { readinessLevel: ReadinessLevel; description: string },
  uid: string
): ReadinessDomainDoc {
  return {
    orgId,
    domainKey,
    readinessLevel: payload.readinessLevel,
    description: payload.description,
    lastUpdatedBy: uid,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Enforce at logic level: only Manager may perform readiness update.
 * Do not call Firestore from this module; consumer passes in set/update.
 */
export function assertCanUpdateReadiness(role: Role): void {
  if (!canWriteReadiness(role)) {
    throw new Error('Permission denied: only Manager can update readiness.');
  }
}
