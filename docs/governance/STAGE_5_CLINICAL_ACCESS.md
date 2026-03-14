# Stage 5 Enablement Gate – Clinical Content Read

**Digital CQC Readiness System – Firebase / React Application**

/** [ENABLEMENT GATE: STAGE 5 - CLINICAL READ ENABLED] */

*This document defines the Stage 5 Enablement Gate (“Clinical Content Read”) for the digital CQC readiness system. It describes how the system is allowed to display full clinical text (for example, Hospital Passport content, Care Plan goals, Risk Assessment details) while enforcing strict need‑to‑know access and high‑severity audit trails. Editing clinical content remains out of scope (Stage 6).*  

---

## 1. Purpose of Stage 5 – From Readiness Monitoring to Clinical Support

- **Before Stage 5**:
  - Stage 2: Non‑clinical metadata only (identity and organisation).
  - Stage 3: Basic person‑identifiable metadata (list of people for an organisation).
  - Stage 4: Care folder readiness and status (Green/Amber/Red), without clinical content.
- **At Stage 5**:
  - The system becomes a clinical support tool in addition to a readiness tool:
    - Staff, managers, and admins may read the full text of key documents (e.g. Hospital Passport, Care Plan, Risk Assessment).
    - Inspectors may remain limited to metadata unless a separate “Inspection Mode” is explicitly enabled and governed.
  - All reads are read‑only; no editing or writing of clinical content is permitted at this gate.

This gate is about **care support and safety**: clinicians can see what has been recorded, but cannot yet change it via this system.

---

## 2. Need‑to‑Know and Role‑Based Enforcement

- **Roles permitted to read content**:
  - `staff`, `manager`, `admin`:
    - May view full document content for people and services within their scope (organisationId and serviceIds).
  - `inspector`:
    - By default, restricted to metadata (presence, status, review dates).
    - Full content access for inspectors is only allowed under a separately governed “Inspection Mode” that:
      - Is explicitly toggled and logged.
      - Has its own governance and verification document.
- The access model enforces **need‑to‑know**:
  - Role check: only authorised clinical roles can call content read functions.
  - Scope check: content is only returned if the user’s claims (organisationId, serviceIds) match the person and document being requested.
  - Stage 5 services reject any request where:
    - The role is not one of the permitted roles, or
    - The organisation or service context does not match.

---

## 3. Privacy Impact and Bulk‑Read Protection

- Clinical content is sensitive:
  - Documents may include detailed health information, family context, risks, and preferences.
  - Stage 5 introduces a heightened privacy risk if misused (e.g. bulk download or mass viewing).
- Controls to prevent unauthorised bulk‑reading:
  - Service‑layer design:
    - Content reads are document‑level, not multi‑document bulk endpoints.
    - There is no “export all clinical documents” API at Stage 5.
  - UI design:
    - Clinical content is displayed only in focused views (e.g. `ClinicalDocumentViewer`), one document at a time.
    - The main dashboard and list views remain metadata‑only (no clinical text).
  - Audit:
    - Every content view is logged as a high‑severity event with:
      - userId, role, organisationId, patientId, documentId, and timestamp.
    - This creates a strong deterrent against inappropriate mass viewing.

---

## 4. Verification Plan and Pass Criteria

To pass the Stage 5 gate, the following must be verified:

1. **Inspector Role Cannot See Content Field**
   - With `role = inspector`, attempts to use content read functions (e.g. `getDocumentContent`) should:
     - Be blocked at the service layer or return metadata‑only objects without the `content` field.
     - The UI must not render clinical text for inspector‑only users, unless “Inspection Mode” (separately governed) is engaged.
   - Tests:
     - Sign in as inspector; navigate to care folder lists and attempt to open documents.
     - Confirm no clinical text is displayed and that only status/metadata is shown.

2. **Clinical Reads Are Fully Audited**
   - For each content view:
     - The audit service (`logEvent`) is called with:
       - `action = AUDIT_ACTIONS.VIEW_CONTENT` (or equivalent high‑severity VIEW),
       - `entityType = AUDIT_ENTITIES.DOCUMENT`,
       - `entityId = docId`,
       - plus any relevant contextual metadata (e.g. patientId).
     - The Cloud Function `onAuditEventCreated`:
       - Derives organisationId and userId from claims.
       - Records the event in `auditLog` with a clear indication that it was a content read.
   - Tests:
     - Manually open several documents as a staff/manager user and confirm corresponding audit entries in `auditLog`.

3. **User Warning for Clinical Content Access**
   - The clinical viewer displays a clear warning, such as:
     - “You are accessing clinical content. This action is logged for safeguarding.”
   - Tests:
     - Confirm that this warning appears consistently whenever clinical text is shown.

---

## 5. Alignment with CQC and UK IG Expectations

- **CQC (Caring, Safe, Well‑Led)**:
  - Caring:
    - Clinicians can access accurate, up‑to‑date information to support care decisions.
  - Safe:
    - Only those with the right role and scope can see clinical text.
    - Strong audit trails deter and detect misuse.
  - Well‑Led:
    - Leaders and inspectors can see how access to clinical content is controlled and monitored.
- **UK Information Governance**:
  - Access is purpose‑limited (care support, not curiosity or analytics).
  - Access is proportionate (person‑ and document‑level, not bulk).
  - Accountability is enhanced through detailed audit logging of content reads.

---

## 6. Sign‑Off

This Stage 5 clinical access gate must be reviewed and signed off by:

- **Registered Manager or Equivalent Responsible Person**  
  - Name: ___________________________  
  - Role: ____________________________  
  - Date: ____________________________  
  - Signature: _______________________  

- **Caldicott Guardian / Data Protection Officer (or equivalent)**  
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

