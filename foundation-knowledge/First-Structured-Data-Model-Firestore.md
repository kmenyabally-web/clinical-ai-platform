# First Structured Data Model for Firestore

**Plain-English Definition for the Initial Live Build of a Digital CQC Readiness System**

*This document defines the first structured data model for the place where structured information is stored (Firestore) to support the initial live build. It describes why structured data is needed, what categories of information exist, what is held at organisation, service, and person level, what audit and history must record, and what must not be part of the first model. It is not a database schema. It is not a technical design. It does not contain code or database terminology. Plain English only.*

---

## 1. Purpose of Structured Data

### Why Structured Data Is Needed in This System

- **The system must show and use information in a consistent way.** Staff and inspectors need to see the care folder (eight sections, document types), the status of each document (in date, due, overdue), who to contact, allergies, medication list, last review date, next review date, and the emergency summary—without opening many separate files. For that to work, the system must hold information in a **structured** form: named pieces of information (for example “care plan text,” “last review date,” “who to contact”) that the application can read, display, and use to work out status and to build the right screens. That is structured data: information the system can find and use by name or type, not only by opening a file and looking at it.
- **Compliance status depends on dates and on what exists.** The system must know “when was the care plan last reviewed?” and “when is it next due?” to show Green, Amber, or Red and to drive reminders. Those dates, and whether a document type has content or not, must be held in a form the application can read quickly. If they were only inside uploaded PDFs or images, the system would have to “read” every file to work out status, which would be slow, unreliable, and unsafe. Structured data holds the dates and the “does this exist?” information so that status is calculated from rules and data, not from guessing or from opening files.
- **The audit trail depends on knowing who did what and when.** When someone updates a care plan or completes a review, the system must record who did it and when. That is easiest and most reliable when the update is a change to a structured record (so the system can write “user X updated care plan at time Y”) and when the audit log itself is a separate, structured list of actions. Structured data supports traceability and accountability so that the service can answer inspectors’ questions and demonstrate that humans are responsible for what is in the folder.
- **The emergency summary must pull from one place.** The seven emergency-critical items (allergies, medication, key risks, who to contact, communication needs, evacuation plan, resuscitation status) must appear in one view that staff can open quickly. That view is built by reading the right pieces of information from the folder. If everything were only in uploaded files, the application could not build that view without opening and interpreting every file. Structured data (or a clear link from the emergency summary to the right structured information) makes the emergency view reliable and fast.

---

### How Structured Data Differs from Uploaded Documents

- **Structured data** is information the system holds in named, readable form: for example “care plan text,” “last review date,” “next review date,” “who to contact,” “allergies,” “medication list.” The application can read each piece by name and use it for display, status, reminders, and the emergency summary. It can also record “who changed this and when” when someone updates it. Structured data is what drives the folder structure, compliance status, and the audit trail.
- **Uploaded documents** are **files**: PDFs, scans, images. The system stores the file so that staff and inspectors can open and view it. The system also stores **who** uploaded it, **when**, and **which section and document type** the staff member chose (so the file appears in the right place in the folder). But the **content inside** the file (the text or image) is not something the system “reads” to work out status or to build the emergency summary. The application displays or opens the file; it does not use the inside of the file to calculate “in date” or “overdue” or to pull “allergies” into one view.
- **They are kept separate.** Structured data (care plan text, dates, who to contact, allergies, and so on) lives in the **structured store**. Uploaded files live in **file storage**. Each file is **linked** to a person, a section, and a document type so that the folder shows “this file is the capacity assessment for this person in Section A.” But the file does **not** replace or overwrite the structured record. So if the service has both a structured care plan (text and dates) and a PDF of the care plan attached, the structured record remains the source of truth for “when was this reviewed?” and “what is the next review date?”; the PDF is supporting evidence. That separation protects status and audit and keeps the emergency summary buildable from structured data.

---

## 2. Top-Level Information Categories

The structured store holds four **top-level categories** of information. Everything the system needs for the first live build fits into one of these. They are the highest-level way to describe what exists in the store.

---

### Organisation-Level Information

