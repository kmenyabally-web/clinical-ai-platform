# Minimum Viable Live System (MVLS): Digital CQC Readiness Platform

**Definition of the Smallest Safe Version for Real Care Environments**

*This document defines the minimum set of features and boundaries that must be in place before the system is used in live regulated care settings. It is not a product roadmap or a technical build guide. It states what must exist, what must not exist, how the system is used day to day, who can use it, and what is required before adding AI or expanding automation. Plain English only.*

---

## 1. Definition of the MVLS

### What the MVLS Is

The **Minimum Viable Live System (MVLS)** is the smallest version of the digital CQC readiness platform that is **safe and appropriate to use in real care environments** where people receive care and where CQC may inspect. It is “minimum” because it includes only the features that are **essential** for the system to do its job: hold and organise the Active Care Folder, show compliance status from the rules and the data, support staff to record and review care, and allow inspectors to see evidence. It is “viable” because with these features the service can run the system day to day and can demonstrate to inspectors that care is documented and governed in line with the blueprint and compliance rules. It is “live” because it is used for real people and real services, not only for testing or pilot.

The MVLS has **no AI-assisted features**. All classification (where to put a document), all gap awareness (what is missing or overdue), and all decisions are made **by staff** using the system. The system applies the compliance rules and shows status; humans decide and act. The MVLS is the same as **Phase 1** in the Controlled Technical Integration Plan: the manual digital system that must be in place and proven before any AI is introduced.

---

### What Problem It Solves Immediately

- **One place for the care folder.** The service has a single, structured place to hold each person’s care folder (eight sections, document types from the blueprint) so that evidence is not scattered across paper and multiple systems. Staff and inspectors can find the same structure every time.
- **Visible compliance status.** The service can see what is in date, due, or overdue (and Green, Amber, or Red if used) because the system applies the compliance rules to the data (dates, presence of documents). Managers and staff know what needs attention without guessing.
- **Reminders and accountability.** The system can show staff and managers what is due for review and who is responsible, so that reviews are not forgotten and someone is accountable. The system does not decide; it reminds.
- **Inspection-ready evidence.** When CQC inspects, the service can show the folder in the structure inspectors expect, with key documents (care plan, risk assessment, daily notes, medication, consent, incidents, review dates) findable and with emergency-critical information in one place. The service can explain that the system supports human record-keeping and does not make decisions.

So the MVLS solves the immediate problems of **structure**, **visibility**, **reminders**, and **inspection readiness** without introducing AI or automation that could create new risks or blur accountability.

---

### Why It Is Safe to Use in Live Care Settings

- **Humans are in control.** Every piece of content is entered or chosen by a person. Every document is placed in a section and document type by a person. Every review is completed and signed off by a person. The system does not file, approve, or decide. So the service can always say “a member of staff did this” and can show who and when in the audit trail. That is safe for the person receiving care and for the service’s accountability.
- **No hidden logic.** Compliance status (in date, due, overdue) is calculated from the **defined rules** and the **data** (review dates, presence of documents). There is no AI or algorithm that “decides” compliance in a way the organisation cannot explain. The rules are in the compliance ruleset; the organisation can show inspectors how status is worked out. Transparency supports safety.
- **No automation of decisions.** The MVLS does not auto-file documents, auto-mark reviews as complete, or auto-close gaps. Staff must take a deliberate step (choose section and type, complete review, add document) before anything is saved or updated. So the risk of the system doing something wrong without a human check is avoided.
- **Bounded scope.** The MVLS does only what it is designed to do: hold the folder, apply the rules, show status, and support reminders and inspection view. It does not diagnose, treat, or make clinical judgements. It does not replace the need for professional judgement; it supports record-keeping and governance. That keeps the system’s role clear and safe.

---

## 2. Essential Features (Must Exist)

The following features **must** exist in the MVLS. Without them, the system is not viable or safe for live use in regulated care. Each feature is described and linked to inspection readiness.

---

### Active Care Folder (Per Person)

**What it is:** For each person using the service, the system holds one care folder organised into the eight sections from the blueprint: Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality. Each section contains the document types defined in the compliance rules. The folder is the single place where the service’s evidence about that person is stored and found.

**Why it is essential:** Without a structured folder, evidence is scattered and inspectors cannot find what they need. The blueprint and CQC expectations assume one folder per person with a clear structure. The Active Care Folder is the core of the system.

