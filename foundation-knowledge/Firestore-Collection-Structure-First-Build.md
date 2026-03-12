# Firestore Collection Structure for the First Live Build

**Plain-English Definition of the Collection Plan for a Digital CQC Readiness System**

*This document defines the collection structure required for the first live build of the digital CQC readiness system. It describes the top-level collections, how information sits under them, how structured records relate to uploaded documents, who is responsible for and who can view or update each area, where audit lives, and what must not be created yet. It is not a database schema. It does not name fields. It does not write rules or code. Plain English only.*

---

## 1. Purpose of the Collection Plan

### Why Defining Collections Upfront Matters

- **Safety.** Care information and audit must be stored in the right place so that the application can enforce “staff see only their service’s people,” “inspector can only read,” and “audit is never edited or deleted.” If collections are created ad hoc or mixed (for example audit mixed with care content), the system may not be able to protect the audit trail or to restrict access correctly. Defining the collection structure upfront ensures that organisation, service, person, folder, and audit each have a clear, separate place. That separation is the basis for safe access control and for rules that can be written and tested in a consistent way.
- **Inspection readiness.** Inspectors need to see the care folder in a clear structure (eight sections, document types) and to see who did what and when. The collection plan mirrors the way the system is used: organisation → services → people → care folder (sections, document types). When the structure is defined upfront, the application can present the same hierarchy to inspectors and can answer “where is the care plan?” and “where is the audit?” without confusion. A consistent, documented structure also supports the service’s ability to explain to CQC how the system is organised.
- **Long-term maintainability.** If the first build uses a clear, documented collection plan, future changes (for example adding a new document type or a new section) can be made in a predictable way. New team members or suppliers can understand where information lives. Fixes and extensions are less likely to create duplicate or conflicting structures. Defining collections upfront is an investment in keeping the system understandable and maintainable as the organisation grows or as requirements evolve.

---

## 2. Top-Level Collections

The first build requires **four top-level collections**. Everything the system stores in the structured store fits into one of these. No other top-level collections are needed for the first build.

---

### Organisations

- **What it represents:** The place where **organisation-level information** is held. Each organisation (the provider that runs one or more services) has one record in this collection. The information includes the organisation’s identity (name and a stable identifier), any registered locations the organisation uses (if applicable), and organisation-level governance contacts (for example designated safeguarding lead). This collection does not hold care content or person-level data; it holds only what is needed to identify the organisation and to support registration and governance.
- **Why it must exist at this level:** The system serves one organisation in the first build (or one organisation per deployment). Organisation is the top of the hierarchy: organisation → services → people → care folders. Giving organisation its own top-level collection makes that hierarchy explicit and allows the application to load organisation information once and to scope everything else (services, people) under it. It also keeps organisation-level data separate from service and person data so that access control and audit can treat “who can change the organisation name?” differently from “who can change a care plan?”

---

### Services

- **What it represents:** The place where **service or ward-level information** is held. Each service (ward, team, care home, or service the organisation runs) has one record in this collection. The information includes the service’s identity (name and a stable identifier), which organisation it belongs to, the type of service (for example mental health, learning disability), and a summary of compliance for that service (for example how many people in date, due, or overdue, or counts that support that summary). This collection does not hold the full care folder for each person; it holds only what is needed to list the service, show its type, and show the service-level compliance view. The list of people in the service is found by looking at which people belong to this service (people hold a reference to their service), not by storing a copy of the list here.
- **Why it must exist at this level:** Staff and managers work by service. Inspectors inspect at service level. Giving services their own top-level collection (alongside organisations and people) allows the application to load “all services for this organisation” and then “all people for this service” in a clear way. It also allows the service-level compliance summary to be stored or calculated at the right level without mixing it with organisation or person data.

---

### People

- **What it represents:** The place where **person-level care information** is held. Each person using the service has one record (or one “root” record) in this collection. The information at the person level includes who the person is (identity reference and display name), which service they belong to, who is responsible for them (for example key worker), and the overall status of their care folder (or the data needed to calculate it). Under each person, the **care folder** lives in a dedicated place: the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality) and, under each section, the document types from the Active Care Folder blueprint. For each document type the system holds the structured content (where applicable), the last and next review dates, whether there is an uploaded file linked to it, and the status (or the data to calculate status). So the “people” collection is the top-level place for person information; the detailed folder (sections, document types, content, dates) sits under each person in a nested or sub-collection structure so that the application can open “this person’s folder” and find everything in one place.
- **Why it must exist at this level:** The care folder is the centre of the system. Every person has one folder. Giving people their own top-level collection (and the folder under each person) keeps all of a person’s care information together and makes it possible to scope access by “this user can see these people” (by service or by assignment). It also keeps person-level data separate from organisation and service (which are context) and from audit (which is a log of actions). Having “people” at the top level allows the application to list people by service, to open one person’s folder, and to enforce “staff see only their service’s people” in a consistent way.

