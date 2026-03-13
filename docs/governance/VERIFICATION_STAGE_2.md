# Stage 2 Governance Verification Report  

**Digital CQC Readiness System – Firebase / Expo Application**  

*This report records the verification and assurance activities for the Stage 2 Enablement Gate (“Non‑Clinical Metadata Read Only”) for the digital CQC readiness system. It is intended to provide evidence to CQC inspectors, UK information governance teams, and other regulators that technical enforcement controls are in place and operating as designed before any access to clinical or care data is allowed.*  

---

## 1. Status Summary

- **Enablement Gate:** Stage 2 – Non‑Clinical Metadata Read Only.  
- **Technical Scope:** Identity and organisational context only (role, organisationId, organisation display name). No access to people, care folders, incidents, or any clinical collections.  
- **Current Enforcement Status:**  
  - The Stage 2 gate is **technically enforced** in both the frontend application and the Firestore security rules.  
  - The `FirstSafeScreen` is now the **only post‑authentication screen** rendered by the application. It consumes the `useGovernance` hook and displays only: user email, role, and organisation name, together with a Stage 2 governance disclaimer.  
  - Clinical routes (patients, care plans, incidents, clinical notes, etc.) remain present in the codebase for later phases but are no longer reachable through the current navigation configuration.  
  - The Firestore rules remain as reviewed and approved in `foundation-knowledge/Firestore-Security-Rules-Review.md`, including default deny, role‑based enforcement, organisationId scoping, and immutable audit logging.  

**Conclusion:** Stage 2 is active, enforced, and has been verified through targeted tests of identity and scope, data boundary enforcement, and audit trail integrity, as described below.

---

## 2. Test Case 1 – Identity & Scope Verification

### 2.1 Objective

Confirm that the application correctly obtains the user’s identity and organisation scope from Firebase Authentication custom claims, and that the UI reflects this scope without allowing unscoped or ambiguous access.

### 2.2 Verification Method

- The verification is based on the logic implemented in:
  - `app/src/services/authService.js` (`getUserContext()`), and  
  - `app/src/hooks/useGovernance.js`, consumed by `app/src/components/FirstSafeScreen.js`.  
- The `getUserContext()` function:
  - Calls `auth.currentUser.getIdTokenResult(true)` to force a fresh token.  
  - Extracts `role`, `organisationId`, and `serviceIds` from the custom claims.  
  - Throws a “Governance Context Missing” error if `organisationId` is absent, preventing any data read attempts without an organisation scope.  
- The `useGovernance()` hook:
  - Calls `getUserContext()` and surfaces this information to the UI as a safe, non‑clinical governance context.  
  - On success, it returns `isAuthenticated = true`, `userRole = role`, and `orgName` obtained from `getOrgDisplayName(organisationId)`.  
  - On governance failure (for example missing `organisationId`), it sets an error state and prevents any organisation read.  
- The `FirstSafeScreen`:
  - Uses `useGovernance()` to determine identity and scope.  
  - In the “ready” state, it displays:
    - The user’s email (from `auth.currentUser`),  
    - The user’s role, and  
    - The organisation name resolved via `organisationId` and the `organisations` collection.  
  - In the governance error state, it displays a prominent message:  
    **“Governance Violation: Access Restricted. Contact Administrator.”**  
    and does not attempt any data read beyond the failed context.

### 2.3 Pass Criteria

- **Criteria:**  
  1. For a correctly configured user (with `organisationId` in their custom claims), the UI must display the correct organisation name on the `FirstSafeScreen`.  
  2. If `organisationId` is null or missing, the system must not attempt any data reads and must present a governance‑error message.  

- **Observed Result:**  
  - When testing with a user whose custom claims include a valid `organisationId`, the `FirstSafeScreen` shows the expected organisation name (as stored in the `organisations` collection) alongside the user’s email and role, together with a “Governance Verified” badge.  
  - When simulating a user without an `organisationId` claim, `getUserContext()` throws a governance error; `useGovernance()` surfaces this, and the `FirstSafeScreen` displays the “Governance Violation: Access Restricted. Contact Administrator.” message without attempting any further reads.  

**Test Case 1 Verdict:** **PASS** – Identity and organisation scope are correctly enforced and visible to the user in a controlled, non‑clinical context.

---

## 3. Test Case 2 – Data Boundary Enforcement

### 3.1 Objective

Confirm that, at Stage 2, the application has **zero access** to clinical collections (such as people, care folders, or incidents) and that no clinical or care data is fetched or rendered.

### 3.2 Verification Method

- **Security Rules Reference:**  
  - Firestore security rules, as documented and approved in `foundation-knowledge/Firestore-Security-Rules-Review.md`, implement:
    - Default deny for all collections not explicitly covered.  
    - Role‑ and organisation‑scoped access rules for `organisations`, `services`, `people`, `people/{personId}/careFolder`, and `auditLog`.  
    - Explicit prohibition of client writes to `auditLog`.  
  - At Stage 2, no rules have been changed to allow any new read access to clinical data.
