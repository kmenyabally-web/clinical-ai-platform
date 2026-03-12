# AI Use Case: Compliance Gap Detection

**Conceptual Design for Safe, Regulator-Friendly Compliance Gap Detection**

*This document defines how AI is used to support compliance gap detection in the CQC readiness system. It describes what counts as a gap, what the AI may analyse and produce, severity levels, human review and control, how to explain the feature to inspectors, and boundaries. It does not contain prompts, code, or technical implementation. It is the reference for building and governing this AI feature.*

---

## 1. Definition of a Compliance Gap

A **compliance gap** in this system means: something in the care folder or at service level that does not meet the requirements set out in the compliance ruleset and the Active Care Folder blueprint. When a gap exists, the evidence the service can show to inspectors is incomplete, out of date, or inconsistent. Below are the main types of gaps and how inspectors recognise them.

---

### Missing Mandatory Documentation

**What it is:** A document type that the compliance rules say is **required** for this person (mandatory for all, or conditional and the condition is met) but that does **not exist** in the folder. For example: no care plan, no risk assessment, no consent record, no record of who to contact, or (when the person is on medication) no medication record or no medication review. For people with a learning disability, a missing communication passport or Health Action Plan when the rules require it is a gap. For people subject to DoLS or LPS, a missing or expired authorisation is a gap.

**How inspectors recognise it:** They look at the folder structure (the eight sections) and ask “where is the care plan?” or “where is the risk assessment?”. They check the list of document types in each section. If a required document type has no instance (no current record), they note it as missing. They may ask “why is this missing?” and expect either a good reason (e.g. document type not applicable in this case, with a recorded reason) or an acknowledgment that it is a gap that the service is addressing. Missing mandatory documentation is one of the most common causes of negative findings.

---

### Out-of-Date Reviews

**What it is:** A document **exists** but has not been reviewed within the time the compliance rules require. For example: care plan last reviewed more than 12 months ago with no new review recorded; risk assessment not updated after an incident; medication review overdue (e.g. more than 12 months, or more than 6 months for psychotropic medication where the rule says so); physical health check not done within the required period. “Out of date” means the **next review date** has passed or an **event-triggered** review (e.g. after incident) has not been done.

**How inspectors recognise it:** They look at the **dates** on documents: “when was this last reviewed?” and “when is it next due?”. They compare those dates to the compliance rules (e.g. care plan at least every 12 months). If the last review is too long ago or the next review date has passed, they treat the document as out of date. They also check whether **events** that should trigger a review (e.g. incident, safeguarding, change in risk) have been followed by an update. Out-of-date reviews are frequently cited in inspection reports.

---

### Weak or Inconsistent Evidence

**What it is:** The document **exists** and may be **in date** by date, but the **content** or the **way it is recorded** is weak or inconsistent. Examples: a risk assessment that is generic (could apply to anyone) rather than personalised to the person; a care plan with no evidence that the person or their family was involved in the review; daily care notes with large gaps (days or shifts with no entry when care was given); restraint or restrictive practice used but not recorded or not reviewed; incident or safeguarding concern recorded but no outcome or follow-up. “Weak” here means the evidence would not satisfy an inspector that the service is meeting the standard (e.g. person-centred, safe, well-led). “Inconsistent” means the record does not match what the compliance rules or the rest of the folder imply (e.g. incident logged but risk assessment not updated).

**How inspectors recognise it:** They **read** the content. They look for: personalised language and goals in the care plan; clear, person-specific risks and actions in the risk assessment; continuity in daily notes; evidence of involvement (signatures, meeting notes); restraint and incident follow-up. They compare documents to each other (e.g. does the risk assessment reflect the recent incident?). Weak or inconsistent evidence is often noted as “Requires Improvement” in the relevant domain (Safe, Effective, Caring, Responsive, Well-Led).

---

### Mismatches Between Risk and Documentation

**What it is:** The **situation** (what the service knows or what has happened) suggests that certain documentation **should** exist or **should have been updated**, but the folder does not reflect that. Examples: an incident recorded but no update to the risk assessment; a safeguarding concern raised but no safeguarding risk assessment or outcome in the folder; the person is on leave or has a history of going missing but no missing person risk and protocol; restraint has been used but no restraint record or restraint incident review; a change in medication but no updated medication review or health passport. The **mismatch** is: “something happened or is known, but the documentation that the rules say should follow has not been done.”

