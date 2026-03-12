# Digital CQC Readiness System: Structural Model

**Definitive Structural Reference for Building the System Safely and Consistently**

*This document describes how the system is organised: what “things” exist, how they fit together, what depends on what, who can see what, and what rules the structure must always enforce. It does not describe databases, code, or technical design.*

---

## 1. System Hierarchy

The system is organised in a logical order from the broadest level to the most specific. Each level contains the level below it. This order reflects how care is delivered and how CQC inspects.

---

### The Hierarchy (Top to Bottom)

**Organisation**  
The top level. The legal or operational body that runs one or more care services (for example, a trust, a company, or a charity). CQC registers and rates organisations. The organisation is accountable for everything beneath it.

**Service**  
The next level. A distinct care setting or offer that the organisation runs. Examples: a ward, a care home, a community mental health team, a supported living service. CQC inspects at service level. Each service has a defined location or area and a defined group of people it supports.

**Person using the service**  
The level at which care is planned and recorded. A person is someone who receives care or support from the service. They may live in the service (residential or inpatient) or receive care in the community. Each person has one care folder in the system for that service.

**Active Care Folder**  
The person’s single care folder for that service. It holds all the evidence of how the person is assessed, planned for, cared for, and reviewed. The folder is organised into sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality).

**Section**  
A part of the folder that groups related documents. There are eight sections. Each section has a clear purpose. Documents sit in one section only.

**Document (type and instance)**  
Within a section, the system holds specific document types (for example, care plan, risk assessment, daily care notes). For each person, there may be one or more **instances** of a document type (for example, the current care plan, or several incident reports over time). Some document types have one current instance; others have many instances (for example, daily notes, incidents).

**Review**  
A point-in-time event when a document or plan was formally reviewed. The system needs to know when the last review happened and when the next is due. A review may be linked to a specific document instance (for example, “care plan reviewed on this date”).

**Alert or reminder**  
Something that tells the right person that action is needed (for example, a review is due or overdue, or an event has happened that should trigger an update). Alerts are generated from the rules that apply to documents and reviews.

---

### Why This Hierarchy Makes Sense for CQC

- **CQC inspects at service level.** Inspectors look at a specific service (ward, home, team). The hierarchy makes it possible to show “this service” and only the people and folders that belong to it. Organisation level supports groups that run several services and need to see across them.

- **Evidence is about the person.** Ratings are about the service, but the evidence is in the person’s folder. The hierarchy makes it clear: each person has one folder per service; the folder is the unit that inspectors look at.

- **Sections and documents match what inspectors expect.** The blueprint and compliance rules use the same sections and document types. The structure aligns with how CQC describes and asks for evidence (by section and by document type).

- **Reviews and alerts sit on documents and folders.** Compliance depends on “when was this last reviewed?” and “what is due?”. Putting reviews and alerts at the document and folder level means the system can show status and remind the right person at the right level.

- **Nothing floats.** Every document belongs to a section; every section belongs to a folder; every folder belongs to a person; every person belongs to a service; every service belongs to an organisation. There is no evidence that does not belong somewhere in this chain. That supports accountability and inspection.

---

## 2. Core System Entities

An “entity” here means a type of thing that the system recognises and that has a clear identity. For each entity we say what it represents, why it exists, and who interacts with it.

---

### Organisation

**What it represents**  
The top-level body that is responsible for one or more care services. It is the registered provider or the legal entity that CQC holds to account.

**Why it exists**  
Some organisations run many services (for example, several wards or several homes). The system must know which services belong to which organisation so that compliance can be viewed at organisation level and so that governance (for example, audit, policies) can be understood at the right level. CQC reports and ratings are published per location or service, but the provider is the organisation.

**Who interacts with it**  
Senior managers and compliance leads who look across services; CQC when they consider the provider as a whole. Day-to-day users may rarely “see” the organisation; they work in a service and with people.

---

### Service

**What it represents**  
A single care setting or team that the organisation runs and that CQC inspects as one unit. Examples: a ward, a care home, a community mental health team, a supported living service.

**Why it exists**  
CQC inspects and rates services, not organisations as a whole. Evidence (care folders, incidents, audits) must be attributable to “this service”. The service is the level at which managers run the service, at which staff are assigned, and at which compliance is summed up for inspection (for example, “how many people in this service have a complete folder?”).

