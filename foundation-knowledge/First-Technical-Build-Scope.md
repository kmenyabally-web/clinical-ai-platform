# First Technical Build Scope: Digital CQC Readiness System

**Authoritative Scope Definition for the First Technical Iteration**

*This document defines what must be built in the first technical iteration of the digital CQC readiness system, after governance and pilot design are in place. It states the objective, what is in scope, what is out of scope, how data and evidence are handled, success criteria, and the definition of done. It is not a full product roadmap or a technical implementation guide. It does not contain code. Plain English only.*

---

## 1. Objective of the First Technical Build

### What This First Build Is Intended to Achieve

- The first technical build delivers the **smallest set of working parts** that allow a live care service to use the system as defined in the Minimum Viable Live System (MVLS). When the build is complete, staff can: sign in; open a person’s care folder; add and view documents (choosing section and type themselves); see compliance status (in date, due, overdue); see reminders and tasks; use the emergency summary; and show the folder in a read-only inspection view. Managers can see service-level compliance and the audit trail. The system applies the compliance rules to the data and shows status; it does not make decisions or use AI.
- The build is intended to support the **first real-world pilot** in one service. Everything that the pilot definition and the MVLS require must be present and working so that the pilot can run safely and the organisation can collect evidence and learn.

---

### What Problem It Solves Immediately

- **One place for the care folder.** The service has a single digital place to hold each person’s folder (eight sections, document types from the blueprint) so that evidence is not scattered. Staff and inspectors can find the same structure every time.
- **Visible compliance status.** The service can see what is in date, due, or overdue because the system applies the compliance rules to the data. Managers and staff know what needs attention.
- **Reminders and accountability.** The system shows what is due and who is responsible, and records who completed a review and when. That supports on-time reviews and clear accountability.
- **Inspection-ready evidence.** The service can show the folder in a read-only way, with key documents findable and emergency-critical information in one place. The service can show who did what and when via the audit trail.

So the first build solves **structure**, **visibility**, **reminders**, and **inspection readiness** for one pilot service, without AI or automation.

---

### Why This Build Is Deliberately Limited

- **Safety and focus.** Building only what the MVLS and the pilot need keeps the first release small and testable. Adding more features (AI, integrations, advanced analytics) would increase complexity and the chance of errors. A limited build is easier to test, to pilot, and to explain to inspectors.
- **Prove the core first.** The organisation needs to prove that the core (folder, documents, status, reminders, audit, inspection view) works in a real service before adding anything else. The first build is the foundation; later builds can add AI or other features under the Controlled Technical Integration Plan.
- **Match governance.** The MVLS and the pilot definition explicitly exclude AI, automated decisions, and external alerts. The first technical build matches that: it does not include those components. So the build stays within what has already been approved.

---

## 2. Components to Be Built (In Scope)

The following components **must** be built in this first technical iteration. Each is needed for the MVLS and the first pilot to work.

---

### User Sign-In and Basic Roles

**What it is:** A way for each user to **prove who they are** (sign-in) so the system knows who is using it. The system then applies **basic roles** so that the right people see the right things: for example, frontline staff see only the people they are assigned to (or their service’s people); managers see the whole service; and a read-only role can be used for inspection. The system does not need a large number of roles in the first build; it needs enough to support “staff,” “manager,” and “read-only” (inspector) as defined in the MVLS and the screen structure.

**Purpose:** So that access is controlled and the service can show that only the right people see or change the folder. So that inspectors can be given read-only access without being able to edit.

**Why it must be built now:** Without sign-in and roles, the system cannot enforce who sees what or who did what. The pilot and inspection readiness depend on controlled access and on the audit trail being able to record “who.” This is a foundation for everything else.

---

### Active Care Folder Structure

**What it is:** The **structure** that holds each person’s care folder: the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality) and the **list of document types** that belong in each section, as defined in the Active Care Folder blueprint and compliance rules. For each person, the system has one folder with this structure. The structure is fixed (the same for everyone); the **content** (the actual care plans, risk assessments, documents) is what staff add. The build must create and display this structure so that staff and inspectors can open a person’s folder and see the eight sections and the document types under each.

