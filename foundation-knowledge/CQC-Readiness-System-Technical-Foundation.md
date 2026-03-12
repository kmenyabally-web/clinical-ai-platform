# Digital CQC Readiness System: Technical Foundation Description

**Plain-English Technical Foundation for Developers and Non-Technical Stakeholders**

*This document describes the technical foundations the system must have: where information lives, what must stay separate, what must never be overwritten, what can be configured, what must be traceable, and what safety guardrails are non-negotiable. It is written for people who need to brief developers or validate that the build respects clinical, legal, and inspection realities. No code, schemas, or technologies are mentioned.*

---

## 1. Core Technical Building Blocks

The system needs a small set of core “building blocks”: distinct places or layers where different kinds of information are held and used. Each block has a clear purpose. Describing them in plain English helps everyone agree what the system is made of before any build starts.

---

### Where Information About the Person and Care Is Stored

**Purpose:** This is the place that holds everything that describes the person and their care: who they are, what they need, what is planned, what was done, what risks they have, and who to contact. It includes the Active Care Folder, its sections, and the actual content of each document (care plan text, risk assessment, daily notes, medication list, and so on).

**In plain terms:** When a key worker writes a care plan or a nurse records a daily note, that content lives here. When an inspector opens a folder, they are reading from here. This block is the “source of truth” for what the service knows and has recorded about the person. It must be organised so that each piece of information belongs to one person, one folder, one section, and one document type, with no duplication that could get out of step.

**Why it matters:** If care information is scattered or mixed with other things (for example, rules or audit logs), the system cannot reliably show “this is John’s care plan” or “this is the current risk assessment”. Inspectors need to see the real, current evidence. This block must therefore be dedicated to care content and structured so that the hierarchy (organisation, service, person, folder, section, document) is always clear.

---

### Where Documents and Files Live

**Purpose:** Some of what goes into the folder is “free-form” content (text, dates, choices from a list). Other items may be files—for example, a scanned form, a PDF from another service, or a photo. The system needs a clear place where these document files are stored, linked to the right person and the right document type, and never lost or overwritten in a way that would break the record.

**In plain terms:** When someone uploads or attaches a file to the folder (for example, a capacity assessment form or a letter from the GP), that file lives here. The system must know which person it belongs to, which section and document type it belongs to, and when it was added and by whom. Files are not “floating”; they are always attached to a specific place in the folder so that inspectors and staff can find them in the same structure as the rest of the evidence.

**Why it matters:** Inspectors often ask to see specific documents (for example, “the DoLS authorisation” or “the last care plan review sign-off”). If files are stored without a clear link to the person and the document type, or if they can be overwritten or replaced without a trace, the service cannot reliably show the right evidence and may lose trust in the record.

---

### Where Rules Are Defined

**Purpose:** The system needs a separate place where the “rules” are defined: what document types exist, which are mandatory or conditional, how often they must be reviewed, what events trigger an update, who is responsible, and what “in date”, “due”, and “overdue” mean. These rules drive status (Green, Amber, Red), reminders, and what the system expects to find in each folder.

**In plain terms:** The rules are not written inside each care plan or each person’s folder. They are held once, in a dedicated place, and the system applies them to every person and every folder. For example, the rule “care plan must be reviewed every 12 months” is stored here; the system then looks at each person’s last care plan review date and works out whether they are in date, due, or overdue. If the rules lived inside the care information, changing a rule would mean changing thousands of records; keeping them separate means the service can maintain one set of rules that apply everywhere.

**Why it matters:** Compliance is consistent only if the same rules apply to everyone. Inspectors expect the service to follow the same review cycles and event triggers. If rules were mixed into care content or different for each person without governance, the system could not reliably show compliance or remind the right people at the right time.

---

### Where Audit and History Are Kept

**Purpose:** The system must keep a separate record of what happened over time: who created or changed something, when, and (where relevant) why or what the change was. This includes changes to care content (for example, “care plan updated on this date by this person”) and sometimes changes to rules or access. This block is the “audit trail” or “history”. It is not the same as the care content itself; it is the log of actions taken on that content.

