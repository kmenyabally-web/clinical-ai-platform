# AI Governance Policy: Safe, Inspection-Ready Use of AI in the Digital CQC Readiness System

**Authoritative Policy for UK Regulated Care Services**

*This document defines how artificial intelligence (AI) may and may not be used in the CQC readiness system. It covers purpose, permitted and forbidden activities, human involvement, accountability, transparency, and risk management. It is written in plain English for service managers, compliance leads, and staff. No code, prompts, or technical implementation are included.*

---

## 1. Purpose of AI in the System

### Why AI Is Being Used

AI is used in this system to **support** staff and managers, not to replace them. The aim is to:

- **Reduce the burden** of repetitive or time-consuming tasks (for example, checking whether documents are in the right section, or spotting likely gaps in a folder).
- **Surface what needs attention** so that staff can prioritise (for example, “these three documents are overdue” or “this section has no risk assessment”).
- **Help people understand** why something is flagged (for example, “this is overdue because the last review was more than 12 months ago”) so that they can explain it to inspectors or act on it confidently.
- **Improve consistency** in how the system applies the compliance rules (for example, classifying a document as “care plan” or “risk assessment” so it appears in the right section).

AI is a **tool** that works alongside the compliance rules and the data in the folder. It does not set the rules, does not decide what care a person needs, and does not approve or sign off anything. Its role is to assist with organisation, highlighting, and explanation so that humans can do their job more effectively and the service can stay inspection-ready.

---

### What Problems AI Is Intended to Solve

- **Finding and organising:** Helping to put the right information in the right place (for example, suggesting which section a document belongs to, or flagging when something is missing from a section).
- **Keeping on top of due dates:** Helping to show what is due or overdue so that staff are reminded and managers can see the true picture. AI may support the logic that works out “due” and “overdue” from the rules and the dates.
- **Explaining gaps:** Helping to put into plain language why something is flagged (for example, “risk assessment is overdue because the last review was on [date] and the rule requires review every 12 months”). That helps staff answer inspectors’ questions and fix the gap correctly.
- **Summarising for context:** Where the policy allows, helping to produce short summaries (for example, “key risks for this person” or “recent incidents”) so that staff or managers can get the gist quickly. Such summaries are always **drafts** for human review; they are never the sole or final record.
- **Consistency and quality of structure:** Helping to keep the folder structure consistent (right sections, right document types) so that inspectors always find evidence in the same place.

These problems are about **organisation**, **visibility**, **explanation**, and **efficiency**. They are not about deciding what care to give or what risks a person has.

---

### What Problems AI Must Never Attempt to Solve

AI must **not** be used to:

- **Decide** what care or treatment a person needs, what risks they face, or what should be written in a care plan or risk assessment. Those decisions require professional and often clinical judgement. AI does not have that judgement and must not pretend to.
- **Approve or sign off** any document, review, or action. Sign-off is the point at which a human takes responsibility. AI cannot take responsibility and must not be used to mark something as “reviewed” or “approved”.
- **Assess** a person’s capacity to consent or to make a best interests decision. Capacity assessment is a legal and professional task. AI must not perform it or suggest the outcome.
- **Replace** the need for a human to read, think, and act. Even when AI suggests a classification, a summary, or an explanation, a human must be in the loop where the output affects the record or the person.
- **Interpret** the *quality* or *safety* of care (for example, “this care plan is good enough” or “this risk is low”). Quality and safety are judged by professionals and by inspectors. AI may help organise and highlight; it does not judge.

If the system or the organisation uses AI for any of these, it would go beyond assistance and into areas where accountability, safety, and CQC expectations require a human. The policy is clear: **AI supports; it does not decide, approve, or replace.**

---

## 2. AI-Permitted Activities

The following activities are **permitted** when they are done within the limits set below and with the required human involvement. The list is not exhaustive; any new use of AI in the system must be checked against this policy and against the “forbidden” list.

---

### Document Classification

**What it is:** AI may suggest which **section** or **document type** a piece of content or an uploaded file belongs to (for example, “this looks like a risk assessment” or “this text belongs in Care and Treatment”). The suggestion helps staff file things in the right place so that the folder matches the blueprint.

**Value:** Reduces the chance that documents are put in the wrong section and speeds up filing. Inspectors expect to find risk assessments in Risk and Safety and care plans in Assessment and Planning; classification helps keep the structure correct.