**Purpose:** So that every person’s evidence lives in one place with a clear, consistent structure that matches what CQC and the blueprint expect. So that staff know where to put things and inspectors know where to find things.

**Why it must be built now:** The folder structure is the core of the system. Without it, there is no “care folder” and no way to organise or find evidence. The first build must deliver this so that the pilot can run and the service can show inspectors the expected structure.

---

### Manual Document Upload and Viewing

**What it is:** A way for staff to **add** a document (a file such as a PDF, scan, or image) to the folder and to **choose** which section and which document type it belongs to. The choice is made by the staff member from the list (no AI suggestion). The system stores the file and the chosen section and type, and records who added it and when. Staff can **view** documents that are already in the folder: open the file and see it, and see when it was added and who added it. Viewing includes seeing the document in the right section of the folder so that “care plan” or “risk assessment” is findable where inspectors expect it.

**Purpose:** So that the service can store the actual evidence (scanned forms, letters, photos) in the right place and retrieve it. So that staff can file documents and inspectors can see them. So that every addition is traceable (who, when).

**Why it must be built now:** Much of the evidence in care folders is in the form of documents. Without upload and viewing, the folder would be empty or incomplete. The pilot cannot run without staff being able to add and view documents. Manual choice (no AI) matches the MVLS and keeps the first build simple and safe.

---

### Structured Care Content (Where Applicable)

**What it is:** For document types where the service enters **structured content** (text, dates, choices) rather than only uploading a file—for example, care plan text, risk assessment text, daily notes, consent record, “who to contact,” medication list, allergies—the system must provide a way to **enter and store** that content and to **link** it to the right section and document type. The content is stored so that it can be displayed when someone opens that document, and so that **dates** (e.g. last review date, next review date) can be used by the compliance logic. The first build may support a **subset** of document types as “structured” (e.g. care plan, risk assessment, daily notes, who to contact, allergies) and treat others as “upload only”; the organisation decides the subset. The important point is that the system can hold both **files** and **structured content** in the right place in the folder.

**Purpose:** So that the service can record the care plan, risk assessment, daily notes, and other key content in a form the system can use for status (e.g. “when was this last reviewed?”) and for display. So that inspectors can read the current care plan and risk assessment, not only see that a file was attached.

**Why it must be built now:** Compliance status depends on **dates** (last review, next review) and on **presence** of documents. Many key documents are maintained as structured content (staff type or select), not only as uploads. The first build must support enough structured content for status and inspection to work. The exact list of “structured” vs “upload only” can be defined by the organisation; the build must support at least the minimum set needed for the pilot (e.g. care plan, risk assessment, review dates, who to contact, allergies).

---

### Manual Compliance Status Indicators

**What it is:** The system **calculates** and **displays** compliance status for each document type and for each folder. Status is based on the **compliance rules** (e.g. care plan reviewed at least every 12 months; risk assessment updated after incident) and on the **data** in the folder (last review date, next review date, whether a document exists, whether an event like an incident has been recorded). The system shows whether each document type is **in date**, **due for review**, or **overdue**, and may show Green, Amber, or Red as defined in the behavioural specification. The calculation is **rule-based only**; no AI or algorithm decides. Staff and managers **see** the status; they do not type it in. When staff complete a review or add a document, the system **updates** the data (e.g. last review date) and **recalculates** status. The build must implement the rules from the compliance ruleset (review frequencies, mandatory vs conditional, event-triggered where applicable) so that status is consistent and explainable.

**Purpose:** So that the service knows what is on track and what needs action. So that managers can see service-level status (how many in date, due, or overdue). So that the same picture is available to staff and to inspectors (status is not hidden or different for different users, except where role-based view applies).

**Why it must be built now:** Visibility of compliance status is a core benefit of the system and a requirement of the MVLS. Without it, the service would not know what is overdue or missing until an inspector finds it. The first build must deliver rule-based status so that the pilot can prove that the system supports prioritisation and inspection readiness.

