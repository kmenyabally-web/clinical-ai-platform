# Minimum Firebase Setup Required for the First Technical Build

**Plain-English Guide for Safe Initial Setup in UK Regulated Healthcare**

*This document defines the minimum setup required for Firebase to support the first technical build of the digital CQC readiness system. It describes purpose, authentication and roles, structured storage, document storage, audit and history, access control, and explicit exclusions. It is not a configuration guide. It does not contain code or Firebase syntax. Plain English only.*

---

## 1. Purpose of Firebase in the First Build

### Why Firebase Is Being Used at This Stage

- Firebase is the **place where the system’s information is stored and from which it is delivered** to the application that staff and inspectors use. In the first build, Firebase holds: who the organisation and services are; who each person is and which service they belong to; the care folder (sections, document types, structured content such as care plan text and dates); the files that staff upload (PDFs, scans, images); the compliance status (or the data needed to calculate it); and the record of who did what and when. The application reads from and writes to Firebase so that when a staff member opens a folder or adds a document, the information is there and is consistent for everyone who has permission to see it.
- Using Firebase at this stage gives the organisation a **single, clear place** for the data that the first build needs. The first build does not spread data across many different systems; it uses Firebase as the main store so that the pilot can run, evidence can be found, and the audit trail can be kept in one place. That supports reliability and makes it easier to govern and to explain to inspectors where the data lives.

---

### What Risks It Helps Control

- **Loss or scatter of evidence:** If care information were held in many places or in formats that could not be linked (e.g. loose files with no structure), the service could lose evidence or could not find it when inspectors ask. Firebase, set up with a clear structure (organisation, service, person, folder, section, document), helps control the risk that evidence is lost or unfindable.
- **Wrong person seeing or changing data:** If there were no way to control who can see or edit what, staff might see people they do not support, or an inspector might accidentally change something. Firebase is set up so that **access rules** (who can read or write what) are enforced. That helps control the risk of unauthorised access or accidental change.
- **No trace of who did what:** If the system did not record who added or changed something, the service could not answer “who reviewed this?” or “who added this document?” and could not demonstrate accountability. Firebase is set up so that **audit information** (who, when, and what action) is stored separately and is not editable by normal users. That helps control the risk that the service cannot prove who was responsible.
- **Files overwriting or replacing structured records:** If uploaded documents (e.g. a PDF of a care plan) could replace the structured care plan record (text, dates, who reviewed), the system would lose the dates and the link to the audit trail and status would break. Firebase is set up so that **file storage** (documents) and **structured storage** (care content, dates, status) are separate. Files are linked to the folder but do not overwrite the structured record. That helps control the risk of losing traceability and compliance status.

---

### What Firebase Must NOT Be Used For Yet

- **AI or automated decisions.** Firebase holds data; it does not run AI models or make decisions about what to file, what is compliant, or what to alert. In the first build, no AI features use Firebase to store prompts, AI outputs, or AI-generated suggestions. Any future AI use will be added in a later phase with its own setup and governance.
- **Sending messages or alerts to users.** Firebase may hold the data that drives reminders (e.g. next review date), but the first build does not use Firebase to send emails, push notifications, or other messages to staff or to people outside the system. If the application sends reminders, that is done by another part of the system; Firebase only stores and serves the data. Sending alerts to external parties (e.g. regulators, families) is not part of the first build at all.
- **Integrations with other systems.** Firebase is not used to connect to or sync with electronic patient records, pharmacy systems, or other care systems in the first build. Data is entered or uploaded by staff into Firebase; it is not imported or pushed from elsewhere. Integrations may be considered later and would need their own design and safety review.
- **Storing data that is not needed for the first build.** Only the data required for the MVLS and the first technical build scope is stored. No analytics data, no usage tracking beyond what is needed for audit, and no experimental or future features are stored yet. That keeps the setup small and reduces the risk of holding data that is not governed or not needed for inspection.

---

## 2. Authentication and User Access

### How User Sign-In Should Work at a High Level

