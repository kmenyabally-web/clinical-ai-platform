# Official AI Prompt: Document Classification (v1 APPROVED)

**Controlled Governance Artefact for AI Use in Regulated Care Services**

*This document contains the approved prompt and governance conditions for the document classification AI feature in the digital CQC readiness system. It reflects the approved AI behaviour, the review and acceptance decision, and inspection-safe language with explicit human control. It is a controlled document: changes require re-approval as set out in section 5.*

---

## 1. Prompt Purpose and Scope

### What This Prompt Is For

This prompt is used when a member of staff adds a document (for example, a PDF, scan, or image) to a person’s care folder. The system sends the document (and only the document) to the AI with this prompt so that the AI can **suggest** where the document belongs: which **section** of the folder and which **document type**. The suggestion is then shown to the staff member, who must **confirm or change** it before anything is saved. The prompt ensures the AI stays within that limited role and uses only the approved structure and language.

### What Tasks It Supports

- **Suggesting** a document type (for example, care plan, risk assessment, Positive Behaviour Support plan, capacity assessment, incident report, consent record) from a fixed list that matches the care folder blueprint.
- **Suggesting** a section (one of the eight sections below) so the document is filed in the right place.
- **Suggesting** whether the document type is mandatory or conditional for the person (when the rules say so), so the staff member understands why it might be required.
- **Stating** when something cannot be determined (for example, review date or expiry date when they are not visible or not readable).
- **Suggesting** a confidence level (High, Medium, or Low) so the staff member knows how carefully to check, and **reminding** that they must still confirm before saving.
- **Listing** what the responsible staff member must confirm (section, document type, person, and dates if applicable) without asking the AI to set clinical or professional standards.

### What It Explicitly Does Not Do

- It does **not** ask the AI to read, interpret, or summarise the **content** of the document (for example, what the risks are or what the care plan says). The AI only suggests **where** the document belongs.
- It does **not** ask the AI to make any **clinical** judgement (for example, whether the person has capacity, whether care is safe, or whether a plan is “good enough”).
- It does **not** ask the AI to **approve** the document, sign it off, or mark it as reviewed or compliant.
- It does **not** ask the AI to **decide** compliance (in date, due, overdue). Compliance status is determined by the system’s rules and data, not by the AI.
- It does **not** ask the AI to suggest what to **write** in any document. It only suggests **classification** (section and type) for a document that already exists.

---

## 2. Approved Prompt Text

The following is the **full, exact** prompt text that must be sent to the AI when classifying a document. No part of this prompt may be altered without going through the change control process in section 5.

---

**START OF PROMPT**

You are helping to classify a document for a UK care service’s digital care folder. Your role is **only** to suggest which section and which document type the document might belong to. You do **not** decide where it goes; a member of staff will confirm or change your suggestion before anything is saved.

**Your limits**

- You must **not** interpret or summarise the clinical or personal content of the document (for example, what risks it describes or what care it recommends). You only suggest **where** to file it.
- You must **not** make any clinical judgement (for example, about capacity, safety, or quality of care).
- You must **not** approve the document, sign it off, or say whether it is compliant or in date. You only suggest section and document type.
- You must **not** invent section names or document types. Use **only** the sections and types listed below.

**The eight sections (use these exact names)**

When you suggest a section, you must use one of these names only:

- **Section A: Identity and Consent**
- **Section B: Assessment and Planning**
- **Section C: Care and Treatment**
- **Section D: Risk and Safety**
- **Section E: Health and Wellbeing**
- **Section F: Involvement and Communication**
- **Section G: Incidents, Safeguarding and Complaints**
- **Section H: Governance and Quality**

**What you must do**

1. **Suggested document type:** Look at the document (and any visible title or headings) and suggest which document type it is most likely to be from the list your system uses (for example, care plan, risk assessment, Positive Behaviour Support plan, capacity assessment, DoLS or LPS authorisation, incident report, consent record, medication record, health passport, communication passport, and other types that match the care folder blueprint). Always use the words **Suggested document type** so it is clear this is a suggestion, not a decision.

2. **Suggested section:** Say which of the eight sections above the document is most likely to belong in. Always use the words **Suggested section** and the exact section name (for example, “Suggested section: Section B: Assessment and Planning”).

3. **Mandatory or conditional:** If the document type is one that is only required in certain circumstances (for example, PBS plan when the person has behaviour that challenges, or DoLS authorisation when the person is deprived of liberty), say briefly that it is **conditional** and when it is required. Do not invent new conditions; use only what the compliance rules say.

4. **Confidence:** Say whether your suggestion is **High**, **Medium**, or **Low** confidence. Then add: **You must still confirm or change the section and document type before saving.** Do this even when confidence is High.

5. **What you cannot determine:** If you cannot read or see something (for example, review date, expiry date, or specific text inside the document), say clearly **Cannot be determined** and give a short, plain-language reason (for example, “dates are not visible in the information available”). Do not use technical jargon (for example, do not refer to metadata, encoding, or file structure) in the part of your answer that will be shown to staff.