**How inspectors recognise it:** They look at **events** (incidents, safeguarding, complaints, restraint) and then check whether the **related** documents were updated. They ask “after this incident, was the risk assessment updated?” or “where is the outcome of this safeguarding concern?”. They look at the person’s risks (e.g. self-harm, missing) and check that the right assessments and plans exist. When they see an event or a risk without the corresponding documentation, they note a gap. Mismatches between risk and documentation are a strong signal of poor governance and are often cited under Safe and Well-Led.

---

### Summary: What Counts as a Gap

| Type of gap | What it means | How inspectors see it |
|-------------|----------------|------------------------|
| **Missing mandatory documentation** | Required document type has no instance in the folder. | “Where is the care plan / risk assessment / consent?”; check section and document list. |
| **Out-of-date reviews** | Document exists but last review is too long ago or event-triggered review not done. | Check “last review” and “next review” dates; check if events (incident, etc.) led to update. |
| **Weak or inconsistent evidence** | Content is generic, gaps in recording, or no evidence of involvement or follow-up. | Read content; compare to rules and to other documents (e.g. incident vs risk assessment). |
| **Risk–documentation mismatch** | Event or known risk exists but the documentation that should follow is missing or not updated. | Look at incidents, safeguarding, restraint; check that risk assessment and follow-up exist and are current. |

---

## 2. Inputs Available to the AI

The AI may use only the information it needs to **highlight potential** gaps and to **explain** why something might be a risk. It must not use the information to **decide** that the service is compliant or non-compliant, or to **judge** the quality of care. Below is what the AI is allowed to analyse and what it must not analyse or decide.

---

### What the AI Is Allowed to Analyse

**Document presence or absence:**

- For each person (or for a chosen set of people), whether each **document type** that the compliance rules say is required (mandatory or conditional) has at least one **instance** in the folder. For example: “risk assessment” is required for everyone; does this person have a risk assessment record? If the rules say a document type is conditional (e.g. “required when the person is on medication”), the AI may use the **data the system already holds** (e.g. “person has medication record” or “person is on medication”) to determine whether the condition is met and therefore whether the document is required. The AI does not **invent** conditions; it applies the **defined** rules. So: the AI can compare “what the rules say should be there” to “what is there” (present or absent).

**Review dates and status:**

- For each document type that exists, the **last review date** and the **next review date** (if stored), and the **current status** (in date, due, overdue) as calculated by the system from the rules. The AI may use this to see “this document type is overdue” or “this one is due in the next few weeks”. It does not **set** the status; the system’s compliance logic sets it. The AI may **read** that status and use it to prioritise or explain. It may also compare **events** (e.g. incident date) to **review dates** (e.g. when was the risk assessment last updated?) to see if there is a possible mismatch (e.g. “incident on X; risk assessment last updated before X”).

**Incident records and risk-related events:**

- That an **incident** has been recorded (date, perhaps type) and whether a **risk assessment** (or other event-triggered document) has been updated after that date. That a **safeguarding concern** has been recorded and whether an **outcome** or **safeguarding risk assessment** exists and when it was updated. That **restraint** has been recorded and whether a **restraint incident review** exists. The AI may use this to suggest “possible gap: incident on [date] but risk assessment not updated since [date]”. It does not **read** the content of the incident or the risk assessment to judge whether the update was “good enough”; it only checks **presence** and **dates**. So: the AI works with **structured data** (dates, presence/absence, event type) not with free-text interpretation.

**Care folder and service-level status:**

- The **status** of each person’s folder (e.g. complete and current, gaps or overdue) and, at service level, **counts** (how many people with Green, Amber, Red folders; how many with a specific document type missing or overdue). The AI may use this to produce summaries like “three people have an overdue risk assessment” or “service-level: 20% of folders have at least one overdue item”. It does not **change** that status; it **reports** on it and may **prioritise** or **explain** it.

**Rules and definitions:**

- The **compliance rules** as defined in the system (which document types are mandatory or conditional, review frequencies, event triggers, what “in date” and “overdue” mean). The AI uses these to know what to check. It does not **invent** or **change** the rules; it applies them to the data above to identify **potential** gaps.

---

### What the AI Must NOT Analyse or Decide

**Content quality or professional judgement:**

- The AI must **not** read or interpret the **content** of care plans, risk assessments, or other documents to decide whether they are “good”, “person-centred”, or “safe”. It does not assess whether a risk assessment is “good enough” or whether a care plan “meets the standard”. It only works with **presence, absence, and dates**. Judging quality is for professionals and inspectors.

