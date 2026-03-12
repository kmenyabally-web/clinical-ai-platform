# Required Screens for the First Technical Build

**Plain-English Definition for the Digital CQC Readiness System**

*This document defines the screens that MUST exist in the first technical build of the digital CQC readiness system. It states the purpose of each screen, who can access it, what users may and may not do, which screens are inspection-critical, and how users move between screens. It is not UI design. It does not describe layouts, colours, buttons, or components. It does not contain code. Plain English only.*

---

## 1. Screen List (First Build Only)

The following screens **must** exist in the first build. No other screens are required for the first build. Future or optional screens (for example organisation and service settings, or a dedicated inspection preparation screen) are not included here.

**Entry**

- Sign-in screen
- Home or landing screen

**Service and people**

- People list screen
- Person summary screen

**Care folder**

- Care folder overview screen
- Section screen
- Document screen
- Emergency summary screen

**Compliance and tasks**

- My tasks or reminders screen
- Service compliance screen
- Care folder compliance screen

**Inspection**

- Inspection view (read-only)

**Evidence and accountability**

- Document upload or attachment screen
- Review completion or sign-off screen
- Audit and history screen

---

## 2. Purpose of Each Screen

### Sign-in screen

**Purpose:** The place where the user proves who they are so the system can apply their role (staff, manager, or inspector) and show only the screens and actions they are allowed.

**Problem it solves:** Without sign-in, the system cannot know who is using it or restrict what they see and do. Sign-in is the start of safe, role-based access.

**Why it is needed for inspection readiness:** Inspectors expect the service to control who can see and change care records. Sign-in is the first step in showing that access is controlled and that inspectors can be given a read-only way in.

---

### Home or landing screen

**Purpose:** The first screen after sign-in, tailored to the user’s role. It gives a short summary of what matters to them (for example “your tasks”, “your people”, “service compliance”, or a direct route to the inspection view) and clear ways to move to the next screen.

**Problem it solves:** Users need a single starting point that reflects their job. A staff member needs something different from a manager or an inspector.

**Why it is needed for inspection readiness:** Staff need to get to the right information quickly (including tasks and emergency-critical information). Inspectors need a clear entry point that leads to evidence. A role-appropriate home supports both day-to-day use and inspection.

---

### People list screen

**Purpose:** Shows the list of people (service users) that the current user is allowed to see—for example everyone in the service or only the people assigned to that staff member. Each person can be selected to open their summary or folder. The list may show an overall folder status (for example Green, Amber, or Red) next to each name.

**Problem it solves:** Staff and managers need to find the right person quickly. Without a clear list, they would not know who is in the service or who needs attention.

**Why it is needed for inspection readiness:** Inspectors may ask to see a sample of people. The service must be able to show a list and then open the chosen person’s folder. The list also supports “who has gaps?” so managers can prioritise.

---

### Person summary screen

**Purpose:** Shows a short summary for one person: who they are (name, identifier if used), who is responsible for them (key worker or similar), the overall status of their folder (Green, Amber, or Red), and quick access to their care folder, emergency summary, and (where relevant) their tasks. It is the “front door” to that person before opening the full folder.

**Problem it solves:** Before opening the full folder, the user (or inspector) can see at a glance who this person is and whether their folder is in good shape.

**Why it is needed for inspection readiness:** Inspectors often look at a person summary before opening the folder. It helps them choose who to look at in depth and confirms that the service has one place that describes each person and their readiness.

---

### Care folder overview screen

**Purpose:** Shows one person’s care folder as a list of the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality). For each section, the user can see whether it is complete, has items due, or has gaps or overdue items, and can open the section to see the documents inside.

**Problem it solves:** The folder has many documents. Users need one place that shows the structure (eight sections) and the status of each section so they can go to the right place. Inspectors expect to see the folder in this structure.

**Why it is needed for inspection readiness:** The blueprint and compliance rules use these eight sections. This screen is the main way the service shows that the folder is organised as CQC expects and that staff and inspectors can find evidence by section.

---

### Section screen

**Purpose:** Shows one section of the folder (for example Risk and Safety). It lists the document types that belong in that section (for example risk assessment, self-harm and suicide risk, PEEP, and so on) and their status (present and in date, due for review, overdue, or missing). The user can open any document type to view or edit it (if their role allows).

**Problem it solves:** Within a section there are several document types. Users need to see what exists, what is due, and what is missing, and to open the right document without scrolling through the whole folder.

