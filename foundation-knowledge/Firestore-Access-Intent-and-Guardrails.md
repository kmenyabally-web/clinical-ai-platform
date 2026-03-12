# Firestore Access Intent and Guardrails

**Plain-English Definition for a Digital CQC Readiness System**

*This document defines the access intent and non-negotiable guardrails for Firestore data in the digital CQC readiness system. It states who should be able to view and update each type of information, what must never be allowed, how read-only and inspection mode work, and how exceptions are handled. It is not a security rules document. It does not contain code or technical rule syntax. Plain English only. It is the authoritative access intent that future Firestore security rules must implement.*

---

## 1. Purpose of Access Intent Definition

### Why Access Intent Must Be Defined Before Writing Any Technical Rules

- **Technical rules must reflect policy, not the other way round.** The rules that control who can read or write data in Firestore are there to **enforce** what the organisation has already decided: who can see what, who can change what, and what must never be allowed. If those decisions are not written down first, the person writing the technical rules may guess or may implement something that does not match what the organisation needs for CQC, data protection, or safety. Defining access intent in plain English before any technical rules are written ensures that the rules implement a clear, agreed policy rather than an implicit or inconsistent one.
- **Stakeholders can agree without reading code.** Information governance leads, data protection officers, managers, and inspectors need to understand and agree how access works. They typically do not read or write security rules. A plain-English access intent document lets them review and sign off on “who can view organisation information,” “who can update a care plan,” and “inspectors must never be able to change anything” before a single technical rule is written. That supports governance and avoids the risk of rules being written that conflict with what the organisation thought it had agreed.
- **Rules can be tested against intent.** Once the access intent is defined, the technical rules can be written and then **tested** against it: “does the system allow a staff member to see only their service’s people?” “does the system block an inspector from updating a care plan?” Having a written intent makes it possible to verify that the implementation is correct and to demonstrate that to auditors or inspectors.

---

### How This Supports Safety and Inspection Readiness

- **Safety.** Care data must only be seen and changed by the right people. Wrong access (for example a member of staff seeing or changing another service’s people, or an inspector accidentally editing a record) could harm the person using the service or could undermine trust in the record. Defining access intent upfront and then implementing it in rules reduces the chance of wrong access and makes it clear what “right” looks like. Safety also depends on critical evidence (incidents, safeguarding, complaints) and the audit trail never being deleted or edited by normal users; the access intent states that explicitly so that the rules can enforce it.
- **Inspection readiness.** CQC expects the service to control access and to demonstrate accountability. Inspectors need to see evidence in read-only mode and need to be assured that they cannot change anything. The access intent document states that inspectors have read-only access and that the audit trail is append-only and protected. When the technical rules implement that, the service can show inspectors that access is controlled and that “who did what, when” is traceable. Having the intent in writing also supports the service’s ability to explain to CQC how the system is designed: “we defined who can do what before we built the rules; inspectors can only view.”

---

## 2. Conceptual User Roles

The following roles are **conceptual**: they describe responsibility and accountability. The technical system may map them to one or more role labels (for example “staff,” “manager,” “inspector”); the important point is that the access intent applies to these groups of people.

---

### Frontline Staff

- **Who they are:** People who deliver care and support day to day: support workers, care workers, and others who work directly with people using the service. They may or may not be the named key worker or responsible person for each person; they work within a service and need to see and update the care folder for the people they support or for their service’s people, in line with the organisation’s assignment (for example “all people in this ward” or “only people assigned to me”).
- **Responsibility:** To record care accurately, to add and update content in the folder (daily notes, care plans, risk assessments, and other document types where their role allows), to complete reviews and sign-offs when they are the responsible person, and to upload documents to the right section and document type. They are responsible for the accuracy and timeliness of what they enter.
- **Accountability:** Their actions are recorded in the audit trail (who added, who updated, who completed a review). They are accountable for what they write and for not accessing or changing the folder for people they are not allowed to support. They must not delete critical evidence or edit the audit log.

---

### Key Workers

