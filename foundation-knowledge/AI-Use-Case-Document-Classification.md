# AI Use Case: Document Classification

**Conceptual Design for the First Safe, Inspection-Ready AI Feature**

*This document defines how AI is used to support document classification in the CQC readiness system. It describes purpose, inputs, outputs, handling of uncertainty and errors, human confirmation rules, how to explain the feature to inspectors, and boundaries. It does not contain prompts, code, or technical implementation. It is the reference for building and governing this AI feature.*

---

## 1. Purpose of This AI Use Case

### Why Document Classification Is Needed

When staff add a document to a person’s care folder—for example, a scanned form, a PDF from another service, or a photo—the system needs to know **where it belongs**: which of the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality) and which **document type** (for example, risk assessment, care plan, capacity assessment, DoLS authorisation, incident report). Putting the document in the right place keeps the folder organised as the blueprint and compliance rules expect, so that staff and inspectors can find evidence quickly and the system can apply the right rules (for example, review frequency, who is responsible).

Without help, staff have to choose the section and document type themselves every time. That can be slow, and mistakes can happen (for example, a risk assessment filed under Care and Treatment instead of Risk and Safety). Document classification support reduces the chance of misfiling and speeds up the process.

---

### What Problem It Solves for Frontline Staff

- **Speed:** Staff often have many documents to add (scans from GP, forms from other teams, handwritten notes photographed). Choosing the right section and type for each one takes time. A suggestion they can confirm with one action is faster than searching through a long list every time.
- **Consistency:** Different staff might file the same kind of document under slightly different names or sections. A consistent suggestion (for example, “this looks like a risk assessment – Risk and Safety”) helps the whole service use the same structure, so that inspectors always find risk assessments in the same place.
- **Confidence:** New or bank staff may be unsure where something goes. A suggestion gives them a starting point and reduces the worry of “putting it in the wrong place”. They still decide; the suggestion just helps.

The problem is **organisational**: getting the right document into the right part of the folder so that the folder stays inspection-ready and the system can apply the right compliance rules. It is not about deciding what the document *says* or what care the person needs.

---

### Why This Task Is Suitable for AI Support

- **Clear structure:** The system already has a fixed set of sections and document types from the blueprint and compliance rules. The AI’s job is to map “this document” to one of those types and one of those sections. The possible answers are limited and well defined.
- **Pattern-based:** Many documents have recognisable patterns: a risk assessment often has headings like “risks”, “mitigation”, “review date”; a capacity assessment may mention “capacity” and “Mental Capacity Act”; a DoLS form has a standard layout. AI can use such patterns to suggest a type and section. It does not need to interpret the *content* (what the risks are or what the capacity decision was); it only suggests *where* the document belongs.
- **Reversible:** If the AI is wrong, the staff member can correct the suggestion before saving. Nothing is final until the human confirms. So the cost of a wrong suggestion is low: the human overrides it and the correct choice is saved.
- **No professional judgement:** Choosing “this is a risk assessment” or “this is a care plan” is a filing decision, not a clinical or legal decision. The AI is not assessing capacity, approving a care plan, or judging risk level. It is only suggesting where to put the document. That keeps the use case within the “permitted” activities in the AI governance policy.

So: document classification is suitable for AI support because it is structured, pattern-based, reversible, and does not require professional judgement.

---

### Why It Is Low Risk from a CQC Perspective

- **Human in control:** The staff member **must** confirm or change the suggestion before the document is saved to the folder. The AI does not file anything on its own. So the **record** always reflects a human decision: “this document is in this section and this type because a member of staff said so.” Inspectors can ask “who decided where this goes?” and the answer is a person and a date.
- **No impact on care or compliance decisions:** The AI does not decide what care the person needs, what risks they have, or whether a review is due. It does not sign off anything. It only suggests where to **store** the document. Compliance status (in date, due, overdue) and care content are still driven by the rules and by human actions. So the use case does not cross into the areas CQC cares most about: safe care, effective care, and professional accountability.
- **Transparent and auditable:** The system can record that a suggestion was made, what it was, and that the human confirmed or changed it. So the organisation can explain to an inspector: “we use AI to suggest where to file documents; staff always confirm or correct before anything is saved; we can show who made the final choice.” That supports Well-Led and transparency.
- **Bounded:** The AI only suggests section and document type (and, if included, possible review date and confidence). It does not read or summarise the clinical content, does not assess capacity, and does not approve anything. The boundaries are clear and aligned with the AI governance policy.