---

### Reminders and Task List

**What it is:** The system **generates** a list of what needs to be done: for example, “care plan review due for [person],” “risk assessment overdue for [person].” The list is built from the compliance rules and the data (what is due or overdue, who is responsible). Each item can be **opened** so the user goes to the right person and the right document. The list is shown to the user (staff see their tasks; managers may see all tasks for their service or a summary). The system does **not** complete the task by itself; when the staff member does the work (e.g. completes the review) and records it in the system, the system updates the data and the task list. The build must support “who is responsible” (per person or per document type) so that tasks can be assigned to the right role or person.

**Purpose:** So that staff and managers know what to do next and do not forget due reviews. So that the service can show that it monitors and acts on due dates.

**Why it must be built now:** Reminders and tasks are part of the MVLS and are part of how the service stays on top of compliance. The first build must deliver them so that the pilot can test whether they help in practice.

---

### Emergency Summary View

**What it is:** One **view** or **screen** that shows the seven emergency-critical items for a person in one place: allergies and adverse reactions; current medication list; key risks and safety plan summary; who to contact; communication passport or key communication needs; personal emergency evacuation plan (PEEP); resuscitation or DNAR status. The information is **drawn from** the folder (the folder is the source of truth); the emergency summary does not hold separate data. When staff open this view, they see the seven areas in a form that can be read quickly. The build must ensure that this view exists, that it pulls from the right places in the folder, and that it is easy to reach (e.g. one click from the person’s folder or from a list of people).

**Purpose:** So that in an emergency (collapse, fire, missing person) staff can see the most important information without searching through sections. So that the service can show inspectors that emergency-critical information is immediately accessible.

**Why it must be built now:** The blueprint and compliance rules require that these seven items are immediately accessible. The MVLS includes the emergency summary. The first build must deliver it so that the pilot service can use it and so that inspection readiness is met.

---

### Read-Only Inspection View

**What it is:** A way to show the care folder (and, where relevant, the people list and service-level compliance) in **read-only** mode. The same content and structure as staff see are available, but the user **cannot** edit, add, or delete anything. This view is used when the service wants to show evidence to an inspector (or someone in an inspection role). The build must ensure that when a user is in “inspection” or “read-only” role (or mode), they can navigate the folder, sections, and documents but cannot change anything. The structure and content must match what staff see so that “what the inspector sees” is the same as “what the service uses.”

**Purpose:** So that inspectors can see the evidence without any risk of altering it. So that the service can hand over access in a safe, transparent way.

**Why it must be built now:** Inspection mode is part of the MVLS and is required for the service to demonstrate evidence to CQC. The first build must deliver it so that the pilot can show inspectors the folder in a controlled way.

---

### Audit Trail (Who Did What, When)

**What it is:** The system **records** who created or updated important content and when. For example, when a document is added, when a review is completed, or when structured content is changed, the system stores who did it (the signed-in user) and the date (and, where applicable, time). This record is kept **separately** from the care content and is **not editable** by normal users. Staff and managers can **view** the audit trail (e.g. “when was this care plan last updated?” or “who added this document?”) so they can answer “who did what, when.” The build must ensure that every action that changes the folder or its content is recorded and that the record is protected from change or deletion.

**Purpose:** So that the service can show accountability and answer inspectors’ questions (“who reviewed this?”). So that the organisation can prove that humans made the decisions and that changes are traceable.

**Why it must be built now:** The MVLS and the technical foundation document require an audit trail. Without it, the service could not demonstrate who was responsible for what. The first build must capture and protect the audit trail so that the pilot and inspection readiness are supported.

---

### Service-Level Compliance View (for Managers)

**What it is:** A **view** or **screen** for managers that shows compliance **across the service**: how many people have folders that are complete and current, how many have items due or overdue, and which document types are most often missing or overdue. It may list people with Red or Amber folders so managers can prioritise. The view is built from the same rules and data as the per-person folder; it is an aggregation, not a different source of truth. The build must ensure that only users with a manager (or equivalent) role can see this view and that the numbers and lists are correct and up to date.