**Who interacts with it**  
Managers and compliance leads use the service as their main view. Inspectors select a service to inspect. Key workers and nurses work within a service and see the people (and folders) that belong to that service.

---

### Person (using the service)

**What it represents**  
An individual who receives care or support from the service. The person is the subject of the care folder: all planning, recording, and review is about them.

**Why it exists**  
Care is personal. Every assessment, care plan, risk assessment, daily note, and incident is about a specific person. The system must know “who” so that all evidence is attached to the right person and so that each person has one folder per service. The person is the centre of the hierarchy for evidence.

**Who interacts with it**  
Frontline staff, key workers, nurses, and clinicians open the person’s folder to record and review. Managers and compliance leads see the person in lists and in the service-wide view. Inspectors look at a sample of people and their folders. The person does not necessarily use the system themselves; the folder is about them, not necessarily held by them.

---

### Active Care Folder

**What it represents**  
The single, authoritative set of evidence for one person in one service. It is the digital equivalent of the “care folder” or “care file”. It contains sections, and each section contains the document types and instances that the blueprint and compliance rules require.

**Why it exists**  
CQC and good practice expect one place where the story of the person’s care is held: who they are, what they need, what is planned, what is done, what risks are managed, and how the service involves them and learns. Without a single folder per person, evidence is scattered and inspectors cannot see a complete picture. The folder is the unit of “readiness” for that person.

**Who interacts with it**  
Key workers and care co-ordinators “own” the folder in the sense of keeping it complete and reviewed. All staff who record care or reviews add to the folder. Managers and compliance leads look at folders to see compliance. Inspectors open folders to assess the service. The folder is the main thing everyone interacts with when they think “this person’s record”.

---

### Section

**What it represents**  
A named part of the care folder that groups related documents. The eight sections are: Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality.

**Why it exists**  
Sections give a fixed structure that matches the blueprint and what inspectors expect. They make it easy to find evidence (“risk is in Section D”) and to show status by area (for example, “Section B is complete”). Without sections, documents would have no clear place and the folder would be harder to navigate and to audit.

**Who interacts with it**  
Staff and inspectors use sections to navigate the folder. The system uses sections to decide where a document belongs and to group compliance status. Sections are largely fixed by design; users do not create or delete sections.

---

### Document type

**What it represents**  
A kind of document that the blueprint and compliance rules define. Examples: care plan, risk assessment, daily care notes, medication record, consent record, incident report. The document type has rules: mandatory or conditional, review frequency, responsible role, and so on.

**Why it exists**  
The system must know what “should” be in a folder (which document types are required for this person and this service) and what rules apply (when it is in date, due, or overdue). Document types are the template against which each person’s folder is checked. They are defined by the compliance rules, not invented per person.

**Who interacts with it**  
Compliance leads and system design use document types to configure the rules. Staff see document types as the names of the things they must complete (for example, “Care plan”, “Risk assessment”). The system uses document types to generate reminders and to show compliance status.

---

### Document instance

**What it represents**  
A single occurrence of a document for one person. For example: “John’s care plan dated March 2024”, “the incident report for 15 January 2024”, “today’s daily care note”. Some document types have one “current” instance (for example, the current care plan); others have many instances over time (for example, each day’s note, each incident).

**Why it exists**  
The folder does not only list what should exist; it holds the actual content and the dates. Inspectors look at the current care plan, the last risk assessment, the recent daily notes. The document instance is what was written, when, and by whom. Without instances, there would be no evidence, only a checklist.

**Who interacts with it**  
Staff create and update document instances (write the care plan, record the incident, complete the daily note). The system attaches each instance to a section and a document type, records dates, and uses instances to work out “last review” and “next due”. Inspectors read instances.

---

### Review

**What it represents**  
A formal review event: the fact that a document or plan was reviewed on a given date, by whom, and when the next review is due. The review may be attached to a document instance (for example, “this care plan was reviewed on this date”) or to a document type for that person (for example, “risk assessment last reviewed on this date”).

**Why it exists**  
Compliance depends on “when was this last reviewed?” and “when is it due?”. The system must record review dates to show that the folder is current and to trigger reminders. A review is the link between “something was done” and “the next time it must be done”.