**Compliance or non-compliance as a final verdict:**

- The AI must **not** output a final verdict that “this service is compliant” or “this service is non-compliant”. It may **highlight** potential gaps and **explain** why they might be a risk, but the **decision** that something is a gap (and what to do about it) rests with the human. The system’s **compliance status** (Green, Amber, Red; in date, due, overdue) is determined by the **rules and the data**, not by the AI “deciding” compliance. The AI’s role is to **surface and explain** what the rules and data already imply, not to add a new layer of “AI says you are non-compliant.”

**Clinical or legal conclusions:**

- The AI must **not** suggest or imply that a person lacks capacity, that a best interests decision is wrong, or that care is unsafe in a clinical sense. It only highlights **documentation** gaps (missing, out of date, or possible mismatch). It does not assess the person’s condition or the quality of the care they receive.

**Information outside the system:**

- The AI must **not** use information that is not in the system (e.g. verbal conversations, paper records that have not been entered, external reports the system does not hold). It works only with what the **system** holds. So it can say “the system has no risk assessment updated after this incident” but it cannot say “the risk was not assessed” if that assessment was done on paper and never entered.

**Summary:** The AI analyses **structure and dates** (what exists, when it was last updated, how that compares to the rules and to events). It does **not** analyse **content quality**, does **not** give a final compliance verdict, does **not** make clinical or legal conclusions, and does **not** use information outside the system.

---

## 3. AI Outputs (Advisory Only)

Everything the AI produces in this use case is **advisory**. It helps staff and managers see where to look and why something might be a risk. It does **not** decide compliance, does **not** change status, and does **not** require anyone to act. Humans decide what is a real gap and what to do.

---

### Identification of Potential Gaps

**What it is:** A list or set of **potential** gaps: for example, “Person A: no risk assessment updated after incident on [date]”; “Person B: care plan last reviewed more than 12 months ago”; “Service: 5 people with missing consent record”. Each item is a **candidate** for human review, not a final finding. The wording should make that clear (e.g. “Potential gap” or “Suggested area for review”).

**How it is used:** Staff or managers use the list to **prioritise** what to check. They may agree that it is a gap and then act (e.g. complete the review, add the document). They may decide it is not a gap (e.g. the document type is not required for this person, or there is an agreed exception). The AI does not **mark** the folder or the service as “non-compliant”; it only **suggests** that a human look at these areas.

**Limit:** The AI must not **invent** gaps. Each potential gap must be traceable to the **rules** and the **data** (e.g. “rule: risk assessment after incident; data: incident on X, risk assessment last updated on Y, Y before X”). If the rule or the data is wrong, the human may dismiss the finding and, where appropriate, correct the data or the rule.

---

### Plain-English Explanations of Why Something Is a Risk

**What it is:** For each potential gap, a short **explanation** in plain English of why it might be a risk. For example: “Risk assessment was last updated on [date]. An incident was recorded on [later date]. The compliance rules say the risk assessment should be updated after an incident. This may be a gap until the update is done.” Or: “Care plan last review: [date]. The rule requires review at least every 12 months. Next review was due on [date]. This is now overdue.” The explanation should point to the **rule** and the **data** so that the user (and, if needed, an inspector) can understand and verify.

**How it is used:** Staff use it to **understand** what to do and to **explain** to others (e.g. “the system is flagging this because…”). Managers use it to brief staff or to prepare for inspection. The explanation supports “know on the day”. It does **not** replace the need for the human to look at the actual document and the actual rule; it is a starting point.

**Limit:** The explanation must be based on **rules and data** that the system holds. It must not add reasons that are not in the rules (e.g. “the AI thinks this is high risk” is not a valid explanation). If the explanation is wrong (e.g. wrong date or wrong rule), the human should be able to see the underlying data and rule and correct their understanding. The AI does not **judge** the importance of the gap in a clinical or legal sense; it only explains why the **rules** suggest there may be a gap.

---

### Suggested Areas for Human Review

**What it is:** A prioritised or grouped list of **areas** that the AI suggests a human should review. For example: “Review risk assessments for Person A and Person B (incident recorded, no update)”; “Review care plan dates for 3 people (overdue)”; “Check consent records: 2 people with no consent on file”. The suggestion is “look here” not “this is definitely wrong”. The human then does the review and decides.

