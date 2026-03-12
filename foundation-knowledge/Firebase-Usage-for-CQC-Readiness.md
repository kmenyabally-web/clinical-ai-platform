# Using Firebase for the Digital CQC Readiness System

**Plain-English Guide for Regulated UK Healthcare**

*This document describes what Firebase should be responsible for, what types of information it holds, how documents and records are treated, how access is controlled, how audit and traceability are supported, and what safety guardrails must be in place. It is written for people who need to set up or govern Firebase in a way that supports CQC inspection and care safety. No code, configuration files, or Firebase-specific syntax are used.*

---

## 1. Firebase Responsibilities

### What Firebase Should Be Responsible For

Firebase should be responsible for **holding and serving** the information that the CQC readiness system needs to work. In simple terms:

- **Storing** the information: organisational details, service and ward details, information about each person and their care folder, the content of care plans and risk assessments and daily notes, compliance status (what is in date, due, or overdue), and records of who did what and when.
- **Making it available** to the right people: so that staff can open a person’s folder, managers can see service-wide compliance, and inspectors can read evidence in a read-only way.
- **Keeping it in order**: so that each piece of information is linked to the right organisation, service, person, and section of the folder, and so that the structure (one folder per person, one current version of key documents) is always clear.
- **Supporting speed and reliability**: so that when someone opens a folder or checks compliance status, the information appears quickly and consistently, including for emergency-critical information (allergies, medication, contacts, evacuation, resuscitation status).

Firebase is the **place where the system’s information lives** and the **means by which it is delivered** to the application that staff and inspectors use. It does not decide what care to give or what the rules are; it holds the data and serves it according to the rules that the application and the business logic enforce.

**Why this matters for inspections and safety:** Inspectors need to see the right evidence quickly and to trust that what they see is what the service actually holds. If Firebase is responsible for storing and serving that information reliably and in the right structure, the service can show complete, up-to-date folders and compliance status. If Firebase were also asked to make clinical decisions or to change evidence without a trace, that would mix storage with judgement and would undermine safety and inspection trust.

---

### What Firebase Should NOT Be Responsible For

Firebase should **not** be responsible for:

- **Deciding** what care a person needs, what risks they have, or what should be written in a care plan or risk assessment. Those decisions stay with the clinicians and key workers. Firebase holds the result of those decisions; it does not make them.
- **Deciding** what is mandatory, what is due, or what is overdue. Those rules are defined elsewhere (in the compliance ruleset and in the application). Firebase holds the dates and the content; the application uses the rules to work out status and to show Green, Amber, or Red.
- **Sending** reminders or emails to staff. Firebase may hold the data that drives reminders (for example, “next review date”), but the actual sending of a reminder or notification can be done by another part of the system. Firebase’s job is to store and serve data, not necessarily to trigger every type of alert.
- **Checking** that the person logging in is who they say they are (authentication). That is often done by a dedicated authentication service. Firebase may work with that service to know “this user is allowed to see this data”, but the responsibility for verifying identity usually sits with the authentication layer.
- **Interpreting** the content of care plans or risk assessments. Firebase holds the text and the dates; it does not analyse whether the care plan is good or bad. Quality and clinical judgement stay with the people who write and review the content.

**Why this separation matters for inspections and safety:** If Firebase (or the way it is used) were to make decisions about care or compliance, the service could not show that humans are accountable. Inspectors expect the service to be able to say “a professional wrote this” and “a professional decided this was due”. Keeping Firebase focused on storage and delivery keeps the boundary clear: the platform holds and serves; people decide and act. That supports both safety and inspection readiness.

---

## 2. Types of Information in Firebase

Firebase must hold several **types** of information. Each type has a different purpose, changes at a different rate, and should be visible or editable by different people. Describing them in plain English helps everyone agree what lives in Firebase and who can do what with it.

---

### Organisational Information

**What it is:** The name and details of the organisation (the provider) that runs one or more services. It may include the organisation’s identifier, display name, and any high-level settings that apply across all its services.