- **Who they are:** The person (or persons) named as responsible for a specific person using the service. They are often frontline staff with an additional responsibility: they are the main point of contact and are accountable for ensuring that person’s care plan, risk assessment, and other key documents are up to date and reviewed on time. The system may treat “key worker” as a designation on a person’s record rather than a separate role; for access intent, the key worker is the one (or ones) who can update that person’s folder and complete reviews for the document types they are responsible for.
- **Responsibility:** To ensure the care folder for their assigned person(s) is complete and current, to complete reviews and sign-offs for the document types they are responsible for, and to coordinate with others (clinicians, managers) where needed. They are responsible for knowing what is due and for acting on it.
- **Accountability:** They are accountable for the quality and completeness of the folder for the people they are key worker for. Their name appears as “responsible” on the person’s record and in the audit trail when they complete a review or update content. They must not access or change the folder for people they are not key worker for unless they have another authorised role (for example they also support that person as part of a team).

---

### Clinicians

- **Who they are:** People with a clinical role: nurses, consultants, therapists, and others who assess, treat, or make clinical decisions. They may be responsible for specific document types (for example medication record, treatment record, capacity assessment) or for specific sections of the folder. They work within a service and need to see and update the parts of the folder that their role covers.
- **Responsibility:** To maintain the clinical parts of the folder (medication, treatment, health and wellbeing, and other document types assigned to their role), to complete clinical reviews and sign-offs, and to ensure that clinical information is accurate and up to date. They are responsible for the clinical content they enter and for acting within their professional and organisational boundaries.
- **Accountability:** Their actions are recorded in the audit trail. They are accountable for the clinical content they write and for not accessing or changing parts of the folder they are not responsible for (unless the organisation’s policy allows it). They must not delete critical evidence or edit the audit log.

---

### Managers

- **Who they are:** People who oversee one or more services (ward managers, service managers, compliance leads). They need to see all people and all folders in their service(s), to see the service-level compliance view and the audit trail, to assign or change who is responsible for a person (key worker, responsible for a document type), and to use inspection mode to show the folder to an inspector. They do not typically enter day-to-day care content for every person; they oversee and support staff and key workers.
- **Responsibility:** To ensure the service meets compliance requirements, to know the state of the folder for each person in their service, to answer “who did what, when” using the audit trail, and to prepare for and support inspection. They are responsible for assigning responsibility and for ensuring that the service can demonstrate accountability.
- **Accountability:** They are accountable for the oversight of the service and for the decisions they make (for example changing who is key worker). Their actions (including responsibility changes and any edits they make) are recorded in the audit trail. They must not edit the audit log or delete critical evidence. They must not access other services’ data unless they have a manager role for those services.

---

### Inspectors

- **Who they are:** People who are given access to view evidence only: CQC inspectors, internal auditors, or others the organisation chooses to give read-only access. They are not employees of the service in the sense of delivering care; they are viewing the system to assess or verify. The system may give them a dedicated “inspector” or “read-only” role so that they can see the same structure (organisation, service, people, folders, sections, documents, emergency summary, audit) as staff and managers but with no ability to change anything.
- **Responsibility:** To view evidence in line with their regulatory or audit role. They are not responsible for maintaining the folder or for the accuracy of the content; they are responsible for viewing it in a way that does not alter it.
- **Accountability:** They are accountable for not attempting to change data. The system must ensure they **cannot** change data even if they try. The organisation is accountable for giving inspector access only to people who are authorised to view (for example CQC inspectors or agreed internal auditors) and for ensuring that inspector access is read-only.

---

### Administrators (Where Applicable)

- **Who they are:** People who manage the system itself: organisation identity, service list, registered locations, organisation-level governance contacts, and possibly user accounts and role assignments. They may be senior managers or dedicated system administrators. They do not typically deliver care or maintain care folders; they maintain the structure and settings that the rest of the system depends on.
- **Responsibility:** To keep organisation and service information correct and to ensure that only the right people have accounts and roles. They are responsible for not changing care content or deleting critical evidence and for following the organisation’s policy on who can be an administrator.
- **Accountability:** Their actions (for example changing organisation name, adding a service, assigning a role) should be recorded in the audit trail or in a separate audit so that changes to structure and access are traceable. They must not use their access to edit care content or the audit log in a way that would breach this access intent (except where an exceptional, governed process allows it—see section 6).

