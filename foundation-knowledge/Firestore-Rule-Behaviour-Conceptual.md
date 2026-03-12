# Conceptual Firestore Rule Behaviour Description

**Plain-English Definition of How Security Rules Must Behave for a Digital CQC Readiness System**

*This document translates the agreed access intent into a description of how Firestore security rules must behave. It states what the rules must allow, what they must deny, and how they must support audit and traceability. It is not a security rules file. It does not contain rule syntax or code. Plain English only. It defines the intended behaviour of the rules before implementation.*

---

## 1. Purpose of Firestore Rules

### Why Firestore Rules Exist in This System

- **Rules are the gatekeeper for the store.** When the application (or any client) asks to read or write data in Firestore, the request is checked against a set of rules before it is allowed or refused. The rules decide: is this request from someone who is allowed to do this action on this data? If yes, the request proceeds; if no, the request is refused. So the rules are what **enforce** the access intent: they are the last line of defence between the user (or the application acting for the user) and the data. Without rules, or with rules that are too loose, anyone who could reach the store could read or change anything. With rules that match the access intent, only the right people can do the right things.
- **Rules protect the store even if the application is wrong.** The application should only send requests that the user is allowed to make (for example it should not show an inspector an “edit” button). But the application could have a bug, or could be tampered with, or a user could try to bypass the application and talk to the store directly. The rules run in the store and check every request regardless of where it came from. So even if the application mistakenly tried to send “update this care plan” on behalf of an inspector, the rules would refuse it because the inspector is not allowed to write. That defence in depth supports safety and compliance.

---

### What Risks the Rules Are Designed to Prevent

- **Wrong person seeing care data.** A member of staff in one service must not see the people or care folders for another service unless they have an explicit role that covers it. The rules must prevent read access to data that is outside the user’s organisation, service, or assigned people. That prevents confidentiality breaches and need-to-know violations.
- **Wrong person changing care data.** Only staff, key workers, clinicians, and managers (for the people and services they are allowed to support) should be able to add or update care content, complete reviews, or change responsibility. Inspectors must never be able to write. The rules must refuse any write or update from a user who does not have the right role or the right scope (service, person). That prevents unauthorised changes and protects the integrity of the record.
- **Deletion of critical evidence or audit.** No user should be able to delete incident reports, safeguarding records, complaint records, or signed-off content, or to edit or delete the audit log. The rules must block delete (or restrict it to allowed cases such as “archive” where the organisation has defined it) for critical record types and must block all user write and delete to the audit log. That prevents destruction of evidence and protects accountability.
- **Silent or untraceable changes.** Every change should be attributable to a signed-in user and recorded in the audit log. The rules cannot by themselves create audit entries (the application does that), but the rules must ensure that only authenticated users can write and that write access is only given to roles that the application can then associate with an audit entry. So the rules support traceability by ensuring that no anonymous or unidentified request can change data.
- **Unauthenticated access.** No one should be able to read or write care data, organisation data, service data, or audit data without being signed in and identified. The rules must refuse any request that is not associated with an authenticated user (or with a defined, governed system process). That prevents open access and ensures that every action can be tied to a known user.

---

## 2. Default Deny Principle

### No Access Is Allowed by Default

- **The starting position is: refuse.** When a request to read or write data arrives, the rules must treat it as **not allowed** unless it explicitly matches a condition that says “this is allowed.” So the default is **deny**: if the request does not clearly qualify under the defined conditions (right role, right scope, right type of action), the request must be refused. There is no “allow by default” or “allow if we didn’t think to block it.” Every allowed path must be explicitly defined.
- **Why this is the rule:** If the default were “allow,” then any new type of data or any new path that was added to the store could accidentally be readable or writable by everyone until someone added a rule to block it. That would be unsafe for care data. With default deny, any new or forgotten path is **not** accessible until a rule explicitly permits it. So the system fails safe: unknown or new data is protected until the organisation deliberately opens access.

---

### Access Is Only Granted Where Explicitly Permitted

- **Each allowed case must be stated.** Read access is granted only where the rules say “a user with this role, in this scope (organisation, service, or person), can read this type of data.” Write access is granted only where the rules say “a user with this role, in this scope, can create or update this type of data.” Delete is either not granted at all for critical data and audit, or is granted only for specific cases (for example “archive” or “mark as superseded”) if the organisation has defined them. So there is no blanket “all signed-in users can read” or “all managers can write anywhere”; each permission is explicit and scoped.
- **Why this matters for regulated care data:** Care data is sensitive and is subject to data protection and CQC expectations. Access must be need-to-know and role-based. Explicit permission means that the organisation can point to the rules and say “we only allow read for this role in this scope; we only allow write for that role in that scope.” That supports governance, inspection readiness, and the ability to demonstrate that access is controlled. It also reduces the risk of a misconfiguration that opens access too widely: if every allowed case is explicit, there is no “everything else is allowed by default.”