**Who interacts with it**  
The responsible role (key worker, nurse, manager) completes the review and the system records the date (and optionally who signed off). The system uses review dates to show “in date”, “due”, or “overdue” and to create alerts. Inspectors check review dates.

---

### Incident

**What it represents**  
Something that happened that the service records as an incident: an event that affects or involves the person and that the service is required or chooses to record (for example, a fall, an episode of behaviour, a concern, a complaint). The incident has a record: what happened, when, and what was done.

**Why it exists**  
CQC expects incidents to be recorded, investigated, and learned from. The system must hold the incident as an entity so that it can link it to the person and folder, trigger rules (for example, “risk assessment must be updated after this incident”), and show that follow-up (investigation, lessons learned) has happened. Incidents are evidence of how the service responds when things go wrong.

**Who interacts with it**  
Staff or managers record the incident. Managers ensure investigation and outcome are recorded. The system uses the incident to create event-triggered reminders (update risk assessment, complete investigation). Inspectors look at incident records and follow-up.

---

### Safeguarding concern

**What it represents**  
A concern about abuse, neglect, or harm that has been raised about or involving the person. The concern has a record: what was reported, when, to whom, and what the outcome was (or will be).

**Why it exists**  
Safeguarding must be recorded and followed up. The system must hold the concern so that it is linked to the person and folder, so that outcomes can be recorded, and so that the service can show inspectors that concerns are taken seriously. Safeguarding is a distinct type of event with its own rules and expectations.

**Who interacts with it**  
Managers and safeguarding leads record the concern and outcome. The system may trigger reminders (for example, record outcome, review safeguarding plan). Inspectors check that concerns are recorded and followed up.

---

### Complaint

**What it represents**  
A complaint made by the person or someone on their behalf about the service. The complaint has a record: what was said, when, and how the service responded (and within what timescale).

**Why it exists**  
CQC expects complaints to be recorded and responded to. The system must hold the complaint so that it is linked to the person and folder and so that the service can show that complaints are taken seriously and used to improve. Complaints are evidence under Responsive and Well-Led.

**Who interacts with it**  
Managers or complaints leads record the complaint and response. The system may remind that a response is due. Inspectors look at complaint handling.

---

### Action (or task)

**What it represents**  
Something that must be done as a result of a rule or an event. Examples: “Review risk assessment for [person]”, “Complete care plan review by [date]”, “Record outcome of safeguarding concern”. An action may be generated by the system (from review dates or event rules) or created by a person (for example, “follow up with GP”).

**Why it exists**  
Reminders and event-triggered rules need to become concrete “things to do” that are assigned to a role or person and that can be completed or deferred. Actions close the loop between “the system says something is due” and “someone did it”. They also support lessons learned (actions from an investigation) and audit follow-up.

**Who interacts with it**  
The responsible role sees and completes (or reschedules) the action. Managers may see actions across the service to prioritise. The system creates actions from compliance rules and events and may update or clear them when a review or update is completed.

---

### Audit (care plan or care record audit)

**What it represents**  
A formal check of care plans or care records, usually for a sample of people or for the whole service, on a given date. The audit has a record: when it was done, what was checked, what was found, and what actions were agreed.

**Why it exists**  
CQC expects the service to audit its own records and act on findings. The system must hold the audit so that the service can show that it checks quality (Well-Led) and that actions from audits are tracked. Audits are a governance entity, not a person-level document.

**Who interacts with it**  
Managers or quality leads run or record the audit and any actions. The system may record audit dates and link to actions. Inspectors ask when the last audit was and what was found.

---

### Staff member (or user role)

**What it represents**  
A person who works for the service or organisation and who uses the system. The system needs to know who someone is so that it can assign actions, record who wrote or reviewed something, and apply role-based visibility (who can see what). “Staff member” may be represented as a user account with one or more roles (for example, key worker, nurse, manager).

**Why it exists**  
Accountability and reminders require “who is responsible” and “who did this”. The system must attach actions and (where appropriate) document updates to a person or role so that the right people see the right things and so that inspectors can see who is responsible for what.

**Who interacts with it**  
Staff use their own account and role. Managers assign roles or responsibility for people or document types. The system uses staff and roles to show or hide information and to send reminders.

---

## 3. Relationships Between Entities

How these entities connect is described in plain English: what belongs to what, what is shared, what is isolated, and what must be unique.

---

### What belongs to what