---

## 3. Access Intent by Information Type

For each major information type, the following states who should be able to **view** it, who should be able to **update** it, and who **must never** be able to change it. This is the intent that technical rules must enforce.

---

### Organisation Information

- **Who should be able to view it:** Frontline staff, key workers, clinicians, and managers need to see the organisation name (and possibly registered locations and governance contacts) so they know which organisation they are in and so they can show it to inspectors. Inspectors may see it when they are shown the system. Administrators need to see it to maintain it.
- **Who should be able to update it:** Only administrators or senior managers (or a role the organisation defines for maintaining organisation information). Updates should be rare (for example organisation name change, new registered location, change to governance contact). Every update should be recorded in the audit log (who changed what, when).
- **Who must never be able to change it:** Frontline staff, key workers, clinicians, and inspectors must never be able to update organisation information. Managers must not be able to update it unless the organisation has explicitly given them that role (for example “manager can update service name but not organisation name”). No one should be able to delete organisation information without a governed process (for example organisation closure, with data retained or migrated in line with policy).

---

### Service Information

- **Who should be able to view it:** Frontline staff, key workers, and clinicians see their service (name, type) and the list of people in it. Managers see their service(s) and the service-level compliance view. Inspectors may see service name, type, and list of people when they inspect. Administrators see all services to maintain them.
- **Who should be able to update it:** Managers (for their service) or administrators can update service identity and type (for example new service, service closed, service renamed). The service-level compliance summary may be updated by the application when folder status changes, or may be calculated when the manager views the screen; in either case, only the application or an authorised process should update it, not a user editing it by hand. No one should be able to delete a service if people still belong to it without first moving or closing those people in a governed way.
- **Who must never be able to change it:** Frontline staff, key workers, and clinicians must not be able to create, rename, or delete services. Inspectors must not be able to change any service information. No one should be able to see or change another service’s information unless they have a manager or administrator role that explicitly covers that service.

---

### Person and Care Folder Information

- **Who should be able to view it:** Frontline staff, key workers, and clinicians see the people they are allowed to support (usually their service’s people or the people assigned to them) and the full folder (sections, document types, content, dates, status, references to uploaded files). Managers see all people in their service(s) and all folders. Inspectors see the same **content** (people list, folders, sections, documents, emergency summary, status) but in **read-only** mode: they can view but cannot change anything. Administrators may need to see person identity and service assignment for support or governance; they should not routinely view full care content unless the organisation’s policy allows it for a specific purpose.
- **Who should be able to update it:** Frontline staff, key workers, and clinicians can add and update structured content, complete reviews and sign-offs, and upload documents (which creates a file in file storage and a reference in the folder) for the **people they are allowed to support**. They can update only the document types and sections their role is responsible for (where the organisation distinguishes by role). Managers can update responsibility (who is key worker, who is responsible for a document type) and may update content where the organisation’s policy allows (for example to correct an error or to support cover). Every update must be recorded in the audit trail (who, when, and what changed or what action was taken). No one should be able to update another service’s people or folders unless they have a manager role for that service.
- **Who must never be able to change it:** Inspectors must never be able to add, update, or delete any person or care folder information. No one (including staff, managers, and administrators) should be able to **permanently delete** critical evidence: incident reports, safeguarding records, complaint records, or the content of documents that have been signed off as the official record. The organisation may allow “archive” or “mark as superseded” with the original retained and auditable; permanent deletion of critical evidence must be prevented or strictly governed. No one should be able to edit or delete entries in the audit log. No one should be able to see or change a person’s folder if they are not in a role that is allowed to see that person (for example staff in Service A must not see or change people in Service B unless they have a role that covers Service B).