6. **What the responsible staff member must confirm:** List what the staff member must do before the document is saved. Limit this to: (a) confirm or change the **section**; (b) confirm or change the **document type**; (c) confirm which **person** the document belongs to (if not already known); (d) if a review date or expiry date is visible on the document, add or confirm that **date** in the system. Do **not** ask the staff member to “ensure” or “confirm” anything about clinical approval, quality of care, or professional sign-off. Your role is only classification and placement.

7. **Possible review date (optional):** If you can clearly see a date on the document that looks like a review date or next review date, you may suggest it as **Possible review date** for the staff member to confirm or correct. If you cannot see a date, say **Cannot be determined** and do not guess.

**End your response with this exact sentence**

Your last sentence must be exactly:

**“This analysis is advisory only. You must confirm or change the section and document type before saving.”**

Do not add anything after that sentence. Do not replace it with a different advisory sentence.

**Reminder:** You are only suggesting where to file the document. The staff member decides. Use plain language. Do not use technical terms in the part of your answer that staff will see.

**END OF PROMPT**

---

## 3. Mandatory Advisory Language

The following sentence(s) must **always** appear in the AI’s response. The prompt instructs the AI to end with the first sentence. The application may also show the second sentence as a fixed line below the AI output so that it is always visible even if the AI response is truncated or altered.

**Exact wording (must not be changed without re-approval):**

1. **“This analysis is advisory only. You must confirm or change the section and document type before saving.”**

2. **“The responsible staff member (for example, key worker or nurse) must confirm or change the suggestion before the document is saved to the folder.”**

- The first sentence must be the **final** sentence of the AI’s response, as instructed in the prompt.
- The second sentence may be added by the **application** (for example, as a fixed line under the AI output) so that staff always see that a responsible staff member must confirm. If the application shows it, it must use this exact wording or wording approved under change control.

No other advisory wording may replace these without going through the change control process. The words “advisory only,” “must confirm,” and “before saving” (or “before the document is saved”) must remain in any approved variant.

---

## 4. Usage Conditions

### When This Prompt May Be Used

- **Only** when a member of staff is adding a **single document** (file) to a person’s care folder and the system is offering a **suggestion** for which section and document type to use.
- **Only** when the document (or the information the system can pass from it) is the **only** input to the AI. The prompt and the document (and, if applicable, the fixed list of document types) may be sent; the person’s name, care record, other documents, and staff identity must **not** be sent for the purpose of classification.
- **Only** when the application will **show** the AI’s response to the staff member and **require** them to confirm or change the section and document type before the document is saved. The prompt may not be used in a flow where the document is saved automatically on the basis of the AI’s suggestion.

### Who May Use It

- **Technically:** Only the digital CQC readiness system (or the part of it that performs document classification) may send this prompt to the AI. It is not for ad-hoc or manual use (for example, staff must not paste documents into a general-purpose AI tool and use this prompt themselves).
- **Governance:** The organisation that operates the system is responsible for ensuring that the prompt is used only as described in this document and that staff are trained (see below). The prompt is approved for use by that organisation (or by the service provider acting on their behalf) only under the conditions in this document.

### Situations Where It Must Not Be Used

- **Do not use** when the aim is to **auto-file** or **auto-save** the document without a human confirmation step. The prompt is designed for a flow where the human confirms or changes before save.
- **Do not use** when the document is being classified for any purpose **other** than “where does this go in the care folder?” (for example, do not use it to decide whether the document is “compliant” or “complete”).
- **Do not use** when the AI would be given the **person’s care record** (other documents, care plans, risk assessments, incidents) as input. The prompt assumes the AI sees only the **single document** being classified and the fixed list of sections and types.
- **Do not use** for document types that are **not** in the care folder blueprint or the organisation’s approved list. The AI must only suggest from the approved list; if the list changes, the prompt or the way the list is passed to the AI must be updated under change control.

### Requirement for Staff Training or Guidance

- Before staff use the document classification feature, they must receive **training or guidance** that covers:
  - The AI **suggests**; the staff member **decides** and **confirms** before saving.
  - They must **always** confirm or change the section and document type; they must not save on the basis of the suggestion alone.
  - Even when the AI shows “High” confidence, they must still check and confirm.
  - They are **accountable** for the final classification (who filed it and where); they must not say “the AI put it there.”
- Managers and compliance leads must be able to **explain** to inspectors how the feature works (suggestion only, human confirms, no approval or clinical judgement) using this document and the document classification use case document. Training or briefing materials for managers should reference this prompt and the mandatory advisory language.

---

## 5. Versioning and Change Control

### Version Name

**Version: v1.0 APPROVED**

- This is the first approved version of the document classification prompt.
- The “APPROVED” status means it has been through the review and acceptance process (including the AI Classification Output Review Report) and has been approved for use subject to the conditions in this document.

### What Types of Changes Require Re-Approval

The following types of changes **require** formal re-approval before the revised prompt may be used:

- **Any change to the prompt text** (additions, deletions, or rewording of the instructions sent to the AI).
- **Any change to the mandatory advisory language** (section 3). Even small wording changes (for example, “You must confirm” to “Staff must confirm”) require re-approval because the wording was set to meet inspection and accountability requirements.
- **Any change that widens the AI’s role** (for example, asking the AI to suggest or check anything beyond section, document type, confidence, “cannot be determined,” and optional possible review date). Adding summarisation, content interpretation, or compliance checking would require a new use case and a new approval.
- **Any change to the list of sections** (for example, adding or renaming a section). The eight sections are defined by the Active Care Folder blueprint; changes must align with the blueprint and be approved.
- **Any change that removes or weakens** the requirement for human confirmation, the prohibition on clinical judgement, or the prohibition on approval or compliance decisions.

**Re-approval** means: the change is documented, reviewed (including for safety, boundaries, and inspection impact), and formally approved by the role or body that approved this version (for example, AI governance lead, compliance lead, or governance committee). A new version number must be assigned (e.g. v1.1) and this document updated. If the change is substantial (e.g. new role for the AI), a new review report may be required.

### How Future Versions Must Be Reviewed

- **Minor wording only** (for example, fixing a typo or clarifying a phrase without changing meaning): may be approved by the same role that approved v1.0, documented in a short change log, and version number updated (e.g. v1.0 → v1.1).
- **Any change that affects what the AI is asked to do or what it may output:** must be checked against the document classification use case and the AI governance policy to ensure the change does not cross boundaries (e.g. into clinical judgement or approval). If it does, the change must not be made without a full review and updated use case or policy.
- **Any change that affects the mandatory advisory language:** must be checked against the AI Classification Output Review Report acceptance criteria to ensure the new wording still meets “advisory only,” “must confirm,” and “before saving.” If the new wording is weaker, it must not be approved.
- **New major version (e.g. v2.0):** If the prompt is redesigned (for example, different structure or new capabilities), it must be treated as a new prompt: full review, updated use case if needed, and formal approval before use. This document (or a new controlled document for v2.0) must be updated with the new prompt text, version number, and approval date.

---

## 6. Inspection-Safe Explanation

The following explanation may be **shown or given** to a CQC inspector if they ask how the AI document classification feature is governed and controlled. It emphasises safety and human accountability.

---

**For CQC: How This AI Prompt Is Governed and Controlled**

We use AI to suggest where a document should be filed in the care folder (which section and which document type). The AI does not decide; it only suggests. The prompt we use is a **controlled document**. It has been approved for use and is kept under change control.

**What the prompt does**

The prompt tells the AI exactly what it may and may not do. It may only suggest a document type and a section from a fixed list that matches our care folder structure. It must use the words “Suggested” so it is clear the output is a suggestion. It must not interpret the content of the document, make any clinical judgement, or approve or sign off anything. It must not decide compliance. It must state when it cannot determine something (for example, a date) and it must end with a sentence that says the analysis is advisory only and that the staff member must confirm or change before saving.

**How we keep it safe**

- **Human control:** Every document is saved only after a member of staff has confirmed or changed the section and document type. The AI never saves anything on its own. Our system is designed so that the confirmation step cannot be skipped.
- **Accountability:** We record who confirmed the classification and when, so we can show that a person made the final decision. The prompt instructs the AI to say that the “responsible staff member” must confirm, which matches our roles (key worker, nurse, and so on).
- **Governance:** The prompt is versioned (this is v1.0 APPROVED). Any change to the prompt or to the mandatory advisory wording has to go through a formal re-approval process. We do not change it without checking that it still meets our safety and inspection requirements.
- **Training:** Staff are trained that the AI suggests and they decide. They know they must confirm before saving and that they are accountable for where the document is filed.

**What we can show you**

We can show you this document (the approved prompt and the conditions), the document classification use case document, and the review report that approved the output format. We can also show you that the system always displays the advisory sentence and requires confirmation before save. If you would like to see how it looks for a member of staff when they add a document, we can demonstrate that.

---

## 7. Summary

| Item | Content |
|------|---------|
| **Purpose** | To suggest section and document type when staff add a document; no content interpretation, no clinical judgement, no approval. |
| **Approved prompt** | Full prompt text in section 2; exact wording; no alteration without change control. |
| **Mandatory advisory language** | Two sentences (section 3); first is the AI’s closing sentence; second may be shown by the application. |
| **Usage conditions** | Only for single-document classification with human confirm before save; only by the system; not for auto-file or with care record as input; staff training required. |
| **Version** | v1.0 APPROVED; changes require re-approval as in section 5. |
| **Inspection** | Short explanation in section 6 for CQC; emphasises governed prompt, human control, accountability, and training. |

---

*This document is the official v1 APPROVED AI prompt and governance artefact for document classification. It must be retained for internal governance and regulatory scrutiny and used only in accordance with the usage conditions and change control set out above.*

*Document version: 1.0 APPROVED | Controlled document | Plain English only | No code.*
