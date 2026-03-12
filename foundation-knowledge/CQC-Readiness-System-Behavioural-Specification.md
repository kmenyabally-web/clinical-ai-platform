# Digital CQC Readiness System: Behavioural Specification

**How the System Behaves Over Time: Status, Events, and Inspector Expectations**

*This document defines how the system behaves in response to time, events, and changes in care. It describes status states, what Green, Amber, and Red mean, what causes changes, how events are handled, how escalation works, and how behaviour differs in stable versus volatile situations. It does not describe software logic, workflows, or technical design.*

---

## 1. Core Status States

Status is the way the system (and the service) answers the question: “Is this in good shape, or does something need to happen?” For inspectors, status is a quick way to see whether evidence is present, current, and being managed. Each level—document, care folder, and service—has its own set of states.

---

### Document-Level States

A **document** here means a single type of evidence in the folder (for example, care plan, risk assessment, daily care note, medication record). For each document type that applies to the person, the document is in one of the following states.

| State name | What it means in practice | How inspectors interpret it |
|------------|----------------------------|------------------------------|
| **Not required** | The compliance rules say this document is not needed for this person (for example, it is conditional and the condition is not met). The service is not expected to have it. | Inspector accepts that the document is not applicable. No negative finding. |
| **Missing** | The document is required (mandatory or conditional and the condition is met) but it does not exist or has never been created. There is nothing to show. | Inspector will ask why it is missing. If there is no good reason, this supports a negative finding. Missing mandatory documents are a serious concern. |
| **Present and in date** | The document exists and has been reviewed or updated within the time the rules allow. The “last review” or “last update” date is within the required period, and the “next review” date is in the future. | Inspector sees that the evidence is there and current. This is what they expect for key documents. |
| **Due for review** | The document exists but the “next review” date is approaching (within the window the service defines as “due soon”, for example the next four to six weeks). No review has yet been done. | Inspector may note that action is planned. If the due date is close, they may ask when the review will happen. Not yet a failure, but they expect to see a plan. |
| **Overdue** | The document exists but the “next review” date has passed. The document is no longer within the required review period. No review has been recorded since the due date. | Inspector will treat this as a gap. Overdue reviews are a common cause of “Requires Improvement”. They expect the service to know and to have a plan to catch up. |
| **Action required (event)** | Something has happened (for example, an incident, a change in risk or medication) that the compliance rules say must trigger an update or review of this document. The update or review has not yet been done. | Inspector expects the service to have updated the document after the event. If not, they will question whether the service is responding to risk and change. |
| **Withdrawn or superseded** | The document used to apply but no longer does (for example, the person has been discharged, or this type of document has been replaced by another). It is kept for history but is not “live”. | Inspector may look at it for context but does not expect it to be current. No negative finding if the withdrawal or supersession is clear and appropriate. |

**In practice:** Staff and managers look at document states to know what to do next. Inspectors look at them to judge whether the folder is complete and current. The system uses these states to show Green, Amber, or Red (see section 2) and to trigger reminders and escalation.

---

### Care Folder–Level States

The **care folder** is the whole set of evidence for one person. Its state summarises whether the folder is complete and up to date overall.

| State name | What it means in practice | How inspectors interpret it |
|------------|----------------------------|------------------------------|
| **Complete and current** | All required documents are present. None are overdue. None are in “action required” because of an unresolved event. Reviews are up to date and the next review dates are in the future. | Inspector can see a full, current picture. This is the desired state. They may still look at quality of content, but structure and timeliness are in place. |
| **Complete but some items due** | All required documents exist. One or more are “due for review” (within the “due soon” window) but not yet overdue. No overdue documents and no unresolved event-driven actions. | Inspector sees that the folder is largely in good shape and that the service is aware of upcoming reviews. They may ask when reviews will happen. Generally acceptable if the service can show a plan. |
| **Gaps or overdue** | At least one required document is missing, or at least one document is overdue, or an event has required an update that has not been done. The folder is not fully compliant. | Inspector will focus on the gaps. They expect the service to know about them and to be able to explain what is being done. Multiple or long-overdue gaps support “Requires Improvement” or “Inadequate”. |
| **New or in progress** | The person has only recently been admitted or accepted. The folder is being built: some documents are in place, others are not yet created. The service is within the allowed period to complete the initial set (for example, first two weeks). | Inspector may allow time for the folder to be completed after admission. They will expect a clear plan and that critical items (consent, risk, emergency info) are in place early. |
| **Closed** | The person has been discharged or has left the service. The folder is no longer updated. It is kept for record-keeping and inspection. | Inspector may look at closed folders to see discharge planning and continuity. They do not expect new entries. The folder is historical. |