---

### Audit and History Information

- **Who should be able to view it:** Managers can view the audit log for their service(s) so they can answer “who did what, when?” Frontline staff, key workers, and clinicians may see their own recent actions if the organisation allows. Inspectors may be shown the audit log (read-only) when they ask “who reviewed this care plan?” or “when was this updated?” Administrators may need to view the audit log for support or investigation. No one needs to “edit” or “delete” the audit log as part of normal use.
- **Who should be able to update it:** No user role should be able to **update** (edit) or **delete** existing audit entries. Only the **application** should be able to **add** new entries when a relevant action occurs (document upload, content update, review completed, responsibility change, organisation or service change). So the only “update” to the audit log is **append**: new entries added by the system, never changing or removing old entries.
- **Who must never be able to change it:** Everyone: frontline staff, key workers, clinicians, managers, inspectors, and administrators in normal operation must never be able to edit or delete audit entries. Any exception (for example a super-administrator fixing a proven system error under a governed process) would be a strict, rare case with its own authorisation and with that action itself recorded elsewhere. The default is: **no one** can change the audit log.

---

## 4. Read-Only and Inspection Mode

### What “Read-Only” Means in Practice

- **The user can see but not change.** Read-only means the user can **view** the information the application shows: organisation name, service name, list of people, care folder (sections, document types, content, dates, status), emergency summary, and audit log (where the organisation allows). The user **cannot** add new content, cannot update existing content, cannot upload or delete documents, cannot complete a review or sign-off, cannot change who is responsible, and cannot change organisation or service information. If the user tries to perform an action that would change data, the application must not send that change to the store, and the store (via its rules) must reject it if it were ever requested. So “read-only” is enforced in two places: the application does not offer edit or delete actions to that user, and the store does not accept write or delete from that user.
- **Read-only applies to the role, not to a single screen.** The inspector (or read-only) role has read-only access to **all** the data they are allowed to see: they do not have read-only on one screen and write on another. So there is no “inspector can edit here but not there”; the intent is that the inspector has no write or delete access anywhere in the care data or audit.

---

### How Inspection Access Differs from Normal Use

- **Normal use (staff, key workers, clinicians, managers):** The user can view the data they are allowed to see and can **update** it where their role permits: add content, complete reviews, upload documents, change responsibility (managers). The application shows edit, add, and (where allowed) delete options. The user’s actions are recorded in the audit trail. Access is scoped by service and (for staff) by the people they are allowed to support.
- **Inspection access (inspector or read-only role):** The user can view the same **types** of information (organisation, service, people list, folders, sections, documents, emergency summary, status, audit) that a manager might see, but the user **cannot** perform any action that would add, update, or delete data. The application does not show edit, add, or delete options (or shows them disabled), and the store does not accept any write or delete from that user. So inspection access is a **subset** of what is visible (the same structure and content) with **no** write or delete. The difference from normal use is purely that **no changes are allowed**; the inspector sees the evidence but cannot alter it.

---

### Why Inspectors Must Never Be Able to Modify Data

- **Regulatory expectation.** CQC and other regulators expect that when they inspect, they view evidence only. They do not expect to (and must not) change the service’s records. If an inspector could modify data, the service could not prove that the record was unchanged during or after inspection, and the regulator’s independence and the integrity of the record would be compromised. So the access intent is clear: inspectors have read-only access; they must never be able to modify data.
- **Accidental change.** Even if an inspector did not intend to change anything, a single accidental click (for example “save” or “delete”) could alter or remove evidence. The only way to prevent that is to ensure that the inspector’s role has **no** write or delete permission in the store and that the application does not send write or delete requests on their behalf. So “inspectors must never be able to modify data” is both a policy statement and a safety requirement: the system must make modification impossible for that role.
- **Trust and accountability.** The service must be able to say to CQC: “we gave you read-only access; you cannot change anything.” That statement is only true if the technical implementation enforces it. Defining it in the access intent ensures that when the rules are written, they explicitly block write and delete for the inspector role, so that the service can demonstrate that inspector access is view-only.

