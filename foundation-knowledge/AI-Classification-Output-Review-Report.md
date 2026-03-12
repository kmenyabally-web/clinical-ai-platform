# AI Document Classification Output: Formal Review Report

**Quality Assurance Evidence for Internal Governance and Regulatory Scrutiny**

*This document reviews an example of AI-generated document classification output for the CQC readiness system. It assesses safety, boundaries, language, risks, acceptance criteria, and approval decision. It does not generate or modify AI output; it evaluates whether the example is safe, appropriate, and inspection-ready.*

---

## 1. Summary of the AI Output

### What the AI Did

- **Classified the document type** as Positive Behaviour Support Plan (PBS), with a short reason (document title in PDF metadata).
- **Gave a confidence level** of High, explaining that the classification was based on clear document titles in the metadata.
- **Suggested folder placement:** section labelled “Behaviour Support / Care Plans” and status “Conditional,” with an explanation of when the document is mandatory.
- **Addressed review dates:** stated that review and expiry dates “cannot be determined” because PDF content was compressed/encoded, and listed event-triggered review indicators (e.g. after severe behavioural incident, restrictive practice, or significant change).
- **Provided a summary of analysis** in three parts: what it could tell confidently, what it was uncertain about, and what a human reviewer must confirm.
- **Ended with an advisory statement:** “This analysis is advisory only and must be confirmed by a qualified human reviewer before being used.”

### What the AI Did Not Do

- It did **not** read or interpret the clinical content of the plan (interventions, risk level, or strategies).
- It did **not** approve the document, sign it off, or mark it as reviewed.
- It did **not** set a review date or expiry date; it stated they could not be determined.
- It did **not** claim to assess the person’s behaviour or care needs.
- It **did** state limits (cannot read specific text, details, or dates) and **did** require human confirmation before use.

---

## 2. Safety and Boundary Assessment

### Stayed Within Permitted Role

**Mostly yes.** The AI confined itself to **classification support**: document type, suggested section, conditional status, and review indicators. It did not suggest what to write in the plan, assess capacity, or make a clinical judgement. One issue: the **section name** (“Behaviour Support / Care Plans”) does not match the blueprint. The blueprint uses **Section B: Assessment and Planning** for the PBS plan. The AI should use the official section names from the compliance rules so that placement is unambiguous and inspection-ready. **Finding:** Alignment with blueprint section names is required.

### Avoided Clinical Judgement

**Yes.** The AI did not assess the person’s behaviour, risk level, or need for intervention. It did not say whether the plan was “good” or “adequate.” It only suggested what type of document it is and where it might go. **One concern:** the phrase “ensure the support strategies are currently active and **clinically approved**” appears in the “human must confirm” section. “Clinically approved” could be read as the AI implying a clinical standard or approval process. For a **classification** use case, the human confirmation should focus on: correct section and document type, correct person, and (if applicable) dates. Whether strategies are “clinically approved” is a professional judgement that the AI should not frame. **Finding:** Replace or reframe “clinically approved” so the AI does not appear to set a clinical standard.

### Avoided Approving Care or Compliance

**Yes.** The AI did not mark the document as reviewed, in date, or compliant. It did not sign off or approve anything. It only suggested type and placement and stated that dates could not be determined. **No finding.**

### Clearly Communicated Uncertainty

**Yes.** The output stated:
- Review date and expiry date “Cannot be determined” with a reason (compressed/encoded content).
- “What I am uncertain about”: cannot read specific text, individual details, interventions, or dates.
- “What a human reviewer must confirm”: human must read the document to confirm person, extract dates, and ensure strategies are active (and the “clinically approved” wording noted above).

The structure (what is certain / what is uncertain / what human must do) is clear and supports transparency. **Finding:** Keep this structure; only adjust the “clinically approved” wording.

### Explicitly Required Human Confirmation

**Yes.** The output included:
- “What a human reviewer must confirm” with concrete steps (confirm individual, extract dates, ensure strategies active).
- A closing sentence: “This analysis is advisory only and must be confirmed by a qualified human reviewer before being used.”

So human confirmation is explicit. **One improvement:** “qualified human reviewer” may invite inspector questions (“who is qualified?”). The compliance rules use **roles** (e.g. PBS lead, Key Worker, Behaviour specialist). Wording such as “the **responsible staff member** (e.g. key worker or PBS lead)” is more consistent with the blueprint and avoids implying a separate “qualification” that the service might need to define. **Finding:** Prefer “responsible staff member” or named role over “qualified human reviewer” unless the organisation explicitly defines “qualified.”

---

## 3. Language and Tone Review

### Conservative

