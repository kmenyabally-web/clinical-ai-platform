# Firestore Security Rules: Pre-Deployment Security Review

**Formal Review Record for a Regulated Digital CQC Readiness System**

*This document records the review of the Firestore security rules file against the agreed access intent, guardrails, and conceptual rule behaviour. It confirms what the rules protect, verifies alignment with the agreed behaviour, identifies risks or ambiguities, and states the approval decision. It does not contain code or rule syntax. Plain English only. It serves as the formal pre-deployment security review record.*

---

## 1. Overview of the Rules

### What the Rules Do at a High Level

- The rules control who can read and who can write data in the structured store (Firestore) used by the digital CQC readiness system. They apply to four main areas: organisation-level information (organisation identity, registered locations), service-level information (service identity and type), person-level information (person identity and the care folder under each person), and the audit log (who did what, when). For each request to read or change data, the rules check whether the person making the request is signed in, what role they have, and whether the data they are asking to see or change is within the scope they are allowed to access (their organisation and their service or services). Access is only allowed when the request clearly meets these conditions; otherwise it is refused.

- The rules rely on the identity and role information held in the user’s sign-in token (organisation, list of services they can access, and a role such as staff, manager, admin, or inspector). They do not decide who is allowed to sign in; they only decide, for each request from an already signed-in user, whether that request is allowed for that data. So the rules act as the gatekeeper for the store: they enforce that only the right people can do the right things on the right data.

---

### What They Are Intended to Protect

- **Care data and confidentiality.** Person and care folder data may only be read or changed by users whose allowed services include the service that person belongs to. So a member of staff in one service cannot see or change people or folders in another service unless their token explicitly includes that service (for example they are a manager for both). That protects need-to-know and prevents cross-service data leakage.

- **Inspection evidence.** Users with the inspector (read-only) role can read the same organisation, service, person, and folder data that a manager could see in an inspection context, but they cannot create, update, or delete anything. So inspectors can view evidence but cannot alter it, which protects the integrity of the record during and after inspection and supports what CQC expects.

- **Audit and accountability.** The audit log may not be created, updated, or deleted by any user from the client. Only a secure server process (for example a Cloud Function using Admin SDK) can add new audit entries when recording a user’s action. So the record of “who did what, when” cannot be edited or removed by users, which protects traceability and accountability.

- **Critical evidence and structure.** No user can delete organisation, service, or person records, or delete care folder content. So critical evidence (and the structure that holds it) cannot be removed by normal users. Deletion is refused at the store even if the application attempted it.

- **Unauthenticated access.** Every allowed read or write requires a signed-in user. There is no path that allows access without the request being tied to a known user. That protects against open or anonymous access and ensures that all allowed actions can be attributed.

---

## 2. Default Deny Verification

### Access Is Denied by Default

- **Confirmed.** The rules include an explicit “default deny” that applies to every path: any request that does not match a more specific rule is refused. So the starting position is “no access.” New or unknown paths (for example a new collection or a typo in the path) are not accessible until a rule explicitly allows them. That matches the agreed principle that the system must fail safe for regulated care data.

---

### All Access Is Explicitly Granted

- **Confirmed.** Read and write are only allowed where a specific rule states the condition (for example “user can read this organisation if their organisation matches,” “user can update this person if the person’s service is in the user’s allowed services”). There is no blanket “all signed-in users can read” or “all managers can write everywhere.” Each type of data (organisation, service, person, care folder, audit) has its own conditions for who can read and who can create or update, and delete is explicitly refused for organisation, service, person, care folder, and audit. So access is granted only where explicitly required, which supports governance and the ability to explain to inspectors how access is controlled.

---

### Why This Matters for Regulated Care Data

- Regulated care data must be need-to-know and role-based. Default deny and explicit grant ensure that the store does not accidentally expose or allow changes to data that the user should not see or change. If the default were “allow,” a new or forgotten path could become accessible to everyone until someone added a rule. With default deny, unknown paths stay protected until the organisation deliberately opens access. That reduces the risk of misconfiguration and supports data protection and CQC expectations.

---

## 3. Role and Access Verification

### Separation Between Staff, Managers, and Inspectors

- **Staff and managers.** The rules do not distinguish by the exact role label “staff” versus “manager” for reading or updating person and care folder data. They distinguish by **scope**: the user’s token must include the organisation and the list of services they can access. Staff typically have one service in that list; managers have one or more. So a user in Service A cannot read or write people in Service B unless their token includes Service B (as it would for a manager of both services). That correctly enforces separation by service. For **creating** organisations, only the admin role can create or update. For creating or updating services, only admin or manager can do so, and only within their organisation and for services they can access. For creating people, only admin or manager can do so, and only for services in their scope. So the separation between “who can change organisation,” “who can change service,” and “who can change person or folder” is correctly enforced by role (admin, manager) and scope (organisation, service list).