---

## 5. Non-Negotiable Guardrails

The following guardrails must be enforced by the application and by the store. They are non-negotiable for safety, data protection, and inspection readiness.

---

### No Deletion of Critical Records

- **What it means:** No user (staff, key worker, clinician, manager, or administrator in normal operation) can **permanently delete** incident reports, safeguarding records, complaint records, or the content of documents that have been signed off or used as the official record. The organisation may allow “archive” or “mark as superseded” so that the original is retained and auditable; what is not allowed is deletion that would destroy evidence or make it unrecoverable. The audit log must never be deletable by users.
- **Why it is non-negotiable:** Critical evidence is required for CQC, for safeguarding, for complaints handling, and for legal or regulatory purposes. Deleting it would destroy accountability and could put people at risk. The guardrail ensures that the system does not allow users to remove evidence; only a governed, exceptional process (if any) could allow deletion, and that would be outside normal access intent.

---

### No Silent Edits

- **What it means:** Every change to care content, to responsibility, or to organisation or service information must be **traceable**: the system must record who made the change and when (and optionally what changed). There must be no “silent” update where data changes without an audit entry or without the change being attributable to a signed-in user. The application must write an audit entry whenever it writes or updates data that affects the folder, responsibility, or org/service settings.
- **Why it is non-negotiable:** CQC and regulators expect the service to answer “who changed this?” and “when?” If changes could happen without being recorded, the service could not demonstrate accountability and could not protect the record from tampering or error. The guardrail ensures that every change is visible in the audit trail so that the organisation can show who did what and when.

---

### No Cross-Service Access Without Authority

- **What it means:** A user in one service (for example Service A) must not be able to see or change the people or care folders for another service (for example Service B) unless they have an explicit role or assignment that covers Service B (for example they are a manager for both services, or they have a dual role). The same applies to organisation: if the system ever holds more than one organisation, a user in one organisation must not see or change another organisation’s data unless they have authority that explicitly covers it. Access is **scoped** by organisation and service (and by person assignment where the organisation uses it).
- **Why it is non-negotiable:** Need-to-know and confidentiality: staff should only see the people they support or their service’s people. Cross-service access without authority would breach that and could lead to wrong or inappropriate access. The guardrail ensures that the store (and the application) only allow read and write to data that the user’s role and assignment permit.

---

### Mandatory Traceability of Changes

- **What it means:** Whenever a user (or the application on behalf of a user) adds or updates care content, uploads a document, completes a review, changes responsibility, or changes organisation or service information, the system must **record** that action in the audit log: who (the signed-in user), when (date and, where possible, time), and what (for example “care plan updated,” “document uploaded to Section D,” “review completed”). The audit log is append-only and is not editable or deletable by users. So every change is traceable and cannot be removed or altered after the fact.
- **Why it is non-negotiable:** Traceability is required for CQC (accountability, Well-Led), for data protection (demonstrating who processed what), and for safety (knowing who did what so that errors or harm can be followed up). The guardrail ensures that the system is designed so that no change happens without an audit entry and so that the audit log is protected from editing or deletion.

---

### No Unauthenticated or Unidentified Access

- **What it means:** No one can read or write care data, organisation data, service data, or audit data without first **signing in** and being **identified** by the system. Every request to read or write must be associated with a known user (or with a known application process that is acting on behalf of a user whose action is being audited). There is no “anonymous” or “guest” access to the care folder or to the audit log.
- **Why it is non-negotiable:** If access were possible without sign-in, the system could not enforce roles or record “who” in the audit trail. Unauthenticated access would also create a serious data protection and safety risk. The guardrail ensures that the store only accepts requests that are tied to an authenticated user (or to a defined system process that is itself governed).

---

## 6. Handling Exceptions and Escalation

### How Exceptional Access Is Handled Conceptually