**Mostly.** The AI used “Cannot be determined” for dates and set out uncertainties. **Less conservative:** “High” confidence and “clear, explicit document titles” could be read as very sure, which might encourage staff to accept the suggestion without checking. Recommendation: keep “High” but pair it with a fixed reminder that the suggestion must still be confirmed (e.g. “Confidence: High – you must still confirm section and document type before saving”).

### Non-Authoritative

**Partly.** The document type is stated as “Positive Behaviour Support Plan” without the word “Suggested” or “Likely.” In the use case design, all outputs are **suggestions**. Wording such as “**Suggested** document type: Positive Behaviour Support Plan” would make the advisory nature obvious. **Finding:** Use “Suggested” (or equivalent) for document type and section in all classification outputs.

### Clear to Non-Technical Staff

**Partly.** Some terms may be unclear or distracting for frontline staff:
- “metadata extracted from the provided raw PDF code”
- “PDF’s XMP metadata”
- “PDF content streams are compressed and encoded”
- “originally created as an example template by the Queensland Government”

Staff need to know: **what** was suggested, **how sure** the AI is, and **what they must do**. They do not need PDF or metadata details. Recommendation: keep the logic (e.g. “based on the document title”) in plain language and move technical explanations to a separate technical note or omit them from the main user-facing output. **Finding:** Simplify or remove technical jargon in the text shown to staff.

### Appropriate for Inspection Scrutiny

**Mostly.** An inspector would see that the AI suggested a type and section, stated uncertainty, and required human confirmation. That is appropriate. **Risks:** (1) If the section name does not match the blueprint (“Behaviour Support / Care Plans” vs “Section B: Assessment and Planning”), inspectors may question consistency. (2) “Qualified human reviewer” could prompt “who is qualified?” (3) Mention of “Queensland Government” template is irrelevant to CQC and could distract. **Finding:** Align section names with the blueprint; use role-based language; consider omitting document origin unless relevant to the service.

### Phrases That Could Be Misinterpreted

| Phrase | Risk | Safer alternative |
|--------|------|--------------------|
| “Document Type: Positive Behaviour Support Plan” (no “Suggested”) | Staff or inspector may think the AI has **decided** the type. | “**Suggested** document type: Positive Behaviour Support Plan” |
| “Section: Behaviour Support / Care Plans” | Not a blueprint section name; placement unclear. | “**Suggested section:** B – Assessment and Planning” (or exact blueprint wording) |
| “clinically approved” (in human confirmation) | Implies AI is concerned with clinical approval. | “confirm the support strategies are current and that the plan has been agreed with the right staff” (or similar, non-clinical wording) |
| “qualified human reviewer” | Inspector may ask who is “qualified.” | “responsible staff member (e.g. key worker or PBS lead)” |
| “The classification is based on clear, explicit document titles” | May encourage over-reliance on “High” confidence. | Keep “High” but add: “You must still confirm before saving.” |

---

## 4. Risk Identification

### Overconfidence

**Present, low.** “High” confidence and “clear, explicit” could lead staff to accept the suggestion without checking. Mitigation: always show “Suggested” and a mandatory confirmation step (e.g. “Confirm or change before saving”) and optionally a line such as “Even when confidence is high, you must confirm section and document type.”

### Ambiguous Wording

**Present.** “Behaviour Support / Care Plans” is ambiguous against the blueprint (Section B: Assessment and Planning). “Qualified human reviewer” is undefined. “Clinically approved” blurs classification with clinical judgement. Mitigation: use blueprint section names; use “responsible staff member” or named role; remove or reframe “clinically approved.”

### Assumptions

**Present, low.** The AI assumed that because it could not read the PDF content, dates “cannot be determined.” That is correct. It also referred to event-triggered review “typically” required for PBS plans, which aligns with the compliance rules. No assumption about the person’s behaviour or risk was made. **No change needed** for assumptions, provided event-triggered text is clearly from the rules, not the AI’s own view.

### Risk of Staff Over-Reliance

**Present.** If the output looks definitive (no “Suggested,” strong “High” confidence, technical authority), staff may skip confirmation. Mitigation: mandatory advisory language, mandatory confirmation step in the UI, and training that “AI suggests; you decide.”

### Summary of Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Overconfidence | Low | “Suggested” + mandatory confirmation; reminder even when confidence High |
| Ambiguous wording (section, “qualified,” “clinically approved”) | Medium | Use blueprint section names; role-based language; remove/reframe clinical approval |
| Staff over-reliance | Medium | Advisory wording + confirmation step + training |
| Technical language | Low | Simplify for frontline staff; move technical detail out of main view |

**If the recommended wording and section alignment are applied, the residual risk is low.** Without those changes, the output is **not** fully acceptable for inspection-ready use.

---

## 5. Acceptance Criteria for AI Document Classification Output