**How it supports inspection readiness:** Inspectors look at the folder by section and document type. The MVLS gives them the same structure they expect and makes it clear where the care plan, risk assessment, daily notes, medication, consent, and other evidence live.

---

### Document Upload and Viewing

**What it is:** Staff can **add** documents (files such as PDFs, scans, or images) to the folder and **choose** which section and which document type each one belongs to. They do this by selecting from the list (no AI suggestion in the MVLS). Staff can **view** documents that are already in the folder so they can read care plans, risk assessments, consent forms, and other evidence. Viewing includes opening the content and, where the system supports it, seeing when it was added and who added it.

**Why it is essential:** Care evidence often exists as documents (scanned forms, letters, photos). The service must be able to store them in the right place and retrieve them. Without upload and viewing, the folder would be empty or incomplete and the service could not show inspectors the actual evidence.

**How it supports inspection readiness:** Inspectors ask to see specific documents (e.g. “the care plan,” “the DoLS authorisation”). Upload and viewing allow the service to store and show them in the correct section with a clear record of who added them and when.

---

### Manual Compliance Status Tracking

**What it is:** The system **calculates** compliance status from the compliance rules and the data in the folder: for each document type that applies to the person, it shows whether the document is present or missing, and whether it is in date, due for review, or overdue (based on last review date and next review date). It may show Green, Amber, or Red as defined in the behavioural specification. The **rules** (review frequency, mandatory vs conditional, event-triggered) are fixed and applied consistently. No AI or algorithm decides status; the system only applies the rules to the data. Staff and managers **see** the status and **act** (complete a review, add a document); they do not “set” status themselves except by doing the action (e.g. completing a review updates the date and the system recalculates).

**Why it is essential:** The service needs to know what is on track and what needs action. Without status tracking, the service would not know what is overdue or missing until an inspector finds it. Manual here means “human acts; system calculates from rules and data.” It does not mean staff type in “in date” or “overdue”; it means the system works it out from the rules and the dates staff have recorded.

**How it supports inspection readiness:** Inspectors check dates and completeness. The MVLS gives the service the same picture (what is in date, due, overdue) so that the service can fix gaps before inspection and can explain to inspectors how status is determined (rules + data, no hidden logic).

---

### Reminders and Task List

**What it is:** The system can **show** staff and managers what needs to be done: for example, “care plan review due for [person],” “risk assessment overdue for [person].” The list is generated from the compliance rules and the data (what is due or overdue, who is responsible). Staff use it to prioritise and to complete reviews and updates. The system does not **complete** the review or **close** the task by itself; the staff member does the work and records it (e.g. completes the review), and then the system updates status and the task list.

**Why it is essential:** Without reminders, due dates can be missed. The task list makes “what is due” visible so that staff and managers can act in time. It supports the service to stay on top of reviews and to avoid the common inspection finding of “overdue care plan” or “overdue risk assessment.”

**How it supports inspection readiness:** Inspectors expect the service to know what is due and to have a way to act on it. The MVLS gives the service a clear list and links each task to the person and the document, so the service can show that it monitors and acts on due dates.

---

### Emergency Summary (or Emergency View)

**What it is:** One place in the system where the **seven emergency-critical items** for a person are shown together: allergies and adverse reactions; current medication list; key risks and safety plan summary; who to contact; communication passport or key communication needs; personal emergency evacuation plan (PEEP); resuscitation or DNAR status. The information is drawn from the folder (the folder is the source of truth). Staff can open this view quickly so that in an emergency (e.g. collapse, fire, missing person) they have the most important information in one place without searching through sections.

**Why it is essential:** In an emergency, staff need the right information immediately. The blueprint and compliance rules say these seven items must be immediately accessible. The emergency summary makes that possible and supports safe, fast response.

**How it supports inspection readiness:** Inspectors may ask “how do staff find allergies and evacuation plans in an emergency?” The MVLS provides a dedicated emergency view and the service can show that it exists and is used.

---

### Inspection Mode (Read-Only)

**What it is:** A way to show the care folder (and, where relevant, the people list and service-level compliance) in a **read-only** form. The same content as staff see is available, but the user cannot edit, delete, or add anything. Inspection mode is used when the service wants to show evidence to an inspector (or to someone acting in an inspection role) without any risk that the viewer could change the record. The structure matches what inspectors expect (sections, document types, key documents easy to find).