- **What it represents:** Information that exists **once per organisation** (the provider that runs one or more services). It answers “which organisation is this?” and “what are its main details and how is it set up?” It does not hold care content or person-level data; it holds the identity and high-level details of the organisation so that the system can show the right name, list the right services, and (when needed) report or filter by organisation.
- **Why it is a top-level category:** The system serves one organisation in the first build (or one organisation per deployment). Organisation is the top of the hierarchy: organisation → services → people → care folders. So “organisation information” is its own category, and everything else (services, people, folders) belongs under or is linked to it.

---

### Service or Ward-Level Information

- **What it represents:** Information that exists **once per service or ward** (each care home, ward, team, or service the organisation runs). It answers “which service is this?” and “what type of service is it?” and “how is this service doing on compliance overall?” It does not hold the full care folder for each person; it holds the service’s identity, type, and summary information (for example how many people, how many folders in date or overdue) so that managers can see the service view and so that staff and inspectors know which service they are looking at.
- **Why it is a top-level category:** People and care folders belong to a service. Staff and managers see data by service. Inspectors inspect at service level. So “service information” is a distinct category: one level below organisation and the level at which “list of people” and “service-level compliance” are grouped.

---

### Person-Level Care Information

- **What it represents:** Information that exists **once per person** using the service. It includes who the person is (identity reference), which service they belong to, the **structure** of their care folder (eight sections, document types under each), the **content** that staff enter (care plan text, risk assessment text, daily notes, who to contact, allergies, medication list, consent record, incident descriptions, and so on), the **dates** that drive compliance (last review date, next review date for each document type), who is responsible for the person (and if applicable for each document type), and the **status** of each document type and of the folder (or the data the application uses to calculate status). This is the largest category: it is what staff and inspectors see when they open a person’s folder.
- **Why it is a top-level category:** The care folder is the centre of the system. Every person has one folder with the same eight-section structure. Person-level care information is where the folder lives in structured form: the content, the dates, the responsibility, and the status (or the raw data for status). It is separate from “organisation” and “service” (which describe the context) and from “audit” (which is a log of actions, not the care content itself).

---

### Audit and History Information

- **What it represents:** A **log of actions**: who did what, and when. Each entry records an action (for example “care plan updated,” “document uploaded,” “review completed,” “responsibility changed”) and who did it (the signed-in user) and when (date and, where possible, time). It may also record **for which person** or **for which document type** the action was done, so that the service can show “who reviewed this care plan?” or “who added this document?” The audit log does not hold the care content; it holds the **record of changes** to the content and to key settings. It is append-only: new entries are added when actions occur; entries are not edited or deleted by users.
- **Why it is a top-level category:** Audit is separate from care content so that it cannot be overwritten or mixed with the folder. It is a distinct category so that the system can enforce “audit is never editable or deletable” and so that inspectors and managers can read the log without touching the care content. Keeping audit as its own top-level category protects traceability and supports CQC expectations of accountability.

---

## 3. Organisation-Level Information

### Types of Information That Exist Once per Organisation

- **Organisation identity.** The name of the organisation (the provider) and a stable identifier so that the system can refer to it consistently. So the application can show “you are in [organisation name]” and can filter or report by organisation when needed.
- **Registered locations (if the organisation uses them).** If the organisation is required to hold or show registered locations (for example for CQC registration), that information exists at organisation level: which locations are registered, their names or references, and how they relate to the organisation. This supports the service’s ability to show inspectors that it knows its registered footprint. Not every first build will use this; it is included where the organisation needs it for governance or inspection.
- **Governance and key contacts (organisation-level).** High-level contacts or roles that apply across the organisation (for example designated safeguarding lead at organisation level, or compliance lead). This is not the full list of staff; it is the small set of organisation-wide roles or contacts that inspectors or managers may need to see. Who is responsible for maintaining this is usually an administrator or senior manager.

---

### Who Is Responsible for Maintaining This Information

- **Administrators or senior managers.** Organisation identity, registered locations, and organisation-level governance contacts are maintained by a small number of people with the right role (for example system administrator or senior manager). Frontline staff do not edit organisation-level information. Changes (for example organisation name change, new registered location) should be rare and should be recorded in the audit log (who changed what, when).

---

### Why Inspectors Care About It