---

## 3. Read Access Behaviour

The following describes **who can read what** from the store. The rules must allow read only when the request matches these conditions; otherwise they must deny.

---

### Who Can Read Organisation-Level Information

- **Allowed:** Any user who is signed in and has a role that needs to see organisation information (frontline staff, key workers, clinicians, managers, inspectors, administrators) may read the organisation record(s) that their role is scoped to. In the first build there is typically one organisation; the rules must allow read for that organisation’s data when the user is authenticated and belongs to that organisation (or when the system has a single organisation and all users belong to it). Administrators may read organisation data to maintain it. Inspectors may read it when they are shown the system so they can see which organisation they are inspecting.
- **Behaviour the rules must enforce:** Read of organisation data is allowed only when the request is from an authenticated user and (where the system supports multiple organisations) the user’s organisation matches the organisation data being read. Read must be denied for unauthenticated requests and (in a multi-organisation setup) when the user’s organisation does not match.

---

### Who Can Read Service-Level Information

- **Allowed:** Frontline staff, key workers, and clinicians may read the service(s) they are assigned to (the service or services they work in). Managers may read the service(s) they manage. Inspectors may read the service(s) they are being shown (typically the same set a manager could see for the inspection context). Administrators may read all services for the organisation(s) they administer. In all cases, read must be scoped: a user in Service A must not be able to read Service B’s data unless they have a role that explicitly includes Service B (for example a manager for both services).
- **Behaviour the rules must enforce:** Read of service data is allowed only when the request is from an authenticated user and the user’s assigned service(s) (or manager service(s)) include the service whose data is being read. Read must be denied when the user has no assignment to that service, and must be denied for unauthenticated requests.

---

### Who Can Read Person-Level Information

- **Allowed:** Frontline staff, key workers, and clinicians may read the people (and their care folders) that they are allowed to support: typically the people in their service, or the people assigned to them, depending on how the organisation configures assignment. Managers may read all people in the service(s) they manage and the full care folder for each. Inspectors may read the same person and folder data that a manager could read for the inspection context (organisation, service, people list, folders, sections, document types, content, dates, status, references to uploaded files)—but only read; they must not be able to write. Administrators may read person identity and service assignment for support or governance; whether they can read full care content is a policy choice and, if allowed, should be scoped and logged. In all cases, a user must not read a person’s data if that person belongs to a service the user is not allowed to see.
- **Behaviour the rules must enforce:** Read of person and care folder data is allowed only when the request is from an authenticated user and the user’s role and scope (service, assigned people) include the person whose data is being read. For inspectors, read is allowed for the same scope a manager would have (so they can see the evidence) but must be combined with a total ban on write and delete for that role (see section 4 and 5). Read must be denied when the user has no authority to see that person (for example staff in Service A requesting a person in Service B), and must be denied for unauthenticated requests.

---

### How Inspection or Read-Only Access Works

- **Inspector or read-only role: read allowed, write and delete denied.** The rules must treat the inspector (or read-only) role as follows: allow **read** for the same organisation, service, and person data that a manager could read in the inspection context (so the inspector can see the folder, the documents, the emergency summary, the audit log). Allow **no** create, update, or delete for any data: organisation, service, person, care folder, or audit. So the rules must explicitly grant read for that role and explicitly deny all write and delete for that role. There must be no path where an inspector can create, update, or delete any record.
- **Behaviour the rules must enforce:** For requests that are identified as coming from an inspector (or read-only) role, the rules must allow read where the scope matches (organisation, service, people they are being shown) and must refuse every create, update, and delete. This must hold for every collection and every type of data: care content, organisation, service, person, and audit. So inspection access is “read only” enforced at the store: even if the application sent a write request by mistake, the rules would refuse it.

---

## 4. Write and Update Behaviour

The following describes **who can create and update** data. The rules must allow write or update only when the request matches these conditions; otherwise they must deny. Separate behaviour applies to the audit log (see section 6).

---

### Who Can Create New Records

