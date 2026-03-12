# Digital CQC Readiness System: Screen Structure

**Required Screens and Interactions for Nurses, Support Workers, Managers, and Inspectors**

*This document defines the screens the system must have, what each screen is for, who can use it, what information it shows, what users can and cannot do, and how screens support inspection. It does not describe layout, colours, buttons, or code. It is the reference for what must exist before any development begins.*

---

## 1. Core Screen List

The system must include the following screens. Each is named and will be described in the sections that follow.

**Entry and overview**

- **Sign-in screen**
- **Home or landing screen** (role-dependent)

**Service and people**

- **Service overview screen**
- **People list screen**
- **Person summary screen**

**Care folder**

- **Care folder overview screen**
- **Section screen** (one per section: Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality)
- **Document screen** (view and, where allowed, edit a specific document)
- **Emergency summary screen**

**Compliance and actions**

- **My tasks or reminders screen**
- **Service compliance screen**
- **Care folder compliance screen** (status for one person’s folder)

**Inspection**

- **Inspection view screen** (read-only, inspector-focused)
- **Inspection preparation screen** (for managers and compliance leads)

**Governance and settings**

- **Audit and history screen** (who did what, when)
- **Organisation and service settings screen** (for administrators or managers)

**Supporting**

- **Document upload or attachment screen** (for adding files to the folder)
- **Review completion or sign-off screen** (for completing a review and recording who and when)

---

## 2. Purpose of Each Screen

### Sign-in screen

**Purpose:** The place where the user proves who they are so the system can show them the right screens and allow only the actions that match their role.

**Problem it solves:** Without a sign-in, the system cannot know whether the user is a support worker, a manager, or an inspector, and cannot restrict what they see or do. Sign-in is the start of safe, role-based access.

**Why it is needed for CQC readiness:** Inspectors expect the service to control who can see and change care records. Sign-in is the first step in showing that access is controlled and that inspectors themselves have a distinct, read-only way in.

---

### Home or landing screen

**Purpose:** The first screen after sign-in, tailored to the user’s role. It gives a short summary of what matters to them (for example, “your people”, “your tasks”, “service compliance”, or “inspection view”) and clear ways to move to the next screen.

**Problem it solves:** Users need a single starting point that does not overwhelm them and that reflects their job. A support worker needs something different from a manager or an inspector.

**Why it is needed for CQC readiness:** Staff need to get to the right information quickly (including emergency-critical information and tasks). Inspectors need a clear, calm entry point that leads straight to evidence. A role-appropriate home supports both day-to-day use and inspection.

---

### Service overview screen

**Purpose:** Shows the service (or ward) as a whole: its name, who works there (if relevant), and a high-level picture of how many people are in the service and how the service is doing on compliance (for example, how many people have complete folders, how many have items due or overdue).

**Problem it solves:** Managers need to see “how is my service doing?” without opening every person’s folder. They need to know where to focus (which people, which document types).

**Why it is needed for CQC readiness:** CQC inspects at service level. The manager must be able to describe the service and its compliance. This screen is where that picture is visible and where preparation for inspection can start.

---

### People list screen

**Purpose:** Shows the list of people (service users) that the current user is allowed to see—for example, everyone in the service or only the people assigned to that staff member. Each person can be selected to open their folder or summary. The list may show a simple status (for example, Green, Amber, or Red) next to each name.

**Problem it solves:** Staff and managers need to find the right person quickly. Without a clear list, they would not know who is in the service or who needs attention.

**Why it is needed for CQC readiness:** Inspectors may ask to see a sample of people. The service needs to be able to show a list (often the same list staff use) and then open the chosen person’s folder. The list also supports “who has gaps?” so managers can prioritise.

---

### Person summary screen

**Purpose:** Shows a short summary for one person: who they are (name, identifier if used), who is responsible for them (key worker or similar), the overall status of their folder (Green, Amber, or Red), and quick access to their care folder, emergency summary, and (where relevant) their tasks. It does not show the full folder content; it is the “front door” to that person.

**Problem it solves:** Before opening the full folder, the user (or inspector) can see at a glance who this person is and whether their folder is in good shape. It avoids opening the folder blindly.