- **Inspectors.** The inspector role is explicitly identified and blocked from all write and delete. Any create, update, or delete condition includes a check that the user is not an inspector. So inspectors cannot create or update organisation, service, person, care folder, or audit data, and they cannot delete anything. Separation between inspectors and other roles is correctly enforced for writes and deletes.

---

### Read-Only Inspection Access

- **Confirmed.** Inspectors can read organisation, service, person, and care folder data when their token contains the matching organisation and service list (so they see the same scope a manager would in an inspection context). They can read the audit log when signed in. They cannot create, update, or delete any of that data. So read-only inspection access is correctly enforced: inspectors have read where scope matches and have no write or delete anywhere. That aligns with the agreed behaviour and with CQC expectations that inspectors view evidence only.

---

### No Cross-Service Data Leakage

- **Confirmed.** Reading or writing service data is allowed only when the service in the path is in the user’s list of allowed services. Reading or writing person or care folder data is allowed only when the person’s service (stored on the person record) is in the user’s list of allowed services. So a user whose token only contains Service A cannot read or write Service B’s data or any person or folder that belongs to Service B. Cross-service access is blocked unless the user’s token explicitly includes that service. That correctly enforces no cross-service data leakage without authority.

---

## 4. Write and Delete Protection

### Deletion of Audit or History Records

- **Confirmed.** The rules refuse create, update, and delete for the audit log for all client requests. No user role can add, change, or remove audit entries through the rules. The comments state that only a secure server process (for example a Cloud Function using Admin SDK) should create audit entries; such a process operates outside these client-side rules. So deletion and modification of audit or history records by users are correctly prevented.

---

### Modification of Inspection Evidence

- **Confirmed.** Inspectors have no create, update, or delete permission on any collection. So they cannot modify organisation, service, person, care folder, or audit data. Inspection evidence cannot be altered by the inspector role; even if the application sent a write request by mistake, the rules would refuse it. That correctly prevents modification of inspection evidence by inspectors.

---

### Silent or Unauthorised Edits

- **Attribution.** The rules ensure that only signed-in users can write: every write condition requires the user to be authenticated and (for non-audit data) to be in scope. So there is no path for an anonymous or unidentified user to change data. That supports attribution: any change that is allowed can be tied to a known user, and the application is responsible for writing an audit entry when it performs the change. The rules do not themselves write audit entries; they only ensure that the only writes that succeed are those that the application can attribute to a user and can therefore record in the audit log. So the rules correctly support “no silent edits” by ensuring that no unauthenticated or out-of-scope write can succeed.

- **Unauthorised edits.** Unauthorised edits are prevented by the same scope checks: a user can only update organisation, service, person, or care folder data when their role and their organisation and service list allow it. So silent or unauthorised edits are correctly prevented at the store.

---

## 5. Audit and Traceability Assurance

### All Actions Are Attributable

- **Confirmed.** No write (create or update) is allowed without the request being authenticated. So every change that goes through the rules is tied to a signed-in user. The application can record that user’s identity when it writes an audit entry (via the server process that appends to the audit log after the user’s action). The rules do not allow users to write directly to the audit log, so users cannot forge or remove audit entries. So the rules ensure that all client-driven actions are attributable to a user and that the audit trail is only extended by a controlled process, which supports “all actions are attributable.”

---

### History Cannot Be Tampered With

- **Confirmed.** The audit log cannot be updated or deleted by any user under these rules. So once an audit entry exists, no client request can change or remove it. History is therefore protected from tampering by users. The only way to add to the audit log is via a server process that bypasses these rules (for example Admin SDK), which the organisation must control and use only to append entries when recording a user action. So the rules correctly ensure that history cannot be tampered with by users.

---

## 6. Risk or Ambiguity Identification

### Audit Log Read Scope

- **Observation.** The rules allow any signed-in user to read any document in the audit log. The agreed behaviour document states that scope for audit read may be enforced by the application (for example the application only queries entries for the user’s service or their own actions). So the rules do not restrict *which* audit entries a user can read; they only require that the user is signed in. If the application does not restrict its queries, a staff member could in principle read the entire audit log, not only their own actions or their service’s entries. **Clarification recommended:** The organisation should confirm that the application will only request audit entries that are within the user’s permitted scope (for example by service or by person), and that this is documented and tested. The rules themselves are consistent with the conceptual behaviour (“scope enforced by query filters in app”) but depend on the application to enforce that scope for audit read.

---

### Role and Token Assumptions