**Limits:** The suggestion is **only a suggestion**. The staff member must confirm or correct it before the document is saved to the folder. The system must not automatically save a document to a section or type based only on AI. If the AI is unsure or wrong, the human choice is final. The AI must not classify documents that require professional judgement (for example, capacity assessments or best interests records) in a way that could be mistaken for a professional view.

**Required human involvement:** A human must **review** the suggestion and **confirm or change** the section or document type before the document is stored. The record must show that a human made the final decision (and, where relevant, when).

---

### Drafting Summaries

**What it is:** AI may draft short **summaries** of existing content—for example, “key risks for this person” or “recent incidents in the last 30 days”—to help staff or managers get a quick picture. Such summaries are for **support only**; they are not the official record.

**Value:** Saves time when someone needs to brief themselves or someone else (for example, before a review or before an inspection). The summary is a starting point, not a substitute for reading the full record.

**Limits:** The summary must be clearly labelled as **AI-drafted** and **not the official record**. It must be based only on information already in the folder; it must not add facts or judgements that are not in the record. It must not be used as the only source of information for a decision (for example, “we relied on the AI summary to decide the risk level”). It must not be stored as if it were a formal part of the care record unless a human has reviewed it and the system records that it was “checked by [person] on [date]”. For emergency-critical information (allergies, medication, contacts, PEEP, DNAR), the **source of truth** is always the structured record that a human has entered or confirmed; an AI summary may not replace it.

**Required human involvement:** Any summary that is **shown** to staff or managers must be clearly marked as draft or for support. If a summary is ever kept as part of the record (for example, “manager’s briefing note”), a human must have **reviewed and approved** it and that must be recorded. In normal use, AI summaries are **reference only**; the human reads the full record when they need to act or to sign off.

---

### Highlighting Missing Information

**What it is:** AI may help to **identify** when something is missing from the folder—for example, “this section has no risk assessment” or “consent record is not present”—by comparing the folder content to the compliance rules (which document types are required for this person). The result is shown to the user as “missing” or “action needed”.

**Value:** Helps staff and managers see gaps before an inspector does. The service can then complete the missing document or record why it is not required (for conditional documents).

**Limits:** The “missing” flag must be based on the **defined rules** (mandatory and conditional document types), not on AI guessing what should be there. The system may use AI to support the logic that applies those rules (for example, “for this person, risk assessment is mandatory; none exists; therefore show as missing”). The AI must not **invent** new requirements or treat optional items as mandatory. If the rules say something is conditional, the AI must not flag it as missing unless the condition is met (for example, the person is on medication, so medication record is required). The final list of “what is missing” must be traceable to the compliance rules, not to an opaque AI decision.

**Required human involvement:** A human is **responsible** for filling the gap or for recording that the document is not required. The AI only highlights; it does not create the document or approve that it can stay missing. When a gap is closed, it is closed because a human added or updated the document and (where applicable) signed off.

---

### Explaining Compliance Gaps

**What it is:** AI may help to **explain** in plain language why something is flagged—for example, “care plan is overdue because the last review was on [date] and the rule requires a review at least every 12 months” or “risk assessment must be updated after an incident; an incident was recorded on [date]”. The explanation is for the user’s understanding and for explaining to inspectors.

**Value:** Staff and managers can quickly understand *why* something is Red or Amber and what to do about it. When an inspector asks “why is this overdue?”, the service can give a clear, rule-based answer. The explanation supports “know on the day”.

**Limits:** The explanation must be based on **rules and data** that the organisation has defined (review frequency, event triggers, dates). It must not add reasons that are not in the rules (for example, “the AI thinks this is high risk” is not a compliance explanation). It must not give the impression that the AI has judged the *quality* of the care plan or the risk assessment; it only explains why the *status* is due or overdue. If the explanation is wrong (for example, wrong date or wrong rule), the human must be able to see the underlying data and correct their understanding; the system should not hide the source of the explanation.

**Required human involvement:** The human uses the explanation to **act** (do the review, update the document) or to **explain to an inspector**. The human is responsible for the accuracy of what they say; if the AI explanation is wrong, the human should have access to the actual dates and rules so they can correct themselves. The organisation may choose to have a human **review** AI-generated explanations before they are shown in high-stakes contexts (for example, on the inspection view), or to show the underlying rule and date alongside the explanation so that the human can verify.