**In practice:** The folder state is what the manager or inspector sees when they ask “how is this person’s folder?”. It drives whether the person is counted as “ready” or “needs attention” in service-level reports.

---

### Service-Level States

At **service** level (ward, team, care home), the state describes whether the service as a whole is on top of its care folders and governance.

| State name | What it means in practice | How inspectors interpret it |
|------------|----------------------------|------------------------------|
| **Fully compliant** | Every active person has a folder in “complete and current” or “complete but some items due” (and “due” items are within an acceptable window). No person has “gaps or overdue” without a known plan. Audits and key governance actions are up to date. | Inspector sees a service that is managing its records and reviews. They may still look at quality and culture, but the baseline of “everything in date” is met. |
| **Mostly compliant with known gaps** | The majority of people have complete and current folders. A minority have gaps or overdue items, and the service can list who they are and what is being done. Audits have been done and actions are in train. | Inspector will ask about the people with gaps and the plan to fix them. If the number is small and the plan is clear, this may be acceptable. If gaps are many or longstanding, it becomes a concern. |
| **Significant non-compliance** | A substantial number of people have folders with gaps or overdue items, or key governance (for example, care plan audit) is overdue or missing. The service cannot show a credible plan to get back on track quickly. | Inspector will treat this as a serious governance failure. It supports “Requires Improvement” or “Inadequate” in Well-Led and often in Safe and Effective. They expect the provider to have seen this and acted before inspection. |
| **In transition** | The service has recently opened, merged, or had a major change (for example, new manager, new IT). There is an agreed period during which the service is bringing folders and processes up to standard. There is a clear plan and timeline. | Inspector may take context into account if the plan is credible and critical safety items (risk, consent, medication) are in place. They will want to see progress and a date when “fully compliant” is expected. |

**In practice:** Service state is what senior managers and compliance leads look at when they ask “are we ready for inspection?”. Inspectors form a view of the service’s governance from this overall picture as well as from the folders they sample.

---

## 2. Green, Amber, and Red Meaning

Green, Amber, and Red are simple signals that summarise status. They must mean the same thing everywhere they are used, so that staff and inspectors can read them at a glance. Below is the precise meaning at document, folder, and service level, and how inspectors typically respond.

---

### At Document Level

| Colour | Meaning | What inspectors do when they see it |
|--------|---------|-------------------------------------|
| **Green** | The document is required and is **present and in date**. It has been reviewed or updated within the rules, and the next review date is in the future. No event has required an update that has not been done. | No concern. They may still read the content to judge quality, but status is acceptable. |
| **Amber** | The document is required and exists, but either (1) it is **due for review** (within the “due soon” window), or (2) an **event has required an update** that has not yet been done. It is not yet overdue by date, but action is needed soon. | They may ask when the review or update will happen. They expect a plan. If the plan is clear and soon, usually acceptable. If Amber is widespread or left too long, it becomes a concern. |
| **Red** | The document is **missing** (and required), or **overdue** (past the review date with no review recorded), or an **event-required update** is long overdue. The evidence is absent or no longer current. | They will treat this as a gap. They expect the service to know and to explain. Missing or long-overdue Red items are a direct cause of negative findings. |
| **Grey (or no colour)** | The document is **not required** for this person (conditional and condition not met). | No action. Inspector does not expect to see it. |

**Rule of thumb:** Green = on track. Amber = act soon. Red = act now; inspectors will ask about it.

---

### At Care Folder Level