**In plain terms:** When a care plan is updated, two things exist: (1) the care plan itself (the current text), which lives in the care information block, and (2) a record that “this care plan was updated on this date by this person”, which lives in the audit and history block. Inspectors and managers can then ask “when was this last changed?” and “who changed it?” without altering the care content. History (old versions of a document) may also be kept so that the service can show “this was the care plan last March” if ever needed.

**Why it matters:** Inspectors ask “who reviewed this?” and “when did this change?”. If the system does not keep a separate audit trail, the service cannot prove who did what and when. Mixing audit data into the care content would also make the care record messy and harder to read, and could allow audit records to be altered or lost when care content is updated.

---

### Where User Access and Permissions Are Defined

**Purpose:** The system must hold information about who can see what and who can do what: which roles exist, which people or services each user can access, and what actions they are allowed to perform (for example, view only, edit, or sign off a review). This block is separate from care content, rules, and audit so that access can be changed without touching the evidence and so that access decisions can be audited.

**In plain terms:** When a new staff member joins, someone assigns them a role and (if needed) which people or service they work with. That information lives here. When the system shows a list of people or folders, it uses this block to decide what each user is allowed to see. When an inspector has read-only access, that is defined here. No care content or rules are stored in this block; only “who can do what where”.

**Why it matters:** Inspectors ask “who has access to this information?” and “how do you control it?”. If access rules were mixed into the care record, changing someone’s access could accidentally affect the evidence, and the service could not clearly explain or audit who had access when. Keeping access separate keeps evidence intact and makes it possible to prove that access was controlled properly.

---

### Summary: The Five Blocks

| Block | Purpose in one sentence |
|-------|--------------------------|
| **Care information** | Holds the actual content about the person and their care (folder, sections, documents). |
| **Documents and files** | Holds attached files, linked to the right person and document type, with clear ownership and no silent overwriting. |
| **Rules** | Holds the compliance rules (document types, mandatory/conditional, review frequency, events, responsibility) that the system applies to every folder. |
| **Audit and history** | Holds the record of who did what, when, and (where relevant) why; and old versions where required. |
| **User access and permissions** | Holds who can see and do what, so that access can be managed and audited without touching evidence. |

---

## 2. Separation of Concerns

The system must keep the five blocks **separate**. “Separate” here means: they are stored and managed in distinct ways so that changing one does not corrupt or confuse another, and so that each can be protected and audited for its own purpose. Below is why each must be separate and what goes wrong in inspections if they are mixed.

---

### Care Information Must Be Separate

**Why it must be separate:** Care information is the evidence inspectors look at. It must be possible to show “this is the care plan” and “this is the risk assessment” without that content being mixed up with rules, audit entries, or permission data. If care content and rules were stored together, updating a rule could accidentally change or delete care content. If care content and audit were stored together, the care record would be cluttered with “user X updated this at time Y” lines, and the evidence would be harder to read and to trust.

**What goes wrong in inspections if it is mixed:** Inspectors ask to see “the care plan” or “the risk assessment”. If the answer is “it’s in a mix of content and system messages”, they cannot easily find the evidence. If a rule change overwrote or altered past care content, the service could not show what was actually in place at a given date. Inspectors would question the integrity of the record.

---

### Compliance Rules Must Be Separate

**Why they must be separate:** Rules define what “good” looks like for everyone. They must be maintained once and applied everywhere. If rules were stored inside each person’s folder, the service would have to update every folder when a rule changed, and different people could end up with different rules. If rules were mixed with care content, staff might accidentally edit or delete a rule when they meant to edit a care plan.

**What goes wrong in inspections if they are mixed:** Inspectors expect the same standards for everyone (for example, “care plans reviewed every 12 months”). If rules were per-person or buried in content, the service could not demonstrate that it applies one consistent set of rules. Inspectors might also see “rules” that look like care content and be confused about what is evidence and what is configuration.

---

### Audit and History Must Be Separate

**Why they must be separate:** The audit trail must be a dedicated record of actions. It must not be editable when staff edit care content; otherwise someone could change or delete the record of “who changed what and when”. If audit entries were stored inside the care document, every edit would add more lines to the care plan or risk assessment, and the evidence would become unreadable. Keeping audit separate also makes it possible to retain history for a long time even if the current document is updated.