---

### Suggesting “Due Soon” and Prioritisation

**What it is:** AI may help to **order** or **prioritise** what needs attention—for example, “these five items are overdue; these three are due in the next two weeks”. The suggestion helps staff and managers decide what to do first.

**Value:** Reduces the chance that important items are forgotten and helps the service spread workload (for example, not all reviews due on the same day). Supports preparation for inspection by making the “to do” list clear.

**Limits:** The **underlying** due and overdue status must come from the **compliance rules** and the **dates in the record** (last review, next review), not from AI inventing dates or priorities. AI may only **order** or **present** what is already due or overdue; it must not **change** the status (for example, mark something as “not overdue” when the date has passed). The human decides what to do first; the AI only suggests an order (for example, by date or by risk level if the organisation has defined that).

**Required human involvement:** The human **chooses** what to do and in what order. They may follow the suggestion or not. When they complete a review, they do so through the normal review completion or sign-off process; the AI does not complete it for them.

---

### Summary of Permitted Activities

| Activity | Value | Limit | Human involvement |
|----------|--------|--------|--------------------|
| Document classification | Right section and type; consistent structure | Suggestion only; human confirms or corrects before save | Human reviews and confirms section/type before storing |
| Drafting summaries | Quick context; briefing | Draft/support only; not official record; not sole basis for decisions | Human reads full record when acting; if kept, human approves |
| Highlighting missing information | See gaps before inspector | Based on defined rules only; no invented requirements | Human fills gap or records why not required |
| Explaining compliance gaps | Understand why due/overdue; explain to inspector | Based on rules and data; no quality judgement | Human acts or explains; can verify from rules and dates |
| Suggesting prioritisation | Order “to do” list | Does not change status; only orders what rules already flag | Human decides what to do and completes reviews |

---

## 3. AI-Forbidden Activities

The following activities are **forbidden**. AI must never perform them in this system. The list is not exhaustive; anything that amounts to deciding, approving, or replacing professional judgement is forbidden unless this policy is explicitly updated.

---

### Making Clinical Decisions

**What is forbidden:** AI must not decide what care or treatment a person should receive, what medication they need, what dose, or whether a referral or escalation is clinically indicated. It must not suggest a diagnosis or a clinical conclusion (for example, “this person has capacity” or “this risk is low”).

**Why it is prohibited from a CQC perspective:** CQC expects care to be **safe** and **effective** and to be decided by **qualified professionals**. Clinical decisions require training, registration, and accountability. If AI made or drove clinical decisions, the service could not show that a responsible professional had made them. Inspectors would question who is accountable and whether the care is safe. The system is a **compliance and readiness** system; it is not a clinical decision support system in the sense of “AI recommends treatment”. AI may only support **organisation and explanation** of what humans have already recorded.

---

### Approving Care Plans or Reviews

**What is forbidden:** AI must not mark a care plan or risk assessment as “reviewed”, “approved”, or “signed off”. It must not set the “last review date” or “next review date” on the basis of its own decision. It must not complete a review or sign-off on behalf of a person.

**Why it is prohibited from a CQC perspective:** CQC expects **human sign-off** for reviews. The inspector asks “who reviewed this?” and expects a named person and a date. If the system could mark something as reviewed without a human action, the record would be false and the service could not demonstrate accountability. Approval and sign-off are the points at which the professional takes responsibility; AI cannot take that responsibility.

---

### Assessing Capacity or Best Interests

**What is forbidden:** AI must not perform or suggest the outcome of a capacity assessment (for example, “this person has capacity” or “this person lacks capacity”). It must not suggest or write a best interests decision. It must not recommend whether a DoLS or LPS authorisation is needed or what it should say.

**Why it is prohibited from a CQC perspective:** Capacity and best interests are **legal** matters under the Mental Capacity Act. They must be done by people with the right role and training (for example, assessors, best interests assessors). CQC checks that the service has proper capacity and best interests records and that decisions are made by the right people. If AI were to assess or decide, the service would be at legal and regulatory risk and could not show that a qualified person had made the decision.

---

### Replacing Professional Judgement