- **Proving who the user is:** When someone opens the application, they must **prove who they are** (sign-in). That is usually done by a dedicated **authentication service** (which may be part of Firebase or a separate system). The user enters an identifier and a secret (e.g. password) or uses another approved method (e.g. single sign-on if the organisation uses it). The authentication service checks that the person is who they claim to be and then tells the application “this user is signed in” and provides a **user identifier** (e.g. a unique ID for that user). The application uses that identifier to know who is doing each action and to apply access rules (what this user can see and do).
- **One sign-in per session:** The user signs in once per session (e.g. when they open the app or after a period of inactivity). They do not have to sign in again for every action. The application keeps track of the signed-in user until they sign out or until the session ends. So staff can work without constantly re-entering their identity, but the system always knows who is acting.
- **Sign-out and security:** Users can **sign out** so that someone else cannot use the application on the same device. The authentication setup should follow good practice (e.g. secure handling of secrets, session timeout if the organisation requires it) so that only the right person can act as a given user. The first build does not need to implement every possible security feature; it needs a working sign-in that the organisation trusts and that allows roles to be applied correctly.

---

### What Basic Roles Must Exist

- **Staff (frontline, key worker, nurse):** A role that can **view and edit** the care folder for the people they are allowed to see (e.g. people in their service or people assigned to them). They can add documents, enter or update structured content, and complete reviews and sign-offs. They **cannot** see other services’ data (unless they have a second role), **cannot** change organisation or service settings, and **cannot** delete critical evidence (incidents, safeguarding, complaints, audit). They **cannot** use inspection mode to edit; they use the normal folder view.
- **Manager:** A role that can **view** all people and all folders in their service (or services they manage), **view** the service-level compliance view and the audit trail, and **assign** or change who is responsible for a person or document type (if the application supports it). They can use **inspection mode** to show the folder in read-only form (e.g. when an inspector is present). They **cannot** edit care content in place of the responsible staff (unless that is part of their job and the application allows it), and **cannot** delete critical evidence or edit the audit trail.
- **Inspector (read-only):** A role that can **view only**. The user can open the organisation, service, people list, care folder, sections, documents, emergency summary, and compliance status. They **cannot** edit, add, or delete anything. They cannot change settings, complete reviews, or upload documents. This role is used when the service gives an inspector access so that the inspector can see the evidence without any risk of altering it.

The first build may use only these three role types (or simple variants such as “staff” and “manager” with inspector being a special case of “read-only”). More granular roles (e.g. separate “compliance lead”) can be added later if the organisation needs them.

---

### Why Role Separation Matters for CQC

- **Accountability:** CQC expects the service to know **who** did what. When the system records “this care plan was reviewed by [user] on [date],” that user must be identifiable and must be a member of staff (or manager) who is allowed to do that action. Role separation ensures that only the right roles can perform actions that affect the folder, so the audit trail always points to a legitimate actor.
- **Confidentiality and need-to-know:** Staff should see only the people they support or their service’s people. Managers need to see the whole service. Inspectors need to see only what the service chooses to show them, and they must not be able to change it. Role separation enforces who can see what, so that the service can demonstrate that access is controlled and that inspectors have read-only access.
- **Inspection trust:** When the service says “we gave you read-only access,” inspectors need to see that in practice: they cannot edit or delete. A dedicated inspector (read-only) role makes that clear and prevents accidental or deliberate change. So role separation supports both safety and the service’s ability to explain to CQC how access works.

---

## 3. Structured Information Storage

### What Types of Structured Information Must Be Stored

