# Stage 3 Enablement Verification – Person‑Identifiable Read Only

**Digital CQC Readiness System – Firebase / React Application**

*This document records the verification of the Stage 3 Enablement Gate (“Person‑Identifiable Read Only”) for the digital CQC readiness system. It describes the move from non‑clinical metadata (Stage 2) to basic person‑identifiable information (Stage 3), the security logic that constrains this access, and the criteria used to confirm that enforcement works as intended.*

---

## 1. Purpose of the Stage 3 Enablement Gate

- Stage 2 allowed the system to display **non‑clinical metadata only**: user identity (role, email) and the organisation name, with no person‑identifiable information (PII) and no care content.
- Stage 3 introduces **controlled access to basic person‑identifiable information**:
  - A read‑only list of people (patients) within the user’s organisation.
  - Display of **firstName**, **lastName**, **status**, and **serviceId** only.
  - No access to care folder content, clinical notes, incidents, or documents.
- The purpose of this gate is to:
  - Enable the system to support CQC readiness work that requires a list of people in scope.
  - Maintain strong protection for clinical content and sensitive health information, which remain locked under “Default Deny”.

---

## 2. Technical Transition: Stage 2 → Stage 3

- **Stage 2**:
  - UI limited to `FirstSafeScreen` (identity and organisation context only).
  - No person records, no clinical data fetched or rendered.
  - Audit bridge (Cloud Function `onAuditEventCreated`) in place, but used only for non‑clinical events.
- **Stage 3**:
  - A new **patient list service** (`listPatients`) is introduced and hardened:
    - Queries the `people`/`patients` collection scoped by `organisationId` from user claims.
    - Returns only `firstName`, `lastName`, `status`, and `serviceId`.
  - A new **read‑only UI** (`PatientListScreen`) presents this information in a professional list/table format.
  - The **audit bridge** is used to log:
    - Each “List Patients” action (VIEW / PATIENT).
    - Each “View Summary” trigger (VIEW / PATIENT), even though no clinical content is shown.

---

## 3. Security Logic – OrganisationId Scoping

- Every Stage 3 read of person‑identifiable data is enforced by:
  - The existing Firestore rules (default deny, role + organisation scoping).
  - Service‑layer checks that:
    - Derive `organisationId` from the user’s custom claims (via `getUserContext()`).
    - Reject any request where the `orgId` parameter does not exactly match the claims.
  - Queries that include:
    - `where("organisationId", "==", organisationIdFromClaims)`
- This design ensures that:
  - A user in **Organisation A** cannot see person data for **Organisation B**, even if they guess or obtain another org’s ID.
  - The **backend audit function** (`onAuditEventCreated`) also uses the claims‑derived `organisationId`, so audit entries are correctly scoped and cannot be forged across organisations.

---

## 4. Pass Criteria for Stage 3

To consider Stage 3 verified, the following criteria must be met:

1. **Scoped Person List Only**
   - When a user with `organisationId = OrgA` signs in:
     - The `PatientListScreen` shows people whose records contain `organisationId = OrgA` only.
     - No entries from other organisations appear.
   - Attempted use of `listPatients` with an `orgId` that does not match the user’s claim results in an error and no data is returned.

2. **Audit Log – VIEW / PATIENT Events**
   - When the patient list is displayed:
     - The `auditService.logEvent()` function is called with:
       - `action = AUDIT_ACTIONS.VIEW`
       - `entityType = AUDIT_ENTITIES.PATIENT`
     - The `onAuditEventCreated` Cloud Function:
       - Confirms `context.auth` is present.
       - Derives `organisationId` and `userId` from claims and auth context.
       - Writes an append‑only record to `auditLog`.
   - When the user clicks “View Summary” for a person:
     - Another VIEW / PATIENT audit event is created, even if no clinical content is shown.

3. **Clinical Sub‑Collections Remain Locked (Default Deny)**
   - The `careFolder` sub‑collection under each person:
     - Remains protected by default deny rules (no new read rules introduced at Stage 3).
     - Is not queried or displayed by `PatientListScreen`.
   - No code path in Stage 3 reads or renders:
     - Care plans, clinical notes, incidents, or documents.

---

## 5. Verification Activities

- **Code Review**:
  - Confirm that:
    - `listPatients` checks the `orgId` parameter against the claims‑derived `organisationId`.
    - All Firestore queries for person data include `where("organisationId", "==", organisationIdFromClaims)`.
    - No Stage 3 code references `careFolder`, incidents, or other clinical collections.
- **Functional Tests**:
  - Sign in as a user in `OrgA` and load `/patients`:
    - Confirm only people from `OrgA` are listed.
  - Attempt to manipulate the client to call `listPatients("OtherOrg")`:
    - Confirm that the service rejects the request and no data is returned.
  - Trigger “List” and “View Summary” actions:
    - Confirm corresponding VIEW / PATIENT entries appear in `auditLog` via backend inspection tools.
- **Security Tests**:
  - Confirm that attempts to access `careFolder` from the client result in “permission denied” and that no UI code attempts such access during Stage 3.

---

## 6. Alignment with CQC and UK IG Expectations

- **Safety and Proportionality**:
  - Stage 3 extends access from non‑clinical metadata to basic person‑identifiable information, but:
    - Keeps clinical content locked.
    - Ensures only those within the same organisation can see the list.
  - This supports CQC’s expectation that access is **role‑ and organisation‑based** and that data exposure is **proportionate to current use**.
- **Accountability**:
  - Every view of the patient list or a person summary is recorded in the audit log with:
    - Who (userId),
    - What (VIEW / PATIENT),
    - When (server timestamp),
    - Where (organisationId, optional serviceId).
  - This meets CQC’s requirement to show “who did what, when” and supports internal investigations.
- **Data Minimisation**:
  - Only `firstName`, `lastName`, `status`, and `serviceId` are fetched.
  - No unnecessary attributes (DOB, NHS number, full care folder) are returned or displayed at this gate.

---

## 7. Sign‑Off

This Stage 3 verification document must be reviewed and signed off by:

- **Registered Manager or Equivalent Responsible Person**  
  - Name: ___________________________  
  - Role: ____________________________  
  - Date: ____________________________  
  - Signature: _______________________  

- **Technical Lead (Digital / IT / Firebase Lead)**  
  - Name: ___________________________  
  - Role: ____________________________  
  - Date: ____________________________  
  - Signature: _______________________  

Upon completion, this document forms part of the organisation’s formal CQC readiness and UK information governance evidence pack.