**Why it is needed for CQC readiness:** Inspectors often look at a person summary before opening the folder. It helps them choose who to look at in depth and confirms that the service has one place that describes each person and their readiness.

---

### Care folder overview screen

**Purpose:** Shows one person’s care folder as a list of the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality). For each section, the user can see whether it is complete, has items due, or has gaps or overdue items, and can open the section to see the documents inside.

**Problem it solves:** The folder has many documents. Users need a single place that shows the structure (the eight sections) and the status of each section so they can go to the right place. Inspectors expect to see the folder in this structure.

**Why it is needed for CQC readiness:** The blueprint and compliance rules use these eight sections. This screen is the main way the service shows that the folder is organised as CQC expects and that staff and inspectors can find evidence by section.

---

### Section screen

**Purpose:** Shows one section of the folder (for example, Risk and Safety). It lists the document types that belong in that section (for example, risk assessment, self-harm and suicide risk, violence and aggression risk, PEEP, and so on) and their status (present and in date, due for review, overdue, or missing). The user can open any document type to view or edit it (if their role allows).

**Problem it solves:** Within a section there are several document types. Users need to see what exists, what is due, and what is missing, and to open the right document without scrolling through the whole folder.

**Why it is needed for CQC readiness:** Inspectors look at sections (for example, “show me Risk and Safety”). This screen lets them see all risk-related documents and their status in one place and then open the one they want to read.

---

### Document screen

**Purpose:** Shows one document for one person—for example, the care plan, the risk assessment, or the consent record. It shows the content (text, dates, who is responsible, when it was last reviewed, when it is next due) and, where the user has permission, allows them to edit or add content. It may also show attached files (PDFs, scans) that belong to this document type.

**Problem it solves:** Staff need to read and update the actual content of a care plan or risk assessment. Inspectors need to read the content to judge whether it is personalised and current. The document screen is where that content lives.

**Why it is needed for CQC readiness:** Inspectors spend much of their time on document screens—reading the care plan, the risk assessment, daily notes, medication, consent. The screen must show the current version, the review dates, and who reviewed it, and must not allow inspectors to change anything.

---

### Emergency summary screen

**Purpose:** Shows the seven emergency-critical items for one person in one place: allergies and adverse reactions; current medication list; key risks and safety plan summary; who to contact; communication passport or key communication needs; personal emergency evacuation plan (PEEP); resuscitation or DNAR status. The information is in a form that can be read quickly by someone who does not know the person (for example, bank staff or emergency services).

**Problem it solves:** In an emergency (collapse, missing person, fire), staff need the most important information immediately. They must not have to open several sections or documents. This screen gives them one place to look.

**Why it is needed for CQC readiness:** Inspectors may ask “how do you make sure staff can find allergies and evacuation plans quickly?”. The emergency summary screen is the answer: it exists, it is easy to reach, and it contains exactly what the blueprint says must be immediately accessible.

---

### My tasks or reminders screen

**Purpose:** Shows the current user (or their role) a list of what they need to do: reviews that are due or overdue, event-driven actions (for example, “update risk assessment after incident”), or other tasks assigned to them. Each task can be opened to go to the right document or person.

**Problem it solves:** Staff can forget what is due. This screen brings together everything that needs their action so they can prioritise and complete reviews and updates on time.

**Why it is needed for CQC readiness:** CQC readiness depends on reviews and updates happening on time. A tasks screen helps close the gap between “we know we should review it” and “we did it”. Inspectors may ask “how do staff know what is due?”; this screen is part of the answer.

---

### Service compliance screen

**Purpose:** Shows compliance for the whole service (or ward): how many people have Green, Amber, or Red folders; which document types are most often missing or overdue; when the last care plan or care record audit was; and any service-level actions (for example, audit due). It may show a list of people with Red or Amber folders so the manager can prioritise.

**Problem it solves:** Managers and compliance leads need to see the true picture of the service. They cannot open every folder to find gaps. This screen gives them the numbers and the list so they can lead improvement and prepare for inspection.

**Why it is needed for CQC readiness:** Inspectors ask “how many people have an overdue care plan review?” and “when did you last audit?”. The service compliance screen is where the manager gets that information and where they can demonstrate that they know the state of the service.

---

### Care folder compliance screen