- **Organisation and service information:** The name and identifier of the organisation; the list of services (e.g. wards, teams) with their names and which organisation they belong to. So the system knows the hierarchy (organisation → service) and can show the right list of services and people to each user.
- **Person and folder structure:** For each person using the service: who they are (identifier, name as the service uses it), which service they belong to, and the **structure** of their care folder (eight sections, and under each section the list of document types and whether each has content or not). So the system can show “this person’s folder” with the right sections and document types every time.
- **Structured care content:** The actual **content** that staff enter for each document type: care plan text, risk assessment text, daily notes, who to contact, allergies, medication list, consent record, incident descriptions, and so on. Also **dates** that drive compliance: last review date, next review date, and who completed the review. This information is stored in a **structured** way (e.g. fields for “care plan text,” “last review date,” “next review date”) so that the application can read it, display it, and use it to calculate status (in date, due, overdue).
- **Responsibility:** Who is responsible for each person (e.g. key worker) and, if the application supports it, who is responsible for each document type. So reminders and tasks can be shown to the right person and the audit trail can reflect “responsible person.”
- **Compliance status (or the data to calculate it):** Either the **status** for each document type and folder (in date, due, overdue; Green, Amber, Red) is stored after the application calculates it, or the **raw data** (dates, presence of documents, events like incidents) is stored and the application calculates status when needed. In either case, the structured store holds what is needed so that staff and managers see the correct status and so that status is consistent and explainable (rules + data).

---

### Why This Information Must Be Structured Rather Than Stored as Documents

- **Search and display:** The application needs to **find** “the care plan for this person,” “the last review date for the risk assessment,” and “who to contact” without opening many files. Structured storage (e.g. fields with names like “care plan text,” “last review date”) lets the application read the right field and show it on the right screen. If everything were stored only as documents (e.g. one PDF per care plan), the application could not easily read “when was this reviewed?” or “what is the next review date?” and could not calculate status or show the emergency summary from one place.
- **Status and rules:** Compliance status depends on **dates** and on **whether a document exists**. The application (or the stored status) must know “last review date” and “next review date” for each document type. Those come from structured data. If they were only inside PDFs or images, the system would have to “read” every file to work out status, which would be slow, error-prone, and unnecessary. Storing dates and key content as structured information keeps status fast, accurate, and rule-based.
- **Audit and traceability:** When someone updates the care plan, the system must record **who** and **when**. That is easier and more reliable when the update is a change to a structured record (e.g. “care plan text” and “last review date” updated by user X at time Y) rather than “a new PDF was uploaded,” which does not by itself tell the system who wrote the content. Structured content plus audit gives clear traceability.
- **Emergency summary:** The seven emergency-critical items (allergies, medication, contacts, PEEP, DNAR, etc.) must be **in one view**. That view is built by reading structured fields (or the current document content) from the folder. If everything were only in uploaded files, the application could not build the emergency summary without opening and interpreting every file, which would be unsafe and slow. Structured storage (or a clear link from “emergency summary” to the right structured fields) makes the emergency view reliable and fast.

---

### How Often This Information Changes

- **Rarely:** Organisation and service information (names, list of services). Responsibility (who is key worker for whom) may change occasionally when the service reallocates.
- **Often:** Person-level care content (daily notes, care plan updates, risk assessment updates, incidents, medication list, who to contact, allergies). Review dates (last review, next review) change whenever a review is completed. Compliance status (or the data that drives it) changes whenever content or dates change or whenever time passes (e.g. something moves from “due” to “overdue”).
- The Firebase setup must support **frequent updates** to care content and status without losing history or audit. So the place where structured information is stored must allow many reads and writes per day for the pilot service, and must keep the audit trail and (where required) previous versions of content intact.

---

## 4. Document Storage

### What Types of Documents Must Be Stored

- **Files that staff upload:** PDFs, scanned images (e.g. of forms, handwritten notes), and photos that staff add to the care folder. Each file is linked to a **person**, a **section**, and a **document type** (e.g. “capacity assessment,” “DoLS authorisation,” “letter from GP”). The system stores the file itself (so it can be opened and viewed) and **metadata**: who uploaded it, when, and which section and document type the staff member chose. So the application can show “this document is in Section A, document type: capacity assessment, added by [user] on [date]” and can open the file when the user asks to view it.

---

### Why Documents Must Be Stored Separately from Structured Information

