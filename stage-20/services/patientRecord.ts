/**
 * Stage 20D — Patient record create/edit/archive (Manager only).
 * Data-minimised. Soft-delete only. No bulk export, no NHS number.
 */

import type { Role } from '../permissions';
import {
  canCreateRecords,
  canEditRecords,
  canArchiveRecords,
} from '../permissions';
import type {
  PatientRecordDoc,
  CreateRecordPayload,
  UpdateRecordPayload,
  RecordStatus,
} from '../models/patientRecord';

/** Safety check: allow record creation only when org is ready and user is Manager. */
export function assertCanCreateRecord(
  role: Role,
  careFoldersEnabled: boolean,
  orgId: string | null
): void {
  if (!orgId) {
    throw new Error('Organisation context is required to create a record.');
  }
  if (!careFoldersEnabled) {
    throw new Error('Care folders are not enabled for this organisation. Governance approval required.');
  }
  if (!canCreateRecords(role)) {
    throw new Error('Permission denied: only Manager can create patient records.');
  }
}

export function assertCanEditRecord(role: Role): void {
  if (!canEditRecords(role)) {
    throw new Error('Permission denied: only Manager can edit patient records.');
  }
}

export function assertCanArchiveRecord(role: Role): void {
  if (!canArchiveRecords(role)) {
    throw new Error('Permission denied: only Manager can archive records. Permanent delete is not allowed.');
  }
}

/** Build new record document. Caller must pass assertCanCreateRecord first. */
export function buildNewRecordDoc(
  recordId: string,
  payload: CreateRecordPayload,
  uid: string
): PatientRecordDoc {
  const now = new Date().toISOString();
  return {
    recordId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    dateOfBirth: payload.dateOfBirth,
    uniqueInternalId: payload.uniqueInternalId,
    status: 'active',
    createdBy: uid,
    createdAt: now,
    lastUpdatedBy: uid,
    lastUpdatedAt: now,
  };
}

/** Build update payload for edit (or archive). For archive, only status + lastUpdated* change. */
export function buildRecordUpdate(
  payload: UpdateRecordPayload | { status: RecordStatus },
  uid: string
): Partial<PatientRecordDoc> {
  return {
    ...payload,
    lastUpdatedBy: uid,
    lastUpdatedAt: new Date().toISOString(),
  };
}