**Purpose:** Shows the compliance status of one person’s folder in one view: which documents are present and in date, which are due for review, which are overdue, and which are missing. It may show Green, Amber, or Red for each document type and an overall status for the folder. The user can go from here to the document that needs action.

**Problem it solves:** The key worker or manager needs to see “what is wrong with this folder?” without opening every section. This screen answers that so they can fix gaps before they become an inspection finding.

**Why it is needed for CQC readiness:** Inspectors form a view of each person’s folder. If the service can show the same status (what is in date, what is overdue) on this screen, the service and the inspector are looking at the same picture. It also helps staff “know on the day” what the state of the folder is.

---

### Inspection view screen

**Purpose:** A read-only way of seeing the care folder (and, where relevant, the people list and service compliance) that is arranged for inspection. The same information as the normal folder and section screens is shown, but in an order and with highlights that help inspectors find what they usually ask for first (care plan, risk assessment, daily notes, medication, consent, incidents and safeguarding, review dates). No edit or delete options are shown. The inspector can move from person to person and from section to section without seeing anything they are not allowed to change.

**Problem it solves:** Inspectors need to see evidence quickly and in a familiar structure. They must not see buttons or options that could let them change or delete anything. The inspection view gives them a clean, read-only path through the evidence.

**Why it is needed for CQC readiness:** Inspection is a core use case. This screen (or set of screens) is how the service demonstrates that it can show evidence in the way CQC expects and that inspector access is strictly view-only.

---

### Inspection preparation screen

**Purpose:** For managers and compliance leads before or during an inspection. It shows service-level compliance, a list of people with Red or Amber folders, “documents inspectors usually check first”, and possibly a short checklist (for example, “emergency summary checked”, “key contacts up to date”). It does not show the evidence itself; it helps the manager prepare and brief staff.

**Problem it solves:** When an inspection is announced, the manager needs to know where the gaps are and what to prioritise. This screen gives them that in one place so they can allocate work and be ready to show the inspection view.

**Why it is needed for CQC readiness:** Preparation reduces stress and improves the chance that the service can show complete, current evidence. Inspectors expect the manager to know the state of the service; this screen supports that.

---

### Audit and history screen

**Purpose:** Shows who did what and when: who created or updated a document, who completed a review, when something changed. It may be filtered by person, by document type, or by date. It shows the audit trail that the system keeps; it does not allow the user to edit or delete that trail.

**Problem it solves:** Managers and inspectors need to answer “who reviewed this?” and “when did this change?”. The audit and history screen is where that information is visible. Staff may see their own recent actions.

**Why it is needed for CQC readiness:** Inspectors ask for evidence of accountability. This screen is where the service shows that every change is recorded and that the record is not tampered with.

---

### Organisation and service settings screen

**Purpose:** Allows authorised users to view and edit organisation-level and service-level information: organisation name, service names, who is responsible for what (for example, assigning key workers to people), and possibly review intervals or “due soon” windows within the limits set by the compliance rules. It is not where care content is edited; it is where the structure and settings of the service are maintained.

**Problem it solves:** Services need to set up their organisation and wards, add or close services, and assign responsibility. Without a dedicated screen, this would be mixed up with care content or hidden where only technical staff could find it.

**Why it is needed for CQC readiness:** Clear ownership and correct structure (one folder per person, right service) underpin compliance. This screen supports that. Inspectors do not need to use it, but they expect the service to be able to show that structure and ownership are managed.

---

### Document upload or attachment screen

**Purpose:** Allows the user to add a file (PDF, scan, image) to the folder and to link it to the right person, section, and document type. It records who uploaded it and when. It may allow the user to add a short description or to replace an older file with a new version (in which case the old version is kept or clearly superseded, not silently overwritten).

**Problem it solves:** Some evidence is in the form of files (capacity assessment form, DoLS authorisation, letter from GP). Staff need a clear way to attach these to the folder so that they appear in the right place and are traceable.

**Why it is needed for CQC readiness:** Inspectors ask to see “the actual form” or “the authorisation”. Uploaded documents must be in the right place and not overwritten without a trace. This screen is where that happens in a controlled way.

---

### Review completion or sign-off screen