---

### Audit Log (or Audit / History)

- **What it represents:** The place where **audit and history information** is held. It is a log of actions: each entry records who did what and when (and optionally for which organisation, service, or person). The entries are append-only: new entries are added when actions occur; existing entries are not edited or deleted by normal users. This collection does not hold care content; it holds only the record of changes (document uploads, content updates, reviews and sign-offs, responsibility changes, organisation or service information changes). The application (or the way entries are organised) should allow the service to find entries by person, by service, or by date so that managers and inspectors can answer “who reviewed this care plan?” or “what changed in this service last week?”
- **Why it must exist at this level:** Audit must be separate from care content so that it cannot be overwritten or mixed with the folder. Giving the audit log its own top-level collection makes that separation explicit and allows the system to apply different treatment to audit (append-only, no user edit or delete) than to organisation, service, or person data (which authorised users can update). Keeping audit at the top level also makes it clear to anyone building or governing the system that “this is where the trace of who did what lives” and that it is not nested under any editable record where it could be confused with content or accidentally changed.

---

## 3. Sub-Collections and Relationships

### Which Collections Sit Under Others

- **Under each organisation:** If the organisation uses registered locations, there may be a **nested place** (a sub-collection or equivalent) under the organisation record where each registered location is listed. That keeps “organisation identity and governance” in the main organisation record and “list of registered locations” in a clear, separate place under it. Not every first build will use this; it is needed only where the organisation must hold or show registered locations for CQC or governance.
- **Under each person: the care folder.** Under each person there is a **dedicated place** that holds the care folder. Within that place, the eight sections and the document types under each section are organised so that the application can find content and dates by section and by document type. The exact way sections and document types are grouped (for example one sub-collection per section, or one place per document type) is a design choice; the important point is that the folder is **under the person** and that the hierarchy is: person → folder → sections → document types (and their content, dates, and references to uploaded files). So when a user opens a person’s folder, the application reads from under that person; it does not have to look in a separate, flat list of “all care plans” or “all risk assessments” across all people.
- **Services and people: relationship without nesting.** Services do **not** contain a copy of all person records. Instead, each person holds a reference to the service they belong to. So “list of people in this service” is found by asking “which people belong to this service?” (a query or lookup), not by opening a sub-collection under the service. That avoids duplicating person information and keeps a single source of truth: the person record (and the folder under it) lives under “people,” and the service is referenced from the person. The same applies to organisation: each service holds a reference to its organisation so that “which organisation does this service belong to?” is clear without nesting all services under the organisation (though the organisation record itself lives in the organisations collection).

---

### What Information Belongs at Each Level

- **Organisation level:** Organisation identity; registered locations (if used), in a nested place under the organisation; organisation-level governance contacts. Nothing that changes often; nothing that is person-specific or care-specific.
- **Service level:** Service identity; organisation reference; service type; compliance summary (counts or summary data for the service view). No full care content; no list of document types per person. The “list of people” is derived by querying people by service, not stored as a duplicate list.
- **Person level (root):** Person identity reference; service reference; who is responsible; overall folder status (or data to calculate it). The rest of the person’s information (sections, document types, content, dates, references to uploaded files) belongs **under** the person in the care folder place.
- **Under person (care folder):** The eight sections; under each section, the document types; for each document type, the structured content (where applicable), last and next review dates, who completed the last review (where recorded), whether an uploaded file is linked (and a reference to that file in file storage), and status or the data to calculate status. So “what belongs at each level” is: organisation and service hold context and summary; person root holds identity and folder summary; under person, the folder holds the detailed structure and content that staff and inspectors see when they open the folder.
- **Audit log:** Each entry holds who did the action, when, what action (for example “care plan updated,” “document uploaded,” “review completed”), and optionally for which organisation, service, or person. Nothing else; no care content, no copies of text or dates. Only the trace of the action.

---

### Why This Hierarchy Supports Inspection Workflows