**What is forbidden:** AI must not make any decision that a professional is expected to make: what risks to put in a risk assessment, what goals to put in a care plan, whether an incident is serious enough to trigger a safeguarding referral, whether a complaint has been properly responded to, or whether a person’s needs have changed. It may **support** (for example, “this section has no risk assessment” or “the rule says update after incident”) but it must not **decide** the content or the outcome.

**Why it is prohibited from a CQC perspective:** CQC holds the **organisation and the professionals** to account. Inspectors expect to see that humans have assessed, planned, and reviewed. If AI replaced that judgement, the service could not show that care was person-centred, safe, and effective in the way the regulator expects. Professional judgement is non-delegable to AI in this system.

---

### Writing or Altering Care Content as if It Were the Author

**What is forbidden:** AI must not write the **definitive** text of a care plan, risk assessment, consent record, or incident report in a way that is then saved as the official record without a human having written it, edited it, or explicitly adopted it as their own. It may draft **suggestions** or **templates** that a human then rewrites and signs off; it must not be the **author** of the record.

**Why it is prohibited from a CQC perspective:** The record must show **who** wrote or approved the content. Inspectors expect “the key worker wrote this care plan” or “the nurse recorded this incident”. If the record were authored by AI and only “approved” by a human without the human having read and taken responsibility for the content, accountability would be unclear. The human must be the author or must have explicitly adopted and checked the content so that they can stand behind it.

---

### Hiding or Softening Compliance Gaps

**What is forbidden:** AI must not **reduce** or **remove** a “missing” or “overdue” flag to make the service look more compliant than it is. It must not suggest that something is “in date” when the rules say it is overdue. It must not reclassify or relabel to avoid showing a gap to inspectors.

**Why it is prohibited from a CQC perspective:** Inspectors rely on seeing the **true** state of the folder. If AI were used to hide or soften gaps, the service would be misleading the regulator and would fail the test of being **well-led** and transparent. Compliance status must reflect the rules and the data; AI must not be used to falsify or prettify that picture.

---

### Summary: Forbidden Activities

| Forbidden activity | Why prohibited (CQC perspective) |
|--------------------|-----------------------------------|
| Making clinical decisions | Care must be decided by qualified professionals; accountability and safety require a human. |
| Approving care plans or reviews | Sign-off must be by a named person; AI cannot take responsibility. |
| Assessing capacity or best interests | Legal and professional task; must be done by authorised people. |
| Replacing professional judgement | CQC holds professionals to account; judgement is non-delegable. |
| Writing care content as author | Record must show human author or explicit adoption; accountability. |
| Hiding or softening compliance gaps | Inspectors must see true state; falsifying is a governance failure. |

---

## 4. Human-in-the-Loop Rules

Human-in-the-loop means: **where the output of AI affects the record, the person, or compliance status, a human must be in the loop**. The following rules define where human review is mandatory, what must be signed off by humans, and what can never be “final” from AI alone.

---

### Where Human Review Is Mandatory

- **Before any AI-suggested classification is saved:** A human must **review** the suggested section or document type and **confirm or correct** it. The system must not save a document to the folder based on AI classification alone.
- **Before any AI-drafted summary is used as part of the record or as the basis for a decision:** If a summary is ever kept as part of the record (for example, a briefing note), a human must **review and approve** it and that must be recorded. In normal use, AI summaries are for support only; the human reads the full record when they act.
- **When the system highlights “missing” or “overdue”:** A human is **responsible** for filling the gap or completing the review. The AI only highlights; the human must act (or record why no action is needed). The human’s action (or documented exception) is what changes the status.
- **When an explanation of a compliance gap is shown in a high-stakes context** (for example, to an inspector): The organisation may require that the explanation is checked by a human or that the underlying rule and date are shown so the human can verify. The human is responsible for what they say to the inspector.

Human review is **mandatory** wherever the AI output could change what is stored, what is shown as compliant, or what is said to an inspector. It is not optional.

---

### What Must Be Signed Off by Humans

- **Care plans, risk assessments, consent records, and similar documents:** The **content** must be written or explicitly adopted by a human. The **review** must be signed off by the responsible human (for example, key worker, nurse). AI may not sign off. The system must record who signed off and when.
- **Incident reports, safeguarding records, complaint responses:** The **content** must be written or confirmed by a human. AI may not approve or close an incident or a complaint. The human responsible (e.g. manager) must sign off or record the outcome.
- **Any document or status that is “completed” or “in date”:** The transition to “completed” or “in date” must follow a **human action** (for example, review completed, document added). The system must not set “review completed” or “document present” on the basis of AI alone.