**Purpose:** So that the system knows which organisation each service and each person belongs to, and so that compliance or reporting can be shown at organisation level when needed.

**How often it changes:** Rarely. Organisation name or details might change when the provider rebrands or restructures, but not day to day.

**Who should see it:** Senior managers and compliance leads who look across the organisation; the application needs it to show “which organisation am I in?”. Frontline staff may not need to see it explicitly; they work within a service.

**Who should edit it:** A small number of administrators or senior managers only. Not frontline staff or inspectors. Changes should be logged (who changed what, when).

---

### Service or Ward Information

**What it is:** The name and details of each service (or ward, team, care home) that the organisation runs. It includes which organisation the service belongs to and may include settings that apply to that service (for example, which roles exist there).

**Purpose:** So that the system can group people and folders by service, show service-level compliance (“how many people in this ward have a complete folder?”), and control who can see which service’s data (managers see their service; inspectors see the service they are inspecting).

**How often it changes:** Occasionally. New services may be added; a service may be closed or renamed. Not every day.

**Who should see it:** Managers and staff who work in that service; compliance leads may see all services in the organisation; inspectors see the service they are inspecting. The application uses it to decide what list of people and folders to show.

**Who should edit it:** Managers or administrators. Not frontline staff for other services; not inspectors. Changes (for example, new service, service closed) should be logged.

---

### Person-Level Care Information

**What it is:** Everything that describes the person and their care: their identifier, their care folder, the eight sections, and the **content** of each document—care plan text, risk assessment text, daily notes, medication list, who to contact, consent record, incident descriptions, and so on. This is the “source of truth” for what the service has recorded about the person.

**Purpose:** So that staff can read and update the folder, and so that inspectors can see the evidence. This is the information that CQC inspectors look at when they open a folder.

**How often it changes:** Often. Daily notes are added every day; care plans and risk assessments are updated when reviewed; incidents and safeguarding are added when they happen. This is the most frequently updated type of information.

**Who should see it:** Staff who support that person (key workers, nurses, support workers) and their managers. Compliance leads may see it for audit. Inspectors see it in read-only mode. The person (the service user) may see some of it if the service offers that—that is a separate design choice.

**Who should edit it:** The staff who are responsible for each part (key worker for care plan and risk assessment, nurse for medication and treatment, manager for some governance items). Inspectors must **never** edit. Edits must be traceable (who, when, and where possible why).

---

### Compliance Status Information

**What it is:** The **derived** or **stored** status of each document and each folder: whether each document is present, in date, due for review, or overdue; whether the folder is complete and current or has gaps; and (if stored in Firebase) Green, Amber, or Red. It may also include “next review date” and “last review date” for each document type.

**Purpose:** So that the application can show staff and managers what is on track and what needs action, and so that reminders and escalation can be driven by real data. Inspectors see the same status when they look at a folder (so they can see what is overdue or missing).

**How often it changes:** Whenever a review is completed (status and dates update), whenever time passes (something may move from “due” to “overdue”), or whenever an event (incident, safeguarding) triggers “action required”. So it changes often, but in a rule-driven way.

**Who should see it:** Staff see status for their people; managers see status for the whole service; compliance leads see it across services; inspectors see it when they open folders or service-level views. Status should not be hidden from inspectors.

**Who should edit it:** Ideally, status is **calculated** by the application from the rules and the dates/content in the care information, not manually edited. If status is stored in Firebase, it should be updated only when a real event occurs (for example, a review is completed or an incident is recorded), and that update should be logged. No one should be able to “mark as Green” without a recorded review. Inspectors must never edit status.

---

### Audit and History Information

**What it is:** The record of **who** did **what** and **when**: who created or updated a care plan, who completed a review, when an incident was recorded, when a document was last changed. It may also include **previous versions** of important documents (for example, the previous care plan before the latest update) so that the service can show “what was in place when”.