Low risk does not mean no risk. Wrong suggestions can still happen. That is why human confirmation is mandatory and why the design includes handling for uncertainty and errors (see section 4).

---

## 2. Inputs to the AI

### What the AI Is Allowed to See

The AI may use only the information it needs to suggest a section and document type. That keeps the use case bounded and reduces the chance that the AI is used for anything beyond classification.

**The document itself (for classification only):**

- **Uploaded file:** The actual file the staff member is adding: PDF, scanned image, or photo. The AI may use it to detect patterns that help suggest type and section (for example, layout, headings, keywords that often appear in risk assessments or capacity forms). The AI uses it **only** to answer “what type of document is this and which section does it belong in?” It does not use it to summarise the content, to extract clinical facts, or to make any judgement about the person’s care or risk.
- **File metadata that is already known at upload time:** For example, file name (if the user has given one), file type (PDF, image), and file size. These can sometimes help (e.g. a file named “risk_assessment_John.pdf” might support a risk assessment suggestion) but must not be the only basis for the suggestion when the content suggests something else.

**Context that is not about the person’s care:**

- **List of sections and document types:** The fixed list from the blueprint and compliance rules (the eight sections and the document types under each). The AI needs to know what the possible answers are so it can suggest one of them. It does not need to see the person’s existing care content to do that.
- **Service or organisation context (if needed for configuration):** For example, whether the service uses “PBS plan” or “Positive Behaviour Support plan” as the label. This is only so the suggestion uses the same language as the service. It is not the person’s care data.

**What can be passed for “possible review date” (if this is part of the use case):**

- If the AI is allowed to suggest a “possible review date”, it may use only **information visible in the document** (for example, a “review date” field on a form). It must not use the person’s care record (other documents, care plan, risk assessment content) to infer or invent a date. The suggestion is “this document has a date written on it; that might be the review date” and is always for the staff member to confirm or correct.

---

### What the AI Must NOT See

To keep the use case safe and bounded, the AI must **not** be given:

- **The person’s name or identifier** (unless strictly necessary to display the suggestion in the right context in the application; even then, the AI should not use it to change its suggestion). The classification should be based on the **document**, not on who the person is. So the AI does not “learn” or infer anything about the person from their identity.
- **The person’s care record:** No care plans, risk assessments, daily notes, incidents, medication lists, or any other content from the folder. The AI is classifying **this one document**, not comparing it to the rest of the folder. Giving it the full record would push the use case toward “interpreting” or “assessing” the person, which is forbidden.
- **Who uploaded the document (staff identity):** The AI does not need to know which staff member uploaded it to suggest a type and section. Passing staff identity to the AI would not help classification and could create unnecessary data use.
- **Any information about other people:** The AI must only see the single document being classified (and the fixed list of sections and types). No data about other people in the service or organisation.
- **Compliance status or review dates from the folder:** The AI must not see “this person’s risk assessment is overdue” or “their care plan was last reviewed on X”. Its suggestion must not depend on the folder’s current state. That keeps classification separate from compliance logic and prevents the AI from being used to “fix” or hide status.

**Summary:** The AI sees the **document being added** (and only for the purpose of suggesting type and section), the **list of possible types and sections**, and, if applicable, **a date visible on the document** for a “possible review date” suggestion. It does **not** see the person’s care record, the person’s identity in a way that influences the suggestion, staff identity, or compliance status.

---

## 3. AI Outputs (Suggestions Only)

The AI may only **suggest**. It does not decide. Every output is clearly a suggestion that the staff member must confirm or change before anything is saved.

### Suggested Document Type