So: **anything that counts as “done” or “approved” in the record must be signed off by a human.** AI can suggest, draft, or explain; it cannot sign off.

---

### What AI Output Can Never Be Final

- **Classification:** The final section or document type is decided by the human who confirms or corrects the AI suggestion. AI output is never final until a human has confirmed.
- **Summary:** An AI summary is never the **official** record unless a human has reviewed and approved it and the system records that. In practice, the official record is the underlying care content; the summary is support only.
- **Compliance status:** “In date”, “due”, “overdue”, “missing” are determined by the **rules** and the **data** (dates, presence of documents). AI may support the logic that applies the rules, but the **final** status must not be overridden by AI (for example, AI must not say “in date” when the rule says “overdue”). The human’s actions (review, add document) are what change the status; AI does not change it on its own.
- **Any decision or judgement:** AI output is never final for any decision that affects the person or the record (what to write, what risk level, what to do next). The human’s decision is final. AI is input to the human; it is not the decision itself.

**In short:** AI output is **provisional** until a human has reviewed, adopted, or acted on it where it matters. Nothing that affects the record, the person, or compliance is “final” from AI alone.

---

## 5. Accountability and Ownership

### Who Is Responsible for AI-Assisted Outputs

- **The human who uses the output** is responsible. If a staff member accepts an AI-suggested classification and saves the document, they are responsible for the document being in the right place. If a manager uses an AI summary to brief someone, the manager is responsible for the accuracy of what they say. If a key worker signs off a review, they are responsible for that sign-off; the fact that AI may have helped highlight that the review was due does not shift responsibility to the AI.
- **The organisation** is responsible for how AI is used. The organisation must have a policy (this document) and must ensure that staff are aware of it. The organisation is accountable to CQC for the safety and governance of the service, including the use of AI. If AI is used in a way that breaches this policy (for example, AI used to sign off reviews), the organisation is responsible for that breach and for putting it right.

AI does not have legal or professional accountability. **People and the organisation** do. So: every AI-assisted output that affects the record or the person must be traceable to a human who took responsibility (by confirming, editing, signing off, or acting).

---

### How Accountability Is Maintained

- **Traceability:** The system must record **who** did what—who confirmed a classification, who completed a review, who added a document. So when an inspector asks “who reviewed this?”, the answer is a person and a date, not “the AI”. Audit and history (who did what, when) must include human actions, not AI actions presented as if they were human.
- **No AI sign-off:** The system must not allow AI to set “review completed” or “approved”. Only human actions (through the review completion or sign-off screen) can do that. So the record always shows a human as the one who completed or approved.
- **Clear labelling:** Where AI has drafted or suggested something (for example, a summary or a classification), the system should make that clear to the user (e.g. “AI-suggested” or “draft – please check”). So the user knows they must review and take responsibility. The organisation may choose to record “AI-assisted” in the audit trail where relevant (e.g. “document classified with AI suggestion; confirmed by [person] on [date]”) so that the use of AI is visible without making AI the author or signatory.
- **Policy and training:** The organisation must have this policy and must train staff on: what AI is allowed to do, what it must not do, and that they are responsible for what they confirm, sign off, or say. Accountability is maintained when people know the rules and follow them.

---

### What Inspectors Expect Organisations to Demonstrate

- **That humans are in charge:** Inspectors expect to see that care plans, risk assessments, and reviews are written and signed off by named people. They may ask “who wrote this?” or “who reviewed this?”. The organisation must be able to point to a person and a date. If AI was used to assist (e.g. draft or suggest), the organisation should be able to explain that the **human** wrote or approved the final content and that AI did not sign off or decide.
- **That the record is accurate and not misleading:** Inspectors expect the compliance status (in date, due, overdue) to reflect the rules and the data. They do not expect AI to have been used to hide or soften gaps. The organisation should be able to explain that status is rule-based and that AI only supports (e.g. explanation or prioritisation), not overrides.
- **That the organisation has thought about AI:** Inspectors may ask how the organisation uses AI and how it ensures safety and accountability. The organisation should be able to describe: what AI does (e.g. suggests classification, drafts summaries, explains gaps), what it does not do (no decisions, no sign-off, no capacity assessment), and how humans remain in the loop. This policy is the basis for that description.