**Why it is needed for inspection readiness:** Inspectors look at sections (for example “show me Risk and Safety”). This screen lets them see all risk-related documents and their status in one place and then open the one they want to read.

---

### Document screen

**Purpose:** Shows one document for one person—for example the care plan, the risk assessment, or the consent record. It shows the content (text, dates, who is responsible, when it was last reviewed, when it is next due) and, where the user has permission, allows them to edit or add content. It may also show attached files (PDFs, scans) that belong to this document type.

**Problem it solves:** Staff need to read and update the actual content of a care plan or risk assessment. Inspectors need to read the content to judge whether it is personalised and current. The document screen is where that content lives.

**Why it is needed for inspection readiness:** Inspectors spend much of their time on document screens—reading the care plan, risk assessment, daily notes, medication, consent. The screen must show the current version, the review dates, and who reviewed it, and must not allow inspectors to change anything.

---

### Emergency summary screen

**Purpose:** Shows the seven emergency-critical items for one person in one place: allergies and adverse reactions; current medication list; key risks and safety plan summary; who to contact; communication passport or key communication needs; personal emergency evacuation plan (PEEP); resuscitation or DNAR status. The information is in a form that can be read quickly (for example by bank staff or emergency services).

**Problem it solves:** In an emergency (collapse, missing person, fire), staff need the most important information immediately. They must not have to open several sections or documents. This screen gives them one place to look.

**Why it is needed for inspection readiness:** Inspectors may ask “how do you make sure staff can find allergies and evacuation plans quickly?”. The emergency summary screen is the answer: it exists, it is easy to reach, and it contains exactly what the blueprint says must be immediately accessible.

---

### My tasks or reminders screen

**Purpose:** Shows the current user (or their role) a list of what they need to do: reviews that are due or overdue, event-driven actions (for example “update risk assessment after incident”), or other tasks assigned to them. Each task can be opened to go to the right document or person.

**Problem it solves:** Staff can forget what is due. This screen brings together everything that needs their action so they can prioritise and complete reviews and updates on time.

**Why it is needed for inspection readiness:** CQC readiness depends on reviews and updates happening on time. A tasks screen helps close the gap between “we know we should review it” and “we did it”. Inspectors may ask “how do staff know what is due?”; this screen is part of the answer.

---

### Service compliance screen

**Purpose:** Shows compliance for the whole service (or ward): how many people have Green, Amber, or Red folders; which document types are most often missing or overdue; and a list of people with Red or Amber folders so the manager can prioritise.

**Problem it solves:** Managers need to see “how is my service doing?” without opening every person’s folder. They need to know where to focus.

**Why it is needed for inspection readiness:** Inspectors ask “how many people have an overdue care plan review?”. The service compliance screen is where the manager gets that information and can demonstrate that they know the state of the service.

---

### Care folder compliance screen

**Purpose:** Shows the compliance status of one person’s folder in one view: which documents are present and in date, which are due for review, which are overdue, and which are missing. It may show Green, Amber, or Red for each document type and an overall status for the folder. The user can go from here to the document that needs action.

**Problem it solves:** The key worker or manager needs to see “what is wrong with this folder?” without opening every section. This screen answers that so they can fix gaps before they become an inspection finding.

**Why it is needed for inspection readiness:** If the service can show the same status (what is in date, what is overdue) on this screen, the service and the inspector are looking at the same picture. It helps staff “know on the day” what the state of the folder is.

---

### Inspection view

**Purpose:** A read-only way of seeing the care folder (and, where relevant, the people list and service compliance) that is arranged for inspection. The same information as the normal folder and section screens is shown, but no edit or delete options are shown. The inspector can move from person to person and from section to section without seeing anything they are allowed to change.

**Problem it solves:** Inspectors need to see evidence quickly and in a familiar structure. They must not see options that could let them change or delete anything. The inspection view gives them a clean, read-only path through the evidence.

**Why it is needed for inspection readiness:** Inspection is a core use case. This view (or set of screens in read-only mode) is how the service demonstrates that it can show evidence in the way CQC expects and that inspector access is strictly view-only.

---

### Document upload or attachment screen

**Purpose:** Allows the user to add a file (PDF, scan, image) to the folder and to link it to the right person, section, and document type. The user chooses the section and document type from the list (no suggestion by the system). The system records who uploaded it and when.

**Problem it solves:** Some evidence is in the form of files (capacity assessment form, DoLS authorisation, letter from GP). Staff need a clear way to attach these to the folder so that they appear in the right place and are traceable.