- **Inspectors start at organisation and service.** They need to see “which organisation?” and “which service?” and then “list of people in this service.” The hierarchy organisation → services → people (with service reference on each person) supports that: the application can show organisation, then list services for that organisation, then list people for the chosen service. No need to search across a flat list of everyone.
- **Inspectors then open a person’s folder.** They need to see the eight sections and the document types and content. The folder under each person supports that: once the inspector (or manager) selects a person, the application opens the place under that person where the folder lives and shows sections and document types in the order the blueprint expects. The hierarchy person → folder → sections → document types matches the way inspectors are trained to look at care folders (by section, then by document type).
- **Inspectors may ask “who did what?”** They need to see the audit trail for a person or for a document. The audit log as a separate top-level collection supports that: the application can look up entries by person (or by service or by date) and show “user X completed care plan review on [date]” without mixing that with the care content. So the hierarchy keeps “the folder” and “the log of who changed it” separate and findable.

---

## 4. Documents vs Structured Records

### How Structured Records Live in Collections

- **Structured records** are the information the application can read and use by name or type: organisation identity, service identity and type, person identity and responsibility, care plan text, risk assessment text, last and next review dates, who to contact, allergies, medication list, and so on. These live **inside** the collections described above: in the organisations collection, the services collection, the people collection (and under each person in the care folder place), and in the audit log. Each record is a set of named pieces of information that the application reads to build screens, calculate status, and show the emergency summary. The collection structure is the “where” for these records: organisation record in organisations, service record in services, person record and folder in people, audit entries in the audit log.

---

### How Uploaded Documents Are Referenced but Not Duplicated

- **Uploaded documents** (PDFs, scans, images) are stored in **file storage**, not in the structured store. The structured store does **not** hold the file itself. It holds only: a **reference** to the file (so the application knows where to find it in file storage), plus **who** uploaded it, **when**, and **which section and document type** the staff member chose. That reference and metadata live in the care folder under the person—typically under the relevant section and document type so that when the user opens “Section A, capacity assessment,” the application can show “added by [user] on [date]” and can use the reference to fetch and display the file from file storage. So uploaded documents are **referenced** from the structured store (person → folder → section → document type → “file reference and metadata”); they are **not** copied or duplicated into the structured store. The file stays in file storage; the structured store holds only the link and the traceability information (who, when, section, type).

---

### How Evidence Remains Traceable Without Copying Content

- **Traceability for uploads:** When a staff member uploads a file, the system does two things: (1) it stores the file in file storage and (2) it adds a reference and metadata (who, when, section, document type) in the care folder under the person, and (3) it adds an entry to the audit log (“user X uploaded document to section Y, type Z, for person P, at time T”). So the evidence is traceable: the folder shows “this document is here, added by [user] on [date],” the audit log shows the same, and the file itself is unchanged in file storage. No need to copy the file content into the structured store; the reference and the audit entry are enough for traceability.
- **Traceability for structured content:** When a staff member updates care plan text or completes a review, the system updates the structured record (the text, the dates) under the person’s folder and adds an entry to the audit log (“user X updated care plan for person P at time T” or “user X completed care plan review for person P at time T”). So the evidence is traceable: the folder shows the current content and dates, and the audit log shows who changed it and when. The audit log never holds a copy of the full care plan text; it holds only the fact that the action happened, who did it, and when. That keeps the audit log small and prevents duplication of care content while still giving full traceability.

---

## 5. Ownership and Access Intent

For each major collection, the following describes **who is responsible** for the information, **who can view it**, and **who can update it**. This is conceptual only; it does not define permissions or rules. It is the intent that the application and the access rules will enforce later.

---

### Organisations

- **Who is responsible:** Administrators or senior managers. They maintain organisation identity, registered locations (if used), and organisation-level governance contacts. Frontline staff are not responsible for this information.
- **Who can view it:** Staff and managers need to see the organisation name (and possibly registered locations) so they know which organisation they are in. Inspectors may see it when they are shown the system. The application will use it to scope “this organisation’s services and people.”
- **Who can update it:** Only administrators or senior managers (or a role the organisation defines for this). Updates should be rare (for example organisation name change, new registered location) and should be recorded in the audit log. No one else should be able to change organisation-level information.

---

### Services