**Why it is essential:** Inspectors need to see evidence without being able to alter it. Inspection mode gives the service a safe way to hand over access: the inspector sees the real folder and status, and the system prevents any edit or delete. That protects the record and supports a fair, transparent inspection.

**How it supports inspection readiness:** The service can say “we will show you the folder in inspection mode so you can see everything and we can be sure nothing is changed.” Inspectors see the same structure and content they would see in a well-kept paper or digital folder, in a controlled, read-only way.

---

### Audit Trail (Who Did What, When)

**What it is:** The system **records** who created or updated important content and when. For example, when a care plan is updated or a review is completed, the system records who did it and the date (and, where applicable, time). This record is kept separately from the care content and is not editable by normal users. Staff and managers can use it to answer “who reviewed this?” or “when did this change?” Inspectors can ask the same questions and the service can show the audit trail.

**Why it is essential:** Accountability depends on being able to show who did what and when. Without an audit trail, the service could not prove that a human completed a review or added a document, and could not answer inspectors’ questions about responsibility.

**How it supports inspection readiness:** Inspectors ask “who reviewed this care plan?” and “when was this risk assessment last updated?” The audit trail provides the evidence. It also shows that the system is used for real record-keeping and that changes are traceable.

---

### Service-Level Compliance View (for Managers)

**What it is:** A view for managers (and, if defined, compliance leads) that shows **compliance across the service**: how many people have folders that are complete and current, how many have items due or overdue, and which document types are most often missing or overdue. It may list people with Red or Amber folders so managers can prioritise. The view is built from the same rules and data as the per-person folder; it is an aggregation, not a different source of truth.

**Why it is essential:** Managers need to see the whole service, not only one person. Without a service-level view, they could not know how many people have gaps or what to focus on. The view supports governance and preparation for inspection.

**How it supports inspection readiness:** Inspectors ask “how many people have an overdue care plan review?” and “when did you last audit?” The service-level view gives managers the numbers and lists they need to answer and to demonstrate that they oversee compliance.

---

### Review Completion and Sign-Off

**What it is:** When a staff member completes a **review** (e.g. care plan review, risk assessment review), the system has a clear step where they **confirm** that the review is done and **record** the date (and, where the system supports it, their name or role). That step is the “review completion” or “sign-off.” The system then updates the “last review date” and “next review date” for that document and recalculates status (e.g. from overdue to in date). The system does **not** mark a review as complete without this human step; there is no automatic “review done” when a date is reached.

**Why it is essential:** Reviews must be done by a person and the record must show who and when. The sign-off step is the point at which the professional takes responsibility. Without it, the service could not demonstrate to inspectors that a human reviewed the plan or assessment.

**How it supports inspection readiness:** Inspectors look for review dates and sign-off. The MVLS ensures that “review completed” is always the result of a recorded human action, so the service can show who reviewed and when.

---

### Summary: Essential Features

| Feature | Why essential | Inspection readiness |
|---------|----------------|------------------------|
| **Active Care Folder** | Single, structured place for evidence per person. | Same structure and sections inspectors expect. |
| **Document upload and viewing** | Store and retrieve documents in the right place. | Show inspectors the actual documents. |
| **Manual compliance status tracking** | Know what is in date, due, overdue (rules + data). | Same picture as inspectors; fix gaps first. |
| **Reminders and task list** | See what is due and who is responsible. | Show that the service monitors and acts. |
| **Emergency summary** | Seven critical items in one place for emergencies. | Show that emergency info is accessible. |
| **Inspection mode (read-only)** | Show evidence without risk of change. | Safe, transparent handover to inspectors. |
| **Audit trail** | Who did what, when. | Prove accountability and answer “who reviewed?” |
| **Service-level compliance view** | Managers see whole service. | Answer “how many overdue?” and show governance. |
| **Review completion and sign-off** | Human confirms review; system records and updates. | Show that reviews are done by people and dated. |

---

## 3. Explicit Exclusions (Must NOT Exist)

The following **must not** exist in the MVLS. Including them would increase risk or blur accountability and would take the system beyond the minimum viable safe version.

---

### Automated Decisions

**What is excluded:** The system must **not** automatically decide where to file a document, whether a review is complete, whether the service or a person is compliant, or whether a gap is “closed.” Every decision that affects the record or the status must be the result of a **human action** (e.g. staff choose section and type, staff complete review and sign off). The system may **calculate** status from rules and data (e.g. “overdue because last review was more than 12 months ago”), but it must not **decide** in place of the human (e.g. “we will mark this as in date because we think it’s okay”).

