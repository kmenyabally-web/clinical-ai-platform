/**
 * Stage 20D — Patient / service user record (minimal, data-minimised).
 * No address, NHS number, medical history, or attachments. GDPR-conscious.
 */

export type RecordStatus = 'active' | 'archived';

/** Patient record under organisations/{orgId}/careFolders/{folderId}/records/{recordId}. */
export type PatientRecordDoc = {
  recordId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date (YYYY-MM-DD)
  uniqueInternalId: string; // internal identifier only; not NHS number
  status: RecordStatus;
  createdBy: string;
  createdAt: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
};

/** Payload for creating a new record. */
export type CreateRecordPayload = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  uniqueInternalId: string;
};

/** Payload for editing basic fields (Manager). */
export type UpdateRecordPayload = Partial<Pick<PatientRecordDoc, 'firstName' | 'lastName' | 'dateOfBirth' | 'uniqueInternalId'>>;