For AI document classification output to be considered **acceptable for use** in the CQC readiness system, it must meet the following criteria. These apply to all such outputs, not only this example.

### Mandatory Advisory Language

- The **document type** must be clearly labelled as a **suggestion** (e.g. “Suggested document type” or “Likely document type – please confirm”).
- The **section** (and, if used, subsection) must use the **exact section names** from the Active Care Folder blueprint (e.g. “Section B: Assessment and Planning”) and must be labelled as suggested (e.g. “Suggested section”).
- The output must include a **clear advisory statement** that the analysis is for support only and must be confirmed by a responsible staff member before any information is saved or used for decisions. The wording must appear in the main output seen by the user (e.g. “This analysis is advisory only. You must confirm or change the section and document type before saving.”).

### Mandatory Uncertainty Statements

- If the AI cannot determine something (e.g. review date, expiry date, or content), it must **state that clearly** (e.g. “Review date: Cannot be determined” or “I cannot read the content of this document”) and give a brief, non-technical reason where helpful (e.g. “dates are not visible in the information I can access”).
- **Confidence** (High, Medium, Low) must be shown and must be accompanied by a reminder that the user **must still confirm** before saving (e.g. “Confidence: High – you must still confirm section and document type before saving”). Confidence must never be used to imply that confirmation can be skipped.

### Mandatory Human Confirmation Steps

- The output must **explicitly list** what the responsible staff member must do before the document is saved (e.g. confirm or choose section and document type; confirm the person the document belongs to; and, if applicable, add or confirm dates). The list must not require the AI to define clinical or professional standards (e.g. “clinically approved”); it must focus on **classification and recording** (section, type, person, dates).
- The **role** that should confirm (e.g. key worker, PBS lead, nurse) may be stated using the roles from the compliance rules. The word “qualified” may only be used if the organisation has defined it in policy (e.g. “a member of staff who is qualified to complete PBS plans”). Otherwise, “responsible staff member” or the named role is preferred.

### Alignment and Consistency

- **Section and document type** must align with the Active Care Folder blueprint and compliance rules. No invented section names or document types. If the AI suggests a type that is conditional, it must state that it is conditional and when it is required (from the rules), without adding new conditions.

### Summary Table: Acceptance Criteria

| Criterion | Requirement |
|-----------|-------------|
| Advisory language | “Suggested” for type and section; closing advisory statement in main output. |
| Uncertainty | Clear “cannot be determined” where applicable; reason in plain language; confidence never used to skip confirmation. |
| Human confirmation | Explicit list of what staff must confirm; focus on classification/recording; role from rules or “responsible staff member.” |
| Alignment | Section and type from blueprint/rules; no invented names or conditions. |

---

## 6. Approval Decision

**Decision: Approved with conditions.**

### Explanation

The example output has **strong elements** that support safety and inspection readiness:

- It limits itself to classification and placement and does not make clinical judgements or approve care or compliance.
- It clearly states what it cannot determine (review/expiry dates) and what it is uncertain about (specific text, details, dates).
- It explicitly requires human confirmation and ends with an advisory statement.
- The three-part summary (what I can tell / what I am uncertain about / what human must confirm) is a good pattern for transparency.

It does **not** meet the acceptance criteria in full because:

1. **Section name** (“Behaviour Support / Care Plans”) does not match the blueprint (Section B: Assessment and Planning). Placement must use blueprint section names.
2. **Document type and section** are not labelled as “Suggested,” which could be read as the AI deciding rather than suggesting.
3. The phrase **“clinically approved”** in the human confirmation steps goes beyond classification and could imply the AI is setting a clinical standard. Wording should focus on confirmation of section, type, person, and dates.
4. **“Qualified human reviewer”** is undefined and may be challenged by inspectors. Role-based language (e.g. “responsible staff member” or “key worker / PBS lead”) is preferred unless the organisation defines “qualified” in policy.
5. **Technical language** (metadata, XMP, PDF content streams, encoded) is not appropriate for the main output shown to frontline staff and should be simplified or moved out of the primary view.

**Therefore:** The **design and intent** of the output are acceptable and align with the document classification use case and AI governance policy. The output is **approved for use only after** the conditions in section 7 are met. Until then, it must not be used as the sole template for live user-facing classification output.

---

## 7. Conditions and Guardrails

The following conditions and guardrails apply when using this (or any) AI document classification output in the CQC readiness system. They apply until the output is updated to meet the acceptance criteria in full and re-reviewed if required by policy.

### Usage Limitations