**Purpose:** So that managers can oversee the whole service and know where to focus. So that they can answer “how many people have an overdue care plan?” and prepare for inspection.

**Why it must be built now:** The MVLS includes the service-level view. The pilot expects the manager to use it. The first build must deliver it so that governance and inspection preparation are supported.

---

### Review Completion and Sign-Off

**What it is:** When a staff member **completes a review** (e.g. care plan review, risk assessment review), the system must have a clear step where they **confirm** that the review is done and **record** the date (and, where supported, their name or role). That step is the “review completion” or “sign-off.” The system then **updates** the “last review date” and “next review date” for that document and **recalculates** status (e.g. from overdue to in date). The system must **not** mark a review as complete without this human step; there is no automatic “review done” when a date is reached. The build must implement this flow so that status only changes when a human has taken the sign-off action.

**Purpose:** So that every “review completed” is traceable to a person and a date. So that inspectors can see who reviewed and when. So that the system does not falsely show “in date” without a real human action.

**Why it must be built now:** Review completion and sign-off are part of the MVLS and the behavioural specification. The first build must support them so that compliance status is honest and accountable.

---

### Summary: Components In Scope

| Component | Purpose | Why now |
|-----------|---------|---------|
| **User sign-in and basic roles** | Control access; support staff, manager, read-only. | Foundation for who sees what and who did what. |
| **Active Care Folder structure** | Eight sections, document types; one folder per person. | Core of the system; required for pilot and inspection. |
| **Manual document upload and viewing** | Add files; choose section/type; view; record who/when. | Evidence is often documents; pilot needs add and view. |
| **Structured care content** | Enter and store text, dates; link to section/type; support status. | Status and inspection need content and dates. |
| **Manual compliance status indicators** | Rule-based in date/due/overdue; Green/Amber/Red. | Visibility of compliance is a core benefit and MVLS requirement. |
| **Reminders and task list** | What is due; who is responsible; open to person/document. | MVLS and pilot need reminders and tasks. |
| **Emergency summary view** | Seven critical items in one place; from folder. | Blueprint and MVLS require immediate access to emergency info. |
| **Read-only inspection view** | Same content, no edit/add/delete. | MVLS and inspection require safe handover to inspectors. |
| **Audit trail** | Who did what, when; separate, protected. | Accountability and inspection require traceability. |
| **Service-level compliance view** | Aggregated status for managers. | MVLS and pilot need manager oversight. |
| **Review completion and sign-off** | Human confirms review; system updates dates and status. | Status must reflect human action only. |

---

## 3. Components Explicitly Out of Scope

The following **must not** be built in this first technical iteration. Including them would take the build beyond the MVLS and the approved pilot and would increase risk or dilute focus.

---

### Automated Alerts or Notifications to External Parties

**What is excluded:** The system must **not** send alerts, emails, or other messages to people **outside** the organisation (e.g. CQC, families, local authority) without a human deciding to send them. No automatic “service has X overdue items” or “gap detected” message to an external address. Internal reminders (to staff and managers within the system) are in scope; external or escalated alerts are not.

**Why excluding protects safety and focus:** Automatic external alerts could send wrong or misleading information and could damage trust or trigger unnecessary action. The first build focuses on internal use and visibility; external communication stays under human control. Building it later, if ever, can be a separate decision with its own governance.

---

### AI-Driven Decisions or AI-Assisted Features

**What is excluded:** No AI document classification (no suggestion of section or document type). No AI compliance gap detection (no AI-generated list of potential gaps or AI-written explanations). No AI summarisation, no AI content interpretation, and no use of AI to set or change status, to approve, or to sign off. The first build is **entirely rule-based and human-operated**.

**Why excluding protects safety and focus:** AI requires separate governance (approved prompts, human confirmation, training) and has been explicitly excluded from the MVLS and the first pilot. Building AI in the first iteration would mix “prove the core” with “prove AI,” which would complicate testing and pilot evaluation. AI is planned for a later phase under the Controlled Technical Integration Plan; the first build stays within the MVLS.