**What goes wrong in inspections if they are mixed:** Inspectors ask “when was this reviewed?” and “who signed it off?”. If that information is inside the care document and can be edited, the service cannot prove that the history is genuine. If audit is lost when a document is updated, the service has no trace of who did what. Inspectors rely on a clear, tamper-resistant record of changes.

---

### User Access and Permissions Must Be Separate

**Why they must be separate:** Access control decides who sees what. It must be possible to change a user’s role or access without touching any care content, rules, or audit. If permissions were stored inside the care record, changing access could require opening or modifying evidence, which would be wrong and risky. Keeping permissions separate also allows the service to audit “who had access when” independently of the care content.

**What goes wrong in inspections if they are mixed:** Inspectors ask “who can see this information?” and “how do you restrict it?”. If access data is mixed with care content, the service cannot cleanly explain or prove how access is controlled. If changing a user’s permissions could affect the evidence, the integrity of the folder would be at risk.

---

### Summary: Why Separation Matters

- **Care information** is the evidence. It must be easy to find, read, and show to inspectors without being altered by rule changes or cluttered by audit.
- **Rules** must be consistent and maintained once. They must not live inside each folder or be confused with evidence.
- **Audit and history** must be a protected record of who did what and when. They must not be editable when care is edited, and they must not be lost when content is updated.
- **User access** must be manageable and auditable without touching evidence. It must not be stored inside the care record.

When these are mixed, evidence can be corrupted, rules can become inconsistent, audit can be lost or tampered with, and inspectors cannot trust what they see. Separation is a non-negotiable foundation.

---

## 3. Immutability vs Change

The system must be clear about **what must never be overwritten**, **what can change over time**, and **how historical versions are preserved**. This section is in plain English and explains why inspectors care.

---

### What Information Must Never Be Overwritten

**Rule:** Once a piece of evidence has been saved and used as the record of what happened at a point in time, that version must not be overwritten or altered in place. “Overwritten” here means replacing the original content so that the original can no longer be seen or recovered.

**What this applies to in practice:**

- **Care content that has been signed off or used as the official record.** For example, a care plan that was reviewed and signed off on a given date must remain as it was on that date. If the plan is updated later, the new version is added; the old version is not erased.
- **Incident reports, safeguarding records, and complaint records.** What was recorded at the time must stay. Corrections (for example, typo or factual error) may be done in a controlled way (for example, an amendment note with date and who amended), but the original must not be wiped.
- **Audit and history entries.** The record of “who did what, when” must not be editable or deletable by normal users. Once an action is logged, it stays.
- **Files that have been attached to the folder.** The file that was uploaded (for example, a scanned capacity assessment) must not be replaced silently. If a new version is uploaded, the system should keep the old one as history or mark the new one clearly as a replacement with a new date and user.

**Why inspectors care:** Inspectors need to see what was in place at a given time and to trust that the record has not been altered after the fact. If the service could overwrite a care plan or an incident report, there would be no way to verify what was actually there when something happened. Overwriting undermines the integrity of the evidence and can suggest that the service is hiding or changing the past. Regulators and courts expect records that are not silently altered.

---

### What Information Can Change Over Time

**Rule:** The “current” version of a document (for example, the current care plan, the current risk assessment) is allowed to change when staff do a proper update or review. The change is done by creating a new version or updating the current one in a way that is recorded and traceable; the previous version is preserved as history where required.

**What can change in practice:**

- **The current care plan, risk assessment, consent record, and similar “live” documents.** When a review happens or circumstances change, staff update the content. The system records when and who, and keeps the previous version if the design requires it.
- **Contact details (who to contact), medication list, allergies.** These are updated when the person or clinician provides new information. Each update is recorded with date and (where appropriate) who updated.
- **Status and dates.** “Last review date”, “next review date”, and Green/Amber/Red status change when reviews are completed or when time or events trigger a change. These are not “evidence” in the same way as the care plan text; they are derived or updated in line with the rules.
- **Who is responsible.** The assignment of key worker or responsible person for a document type can change when the service reallocates. The change is recorded with date and who made the change.