- **Context and registration.** Inspectors need to know which organisation and which service they are inspecting. Organisation-level information gives the correct name and, where relevant, registered locations so that the service can demonstrate it knows its own structure and registration.
- **Accountability.** Organisation-level governance contacts (for example safeguarding lead) show that the service has designated roles. Inspectors may ask who holds these roles; the structured store holds that information at organisation level so it can be shown in one place.
- **Well-Led.** CQC’s Well-Led domain includes how the organisation is run and how it oversees its services. Clear organisation identity and governance information support the service’s ability to show that it is organised and accountable at organisation level.

---

## 4. Service / Ward-Level Information

### Types of Information That Exist per Service or Ward

- **Service identity.** The name of the service (ward, team, care home) and a stable identifier, and which organisation it belongs to. So the system can show “you are in [service name]” and can list the right people and folders for that service.
- **Type of service.** What kind of service it is (for example mental health, learning disability, or other complex care) so that the system can apply the right document types and compliance rules (some documents are conditional on service type). This supports the Active Care Folder blueprint, which defines mandatory and conditional documents by service type.
- **List of people in the service.** A reference to which people belong to this service (or a way to list them). So staff and managers see the right list of people when they open the service, and inspectors can see the same list when they inspect. The actual person-level care information (folder, content, dates) is held under person-level information; the service holds the **list** or **link** to those people.
- **Overall compliance status (summary).** A summary of how the service is doing: for example how many people have folders that are fully in date, how many have items due, how many have items overdue, or how many people have Red or Amber folders. This may be stored as a summary that is updated when folder status changes, or it may be calculated when the manager opens the service view. Either way, the structured store holds what is needed so that the service-level compliance screen can show “this service has X people in date, Y due, Z overdue” and can list people who need attention. Who is responsible for maintaining service-level information is usually the manager for that service (or an administrator for identity and type).

---

### How This Information Rolls Up for Inspection

- **Inspectors inspect at service level.** They want to see “this service” and then choose which people to look at. Service-level information gives the service name, type, and the list of people so that the inspector (or the manager showing the inspector) can open the service and then open individual folders. The overall compliance summary (how many in date, due, overdue) helps the manager answer “how is this service doing?” and helps the inspector see that the service has oversight. So service-level information **rolls up** in the sense that it summarises the people and folders in that service and gives the manager (and optionally the inspector) a single view before drilling into person-level folders. It does not duplicate the full folder content; it holds identity, type, list, and summary only.

---

## 5. Person-Level Information

### Types of Structured Information That Exist per Person

- **Identity reference (not full clinical record).** Who the person is for the purposes of this system: a stable identifier and the name or display name the service uses. This is **not** the full clinical or social care record from another system; it is the minimum the CQC readiness system needs to show “this is [person name]” and to link the folder, the documents, and the audit to the right person. No clinical history or detailed background is held here beyond what is needed for the folder and for display.
- **Which service they belong to.** So the system can show the right list of people per service and can apply access (staff see only their service’s people unless they have a broader role).
- **Care folder structure.** The eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality) and, under each section, the list of document types from the Active Care Folder blueprint. For each document type, the system knows whether there is content or an uploaded file (or both). So the application can show the folder with the right sections and document types every time.
- **Structured care content.** The actual content staff enter for each document type: care plan text, risk assessment text, daily notes, who to contact, allergies, medication list, consent record, incident descriptions, and so on. Where the blueprint defines a document that is maintained as text or structured entries (rather than only as an upload), that content lives here so the application can display it and use it for status and for the emergency summary.
- **Key review dates.** For each document type that has a review cycle: last review date, next review date, and (where recorded) who completed the last review. This is what the application uses to work out “in date,” “due,” or “overdue” and to drive reminders and tasks.
- **Responsibility.** Who is responsible for this person (for example key worker) and, if the system supports it, who is responsible for each document type. So tasks and reminders can be assigned to the right person and the audit trail can show “responsible person.”
- **Folder and document-type status (or the data to calculate it).** Either the status for each document type and for the folder (in date, due, overdue; Green, Amber, Red) is stored after the application calculates it, or only the raw data (dates, presence of content or files, events like incidents) is stored and the application calculates status when the user views the screen. In either case, the structured store holds what is needed so that staff and managers see the correct status and so that the same picture is available to inspectors.

---

### How This Links to Documents Without Duplicating Them