- **What it is:** One (or sometimes two) document types from the fixed list that the system uses (for example, “Risk assessment”, “Care plan”, “Capacity assessment”, “DoLS authorisation”, “Incident report”, “PBS plan”, “Health Action Plan”, and so on).
- **How it is shown:** The staff member sees something like “Suggested type: Risk assessment” or “Suggested: Risk assessment or Care plan”. The wording must make it clear that this is a **suggestion**, not the system’s final decision.
- **Limit:** The suggestion must be one of the document types that the organisation has defined for the system (from the compliance rules and blueprint). The AI must not invent new types or suggest something that is not in the list.

---

### Suggested Section

- **What it is:** One of the eight sections (Identity and Consent; Assessment and Planning; Care and Treatment; Risk and Safety; Health and Wellbeing; Involvement and Communication; Incidents, Safeguarding and Complaints; Governance and Quality).
- **How it is shown:** The staff member sees something like “Suggested section: Risk and Safety”. Again, clearly a suggestion.
- **Limit:** The suggestion must be one of the eight sections. Usually the section follows from the document type (for example, risk assessment belongs in Risk and Safety), so the suggestion is consistent with the blueprint.

---

### Possible Review Date (Optional)

- **What it is:** If the document appears to contain a date (for example, a “review date” or “next review” field on a form), the AI may suggest “Possible review date: [date]” so that the staff member can consider adding it to the record or setting a reminder.
- **How it is shown:** “Possible review date: 1 June 2025 (from document)”. The staff member can accept it, change it, or ignore it. They are responsible for the date that is actually stored.
- **Limit:** The suggestion must be based only on what is **visible in the document** (e.g. a printed or written date). The AI must not infer or invent a date from other information. If no clear date is in the document, the AI should not suggest one.

---

### Confidence Level (High, Medium, Low)

- **What it is:** A simple indication of how confident the AI is in its suggestion (high, medium, or low). This helps the staff member know how carefully they need to check. High confidence does not mean the staff member can skip review; it only means the AI is more sure. The human still confirms.
- **How it is shown:** For example, “Confidence: high” or “Confidence: low – please check carefully”. The exact wording can be user-friendly (e.g. “We’re fairly sure” vs “We’re not sure – please choose”).
- **Limit:** Confidence is for **user guidance only**. It must not be used by the system to auto-save (e.g. “if high confidence, save without asking”). Saving always requires an explicit human action. Confidence may influence how prominently the system asks the staff member to review (e.g. stronger prompt when confidence is low).

---

### All Outputs Are Suggestions

- **Document type:** Suggestion only. The staff member confirms or selects a different type.
- **Section:** Suggestion only. The staff member confirms or selects a different section.
- **Possible review date:** Suggestion only. The staff member decides whether to use it and what date to store.
- **Confidence:** Informational only. It does not change what the staff member must do (always confirm); it may change how clearly the system asks them to check.

Nothing the AI outputs is **saved** to the folder until the staff member has confirmed (or explicitly chosen something else) and the system has recorded that confirmation.

---

## 4. Handling Uncertainty and Errors

### When AI Confidence Is Low

- **What the system should do:** When the AI reports low (or medium) confidence, the system should make it **obvious** that the staff member needs to check. For example: show the suggestion but with a clear message like “We’re not sure – please choose the correct section and document type” or “Suggested: X – please confirm or change.” The list of sections and document types should be easy to use so the staff member can override quickly. The system must **not** pre-select the suggestion and hide the rest; the staff member must always be able to see and change the choice.
- **No auto-save:** Even when confidence is high, the system must not save the document to the folder without a deliberate human action (e.g. “Save” or “Confirm”). Confidence must not be used to skip the confirmation step.
- **Optional: no suggestion when confidence is very low:** The organisation may choose that when confidence is below a set threshold, the AI does not show a suggestion at all and the staff member simply sees the list of sections and types and chooses. That avoids showing a suggestion that is likely wrong and could be blindly accepted. The exact threshold is a design choice; the principle is that the staff member is never forced to accept a poor suggestion.

---

### How Staff Are Prompted to Review or Override