**Why inspectors care:** Inspectors expect the folder to be **current**. They want to see the latest care plan and risk assessment, not an old one. So the system must allow updates, but in a way that does not destroy history and that leaves a clear trail of when and by whom the current version became current.

---

### How Historical Versions Must Be Preserved

**Rule:** Where the system keeps “one current” version of a document (for example, one current care plan), it must also keep or be able to show previous versions so that the service can answer “what was the plan last year?” or “what was recorded before this update?”. How long history is kept may be a matter of policy or law (for example, retention periods), but the principle is: **history is preserved, not overwritten**.

**In practice:**

- **When a care plan is replaced after a review,** the old version is kept (for example, stored with the date it was current and the date it was replaced). The new version becomes “current”. No one can delete the old version in a way that would make it unrecoverable during the retention period.
- **When an incident or safeguarding record is updated** (for example, outcome added), the original entry remains; the update is added. The record shows a timeline: “concern raised on X; outcome recorded on Y”.
- **Audit and history** are append-only: new entries are added, old entries are not edited or deleted by users. If the system ever “archives” old audit data, that is done in a way that preserves the record for the required period and does not allow tampering.

**Why inspectors care:** Inspectors may ask “what was in place when this incident happened?” or “when did this risk assessment last change?”. If the system has overwritten or deleted the old version, the service cannot answer. Preservation of history supports accountability and allows the service to demonstrate that it did not alter the past.

---

### Summary: Immutability vs Change

| Type of information | Must never be overwritten | Can change over time | How history is preserved |
|---------------------|---------------------------|------------------------|---------------------------|
| Signed-off or official care content | Yes; keep the version that was in force at that time. | Yes; by adding a new version or a recorded update. | Old version kept with dates; new version marked as current. |
| Incidents, safeguarding, complaints | Yes; original record stays. | Yes; outcome or response can be added. | Timeline: original + amendments or additions. |
| Audit and history entries | Yes; do not edit or delete. | No; new entries only. | Append-only; no user deletion. |
| Attached files | Yes; do not replace silently. | Yes; new file can be added as new version. | Old file kept or clearly superseded with new date/user. |
| Current responsibility, contacts, medication | N/A (these are “current state”). | Yes; with date and who updated. | Changes logged in audit; previous values may be in history if needed. |

---

## 4. Configuration vs Fixed Rules

Not every rule can or should be changed by the organisation. Some rules are **fixed** (non-negotiable) because they come from regulation, the CQC blueprint, or the need for consistent inspection readiness. Others are **configurable** so that the organisation can adapt to local policy or preference without breaking compliance. Below is the distinction in plain English with examples.

---

### Fixed and Non-Negotiable Rules

**Definition:** These are rules that the system must always enforce. The organisation cannot turn them off or change them in a way that would contradict the blueprint, the compliance ruleset, or legal expectations. They are part of the definition of a “CQC readiness” system.

**Examples:**

- **One care folder per person per service.** The system must not allow two active folders for the same person in the same service. This is a structural rule from the blueprint and the structural model.
- **One current version of key documents.** For document types that are “single current” (e.g. care plan, risk assessment), there must be only one current instance. The system must not allow two “current” care plans for the same person.
- **Mandatory documents must exist when required.** If the rules say a document is mandatory for all people (e.g. consent, risk assessment, care plan), the system must expect it and show it as missing until it exists. The organisation cannot make a mandatory document “optional”.
- **Overdue means overdue.** When the “next review” date has passed and no review has been recorded, the document must show as overdue (Red). The system must not allow the organisation to hide or remove “overdue” status without a recorded review.
- **Event-triggered updates must be reflected.** When an incident or safeguarding concern is recorded, the system must put the relevant documents (e.g. risk assessment, investigation) into “action required” until the update is done. The organisation cannot disable this and claim to be “CQC ready”.
- **Critical evidence must not be deletable.** The organisation cannot allow users to delete incident reports, safeguarding records, or signed-off care content in a way that would destroy evidence. The system must enforce this (e.g. no delete, or only archive with audit).
- **Audit trail must not be editable by users.** The record of who did what and when must be protected. The organisation cannot give users the ability to edit or delete audit entries.