**Why it is needed for inspection readiness:** Inspectors ask to see “the actual form” or “the authorisation”. Uploaded documents must be in the right place and not overwritten without a trace. This screen is where that happens in a controlled way.

---

### Review completion or sign-off screen

**Purpose:** The place where the user confirms that they have completed a review (for example care plan review, risk assessment review). They record that the review is done and the date. The system then updates the “last review date” and “next review date” and recalculates status. This screen is the human confirmation point; the system does not mark a review as complete without this step.

**Problem it solves:** Reviews must be done by a person, not assumed by the system. This screen is where the professional takes responsibility and the system records it so that inspectors can see “who reviewed and when”.

**Why it is needed for inspection readiness:** Inspectors look for sign-off and dates. The review completion screen is how the service ensures that “review completed” is always linked to a human action and a timestamp, and that status (for example Green) only changes when a real review has happened.

---

### Audit and history screen

**Purpose:** Shows who did what and when: who created or updated a document, who completed a review, when something changed. It may be filtered by person, by document type, or by date. It shows the audit trail that the system keeps; it does not allow the user to edit or delete that trail.

**Problem it solves:** Managers and inspectors need to answer “who reviewed this?” and “when did this change?”. The audit and history screen is where that information is visible.

**Why it is needed for inspection readiness:** Inspectors ask for evidence of accountability. This screen is where the service shows that every change is recorded and that the record is not tampered with.

---

## 3. Access and Roles

For each screen, the table below states which roles can access it and which roles must not.

| Screen | Who can access | Who must NOT access |
|--------|-----------------|----------------------|
| Sign-in | Everyone who uses the system (staff, managers, inspectors). | N/A (everyone signs in). |
| Home or landing | Everyone; content depends on role. | N/A. |
| People list | Staff (their people or their service’s people), managers, inspectors (read-only). | Staff must not see people from another service unless they have a role that allows it. |
| Person summary | Staff who can see that person, managers, inspectors (read-only). | Staff who are not allowed to see that person (for example another service). |
| Care folder overview | Staff who can see that person, managers, inspectors (read-only). | Staff who cannot see that person. Inspectors must not have edit access. |
| Section screen | Same as care folder overview. | Same. |
| Document screen | Staff who can see that person; edit only for the role responsible for that document type. Managers may have view; inspectors read-only. | Inspectors must not have edit. Staff from another service or without permission for that person must not access. |
| Emergency summary | All staff who may need it (including bank and night staff), managers, inspectors (read-only). Edit only for responsible staff. | No one should be blocked from viewing in an emergency. |
| My tasks or reminders | Staff and managers (each sees their own or their role’s tasks). | Inspectors do not need this; they are not completing tasks. |
| Service compliance | Managers for that service. | Staff (they use “my tasks” and person-level screens). Inspectors may see a read-only version if the service chooses. |
| Care folder compliance | Staff who can see that person, managers, inspectors (read-only). | Same as care folder. |
| Inspection view | Inspectors; managers may use it to “see what the inspector sees”. | Inspectors must have read-only only; no one may edit from this view. |
| Document upload or attachment | Staff who can edit that person’s folder and who are allowed to attach files. | Inspectors (they view only); staff who cannot see that person. |
| Review completion or sign-off | The role responsible for that review (for example key worker for care plan review). | Inspectors (they do not complete reviews); staff who are not responsible for that document type. |
| Audit and history | Managers; staff may see their own actions if the organisation allows. Inspectors (read-only). | No one may edit or delete; inspectors view only. |

---

## 4. Allowed and Forbidden Actions

### Allowed actions (by screen)

**Document screen (for staff with edit permission):** View content; edit or add content; complete a review or sign-off for that document (via the review completion screen); view attached files; add or replace an attached file (via the upload screen). They must not delete the document or delete critical evidence (incidents, safeguarding, complaints).

**Section screen:** View status of each document type; open any document to view or edit (if permitted). They must not change status manually (for example mark as Green without a review).

**Care folder overview:** View status of each section; open any section. Same restriction: no manual override of status.

**Emergency summary:** View for all staff who may need it; edit only for staff who are responsible for updating the underlying content (for example medication, contacts). No one may delete the emergency summary or the underlying data.

**My tasks:** Open a task to go to the right person and document; complete the task by doing the review or update on the document screen and review completion screen. They must not “dismiss” a task without completing the action (or the system must not allow that for compliance tasks).

**Service compliance:** View all data; managers may use it to open a person’s folder. They must not change compliance status from this screen.