- **Always show the suggestion and the alternative:** The staff member sees the AI’s suggested type and section (and optional review date) but also sees the full list of sections and document types so they can change the choice. The screen (or flow) should make it clear that they **must** confirm or change before saving. Wording like “Confirm or change where this document will be filed” or “Is this correct? Change if not.” helps.
- **No “accept suggestion” as the only button:** The staff member must take a deliberate step that means “I have checked and this is where I want to file it.” That might be “Save” after reviewing the suggestion, or “Confirm” after possibly changing the dropdown. The system must not have a path where the user can save without seeing or confirming the section and type.
- **When the user changes the suggestion:** The system saves **what the user chose**, not what the AI suggested. The audit trail can record “AI suggested X; user selected Y” so that the organisation can see when overrides happen and improve the feature or training if needed. The staff member is not told they “got it wrong”; they are simply recorded as having made a different choice.

---

### How Incorrect AI Suggestions Are Corrected

- **Before save:** If the staff member spots that the suggestion is wrong (wrong section or wrong type), they **change** the selection to the correct one and then save. That is the normal correction. No separate “report error” step is required for the document to be filed correctly; the override **is** the correction.
- **After save:** If the document was saved with the wrong section or type (because the staff member accepted a wrong suggestion by mistake), any staff member with permission to edit the folder can **reclassify** the document: move it to the correct section and document type. The system should record that a reclassification happened (who, when, from what to what) so that the audit trail is clear. The AI does not “fix” it automatically; a human fixes it.
- **Learning and improvement:** The organisation (or the supplier) may collect anonymous data about how often the suggestion was accepted vs overridden, and for which document types. That can be used to improve the AI or the prompts over time. Any such use must comply with data protection and the organisation’s policy. The improvement is about the **suggestion**, not about changing the saved record without a human. No automatic “AI corrects past filings” should happen.

---

## 5. Human Confirmation Rules

### What Staff Must Confirm Before Anything Is Saved

- **Section:** The staff member must confirm (or explicitly choose) the **section** where the document will be stored. They may accept the AI suggestion or choose another. Until they do, the document must not be saved to the folder.
- **Document type:** The staff member must confirm (or explicitly choose) the **document type** (e.g. risk assessment, care plan, capacity assessment). They may accept the AI suggestion or choose another. Until they do, the document must not be saved.
- **Optional – review date:** If the system allows a “review date” or “next review date” to be set when filing, and the AI suggested a possible date, the staff member must confirm or change that date (or leave it blank if they do not want to set it). The system must not auto-fill the review date in the record without the staff member confirming.
- **That they have checked:** The act of pressing “Save” or “Confirm” is treated as the staff member confirming that they have checked the section and type (and optional date) and that they are correct. The system does not allow save without the user having seen and confirmed these fields.

So: **section, document type, and (if applicable) review date are never saved on the basis of AI alone. They are saved only after the staff member has confirmed or explicitly chosen them.**

---

### What Cannot Be Auto-Filed

- **No document is ever filed without a human action.** There is no “auto-file on upload” or “auto-file when confidence is high”. Every document requires the staff member to complete the classification step (confirm or choose section and type) and then save.
- **No automatic section or type from AI.** The system must not have a mode where “if the user does nothing, we use the AI suggestion after 10 seconds” or similar. The user must take a deliberate step that means “I confirm this is where it goes.”
- **No bulk auto-file.** If the system later supports uploading multiple documents at once, each document must still go through a step where the staff member confirms (or chooses) section and type for that document. The AI may suggest for each one, but the human must confirm each one. There is no “accept all suggestions” that bypasses review.

---

### How Confirmation Is Recorded for Audit Purposes

- **Who:** The system must record **who** confirmed the classification (the user who was logged in when they pressed Save or Confirm). That is the person responsible for the document being in that section and type.
- **When:** The system must record **when** the document was saved (date and, if available, time). So the organisation can show “this document was filed on this date”.
- **What:** The system should record **what** was saved: section, document type, and (if applicable) review date. So the audit trail shows the final choice.
- **Optional – AI suggestion:** The organisation may choose to record what the AI suggested (section, type, confidence) so that they can see how often the suggestion was accepted vs overridden. That is for improvement and for explaining to inspectors how the feature works. It is not required for CQC, but it supports transparency (“we can show when the AI suggested X and the user chose Y”).