| Colour | Meaning | What inspectors do when they see it |
|--------|---------|-------------------------------------|
| **Green** | The folder is **complete and current**. All required documents are present and in date. No overdue items. No unresolved event-driven actions. | They can focus on the quality of care and the content of the folder. Structure and timeliness are in place. |
| **Amber** | The folder is **complete but some items are due**. All required documents exist. One or more are in the “due soon” window or have an event-driven action pending, but nothing is yet overdue. | They may ask when the due reviews will happen. They expect the key worker or manager to know. Generally acceptable if there is a clear plan. |
| **Red** | The folder has **gaps or overdue items**. At least one required document is missing, or at least one is overdue, or an event-required update has not been done. | They will focus on the gaps. They expect the service to know who has Red folders and what is being done. Multiple Red folders or Red that has been left for a long time supports a negative rating. |

**Rule of thumb:** Green folder = person’s evidence is in order. Amber folder = plan to review soon. Red folder = the service is not fully on top of this person’s evidence; inspectors will question it.

---

### At Service Level

| Colour | Meaning | What inspectors do when they see it |
|--------|---------|-------------------------------------|
| **Green** | The service is **fully compliant** or **mostly compliant with known gaps** and the gaps are few and being actively addressed. Most people have Green or Amber folders. Governance (audits, review cycles) is up to date. | They see a service that is in control of its records and governance. They may still look at culture, staffing, and quality of care, but the “readiness” baseline is met. |
| **Amber** | The service is **mostly compliant** but has a noticeable number of people with Amber or Red folders, or some key governance actions (for example, care plan audit) are due or slightly overdue. The service has a plan but has not yet caught up. | They will ask how the service is prioritising and when it expects to be Green. They expect the manager to know the numbers and the plan. If the plan is credible and progress is visible, it may be acceptable. |
| **Red** | The service has **significant non-compliance**: many people with Red folders, or key governance missing or long overdue, or no clear plan to improve. The service cannot show that it is on top of its evidence and reviews. | They will treat this as a serious governance failure. It directly supports “Requires Improvement” or “Inadequate” in Well-Led and often in Safe and Effective. They expect the provider to have identified this before inspection and to have escalated. |

**Rule of thumb:** Green service = ready to show evidence. Amber service = catch-up in progress; inspectors want a plan. Red service = not ready; inspectors will criticise governance.

---

## 3. State Change Triggers

Status does not stay fixed. It changes when time passes, when events happen, or when evidence is added or removed. Below is what causes state changes, in plain IF/THEN form.

---

### Time Passing (Reviews Due or Overdue)

- **IF** the rules say a document must be reviewed by a certain date (for example, care plan every 12 months, risk assessment every 12 months), **AND** that date has not yet been reached, **THEN** the document stays in “present and in date” and **Green** (as long as it exists and no event has required an update).

- **IF** the “next review” date is within the “due soon” window (for example, the next four to six weeks), **THEN** the document moves to “due for review” and **Amber**. The folder and service may also move to Amber if this is one of several items due.

- **IF** the “next review” date has passed and no review has been recorded, **THEN** the document moves to “overdue” and **Red**. The folder is in “gaps or overdue” and **Red** for that person. The service’s overall status may move to Amber or Red depending on how many people and documents are affected.

- **IF** a review is then completed and the new “next review” date is set, **THEN** the document moves back to “present and in date” and **Green** (and the folder and service recalculate accordingly).

**Inspector view:** Inspectors expect the service to be aware of review dates. When time passes and a review becomes due or overdue, the service should see the change in status and act. If the system (or the service) does not reflect “overdue” when the date has passed, the inspector will still treat it as overdue when they check the dates themselves.

---

### Incidents or Safeguarding Concerns

- **IF** an incident is recorded that affects or involves the person, **THEN** the compliance rules say that certain documents must be updated (for example, risk assessment, incident investigation, lessons learned). Until those updates are done, those documents are in “action required (event)” and **Amber** or **Red** (Red if the update is long overdue). The folder may move to Amber or Red. The service may move to Amber or Red if many people have event-driven actions outstanding.

- **IF** a safeguarding concern is recorded about or involving the person, **THEN** the concern and outcome must be in the folder, and any safeguarding risk assessment or plan must be updated. Until that is done, the relevant documents are in “action required (event)” and **Amber** or **Red**. The folder and service status reflect this.

- **IF** the required updates (risk assessment, investigation, outcome, lessons learned) are completed within the expected time, **THEN** the documents return to “present and in date” or “due for review” (depending on their next date-based review), and **Green** or **Amber** as appropriate. The folder and service recalculate.