**Why excluding this increases safety:** If the system could make decisions on its own, the service could not say “a person decided this.” Inspectors expect human accountability. Automated decisions also create the risk of wrong or unexpected outcomes (e.g. wrong section, wrong status) with no one having checked. Keeping decisions human keeps accountability clear and allows the service to correct errors by changing the human action, not by debugging an automated rule.

---

### AI-Generated Compliance Judgements

**What is excluded:** The MVLS must **not** use AI (or any other system that “thinks” beyond applying fixed rules) to judge whether the service or a person’s folder is compliant, to suggest that something is “high risk” or “low risk” in a compliance sense, or to write explanations of why something is due or overdue. Compliance status in the MVLS comes only from the **compliance rules** and the **data** (dates, presence of documents). No AI interprets, suggests, or explains. If the organisation later adds AI gap detection (in a later phase), that is **outside** the MVLS and is subject to the integration plan and AI governance policy.

**Why excluding this increases safety:** AI compliance judgements could be wrong or could be read by staff or inspectors as the “answer” rather than as a suggestion. That could lead to over-reliance or to the service claiming “the AI said we’re compliant.” In the MVLS, the service relies only on rules and data, which are transparent and auditable. Excluding AI from compliance judgement keeps the MVLS simple and safe.

---

### Automated Alerts Without Human Review

**What is excluded:** The system must **not** send alerts or notifications to people **outside** the service (e.g. regulators, families, other organisations) without a **human** deciding to send them. For example, the system must not automatically email CQC when something is overdue or when a gap is detected. Alerts **inside** the system (e.g. reminders to staff and managers about what is due) are allowed and are part of the MVLS. The exclusion is about **external** or **escalation** alerts that could have serious consequences and must therefore be decided by a person.

**Why excluding this increases safety:** Automatic escalation could send wrong or misleading information (e.g. a false “serious gap” or a misconfigured alert) to a regulator or family and could damage trust or trigger unnecessary concern. Human review before any external alert gives the service control and the chance to correct or contextualise. In the MVLS, the service keeps full control over what is communicated outside the system.

---

### Auto-Filing or Auto-Save Based on System Guess

**What is excluded:** The system must **not** save a document to the folder in a section or document type that was **chosen by the system** (e.g. a guess or a default) without the staff member **explicitly confirming** that choice. Every document must be placed in a section and type after a **deliberate** staff action (select and confirm, or select and save). There is no “if the user doesn’t choose in 30 seconds, use the default” or “pre-fill and save when user uploads.”

**Why excluding this increases safety:** Auto-filing could put documents in the wrong place, and the service might not notice until an inspector looks. Wrong placement can mean wrong evidence in the wrong section and can suggest poor governance. Requiring explicit staff choice ensures that a person is responsible for every filing decision and that the audit trail shows who chose what.

---

### AI Document Classification or AI Gap Detection

**What is excluded:** The MVLS has **no** AI-assisted document classification and **no** AI-assisted compliance gap detection. Staff choose section and document type themselves. Managers and staff see only the rule-based status and task list, not an AI-generated list of “potential gaps” or AI-written explanations. These features may be added in a later phase under the Controlled Technical Integration Plan, but they are **not** part of the MVLS.

**Why excluding this increases safety:** The MVLS is the **minimum** safe version. AI adds complexity and requires additional governance (prompts, human confirmation, training). Proving the manual system first (MVLS) gives the organisation a stable base and a clear “before AI” baseline. Adding AI only after the MVLS is in use and exit criteria are met keeps risk contained and keeps the story for inspectors simple: “in our minimum system, humans do everything; we have since added AI in a controlled way.”

---

### Summary: Explicit Exclusions

| Excluded | Why it increases safety to exclude |
|----------|-------------------------------------|
| **Automated decisions** | Humans must decide; accountability and ability to correct. |
| **AI compliance judgements** | No over-reliance; status from rules and data only; transparent. |
| **Automated external alerts** | No wrong escalation; human decides what goes outside. |
| **Auto-filing / auto-save on guess** | Every filing is a human choice; no wrong placement by default. |
| **AI classification or gap detection** | MVLS = manual only; AI added later under governance. |

---