**Why they are fixed:** These rules protect the integrity of the evidence and the consistency of compliance. If organisations could turn them off, the system would no longer reliably support inspection readiness or legal accountability. Inspectors and regulators assume these behaviours.

---

### Configurable Rules (Organisation Can Set or Adjust)

**Definition:** These are rules where the organisation is allowed to choose a value or an option within boundaries that still respect the compliance ruleset. The system provides sensible defaults but allows configuration so that the service can match local policy (e.g. review frequency, “due soon” window, roles).

**Examples:**

- **Review frequency within limits.** The compliance rules say “care plan at least every 12 months”. The organisation may be allowed to set “every 6 months” or “every 12 months” but not “every 24 months”. So the rule “care plans must be reviewed” is fixed; the exact interval may be configurable within a maximum.
- **“Due soon” window.** The system may define “due for review” as “within X weeks of the next review date”. The organisation may be allowed to set X (e.g. 4, 6, or 8 weeks) so that reminders and Amber status match how the service plans its workload.
- **Who is the “responsible role” for a document type.** The blueprint says “key worker” or “nurse” for certain documents. The organisation may be allowed to map these to their own job titles or roles (e.g. “care co-ordinator” instead of “key worker”) so that reminders and accountability match the service structure.
- **Which document types are in use.** The blueprint and compliance rules define a standard list. The organisation may be allowed to add a small number of local document types (e.g. a local checklist) as long as mandatory types are not removed and the structure (sections) is preserved. Adding optional types is configurable; removing or renaming mandatory types is not.
- **Retention period for history.** How long to keep old versions of documents or audit entries may be set by the organisation within legal minimums (e.g. at least 7 years for certain records). The system may allow the organisation to choose a retention period within those bounds.
- **Service or organisation name and structure.** The organisation enters its own name, service names, and (where applicable) wards or teams. The hierarchy (organisation → service → person → folder) is fixed; the labels and number of services are configurable.

**Why they are configurable:** Services differ in size, policy, and role names. Allowing limited configuration lets the system fit the real world without breaking the fixed rules that inspectors and regulators rely on.

---

### Summary: Fixed vs Configurable

| Area | Fixed (non-negotiable) | Configurable (organisation can set) |
|------|-------------------------|--------------------------------------|
| Structure | One folder per person per service; one current version for key documents; eight sections; mandatory document types must exist. | Names of organisation, services, roles; optional extra document types within limits. |
| Compliance status | Overdue when date passed; event-driven “action required” when incident/safeguarding occurs; mandatory documents shown as missing until present. | “Due soon” window; exact review interval within max (e.g. 6 or 12 months); mapping of roles to job titles. |
| Evidence and audit | No deletion of critical evidence; audit trail not editable by users; previous versions preserved when current is updated. | Retention period within legal minimums; how long to keep old versions. |
| Safety | No silent overwriting; human sign-off where required; clear ownership. | Who holds which role; workflow details that do not bypass sign-off. |

---

## 5. Accountability and Audit Expectations

The system must support **traceability**: the service must be able to show who created something, who reviewed it, when it changed, and (where relevant) why. This section describes what must be traceable and how inspectors test it.

---

### What Must Always Be Traceable

**Who created something:** For each important piece of content (e.g. care plan, risk assessment, incident report), the system must record who created it. “Who” means a person or a role that can be identified (e.g. “Jane Smith” or “key worker”). This is stored in the audit and history block, not only in the document itself, so that it cannot be altered when the document is edited.

**Who reviewed it:** When a document is formally reviewed (e.g. care plan review, risk assessment review), the system must record who performed the review and when. “Reviewed” may include a sign-off (e.g. signature or equivalent). Inspectors ask “who reviewed this?” and expect to see a name and a date.

**When it changed:** For each significant change (create, update, review, sign-off), the system must record the date and time. So the service can answer “when was this last updated?” and “when was this last reviewed?”. Dates must not be editable by normal users once recorded.