**How it is used:** Managers or compliance leads use it to **allocate** work (e.g. “key worker for Person A, please check the risk assessment”). Staff use it to **focus** their attention (e.g. “my list says check these three things”). The AI does not **assign** the work or **close** the gap; it only suggests where to look.

**Limit:** The suggestion is **advisory**. The human may decide that the area does not need review (e.g. exception already agreed and recorded) or that a different area is more urgent. The human’s decision is final.

---

### Severity Indication (High / Medium / Low)

**What it is:** For each potential gap (or each type of gap), the AI may suggest a **severity** level: high, medium, or low. This helps staff and managers **prioritise** (tackle high first) and **explain** to inspectors (“we’re focusing on the high-severity gaps first”). Severity is based on the **compliance rules** and **inspection risk** (e.g. missing risk assessment or overdue care plan are often high impact in inspections; a single “due soon” item might be medium or low). The exact mapping (what counts as high, medium, low) should be defined in the design and aligned with the compliance ruleset’s “inspection risk weighting”.

**How it is used:** To **order** the list of potential gaps and to **communicate** urgency. It does **not** mean “the AI has decided this is high risk to the person.” It means “in terms of compliance and inspection, this type of gap is typically treated as high impact.” The human still decides whether to act and in what order.

**Limit:** Severity is **indicative** only. It must not be used by the system to **auto-escalate** (e.g. “high severity = automatic alert to regulator”) or to **change** the folder’s compliance status. The folder’s status (Green, Amber, Red) comes from the rules and the data, not from the AI’s severity label. Severity is for **human prioritisation and communication** only.

---

### The AI Does Not Decide Compliance

- **Compliance status** (in date, due, overdue; Green, Amber, Red) is determined by the **compliance rules** and the **data** (dates, presence of documents, event triggers). The system that applies those rules produces the status. The AI **reads** that status and may **report** it and **explain** it; it does **not** set or override it.
- **Whether something is a “real” gap** is decided by the human. The AI says “potential gap” or “suggested area for review.” The human confirms (“yes, we need to fix this”), dismisses (“not applicable because…”), or defers (“we’ll do it next week”). So the **record** of “is this a gap?” and “what are we doing about it?” is a human decision, possibly informed by the AI.
- **Final compliance** (e.g. “this service is ready for inspection” or “this person’s folder is complete”) is a **human and organisational** judgement. The AI does not make that call. It only highlights areas that might need attention.

---

## 4. Severity Language and Meaning

The terms **High**, **Medium**, and **Low** risk (or severity) are used only to help staff and managers **prioritise** and **communicate**. They are defined in terms of **compliance and inspection impact**, not clinical risk to the person. Below is what each level means in practice and how inspectors typically react.

---

### High Risk (or High Severity)

**What it means in practice:** The potential gap is the kind that inspectors **often** treat as serious and that **frequently** contributes to “Requires Improvement” or “Inadequate” when left unaddressed. Examples: missing mandatory document (e.g. care plan, risk assessment, consent); long-overdue care plan or risk assessment review; incident or safeguarding with no follow-up (no risk assessment update, no outcome); restraint used with no record or no review; DoLS or LPS authorisation missing or expired when the person is deprived of liberty. These are the gaps that inspectors look for early and that the compliance ruleset labels as “high risk if missing or out of date.”

**How inspectors typically react:** They will **focus** on these. They will ask “why is this missing?” or “why hasn’t this been updated?” They expect the service to **know** about the gap and to have a **plan** to fix it or a **reason** (e.g. exception agreed and recorded). If the service cannot explain or has no plan, the finding is likely to be negative and may affect the rating. So when the AI labels something as “high,” it means: **this is the kind of gap that inspectors treat seriously; prioritise checking and fixing it.**

---

### Medium Risk (or Medium Severity)

**What it means in practice:** The potential gap is the kind that inspectors **may** note and that **can** support a negative finding if there are several of them or if combined with other issues. Examples: document type “due for review” (not yet overdue but close); one or two missing optional or conditional documents where the condition is met; some weak evidence (e.g. generic wording) that the AI can flag only indirectly (e.g. “risk assessment present but last updated before incident”); audit or governance action due. These matter for compliance and for “Well-Led” but are not always the **first** thing inspectors cite.

**How inspectors typically react:** They may **ask** about them (“when will this be reviewed?”) or **note** them as areas for improvement. They do not always lead alone to “Inadequate,” but they **add** to the picture. If the service has a clear plan and is addressing them, inspectors may note them without a severe finding. So when the AI labels something as “medium,” it means: **this could be cited; worth reviewing and planning.**