**Purpose:** The place where the user confirms that they have completed a review (for example, care plan review, risk assessment review). They record that the review is done, the date, and (where the system supports it) their sign-off. The system then updates the “last review date” and “next review date” and may clear the relevant task or reminder. This screen is the human confirmation point; the system does not mark a review as complete without this step.

**Problem it solves:** Reviews must be done by a person, not assumed by the system. This screen is where the professional takes responsibility and the system records it so that inspectors can see “who reviewed and when”.

**Why it is needed for CQC readiness:** Inspectors look for sign-off and dates. The review completion screen is how the service ensures that “review completed” is always linked to a human action and a timestamp, and that status (Green) only changes when a real review has happened.

---

## 3. Access and Roles

For each screen, the table below states which roles can access it and who must not.

| Screen | Who can access | Who must NOT access |
|--------|-----------------|----------------------|
| Sign-in | Everyone who uses the system (staff, managers, compliance leads, inspectors, administrators). | N/A (everyone signs in). |
| Home or landing | Everyone; content depends on role. | N/A. |
| Service overview | Managers and compliance leads for that service; administrators. Inspectors may see a version (e.g. read-only). | Frontline staff who only need “their” people (they use the people list instead). |
| People list | Frontline staff (their people or their service’s people), managers, compliance leads, inspectors (read-only). | Depends on design: some staff may see only their caseload; inspectors see what the service shows them. |
| Person summary | Same as people list: staff who can see that person, managers, compliance leads, inspectors (read-only). | Staff who are not allowed to see that person (e.g. another service). |
| Care folder overview | Staff who can see that person, managers, compliance leads, inspectors (read-only). | Staff who cannot see that person; inspectors must not have edit access. |
| Section screen | Same as care folder overview. | Same. |
| Document screen | Staff who can see that person; edit only for the role responsible for that document type. Managers and compliance may have view; inspectors read-only. | Inspectors must not have edit. Staff from another service or without permission for that person must not access. |
| Emergency summary | All staff who may need it (including bank and night staff); managers; inspectors (read-only). | No one should be blocked from viewing in an emergency; edit only for responsible staff. |
| My tasks or reminders | Frontline staff, key workers, nurses, managers (each sees their own or their role’s tasks). | Inspectors do not need this (they are not completing tasks); they may be given read-only if useful. |
| Service compliance | Managers and compliance leads for that service; administrators. | Frontline staff (they use “my tasks” and person-level screens); inspectors may see read-only version. |
| Care folder compliance | Staff who can see that person, managers, compliance leads; inspectors (read-only). | Same as care folder. |
| Inspection view | Inspectors; managers and compliance may use it to “see what the inspector sees”. | Only inspectors (and optionally managers) should use it during inspection; it must be read-only for inspectors. |
| Inspection preparation | Managers and compliance leads. | Frontline staff (not needed for their role); inspectors (they see the inspection view, not preparation). |
| Audit and history | Managers, compliance leads, inspectors (read-only); staff may see their own actions. | No one may edit or delete; inspectors view only. |
| Organisation and service settings | Administrators; possibly senior managers for organisation; managers for their service. | Frontline staff; inspectors. |
| Document upload or attachment | Staff who can edit that person’s folder and who are allowed to attach files. | Inspectors (they view only); staff who cannot see that person. |
| Review completion or sign-off | The role responsible for that review (e.g. key worker for care plan review). | Inspectors (they do not complete reviews); staff who are not responsible for that document type. |

---

## 4. Information Shown on Each Screen

This section describes **what kind of information** each screen shows, in conceptual terms. It does not describe layout or where things appear.

**Sign-in:** Only what is needed to sign in (e.g. identifier, way to prove identity). No care information.

**Home or landing:** Summary tailored to role: for staff, their people or their tasks; for managers, service compliance or key numbers; for inspectors, a direct route to the inspection view or people list. No full care content on the home screen.

**Service overview:** Service name; number of people; counts or proportions of Green, Amber, Red folders; which document types are most often overdue; last audit date; optionally a short list of people with Red or Amber folders.

**People list:** List of people (names and possibly identifiers); for each, an overall folder status (Green, Amber, Red) so the user can see who needs attention; way to open each person.