- **Normal access is defined by roles and intent.** The access intent and guardrails above define what each role can do in normal operation. Sometimes the organisation may need to allow an action that would otherwise be blocked: for example correcting a proven system error that left data wrong, or allowing a designated person to restore a record from backup after a technical failure. Such actions are **exceptions**: they are not part of normal role-based access; they are governed by a separate process.
- **Exceptions are rare and defined.** The organisation should define (in policy or procedure) what kinds of exceptional access are allowed, who can request it, who authorises it, and how it is recorded. For example: “only a named super-administrator, with approval from the information governance lead, may correct a proven data error; the action must be logged in a separate audit or incident log with reason and authorisation.” The technical system may support this by having a separate, tightly controlled path (for example a role that can only be used after approval and that writes every action to an exception log). The default is: **no exception** unless the organisation has defined and authorised it.

---

### Who Authorises Exceptions

- **Not the same person who performs the action.** To avoid abuse, the person who authorises an exception (for example “you may correct this record”) should not be the same person who performs the action, where possible. Authorisation might sit with the information governance lead, the data protection officer, a senior manager, or a designated “authoriser” role. The organisation’s policy should state who can authorise which types of exception (for example “data correction” vs “restore from backup”) and whether it requires a single authoriser or more than one (for example two senior staff).
- **Authorisation must be recorded.** When an exception is authorised, the authoriser, the date, the reason, and the scope (what was allowed) should be recorded. When the action is performed, the performer, the date, and what was done should be recorded. So there is a full trail: who asked, who authorised, who did it, and why. That supports accountability and allows the organisation to review exceptions and to show regulators or auditors that exceptions are controlled.

---

### How Exceptions Are Recorded

- **Separate from the main audit log, or clearly marked.** If the exception involves a change to care data or to organisation or service data, the main audit log may record “user X updated [record] at time Y” but it may not by itself explain that this was an authorised exception. The organisation should ensure that the **reason** (authorised exception, ticket reference, authoriser) is recorded somewhere: either in a separate “exception log” or in a way that the main audit log or the record itself can show “this change was an authorised exception, ref [number], authorised by [role/name].” So when someone later asks “why did this change?”, the organisation can show that it was an exception and who authorised it.
- **No exception for “delete audit” or “edit audit” in normal governance.** The intent is that the audit log is never edited or deleted by users. If the organisation ever allowed an exception (for example to correct a proven technical error in the audit log itself), that would be an extreme case requiring the highest level of authorisation and a full record of who authorised it, who did it, and why. The default position in this document is: **no one** can edit or delete the audit log; any exception would require a separate, explicit policy and would be outside the normal access intent.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose of access intent** | Define who can view and update what in plain English before writing technical rules; supports safety, inspection readiness, and stakeholder agreement. |
| **Roles** | Frontline staff, key workers, clinicians, managers, inspectors (read-only), and (where applicable) administrators; each has defined responsibility and accountability. |
| **Access by type** | Organisation: view by all roles that need it; update by administrators/senior managers only. Service: view by staff/managers/inspectors; update by managers/administrators. Person/folder: view by allowed staff/managers/inspectors (inspector read-only); update by staff/key workers/clinicians/managers for allowed people only; no one deletes critical evidence or audit. Audit: view by managers (and optionally staff for own actions, inspectors); no one updates or deletes; only application appends. |
| **Read-only / inspection** | Read-only = view only, no add/update/delete; inspection mode = same content as manager view but no changes allowed; inspectors must never modify data (regulatory expectation, accident prevention, trust). |
| **Guardrails** | No deletion of critical records; no silent edits (every change traceable); no cross-service access without authority; mandatory traceability (audit log append-only, protected); no unauthenticated access. |
| **Exceptions** | Rare, defined in policy; authoriser is not the performer; authorisation and action both recorded; exceptions for “edit/delete audit” not part of normal governance. |

---

*This document defines the authoritative access intent and guardrails for Firestore data in the digital CQC readiness system. Future Firestore security rules must implement this intent. It should be used by information governance, data protection, and technical teams when designing and testing access control.*

*Document version: 1.0 | Plain English only | No security rules syntax or code.*