- **Different shape:** Structured information is made of **fields** (e.g. “care plan text,” “last review date”) that the application can read and use for status, display, and rules. Documents are **files** (binary or image data) that the application displays or opens but does not “read” in the same way (e.g. the application does not parse the PDF to get “next review date”). Storing them in the same place as structured fields would mix two different types of data and would make it harder to enforce rules (e.g. “never overwrite the structured care plan record with a file”). So the first build uses **one area** for structured information (organisation, service, person, folder, content, dates, status) and **another area** for files (uploaded documents). Both are part of Firebase, but they are logically and physically separate so that the application and the access rules can treat them correctly.
- **Safety and traceability:** If files and structured content were mixed, uploading a new PDF could accidentally overwrite or replace the structured care plan (text and dates). Then status would break and “who reviewed and when” would be lost. Keeping document storage **separate** and **linked** (e.g. “this file is attached to care plan for person X”) means that adding or replacing a file does not touch the structured record. The structured record remains the source of truth for “current care plan,” “last review date,” and “next review date”; the file can be an attachment or supporting evidence.

---

### Why Documents Must Not Overwrite Structured Records

- **Structured records drive status and audit:** Compliance status (in date, due, overdue) and the audit trail (who reviewed, when) depend on the **structured** record (e.g. “care plan” with “last review date” and “next review date”). If an uploaded document (e.g. a PDF of the care plan) could **replace** that record, the system would lose the dates and the link to “who completed the review.” Status would no longer be calculable, and the service could not show inspectors “who reviewed this and when.” So the rule is: **uploaded documents do not overwrite structured records.** They are stored as **attachments** or **linked files**; the structured record (text, dates, who) stays in the structured store and is updated only when staff edit that record or complete a review through the application. If the service wants to attach a PDF of the care plan, the PDF is stored as a file and linked to the care plan; the “current care plan” for status and display remains the structured record until staff explicitly update it or replace it through the proper flow (with a new version and audit entry).

---

## 5. Audit and History

### What Actions Must Always Be Recorded

- **Adding or uploading:** When a staff member adds a document (file) or creates or updates structured content (e.g. care plan, risk assessment, daily note, incident record), the system must record **who** (the signed-in user), **when** (date and, where possible, time), and **what** (e.g. “document added to Section D, type: risk assessment” or “care plan updated”). So the service can answer “who added this?” and “when was this last changed?”
- **Completing a review:** When a staff member completes a review (e.g. care plan review, risk assessment review) and signs off, the system must record **who** completed it and **when**. So the service can answer “who reviewed this?” and inspectors can see that a human took the action.
- **Changing responsibility:** When a manager (or authorised user) assigns or changes who is responsible for a person or a document type, that change must be recorded (who made the change, when). So the service can show who had responsibility at any point.
- **Changing organisation or service information:** When an administrator or manager changes organisation name, service name, or similar, that change must be recorded (who, when). So the service can show that changes to structure or settings are traceable.

The audit record is stored **separately** from the care content. It is a **log** of actions: each entry is “user X did action Y at time Z (and optionally for person P or document D).” The application (or the user) can read this log to see the history of changes; the log is not edited or deleted by normal users.

---

### Why Audit History Is Non-Negotiable for Inspections

- **CQC asks “who” and “when”:** Inspectors routinely ask “who reviewed this care plan?” and “when was this risk assessment last updated?” If the system does not record those actions, the service cannot answer and cannot demonstrate accountability. The audit trail is the evidence that the service uses the system properly and that humans are responsible for what is in the folder.
- **Trust in the record:** If there were no audit trail, the service could not prove that a change was made by a member of staff and not by an error or by someone who should not have access. The audit trail supports the service’s claim that the record is accurate and that only authorised people have changed it. So audit history is non-negotiable for inspection readiness and for Well-Led.

---

### Why History Must Never Be Editable or Deletable

- **Tampering:** If users could **edit** or **delete** audit entries, someone could remove or change the record of “who did what, when.” Then the service could not prove what really happened, and inspectors could not trust the trail. So the system must be set up so that **normal users cannot edit or delete audit entries.** New entries are **added** when actions occur; old entries are **never** changed or removed by users. Only in exceptional, governed cases (e.g. a super-administrator fixing a proven system error, with the action itself audited) might the organisation allow a change to the audit store, and that would be a strict exception with its own controls.
- **Legal and regulatory expectations:** Regulators and courts expect care records to be **traceable** and **tamper-evident**. An editable or deletable audit trail would not meet that expectation. So from day one, the Firebase setup must treat the audit store as **append-only** and **protected** from normal user write and delete.

