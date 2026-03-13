# Phase B Audit Model – Backend Bridge for auditLog

**Digital CQC Readiness System – Firebase / Cloud Functions**

*This document describes the Phase B audit model for the digital CQC readiness system. It explains how audit events flow from the user interface to a trusted backend Cloud Function and into a protected Firestore `auditLog` collection. It also explains how this design prevents staff or managers from tampering with their own audit trail and supports CQC and UK information governance expectations.*

---

## 1. Overview

- The Firestore security rules reviewed in `foundation-knowledge/Firestore-Security-Rules-Review.md` state that:
  - The `auditLog` collection is **append-only**.
  - Client-side users (staff, managers, inspectors, admins) **cannot** create, update, or delete audit entries directly.
  - Only a trusted backend (for example, Cloud Functions using the Admin SDK) may append audit entries.
- Phase B introduces this **trusted backend bridge**:
  - A Firebase Cloud Function `onAuditEventCreated` that receives audit events from the app.
  - A frontend `auditService` that calls this function; it does not write to Firestore directly.
  - An enforced pattern that keeps organisation scope and identity under backend control.

---

## 2. Technical Flow: UI → Cloud Function → Firestore

### 2.1 UI / Frontend

- When the application needs to record an audit event (for example, a future action such as “care plan viewed” or “incident created”), it will call:
  - `auditService.logEvent(eventData)` in `app/src/services/auditService.js`.
- The `eventData` object contains only **high-level descriptors**, such as:
  - `action` (for example, `"VIEWED_CARE_PLAN"`),
  - `entityType` (for example, `"carePlan"`),
  - `entityId`,
  - `entityName`,
  - and optional `previousValue` / `newValue` / `serviceId`.
- Critically, the frontend **does not send**:
  - `organisationId`,
  - `userId`,
  - or any low-level authentication details.  
  These are derived exclusively on the backend.

### 2.2 Cloud Function: onAuditEventCreated

- Defined in `functions/index.js` as a callable Cloud Function:
  - `exports.onAuditEventCreated = functions.https.onCall(async (data, context) => { ... })`
- Security and behaviour:
  - **Authentication required**:
    - `context.auth` must be present; otherwise the function throws an `unauthenticated` error.
  - **Trusted identity and scope**:
    - `organisationId` and `role` are taken from `context.auth.token` (custom claims set at sign-in).
    - `userId` is taken from `context.auth.uid`.
    - The function **ignores** any `organisationId` or `userId` in the client payload.
  - **Payload construction**:
    - Builds a payload with:
      - `organisationId` (from claims),
      - `userId` (from auth),
      - `userRole` (from claims),
      - `action`, `entityType`, `entityId`, `entityName`,
      - `previousValue` and `newValue` (if provided),
      - `serviceId` (if provided),
      - `timestamp` using `admin.firestore.FieldValue.serverTimestamp()`.
  - **Write to Firestore**:
    - Writes the payload to the `auditLog` collection using the Admin SDK.
    - No updates or deletes are performed; this is append-only by design.

### 2.3 Protected Firestore

- The `auditLog` collection:
  - Is protected by Firestore rules so that:
    - **No client** can write, update, or delete entries.
    - Only backend/Admin SDK operations (such as this Cloud Function) are allowed to add entries.
  - Entries are immutable once written, except under exceptional, separately governed procedures.

---

## 3. Prevention of Audit Tampering by Staff or Managers

- Because staff and managers:
  - Cannot write directly to `auditLog`,
  - Cannot control `organisationId` or `userId` in the audit payload (these come from claims),
  - Cannot bypass the Cloud Function’s authentication checks,
- They are **unable to:
  - Remove their own actions from the audit trail,
  - Alter the recorded details of those actions (e.g. change `action` or `entityType` for already written entries),
  - Forge entries on behalf of another user or organisation.
- Any attempt to manipulate the audit trail (for example, by calling the Cloud Function without authentication, or by providing a different `organisationId` in the payload) is blocked because:
  - The function fails if `context.auth` is missing.
  - The function always overrides `organisationId` and `userId` with values from the auth context.

This design ensures that the audit trail is **trustworthy and tamper-resistant**, which is essential for accountability in regulated care.

---

## 4. CQC and Information Governance Alignment

- **CQC expectations**:
  - Providers must be able to show “who did what, when” and that staff cannot hide or alter evidence of their actions.
  - Audit trails must be robust and not easily manipulated by those being audited.
  - This Phase B model demonstrates:
    - Clear separation between user actions and audit record control.
    - A central, trusted mechanism (Cloud Function) for audit entry creation.
    - Strong alignment with the principle that “records should not be altered retrospectively without clear evidence and oversight.”
- **UK Information Governance**:
  - **Integrity**: Audit entries cannot be changed by staff or managers after the fact, which supports the integrity of the record.  
  - **Accountability**: Each entry is tied to a known identity (userId, role) derived from authentication, not from user-supplied data.  
  - **Data minimisation and purpose limitation**:
    - The audit payload includes only what is necessary for accountability (who, what, when, where).
    - Sensitive content is not duplicated unnecessarily; the focus is on actions, not full clinical text.

---

## 5. No Hard Deletes and OrganisationId Protection

- The audit model enforces:
  - **No hard deletes** of audit entries via the Cloud Function.
  - **No leaking or overriding of organisationId**:
    - organisationId is only taken from the user’s claims on the backend.
    - The function never returns raw organisationId or low-level identifiers to the client as part of its response; it only returns a minimal `{ ok: true }` acknowledgement.
  - This further reduces the risk of information disclosure or cross-organisation access.

---

## 6. Summary

- Phase B introduces a **trusted backend bridge** for audit logging that:
  - Keeps all audit writes firmly in the backend.
  - Ensures that each audit entry is linked to authenticated, scoped identity.
  - Prevents staff or managers from manipulating their own audit trail.
- Combined with the existing Firestore security rules and the Stage 2 verification report (`docs/governance/VERIFICATION_STAGE_2.md`), this model forms a key part of the system’s **production readiness path** for CQC and UK information governance.