**Inspector view:** Inspectors expect that after an incident or safeguarding concern, the service updates the relevant records and reviews. If the system does not flag “action required” after such events, the service may forget to update, and inspectors will find outdated or missing evidence.

---

### Changes in Risk, Capacity, Medication, or Placement

- **IF** there is a significant change in the person’s risk (for example, new self-harm concern, episode of violence), **THEN** the risk assessment (and any specific risk assessments that apply) must be reviewed. Until that review is done, the risk assessment is in “action required (event)” and **Amber** or **Red**. The same applies if the person’s capacity or best interests are in question: capacity assessment and best interests must be reviewed, and the relevant document is in “action required” until updated.

- **IF** there is a significant change in medication (for example, new drug, major dose change, serious side effect), **THEN** the medication record and (as per policy) medication review should be updated. Until that is done, the medication-related documents are in “action required (event)” and **Amber** or **Red**.

- **IF** there is a change in placement (admission, transfer, discharge), **THEN** the transition plan, and possibly the risk assessment, care plan, and (where applicable) DoLS/LPS must be updated or created. Until the required documents are in place, they are **Missing** or “action required” and **Red** or **Amber**. On discharge, the folder moves to “closed” and is no longer expected to be current.

**Inspector view:** Inspectors expect the service to respond to change. When risk, capacity, medication, or placement changes, the relevant documents should be updated quickly. The system should reflect “action required” until that happens.

---

### Missing or Withdrawn Evidence

- **IF** a document is required (mandatory or conditional and the condition is met) but does not exist, **THEN** the document is in “missing” and **Red**. The folder is in “gaps or overdue” and **Red** (or Amber if this is the only gap and the service is within an allowed “new or in progress” period). The service count of Red documents and Red folders increases.

- **IF** a document that used to be required is no longer required (for example, the person is discharged, or the condition for a conditional document is no longer met), **THEN** the document is “withdrawn or superseded”. It is not counted as missing. It may be shown as Grey or not shown as required. The folder and service status no longer treat it as a gap.

- **IF** a document that was present is removed or deleted without being replaced (for example, the current care plan is deleted and no new one is created), **THEN** the document type becomes “missing” and **Red**. The system should prevent or discourage deletion of the current instance without a replacement (as per the structural guardrails).

**Inspector view:** Missing required evidence is a direct failure. Withdrawn or superseded evidence is acceptable if the reason is clear (for example, discharge). Inspectors expect the service to know what is missing and to have a plan to fix it.

---

## 4. Event Types

Events are things that happen in the real world and that the system (and the service) must respond to in terms of records and reviews. For each event below, we state what it is and what inspectors expect to see happen to the folder and to reviews.

---

### Incident

**What it is:** An event that the service records as an incident (for example, fall, behaviour, concern, near-miss) that affects or involves the person.

**What inspectors expect to see:**

- The incident is **recorded** in the person’s folder (in the Incidents, Safeguarding and Complaints section) with date, what happened, and what was done.
- The **risk assessment** (and any specific risk assessments that apply, for example self-harm, violence) is **reviewed and updated** to reflect what happened and any change in risk. The review should happen within a short time (for example, within 24–72 hours for serious incidents, or as per policy).
- If the incident warrants it, an **investigation** is done and recorded, and **lessons learned** and **actions** are recorded and followed up.
- If **restraint** was used, the restraint is **recorded** and a **restraint incident review** is done.

**Behaviour:** When an incident is recorded, the system should put the relevant documents (risk assessment, investigation, lessons learned, restraint review as applicable) into “action required (event)” and Amber or Red until the updates are done. The folder and service status should reflect that action is required.

---

### Safeguarding Alert

**What it is:** A concern about abuse, neglect, or harm that has been raised about or involving the person.

**What inspectors expect to see:**

- The concern is **recorded** in the person’s folder (in Incidents, Safeguarding and Complaints) with date, what was reported, and to whom.
- The concern is **referred** as per policy (for example, to the local authority). The referral and any reference number are recorded.
- When the outcome is known, the **outcome** is **recorded** in the folder.
- Any **safeguarding risk assessment** or **plan** is **updated** to reflect the concern and the outcome.