- **Services belong to an organisation.** Each service is run by one organisation. An organisation has one or more services. Nothing in the system is “between” organisation and service; there is no service that does not belong to an organisation.

- **People belong to a service.** When we say “person” in this system, we mean “person receiving care from this service”. The same individual may receive care from more than one service (for example, a different ward or team); in that case they appear as a person in each service, and each service has its own folder for them. Within one service, a person has one place in the hierarchy.

- **One Active Care Folder belongs to one person and one service.** The folder is the person’s folder in that service. It does not belong to a team or to a building unless the team or building is the same as the service. The folder does not move between services; if the person moves service, the new service has a new folder (and the old service may keep the folder as a closed record).

- **Sections belong to the folder.** Each folder has the same eight sections. Sections are not shared between folders. The section is the container; the folder owns its sections.

- **Document instances belong to a section and to the folder (and thus to the person).** Each instance sits in one section and in one folder. It does not sit in two sections or in two folders. The same document type may have many instances in the same folder (for example, many daily notes) but each instance is one record in one section.

- **Reviews belong to a document instance or to a document type for that person.** A review is “the care plan was reviewed on this date” or “the risk assessment was last reviewed on this date”. The review is attached to the thing that was reviewed so that the system can show “last reviewed” and “next due”.

- **Incidents, safeguarding concerns, and complaints belong to a person (and appear in that person’s folder).** They are stored in the relevant section of the folder (Incidents, Safeguarding and Complaints). They are not shared between people. If an incident involves more than one person, each person’s folder may have a record, but each record belongs to one person’s folder.

- **Actions belong to a person (and often to a document type or instance).** An action is “do this for this person” (for example, review risk assessment for John). It may be linked to a document (review this care plan) or to an incident (complete investigation for this incident). The action is assigned to a role or staff member. Actions are not shared between people; each action is about one person (or one service-level activity, such as an audit).

- **Audits belong to a service (or to the organisation if the audit is organisation-wide).** An audit is “we checked these folders or these plans on this date”. It is not stored inside a single person’s folder; it is a service-level (or organisation-level) activity that may refer to many folders.

---

### What is shared

- **Document types and sections are shared in the sense of “the same for everyone”.** Every folder has the same section names and the same list of document types. The rules (mandatory or conditional, review frequency) are the same across the service or organisation. What is not shared is the content: each person has their own instances (their own care plan, their own risk assessment).

- **Emergency-critical information is not shared between people.** It is a view *of* one person’s folder: that person’s allergies, medication, contacts, and so on. The *idea* of “these seven things must be in one place” is shared (the rule); the *content* is unique to each person.

- **Service-wide and organisation-wide views are shared in the sense of “many people’s status in one view”.** The view aggregates information (how many folders complete, how many overdue) but does not duplicate folder content. Only people with the right role see these views.

- **Policies and compliance rules** (for example, “care plan reviewed every 12 months”) are shared: they apply to all people in the service or organisation. They are not stored per person; they are the rules the system uses to generate status and actions for everyone.

---

### What is isolated

- **One person’s folder is isolated from another person’s folder.** Staff and inspectors see one folder at a time (or a list of folders) but the content of John’s folder is only in John’s folder. There is no “shared care plan” between two people. Isolation protects confidentiality and ensures that evidence is clearly about one person.

- **One service’s people and folders are isolated from another service’s.** When a manager of Service A looks at compliance, they see only Service A’s people and folders unless they have organisation-wide visibility. When CQC inspects Service A, they see only Service A. This matches how inspection and day-to-day management work.

- **Incidents, safeguarding concerns, and complaints are stored in the person’s folder only.** They are not duplicated into a separate “organisation-wide incident store” in a way that would create two sources of truth. The folder is the place where the incident is recorded for that person. Service-level incident “lists” or dashboards are views that pull from folders, not a separate copy of the incident.

---

### What must be unique

- **Within one service, a person has one Active Care Folder.** There must not be two folders for the same person in the same service. “One person, one folder per service” is a structural rule. If the person is discharged and later readmitted, the service may reopen the same folder or start a new one by policy, but at any moment there is only one current folder per person per service.

- **Within one folder, there is only one “current” instance for document types that are single-current.** For example, the care plan: there is one current care plan. When it is replaced after a review, the new one becomes current and the old one may be kept as history. The same applies to risk assessment, consent record, and similar “one current” types. The system must be able to say “this is the current one” so that inspectors and staff are not confused by multiple versions.