**Person summary:** Person’s name and identifier; who is responsible (key worker); overall folder status; quick access to care folder, emergency summary, and (if relevant) tasks for this person.

**Care folder overview:** The eight section names; for each section, an indication of status (e.g. complete, has items due, has gaps or overdue); way to open each section.

**Section screen:** The document types that belong in this section; for each, status (present and in date, due for review, overdue, missing); way to open each document.

**Document screen:** The content of the document (text, dates, who is responsible, last review date, next review date); list or links to any attached files; for editable users, a way to edit and to complete a review or sign-off where applicable.

**Emergency summary:** The seven items: allergies and adverse reactions; current medication list; key risks and safety plan summary; who to contact; communication needs; PEEP; resuscitation/DNAR status. All in a form that can be read quickly.

**My tasks or reminders:** List of tasks (e.g. “Care plan review due for [person]”, “Update risk assessment after incident for [person]”); each task linked to the person and document so the user can open it and act.

**Service compliance:** Same kind of information as service overview but with more detail: counts, lists of people with Red or Amber, which document types are overdue, audit dates, and optionally next actions.

**Care folder compliance:** For one person, each document type and its status (Green, Amber, Red, or not required); overall folder status; way to open any document that needs action.

**Inspection view:** The same information as the care folder (people list, folder overview, sections, documents, emergency summary, compliance status) but arranged for inspection and with no edit or delete options. May highlight “documents inspectors usually check first”.

**Inspection preparation:** Service compliance summary; list of people with Red or Amber folders; list of document types or areas that inspectors often ask for; optional checklist for the manager.

**Audit and history:** List of events: what was done (e.g. “Care plan updated”), for whom, by whom, and when. Filterable by person, document type, or date. No edit or delete.

**Organisation and service settings:** Organisation name and details; list of services; for each service, name and possibly who is the manager or responsible person; assignment of key workers or responsible staff to people; optional settings (e.g. review interval, “due soon” window) within the limits of the compliance rules.

**Document upload or attachment:** Choice of person, section, and document type; way to select a file; who is uploading and when (recorded automatically); optional note or reason (e.g. “New DoLS authorisation”).

**Review completion or sign-off:** Which document and person are being reviewed; the date of review; who is completing the review; confirmation (sign-off) that the review is done; optional short note. The system records this and updates last review date and next review date.

---

## 5. Allowed and Forbidden Actions

### Allowed actions (by screen)

**Document screen (for staff with edit permission):** View content; edit or add content; complete a review or sign-off for that document; view attached files; add or replace an attached file (via upload screen). They must not delete the document or delete critical evidence.

**Section screen:** View status of each document type; open any document to view or edit (if permitted). They must not change status manually (e.g. mark as Green without a review).

**Care folder overview:** View status of each section; open any section. Same restriction: no manual override of status.

**Emergency summary:** View only for most staff; edit only for staff who are responsible for updating the underlying content (e.g. medication, contacts). No one may delete the emergency summary or the underlying data.

**My tasks:** Open a task to go to the right person and document; complete the task by doing the review or update on the document screen. They must not “dismiss” a task without completing the action (or the system must not allow that for compliance tasks).

**Service compliance:** View all data; managers may use it to assign work or to open a person’s folder. They must not change compliance status from this screen.

**Care folder compliance:** View status; open a document to fix a gap. They must not mark something as in date or Green without going through the review completion screen.

**Inspection view:** View only. No edit, no delete, no upload, no sign-off. Inspectors may only move between people, sections, and documents and read.

**Audit and history:** View only. No edit, no delete. No user role may remove or change past audit entries.

**Organisation and service settings:** View and edit organisation and service details and assignments, within the rules (e.g. one folder per person, mandatory document types). They must not delete a person’s folder or remove required structure.

**Document upload:** Add a file; link it to person, section, and document type; replace an old file with a new version (old version retained or clearly superseded). They must not overwrite without recording who and when; they must not delete critical uploads (e.g. DoLS, capacity assessment).

**Review completion:** Confirm that the review is done; enter date and sign-off. The system then updates status. They must not backdate falsely or sign off for someone else without that being a defined, audited process.

---

### Forbidden actions (and why inspectors care)

**Inspectors must never:** Edit or delete any care content, status, organisation or service data, audit, or files. If they could, the record could be altered during inspection and the service could not prove that evidence was not tampered with.