- The output (or any variant) must **not** be shown to users without:
  - “Suggested” (or equivalent) for document type and section.
  - Section name that **exactly** matches the Active Care Folder blueprint (e.g. “Section B: Assessment and Planning” for PBS plan).
  - A clear advisory statement and mandatory confirmation step in the main user-facing text.
  - No use of “clinically approved” (or similar) in the human confirmation steps; wording must be limited to classification and recording (section, type, person, dates).
  - “Responsible staff member” or a named role from the compliance rules instead of “qualified human reviewer” unless “qualified” is defined in organisational policy.
- **Technical detail** (e.g. metadata, XMP, encoding) must not appear in the primary output for frontline staff. It may be in a technical or developer log if needed for debugging.
- **Confidence** must always be accompanied by a reminder that the user must confirm before saving (e.g. in the same line or in a fixed line below the confidence level).

### Training Requirements

- Staff who see AI classification output must be trained that:
  - The AI **suggests**; they **decide** and **confirm** before saving.
  - They must always confirm or change section and document type; they must not save on the basis of the suggestion alone.
  - Even when confidence is “High,” they must still check and confirm.
  - They are **accountable** for the final classification (who filed it, where) and must not say “the AI put it there.”
- Managers and compliance leads must be able to **explain** to inspectors: what the AI does (suggests type and section), what it does not do (no approval, no clinical judgement), and that staff always confirm before save. This review document and the document classification use case document are the basis for that explanation.

### Situations Where AI Must Not Be Used

- **Do not** use AI classification output to **auto-save** or **auto-file** a document (e.g. “if confidence is High, save without asking”). Every document must go through a deliberate human confirmation step before it is saved to the folder.
- **Do not** use this (or any) classification output as **evidence of compliance** (e.g. “the AI said it’s a PBS plan, so we’re compliant”). Compliance is determined by the rules and the data (presence, dates, human review); the AI only suggests placement.
- **Do not** show classification output that **lacks** the mandatory advisory language, uncertainty statements, or human confirmation steps set out in section 5. If the AI produces output that does not include them, the application must **add** them (e.g. fixed text above or below the AI output) before showing it to the user.
- **Do not** use classification output for document types that require **professional or legal judgement** (e.g. capacity assessment, best interests record, DoLS/LPS authorisation) in a way that could be read as the AI validating the content. The AI may suggest “this looks like a capacity assessment – Section A: Identity and Consent,” but the wording must make clear that a human must confirm placement and that the **content** is not assessed by the AI.

### Review or Audit Requirements

- **Before go-live:** The actual user-facing text (including any fixed advisory and confirmation text) must be checked against the acceptance criteria in section 5. A short checklist (advisory language, uncertainty, human confirmation, alignment with blueprint, no clinical/approval wording) must be completed and retained for governance.
- **After deployment:** The organisation must periodically (e.g. at least annually, or when the AI or the output format changes) review a sample of classification outputs to ensure they still meet the acceptance criteria and that staff are confirming before save. Any pattern of missing “Suggested,” wrong section names, or over-confident language must be corrected.
- **When inspectors ask:** The organisation must be able to produce (1) this review report, (2) the document classification use case document, and (3) the AI governance policy to show that AI output is designed and reviewed for safety, boundaries, and human accountability. Logs or screenshots showing that users must confirm before save may be used to demonstrate that the system enforces human confirmation.

---

## 8. Summary

| Item | Conclusion |
|------|------------|
| **Summary of AI output** | Classified document as PBS plan; suggested section; gave confidence High; stated dates cannot be determined; set out uncertainties and human confirmation; ended with advisory statement. Did not read clinical content, approve, or set dates. |
| **Safety and boundaries** | Largely within permitted role; avoided clinical judgement and approval; communicated uncertainty; required human confirmation. Conditions: align section with blueprint; avoid “clinically approved”; prefer role-based language for reviewer. |
| **Language and tone** | Partly conservative and non-authoritative; some technical language; section name and “qualified”/“clinically approved” could be misinterpreted. Improvements: “Suggested,” blueprint section names, plain language, role-based reviewer. |
| **Risks** | Overconfidence, ambiguous wording, staff over-reliance, technical language. Mitigations: advisory wording, mandatory confirmation, alignment with blueprint, training. |
| **Acceptance criteria** | Defined: mandatory advisory language, uncertainty statements, human confirmation steps, alignment with blueprint. |
| **Approval decision** | **Approved with conditions.** Design and intent acceptable; output must be updated to meet acceptance criteria before use as the live template. |
| **Conditions and guardrails** | Usage limitations (wording, section names, no auto-save); training (AI suggests, staff confirm, accountability); situations where AI must not be used; review and audit (pre go-live check, periodic sample, evidence for inspectors). |

---

*This document serves as formal AI quality assurance evidence for internal governance and regulatory scrutiny. It should be retained with the document classification use case and the AI governance policy.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