**Care folder compliance:** View status; open a document to fix a gap. They must not mark something as in date or Green without going through the review completion screen.

**Inspection view:** View only. No edit, no delete, no upload, no sign-off. Inspectors may only move between people, sections, and documents and read.

**Audit and history:** View only. No edit, no delete. No user role may remove or change past audit entries.

**Document upload:** Add a file; link it to person, section, and document type; replace an old file with a new version (old version retained or clearly superseded). They must not overwrite without the system recording who and when; they must not delete critical uploads (for example DoLS, capacity assessment).

**Review completion:** Confirm that the review is done; enter date and sign-off. The system then updates status. They must not backdate falsely or sign off for someone else without that being a defined, audited process.

---

### Forbidden actions (and why they matter for safety and compliance)

**Inspectors must never:** Edit or delete any care content, status, or files. If they could, the record could be altered during inspection and the service could not prove that evidence was not tampered with.

**No one may:** Delete incident reports, safeguarding records, complaint records, signed-off content (as history), audit entries, or critical uploads (for example capacity assessment, DoLS). If they could, evidence could be destroyed and accountability lost; inspectors and regulators expect retention.

**No one may:** Mark a document or folder as “in date” or Green without a recorded review (via the review completion screen). If they could, the service could hide overdue reviews and inspectors would be misled.

**No one may:** Edit or delete audit and history entries. If they could, the service could not prove who did what and when, and inspectors would not trust the record.

**Staff must not:** See or edit people they are not allowed to support. If they could, inspectors would question confidentiality and access control.

---

## 5. Inspection-Critical Screens

### Essential during inspections

These screens are the ones inspectors typically use or need to see the system demonstrate. If they did not exist or did not work, the service would struggle to show evidence in the way CQC expects.

- **Inspection view:** The main way inspectors see evidence. It must show the same structure (people, folder, sections, documents) and the same content as staff use, in read-only form. Inspectors use it to open people, open sections, and read documents (care plan, risk assessment, daily notes, medication, consent, incidents and safeguarding, review dates).

- **People list screen** (within inspection view or read-only): So inspectors can choose which people to look at. Often the same list as staff see, but read-only.

- **Care folder overview screen** (within inspection view): So inspectors can see the eight sections and move to the right section (for example Risk and Safety, Care and Treatment).

- **Section screen** (within inspection view): So inspectors can see all document types in a section and their status, then open the one they want (for example risk assessment).

- **Document screen** (within inspection view): Where inspectors spend most of their time reading the actual care plan, risk assessment, daily notes, medication record, consent, incidents, and review dates. Must be read-only and show current version and dates.

- **Emergency summary screen:** So the service can show that emergency-critical information (allergies, medication, contacts, communication, PEEP, DNAR) is in one place and easy to reach. Inspectors may ask to see it to verify it exists and is up to date.

- **Audit and history screen** (read-only): So the service can show “who reviewed this?” and “when did this change?” when the inspector asks. Must be read-only.

---

### Supportive but not essential during inspections

These screens support the service before or during inspection but are not the main ones inspectors interact with.

- **Service compliance screen:** The manager may use it to answer “how many people have an overdue review?”. Inspectors may be shown it to demonstrate that the manager has oversight, but they do not need to use it themselves.

- **Care folder compliance screen:** Useful for the manager or key worker to “know on the day” the state of a person’s folder. The inspector could get the same information from the section and document screens; this screen is a convenience.

- **Person summary screen:** Helps the inspector see who the person is and folder status before opening the full folder. Helpful but not strictly essential if they can go straight from the people list to the folder.

- **Home or landing screen:** Inspectors need a simple way to reach the inspection view; the exact shape of the home screen is less important than that the path to the inspection view is clear.

---

### How inspectors typically use these screens

Inspectors usually: **Sign in** with a read-only role → go to a **home** or **inspection** entry point → see a **people list** → choose one or more people → open **care folder overview** for each → open **sections** (often Risk and Safety, Assessment and Planning, Care and Treatment, Incidents and Safeguarding) → open **documents** (care plan, risk assessment, daily notes, medication, consent, incidents, review dates) and read the content. They may ask to see the **emergency summary** and the **audit or history** for a document. They do **not** use: my tasks, document upload, or review completion. They only view; they never edit or delete.

---

## 6. Navigation Principles (High Level)

### How users move between screens

- **From home:** The user goes to the screen that matches their role: staff to “my people” or “my tasks”; managers to service compliance or people list; inspectors to inspection view or people list.

- **From people list:** The user selects a person and goes to person summary or straight to care folder overview.