- **Who is responsible:** Managers for that service, or administrators, for service identity and type. Managers are responsible for ensuring the service-level compliance summary is correct or for the process that updates it (if it is stored). Frontline staff do not create or delete services.
- **Who can view it:** Staff see their service (name, type) and the list of people in it. Managers see their service or services and the service-level compliance view. Inspectors may see service name, type, and list of people (and optionally the compliance summary) when they inspect. The application uses it to show “you are in [service]” and to list people by service.
- **Who can update it:** Managers or administrators for service identity and type (for example new service, service closed, service renamed). The compliance summary may be updated by the application when folder status changes (if the organisation chooses to store it) or may be calculated when the manager views the screen; in either case, only the application or a manager process should update it, not frontline staff editing it by hand. No one should be able to delete a service if people still belong to it without a governed process (for example move people first, then close the service).

---

### People and Care Folder

- **Who is responsible:** The key worker or the person assigned as responsible for that person (and, where the system supports it, the person responsible for each document type). They are responsible for ensuring the folder is up to date and for completing reviews. Managers may update responsibility (who is key worker) or may edit content where the organisation’s policy allows.
- **Who can view it:** Staff see the people they are allowed to see (usually their service’s people or the people assigned to them) and the full folder (sections, document types, content, dates, status, references to uploaded files). Managers see all people in their service and all folders. Inspectors see the same as managers in terms of **what** (people list, folders, content, dates, status) but in **read-only** mode: they cannot edit, add, or delete. The application uses the signed-in user’s role to decide who sees which people and whether they can edit.
- **Who can update it:** Staff (with the right role) can add or update structured content, complete reviews, and upload documents (the upload creates a file in file storage and a reference under the person’s folder). They can update only the people they are allowed to support. Managers may update responsibility or may edit content where policy allows. Inspectors must **not** be able to update anything. No one should be able to delete critical evidence (incidents, safeguarding, complaints) or to edit the audit log. The application and the access rules will enforce “staff can edit their people’s folders; inspector can only read.”

---

### Audit Log

- **Who is responsible:** No user is “responsible” for the audit log in the sense of maintaining it. The **application** is responsible for writing a new entry whenever a relevant action occurs (upload, content update, review completed, responsibility change, organisation or service change). The organisation is responsible for ensuring that the audit log is never edited or deleted by users and that it is retained in line with policy.
- **Who can view it:** Managers (and optionally compliance leads) can view the audit log for their service or for a person so they can answer “who did what, when?” Staff may see their own recent actions if the organisation allows. Inspectors may be shown the audit log (read-only) when they ask “who reviewed this care plan?” or “when was this updated?” No one should be able to edit or delete audit entries.
- **Who can update it:** No one. The audit log is append-only. Only the application adds new entries when actions occur. Normal users (staff, managers, inspectors) must not be able to edit or delete existing entries. Any exception (for example a super-administrator fixing a proven system error) would be a strict, governed process with the action itself audited elsewhere.

---

## 6. Audit and History Placement

### Where Audit and History Information Conceptually Lives

- **In its own top-level collection.** The audit log is a **separate** top-level collection, alongside organisations, services, and people. It is not nested under the organisation, under a service, or under a person. Each audit entry is a record in this collection. The application may organise or index entries so they can be found by organisation, by service, by person, or by date—but the **place** where they live is the audit log collection, not inside the care folder or inside the organisation or service record.
- **Why this placement:** If audit entries lived under each person (for example “under each person, a list of audit entries for that person”), the audit would be scattered and would be harder to protect with a single rule like “no one can edit or delete in the audit log.” It would also mix “the folder” (editable by staff) with “the log of who changed it” (not editable) under the same person, which could make it easier to make a mistake (for example a rule that allows “edit under person” could accidentally allow editing the audit list). Putting the audit log in its own top-level collection keeps it in one place and makes it clear that “this collection is different: append-only, no user edit or delete.”

---

### Why It Must Be Separated from Editable Records

- **Tampering.** If the audit log were stored inside the same place as care content (for example “under each person, a list of changes”), a user who can edit the person’s folder might, by mistake or intent, be able to edit or delete that list. Separating the audit log into its own collection allows the system to apply a different rule: “this collection: only the application can add; no user can edit or delete.” So the audit trail is protected from tampering.
- **Legal and regulatory expectations.** Regulators and courts expect care records to be traceable and tamper-evident. An audit trail that lives inside an editable area is harder to protect and to explain. A separate, append-only audit collection is the clearest way to show that “who did what, when” is never altered by users and is available for inspection and for legal purposes.
- **Clarity for inspection.** When an inspector asks “where is the audit trail?”, the service can say “it is in a separate place from the care folder, so that no one can change it.” That separation is easier to explain and to demonstrate when the audit log is its own collection rather than a list under each person or each document.