- **Organisation:** Only administrators (or the role the organisation defines for maintaining organisation information) can create a new organisation record. The rules must deny create for all other roles.
- **Service:** Only managers or administrators can create a new service record (for the organisation and service scope they are allowed to manage). The rules must deny create for frontline staff, key workers, clinicians, and inspectors.
- **Person:** Only managers or administrators (or a role the organisation defines for adding people) can create a new person record and associate them with a service. The rules must deny create for frontline staff, key workers, and clinicians for person-level creation (they add content to existing people’s folders; they do not typically create the person record itself unless the organisation has defined that). Inspectors must never create any record.
- **Care folder content (under a person):** Frontline staff, key workers, clinicians, and managers can create new content (for example a new care plan entry, a new document reference, a new section or document type entry) **only for the people they are allowed to support** and only within the scope of their role. The rules must allow create only when the user is authenticated, has a role that can create that type of content, and the person (or service) being written to is within the user’s scope. The rules must deny create when the user is an inspector or when the user’s scope does not include that person or service.
- **Audit log:** No user role can create audit entries directly. Only the application (or a trusted server process) can create new audit entries, and only when it is recording an action that has just been performed by a signed-in user. The rules must deny create of audit entries for normal user roles; they may allow create only for a designated application or server identity that is used when the application writes an audit entry after a user action. So “who can create” for audit is: the application, on behalf of a user whose action is being recorded; not the user themselves writing into the audit log.

---

### Who Can Update Existing Records

- **Organisation:** Only administrators (or the defined role) can update organisation data. The rules must deny update for all other roles, including managers and inspectors.
- **Service:** Only managers or administrators (for the service they are allowed to manage) can update service identity and type. The rules must deny update for frontline staff, key workers, clinicians, and inspectors. Compliance summary updates may be done by the application (or a governed process) when folder status changes; if so, the rules may allow that under a defined application identity, not under a normal user.
- **Person and care folder:** Frontline staff, key workers, clinicians, and managers can update person-level data (for example responsibility) and care folder content (care plan text, dates, document references, status) **only for the people they are allowed to support**. The rules must allow update only when the user is authenticated, has a role that can update that type of data, and the person (or service) being updated is within the user’s scope. The rules must deny update for inspectors in all cases. The rules must also enforce any restriction on **what** can be updated: for example critical evidence (incidents, safeguarding, complaints) may be update-restricted so that only certain actions (e.g. “add amendment” or “mark as superseded”) are allowed, not arbitrary overwrite or delete.
- **Audit log:** No user can update (edit) any existing audit entry. The rules must deny update to the audit log for every user role. The only write to the audit log is **create** (append) by the application when recording a new action. So “update” for audit is never allowed for users; the rules must enforce that.

---

### What Updates Must Be Restricted

- **Audit records:** No user may update or delete any audit entry. The rules must deny update and delete for the audit collection (or the equivalent store for audit) for all user identities. Only the application identity that appends new entries may write to the audit log, and only to add new entries, not to change or remove existing ones.
- **Critical evidence:** Updates that would **delete** or **permanently overwrite** incident reports, safeguarding records, complaint records, or signed-off content must be denied. The organisation may allow “archive” or “mark as superseded” (which may be implemented as an update that adds a flag or a new version while keeping the original); the rules must block any update that would destroy or irreversibly remove that content. If the organisation does not implement archive or supersede in the first build, the rules may simply deny delete (and possibly deny update) for those document types or those sections.
- **Cross-scope updates:** A user must not be able to update data that belongs to another service or another organisation (unless they have a role that explicitly covers that scope). The rules must check that the record being updated (person, service, or organisation) is within the user’s allowed scope; if not, the update must be denied.

---

## 5. Hard Denials (Must Never Be Allowed)

The following actions must **always** be blocked by the rules. There is no normal case where these should be allowed. Implementing rules must ensure that these requests are refused regardless of how they are made.

---

### Deleting Audit History

- **What must be blocked:** Any request to **delete** an audit entry or to **update** (edit) an existing audit entry must be refused. No user role—frontline staff, key worker, clinician, manager, inspector, or administrator—may delete or edit the audit log. The only write to the audit log that is allowed is **adding** a new entry (by the application when it records an action). So the rules must deny delete and update for the audit collection for all user identities.
- **Why it is a hard denial:** The audit trail is the evidence of who did what and when. If users could delete or edit it, accountability would be lost and regulators would not trust the record. This is a non-negotiable guardrail; the rules must enforce it with no exception in normal operation.

---

### Modifying Data by Inspectors (Inspection Evidence)