- **From person summary:** The user can go to care folder overview, emergency summary, or (if they have tasks for that person) to the relevant document or task.

- **From care folder overview:** The user selects a section and goes to the section screen.

- **From section screen:** The user selects a document type and goes to the document screen.

- **From document screen:** The user can go back to the section or folder overview; if they have edit permission, they can open the review completion or upload screen from there (or from a clear “complete review” or “attach file” action).

- **From my tasks:** The user selects a task and is taken to the right person and document (or document screen) to complete it.

- **From service compliance:** The user can open a person’s folder or care folder compliance to see or fix a gap.

- **From inspection view:** The inspector moves in the same way (people list → folder overview → section → document) but never sees edit or delete options; they may have a single path that keeps them in read-only screens.

At every stage, the user should be able to go **back** to the previous screen (for example from document back to section, from section back to folder overview) and to return to **home** or **people list** without getting stuck. The system should make it clear **where they are** (for example “John Smith, Care folder, Risk and Safety, Risk assessment”) so they always know the context.

---

### How inspection mode differs from normal use

- **Normal use:** Staff and managers see edit and delete options (where allowed); they can complete reviews, upload files, and change content. They can use “my tasks”, service compliance, and move freely between people and folders (within their permission). They may see only their people or their service.

- **Inspection mode:** The inspector (and optionally the manager when “showing what the inspector sees”) sees the **same** people, folders, sections, and documents, but **no** edit, delete, upload, or sign-off options. Navigation is the same (people → folder → section → document), but every screen is read-only. The inspector does not see: my tasks, review completion, or document upload. The path is focused on: people list → folder overview → sections → documents → emergency summary and audit or history when asked. So inspection mode is a **restriction** of actions and possibly a **subset** of screens, not a different set of information.

---

### How users avoid confusion or accidental changes

- **Clear context:** Each screen should make it obvious which person, which section, and which document the user is looking at (for example a title or breadcrumb: “John Smith, Care folder, Risk and Safety, Risk assessment”). So they always know where they are in the hierarchy.

- **Consistent “back” and “home”:** From any screen, the user can go back one step (for example from document to section) and can return to home or people list in a small number of steps. They are never trapped in a screen with no way back.

- **Role-appropriate entry:** Home shows only what is relevant to their role (their people, their tasks, or service compliance, or inspection view). They are not shown screens they cannot use or that would confuse them.

- **Inspection path:** For inspectors, the system can offer a single, linear path: people list → folder overview → section → document, with no branches to tasks or upload or review completion. That keeps the inspection flow simple and reduces the chance of going to the wrong place or attempting an action they are not allowed to do.

- **No edit options in inspection view:** When in inspection view, edit, add, delete, upload, and sign-off options are not shown (or are disabled). So the inspector cannot accidentally trigger a change even if they try.

---

## 7. Summary: Screens at a Glance

| Screen | Purpose in one line | Key roles | Inspection-critical? |
|--------|---------------------|-----------|------------------------|
| Sign-in | Prove identity and set role. | All | No (but required to enter). |
| Home or landing | Role-based starting point. | All | Supportive. |
| People list | Find and select a person. | Staff, managers, inspectors | Yes. |
| Person summary | Short summary for one person. | Staff, managers, inspectors | Supportive. |
| Care folder overview | See the eight sections of the folder. | Staff, managers, inspectors | Yes. |
| Section screen | See document types in one section. | Staff, managers, inspectors | Yes. |
| Document screen | View or edit one document. | Staff, managers, inspectors (view only) | Yes. |
| Emergency summary | Seven emergency-critical items in one place. | All staff, inspectors | Yes. |
| My tasks or reminders | What the user needs to do. | Staff, managers | No. |
| Service compliance | Service-wide compliance picture. | Managers | Supportive. |
| Care folder compliance | One person’s folder status. | Staff, managers, inspectors | Supportive. |
| Inspection view | Read-only path through evidence. | Inspectors, managers | Yes (essential). |
| Document upload or attachment | Attach files to the folder. | Staff (with permission) | No. |
| Review completion or sign-off | Confirm a review is done. | Responsible staff | No (but underpins evidence). |
| Audit and history | Who did what, when. | Managers, inspectors (read-only) | Yes. |

---

*This document defines the screen requirements for the first technical build of the digital CQC readiness system. It should be used when planning and building the first iteration to agree what screens must exist, who uses them, what they are for, and what users may and may not do.*

*Document version: 1.0 | Plain English only | No UI design details or code.*