## 4. Operational Boundaries

### What the System Is Used For Day to Day

- **Holding the care folder** for each person: sections, document types, and the content (text, dates, and attached files) that staff enter or upload.
- **Showing compliance status** (in date, due, overdue; Green, Amber, Red) so that staff and managers know what is on track and what needs action.
- **Showing reminders and tasks** so that the right person can complete reviews and updates on time.
- **Providing the emergency summary** so that staff can quickly see the seven critical items when needed.
- **Recording who did what and when** (audit trail) so that the service can show accountability and answer “who reviewed?” and “when did this change?”
- **Giving managers a service-level view** so that they can oversee compliance and prepare for inspection.
- **Allowing inspection mode** so that the service can show the folder and status to inspectors in a read-only way.

So day to day, the system is used for **record-keeping**, **status**, **reminders**, **emergency access**, **audit**, **governance view**, and **inspection presentation**. It supports staff and managers to do their job; it does not do the job for them.

---

### What It Is NOT Relied Upon For

- **Clinical decisions.** The system is not used to decide what care a person needs, what risks they have, or what treatment to give. Those decisions are made by clinicians and care staff using their judgement and other systems (e.g. clinical records) as needed. The MVLS holds the **result** of those decisions (e.g. the care plan, the risk assessment) but does not make them.
- **Legal or capacity decisions.** The system does not assess capacity or make best interests decisions. It holds records of such assessments and decisions (e.g. capacity assessment form, DoLS authorisation) but does not create or approve them.
- **Communication with regulators or families.** The system is not used to send reports or alerts to CQC, families, or others. Any such communication is decided and sent by staff or managers outside the system (or through a separate process that requires human approval).
- **Replacing professional judgement.** The system does not tell staff what to write in a care plan or risk assessment. It provides structure and reminders; staff write the content and are responsible for it.

---

### What Processes Remain Manual

- **Choosing where to put a document.** Staff select the section and document type from the list when they add a document. There is no AI suggestion; the choice is entirely manual.
- **Deciding what is a gap.** Staff and managers look at the status and task list and decide what to do. There is no AI list of “potential gaps”; they use the rule-based status and their own judgement.
- **Completing reviews.** Staff complete the review (read the plan, update it, involve the person where appropriate) and then use the system to record that the review is done (sign-off). The system records the date and updates status; it does not complete the review by itself.
- **Prioritising.** Managers decide what to focus on (which person, which document type) using the service-level view and their knowledge of the service. The system does not prioritise for them.
- **Explaining to inspectors.** Staff and managers explain to inspectors what the system does, how status is worked out, and who is responsible. That explanation is always given by a person, not by the system.

---

## 5. User Roles and Access

### Which Roles Can Use the MVLS

- **Frontline staff** (support workers, care workers): Can view and update the care folder for the people they are assigned to or the people in their ward or team. They can add documents (and choose section and type), enter or update care content (e.g. daily notes, activity records), and complete reviews and sign-offs for which they are responsible. They can view the emergency summary and their own task list. They **cannot** see other people’s folders unless assigned, **cannot** change service-level settings, and **cannot** use inspection mode (that is for showing inspectors).
- **Key workers and care co-ordinators:** Same as frontline staff for their people, plus they are typically the **responsible** role for care plan and risk assessment reviews. They can see compliance status for their people and may see a list of their people with Red or Amber status. They **cannot** see the full service-level compliance view unless they also have a manager role, and **cannot** edit other people’s folders unless assigned.
- **Nurses and clinicians:** Can view and update the care folder for the people they support. They can add and update clinical or treatment-related content (e.g. medication, treatment records, physical health, consent, capacity-related records) and complete reviews for which they are responsible. They can view the emergency summary. They **cannot** approve or sign off on behalf of others unless that is part of their defined role, and **cannot** change service-level settings.
- **Managers:** Can view the care folder for all people in their service (or services). They can view the **service-level compliance view** (how many Green, Amber, Red; what is overdue; list of people with gaps). They can view the audit trail for their service. They may be able to assign or change who is responsible for a person or a document type (within the system’s design). They can use **inspection mode** to show the folder and status to an inspector. They **cannot** edit care content in place of the responsible staff (e.g. they do not usually write the care plan instead of the key worker), and **cannot** delete critical evidence (incidents, safeguarding, complaints, audit).
- **Compliance leads and quality leads:** Can view service-level and, if defined, organisation-level compliance. They can view audit trails and support managers to prepare for inspection. They may have read-only access to multiple services. They **cannot** edit care content or delete evidence; their role is oversight and support.
- **Inspectors (read-only):** When the service gives an inspector access (e.g. via inspection mode), the inspector can **view** the folder, sections, documents, status, and emergency summary. They **cannot** edit, add, or delete anything. Their access is read-only by design.