---

### Advanced Analytics or Reporting Beyond Service-Level View

**What is excluded:** No dashboards or reports beyond what the MVLS needs: the service-level compliance view (counts, lists of people with Red or Amber), the per-person folder and status, and the audit trail. No predictive analytics, no trend analysis over long periods, no custom report builder, and no export of data to other tools for analysis in this first build.

**Why excluding protects safety and focus:** Advanced analytics are not required for the pilot or for inspection readiness. Building them now would add scope and delay the delivery of the core. The first build delivers “what do we have and what is due”; more sophisticated reporting can be added later if the organisation decides it is needed.

---

### Integrations with Other Systems

**What is excluded:** No connection to other systems in this first build: no electronic patient record (EPR), no pharmacy system, no payroll, no external document store. The system stands alone. Data is entered or uploaded by staff; it is not imported or synced from elsewhere. If the organisation later decides to integrate (e.g. to pull medication from an EPR), that will be a separate build with its own scope and governance.

**Why excluding protects safety and focus:** Integrations add complexity, dependency, and risk (data mapping, timing, errors). The first build proves that the system works on its own with staff entering and uploading. Integrations can be added later when the core is stable and the organisation has defined what it needs.

---

### Auto-Filing or Auto-Save Without Explicit User Choice

**What is excluded:** The system must **not** save a document to the folder in a section or document type chosen by the system (e.g. default or guess). Every document must be placed in a section and type after the staff member **explicitly** chooses and confirms. No “save with default section if user doesn’t choose in X seconds” or “pre-fill section from file name and save on upload.”

**Why excluding protects safety and focus:** Auto-filing could put documents in the wrong place and could undermine accountability. The MVLS and the technical foundation require that every filing is a human decision. The first build must enforce that.

---

### Summary: Components Out of Scope

| Component | Why excluded |
|-----------|---------------|
| **Automated external alerts** | External communication must stay under human control; first build is internal use only. |
| **AI (classification, gap detection, any AI)** | AI is excluded from MVLS and first pilot; separate phase and governance. |
| **Advanced analytics** | Not required for pilot or inspection; would add scope and delay core. |
| **Integrations with other systems** | Adds complexity and risk; first build is standalone; integrations later if needed. |
| **Auto-filing or auto-save without user choice** | Every filing must be human choice; protects safety and accountability. |

---

## 4. Data and Evidence Handling

The first build must treat data and evidence in a way that supports safety, accountability, and inspection. The following is at a high level (no technical detail); it states **what** must be captured, preserved, and never overwritten.

---

### What Information Must Be Captured

- **Care content:** Everything staff enter or upload that forms part of the care folder: structured content (care plan text, risk assessment text, daily notes, dates, who to contact, allergies, and so on) and uploaded files (PDFs, scans, images). Each item must be linked to the right person, section, and document type.
- **Who did what and when:** For every action that creates or changes content (add document, update care plan, complete review), the system must capture **who** (the signed-in user) and **when** (date and, where applicable, time). This is the audit trail.
- **Review dates:** When a review is completed, the system must capture the **date of the review** and **who** completed it. It must store “last review date” and “next review date” for each document type that has them so that compliance status can be calculated.
- **Responsibility:** For each person (and, where the system supports it, for each document type), the system must capture **who is responsible** (e.g. key worker, nurse) so that tasks and reminders can be assigned and so that the service can answer “who is responsible for this?”

---

### What Information Must Be Preserved

- **Care content once saved:** Once content has been saved and used as the record (e.g. a care plan, an incident report), it must be **preserved**. If the content is later updated (e.g. a new care plan after a review), the **previous** version may be kept as history (as defined in the technical foundation and retention policy) so that the service can show “what was in place when.” The first build must not **delete** or **overwrite** content in a way that would make the previous version unrecoverable during the retention period.
- **Audit trail:** The record of who did what and when must be **preserved**. New entries are added; old entries are **not** edited or deleted by users. The audit trail is append-only for the purposes of the first build and the MVLS.
- **Critical evidence:** Incident reports, safeguarding records, complaint records, and similar evidence must be **preserved** in line with the technical foundation and the organisation’s policy. The first build must not allow users to **delete** these in a way that would destroy evidence. Archive or “mark as superseded” may be allowed if the original is retained; deletion of critical evidence must be prevented or tightly controlled.