---

## 6. Access Control and Visibility

### Who Can See What at a High Level

- **Staff:** Can see **their service** (name, list of people in that service) and the **care folder** for each person they are allowed to see (usually everyone in their service or everyone assigned to them). They can see structured content, uploaded documents, compliance status, reminders and tasks, and the emergency summary for those people. They **cannot** see other services’ people or folders. They **cannot** see the full audit trail for the service (they may see their own recent actions if the application supports that). They **cannot** see organisation-level or service-level settings.
- **Managers:** Can see **their service** (or services they manage), **all people** in that service, and **all folders** for those people. They can see the **service-level compliance view** (how many in date, due, overdue; lists of people with Red or Amber folders). They can see the **audit trail** for their service so they can answer “who did what, when.” They can use **inspection mode** (read-only view) to show the folder to an inspector. They **cannot** see other services’ data unless they have a manager role for those services. They **cannot** edit the audit trail or delete critical evidence.
- **Inspectors (read-only):** Can see whatever the service chooses to show them—typically the same as managers in terms of **what** (organisation, service, people list, folders, sections, documents, emergency summary, status) but with **no** ability to edit, add, or delete. They see **read-only**; they cannot change any content, any status, any settings, or any audit. So inspectors can view evidence but cannot alter it.
- **Administrators (if the first build includes them):** Can see and edit **organisation and service information** (names, list of services, possibly user roles and assignments). They may be able to create or deactivate users and assign roles. They **cannot** edit care content or delete critical evidence in a way that would breach the technical foundation or the MVLS. Their actions (e.g. “user X assigned role Y”) should be audited.

---

### What Inspectors Must Be Restricted To

- **View only.** Inspectors must **not** be able to: edit any care content (text, dates, documents); add or upload any document; delete any content or document; complete a review or sign off; change who is responsible; change organisation or service settings; or edit or delete any audit entry. The application must **enforce** this by giving the inspector role (or the inspection-mode user) **read** access only to the data that is shown in the inspection view, and **no** write or delete access to any part of Firebase that holds care content, documents, status, or audit. So even if an inspector tried to change something, the system would reject the request.

---

### What Staff Must Never Be Able to Delete or Change

- **Critical evidence:** Staff must **not** be able to **permanently delete** incident reports, safeguarding records, complaint records, or the content of documents that have been signed off or used as the official record (except where the organisation has a governed process for archiving or amending, with the original retained). The Firebase setup must **prevent** delete for these types of content, or must allow only “archive” or “mark as superseded” so that the original remains stored and auditable.
- **Audit trail:** Staff must **not** be able to **edit** or **delete** any audit entry. The audit store is append-only and protected from normal user write and delete.
- **Other people’s data (unless authorised):** Staff must **not** be able to see or change the folder or content for people they are not allowed to support. Access rules must restrict read and write so that each user can only access the people (and thus the folders) that their role and assignment allow.

---

## 7. Explicit Exclusions

### Firebase Features That Must NOT Be Enabled Yet

- **AI or machine-learning features:** No Firebase feature that runs AI, suggests content, or classifies documents is used in the first build. The first build is manual and rule-based only. Any such feature would be added in a later phase with its own governance.
- **Automated triggers that send messages outside the app:** No Firebase feature that automatically sends emails, SMS, or push notifications to users or to external addresses is enabled in the first build. Reminders and tasks are **shown inside** the application; they are not sent by Firebase. If the application later sends notifications, that will be a separate design; Firebase in the first build only stores and serves data.
- **Scheduled or background jobs that change data:** No Firebase feature that runs on a schedule and **changes** care content, status, or audit (e.g. “every night, mark X as overdue”) is used in the first build. Status is calculated when the user views it (from rules and data) or when a user action causes an update (e.g. review completed). No automatic overnight or background update of compliance status or folder content. That keeps the rule “only human actions change the record” clear.
- **Public or unauthenticated access:** No part of the care folder, documents, compliance status, or audit is accessible without **sign-in** and **role-based access**. Firebase is set up so that all access to care data goes through the application and through the authentication and access rules. There is no public URL or open bucket that would allow anyone to read or download care data without being a signed-in, authorised user.
- **Cross-organisation or cross-service access by default:** The first build serves **one organisation** (or one pilot organisation). Firebase is not set up to share data between different organisations or to allow one organisation to see another’s data. If the same Firebase project is used for more than one organisation in the future, that will be a deliberate design with strict separation (e.g. organisation ID on every record and access rules that filter by organisation). In the first build, the scope is one organisation and one or more of its services, with clear boundaries.