---

## 7. Explicit Exclusions

The following **must not** be created as collections or structures in the first build. Excluding them protects scope and compliance.

---

### Clinical Notes Repositories

- **What must not be created:** A collection (or equivalent structure) that holds **full clinical notes** or the **full clinical record**—for example every consultation note, every therapy session note, or the complete psychiatric or medical history. The first build holds only what the Active Care Folder blueprint and the first build scope require: care plan, risk assessment, daily notes, who to contact, allergies, medication list, consent, incidents, and the other document types in the eight sections. There is no “clinical notes” or “full record” collection.
- **Why excluding protects scope and compliance:** The CQC readiness system is for the care folder and inspection readiness, not for replacing or duplicating the full clinical system. Adding a collection for full clinical notes would expand scope, create duplication, and could create confusion about source of truth and data protection. Excluding it keeps the system focused and within what the organisation has governed for this build.

---

### AI Output Stores or Stores Used for Automated Decisions

- **What must not be created:** A collection that holds **AI-generated content** (for example AI-suggested document type, AI-generated gap list, AI summary) or **automated decisions** (for example “system marked as overdue,” “system-suggested next review date”). The first build has no AI and no automated decisions; the store holds only human-entered content, dates, and audit of human actions.
- **Why excluding protects scope and compliance:** AI and automated decisions are out of scope for the first build and the MVLS. Creating a place for them would imply they exist and would require governance (prompts, human confirmation, training) that the first build does not have. Excluding them keeps the collection plan aligned with the approved scope and protects safety (no hidden system or AI decisions affecting the folder).

---

### Analytics or Reporting Aggregates

- **What must not be created:** A collection that holds **analytics events** (for example “user clicked X,” “screen viewed for Y seconds”) or **reporting aggregates** (for example pre-calculated dashboards, trend data, or custom report outputs) beyond what is needed for the service-level compliance view and the audit log. The first build does not have a separate “analytics” or “reporting” collection. If the organisation needs “how many in date, due, overdue” or “list of people with Red folders,” that comes from the existing collections (services, people, and the folder under each person) or from the audit log—not from a new collection that duplicates or pre-aggregates that data for analytics.
- **Why excluding protects scope and compliance:** Analytics and reporting aggregates would add a new purpose (usage analysis, behaviour tracking, custom reports) and would require data protection and governance (purpose, retention, consent). The first build stores only what is needed for the care folder, status, reminders, and audit. Excluding analytics and reporting collections keeps the plan minimal and avoids holding data that is not needed for the initial live build or for inspection readiness.

---

### Imported or Synced Data from Other Systems

- **What must not be created:** A collection that holds **data imported or synced** from other systems (for example electronic patient record, pharmacy, local authority). The first build is standalone: data is entered or uploaded by staff through the application. There is no “import” or “sync” collection or structure.
- **Why excluding protects scope and compliance:** Integrations are out of scope for the first build. Adding a place for imported data would expand scope and would require the organisation to govern data quality, mapping, and timing. Excluding it keeps the first build standalone and focused on staff-entered and staff-uploaded data only.

---

## 8. Summary

| Top-level collection | What it holds | Key relationship |
|----------------------|---------------|-------------------|
| **Organisations** | Organisation identity, registered locations (if used), organisation-level governance contacts. | One record per organisation; top of hierarchy. |
| **Services** | Service identity, organisation reference, type, compliance summary. | One record per service; people reference their service. |
| **People** | Person identity, service reference, responsibility, folder summary; under each person, the care folder (sections, document types, content, dates, file references). | One record per person; folder nested under person; people reference service. |
| **Audit log** | Log of who did what, when (uploads, content changes, reviews, responsibility changes, org/service changes). | Append-only; separate from all editable records. |

**Sub-collections / nested places:** Under organisation, optional place for registered locations. Under each person, the care folder (sections and document types with content, dates, and file references). No sub-collection under services for “list of people”—people reference service; list is found by query.

**Exclusions:** No clinical notes repository; no AI output or automated-decision store; no analytics or reporting aggregates collection; no imported/synced data collection. These protect scope and compliance for the first live build.

---

*This document defines the safe, minimal Firestore collection structure for the first live build of the digital CQC readiness system. It should be used when creating the collections and when explaining to stakeholders and implementers where information lives and why.*

*Document version: 1.0 | Plain English only | No schema, no field names, no rules, no code.*