**Purpose:** So that the service can answer inspectors’ questions (“who reviewed this?”, “when did this change?”) and so that accountability is clear. Audit and history must be protected: once written, they should not be editable or deletable by normal users.

**How often it changes:** New entries are **added** whenever someone creates, updates, or reviews something. Old entries are **not** changed. So “change” here means “new rows” or “new records”, not “editing the past”.

**Who should see it:** Managers and compliance leads when they need to check who did what; inspectors when they ask for an audit trail or for the history of a document. Staff may see their own recent actions. The application uses it to show “last updated by X on date Y”.

**Who should edit it:** **No one** in normal operation. Audit and history must be append-only: new events are recorded, old records are not edited or deleted. If the system has a role that can “correct” audit in exceptional circumstances (for example, a super-administrator for a genuine system error), that action must itself be audited and highly restricted. Inspectors must never edit audit or history.

---

### Summary Table: Types of Information

| Type | Purpose | How often it changes | Who can see | Who can edit |
|------|---------|----------------------|-------------|--------------|
| Organisational | Which organisation; org-level context | Rarely | Senior managers, compliance, application | Administrators only; logged |
| Service / ward | Which services exist; grouping of people | Occasionally | Managers, compliance, inspectors, application | Managers / administrators; logged |
| Person-level care | Folder content; care plans, risks, notes, incidents | Often | Staff for their people, managers, compliance, inspectors (read-only) | Responsible staff only; inspectors never; all edits logged |
| Compliance status | In date, due, overdue; Green/Amber/Red | Often (rule-driven) | Staff, managers, compliance, inspectors | Only via real events (e.g. review completed); never manual “fix”; inspectors never |
| Audit and history | Who did what, when; previous versions | Grows only (append) | Managers, compliance, inspectors, staff for own actions | No one; append-only |

---

## 3. Documents vs Records

The system holds two different kinds of things that people often call “documents”. They must be treated differently in Firebase and in the application. One is **structured records**; the other is **uploaded documents**.

---

### Structured Records (Forms, Statuses, Reviews)

**What they are:** Information that the user enters **through the application** in a structured way: care plan text, risk assessment text, dates (last review, next review), choices from a list (e.g. level of risk), who is responsible, and so on. The application may show forms or screens; the user fills them in; the result is stored as **fields and values** (for example, “care plan text = this paragraph”, “last review date = 1 March 2024”). These are **records**, not files.

**Where they should live conceptually:** In the same place as the rest of the person’s care information: linked to the person, the folder, and the correct section and document type. Each record has a clear place in the hierarchy (organisation → service → person → folder → section → document type). So in Firebase, structured records sit in the **care information** area, organised by person and section, so that the application can always say “this is John’s current care plan” or “this is John’s risk assessment”.

**Why inspectors expect them to be treated differently from uploaded files:** Inspectors need to see the **current** care plan and risk assessment and to search or scroll through them. They also need to see **when** they were last updated and **who** updated them. Structured records can store both the content and the metadata (dates, who) in a way that the application can display and that the audit trail can use. If care plans were only PDFs, the system could not easily show “last reviewed on X by Y” or compare one version to another. Structured records support **current version**, **history**, and **traceability** in a way that a pile of PDFs does not.

---

### Uploaded Documents (PDFs, Scans, Images)

**What they are:** Files that users **upload** into the system: a scanned capacity assessment form, a PDF from the GP, a photo of a wound chart, or a signed DoLS authorisation. These are **files** (blobs or files), not form fields. They have a name, a type (e.g. PDF), and content that is not broken into fields by the application (though the application may show them for viewing).

**Where they should live conceptually:** In a **dedicated store for files**, but each file must be **linked** to a specific person, folder, section, and document type. So the system knows “this PDF is John’s capacity assessment” or “this file is the DoLS authorisation for Jane”. The link is part of the care information (e.g. “document type = capacity assessment; file reference = this identifier”); the actual file content lives in the file store. Firebase often has a part designed for file storage; that is where the bytes of the file go. The **metadata** (who uploaded it, when, which person and document type it belongs to) should be stored in a way that supports audit and search, and the file itself should not be overwritten silently—if a new version is uploaded, the old one should be kept or clearly superseded with a new date and user.