**Why it changed (where relevant):** For some changes, the system may record a reason or a note (e.g. “review following incident on [date]” or “annual review”). This is especially important for event-driven updates (after incident, safeguarding, or change in risk). Not every small edit needs a reason, but significant updates (new care plan, risk assessment update after incident) should be traceable to an event or a review.

**What changed (where feasible):** For critical documents, the system may keep the previous version when an update is made, so that the service can show “this was the content before” and “this is the content after”. That supports “what changed” as well as “when” and “who”.

---

### How Inspectors Test This

**Asking to see the record:** Inspectors look at the care plan, risk assessment, or incident report and ask “when was this last reviewed?” and “who reviewed it?”. They expect to see a date and a name (or role) on the document or in a place that is clearly part of the record (e.g. review history or sign-off section). If the system does not record or display this, the service cannot answer.

**Checking dates against events:** Inspectors may check that after an incident, the risk assessment was updated soon after. They look at the “last updated” or “last reviewed” date on the risk assessment and compare it to the incident date. If the risk assessment was not updated, or the date is not visible, they will question whether the service responded properly.

**Asking for an audit trail:** Inspectors may ask “can you show us who changed this and when?”. The service should be able to show a list or log of changes (from the audit and history block) without that log being editable. If the system does not keep such a log, or if users can alter it, the service cannot demonstrate accountability.

**Checking sign-off:** For care plan reviews and other formal reviews, inspectors expect to see that a responsible person (e.g. key worker, manager) has signed off. The system must record who signed off and when, and that record must not be deletable or editable by the person who signed off.

---

### Summary: Traceability

| What | Must be traceable | How inspectors test |
|------|--------------------|----------------------|
| Creator | Who created the document or record. | “Who wrote this?” – name or role and date visible. |
| Reviewer | Who reviewed or signed off, and when. | “Who reviewed this?” – sign-off or review record with name and date. |
| When | Date (and ideally time) of create, update, review. | “When was this last updated?” – date visible and consistent with events. |
| Why (where relevant) | Reason or trigger (e.g. “after incident”, “annual review”). | Check that updates after incidents exist and dates align. |
| What (where feasible) | Previous version kept so “before” and “after” can be shown. | “What was in place when…?” – old version available if required. |

---

## 6. Safety and Guardrails

The technical system must enforce certain **safety guardrails** that are non-negotiable. These protect people using the service, protect the integrity of evidence, and ensure that the system supports rather than undermines accountability. They are described in plain English below.

---

### No Deletion of Critical Evidence

**Rule:** The system must not allow users to delete (or permanently remove) certain types of evidence in a way that would make it unrecoverable. What counts as “critical” should align with the compliance rules and legal expectations: incident reports, safeguarding records, complaint records, signed-off care plans and risk assessments (at least in the form of history), and audit entries.

**In practice:** “Delete” may be disabled for these types, or the system may only allow “archive” or “mark as superseded” so that the content is no longer current but remains stored and auditable. If a genuine correction is needed (e.g. factual error), the process should require a clear amendment with date and who amended, not silent deletion. The organisation cannot be given a switch to “allow deletion of incidents” or “allow deletion of audit”.

**Why it is non-negotiable:** Deleting critical evidence undermines accountability and can hide harm or failure. Inspectors and regulators expect the service to retain and produce records. The system must make it impossible (or highly controlled and audited) to destroy evidence.

---

### No Silent Changes

**Rule:** The system must not allow content or status to change in a way that is invisible to the people who are responsible or to the audit trail. “Silent” here means: no automatic overwriting of care content without a recorded action, no automatic clearing of “overdue” without a recorded review, and no change to who is responsible or to permissions without a recorded action and (where appropriate) human approval.

**In practice:** When the current care plan is updated, the system records who did it and when. When a review is completed and status moves from Red to Green, the system records that a review was done (date and who). When someone’s access is changed, that change is logged. There is no “background” process that changes evidence or status without a trace. If the system ever “corrects” data (e.g. bulk update), that must be logged as a system action with a reason and ideally restricted to administrators with audit.