---

### What Information Must Never Be Overwritten

- **Audit entries:** Once an audit entry (who did what, when) has been written, it must **not** be overwritten or edited by normal users. So the past record of actions is trustworthy.
- **Original content when it has been superseded:** When a document is replaced (e.g. new care plan after review), the **previous** version must not be overwritten in a way that would make it lost. The system may keep the previous version as history or may mark it as “superseded” but must not erase it in the first build within the retention period the organisation defines.
- **Critical evidence (incidents, safeguarding, complaints):** The content of these records must **not** be overwritten. Corrections or amendments may be done in a controlled way (e.g. amendment note with date and who), but the original must remain visible or recoverable.

---

## 5. Success Criteria

The first technical build is considered **successful** when the following are true. They are the basis for accepting the build and for starting the pilot.

---

### Users Can Find and Review Documents Easily

- Staff can **open** a person’s folder and **navigate** to the right section and document type without confusion. They can **find** a care plan, risk assessment, or other document when they need it. They can **view** the content (structured text or uploaded file) and see when it was last updated and by whom. Managers can do the same for any person in their service. The structure (eight sections, document types) is clear and consistent. Feedback from staff (or from the pilot) supports that finding and reviewing documents is straightforward.

---

### Inspection Evidence Is Visible and Traceable

- **Visible:** Key documents (care plan, risk assessment, daily notes, medication, consent, incidents, review dates) are **present** in the folder where the blueprint and compliance rules expect them, and they can be **opened and read** in the inspection view. The emergency summary shows the seven critical items. The service-level view shows how many people have what status. So an inspector (or an internal auditor) can see the evidence.
- **Traceable:** For each important document or change, the service can **show** who added or updated it and when, using the audit trail. So “who reviewed this care plan?” and “when was this risk assessment last updated?” can be answered. The audit trail is not editable by users and is available to managers (and to read-only users if the organisation chooses).

---

### No AI Is Required for Basic Operation

- The system **works fully** without any AI. Staff choose section and document type when they add a document; they complete reviews and sign off; the system calculates status from the rules and the data; reminders and tasks are generated from the rules and the data. No part of the MVLS depends on AI or on an external AI service. If AI is added in a later build, it will be an **addition** (e.g. a suggestion that staff can confirm or change); the system will still work without it. The first build proves that the core is viable without AI.

---

### Summary: Success Criteria

| Criterion | What success looks like |
|-----------|---------------------------|
| **Find and review documents easily** | Staff and managers can open folder, navigate sections, find and view documents; structure is clear; feedback supports ease of use. |
| **Inspection evidence visible and traceable** | Key documents present and readable in inspection view; emergency summary and service view available; audit trail shows who did what, when. |
| **No AI required** | Full MVLS operation without AI; status, reminders, and tasks from rules and data only; system works standalone. |

---

## 6. Definition of “Done”

The first technical build is **done** when the following are true. This is the authoritative definition for accepting the build and for moving to pilot.

---

### What Must Be Demonstrably Working

