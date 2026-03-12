# Stage 20D — Controlled patient/service user records and audit

## 1. Updated Firestore schema

### Records subcollection

**Path:** `/organisations/{orgId}/careFolders/{folderId}/records/{recordId}`

| Field            | Type   | Description |
|------------------|--------|-------------|
| recordId         | string | Document ID. |
| firstName        | string | Data-minimised. |
| lastName         | string | Data-minimised. |
| dateOfBirth      | string | ISO date (YYYY-MM-DD). |
| uniqueInternalId | string | Internal identifier only; **not** NHS number. |
| status           | string | `"active"` \| `"archived"` (soft-delete only). |
| createdBy        | string | Firebase UID. |
| createdAt        | string | ISO timestamp. |
| lastUpdatedBy    | string | Firebase UID. |
| lastUpdatedAt    | string | ISO timestamp. |

- No address, NHS number, medical history, or attachments.
- No hard delete; archive by setting `status` to `"archived"`.

### Record proposals subcollection

**Path:** `/organisations/{orgId}/careFolders/{folderId}/recordProposals/{proposalId}`

| Field            | Type   | Description |
|------------------|--------|-------------|
| recordId         | string | Target record. |
| proposedChanges  | map    | Partial fields (e.g. firstName, lastName, dateOfBirth, uniqueInternalId). |
| proposedBy       | string | Firebase UID. |
| proposedAt       | string | ISO timestamp. |
| status           | string | `"pending"`. |

- QualityLead (and Manager) may create only; no update/delete.

### Audit logs subcollection

**Path:** `/organisations/{orgId}/careFolders/{folderId}/auditLogs/{logId}`

| Field       | Type   | Description |
|-------------|--------|-------------|
| actionType  | string | `"create"` \| `"update"` \| `"archive"`. |
| performedBy | string | Firebase UID. |
| timestamp   | string | ISO timestamp. |
| recordId    | string | (optional) Related record. |
| fieldChanged| string | (optional) For updates. |

- Append-only; no update or delete (immutable).
- One entry per create, update, or archive.

---

## 2. Updated security rules (summary)

- **records**: Read if `orgMatch(orgId)`. Create and update only if `orgMatch(orgId) && isManager()`. **Delete denied** (archive = update `status` only).
- **recordProposals**: Read if org match. Create only if Manager or QualityLead. Update and delete denied.
- **auditLogs**: Read if org match. Create only if Manager. Update and delete denied.

All access remains within the user’s `orgId`; no cross-organisation access.

---

## 3. Patient record data model (app)

- **PatientRecordDoc**: `recordId`, `firstName`, `lastName`, `dateOfBirth`, `uniqueInternalId`, `status`, `createdBy`, `createdAt`, `lastUpdatedBy`, `lastUpdatedAt`.
- **CreateRecordPayload**: `firstName`, `lastName`, `dateOfBirth`, `uniqueInternalId`.
- **UpdateRecordPayload**: Partial of the editable fields (no status in normal edit; archive uses status only).
- **buildNewRecordDoc(recordId, payload, uid)**: New record with `status: 'active'`.
- **buildRecordUpdate(payload, uid)**: Sets `lastUpdatedBy`, `lastUpdatedAt`; use for edit or for archive (`{ status: 'archived' }`).

---

## 4. Audit log structure (app)

- **AuditActionType**: `'create' | 'update' | 'archive'`.
- **AuditLogEntryDoc**: `actionType`, `performedBy`, `timestamp`, optional `recordId`, optional `fieldChanged`.
- **buildAuditEntry(actionType, uid, recordId?, fieldChanged?)**: Returns document to create. Call after each create, update, or archive; write to `auditLogs` with create-only (no update/delete).

For production, consider writing audit entries from a Cloud Function (e.g. on `records` onCreate/onUpdate) so clients cannot forge logs.

---

## 5. Role-based behaviour

| Action              | Manager | QualityLead | Viewer |
|---------------------|---------|-------------|--------|
| View records        | Yes     | Yes         | Yes    |
| Create record       | Yes     | No          | No     |
| Edit record         | Yes     | No          | No     |
| Archive record      | Yes     | No          | No     |
| Submit edit proposal| Yes     | Yes         | No     |

- Manager: create, edit, archive; no permanent delete.
- QualityLead: view; propose edits only (stored in `recordProposals`).
- Viewer: read-only.

---

## 6. Safety checks before record creation

Call **assertCanCreateRecord(role, careFoldersEnabled, orgId)** before creating any record:

1. **orgId present**: `orgId` must be non-null (organisation context required).
2. **Care folders enabled**: `careFoldersEnabled === true` (governance approval required).
3. **Role**: `role === 'Manager'` (only Manager may create).

If any check fails, throw; do not create record or write audit.

---

## 7. UI adjustments summary

- **Care Folder screen (when careFoldersEnabled and records allowed)**  
  - **“Create Record”** button: visible only to Manager. Opens minimal data entry form (firstName, lastName, dateOfBirth, uniqueInternalId). No address, NHS number, or extra fields.  
  - **List of records**: Show minimal fields; filter or label by `status` (e.g. active / archived).  
  - **Edit**: Manager only; same minimal fields; no bulk edit.  
  - **Archive**: Manager only; single “Archive” action per record (soft-delete); confirm if desired.  
  - **Audit history**: Read-only section listing entries from `auditLogs` for the folder (or record). No edit/delete.  
  - **QualityLead**: View records; “Propose edit” to create a `recordProposal`; no direct edit.  
  - **Viewer**: Read-only list and details; no create/edit/archive/propose.

- **Tone**: Professional, clinical; suitable for CQC and GDPR.  
- **Not implemented**: No bulk editing, CSV import, or export buttons. No uploads, attachments, AI, or NHS number.

---

## 8. New / updated files (Stage 20D)

| Path | Purpose |
|------|--------|
| `permissions/types.ts` | Added `records:view`, `records:create`, `records:edit`, `records:archive`, `records:propose`. |
| `permissions/mapping.ts` | Role matrix and helpers for record permissions. |
| `permissions/index.ts`, `usePermission.ts` | Exports and hook for record actions. |
| `models/patientRecord.ts` | PatientRecordDoc, CreateRecordPayload, UpdateRecordPayload, RecordStatus. |
| `models/recordProposal.ts` | RecordProposalDoc. |
| `models/auditLog.ts` | AuditActionType, AuditLogEntryDoc. |
| `services/patientRecord.ts` | assertCanCreateRecord (with safety checks), assertCanEditRecord, assertCanArchiveRecord, buildNewRecordDoc, buildRecordUpdate. |
| `services/recordProposal.ts` | assertCanProposeRecordEdit, buildRecordProposalDoc. |
| `services/auditLog.ts` | buildAuditEntry. |
| `firestore.rules` | rules for `records`, `recordProposals`, `auditLogs` under careFolders. |
| `STAGE-20D-PATIENT-RECORDS-AUDIT.md` | This document. |