When an inspector asks “who decided to put this document here?” or “when was this document added?”, the organisation can use this audit information to answer: the **staff member** decided, on **this date**, and the **section and type** are the ones they confirmed. The AI’s role is visible (suggestion only) and the human’s role is clear (final decision and accountability).

---

## 6. Inspection-Safe Explanation

The following is a short, plain-English explanation of the document classification feature that could be spoken to a CQC inspector. It is honest about AI’s role and emphasises human control and accountability.

---

**Short version (about 30 seconds):**

“When staff add a document to someone’s care folder—like a scanned form or a PDF—the system can suggest where it should go: which section and which document type, for example risk assessment or care plan. That’s to help with consistency and speed. The suggestion is only a suggestion. The staff member always has to confirm or change it before anything is saved. So the person who actually decides where the document goes is always a member of staff, and we can show who that was and when. The AI doesn’t file anything on its own and doesn’t look at the rest of the person’s record; it only looks at the document being added to suggest where it might belong. We’ve set it up so that it never signs off or approves anything—it just helps with filing.”

---

**Slightly longer version (if the inspector wants more detail):**

“We use AI to support document classification. When someone uploads a document—a scan, a PDF, something from the GP—the system can suggest which of our eight folder sections it belongs in and which document type, like risk assessment or capacity assessment. That helps staff file things in the right place quickly and keeps the folder structure consistent so you can find things in the same place every time.

The important bit is that the AI only suggests. Nothing is saved until a member of staff has looked at the suggestion and confirmed it or changed it. So the decision about where the document goes is always made by a person, and we record who made that decision and when. If the AI suggests the wrong thing, the staff member just chooses the right section and type from the list and saves that. We don’t use the AI to read or interpret the content of the document—we don’t use it for capacity assessments or care decisions. It only helps with the filing step: putting the document in the right place in the folder. We’re happy to show you how it works on the screen or to show you the audit trail of who filed what and when.”

---

**Key points to stress if asked:**

- AI **suggests**; staff **decide** and **confirm** before anything is saved.
- The **accountable person** is the staff member who confirmed the classification; the system records who and when.
- AI is used **only** for suggesting section and document type (and optionally a date visible on the document); it is **not** used to interpret care, assess capacity, or approve anything.
- The feature is **bounded** and **low risk** because it does not touch professional judgement or compliance decisions.

---

## 7. Boundaries and Guardrails

### What This AI Use Case Must Never Expand Into

This use case is **only** for suggesting where a document belongs (section and document type) and, optionally, a possible review date taken from the document. It must **not** expand into any of the following:

- **Reading or summarising the content** of the document (e.g. “this risk assessment says the person is at high risk”). Summaries and content interpretation are separate use cases and would require their own design and governance. This use case does not include them.
- **Assessing capacity or best interests:** The AI must not suggest or imply whether the person has capacity or what a best interests decision should be. Even if the document is a capacity assessment, the AI only suggests “this looks like a capacity assessment – file under Identity and Consent (or the relevant section)”. It does not read or interpret the outcome.
- **Judging risk level or care quality:** The AI must not suggest “this is a high-risk situation” or “this care plan is good enough”. It only suggests “this document looks like a risk assessment” or “this looks like a care plan” for **filing** purposes.
- **Approving or signing off:** The AI must not mark the document as “reviewed” or “approved”. Filing the document is not a review. Reviews and sign-offs are done by humans through the proper screens and are separate from classification.
- **Auto-filing:** The use case must not be changed so that documents are saved without a human confirming section and type. No “auto-file when confidence is high” or “auto-file after a delay”.
- **Using the person’s care record as input:** The AI must not be given the rest of the folder (other documents, care plan text, risk assessment content) to “improve” the suggestion. The suggestion is based only on the document being added and the fixed list of sections and types. Expanding the input would blur the line between “filing” and “interpreting” the person’s situation.
- **Suggesting what to write:** The AI must not suggest text for a care plan, risk assessment, or any other document. This use case is only for **classifying** documents that already exist (uploaded or created elsewhere). It does not generate or edit content.