---

## 6. Transparency and Explainability

### How AI Involvement Should Be Visible to Users

- **When AI has suggested something:** The user should see that the suggestion is from AI (e.g. “suggested section: Risk and Safety” or “AI draft summary – please check”). They should not be left thinking that the system “just knew”; they should know they need to confirm or correct.
- **When AI has drafted a summary:** The summary should be labelled as draft or for support (e.g. “AI-generated summary – not the official record”). The user should be reminded that the full record is the source of truth and that they must not rely on the summary alone for decisions.
- **When an explanation is shown:** The user should be able to see **why** the system says something is due or overdue (e.g. “last review [date]; rule: review every 12 months”). The explanation should point to the rule and the data, not to an opaque “AI says so”. Where the organisation has chosen to use AI to generate the wording of the explanation, it should still be clear that the **basis** is the rule and the date; the AI is only putting it in plain language.

Visibility means: **users know when AI has been involved** and what they are expected to do (review, confirm, or act). They are not surprised later to learn that something was AI-generated.

---

### How Decisions and Suggestions Are Explained

- **Classification:** The user can see the suggested section or document type and can confirm or change it. If the organisation wishes, the system can show a short reason (e.g. “suggested because the text mentions risks and mitigation”). The reason is for user confidence; the final decision is the user’s.
- **Compliance status and “due/overdue”:** The explanation should refer to the **rule** (e.g. “care plan must be reviewed at least every 12 months”) and the **data** (e.g. “last review was on [date]; next review was due on [date]”). So the user (and the inspector) can see that the status is rule-driven, not arbitrary. If AI helps phrase the explanation, the underlying rule and date must still be visible or easily available.
- **Prioritisation:** If AI suggests an order (e.g. “do these first”), the suggestion can be explained in terms of dates or policy (e.g. “overdue first, then due this week”). The user understands why the list is in that order and can still choose to do things in a different order.

Explainability means: **the user can understand why the system is suggesting or showing something**. They can explain it to an inspector or to a colleague. They can also spot if something is wrong (e.g. wrong date) and correct their understanding.

---

### Why Transparency Matters During Inspections

- **Trust:** Inspectors need to trust that what they see (care plans, risk assessments, status) is real and that the service is not hiding the role of AI in a way that could mislead. If the service is open about how AI is used (support only, human sign-off, no AI decisions), inspectors can assess whether the governance is sound.
- **Accountability:** When the inspector asks “who reviewed this?”, the answer must be a person. If the service had used AI to sign off without a human, the record would be false. Transparency (and the rule that AI never signs off) ensures that the answer is always a person and that the service can demonstrate that.
- **Accuracy:** If the inspector asks “why is this overdue?”, the service must give an accurate, rule-based answer. Transparency about how status and explanations are produced (rules + data, with AI only helping to explain) helps the service give that answer and helps the inspector verify it.

So: **transparency and explainability are not optional**. They are part of being well-led and inspection-ready.

---

## 7. Risk Management

### Known Risks of AI Use in Care Settings

- **Over-reliance:** Staff may trust AI suggestions too much and stop checking. For example, they may accept a wrong classification or use an AI summary as if it were the full record. That can lead to documents in the wrong place, wrong information being passed on, or gaps being missed.
- **Wrong or biased output:** AI can make mistakes (wrong section, wrong date, misleading summary). It may reflect biases in the data it was trained on or the way questions are phrased. If the user does not check, the mistake can end up in the record or in a decision.
- **Opacity:** If the user cannot see that AI was involved or cannot understand why something was suggested, they cannot take proper responsibility. They may also not spot errors. Accountability and safety depend on the user knowing and being able to explain.
- **Scope creep:** The organisation or the supplier may be tempted to use AI for more than this policy allows (e.g. “AI suggests what to write in the care plan”). That would cross into forbidden territory (professional judgement, authorship) and would create regulatory and safety risk.
- **Misleading inspectors:** If the system or the staff present AI output as if it were human-authored or human-approved when it was not, the service would be misleading the regulator. That is a serious governance failure.

These risks are **known**. The policy and the system design must mitigate them.

---

### How the System Mitigates These Risks