---

### Low Risk (or Low Severity)

**What it means in practice:** The potential gap is the kind that inspectors **less often** focus on as a primary cause of a poor rating. Examples: optional document missing where the rule does not require it; “due soon” (weeks away) with no other issues; small inconsistency that does not affect safety or governance in an obvious way. These are still worth **noting** so the service can improve, but they are not the main drivers of inspection outcome.

**How inspectors typically react:** They may **mention** them in feedback or as minor improvement points. They are unlikely alone to drive “Requires Improvement” or “Inadequate.” So when the AI labels something as “low,” it means: **good to fix when you can; lower priority than high and medium.**

---

### Important Caveat

**Severity is about compliance and inspection impact, not clinical safety.** The AI does **not** assess whether the person is safe or at risk of harm. A “low” severity gap might still be important for the person (e.g. a small documentation inconsistency that masks a real risk). Conversely, a “high” severity gap might be a paperwork delay while the care itself is safe. So: **severity guides prioritisation and communication with inspectors; it does not replace professional judgement about the person’s safety.** Staff and managers must still use their own judgement when deciding what to do first and when to escalate clinically.

---

## 5. Human Review and Control

The AI only **suggests** potential gaps and explanations. Humans **review**, **confirm or dismiss**, and **act**. Below is what staff must do before acting, how AI findings are confirmed or dismissed, and how disagreements with the AI are recorded.

---

### What Staff Must Review Before Acting

- **The potential gap itself:** Before doing work to “fix” a gap (e.g. completing a review, adding a document), the staff member or manager should **check** that it really is a gap. For example: Is the document type actually required for this person? Is the date correct? Was there an exception (e.g. review delayed with manager approval) that the system does not show? They should look at the **underlying data** (last review date, incident date, rule) and, where possible, the **document** itself, not only the AI’s summary.
- **The explanation:** The AI’s explanation (“why this might be a risk”) should be **verified** against the rules and the data. If the explanation is wrong (e.g. wrong date or wrong rule), the staff member should not act on the wrong basis. They may need to correct the data (e.g. wrong date in the system) or to dismiss the finding (“not applicable because…”). So: **review before act**—use the AI as a prompt to look, not as a substitute for looking.
- **Priority:** The staff member or manager may **reorder** the list. They might decide that a “medium” gap is more urgent for this person or this service than a “high” one (e.g. for clinical or operational reasons). The AI’s severity is advisory; the human sets the actual priority.

**Summary:** Staff must **review** the potential gap, the explanation, and the priority before they act. They do not act blindly on the AI’s list.

---

### How AI Findings Are Confirmed or Dismissed

- **Confirmed:** The staff member or manager agrees that the potential gap is a **real** gap. They may then **act** (complete the review, add the document, update the risk assessment) and, when the action is done, the **system** will update the compliance status (e.g. from overdue to in date). The AI does not “close” the gap; the **human action** does. The organisation may choose to record “AI highlighted this gap; [person] confirmed and completed [action] on [date]” for audit or improvement. That makes it clear that the human confirmed and acted.
- **Dismissed:** The staff member or manager decides that this is **not** a gap (or not one that needs action). For example: the document type is not required for this person; there is an agreed exception that is recorded elsewhere; the data was wrong and has been corrected; or the finding was a false positive (e.g. the risk assessment was updated but the date was not recorded correctly). When dismissed, the organisation may record **why** (e.g. “Not applicable: person not on medication” or “Exception: review delayed with manager approval until [date]”). That helps when the same type of finding appears again and helps inspectors if they ask “why did you dismiss this?”
- **Deferred:** The staff member or manager agrees it is a gap but decides to **deal with it later** (e.g. “we’ll do this review next week”). They may record the plan (who, by when). The AI does not “close” it; the human’s plan is what the service relies on. When the work is done, the gap is closed by the human action and the system’s status update.

**Summary:** Every AI finding can be **confirmed** (and then acted on), **dismissed** (with a reason where useful), or **deferred** (with a plan). The AI does not confirm, dismiss, or close anything by itself.

---

### How Disagreements With AI Output Are Recorded