- **Each document instance has one section.** A document is not in two sections. If a document could logically sit in two places (for example, a care plan that mentions risk), the rule from the blueprint is followed (care plan in Assessment and Planning; risk assessment in Risk and Safety). No duplication of the same evidence in two sections.

- **Each incident, safeguarding concern, and complaint is recorded once per person it relates to.** If an incident involves two people, there may be two records (one in each folder), but each record is unique to that person’s folder. The system does not allow the same incident to be “in” one folder twice.

- **Review dates are unique per document (or document type) per person.** There is one “last review date” and one “next review date” for the care plan for John. The system does not hold two conflicting “next review” dates for the same document for the same person.

---

## 4. Dependency Rules

These rules say what must exist before something else can exist, what cannot be removed while something else exists, and what must be updated when certain events happen. They keep the structure consistent and safe.

---

### What must exist before something else can be created

- **Before a Service can exist, an Organisation must exist.** The system must not allow a service to be created without linking it to an organisation.

- **Before a Person can exist in the system, a Service must exist.** A person is always “person in this service”. The system must not allow a person to be added without assigning them to a service.

- **Before an Active Care Folder can exist, a Person must exist.** The folder is created for a person in a service. The system may create the folder automatically when the person is added, or when the person is first “active” in the service, but it must not create a folder without a person.

- **Before document instances can exist, a Folder and its Sections must exist.** Documents sit in sections; sections sit in the folder. The system may create the eight sections when the folder is created. It must not allow a document instance to be created without a folder and a section (and thus a document type).

- **Before a Review can be recorded, the relevant Document instance (or document type for that person) must exist.** The system records “this was reviewed on this date”. It must not allow a review date to be saved for a document that does not exist.

- **Before an Incident, Safeguarding concern, or Complaint can be recorded, the Person (and their folder) must exist.** The incident or concern is recorded in the person’s folder. The system must not allow an incident to be recorded “in the air” without a person and folder.

- **Before an Action can be created, the Person (or Service) it refers to must exist.** An action is “do this for this person” or “do this for this service”. The system must not create an action that points to a person or service that does not exist.

- **Before an Audit can be recorded, the Service (or Organisation) must exist.** Audits belong to a service or organisation. The system must not allow an audit to be saved without a service (or organisation) to attach it to.

---

### What cannot be deleted while something else exists

- **An Organisation cannot be removed if it still has one or more Services.** The system must not allow deletion of an organisation while services exist. Services must be removed or reassigned first (and the business rule for “removing” a service may be to close it, not to delete it, so that history is kept).

- **A Service cannot be removed if it still has one or more People with an active folder.** The system may allow “closing” a service (so that no new people are added and folders are archived) but must not allow deletion in a way that would leave people or folders without a service. People may be discharged and folders closed first.

- **A Person cannot be removed from the service in a way that deletes their folder if the folder is required for legal or inspection reasons.** The system may “close” the person’s involvement (discharge) and keep the folder as a closed record. Deletion of the person or folder should be governed by policy (for example, retention) and must not leave incidents, complaints, or safeguarding without a link to a person where that link is required.

- **A Document instance that is the “current” one for a document type should not be deleted without replacing it.** For example, if the current care plan is deleted, the folder would have no care plan. The system should either prevent deletion of the current instance or require that another instance is set as current first. Historical instances may be archived rather than deleted, depending on policy.

- **A Section cannot be deleted if the folder structure is fixed.** Sections are part of the blueprint. The system should not allow deletion of a section; the structure is defined by the compliance rules.

- **An Incident, Safeguarding concern, or Complaint should not be deleted in a way that breaks the record of what happened.** The system may allow correction (amendment) or closure, but deletion should be restricted or audited so that the service cannot remove evidence of harm or concern. This is a structural and often a legal requirement.

---

### What must be updated when certain events happen

- **When a Person is admitted or accepted by the service,** the folder (and sections) must be created or opened, and the referral and acceptance record and other “on admission” documents must be prompted or created as per the compliance rules.

- **When a Person is discharged,** the folder must be marked as closed (or moved to closed records), and a discharge summary and follow-up plan must be prompted or recorded. The person may no longer appear in “active” lists but their folder remains for inspection and legal purposes.