**Why inspectors expect them to be treated differently:** Inspectors often ask to see “the actual form” or “the signed authorisation”. They want to see the PDF or the scan, not only a summary. So uploaded documents must be **stored safely**, **linked to the right person and document type**, and **never replaced without a trace**. If the system treated them the same as structured records, someone might overwrite the only copy of a capacity assessment or a DoLS form, and the evidence would be lost. Inspectors also expect to see **when** the file was added and **who** added it; that requires metadata and audit, not only the file bytes.

---

### Why Documents Must Never Overwrite Structured Records

**Rule:** Uploaded documents (files) must **not** be used to replace or overwrite structured records. For example, the care plan is a structured record (text, dates, who reviewed). Someone might upload a PDF of a care plan—for example, a scan of a paper version. That PDF should be stored as an **attachment** or **supporting document** linked to the care plan, not as a replacement for the structured care plan record. The **authoritative** current care plan for the system (and for status, reminders, and “last reviewed”) remains the structured record.

**Why:** The application needs structured data to work out compliance status (when was it reviewed? who reviewed it?) and to show “current care plan” in a consistent way. If a PDF could overwrite the structured record, the system would lose the dates and the link to the audit trail, and reminders and status would break. Inspectors expect to see both: the **live** care plan (structured) that the service uses day to day, and any **supporting** documents (uploads) that the service keeps. So: **structured records are the source of truth for “what is the plan now” and “when was it reviewed”; uploaded documents are evidence that supports or accompanies them, but they do not replace them.**

---

### Summary: Documents vs Records

| Kind | What it is | Where it lives conceptually | Who can change it | Inspector expectation |
|------|------------|-----------------------------|--------------------|------------------------|
| **Structured records** | Form data, text, dates, choices (care plan, risk assessment, reviews) | Care information, by person and section; one “current” per document type | Responsible staff; all changes logged | See current version, last review date, who reviewed; traceability |
| **Uploaded documents** | PDFs, scans, images (e.g. capacity form, DoLS authorisation) | File store, with strong link to person and document type; metadata for who/when | Staff who can add/replace; replace only with new version + trace | See the actual file; no silent overwrite; when and who added |

---

## 4. Access Control (Role-Based)

Access control means **who can see what** and **who can change or delete what**. Firebase does not decide the rules on its own; the application and the security rules that sit on top of Firebase must enforce them. This section describes, in plain English, how access should work and what must never be allowed.

---

### How Access Should Differ by Role

**Frontline staff (support workers, nurses, key workers):**

- **See:** The people they are assigned to (or the people in their ward or team) and those people’s care folders: care information, compliance status, and (where relevant) their own actions in the audit trail. They do **not** need to see other services’ people or organisation-wide data unless their role includes it.
- **Edit:** They can add and update care content for their people (daily notes, care plan, risk assessment, medication record, etc.) and complete reviews and sign-offs for which they are responsible. They **cannot** edit other people’s folders, change organisation or service settings, or edit audit or history. They **cannot** delete critical evidence (incidents, safeguarding, complaints, signed-off content).
- **Purpose:** So that they can do their job (record care, update plans, complete reviews) without seeing or changing anything outside their remit.

**Managers:**

- **See:** All people and folders in **their** service (or services they manage), service-level compliance (how many Green/Amber/Red folders, what is overdue), audit and history for that service, and (if applicable) organisation-level summary. They need to see who is responsible for what and what actions are outstanding.
- **Edit:** They can update service-level information (e.g. service name, who is responsible for a person or a document type). They may be able to complete or sign off certain governance actions (e.g. audit completed, investigation closed). They **cannot** edit care content in a way that bypasses the responsible staff (e.g. they do not usually write the care plan instead of the key worker), and they **cannot** delete critical evidence or edit audit/history. They **cannot** change organisation-level settings unless they are also administrators.
- **Purpose:** So that they can oversee compliance, allocate work, and prepare for inspection without being able to alter or delete evidence inappropriately.