**Behaviour:** When a safeguarding concern is recorded, the system should ensure that “record outcome” and “update safeguarding risk assessment/plan” (if applicable) are in “action required” until done. The folder should show Amber or Red for those items until they are completed.

---

### Hospital Admission

**What it is:** The person is admitted to hospital (for example, general hospital, psychiatric unit). They may or may not remain “in” the community or residential service for record-keeping purposes, depending on policy.

**What inspectors expect to see:**

- The **transition or handover** is **recorded**: what was sent with the person (summary, medication list, key risks, contacts), and when they were admitted.
- If the person is **discharged** from the care service (e.g. permanent move to hospital), the **discharge summary** and **follow-up plan** are completed and the folder is **closed**.
- If the person is expected to **return**, the care plan and risk assessment may need to be **reviewed on return** to reflect any change during the admission. The “next review” dates may be adjusted so that a review is due on or soon after return.

**Behaviour:** The system should treat hospital admission as a transition event. It may trigger “complete handover/transition record” and, on return, “review care plan and risk assessment”. If the person is discharged to hospital, the folder moves to “closed” and discharge summary is required.

---

### Change in Observation Level

**What it is:** In mental health or learning disability settings, the level of observation (for example, constant, intermittent, or general) is increased or decreased because of risk or improvement.

**What inspectors expect to see:**

- The **risk assessment** (and any self-harm or suicide risk assessment) is **updated** to reflect the reason for the change and the new level.
- The **care plan** or **nursing plan** may be **updated** to describe how observation is carried out and reviewed.
- When observation is **reduced**, there is a **record of the decision** (who decided, when, and why it was safe to reduce).

**Behaviour:** When observation level changes, the system should put risk assessment (and care plan if applicable) into “action required (event)” until updated. The change should be visible in the folder so that staff and inspectors can see that the service responded to risk.

---

### Upcoming Inspection Notice

**What it is:** The service is notified that CQC (or another body) will inspect, or that an inspection window has opened.

**What inspectors expect to see:**

- The service **knows** which people have Red or Amber folders and which documents are missing or overdue.
- The service has **prioritised** closing the most critical gaps (for example, overdue risk assessments, overdue care plan reviews, missing consent or DoLS) before or during the inspection.
- **Key documents** (care plan, risk assessment, daily notes, medication, consent, incidents and safeguarding, review dates) are **easy to find** and **current** for the people the inspector may ask to see.
- **Managers** can **describe** the service’s compliance state and the plan for any remaining gaps.

**Behaviour:** The system does not “fix” evidence; it **surfaces** it. When an inspection is announced, the service uses the system to see Green/Amber/Red at folder and service level, to list who has gaps and what they are, and to prioritise. The system may highlight “documents inspectors usually check first” so the service can focus. Behaviour is about **visibility and prioritisation**, not automatic changes to content.

---

### Other Events (Capacity, DoLS/LPS, Complaint, Restraint)

- **Capacity or best interests change:** Inspectors expect the capacity assessment and best interests record to be updated. The system should put those documents in “action required” until updated.

- **DoLS or LPS authorisation expiring or new:** Inspectors expect the authorisation to be in the folder and to be renewed before expiry. The system should show when the authorisation expires and put “review/renew DoLS/LPS” in “action required” as the expiry date approaches.

- **Complaint received:** Inspectors expect the complaint and response to be recorded and the response to be within the service’s timescale. The system should put “record complaint and response” in “action required” until done, and may remind if the response is overdue.

- **Restraint used:** Inspectors expect the restraint to be recorded and a restraint incident review to be done. The system should put the restraint record and restraint review in “action required” until completed.

---

## 5. Escalation Behaviour

Escalation is about what happens when something stays in Amber, when it becomes Red, and when managers must be involved. The system should support behaviour that matches what inspectors expect: the service should know, act, and escalate when things are not put right.

---

### What Happens If Something Stays Amber?

- **Amber** means “due soon” or “event-driven action needed”. If Amber **stays Amber** for a long time (for example, “due for review” for several weeks with no review done), the service is not addressing it. The risk is that the item will become **overdue** and turn **Red**.

- **Behaviour:** The system should continue to show Amber and to remind the responsible role. If the “due” date is approaching, reminders may become more frequent or more prominent. The folder and service dashboards should still show Amber so that managers can see that action is pending.