**No one may:** Delete incident reports, safeguarding records, complaint records, signed-off content (as history), audit entries, or critical uploads (e.g. capacity assessment, DoLS). If they could, evidence could be destroyed and accountability lost; inspectors and regulators expect retention.

**No one may:** Mark a document or folder as “in date” or Green without a recorded review (via the review completion screen). If they could, the service could hide overdue reviews and inspectors would be misled.

**No one may:** Edit or delete audit and history entries. If they could, the service could not prove who did what and when, and inspectors would not trust the record.

**Staff must not:** See or edit people they are not allowed to support (or inspectors would question confidentiality and access control).

---

## 6. Inspection-Critical Screens

### Essential during inspections

These screens are the ones inspectors typically use or need to see the system demonstrate. If they did not exist or did not work, the service would struggle to show evidence in the way CQC expects.

- **Inspection view screen:** The main way inspectors see evidence. It must show the same structure (people, folder, sections, documents) and the same content as staff use, in read-only form. Inspectors use it to open people, open sections, and read documents (care plan, risk assessment, daily notes, medication, consent, incidents and safeguarding, review dates).

- **People list screen** (or the inspector version of it): So inspectors can choose which people to look at. Often the same list as staff see, but read-only.

- **Care folder overview screen** (within inspection view): So inspectors can see the eight sections and move to the right section (e.g. Risk and Safety, Care and Treatment).

- **Section screen** (within inspection view): So inspectors can see all document types in a section and their status, then open the one they want (e.g. risk assessment).

- **Document screen** (within inspection view): Where inspectors spend most of their time reading the actual care plan, risk assessment, daily notes, medication record, consent, incidents, and review dates. Must be read-only and show current version and dates.

- **Emergency summary screen:** So the service can show that emergency-critical information (allergies, medication, contacts, communication, PEEP, DNAR) is in one place and easy to reach. Inspectors may ask to see it to verify it exists and is up to date.

- **Audit and history screen** (or equivalent read-only view): So the service can show “who reviewed this?” and “when did this change?” when the inspector asks. Must be read-only.

---

### Useful but not essential during inspections

These screens support the service before or during inspection but are not the main ones inspectors interact with.

- **Inspection preparation screen:** Used by the manager before (or at the start of) inspection to see gaps and prioritise. Inspectors do not use it; they benefit from the preparation it enables.

- **Service compliance screen:** The manager may use it to answer “how many people have an overdue review?” or “when was the last audit?”. Inspectors may be shown it to demonstrate that the manager has oversight, but they do not need to use it themselves.

- **Care folder compliance screen:** Useful for the manager or key worker to “know on the day” the state of a person’s folder. The inspector could get the same information from the section and document screens; this screen is a convenience.

- **Person summary screen:** Helps the inspector see who the person is and folder status before opening the full folder. Helpful but not strictly essential if they can go straight from the people list to the folder.

- **Home or landing screen:** Inspectors need a simple way to reach the inspection view; the exact shape of the home screen is less important than that the path to inspection view is clear.

---

### How inspectors typically interact with these screens

Inspectors usually: **Sign in** with a read-only role → go to a **home** or **inspection** entry point → see a **people list** → choose one or more people → open **care folder overview** for each → open **sections** (often Risk and Safety, Assessment and Planning, Care and Treatment, Incidents and Safeguarding) → open **documents** (care plan, risk assessment, daily notes, medication, consent, incidents, review dates) and read the content. They may ask to see the **emergency summary** and the **audit/history** for a document. They do **not** use: my tasks, service settings, document upload, or review completion. They only view; they never edit or delete.

---

## 7. Navigation Principles

### How users move between screens

- **From home:** The user goes to the screen that matches their role: staff to “my people” or “my tasks”; managers to service overview or service compliance; inspectors to inspection view or people list.

- **From people list:** The user selects a person and goes to person summary or straight to care folder overview.

- **From person summary:** The user can go to care folder overview, emergency summary, or (if they have tasks for that person) to the relevant document or task.

- **From care folder overview:** The user selects a section and goes to the section screen.

- **From section screen:** The user selects a document type and goes to the document screen.