**Inspectors (read-only):**

- **See:** Whatever the service decides to show them—typically the same structure as staff see: organisation and service information, a list of people (or a sample), and the full folder for each person (sections, documents, compliance status, and where appropriate audit and history). They may also see service-level compliance. They see **read-only** views: no edit buttons, no delete, no settings.
- **Edit:** **Nothing.** Inspectors must **never** be able to change, add, or delete any care content, any status, any organisation or service data, any audit or history, or any uploaded document. Their access is view-only so that they can see the evidence without any risk of altering it.
- **Purpose:** So that inspection is fair and safe: inspectors see the real picture and cannot accidentally or deliberately change the record.

**Compliance leads and administrators:**

- **See:** May see organisation-wide and all services, all compliance status, and audit and history as needed for audit and governance.
- **Edit:** Compliance leads may have limited edit (e.g. complete audit records, mark audit actions). Administrators may change organisation and service information and user roles and permissions. Neither should be able to delete critical evidence or edit past audit/history. Any high-risk action (e.g. change of role, change of organisation) should be logged.
- **Purpose:** So that the system can be run and governed without giving anyone the power to destroy evidence or falsify the past.

---

### What Inspectors Must NEVER Be Able to Change

Inspectors must have **no ability** to:

- Change any care content (care plan, risk assessment, daily notes, medication, incidents, safeguarding, complaints).
- Change compliance status (e.g. mark something as Green or in date).
- Add or remove documents or records.
- Change organisation or service information.
- Change who is responsible for a person or a document.
- Edit or delete any audit or history entry.
- Upload, replace, or delete any file (e.g. PDF, scan).

The system must enforce this by **role**: the inspector role has no write or delete permissions on any of the data that represents evidence or governance. That way, inspection cannot alter the record, and the service can demonstrate that inspector access is read-only.

---

### What Staff Must Never Be Able to Delete

Staff (including managers) must **not** be able to **permanently delete**:

- **Incident reports** (and linked investigation and lessons learned).
- **Safeguarding concerns and outcomes.**
- **Complaint records and responses.**
- **Signed-off or current care plans and risk assessments** (they may be superseded by a new version, but the previous version must be kept as history, not deleted).
- **Audit and history entries** (who did what, when).
- **Uploaded documents** that are critical evidence (e.g. capacity assessment, DoLS authorisation) in a way that would make them unrecoverable. If a new version is uploaded, the old one may be archived but not wiped without a controlled, audited process.

The application and Firebase security rules must **prevent** delete (or allow only “archive” or “mark as superseded” with the original retained). If the organisation has a role that can “delete” in exceptional circumstances (e.g. legal right to erasure), that must be tightly controlled, fully audited, and separate from normal staff roles. For routine use, **no deletion of critical evidence** is the rule.

---

## 5. Audit and Traceability

Firebase must support the system’s need to **track who did what**, **when things changed**, and **what the previous version was**, and to **make this visible during inspections**. This section is in plain English: what “support” means and how it shows up for inspectors.

---

### Tracking Who Did What

**Requirement:** For every important action (create care plan, update risk assessment, complete a review, record an incident, upload a file), the system must record **who** did it. “Who” means a user or role that can be identified (e.g. linked to a staff member or inspector). This information must be stored in the **audit and history** area, not only inside the document itself, so that it cannot be changed when the document is edited.

**How Firebase supports it:** Whenever the application writes or updates care content or compliance status, it also writes an **audit entry**: what was done (e.g. “care plan updated”), which person and document it refers to, who did it (user or role identifier), and when. Those entries live in a dedicated place (e.g. an audit log or history store) that is append-only: new entries are added, old ones are not edited or deleted by users. So Firebase holds both the **current** care content and the **log** of actions. The application can then show “last updated by Jane Smith on 1 March 2024” and, if needed, a full list of changes for that document or that person.