- **Uploaded documents (files) are stored separately.** The structured store does **not** hold the PDF or image itself. It holds: the **fact** that a document of a given type exists (or a link/reference to the file), who uploaded it, and when. So the folder can show “Section A, capacity assessment: added by [user] on [date]” and, when the user opens it, the application fetches the file from file storage and displays it. The structured store does not duplicate the file; it holds the **metadata** (who, when, section, document type) and the **link** so that the right file is shown in the right place.
- **Structured content and files can both exist for one document type.** For example the care plan may have both: structured text and dates (care plan text, last review date, next review date) in the structured store, and an attached PDF in file storage. The structured record is the source of truth for status and for “who reviewed and when”; the PDF is supporting evidence. The link between them is “this file is attached to this person’s care plan” so that when someone opens the care plan they see the structured content and can also open the PDF. No duplication of the care plan content: the structured store holds the text and dates; the file store holds the file.
- **Emergency summary is built from structured information.** The seven emergency-critical items (allergies, medication, who to contact, communication needs, evacuation plan, resuscitation status, key risks summary) are held as structured information (or as clear references to the right document types) so that the application can build the emergency view without opening files. If a piece of information exists only in an uploaded file (for example a scanned DNAR form), the system may hold a short summary or a “see attached document” reference in the structured store so that the emergency summary can still point to it without duplicating the file.

---

## 6. Audit and History Information

### What Actions Must Always Be Recorded

- **Document uploads.** When a staff member uploads a file (PDF, scan, image) to the folder, the system must record **who** uploaded it, **when**, and **what** (which person, which section, which document type). So the service can answer “who added this document?” and “when was it added?”
- **Structured content created or updated.** When a staff member creates or updates structured content (for example care plan text, risk assessment text, daily note, who to contact, allergies, incident record), the system must record **who** made the change and **when**, and optionally **what** (for example “care plan updated” or “risk assessment updated”). So the service can answer “who last changed this?” and “when?”
- **Reviews and sign-offs.** When a staff member completes a review (for example care plan review, risk assessment review) and signs off, the system must record **who** completed the review and **when**. So the service can answer “who reviewed this?” and inspectors can see that a human took the action. The update to “last review date” and “next review date” is part of the person-level structured data; the **audit** entry is the separate log that “user X completed care plan review for person Y at time Z.”
- **Responsibility changes.** When a manager (or authorised user) assigns or changes who is responsible for a person or for a document type, that change must be recorded (who made the change, when). So the service can show who had responsibility at any point.
- **Organisation or service information changes.** When an administrator or manager changes organisation name, service name, registered location, or similar, that change must be recorded (who, when). So the service can show that changes to structure or settings are traceable.

---

### Why This Information Must Never Be Editable or Deletable

- **Tampering would destroy accountability.** If users could edit or delete audit entries, someone could remove or change the record of “who did what, when.” Then the service could not prove what really happened, and inspectors could not trust the trail. So the structured store must treat the audit log as **append-only**: new entries are added when actions occur; existing entries are **not** changed or removed by normal users. Only in exceptional, governed cases (for example a super-administrator fixing a proven system error, with that action itself audited) might the organisation allow a change to the audit store, and that would be a strict exception with its own controls.
- **Legal and regulatory expectations.** Regulators and courts expect care records to be **traceable** and **tamper-evident**. An editable or deletable audit trail would not meet that expectation. So from the first live build, the audit information is held separately from care content and is protected from normal user edit and delete. That supports CQC inspection readiness and Well-Led (accountability and governance).

---

## 7. Explicit Exclusions

The following must **not** be part of the first structured data model for Firestore. They are out of scope for the initial live build and are excluded to protect safety and scope.

---

### Full Clinical Notes or Full Clinical Record

- **What is excluded:** The system does **not** hold the full clinical record (for example full psychiatric history, full medical history, or the complete content of every consultation or therapy session). It holds what the Active Care Folder blueprint and the first build scope require: care plan, risk assessment, daily notes, who to contact, allergies, medication list, consent, incidents, and the other document types in the eight sections. It does not duplicate or replace the electronic patient record or the full clinical file.
- **Why excluding protects safety and scope:** The CQC readiness system is for **CQC readiness and the care folder**: one place to hold the folder, show status, support reviews, and show evidence to inspectors. It is not a full clinical system. Holding full clinical notes would expand scope, create duplication, and could create confusion about “source of truth.” Excluding them keeps the system focused and avoids the risk of holding more sensitive clinical data than the organisation has governed for this system.