- **When an Incident is recorded,** the system must create or trigger: (1) the incident record in the person’s folder; (2) event-triggered actions (for example, update risk assessment, complete investigation, complete lessons learned) as per the compliance rules. The responsible role must be able to see these actions.

- **When a Safeguarding concern is recorded,** the system must ensure the concern and (when known) the outcome are in the person’s folder, and must trigger any actions (for example, record outcome, review safeguarding plan) as per the compliance rules.

- **When a Complaint is recorded,** the system must ensure the complaint and response are in the person’s folder and must trigger reminders if a response is due within a timescale.

- **When a Review is completed for a document,** the system must update the “last review date” and set the “next review date” according to the document type’s review rules. Any alert or action that was “review this document” for that document and person should be completed or cleared.

- **When a Document instance is created or updated** (for example, a new care plan after review), the system must update the “current” pointer if this is a single-current document type, and must recalculate compliance status (in date, due, overdue) for that document type for that person.

- **When Restraint or restrictive practice is recorded,** the system must ensure the record is in the folder and must trigger the requirement for a restraint incident review and (where applicable) update of the risk assessment or behaviour plan.

- **When an Audit is completed,** the system must record the audit date and scope and should create or link actions for any follow-up (for example, “re-audit in 3 months”, “address gaps in care plan reviews”). The audit log must be visible at service (or organisation) level.

---

## 5. Levels of Visibility

Not everyone should see everything. The system must enforce who can see what at organisation, service, person, and role level. This protects confidentiality, supports accountability, and matches what inspectors expect.

---

### Organisation-wide visibility

**What it is**  
Information that can be seen across all services in the organisation. Examples: list of all services; total number of people; organisation-wide compliance summary (how many folders complete across all services); organisation-wide audit or policy dates.

**Who typically has it**  
Senior managers, compliance leads, or quality leads whose job is to look across the whole organisation. Not every manager and not frontline staff.

**Why it exists**  
Organisations that run multiple services need to know “how are we doing overall?” and to compare or prioritise between services. CQC may also look at the provider’s approach across locations.

**Why inspectors care**  
Inspectors usually inspect one service at a time, but they may ask “how does the organisation assure itself that all services are compliant?”. Organisation-wide visibility (and the ability to show that someone has it) supports the “Well-Led” idea that the provider has oversight. At the same time, inspectors do not expect frontline staff to see other services’ person-level data; separation protects confidentiality and matches “need to know”.

---

### Service-level visibility

**What it is**  
Information about the service as a whole and about all people (and folders) in that service. Examples: list of people in the service; service-wide compliance (how many folders complete, how many overdue, which document types are most overdue); incidents or audits for the service; actions due across the service.

**Who typically has it**  
Managers and compliance leads for that service. Key workers and nurses may see “their” people plus the service list (for example, to know who is on the ward or caseload) but not necessarily full compliance for everyone.

**Why it exists**  
CQC inspects the service. The manager must be able to say “in this service, we have X people, Y have complete folders, Z have overdue risk assessments”. Service-level visibility is the main view for preparation for inspection and for day-to-day governance.

**Why inspectors care**  
Inspectors expect the registered manager (or equivalent) to know the state of the service. They ask “when was the last care plan audit?” and “how many people have an overdue review?”. If the manager cannot answer because they cannot see service-level information, that is a weakness. At the same time, inspectors do not expect every staff member to see every person’s full folder; that would be unnecessary and could risk confidentiality.

---

### Person-level visibility

**What it is**  
The full content of one person’s Active Care Folder: sections, documents, reviews, incidents, and so on. Person-level visibility means “I can open this person’s folder and see (and possibly edit) what is in it”.

**Who typically has it**  
Staff who are responsible for that person’s care: their key worker, the nurses or support workers who work with them, and the manager who oversees the service. Access may be restricted to “this person is on my caseload” or “I work on this ward” so that staff see only the people they need to see.

**Why it exists**  
Care is delivered per person. Staff must be able to read and update the folder for the people they support. They do not need to see the folders of people they do not support, except in emergencies (for example, bank staff covering a shift) where policy may allow time-limited or task-limited access.