- **Manager involvement:** Managers do not have to be escalated to for every Amber item, but they should be able to **see** how many Amber items exist across the service and who is responsible. If Amber items are not being cleared, the manager should be able to **prioritise** (for example, in supervision or team meetings) so that Amber does not turn into Red.

- **Inspector expectation:** Inspectors accept that some items are “due” as long as the service has a plan and is acting. If Amber is widespread and nothing is being done, they will question whether the service is in control.

---

### When Does Amber Become Red?

- **Amber becomes Red** when:
  - A **date-based** “due for review” passes without a review being recorded. The document is then **overdue** and **Red**.
  - An **event-driven** action (for example, update risk assessment after incident) is not done within the time the service or policy expects (for example, within 72 hours). After that, the item is **Red** (action required and overdue).
  - A **required document** is still **missing** after any allowed “new or in progress” period (for example, two weeks after admission). The document is **missing** and **Red**.

- **Behaviour:** The system should change the status from Amber to Red at the moment the date is passed or the event-response time is passed. No manual “approval” is needed for something to become Red; the rules determine it. The responsible role and the manager should see the change so that they can act.

- **Inspector expectation:** Red means the evidence is not in place or not current. Inspectors will ask about it. The service should not be surprised by Red; the system should have shown it as Amber before it became Red, so the service had time to act.

---

### When Must Managers Be Involved?

- **Routine:** Managers do not need to be involved in every Green or Amber item. Key workers and nurses can complete reviews and updates within the normal cycle. The system reminds the responsible role; the role completes the work.

- **When managers should be involved:**
  - **Red at person level:** When a person’s folder goes **Red** (gaps or overdue), the manager should **know** (for example, via a list or dashboard) and may need to **allocate** time or support so the key worker can catch up. The manager does not have to do the review themselves, but they are accountable for the folder being brought back on track.
  - **Red at service level:** When the **service** has many Red folders or many Red documents, or when a **key governance** action (for example, care plan audit) is **overdue**, the manager (and possibly the compliance lead or senior manager) must **prioritise** and **escalate**. The manager should be able to see the numbers and the trend.
  - **Serious events:** When a **serious incident** or **safeguarding** concern is recorded, the manager (or safeguarding lead) should be **informed** so they can ensure investigation, risk update, and lessons learned are done. The system may surface “event-driven actions” to the manager as well as to the key worker.
  - **Amber not clearing:** When **Amber** items are **not being cleared** over time (for example, many items “due” for weeks), the manager should **intervene** (e.g. in supervision, workload review, or reallocation) so that Amber does not become Red and the service does not drift.

- **Behaviour:** The system should make it easy for managers to see: (1) which people have Red folders, (2) how many Red and Amber items the service has, (3) which event-driven actions are outstanding, and (4) when key governance (e.g. audit) is due or overdue. The system does not “escalate” in the sense of sending a message to the manager automatically (that is a design choice), but the **visibility** of Red and Amber at service level is the behavioural requirement so that managers can fulfil their accountability.

---

## 6. Stability vs Volatility

How the system (and the service) behaves should reflect whether the person’s situation is **stable** or **rapidly changing or high-risk**. Inspectors expect different patterns of documentation in the two cases.

---

### Stable Care Situations

**What it means:** The person’s needs, risks, and care plan are relatively consistent. There are no recent incidents, no major change in risk or medication, and no safeguarding concerns. Reviews happen on a regular cycle (e.g. care plan every 12 months, risk assessment every 12 months).

**How documentation behaviour differs:**

- **Reviews are date-driven.** The main trigger for updates is “the next review date has arrived”. The system shows Green for most documents until the “due soon” window, then Amber, then Red if the review is missed. Event-driven “action required” is rare.

- **Few event-driven actions.** The folder is not constantly in “action required” because of incidents or changes. When an event does happen, the service has capacity to respond and return the folder to Green or Amber.

- **Predictable workload.** Key workers and managers can plan: “these reviews are due this month.” The system supports this by showing “due soon” and “next review date” clearly. Escalation is mostly about overdue date-based reviews, not a flood of event-driven actions.

- **Inspector expectation:** Inspectors expect the folder to be **complete and current** with **most items Green**. They may see some Amber (reviews due in the next few weeks). They do not expect constant churn; they expect a steady rhythm of review and update.