**Visible during inspections:** Inspectors can ask “who reviewed this?” and “who last changed this?”. The application should be able to display the answer from the audit data that Firebase holds. If Firebase did not store audit entries separately and in a protected way, the service could not prove who did what.

---

### Tracking When Things Changed

**Requirement:** For every important action, the system must record **when** it happened (date and, where useful, time). So the service can answer “when was this care plan last reviewed?” and “when was this incident recorded?”. Dates must not be editable by normal users after they are stored.

**How Firebase supports it:** Each audit entry includes a timestamp (when the action occurred). The care content and compliance status may also store “last updated” and “last review” dates. Those dates are written when the action happens and are not overwritten by a later edit (or, if they are updated, the update is itself an audited action, e.g. “review completed on 1 March”). So Firebase holds the dates in a way that the application can read and display, and that users cannot arbitrarily change.

**Visible during inspections:** Inspectors check that reviews happen on time and that incidents and safeguarding are followed up quickly. They look at “last review date” and “incident date” and “when was risk assessment updated”. If Firebase holds these dates reliably and they are shown in the application, the service can demonstrate that it is recording and responding in a timely way.

---

### Preserving Previous Versions

**Requirement:** When a care plan or risk assessment is replaced by a new version (after a review), the **previous** version must be kept so that the service can show “what was in place before” and “what was in place when [an incident] happened”. Preservation may be for a defined period (e.g. retention policy) but during that period the old version must not be overwritten or deleted by normal users.

**How Firebase supports it:** When the user completes a new care plan and it becomes “current”, the application can: (1) copy the previous “current” version into a **history** area (linked to the same person and document type, with the date it was current and the date it was replaced), and (2) set the new version as current. So Firebase holds both the **current** record and one or more **historical** records. The current record is the one used for day-to-day display and for status; the historical records are used only for “show me the previous version” or for audit. They are not edited or deleted in normal use.

**Visible during inspections:** Inspectors may ask “what was the care plan when this incident happened?”. If the system has kept the previous version and the date it was current, the service can show it. If Firebase did not preserve history and only kept the latest version, the past would be lost and the service could not answer.

---

### Making Audit and Traceability Visible During Inspections

**Requirement:** The application that inspectors use must be able to **show** who did what and when, and (where relevant) previous versions, without the inspector having to ask for a separate “audit report” from IT. So: “last reviewed by X on date Y” on the care plan screen, and the ability to open a list of changes or a previous version if the inspector asks.

**How Firebase supports it:** By storing audit and history in a structured way (who, what, when, and optionally why and previous version), Firebase gives the application the data it needs to build those views. The application then displays them in the inspector view (read-only). So Firebase does not “show” anything directly to the inspector; it **holds** the data that the application uses to show traceability. If that data is complete and protected (append-only, no user deletion), the service can make it visible during inspections in a way that inspectors trust.

---

## 6. Safety Guardrails

These are **non-negotiable** rules that the way Firebase is used (and the application and security rules on top of it) must enforce. They are written so that technical and non-technical stakeholders can agree what “safe” means for a regulated healthcare environment.

---

### No Silent Edits

**Rule:** No change to care content, compliance status, or critical evidence may happen without a **traceable** action. That means: every change is linked to a user (or a clearly logged system process) and a time. There is no “background” process that silently overwrites a care plan or clears an “overdue” status without a recorded review. If something changes, the system (and Firebase) must record who or what caused it and when.

**Why:** Silent edits would make the record untrustworthy. Inspectors need to see that changes are deliberate and accountable. So: **no silent edits**—every change is logged and attributable.

---

### No Deletion of Critical Evidence