- **What must be blocked:** Any request from a user who is identified as an **inspector** (or read-only role) to **create**, **update**, or **delete** any data in the store—organisation, service, person, care folder, or audit—must be refused. Inspectors can only read. So the rules must have an explicit check: if the request is from an inspector, and the operation is create, update, or delete, then deny. No path should allow an inspector to modify any evidence.
- **Why it is a hard denial:** Inspectors must view evidence only; they must not change it. Allowing any write from an inspector would breach regulatory expectation and could allow accidental or deliberate alteration of the record during inspection. The rules must make modification by inspectors impossible.

---

### Cross-Service Data Access Without Authority

- **What must be blocked:** Any request to **read** or **write** person data (or care folder data) or service data that **belongs to a service the user is not allowed to access** must be refused. For example: a user who is only assigned to Service A must not be able to read or write people or folders for Service B. The rules must check that the data being accessed (by organisation and service) matches the user’s assigned organisation and service(s). If the user has no assignment to that service (and is not a manager or administrator for that service), the request must be denied.
- **Why it is a hard denial:** Need-to-know and confidentiality require that staff only see and change data for the people they support or their service’s people. Cross-service access without authority would breach that and could lead to inappropriate or unlawful access. The rules must enforce scope so that no user can reach another service’s data unless their role explicitly includes it.

---

### Unauthenticated Access

- **What must be blocked:** Any request that is **not** associated with an authenticated user (or with a defined, governed application or server identity) must be refused for all data: organisation, service, person, care folder, and audit. There must be no “guest” or “anonymous” read or write. The rules must require that every request is tied to a known identity (signed-in user or designated system identity).
- **Why it is a hard denial:** Without authentication, the system cannot enforce roles or record “who” in the audit trail. Unauthenticated access would be a serious data protection and safety risk. The rules must enforce that no request proceeds without a valid identity.

---

### Permanent Deletion of Critical Records

- **What must be blocked:** Any request to **permanently delete** incident reports, safeguarding records, complaint records, or the content of documents that have been signed off as the official record must be refused for normal user roles. The organisation may allow “archive” or “mark as superseded” implemented in a way that retains the original; the rules must block direct delete of those record types unless the organisation has defined a specific, tightly controlled exception (which is outside normal behaviour). For the first build, the simplest behaviour is: deny delete for the sections or document types that hold critical evidence, or deny delete for the entire care folder content and allow only updates that add or amend, not remove.
- **Why it is a hard denial:** Critical evidence must be retained for CQC, safeguarding, complaints, and legal purposes. Allowing deletion would destroy evidence and accountability. The rules must prevent users from deleting it in normal operation.

---

## 6. Audit and Traceability Enforcement

The rules cannot by themselves create audit entries; the application does that when it writes to the audit log after a user action. But the rules **must** ensure that the conditions for traceability are in place so that no change can happen without being attributable and so that the audit log is protected.

---

### Every Change Must Be Attributable

- **Only authenticated users can write (except audit append).** The rules must ensure that every request to create or update organisation, service, person, or care folder data is from an **authenticated user** (a known identity). So there is no “anonymous write”: if a request has no user identity, it must be denied. That way, every change that is allowed can be tied to a user, and the application can record that user in the audit log when it writes the audit entry. The rules support traceability by refusing any write that could not be attributed to a user.
- **Audit entries are written by the application, linked to the user’s action.** The application, when it processes a user action (for example “user X updated care plan”), writes both the update to the care folder and a new entry to the audit log (user X, action, time). The rules must allow the application to write to the audit log only in a way that is controlled (for example from a server or a designated application identity that is used only for that purpose), and must deny users writing directly to the audit log. So the only way audit entries appear is when the application adds them in response to a user action, which keeps “who did what” accurate and prevents users from forging or removing audit entries.

---

### No Silent Edits Must Be Possible

- **No write without identity.** A “silent edit” would be a change that happens without the system knowing who did it. The rules must prevent that by denying any write request that does not carry a valid user identity. So every allowed write is attributable; there is no path where data changes and no one is recorded as having done it.
- **No direct user write to audit.** If users could write to the audit log, they could add fake entries or omit to record an action. The rules must deny user write (create, update, delete) to the audit log so that the only way entries are added is by the application when it records a real user action. That prevents silent edits (changes with no audit entry) and prevents tampering with the audit trail.

---

### History Must Be Preserved