---

### Rapidly Changing or High-Risk Situations

**What it means:** The person’s situation is changing often (e.g. crisis, frequent incidents, changes in risk or medication, or placement changes). There may be more incidents, more restraint, or more safeguarding involvement. Reviews may need to happen more often than the standard cycle (e.g. risk assessment after every incident, or weekly in crisis).

**How documentation behaviour differs:**

- **Reviews and updates are event-driven as well as date-driven.** The system should put documents into “action required” **every time** an incident, safeguarding concern, restraint, or significant change happens. The number of Amber or Red items may be higher, and the responsible role may have many “action required” items at once.

- **Shorter review cycles may apply.** For example, self-harm or suicide risk may need to be reviewed after every incident or weekly in crisis. The “next review” date may be days or weeks away, not months. The system should support these shorter cycles so that the folder does not show “in date” when the risk has changed and policy requires a quicker review.

- **Managers may need to be more involved.** In high-risk or volatile situations, the manager may need to ensure that risk assessments and incident follow-ups are done quickly. The system should make it very visible when event-driven actions are outstanding so that the manager can prioritise and support.

- **Inspector expectation:** Inspectors expect **more frequent** updates and **more event-driven** updates in volatile or high-risk situations. They do not expect the folder to be static. They expect to see that **after each incident or change**, the risk assessment (and other relevant documents) were updated. If the folder shows “in date” but there have been recent incidents with no update, inspectors will treat that as a failure. The system should **not** allow “in date” to persist when an event has occurred and the required update has not been done.

---

### Summary Table: Stability vs Volatility

| Aspect | Stable situation | Volatile or high-risk situation |
|--------|-------------------|-----------------------------------|
| **Main trigger for updates** | Date: next review due. | Events: incident, change in risk, restraint, safeguarding; plus date. |
| **Frequency of “action required”** | Low. | Higher; may be many event-driven actions at once. |
| **Review cycle** | Standard (e.g. 12-monthly). | May be shorter (e.g. weekly risk review in crisis). |
| **Manager involvement** | Mainly when Red or when audit is due. | More often; manager ensures event-driven updates are done quickly. |
| **What inspectors expect** | Folder mostly Green; some Amber; steady rhythm. | Folder reflects recent events; updates after every incident or change; more frequent reviews. |

---

## 7. Summary: Behaviour at a Glance

| Topic | In one sentence |
|-------|------------------|
| **Document states** | Not required; Missing; Present and in date; Due for review; Overdue; Action required (event); Withdrawn/superseded. Each has a clear meaning and inspector interpretation. |
| **Folder states** | Complete and current; Complete but some items due; Gaps or overdue; New or in progress; Closed. They summarise whether the person’s evidence is in order. |
| **Service states** | Fully compliant; Mostly compliant with known gaps; Significant non-compliance; In transition. They summarise whether the service is on top of its folders and governance. |
| **Green / Amber / Red** | Green = on track (in date, complete). Amber = act soon (due or event-driven action needed). Red = act now (missing or overdue). Same idea at document, folder, and service level. |
| **State change triggers** | Time (review due/overdue); incidents or safeguarding (event-driven updates); changes in risk, capacity, medication, or placement; missing or withdrawn evidence. IF/THEN logic in plain English. |
| **Events** | Incident; safeguarding alert; hospital admission; change in observation level; inspection notice; capacity/DoLS; complaint; restraint. For each, what inspectors expect to see in the folder and how the system should respond (action required until done). |
| **Escalation** | Amber that does not clear can become Red when the date passes or the event-response time passes. Managers must see Red at person and service level and when serious events occur; they prioritise and support so that gaps are closed. |
| **Stability vs volatility** | Stable: date-driven reviews, few event-driven actions, predictable workload, mostly Green. Volatile/high-risk: event-driven and date-driven, more “action required”, shorter cycles, managers more involved; inspectors expect updates after every incident or change. |

---

*This document defines how the system behaves over time in a way that mirrors real-world care delivery and CQC inspection expectations. It should be used when designing or explaining the behaviour of the system to clinical, compliance, and senior stakeholders.*

*Document version: 1.0 | Behavioural specification only | No code, workflows, or technical implementation.*