**Why inspectors care**  
Inspectors need to see person-level evidence: they open a sample of folders and look at care plans, risk assessments, daily notes, and so on. They expect the service to be able to show “this person’s folder” clearly. They also expect that access to person-level data is controlled (only people who need it can see it) so that confidentiality and accountability are clear.

---

### Role-restricted visibility

**What it is**  
Certain information is only visible (or only editable) by certain roles. Examples: safeguarding outcomes may be visible only to managers and safeguarding leads; DoLS/LPS documentation may be visible to managers and the DoLS lead; audit findings may be visible to managers and quality leads; “who is responsible for this document” may be editable only by managers.

**Who has it**  
Depends on the role. Nurses may see and edit medication and treatment; key workers may see and edit care plan and risk assessment; managers may see and edit responsibility and audit data; compliance leads may see service-wide and organisation-wide compliance and audit logs.

**Why it exists**  
Accountability and confidentiality: not everyone should see safeguarding outcomes or change who is responsible for a document. Role-based visibility ensures that the right people see the right things and that the system supports “know on the day” for the right role (for example, the manager knows about audits, the key worker knows about their people’s review dates).

**Why inspectors care**  
Inspectors ask “who is responsible for this?” and “who has access to this information?”. They expect the service to be able to explain who can see what and to show that sensitive information (safeguarding, capacity, DoLS) is restricted appropriately. Role-restricted visibility is part of Well-Led and Safe.

---

### Summary: visibility and inspectors

- Inspectors **inspect one service** and need **service-level** and **person-level** evidence. They do not need organisation-wide data unless the provider chooses to show it.
- Inspectors expect **person-level** evidence to be **findable and readable** (care plan, risk assessment, daily notes, etc.) and **access to be controlled** (role-restricted where appropriate).
- Inspectors expect **managers** to have **service-level** visibility so they can lead and assure. The structural model must support “the manager can see the whole service” and “frontline staff see their people” without mixing them in a way that breaks confidentiality or accountability.

---

## 6. Structural Guardrails

These are rules the structure must enforce so that the system stays safe, consistent, and inspection-ready. They are not optional; they are part of the definition of the system.

---

### One authoritative care folder per person (per service)

- **Rule:** For each person receiving care from a service, there is exactly one Active Care Folder. There are no “draft” folders, “shadow” folders, or duplicate folders for the same person in the same service.
- **Why:** CQC and good practice expect one place where the evidence lives. If there were two folders, no one would know which is the truth, and inspectors would not know what to look at. One folder is the single source of truth for that person in that service.
- **How the structure enforces it:** The hierarchy “person → folder” is one-to-one within a service. The system does not allow creation of a second folder for the same person in the same service. If the person is readmitted, policy decides whether to reopen the same folder or start a new one; in either case, at any moment only one folder is “active” for that person in that service.

---

### One current version of key documents

- **Rule:** For document types that are “single current” (care plan, risk assessment, consent record, and others as defined in the compliance rules), the folder holds one instance that is marked as “current”. Older versions may be kept as history, but only one instance is the one that staff and inspectors use for “what is the plan now?” or “what are the risks now?”.
- **Why:** If there were two “current” care plans or two “current” risk assessments, staff and inspectors would not know which one is in force. Confusion leads to wrong care and to failed inspections. One current version removes doubt.
- **How the structure enforces it:** For each document type that is single-current, the system stores a link or marker to “the current instance”. When a new instance is created (for example, after a review), the new one becomes current and the old one is no longer current. The system does not allow two instances of the same document type to be current at the same time for the same person.

---

### Clear ownership and accountability

- **Rule:** Every document type has a defined “responsible role” (and, where the system supports it, an assigned person). Every action (review due, update after incident) is assigned to a role or person. The system can always answer “who is responsible for this?” and “who should do this?”.
- **Why:** CQC asks “who is responsible?” and “who ensures this is reviewed?”. If the system cannot answer, the service cannot demonstrate Well-Led. Clear ownership also ensures that reminders go to the right person and that inspectors can see accountability.
- **How the structure enforces it:** Document types have a default responsible role (from the compliance rules). The folder or service may assign a specific person to a person or document type (for example, “Jane is key worker for John”). Actions are linked to a person and to a role or staff member. The system does not allow a document type or action to have no responsible role; if a person is not assigned, the default role still applies so that “the key worker” or “the manager” is known.

---

### No duplication of evidence