- **From document screen:** The user can go back to the section or folder overview; if they have edit permission, they can open the review completion or upload screen from there (or from a clear “complete review” or “attach file” action).

- **From my tasks:** The user selects a task and is taken to the right person and document (or document screen) to complete it.

- **From service compliance:** The user can open a person’s folder or care folder compliance to see or fix a gap.

- **From inspection view:** The inspector moves in the same way (people list → folder overview → section → document) but never sees edit or delete options; they may have a single “inspection” path that keeps them in read-only screens.

At every stage, the user should be able to go **back** to the previous screen (e.g. from document back to section, from section back to folder overview) and to return to **home** or **people list** without getting stuck. The system should make it clear **where they are** (e.g. “John Smith > Care folder > Risk and Safety > Risk assessment”) so they always know the context.

---

### How inspection mode differs from normal use

- **Normal use:** Staff and managers see edit and delete options (where allowed); they can complete reviews, upload files, and change content. They can use “my tasks”, service compliance, and settings. They may see only their people or their service.

- **Inspection mode:** The inspector (and optionally the manager when “showing what the inspector sees”) sees the **same** people, folders, sections, and documents, but **no** edit, delete, upload, or sign-off options. Navigation is the same (people → folder → section → document), but every screen is read-only. The inspector does not see: my tasks, service settings, review completion, or document upload. The path is focused on: people list → folder overview → sections → documents → emergency summary and audit/history when asked. So inspection mode is a **subset** of screens and a **restriction** of actions, not a different set of information.

---

### How users avoid getting lost

- **Clear context:** Each screen should make it obvious which person, which section, and which document the user is looking at (e.g. breadcrumb or title: “John Smith / Care folder / Risk and Safety / Risk assessment”). So they always know where they are in the hierarchy.

- **Consistent “back” and “home”:** From any screen, the user can go back one step (e.g. from document to section) and can return to home or people list in a small number of steps. They are never trapped in a screen with no way back.

- **Role-appropriate entry:** Home shows only what is relevant to their role (their people, their tasks, or service compliance, or inspection view). They are not shown screens they cannot use or that would confuse them.

- **Inspection path:** For inspectors, the system can offer a single, linear path: people list → folder overview → section → document, with no branches to settings or tasks. That keeps the inspection flow simple and reduces the chance of going to the wrong place.

---

## 8. Summary: Screens at a Glance

| Screen | Purpose in one line | Key roles | Inspection-critical? |
|--------|----------------------|-----------|------------------------|
| Sign-in | Prove identity and set role. | All | No (but required to enter). |
| Home or landing | Role-based starting point. | All | No. |
| Service overview | See the service as a whole. | Managers, compliance | No. |
| People list | Find and select a person. | Staff, managers, inspectors | Yes (inspector sees list). |
| Person summary | Short summary for one person. | Staff, managers, inspectors | Useful. |
| Care folder overview | See the eight sections of the folder. | Staff, managers, inspectors | Yes. |
| Section screen | See document types in one section. | Staff, managers, inspectors | Yes. |
| Document screen | View or edit one document. | Staff, managers, inspectors (view only) | Yes. |
| Emergency summary | Seven emergency-critical items in one place. | All staff, inspectors | Yes. |
| My tasks or reminders | What the user needs to do. | Staff, managers | No. |
| Service compliance | Service-wide compliance picture. | Managers, compliance | Useful. |
| Care folder compliance | One person’s folder status. | Staff, managers, inspectors | Useful. |
| Inspection view | Read-only path through evidence. | Inspectors, managers | Yes (essential). |
| Inspection preparation | Prepare for inspection. | Managers, compliance | No. |
| Audit and history | Who did what, when. | Managers, compliance, inspectors | Yes. |
| Organisation and service settings | Manage org, services, assignments. | Administrators, managers | No. |
| Document upload | Attach files to the folder. | Staff (with permission) | No. |
| Review completion or sign-off | Confirm a review is done. | Responsible staff | No (but underpins evidence). |

---

*This document defines the required screen structure and interactions for the digital CQC readiness system. It should be used before any development to agree what screens exist, who uses them, what they show, and what users can and cannot do.*

*Document version: 1.0 | Plain English only | No UI design details or code.*