### What Each Role Can and Cannot Do (Summary)

| Role | Can do | Cannot do |
|------|--------|-----------|
| **Frontline / key worker / nurse** | View and update folder for their people; add documents (choose section/type); complete reviews; view emergency summary and own tasks. | See other people’s folders (unless assigned); change service settings; use inspection mode to edit; delete critical evidence. |
| **Manager** | View all people in service; service-level compliance view; audit trail; assign responsibility; use inspection mode (read-only for inspector). | Edit care content instead of responsible staff; delete critical evidence. |
| **Compliance lead** | View compliance and audit across service(s); support preparation. | Edit care content; delete evidence. |
| **Inspector** | View folder, status, emergency summary (read-only). | Edit, add, or delete anything. |

### Who Is Accountable for Oversight

- **Service level:** The **registered manager** (or equivalent) of the service is accountable for the service’s use of the system. They ensure that staff are trained, that the folder and compliance are overseen, and that the system is used in line with policy. They are the person who can explain to inspectors how the system works and how the service stays compliant.
- **Organisation level:** Where the organisation runs multiple services, a **compliance lead**, **quality lead**, or **senior manager** is accountable for the overall governance of the system: that the MVLS is used as designed, that exclusions are respected, and that the organisation is ready to add AI or expand only when exit criteria are met. They are accountable for the integration plan and for decisions to move to a new phase.

---

## 6. Inspection-Safe Explanation

The following explanation may be **given to a CQC inspector** to describe what the MVLS does and does not do, and to emphasise safety, transparency, and human control.

---

**What We Use: Minimum Viable Live System (MVLS)**

We use a digital system to hold our care folders and to help us stay on top of compliance. We call the version we use the **Minimum Viable Live System**. It’s the version we agreed was the smallest safe set of features to use in live care.

**What it does**

- It holds each person’s **care folder** in one place, with the same eight sections that the CQC blueprint uses. So everything we record about the person—care plan, risk assessment, daily notes, medication, consent, incidents, and the rest—is in a clear structure that you can navigate in the same way we do.
- It **works out** what is in date, due for review, or overdue using the rules we’ve set (for example, care plan reviewed at least every 12 months). It doesn’t decide on its own; it just applies those rules to the dates and documents we’ve put in. So we see the same picture you would see when you look at our folders.
- It **reminds** our staff and managers what’s due so we can complete reviews on time. It shows who is responsible for each person and each type of document. When someone completes a review, they record it in the system and the system updates the dates. So every “review done” is done by a person and recorded.
- It has an **emergency summary** so that in an emergency our staff can see the most important information (allergies, medication, contacts, evacuation plan, and so on) in one place.
- When you inspect, we can show you the folder in **inspection mode**: you see the same content and structure, but you can’t change anything. So you see our real record in a read-only way.
- We can show **who did what and when** because the system keeps an audit trail. So when you ask “who reviewed this?”, we can show you the person and the date.

**What it doesn’t do**

- It **doesn’t** make any decisions about care or compliance. It doesn’t file documents on its own, doesn’t mark reviews as complete on its own, and doesn’t tell us we’re compliant or not. It only applies the rules and shows the result. All decisions are made by our staff.
- It **doesn’t** use any AI in this version. We chose to start with a manual system so that everything you see is the result of human action. If we add AI later (for example, to suggest where to file a document), we’ll do it in a controlled way and we’ll be able to explain how it’s governed.
- It **doesn’t** send alerts or information to you or to anyone outside the service without a member of staff deciding to do that. We stay in control of what is communicated.

**Safety and transparency**

We use this system because it gives us a clear, structured way to keep our evidence and to see what’s due. We can show you how status is worked out (our rules and our data), and we can show you that every change in the folder is traceable to a person. We’re happy to walk you through the folder, the status, and the audit trail if that would be helpful.

---

## 7. Exit Criteria from MVLS