- **Rule:** The same piece of evidence is not stored in two places in a way that could get out of sync or that would create two “truths”. A document instance sits in one section only. The same incident is not copied into two folders unless it genuinely relates to two people (in which case each person has their own record). Emergency-critical information is a view of the folder, not a separate copy that could diverge.
- **Why:** Duplication causes errors (one place updated, the other forgotten) and confuses inspectors (“which is the real care plan?”). One place per piece of evidence keeps the folder consistent and trustworthy.
- **How the structure enforces it:** Document instances belong to one section and one folder. The system does not allow “the same document” to exist in two sections. If emergency-critical information is shown in a summary view, it is drawn from the same source as the folder (the folder is the source of truth); the summary is not a second copy that is updated separately. For incidents that involve more than one person, the business rule is clear: each person has one record in their folder, and the system may link them (for example, “same incident ID”) but does not store the same narrative in two independent places that could be edited separately.

---

### Sections and document types are fixed by design

- **Rule:** The eight sections and the list of document types (and their rules) are defined by the blueprint and compliance rules. They are not created or deleted by users. New document types may be added only through a controlled process (for example, a change to the compliance rules) so that the system stays aligned with CQC expectations.
- **Why:** Inspectors expect to find evidence in a familiar structure (sections, document types). If every service could invent its own sections or document types, the system would no longer be a consistent “CQC readiness” system and could not reliably show status or generate reminders from the same rules.
- **How the structure enforces it:** Sections and document types are part of the system’s configuration or definition, not user-created content. Users create document *instances* (the actual care plan, risk assessment, etc.) but do not create new sections or new document types. Changes to the list of document types or to their rules are a governance change, not a day-to-day user action.

---

### Alerts and reminders are derived from rules, not invented per person

- **Rule:** When the system says “this is due” or “this is overdue” or “you must update this after this incident”, it does so because the compliance rules say so. The rules (review frequency, event-triggered updates) are the same for everyone; the system applies them to each person’s folder. The system does not allow someone to “turn off” a mandatory reminder in a way that would hide non-compliance.
- **Why:** Compliance must be consistent and honest. If reminders could be switched off or changed per person without governance, the service could hide overdue reviews. Inspectors expect the service to use a consistent set of rules; the structure should support that.
- **How the structure enforces it:** Reminders and “due”/“overdue” status are calculated from the compliance rules (review frequency, last review date, event-triggered rules) and from the data in the folder (review dates, incident dates). They are not stored as free-form “reminder text” that could contradict the rules. If a review is overdue, the system shows it as overdue; it does not allow the user to mark it “in date” without recording a review date. Exceptions (for example, “review delayed with manager approval”) may be recorded as a reason, but the structural rule is that status is rule-based, not manually overridden without trace.

---

## 7. Summary: Structural Principles at a Glance

| Principle | In one sentence |
|-----------|------------------|
| **Hierarchy** | Organisation → Service → Person → Active Care Folder → Section → Document type / instance → Review and alerts. This order matches how care is delivered and how CQC inspects. |
| **Entities** | Organisation, Service, Person, Active Care Folder, Section, Document type, Document instance, Review, Incident, Safeguarding concern, Complaint, Action, Audit, Staff/role. Each has a clear identity, purpose, and set of users who interact with it. |
| **Relationships** | Everything belongs to something (folder to person, document to section, incident to person). One folder per person per service; one current instance for single-current document types; no duplicate evidence in two sections. |
| **Dependencies** | Folder exists only after person; document instances only after folder and sections; reviews only after documents; incidents only after person/folder. Organisation and service cannot be deleted while children exist. Events (incident, review, discharge) trigger updates and actions. |
| **Visibility** | Organisation-wide for senior/compliance; service-level for managers and inspection; person-level for staff who support that person; role-restricted for sensitive or accountable data. Inspectors expect service and person-level evidence and clear access control. |
| **Guardrails** | One folder per person per service; one current version for key documents; clear ownership and accountability; no duplication of evidence; fixed sections and document types; reminders and status derived from compliance rules. |

---

*This document is the definitive structural reference for the digital CQC readiness system. It should be used when designing or building any part of the system so that hierarchy, entities, relationships, dependencies, visibility, and guardrails are respected.*

*Document version: 1.0 | Structural model only | No code, databases, or technical implementation.*