If the organisation or the supplier is asked to add any of the above, that would be a **new** use case or a **change** to this one and would need to be checked against the AI governance policy and, where necessary, updated design and risk assessment.

---

### What Would Trigger a Review or Suspension of This AI Feature

The organisation should **review** or **suspend** this AI feature if any of the following happen:

- **Repeated or serious misclassification:** If staff or managers report that the AI is often wrong (e.g. wrong section or type) for important document types, or if a wrong suggestion leads to a document being filed in the wrong place and that is not noticed until an inspection or an incident, the organisation should review why the errors are happening and whether the feature needs to be improved or temporarily turned off until it is fixed.
- **Staff bypassing or misunderstanding confirmation:** If audits or feedback show that staff are treating the suggestion as final and not checking (e.g. always accepting without looking), or if they do not understand that they are responsible for the final choice, the organisation should reinforce training and may consider making the confirmation step more explicit or suspending the feature until behaviour is corrected.
- **Use of the feature for something it was not designed for:** If the organisation or the supplier starts using the same AI or the same inputs for summarising content, assessing risk, or any other forbidden activity, that would be a breach of the AI governance policy and should trigger an immediate review and suspension of the expanded use until the policy is respected.
- **Inspector or regulator concern:** If CQC or another body raises a concern about how AI is used (e.g. “who decided where this went?” or “is the AI making decisions?”), the organisation should be able to show the design (this document), the audit trail (who confirmed, when), and the policy. If the concern cannot be addressed with the current design, the organisation should consider pausing the feature until it can demonstrate that human control and accountability are clear.
- **Data or security incident:** If there is an incident involving the document classification feature (e.g. documents or metadata being sent or used in a way that breaches data protection or security), the organisation should review and may need to suspend the feature until the incident is contained and controls are strengthened.

**Review** means: look at the design, the data, and the way the feature is used; decide whether to improve, restrict, or suspend; and document the decision and any changes. **Suspension** means: turn off the AI suggestion so that staff see only the list of sections and types and choose themselves, with no AI suggestion. The rest of the system (saving, audit, compliance) continues to work; only the suggestion step is removed until the organisation is satisfied it is safe to reintroduce it.

---

## 8. Summary: Document Classification Use Case at a Glance

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | To suggest where an uploaded document belongs (section and document type) so staff can file quickly and consistently, with human confirmation always required before save. |
| **Inputs** | The document being added (for classification only); optional file metadata; the fixed list of sections and types. AI must NOT see the person’s care record, other people’s data, or compliance status. |
| **Outputs** | Suggestions only: likely document type, relevant section, optional possible review date from document, confidence level. None are decisions; all require human confirm or override. |
| **Uncertainty and errors** | Low confidence → clear prompt to check; no auto-save on confidence; staff override by choosing correctly; after save, reclassification by human; optional recording of overrides for improvement. |
| **Human confirmation** | Staff must confirm section and document type (and optional review date) before save; nothing is auto-filed; confirmation is recorded (who, when, what) for audit. |
| **Inspection-safe explanation** | AI suggests; staff decide and confirm; accountable person is the staff member; AI only helps with filing; no content interpretation, no sign-off; short script provided for inspectors. |
| **Boundaries** | Must never expand into: summarising content, capacity/best interests, risk/care judgement, approving/signing off, auto-filing, using full care record as input, or suggesting what to write. |
| **Review or suspension** | Triggered by: repeated/serious misclassification, staff bypassing confirmation, use for forbidden activities, regulator concern, or data/security incident. |

---

*This document defines the first safe, inspection-ready AI feature for the CQC readiness system. It should be used when building, testing, and governing the document classification feature and when explaining it to staff and inspectors.*

*Document version: 1.0 | Plain English only | No prompts, code, or technical implementation.*