- **Application Code Review:**  
  - Navigation (`app/src/App.jsx`) has been refactored so that, after authentication, the only reachable route is the root path `/`, which renders `FirstSafeScreen` inside `ProtectedRoute`.  
  - Clinical routes (`/patients`, `/incidents`, `/clinical-notes`, `/care-plans`, etc.) are no longer reachable; they remain in the codebase for later gates but are not part of the active router configuration at Stage 2.  
  - No new services have been created for `people`, `careFolder`, or `incidents` as part of Stage 2. All Stage 2 services are limited to:
    - `authService` (custom claims),  
    - `organisationService` (organisation name only),  
    - `auditService` (no‑op stub), and  
    - `useGovernance` (hook combining identity and organisation context).  
- **UI Behaviour Review:**  
  - `FirstSafeScreen` displays only:
    - User email,  
    - User role, and  
    - Organisation name.  
  - It includes a footer stating:  
    **“System Operating under Stage 2 Governance: Non‑Clinical Metadata Read Only. No PHI/Clinical Data Accessible.”**  
  - There are **no buttons, tabs, or links** to “Patients,” “Care Plans,” “Incidents,” or any other clinical modules.

### 3.3 Pass Criteria

- **Criteria:**  
  1. No Firestore queries for clinical collections (people, care folders, incidents) are executed by the Stage 2 UI.  
  2. No clinical or care data is displayed on the `FirstSafeScreen` or any other reachable screen.  

- **Observed Result:**  
  - Review of the Stage 2 code confirms that the only live Firestore reads at this stage are to the `organisations` collection (for name), scoped by `organisationId`.  
  - Static analysis of the `FirstSafeScreen` confirms that it does not invoke any services related to people, care folders, incidents, or clinical notes.  
  - Manual use of the application in Stage 2 configuration shows no clinical data or clinical navigation elements on any reachable screen.

**Test Case 2 Verdict:** **PASS** – Data boundary enforcement at Stage 2 ensures zero access to clinical collections and zero display of clinical data.

---

## 4. Test Case 3 – Audit Trail Integrity

### 4.1 Objective

Confirm that, at Stage 2, the client does not write to the audit log and that all audit events remain **backend‑only**, in line with the approved audit model and Firestore rules.

### 4.2 Verification Method

- **Security Rules Reference:**  
  - As documented in `foundation-knowledge/Firestore-Security-Rules-Review.md`, Firestore rules for the `auditLog` collection explicitly deny all client‑side writes. Only trusted backend processes (e.g. Admin SDK / Cloud Functions) are permitted to append audit entries.  
- **Service Layer Review:**  
  - `app/src/services/auditService.js` has been refactored to a Stage 2‑compliant placeholder that contains only:
    - A clear header and comment warning that direct client‑side writes to `auditLog` are prohibited at Stage 2.  
    - A `logAppInitStub()` function that **does not** write anything to Firestore and simply returns a resolved Promise.  
  - All previous client‑side audit write logic has been removed from the Stage 2 path. There is no remaining call in the Stage 2 UI to any function that writes to `auditLog`.  
- **UI Review:**  
  - `FirstSafeScreen` and `useGovernance` do not call any audit logging functions.  
  - No component reachable in Stage 2 attempts to create or update audit records directly from the client.

### 4.3 Pass Criteria

- **Criteria:**  
  1. Firestore rules must deny all client‑side writes to `auditLog`.  
  2. The Stage 2 client code must not contain any operational path that writes to `auditLog`.  

- **Observed Result:**  
  - Firestore security rules remain unchanged from the approved `Firestore-Security-Rules-Review.md` and continue to block client writes to the audit collection.  
  - The Stage 2 `auditService.js` is a no‑op stub and does not reference Firestore. No other client code attempts to write to `auditLog`.  

**Test Case 3 Verdict:** **PASS** – Client‑side audit writes are disabled at Stage 2; all audit events remain backend‑only, consistent with the approved audit model.

---

## 5. Cross‑Reference to Security Rules Review

- The enforcement behaviour described in this report is consistent with, and directly supported by, the Firestore security rules review recorded in:  
  - `foundation-knowledge/Firestore-Security-Rules-Review.md`  
- That document:
  - Defines the default deny posture.  
  - Confirms correct role and scope enforcement (organisation/service separation; inspector read‑only).  
  - Confirms the immutability and client‑write prohibition for the audit log.  
- The Stage 2 verification activities described here build on that earlier review by demonstrating that the **frontend and service layer** now **respect and operationalise** those reviewed rules and that no new paths have been introduced that would undermine them.

---

## 6. Sign‑Off

This Stage 2 Governance Verification Report has been reviewed and accepted by the following roles:

### 6.1 Registered Manager (or Equivalent Responsible Person)

- **Name:** _______________________________  
- **Role/Title:** __________________________  
- **Date:** _______________________________  
- **Signature:** __________________________  

### 6.2 Technical Lead (Digital / IT / Firebase Lead)

- **Name:** _______________________________  
- **Role/Title:** __________________________  
- **Date:** _______________________________  
- **Signature:** __________________________  

---

*On completion of the above sign‑off, this document forms part of the organisation’s formal evidence pack for CQC inspection and UK information governance assurance, showing that technical enforcement for the Stage 2 Enablement Gate has been verified prior to any live or expanded data access.*  

# Stage 2 Governance Verification Report  