- **Observation.** The rules treat “inspector” as the only role that is explicitly blocked from writes. All other authenticated users who have the right organisation and service list can read and write within that scope. The rules do not check that the role is exactly “staff,” “manager,” or “admin”; they only check that the user is not an inspector for write, and that the user is admin or manager where the intent requires it (organisation create/update, service create/update, person create). So if a user had a role value that is not one of the four (for example a typo or a future role), they could still read and write person and care folder data as long as their token had the right organisation and service list. **Clarification recommended:** The organisation should ensure that only recognised roles (staff, manager, admin, inspector) are set in user tokens, and that the process for setting tokens and service lists is governed so that no one is given a broad scope in error. The rules are correct for the intended roles but rely on correct token issuance.

---

### Server-Side Audit Write

- **Observation.** The rules deny all client-side create to the audit log. So audit entries can only be added by a process that does not use these rules (for example a backend using the Admin SDK). The organisation must have (or implement) such a process and ensure that it runs only when recording a real user action, and that it includes who, when, and what in each entry. **Clarification recommended:** Before go-live, the organisation should confirm that the server-side audit write is implemented, tested, and that it is the only way audit entries are created. If audit were written by the client in a future version, the rules would need to be changed; as they stand, they correctly enforce “no user creates audit directly.”

---

### No Other Unclear Logic or Over-Permission Identified

- No further unclear logic or obvious over-permission has been identified. Organisation, service, person, and care folder access are scoped by organisation and service list. Delete is refused everywhere it is required. Inspector write is refused everywhere. The structure of the rules matches the agreed collection structure and the intent described in the foundation documents.

---

## 7. Approval Decision

**Approved with required conditions**

The rules correctly implement the agreed behaviour: default deny, explicit grant, organisation and service separation, read-only inspection access, no user create/update/delete of the audit log, no cross-service access without authority, and authentication required for all access. They are suitable for deployment from a security and compliance perspective **provided** the conditions in section 8 are met and the clarifications are agreed and documented.

---

## 8. Conditions or Required Changes

The following are **conditions** that must be satisfied before or at deployment, and **clarifications** that should be documented. They are not changes to the rules file itself.

### Required Before or at Deployment

1. **Audit write process.** The organisation must have a secure server-side process (for example a Cloud Function or backend) that is the only way new audit entries are created. That process must run when a user action is recorded (document upload, content update, review completed, responsibility change, organisation or service change) and must store who, when, and what. This process must be in place and tested before the system is used for real care data, because the rules deliberately deny all client-side audit create.

2. **Custom claims and token issuance.** Every user who accesses the store must have their token populated with: role (staff, manager, admin, or inspector), organisationId, and serviceIds (the list of service IDs they can access). The process that sets these (for example Admin SDK or a trusted backend) must be governed so that only the correct role and scope are assigned. In particular, inspectors must have role set to inspector and must only be given the organisation and service list they are allowed to see during inspection.

3. **Application behaviour for audit read.** The application must only query the audit log for data that the user is permitted to see (for example by filtering by service or by user, in line with the access intent). The organisation should document this and verify it in testing, so that staff do not see other services’ audit entries unless the policy allows it.

### Recommended Clarifications (Document and Confirm)

4. **Role set.** Document that only the four roles (staff, manager, admin, inspector) will be used in the first build, and that the token-issuance process will not assign other role values. This avoids any ambiguity about who can write when they have the right scope.

5. **Admin read of care content.** The access intent states that administrators may need to see person identity and service assignment, and that whether they can read full care content is a policy choice. The current rules allow any user with the relevant service in their serviceIds to read person and care folder data. If the organisation’s policy is that admins should not routinely read full care content, the application (or token issuance) should restrict which data admins can request (for example by not giving admins serviceIds for routine use, or by the application not showing full folder content to admins). The rules do not need to change if the policy is enforced by token scope or by the application.

---

## 9. Summary

| Area | Finding |
|------|---------|
| **Overview** | Rules gatekeeper read/write by organisation, service, and person scope; protect care data, inspection evidence, audit, critical evidence, and require authentication. |
| **Default deny** | Confirmed: default deny in place; access only where explicitly granted. |
| **Role and access** | Confirmed: staff/manager separation by scope; inspector read-only; no cross-service leakage without authority. |
| **Write/delete protection** | Confirmed: audit create/update/delete denied to users; inspector cannot modify evidence; no delete of org/service/person/care folder; no silent or unauthorised edits. |
| **Audit and traceability** | Confirmed: all writes attributable to authenticated user; audit log not user-editable or deletable. |
| **Risks/ambiguity** | Audit read scope enforced by app (document and test); token and role issuance must be governed; server-side audit write must exist and be tested. No other unclear logic or over-permission identified. |
| **Decision** | Approved with required conditions. |
| **Conditions** | Implement and test server-side audit write; govern custom claims and token issuance; application to scope audit read; document role set and (if applicable) admin read policy. |

---

*This document is the formal pre-deployment security review record for the Firestore security rules of the digital CQC readiness system. It should be retained with the foundation and governance documents and used to confirm that conditions have been met before go-live.*

*Document version: 1.0 | Plain English only | No code.*