- **Sign-in and roles:** A user can sign in and the system applies the correct role (e.g. staff see their people; manager sees the service; read-only user can view but not edit). This can be **demonstrated** (e.g. show that different roles see different things and that read-only cannot edit).
- **Folder structure:** For a person, the system shows the eight sections and the document types under each. A user can open a section and see the list of document types and their status (in date, due, overdue). This can be **demonstrated** for at least one person and one folder.
- **Document add and view:** A user can add a document (upload a file), choose section and document type from the list, and save. The document appears in the right place and can be opened and viewed. The system records who added it and when. This can be **demonstrated**.
- **Structured content (where built):** For each document type that is in scope as “structured,” a user can enter or update content and save. The content is stored and displayed. Review dates can be recorded and are used for status. This can be **demonstrated** for the minimum set of structured types the organisation has defined.
- **Compliance status:** The system calculates and displays status (in date, due, overdue; Green, Amber, Red) for each document type and for the folder, using the compliance rules and the data. When a user completes a review and signs off, the status updates (e.g. from overdue to in date). This can be **demonstrated** (e.g. show a folder with mixed status, complete a review, show status change).
- **Reminders and tasks:** The system shows a list of tasks (what is due or overdue) for the user or for the service. A user can open a task and go to the right person and document. This can be **demonstrated**.
- **Emergency summary:** For a person, the system shows the seven emergency-critical items in one view, drawn from the folder. This can be **demonstrated** (e.g. show the view and confirm the data comes from the folder).
- **Inspection view:** A user with read-only role (or in inspection mode) can open the folder, sections, and documents and **cannot** edit, add, or delete. This can be **demonstrated** (e.g. show that edit/add/delete options are not available or do not work).
- **Audit trail:** When content is added or updated, the system records who and when. A manager (or appropriate role) can view the audit trail for a person or for the service. This can be **demonstrated** (e.g. add a document, then show the audit entry).
- **Service-level view:** A manager can see the service-level compliance view (counts, lists) and it reflects the data in the folders. This can be **demonstrated**.

---

### What Must Be Auditable

- **Audit trail exists and is protected:** The system has a record of who did what and when for the actions that change the folder or its content. That record is stored separately from the care content and is not editable or deletable by normal users. The organisation (or an auditor) can **review** the audit trail and confirm that it is complete and protected.
- **No silent changes:** Every change to care content or to status that is displayed to users is the result of a **recorded user action** (e.g. staff added document, staff completed review) or of the system **recalculating** from the rules and the data after such an action. The organisation can **explain** how status is derived (rules + data) and can **show** that the system does not change content or status without a traceable cause.

---

### What Must Be Explainable to an Inspector

- **What the system does:** The organisation can **explain** in plain language: the system holds the care folder in eight sections; staff add documents and choose where they go; staff enter and update care content and complete reviews; the system applies the compliance rules and shows what is in date, due, or overdue; the system records who did what and when; and inspectors can be shown the folder in read-only mode. No technical jargon is required; the explanation matches the MVLS and the screen structure.
- **What the system does not do:** The organisation can **explain** that the system does not make decisions (staff decide); does not use AI in this version; does not send alerts to external parties; and does not overwrite or delete critical evidence in a way that would hide the past. The explanation matches the exclusions in the MVLS and in this build scope.
- **Evidence:** The organisation can **show** an inspector the folder structure, a sample of documents, the compliance status, the emergency summary, and the audit trail (who did what, when) using the system. The demonstration uses the read-only inspection view where appropriate.

---

## 7. Summary

| Topic | In one sentence |
|-----------|------------------|
| **Objective** | Deliver the smallest set of working parts that support the MVLS and the first pilot; solve structure, visibility, reminders, inspection readiness; deliberately limited to match governance. |
| **In scope** | Sign-in and roles; folder structure; manual upload and viewing; structured content (min set); rule-based status; reminders and tasks; emergency summary; inspection view; audit trail; service-level view; review completion and sign-off. |
| **Out of scope** | External automated alerts; AI (any); advanced analytics; integrations; auto-filing without user choice. |
| **Data and evidence** | Capture: care content, who/when, review dates, responsibility. Preserve: content once saved, audit trail, critical evidence. Never overwrite: audit entries, original/superseded content, critical evidence. |
| **Success criteria** | Users find and review documents easily; inspection evidence visible and traceable; no AI required for basic operation. |
| **Definition of done** | All in-scope components demonstrably working; audit trail present and protected; no silent changes; system explainable to an inspector in plain language with evidence. |

---

*This document is the authoritative scope definition for the first technical build of the digital CQC readiness system. It should be used when planning, building, and accepting the first iteration and when deciding what is in or out of scope.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