---

### Types of Data That Must NOT Be Stored Yet

- **AI prompts, AI outputs, or AI-generated suggestions:** No data that is produced by or for an AI feature (e.g. “suggested document type,” “AI-generated gap list”) is stored in the first build. The first build has no AI; so there is no such data. When AI is added later, where that data is stored and how it is governed will be defined in a separate document.
- **Data from other systems:** No data that is imported or synced from electronic patient records, pharmacy systems, or other care systems is stored in the first build. All data in Firebase is **entered or uploaded by users** of the CQC readiness application. Integrations and imports may be considered later.
- **Analytics or usage data beyond audit:** No analytics events (e.g. “user clicked X,” “screen Y was viewed for Z seconds”) are stored in the first build unless they are part of the **audit trail** (e.g. “user opened folder for person P at time T” if the organisation decides that is needed for accountability). General usage analytics or behaviour tracking are out of scope for the first build to keep scope and data minimal.
- **Personal data beyond what the folder needs:** The folder holds what is needed for care and compliance (name, identifier, care content, documents, who to contact, etc.). The first build does **not** store extra personal data (e.g. national insurance number, full address history) unless it is explicitly required for the care folder or for the pilot. Data minimisation supports data protection and reduces the risk of holding data that is not needed or not governed.

---

### Why Delaying These Protects Safety and Scope

- **Safety:** Enabling AI, automated triggers, or public access in the first build would introduce risks (wrong AI suggestion, wrong alert, or unauthorised access) before the core system is proven. Keeping them out until the MVLS is stable and the pilot has run reduces the chance of harm and keeps the story for inspectors simple: “we use the system for storage and access control; no AI, no automatic messaging, no open data.”
- **Scope:** The first build is already defined: folder, documents, status, reminders, audit, inspection view, service view, review sign-off. Adding Firebase features or data types that are not needed for that scope would expand the build and could delay pilot and learning. Storing only what the first build needs keeps the setup manageable and makes it easier to test, govern, and explain.

---

## 8. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose of Firebase in first build** | Store and serve organisation, service, person, folder, content, documents, status, and audit; control loss and access risk; not used for AI, external alerts, or integrations yet. |
| **Authentication and roles** | Sign-in proves who the user is; basic roles (staff, manager, inspector read-only) enforce who sees and does what; role separation supports accountability and CQC expectations. |
| **Structured storage** | Organisation, service, person, folder structure, care content, dates, responsibility, status (or data to calculate it); structured so app can read, display, and compute status; changes often for care, rarely for org/service. |
| **Document storage** | PDFs, scans, images; stored separately from structured info; linked to person/section/type; never overwrite structured records; files are attachments/supporting evidence. |
| **Audit and history** | Record who did what, when (add, upload, review, change responsibility, change settings); separate, append-only, non-editable/non-deletable by users; non-negotiable for inspections. |
| **Access control** | Staff: their people/folders; manager: service + audit + inspection mode; inspector: view only; staff cannot delete critical evidence or audit. |
| **Exclusions** | No AI, no auto-messaging, no scheduled data changes, no public access, no cross-org by default; no AI data, no imported data, no analytics beyond audit, no extra personal data; protects safety and scope. |

---

*This document defines the minimum Firebase setup required to support the first technical build of the digital CQC readiness system. It should be used when planning and governing the initial Firebase setup and when explaining to technical and non-technical stakeholders what is in and out of scope. It does not replace the need for secure configuration and data protection compliance; those are addressed in separate policies and implementation.*

*Document version: 1.0 | Plain English only | No code or Firebase syntax.*