**Why it is non-negotiable:** Silent changes make it impossible to trust the record. Inspectors need to see that changes are deliberate and traceable. If the system could silently change or clear evidence, accountability would be lost.

---

### Clear Ownership

**Rule:** Every document type and every folder must have a defined responsible role (and, where the system supports it, an assigned person). The system must not allow a situation where “no one” is responsible. Reminders and escalation must go to the right place; inspectors must be able to ask “who is responsible for this?” and get a clear answer.

**In practice:** When a person is added to the service, their folder is linked to a key worker or responsible person (or the default “key worker” role until someone is assigned). When a document type is “action required”, the system knows who to remind. The manager can see who is responsible for each person or document. The system does not allow a folder or a document type to have a blank “responsible” field where the rules say someone must be responsible.

**Why it is non-negotiable:** Without clear ownership, reminders go nowhere and no one is accountable. Inspectors expect the service to be able to name who is responsible for care plans and reviews. The system must enforce that ownership is always set and visible.

---

### Human Sign-Off Points

**Rule:** Certain actions must require a deliberate human step (sign-off) before the system treats them as done. The system must not mark a care plan as “reviewed” or an incident as “investigation complete” without a recorded action by a user (and where required, by a specific role such as manager or key worker).

**In practice:** When a key worker completes a care plan review, they must confirm or sign off (e.g. tick a box, press a button, or enter a signature) so that the system can record “review completed on this date by this person”. The system does not auto-complete reviews when the date is reached or when someone opens the document. When an incident investigation is finished, a manager or designated person must record that it is complete. The system may remind, but it does not mark “complete” without a human action.

**Why it is non-negotiable:** Sign-off is the point at which the professional takes responsibility. Inspectors look for evidence that a human reviewed and approved. If the system could mark things complete without a human step, the record would not reflect real accountability and could mislead inspectors.

---

### Summary: Safety Guardrails

| Guardrail | What the system must do | Why it is non-negotiable |
|-----------|--------------------------|---------------------------|
| **No deletion of critical evidence** | Prevent permanent deletion (or allow only controlled archive/amend with audit) for incidents, safeguarding, complaints, signed-off content, audit. | Protects accountability and legal/compliance requirements. |
| **No silent changes** | Every change to content or status must be traceable to a user or a logged system action with reason. | Ensures the record is trustworthy and auditable. |
| **Clear ownership** | Every folder and document type has a responsible role/person; no “blank” ownership where rules require it. | Ensures reminders and accountability work; inspectors can ask “who?”. |
| **Human sign-off points** | Reviews and key completions (e.g. investigation complete) require a recorded human action, not automatic completion. | Ensures the record reflects real professional responsibility. |

---

## 7. Summary: Technical Foundation at a Glance

| Topic | In one sentence |
|-------|------------------|
| **Core building blocks** | Five blocks: care information (content); documents and files (attachments); rules (compliance definitions); audit and history (who did what, when); user access and permissions (who can see/do what). Each has a clear purpose. |
| **Separation** | Care, rules, audit, and permissions must be stored and managed separately. Mixing them risks corrupting evidence, inconsistent rules, lost or tampered audit, and unclear access control. |
| **Immutability vs change** | Evidence and audit must not be overwritten; current documents can change with a recorded update and history preserved. Inspectors need to see what was in place when and to trust that the past was not altered. |
| **Configuration vs fixed** | Fixed: one folder per person, one current version, mandatory documents, overdue = Red, event-triggered action required, no deletion of critical evidence, audit not editable. Configurable: review interval within max, “due soon” window, role names, retention, optional document types within limits. |
| **Accountability and audit** | Creator, reviewer, date (and where relevant reason and previous version) must be traceable. Inspectors test by asking “who/when”, checking dates against events, and asking for an audit trail. |
| **Safety guardrails** | No deletion of critical evidence; no silent changes; clear ownership; human sign-off for reviews and key completions. |

---

*This document is the technical foundation description for the digital CQC readiness system. It should be used to brief developers and to validate that the technical build respects clinical, legal, and inspection realities. It does not specify technologies, code, or schemas.*

*Document version: 1.0 | Plain English only | No code or technical jargon.*