Before the organisation **adds AI-assisted features**, **expands access**, or **increases automation**, it must have evidence and confidence that the MVLS is working as intended and that the next step is safe. The following are the exit criteria from the MVLS (and align with the entry criteria for Phase 2 in the Controlled Technical Integration Plan).

---

### Evidence or Confidence Required

- **Stable use:** The MVLS has been in use in at least one service (or one defined area) for a **defined period** (e.g. at least 4–8 weeks, or as set by the organisation) so that there is real usage and feedback, not only a short test.
- **Evidence that the manual system works:** For example: care folders are being used; documents are being added and placed in the right sections; reviews are being completed and recorded; compliance status and reminders are functioning; and the emergency summary and audit trail are in place and used. Evidence may come from usage data, spot checks, or manager and staff feedback.
- **No critical issues:** There are no fundamental problems that would make it unsafe to add AI or to expand. For example: the folder structure and compliance rules are not wrong; staff are not routinely bypassing the system or misusing it; and the audit trail is working so that “who did what, when” can be shown.
- **Approval and readiness for the next step:** If the next step is **AI document classification**, the organisation must have approved the prompt and the mandatory advisory language, and staff who will use it must have been trained that the AI suggests and they confirm. If the next step is **expanding** to more services or more staff, the organisation must have confirmed that training and support can be provided and that the same boundaries (no automated decisions, no AI compliance judgement) will be kept.
- **Documented decision:** The organisation **records** that it has met the exit criteria and has decided to move to the next phase (e.g. Phase 2: AI classification in controlled use). The decision is made by the role accountable for oversight (e.g. compliance lead, senior manager) and is kept for governance and for explaining to inspectors why and when AI was introduced.

---

### What “Exit from MVLS” Means

- **Exiting the MVLS** means: the organisation is no longer operating **only** the minimum viable version. It has added at least one of: AI document classification, AI gap detection, or another feature that was explicitly excluded from the MVLS. The **rest** of the MVLS (folder, status, reminders, emergency summary, inspection mode, audit, service-level view, review sign-off) remains in place and unchanged. So “exit” is not “replace the MVLS”; it is “add to it” in a governed way.
- **If the organisation never adds AI or automation,** it may stay in the MVLS indefinitely. The MVLS is **sufficient** for inspection readiness and for day-to-day use. Exit is only required when the organisation chooses to add features that were excluded from the MVLS.
- **If the organisation adds a feature and then has to pause or remove it** (e.g. because of a serious issue or regulator direction), it **reverts** to the MVLS for that feature (e.g. no AI classification; staff choose section and type themselves). The rest of the system continues. So the MVLS is also the **safe fallback** whenever an added feature is turned off.

---

## 8. Summary

| Topic | In one sentence |
|-------|------------------|
| **Definition of MVLS** | Smallest safe version for live care: structured folder, rule-based status, reminders, emergency summary, inspection mode, audit, service view, review sign-off; no AI; humans decide and act. |
| **Essential features** | Active Care Folder; document upload and viewing; manual compliance status; reminders and task list; emergency summary; inspection mode; audit trail; service-level view; review completion and sign-off. |
| **Exclusions** | No automated decisions; no AI compliance judgements; no automated external alerts; no auto-filing; no AI classification or gap detection in MVLS. |
| **Operational boundaries** | Used for: record-keeping, status, reminders, emergency access, audit, governance view, inspection. Not relied on for: clinical/legal decisions, external communication, replacing professional judgement. Manual: choice of section/type, what is a gap, completing reviews, prioritising, explaining to inspectors. |
| **Roles and access** | Frontline/key workers/nurses: their people, add docs, reviews, emergency summary, tasks. Managers: service view, audit, inspection mode. Compliance: oversight. Inspectors: read-only. Accountability: registered manager (service); compliance/senior (organisation). |
| **Inspection-safe explanation** | Short script for CQC: what MVLS does (folder, status, reminders, emergency, inspection mode, audit); what it doesn’t do (no decisions, no AI in MVLS, no auto-alerts); safety and transparency. |
| **Exit criteria** | Stable use for set period; evidence manual system works; no critical issues; approval and training for next step; documented decision. Exit = add to MVLS (e.g. AI) under governance; MVLS is fallback if added feature is paused. |

---

*This document defines the Minimum Viable Live System for the digital CQC readiness platform. It is the reference for the smallest safe version that may be used in real regulated care environments and for the criteria that must be met before adding AI or expanding automation.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