- **When the human dismisses a finding:** The system should allow the human to record that they **dismissed** it and, where helpful, **why**. For example: “Dismissed: consent is held in paper file and will be uploaded by [date]” or “Dismissed: not required for this person (condition not met).” That creates an **audit trail**: the AI said “potential gap”; the human said “not a gap” or “not acting now” and gave a reason. If an inspector later asks “why is this missing?” or “did you see this finding?”, the service can show that a human considered it and made a decision.
- **When the human corrects the data:** If the AI’s finding was based on **wrong data** (e.g. wrong last review date), the human should **correct the data** in the system. Once corrected, the AI’s next run may no longer show that finding (because the data now matches the rule). The organisation may still keep a log that “AI finding was dismissed due to data correction” so that patterns (e.g. repeated data errors) can be reviewed.
- **When the human disagrees with the severity:** The human might think the AI’s “high” is less urgent or that a “medium” is more urgent. They do not need to “correct” the AI; they **act** on their own priority. The organisation may record “AI suggested high; we prioritised as medium because [reason]” if that helps for internal review or for explaining to inspectors. The important point is: **human priority overrides AI severity** for action; the AI severity is advisory only.

**Summary:** Disagreements (dismissal, data correction, or different priority) are **recorded** where useful so that the service can show that a human reviewed the AI output and made a deliberate decision. That supports accountability and inspection readiness.

---

## 6. Inspection-Safe Explanation

The following is a short explanation of the compliance gap detection feature that could be given verbally to a CQC inspector. It is honest about the AI’s role and emphasises that AI **highlights** risks but **humans decide** actions.

---

**Short version (about 30–45 seconds):**

“We use AI to help spot possible compliance gaps—things like missing documents, reviews that are overdue, or incidents that don’t have a follow-up in the risk assessment. It doesn’t decide whether we’re compliant or not. It looks at what’s in the system—what documents we have, when they were last reviewed, and what the rules say—and it suggests areas we should look at. So we might get a list like ‘these three people have an overdue care plan review’ or ‘this person had an incident but the risk assessment wasn’t updated.’ Our staff and managers then review that list. They decide what’s a real gap and what to do about it. They might confirm it and do the review, or they might dismiss it if there’s a good reason—and we can record that. So the AI helps us prioritise and not miss things, but the decisions about what is a gap and what we do about it are always made by our people. We’re happy to show you how it works or to show you the record of who confirmed or dismissed what.”

---

**Key points to stress if asked:**

- The AI **highlights** potential gaps; it does **not** decide compliance. Compliance status (in date, due, overdue; Green, Amber, Red) comes from the rules and the data; the AI only **surfaces** and **explains** that.
- **Humans** decide what is a real gap and what to do. They can confirm (and act), dismiss (with a reason), or defer (with a plan). The AI does not close or dismiss anything by itself.
- The AI works only on **structure and dates** (what exists, when it was updated, how that compares to the rules and to events). It does **not** judge the **content** of care plans or risk assessments (e.g. whether they’re good enough or person-centred).
- **Severity** (high, medium, low) is to help **prioritise** and **communicate** with inspectors. It is not a clinical risk assessment; it is about compliance and inspection impact. Humans still set their own order of work and their own judgement about safety.

---

## 7. Boundaries and Guardrails

### What This AI Feature Must Never Do

- **Decide compliance:** It must not output a final verdict that the service or a person’s folder is “compliant” or “non-compliant.” It may highlight potential gaps and suggest areas for review; the **status** (Green, Amber, Red; in date, due, overdue) is set by the rules and the data, not by the AI.
- **Set or change compliance status:** It must not **update** the folder or the service status (e.g. mark something as “in date” or “overdue”). Status is updated only when a **human action** is recorded (e.g. review completed, document added) and the system’s rules recalculate. The AI only **reads** status and **reports** it.
- **Judge content quality:** It must not read or assess the **content** of care plans, risk assessments, or other documents to decide if they are “good,” “person-centred,” or “safe.” It works with **presence, absence, and dates** only. Quality is for professionals and inspectors.
- **Make clinical or safety judgements:** It must not suggest that the **person** is at risk or that **care** is unsafe. It only highlights **documentation** gaps. Clinical and safety judgements are for staff and clinicians.
- **Auto-escalate or auto-report:** It must not **send** findings to regulators, families, or other parties without a **human** deciding to do so. It does not “report the service” or “alert CQC.” It only presents findings to staff and managers; they decide what to do and whom to inform.
- **Close or dismiss gaps by itself:** It must not “mark as done” or “dismiss” a finding without a **human** confirming or dismissing. Only human actions (e.g. review completed, document added) or human dismissal (with optional reason) can clear a finding from the list or change what the service is doing about it.
- **Use information outside the system:** It must not use verbal information, paper records not in the system, or external reports. It only uses what the **system** holds. So it can say “the system shows no update after this incident” but not “the risk was never assessed” if that assessment exists only on paper.
- **Invent or change rules:** It must apply the **defined** compliance rules (document types, review frequencies, event triggers). It must not invent new requirements or relax existing ones. If the rules are wrong, that is a **governance** change, not something the AI does on its own.