---

### Automated Decisions or System-Generated Judgements

- **What is excluded:** The structured store does **not** hold decisions or judgements that the **system** made by itself (for example “system marked this as overdue,” “system suggested next review date”). The first build is rule-based and human-operated: status is calculated from rules and dates; reviews are completed by staff and recorded; the system does not “decide” what is compliant or what to do. So the store holds dates, content, and audit of **human** actions; it does not hold “automated decision” or “system judgement” as a type of information.
- **Why excluding protects safety and scope:** CQC and the first build scope expect that humans are accountable for care and for reviews. If the system held “automated decisions,” the service would have to explain and govern them. The first build deliberately has no automated decisions; excluding them from the structured model keeps the model aligned with that and protects safety (no hidden system decisions affecting the folder).

---

### AI-Generated Content or AI-Generated Judgements

- **What is excluded:** The structured store does **not** hold AI-generated text, AI-suggested document types, AI-generated gap lists, AI summaries, or any other **AI-generated** content or judgement. The first build has no AI. When AI is added in a later phase, where that information is stored and how it is labelled will be defined in a separate model and governance; it is not part of the first structured data model.
- **Why excluding protects safety and scope:** AI is out of scope for the initial live build and the MVLS. Including “AI-generated” in the first model would imply that the system already uses AI and would require governance (prompts, human confirmation, training) that the first build does not have. Excluding it keeps the first model minimal and within approved scope.

---

### Data Imported from Other Systems

- **What is excluded:** The first structured data model does **not** include information that is **imported or synced** from other systems (for example electronic patient record, pharmacy system, local authority system). In the first build, data is **entered or uploaded by staff** through the application. There is no “import” or “sync” from elsewhere. So the model does not have a category for “imported from EPR” or “synced from X.”
- **Why excluding protects safety and scope:** Integrations are out of scope for the first build. Adding imported data to the model would expand scope and would require the organisation to govern data quality, mapping, and timing of imports. Excluding it keeps the first build standalone and focused on staff-entered and staff-uploaded data only.

---

### Analytics or Behavioural Tracking Beyond Audit

- **What is excluded:** The structured store does **not** hold analytics events (for example “user clicked X,” “screen Y viewed for Z seconds”) unless they are part of the **audit trail** (for example “user opened folder for person P at time T” if the organisation decides that is needed for accountability). General usage analytics or behavioural tracking are not part of the first model.
- **Why excluding protects safety and scope:** The first build stores what is needed for the care folder, status, reminders, and audit. Analytics would add a new category of data and would require data protection and governance (purpose, retention, consent). Excluding it keeps the model minimal and avoids holding data that is not needed for the initial live build or for inspection readiness.

---

## 8. Summary

| Category | What it holds | Why it is separate |
|----------|----------------|---------------------|
| **Organisation-level** | Organisation identity, registered locations (if used), organisation-level governance contacts. | One per organisation; top of hierarchy; maintained by administrators/senior managers. |
| **Service/ward-level** | Service identity, type, list of people, overall compliance summary. | One per service; rolls up for managers and inspectors; does not duplicate person-level content. |
| **Person-level care** | Identity reference, service, folder structure, structured content, review dates, responsibility, status (or data to calculate it). | One per person; the folder in structured form; links to files without duplicating them. |
| **Audit and history** | Log of who did what, when (uploads, content changes, reviews, responsibility changes, org/service changes). | Append-only; never editable or deletable; separate from care content for traceability. |

**Exclusions from first model:** Full clinical record; automated decisions; AI-generated content or judgements; imported/synced data from other systems; analytics beyond audit. These protect safety, scope, and alignment with the first build and CQC expectations.

---

*This document defines the safe, minimal structured data model for the first live build of the digital CQC readiness system. It should be used when designing or implementing the place where structured information is stored and when explaining to stakeholders what information the system holds and why.*

*Document version: 1.0 | Plain English only | No database terminology or code.*