- **Audit log is append-only and protected.** The rules must deny update and delete to the audit log for all user roles. So once an audit entry is written, it cannot be changed or removed by users. History is preserved: the record of “who did what, when” remains intact. The only way to add to history is to append a new entry (by the application); the past cannot be rewritten.
- **Critical evidence is not deletable.** The rules must deny delete (and, where the organisation requires, deny overwriting) for incident reports, safeguarding records, complaint records, and signed-off content. So the history of what happened (incidents, complaints, and the official record) is preserved and cannot be removed by users. That supports CQC expectations and legal retention.

---

## 7. Handling Exceptional Access

Exceptional access (for example a designated person correcting a proven system error under authorisation) is outside normal role-based access. The following describes how the rules can support it **conceptually** without opening the door to abuse. The organisation may or may not implement exceptional access in the first build; if it does, the behaviour should be as below.

---

### How Exceptional Access Is Granted Conceptually

- **Not by relaxing the normal rules.** Normal rules enforce role and scope; they should not be “turned off” for one user. If the organisation allows exceptional access, it should be implemented in a **separate, controlled path**: for example a distinct role or identity that is only used when an exception has been authorised (e.g. “exception handler” or “data correction” role), and that can only perform the specific action that was authorised (e.g. update one record type, or correct one field). The rules would then allow that role to perform only that action, only on the scope that was authorised (e.g. one record, or one service), and only when the request carries a token or reference that indicates authorisation (if the system supports that). So exceptional access is **explicit** in the rules (a defined, narrow path), not “we allow this user to bypass the rules.”
- **Rare and time-limited.** If the organisation uses a separate role or identity for exceptions, that role should be used only when an exception is in progress and should be disabled or require re-authorisation after the action. The rules do not themselves “time-limit,” but the way the identity or role is issued (e.g. only after approval, only for a short window) should ensure that exceptional access is rare and controlled.

---

### Who Authorises Exceptions

- **Policy, not the rules.** The rules do not “know” who authorised an exception. The organisation’s process defines who authorises (e.g. information governance lead, DPO, senior manager). Authorisation happens **outside** the store: someone approves a ticket or a request, and then the person performing the exception uses the controlled path (e.g. the “exception handler” role or a one-time token). The rules only allow the **action** (e.g. “this role can update this type of record in this scope”); they do not encode “user X is authorised today.” So the rules support exceptional access by having a narrow, explicit path for it; the **who authorises** is a governance decision and is recorded in the organisation’s logs or tickets, not in the rules themselves.

---

### How Exceptions Are Logged

- **Every exception action must be recorded.** When an exception is used (e.g. a data correction), the action must be recorded: who performed it, when, what was changed, and (if the system supports it) the authorisation reference or ticket number. That may be written to the main audit log with a marker that it was an authorised exception, or to a separate exception log. The rules cannot write the log entry; the application (or the process that performs the exception) must write it. The rules’ role is to ensure that the only identity that can perform the exception action is one that is bound to this process (so that the “who” in the log is correct) and that normal users cannot perform that action. So traceability of exceptions is achieved by: (1) the application or process that performs the exception writes an audit or exception entry with who, when, what, and authorisation ref; (2) the rules ensure that only that process (and not normal users) can perform the exception action, so that “who” is unambiguous.

---

## 8. Summary

| Behaviour | What the rules must do |
|-----------|-------------------------|
| **Default** | Deny all access unless a condition explicitly allows it; no access by default. |
| **Read** | Allow read only for authenticated users and only for data in their scope (organisation, service, person); inspectors can read like managers but must have no write/delete. |
| **Write / update** | Allow create and update only for roles and scope that are permitted; organisation/service by admin/manager; person/folder by staff/key worker/clinician/manager for allowed people; audit: only application can append, no user update/delete. |
| **Hard denials** | Always deny: delete or edit audit; any create/update/delete by inspector; cross-service read/write without authority; unauthenticated access; permanent delete of critical evidence. |
| **Traceability** | Only authenticated users can write (so every change is attributable); only application can write audit (so no silent edits, no user tampering); audit and critical evidence protected from user update/delete (so history preserved). |
| **Exceptions** | If used: separate, narrow path (e.g. dedicated role/identity); authorisation outside the rules; every exception action logged with who, when, what, authorisation ref. |

---

*This document defines the intended behaviour of Firestore security rules for the digital CQC readiness system. Implementers must translate this behaviour into actual rules using the platform’s rule syntax, and must test that the implemented rules match this description. It does not replace the need for a formal security review or for data protection compliance.*

*Document version: 1.0 | Plain English only | No rule syntax or code.*