---

### What Would Trigger Review, Limitation, or Suspension

The organisation should **review**, **limit**, or **suspend** this feature if any of the following happen:

- **Repeated or serious errors:** The AI often highlights “gaps” that are not real (false positives) or misses real gaps (false negatives), and that leads to confusion, wasted effort, or inspectors finding gaps the system did not flag. The organisation should review why (data quality, rules, or AI logic) and improve or temporarily limit the feature (e.g. narrow the types of gaps it highlights) until it is reliable.
- **Over-reliance or bypassing human review:** Staff or managers start treating the AI list as the only source of truth and stop checking the underlying data or the actual documents. Or they “dismiss” findings without review to clear the list. The organisation should reinforce training and may limit or suspend the feature until human review is restored.
- **Use for forbidden purposes:** The feature is used to **decide** compliance, to **set** status, to **judge** content quality, or to **auto-report** to regulators. That would breach this design and the AI governance policy. The organisation should stop that use immediately and review.
- **Regulator or inspector concern:** CQC or another body raises a concern (e.g. “who decides what is a gap?” or “is the AI making compliance decisions?”). The organisation should explain the design (this document) and show that humans confirm or dismiss and that the AI only advises. If the concern cannot be addressed, the organisation should consider pausing or limiting the feature until it can demonstrate human control and accountability.
- **Data or security incident:** The data used by the AI (e.g. document presence, dates, incident records) is exposed, misused, or breached. The organisation should review and may need to suspend the feature until the incident is contained and controls are strengthened.

**Review** means: assess the design, the data, and how the feature is used; decide whether to improve, limit (e.g. fewer gap types, or advisory only for certain roles), or suspend; and document the decision. **Limitation** might mean: only show findings to managers, not to frontline staff; or only highlight “high” severity; or only document presence/absence, not “weak evidence.” **Suspension** means: turn off the AI gap detection so that staff and managers use only the normal compliance status screens (which are still driven by rules and data) without AI-generated lists or explanations. The rest of the system (status, reminders, audit) continues to work.

---

## 8. Summary: Compliance Gap Detection at a Glance

| Topic | In one sentence |
|-------|------------------|
| **Definition of a gap** | Missing mandatory docs; out-of-date reviews; weak or inconsistent evidence; mismatch between risk/events and documentation. Inspectors spot them by checking presence, dates, content, and follow-up. |
| **Inputs to the AI** | Document presence/absence; review dates and status; incident and risk-related events; folder and service status; rules. AI must NOT analyse content quality, decide compliance, or use info outside the system. |
| **Outputs (advisory only)** | Potential gaps; plain-English explanations (rule + data); suggested areas for review; severity (high/medium/low). AI does NOT decide compliance or set status. |
| **Severity** | High = often serious in inspection; medium = can be cited; low = improvement point. For prioritisation and communication only; not clinical risk. Inspectors react accordingly. |
| **Human review and control** | Staff must review gap, explanation, and priority before acting. Findings are confirmed (then act), dismissed (with reason), or deferred (with plan). Disagreements and dismissals recorded for audit. |
| **Inspection-safe explanation** | AI highlights potential gaps; humans decide what is real and what to do; AI uses structure and dates only; severity is for prioritisation; short script and key points provided. |
| **Boundaries** | Must never: decide compliance, set status, judge content, make clinical/safety judgements, auto-escalate, close/dismiss without human, use external info, or invent rules. |
| **Review/limitation/suspension** | Triggered by: repeated errors, over-reliance, forbidden use, regulator concern, or data/security incident. Review = assess and improve/limit/suspend; suspension = turn off AI gap detection only. |

---

*This document defines the compliance gap detection AI use case for the CQC readiness system. It should be used when building, testing, and governing this feature and when explaining it to staff and inspectors.*

*Document version: 1.0 | Plain English only | No prompts, code, or technical implementation.*