**Rule:** The system must **not** allow users to permanently delete incident reports, safeguarding records, complaint records, signed-off care content (at least as history), audit entries, or critical uploaded documents (e.g. capacity assessment, DoLS authorisation). Either delete is disabled for these, or the only option is “archive” or “mark as superseded” with the original content retained and audited.

**Why:** Deleting evidence undermines accountability and can hide harm or failure. CQC and legal expectations require the service to retain and produce records. Firebase (and the application) must be set up so that critical evidence **cannot** be deleted by normal users.

---

### Clear Ownership

**Rule:** Every care folder and every document type for each person must have a **responsible role** (and where the system supports it, an assigned person). That information must be stored and displayed so that the application can send reminders to the right place and so that inspectors can ask “who is responsible for this?” and get an answer. Firebase must hold this “ownership” data (who is responsible for whom, and for which document type) and must not allow a folder or document type to have no responsible party when the compliance rules say someone must be responsible.

**Why:** Without clear ownership, reminders go nowhere and accountability is unclear. Inspectors expect the service to name who is responsible. So: **clear ownership** must be stored and enforced.

---

### Review Confirmation Points

**Rule:** Certain actions must be treated as **completed** only when a **human** has confirmed them. For example: a care plan review is “completed” only when a user (e.g. key worker) performs a sign-off action (e.g. ticks “review completed”, enters a signature, or presses “confirm”). The system must not automatically mark a review as complete when the date is reached or when someone only opens the document. Firebase stores the result (e.g. “review completed on 1 March by Jane”) only when that human action has occurred.

**Why:** Sign-off is the point at which the professional takes responsibility. Inspectors look for evidence that a human reviewed and approved. So: **review confirmation points** must be human-driven and then stored; Firebase holds the outcome, not the decision.

---

### Summary: Safety Guardrails

| Guardrail | What must be enforced | Why |
|-----------|------------------------|-----|
| **No silent edits** | Every change to content or status is traceable to a user or a logged process with a time. | So the record is trustworthy and auditable. |
| **No deletion of critical evidence** | Users cannot permanently delete incidents, safeguarding, complaints, signed-off content (as history), audit, or critical uploads. | So evidence is retained for accountability and inspection. |
| **Clear ownership** | Every folder and document type has a responsible role/person; stored and used for reminders and display. | So accountability and escalation work. |
| **Review confirmation points** | Reviews and key completions are stored only after a human sign-off action; no auto-complete. | So the record reflects real professional responsibility. |

---

## 7. Summary: Firebase and CQC Readiness

| Topic | In one sentence |
|-------|------------------|
| **Firebase responsibilities** | Firebase holds and serves the system’s information (care, status, audit, org, service); it does not decide care or compliance rules or send reminders itself. Separation keeps evidence and accountability clear for inspections. |
| **Types of information** | Organisation, service, person-level care, compliance status, audit and history—each with a purpose, change frequency, and rules for who can see and edit. Inspectors see but do not edit. |
| **Documents vs records** | Structured records (forms, statuses, reviews) are the source of truth for “current” and for traceability; uploaded documents (PDFs, scans) are stored and linked but must not overwrite structured records. Both must be traceable and not silently overwritten. |
| **Access control** | Frontline staff see and edit their people’s folders; managers see service-level and governance; inspectors see read-only. Inspectors must never change anything. Staff must never delete critical evidence. |
| **Audit and traceability** | Firebase holds who did what, when, and (where needed) previous versions; append-only and protected. The application uses this to show “who reviewed”, “when it changed”, and history during inspections. |
| **Safety guardrails** | No silent edits; no deletion of critical evidence; clear ownership; human sign-off for reviews and key completions. These are non-negotiable for regulated healthcare. |

---

*This document is the definitive plain-English reference for using Firebase safely in the digital CQC readiness system. It should be used when designing or configuring Firebase and when validating that the setup meets clinical, legal, and inspection requirements.*

*Document version: 1.0 | Plain English only | No code or Firebase syntax.*