- **Human review and sign-off:** For any AI output that affects the record or compliance status, a human must review, confirm, or sign off. That reduces over-reliance and catches many errors. The system must not allow AI to save or sign off without a human step.
- **Clear labelling:** Users see when AI has suggested or drafted something. They know they must check. That supports accountability and reduces the chance that wrong or biased output is used as if it were final.
- **Explainability:** Explanations point to rules and data. Users can verify and can explain to inspectors. That reduces opacity and helps users spot wrong or misleading output.
- **Strict boundaries:** This policy clearly states what AI may and may not do. The organisation and the supplier must not add uses that fall into the “forbidden” list. That reduces scope creep.
- **Audit and traceability:** The system records who confirmed, who signed off, and when. So the service can show that humans were in the loop and that AI did not sign off. That reduces the risk of misleading inspectors.
- **Training and policy:** Staff are trained on this policy and on their responsibility. They know that they are accountable for what they confirm or sign off. That reinforces the human-in-the-loop and reduces over-reliance.

Mitigation is **ongoing**. The organisation should review how AI is used (e.g. once a year or when the system changes) and update this policy if new risks or new uses are identified.

---

### What Happens When AI Output Is Wrong or Misleading

- **Before it is saved or used:** If the user **reviews** the AI suggestion (e.g. classification, summary) and spots an error, they **correct** it. The wrong output is not saved. The user’s correction is what is stored. So the main line of defence is human review before anything is final.
- **After it is saved or used:** If a wrong classification was confirmed by mistake, or a misleading summary was used to brief someone, the **human who confirmed or used it** is responsible for putting it right. For example: reclassify the document, or go back to the full record and give the correct information. The organisation may also log the incident (e.g. “AI suggestion was wrong; user corrected”) so that patterns can be seen and the AI or the prompts can be improved (by the supplier or the organisation, in line with their roles).
- **When the wrong output has affected the record:** If somehow AI output was saved as if it were human-authored or human-approved when it was not (e.g. a breach of the policy), the organisation must **correct the record** and **record what happened** (e.g. “on [date] an AI output was incorrectly saved as approved; corrected by [person] on [date]”). The organisation should also review how the breach happened and strengthen controls (training, system design, or policy) so it does not happen again.
- **Transparency to inspectors:** If an inspector asks how the system works or whether AI was involved in a particular document, the organisation should answer honestly. If AI was used to assist (e.g. draft or suggest) and a human confirmed or signed off, that can be explained. If a mistake was made and corrected, that can also be explained. Hiding or denying the use of AI when it was involved would undermine trust and could be a regulatory concern.

**In short:** Wrong or misleading AI output is **caught by human review** where possible. When it is not caught, the **human and the organisation** put it right and learn from it. The system and the policy are designed so that AI output is never final on its own, which limits the damage when it is wrong.

---

## 8. Summary: AI Governance at a Glance

| Topic | In one sentence |
|-------|------------------|
| **Purpose of AI** | To support staff (organisation, highlighting, explanation, efficiency); never to decide care, approve, or replace professional judgement. |
| **Permitted activities** | Classification (with human confirm); drafting summaries (draft/support only); highlighting missing (rule-based); explaining gaps (rule-based); suggesting prioritisation. All with clear limits and human involvement. |
| **Forbidden activities** | Clinical decisions; approving care plans or reviews; capacity or best interests; replacing professional judgement; writing care content as author; hiding or softening compliance gaps. |
| **Human-in-the-loop** | Human review mandatory before AI classification is saved; human sign-off for all “completed” or “approved” items; AI output never final for record or decisions. |
| **Accountability** | The human who uses or confirms AI output is responsible; the organisation is responsible for policy and governance; traceability and no AI sign-off maintain accountability; inspectors expect humans in charge and a clear record. |
| **Transparency** | AI involvement visible to users (labels, “suggested”, “draft”); explanations point to rules and data; transparency supports trust and accountability during inspections. |
| **Risk management** | Risks: over-reliance, wrong/bias, opacity, scope creep, misleading inspectors. Mitigation: human review, labelling, explainability, strict boundaries, audit, training. When AI is wrong: correct before save where possible; if already used, human and organisation put it right and explain to inspectors if asked. |

---

*This document is the authoritative AI governance policy for the digital CQC readiness system. It should be used by the organisation to govern the use of AI, to train staff, and to demonstrate to CQC that AI is used safely and in a way that preserves human accountability and inspection readiness.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
