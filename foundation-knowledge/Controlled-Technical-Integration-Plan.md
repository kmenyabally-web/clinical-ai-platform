# Controlled Technical Integration Plan: Digital CQC Readiness System with AI-Assisted Features

**Official Deployment and Integration Plan for Live Care Environments**

*This document defines how the CQC readiness system and its AI-assisted features are introduced into regulated care services. It describes the philosophy, phases, entry and exit criteria, access and training, safeguards and rollback, and inspection readiness. It is not an implementation guide: it does not contain code, APIs, or configuration. It is the official plan for safe, governed deployment.*

---

## 1. Integration Philosophy

The overall approach to introducing this technology into regulated care services is guided by three principles. They apply to every phase and every decision about what to enable and when.

---

### Safety Before Speed

- **Meaning:** The system is introduced in a way that keeps people safe and keeps evidence accurate. No feature is turned on for all users or all services until the organisation is satisfied that it works as designed, that staff understand it, and that it does not create new risks (for example, wrong filing, over-reliance on AI, or loss of human accountability).
- **In practice:** Features are rolled out in stages. Each stage is given time to run before the next one starts. The organisation does not skip stages or compress them to meet a deadline if that would mean skipping checks or training. If something is wrong or unclear, the organisation pauses and fixes it before moving on.
- **Why it matters for regulated care:** CQC and the public expect care to be safe. A system that is rolled out too quickly and then causes errors (for example, documents in the wrong place, or staff trusting AI when they should check) undermines that. Safety before speed protects both the person using the service and the service’s reputation and rating.

---

### Human Control Before Automation

- **Meaning:** At every stage, humans remain in control. The system supports staff; it does not replace their decisions. Automation (for example, AI suggesting where to file a document) is only added when the organisation has confirmed that (1) the feature is designed so that a human must confirm or act before anything is final, and (2) staff are trained and able to use it in that way. Nothing is fully automated in the sense of “the system does it and no one checks.”
- **In practice:** Phase 1 has no AI; staff do everything manually in the digital system. Phase 2 adds AI suggestion for classification, but the staff member must confirm or change before save. Phase 3 adds AI gap detection, but only for managers to see and act on; the AI does not change status or close gaps by itself. Phase 4 may expand who sees AI features, but the rule stays: AI suggests or highlights; humans decide and confirm.
- **Why it matters for regulated care:** Inspectors expect the service to be able to say “a person decided this” and “a person is responsible.” If the system automated decisions (for example, auto-filing or auto-marking as compliant), the service could not show that. Human control before automation keeps accountability clear and inspection-ready.

---

### Evidence Before Scale

- **Meaning:** The organisation does not roll out a feature to all services, all staff, or all people until it has evidence that the feature works as intended and that staff are using it correctly. Evidence might include: the feature has been tested in a controlled way; a pilot group has used it for a set period without serious issues; training has been delivered and understanding checked; and any problems have been fixed or contained.
- **In practice:** Each phase has entry and exit criteria. The organisation must be able to show that the criteria for the **next** phase are met before it moves on. For example, before AI classification is rolled out to all staff (Phase 2), the organisation must have evidence that the manual digital system (Phase 1) is in place, that staff are using it, and that the AI feature has been approved and tested in line with the AI governance policy. Scaling (more users, more services) happens only when the evidence supports it.
- **Why it matters for regulated care:** Rolling out at scale without evidence risks repeating the same problem everywhere (for example, wrong use of AI or confusion about who confirms). Evidence before scale limits harm if something is wrong and gives the organisation a clear story for inspectors: “we introduced this in stages and only expanded when we had evidence it was safe and understood.”

---

### Summary

| Principle | In one sentence |
|-----------|------------------|
| **Safety before speed** | No feature is fully rolled out until the organisation is satisfied it is safe and staff understand it; stages are not skipped for speed. |
| **Human control before automation** | Humans always confirm or act before anything is final; AI only suggests or highlights. |
| **Evidence before scale** | The organisation has evidence that a phase is working before it moves to the next or scales up. |

---

## 2. Phased Integration Stages

The system is introduced in four phases. Each phase adds capability in a controlled way. The order is fixed: the organisation does not jump to a later phase without completing the previous one and meeting the exit criteria.

---

### Phase 1: Manual Digital System (No AI)

**What is enabled**

- The full digital CQC readiness system **without** any AI-assisted features. Staff use the system to:
  - Create and maintain the Active Care Folder for each person (eight sections, document types from the blueprint).
  - Enter and update care content (care plans, risk assessments, daily notes, medication, consent, incidents, and so on).
  - See compliance status (in date, due, overdue; Green, Amber, Red) as calculated by the system from the rules and the data.
  - Receive reminders (for example, care plan review due) and complete reviews and sign-offs.
  - Use the emergency summary, inspection view, service compliance view, and audit trail.
- All classification (where to put a document) and all gap detection (what might be missing or overdue) are done **by staff** using the system. The system applies the rules and shows status; staff decide and act.

**What is explicitly not enabled**

- No AI document classification. When staff add a document, they choose the section and document type from the list themselves; there is no AI suggestion.
- No AI compliance gap detection. Managers and staff see compliance status (from the rules and data) and their task lists; there is no AI-generated list of “potential gaps” or AI-written explanations.
- No other AI-assisted features. Phase 1 is purely rule-based and human-operated.

**Why this order matters**

- Phase 1 establishes that the **core** system works: folder structure, compliance rules, status, reminders, and audit. If the organisation cannot run Phase 1 reliably (for example, staff do not use it, or the rules are wrong), adding AI would add risk without a solid base. Inspectors can already see a complete, rule-based digital folder and compliance view. Phase 1 also gives the organisation a **baseline**: when AI is added later, they can compare behaviour and outcomes to “how it worked without AI” and detect any new problems.

---

### Phase 2: AI-Assisted Classification (Controlled Use)

**What is enabled**

- Everything in Phase 1, plus:
  - **AI document classification.** When a staff member adds a document (PDF, scan, or image), the system may send it to the AI with the approved prompt. The AI returns a **suggestion** for document type and section. The staff member **must** confirm or change the suggestion before the document is saved. The suggestion is clearly labelled (e.g. “Suggested document type,” “Suggested section”) and the mandatory advisory language is shown. No document is ever saved on the basis of the AI alone.
- Access to the classification feature is **controlled**: the organisation may start with a single service, a single ward, or a defined group of staff (e.g. one team) and only expand when the exit criteria for Phase 2 are met.

**What is explicitly not enabled**

- AI classification is **not** used to auto-file (save without human confirm). The system does not allow “accept suggestion and save” without a deliberate confirm step.
- AI **gap detection** is still not enabled. Managers and staff still rely on the rule-based status and task lists from Phase 1.
- No other AI features (e.g. summarisation, content interpretation) are added. Only the approved document classification use case is in use.

**Why this order matters**

- Classification is the **first** AI use case because it is bounded (suggest section and type only), reversible (staff can override), and low-risk when human confirmation is mandatory. Introducing it after Phase 1 means the folder and rules are already in place; the AI only helps with one step (where to file). The organisation can observe whether staff confirm or over-rely, whether suggestions are helpful or wrong, and whether the mandatory language and audit (who confirmed) are working. If classification were introduced before Phase 1, there would be no stable folder structure or rules to align with.

---

### Phase 3: AI-Assisted Gap Detection (Manager-Only)

**What is enabled**

- Everything in Phase 1 and Phase 2, plus:
  - **AI compliance gap detection.** The system may use AI to highlight **potential** gaps (for example, missing documents, out-of-date reviews, possible mismatch between incidents and risk assessment updates) and to provide plain-English explanations (based on rules and data). The list and explanations are **advisory**: the AI does not decide compliance or change status.
  - Access to the gap detection output is **restricted to managers and compliance leads** (and optionally senior staff in a defined role). Frontline staff do **not** see the AI-generated gap list in this phase. They continue to use the rule-based status and their task list from Phase 1. Managers use the AI gap list to prioritise and to brief staff (“please check these areas”); managers remain responsible for deciding what is a real gap and what to do.
- AI classification (Phase 2) may now be rolled out to **all** staff who add documents, if the exit criteria for Phase 2 have been met. If not, Phase 2 remains in controlled rollout while Phase 3 starts for managers only.

**What is explicitly not enabled**

- Gap detection is **not** shown to frontline staff in this phase. The organisation may later expand (Phase 4) once it has evidence that managers are using it correctly and that the feature does not confuse or replace human judgement.
- The AI does **not** set or change compliance status, close gaps, or escalate to regulators. It only suggests areas for review. Humans confirm, dismiss, or act.
- No new AI use cases (e.g. summarisation, content analysis) are added. Only classification and gap detection are in use, and gap detection is manager-only.

**Why this order matters**

- Gap detection can influence **prioritisation** and **governance** (what managers attend to first). Giving it first to **managers** ensures that (1) the feature is used in a way that supports oversight rather than replacing it, and (2) any misuse or misunderstanding is contained. Frontline staff are not exposed to an AI “list of gaps” until the organisation has seen how managers use it and has decided that showing it to staff would help without causing over-reliance or confusion. Introducing gap detection before classification would be wrong: classification is simpler and lower risk, so it comes first.

---

### Phase 4: Expanded but Governed Use

**What is enabled**

- Everything in Phase 1, 2, and 3, plus:
  - **Expanded access** to AI-assisted features, as decided by the organisation and documented in policy. For example:
    - AI gap detection may be made visible to **key workers** or **care co-ordinators** (in addition to managers) so they can see “suggested areas for review” for their own people. The output remains advisory; staff still confirm or dismiss.
    - AI classification may be in use for **all** services and **all** staff who add documents, with the same confirm-before-save rule.
  - Any **further AI use cases** that have been approved under the AI governance policy (for example, a second or third use case that has passed design and review). Each new use case is subject to the same principles: human in the loop, advisory only, and no clinical or compliance decisions by the AI.
- “Expanded” does **not** mean “no rules.” All AI features remain governed: approved prompts, mandatory advisory language, human confirmation, and no auto-decision. Phase 4 is “more people and more features” within the same guardrails.

**What is explicitly not enabled**

- **No** AI feature may be used in a way that breaches the AI governance policy (for example, AI sign-off, AI compliance verdict, or AI clinical judgement). If a new use case is added, it must have been through the same design, review, and approval process as document classification and gap detection.
- **No** removal of human confirmation or mandatory advisory language. Even at full rollout, staff must confirm classification and managers or staff must confirm or dismiss gap findings. The system does not auto-save or auto-close on the basis of AI.
- **No** use of AI for document types or tasks that the policy forbids (e.g. capacity assessment content, approval of care plans, or hiding compliance gaps).

**Why this order matters**

- Phase 4 is the **steady state** of “governed AI in use.” Reaching it only after Phases 1–3 means the organisation has (1) a working manual system, (2) evidence that AI classification is safe and used correctly, and (3) evidence that managers use gap detection appropriately. Expansion is then controlled and documented rather than a “big bang” that could overwhelm staff or hide problems.

---

### Summary: Phases at a Glance

| Phase | What is enabled | What is not enabled | Why this order |
|-------|------------------|----------------------|-----------------|
| **1: Manual digital (no AI)** | Full system; all classification and gap awareness by staff using rules and status. | No AI classification; no AI gap detection. | Establishes core system and baseline before any AI. |
| **2: AI classification (controlled)** | AI suggests document type and section; staff confirm before save; controlled rollout. | No auto-file; no AI gap detection; no other AI. | First AI use case is bounded and reversible; builds on Phase 1. |
| **3: AI gap detection (manager-only)** | AI highlights potential gaps for managers; managers decide and act; classification may roll out to all. | Gap list not shown to frontline; AI does not set status or close gaps. | Managers use gap detection first; frontline protected until evidence supports expansion. |
| **4: Expanded governed use** | Wider access to gap detection (e.g. key workers); any further approved AI use cases; all within same guardrails. | No breach of policy; no removal of human confirm or advisory language; no forbidden use. | Steady state only after evidence from Phases 1–3. |

---

## 3. Entry and Exit Criteria

For each phase, the organisation must be able to show that the **entry** criteria are met before starting the phase, and that the **exit** criteria are met before moving to the next. Reasons to **pause or stop** progression are also defined.

---

### Phase 1: Manual Digital System (No AI)

**Entry criteria (what must be true before starting Phase 1)**

- The organisation has **decided** to use the digital CQC readiness system and has assigned **ownership** (e.g. a lead, a steering group) for deployment and governance.
- The **core system** (folder structure, compliance rules, status, reminders, audit) is **available** and has been tested in a way that confirms it matches the blueprint and compliance rules. Any test or pilot has shown that staff can use it without critical errors.
- **Training or guidance** for Phase 1 is ready: staff know how to use the folder, how to add documents (choosing section and type themselves), how to complete reviews, and where to find compliance status and emergency information. Managers know how to use the service compliance view and inspection view.
- **One service** (or one defined area, e.g. one ward) is chosen as the first to go live. The organisation has not committed to rolling out to all services on day one.

**Exit criteria (evidence needed to move to Phase 2)**

- Phase 1 has been **in use** in at least one service for a defined period (e.g. a minimum of 4–8 weeks, or as set by the organisation) so that there is real usage and feedback.
- **Evidence** that the manual system is working: for example, care folders are being used, documents are being filed in the right sections, reviews are being completed and recorded, and compliance status and reminders are functioning. Evidence may take the form of usage data, spot checks, or manager and staff feedback.
- **No critical issues** that would make it unsafe to add AI: for example, the folder structure or rules are not fundamentally wrong, staff are not bypassing the system, and audit trail (who did what, when) is working.
- The **AI document classification** feature has been **approved** for use (approved prompt, mandatory advisory language, and review report or equivalent) and is **ready** to be used in a controlled way (e.g. one service or one user group). Staff who will use it have been trained that AI suggests and they confirm.

**Reasons to pause or stop progression**

- Phase 1 is not stable: staff cannot use the system reliably, or the rules or status are wrong and causing confusion or wrong decisions. Progression to Phase 2 is paused until Phase 1 is fixed and re-tested.
- Critical safety or data issues in Phase 1 (e.g. wrong information in folders, loss of audit trail). Progression is paused until the cause is understood and fixed.
- The organisation decides to stop the deployment (e.g. change of strategy or provider). Progression stops; the organisation may keep Phase 1 in use or plan to decommission in a controlled way.

---

### Phase 2: AI-Assisted Classification (Controlled Use)

**Entry criteria (what must be true before starting Phase 2)**

- **Phase 1 exit criteria** are met: the manual system has been in use, evidence shows it is working, and there are no critical issues that make it unsafe to add AI.
- The **approved prompt** and **mandatory advisory language** for document classification are in place and the feature is configured so that (1) staff always see “Suggested” and the advisory sentence(s), and (2) no document can be saved without a human confirmation step.
- **Training** for Phase 2 is done for the staff who will use classification: they know that the AI suggests, they must confirm or change before saving, and they are accountable for the final choice. They know where to find the suggestion and how to override it.
- A **controlled rollout** plan is defined: which service(s) or which group(s) of staff will use AI classification first, and for how long, before any decision to expand.

**Exit criteria (evidence needed to move to Phase 3 or to expand Phase 2)**

- AI classification has been in use in the controlled group for a defined period (e.g. 4–8 weeks) with **no serious issues**: no pattern of wrong filing that could not be corrected, no pattern of staff accepting the suggestion without checking, and no breach of the “confirm before save” rule.
- **Evidence** that staff are using it as intended: for example, a sample of classifications shows that staff sometimes accept and sometimes override the suggestion, and that overrides are recorded where the system supports it. Managers or compliance can describe how the feature works and that humans are in control.
- The organisation is **satisfied** that it is safe to (a) roll out AI classification to more staff or services (if not yet done), and (b) introduce AI gap detection for managers (Phase 3). Satisfaction may be documented in a short report or sign-off.

**Reasons to pause or stop progression**

- **Over-reliance or misuse:** Staff are routinely accepting the AI suggestion without checking, or the “confirm before save” step is being bypassed. Phase 2 rollout is paused; training is reinforced and, if needed, the feature is restricted (e.g. fewer users) until behaviour is corrected.
- **Repeated or serious wrong suggestions** that lead to documents in the wrong place and are not being caught by staff. The organisation pauses expansion and investigates (e.g. prompt, data, or training). The feature may be limited to the current group until fixed.
- **Inspector or regulator concern** about AI use (e.g. “who decides where the document goes?”). The organisation pauses new rollout until it can demonstrate human control and accountability (using the approved prompt, training, and audit). It does not remove the feature from existing users unless the regulator requires it.

---

### Phase 3: AI-Assisted Gap Detection (Manager-Only)

**Entry criteria (what must be true before starting Phase 3)**

- **Phase 2** is in place: AI classification is in controlled use (or fully rolled out) and the Phase 2 exit criteria have been met so the organisation has evidence that classification is safe and used correctly.
- The **AI gap detection** feature has been **designed and approved** in line with the AI governance policy and the compliance gap detection use case: it only highlights potential gaps, gives rule-based explanations, and does not set status or close gaps. Managers (and only managers, in this phase) will see the output.
- **Training** for managers: they understand that the AI list is advisory, that they must confirm or dismiss findings, and that they are responsible for prioritising and acting. They know they must not treat the AI list as the only source of truth or as a compliance verdict.
- **Access** is restricted so that only managers (and compliance leads, if defined) can see the AI gap detection output. Frontline staff do not see it in this phase.

**Exit criteria (evidence needed to move to Phase 4)**

- AI gap detection has been in use by managers for a defined period (e.g. 4–8 weeks) with **no serious issues**: no evidence that managers are treating the AI list as final, no evidence that the AI is hiding or softening real gaps, and no breach of the “advisory only” design.
- **Evidence** that managers are using it as intended: they confirm or dismiss findings, they use the list to prioritise and brief staff, and they can explain to an internal audit or compliance check how the feature works and that humans decide. Optional: sample of “confirmed” vs “dismissed” findings and reasons.
- The organisation is **satisfied** that it is safe to expand access (e.g. to key workers or care co-ordinators) or to add further approved AI use cases, within the same guardrails. Satisfaction may be documented.

**Reasons to pause or stop progression**

- **Misuse by managers:** Managers treat the AI gap list as a compliance verdict or auto-close gaps without human action. Rollout is paused; training and access are reviewed.
- **Wrong or misleading AI output** (e.g. many false positives or false negatives) that affects prioritisation or causes the service to miss real gaps. The organisation pauses expansion and investigates; the feature may be limited or refined before Phase 4.
- **Regulator concern** about who decides what is a gap. The organisation pauses expansion until it can show that managers confirm or dismiss and that the AI only advises.

---

### Phase 4: Expanded but Governed Use

**Entry criteria (what must be true before starting Phase 4)**

- **Phase 3 exit criteria** are met: AI gap detection has been used by managers for the required period with no serious issues and with evidence of correct use.
- Any **expansion** (e.g. gap detection to key workers, or a new AI use case) has been **approved** under the AI governance policy and, where applicable, has a design document and review. The same principles apply: human in the loop, advisory only, no clinical or compliance decisions by the AI.
- **Training and access** are updated: any new role that gains access is trained, and the organisation has defined who may see or use each AI feature. There is no “everyone sees everything” without training and governance.

**Exit criteria**

- Phase 4 is the **steady state**. There is no mandatory “exit” to a further phase. The organisation may later add more use cases or more access, but each addition is a **new decision** with its own entry criteria (design, approval, training, controlled rollout) and does not require a new “Phase 5” unless the organisation chooses to define one.

**Reasons to pause or roll back**

- **Breach of policy:** Any AI feature is used in a way that breaches the AI governance policy (e.g. AI used to sign off, to decide compliance, or to hide gaps). The organisation pauses the affected feature, investigates, and reinforces controls. It may roll back access (e.g. gap detection back to manager-only) until behaviour is corrected.
- **Serious incident** (safety, data, or regulatory) linked to AI use. The organisation pauses or disables the relevant feature, contains the incident, and does not re-enable until the cause is addressed and safeguards are strengthened.
- **Regulator direction** to limit or remove an AI feature. The organisation complies and documents the change; it may keep the rest of the system (Phase 1 and any unaffected AI features) in use.

---

### Summary: Entry, Exit, and Pause

| Phase | Entry (before starting) | Exit (before next phase) | Pause or stop |
|-------|---------------------------|---------------------------|----------------|
| **1** | Ownership; core system ready and tested; training ready; first service chosen. | Manual system in use for set period; evidence it works; no critical issues; AI classification approved and ready. | Phase 1 unstable; critical issues; decision to stop deployment. |
| **2** | Phase 1 exit met; approved prompt and confirm-before-save; training; controlled rollout plan. | Classification in use for set period; no serious issues; evidence of correct use; organisation satisfied. | Over-reliance; serious wrong suggestions; regulator concern. |
| **3** | Phase 2 exit met; gap detection designed and approved; manager training; access restricted. | Gap detection in use by managers for set period; no serious issues; evidence of correct use; organisation satisfied. | Misuse by managers; wrong AI output; regulator concern. |
| **4** | Phase 3 exit met; any expansion approved; training and access updated. | N/A (steady state). | Policy breach; serious incident; regulator direction. |

---

## 4. User Access and Training

### Which Roles Gain Access at Each Phase

| Phase | Who has access to what |
|-------|------------------------|
| **Phase 1** | **All** staff who use the system (frontline, key workers, nurses, managers, compliance leads) have access to the **manual** system: folder, sections, documents, compliance status, reminders, emergency summary, inspection view, service compliance, audit. No one has access to AI features. |
| **Phase 2** | **Controlled group first:** only the service(s) or staff group(s) chosen for Phase 2 see the **AI classification** suggestion when they add a document. They see “Suggested” type and section and must confirm before save. **Other** staff (if any) still use Phase 1 only (manual choice of section and type). Once Phase 2 exit criteria are met, the organisation may extend classification to **all** staff who add documents. |
| **Phase 3** | **Managers and compliance leads** (and any role the organisation defines as “manager” for this purpose) see the **AI gap detection** output (potential gaps, explanations, severity). **Frontline staff and key workers** do **not** see it in Phase 3; they continue to use rule-based status and tasks. **Classification** (Phase 2) may now be for all staff if exit criteria are met. |
| **Phase 4** | **Expanded access** as decided by the organisation: for example, **key workers** or **care co-ordinators** may also see AI gap detection for their people, with the same advisory wording and confirm/dismiss behaviour. **All** AI features remain restricted to roles that have been trained and that the organisation has defined in policy. |

### What Training or Guidance Is Required

- **Phase 1:** All users need training or guidance on: how to use the folder (eight sections, document types), how to add documents and choose section and type, how to complete reviews and sign-offs, where to find compliance status and reminders, and where to find the emergency summary and inspection view. Managers need additional guidance on the service compliance view and how to prepare for inspection.
- **Phase 2:** Staff who will use AI classification need: (1) that the AI **suggests** and they **must confirm or change** before saving; (2) that they are **accountable** for the final classification; (3) how to **override** the suggestion (choose a different section or type from the list); (4) that they must **never** save without checking, even when confidence is high. Training should use the approved prompt document and the mandatory advisory language so staff see the same wording they will see in the system.
- **Phase 3:** Managers (and compliance leads) who will see AI gap detection need: (1) that the list is **advisory** and they **confirm or dismiss** each finding; (2) that the AI does **not** decide compliance or change status; (3) how to use the list to **prioritise** and **brief staff**; (4) that they must **not** treat the AI list as the only source of truth or as a compliance verdict. They should be able to explain to an inspector how the feature works and that humans decide.
- **Phase 4:** Any **new** role that gains access to an AI feature (e.g. key workers seeing gap detection) must receive the **same** training as the role that had it first (e.g. managers). Training is updated whenever access is expanded or a new use case is added.

### How Staff Understanding Is Checked

- **Before go-live for each phase:** The organisation may use a short **check** (e.g. quiz, scenario, or discussion) to confirm that staff understand: for Phase 1, how to file a document and where to find status; for Phase 2, that they must confirm before save and that they are accountable; for Phase 3, that managers confirm or dismiss and that the AI does not decide. Staff who will use the feature should not go live until they have completed the training and the check (or the organisation has waived the check with a reason recorded).
- **After go-live:** **Spot checks** or **audits** (e.g. sample of classifications: did staff confirm or override? sample of gap findings: did managers confirm or dismiss?) help the organisation see whether behaviour matches the design. **Feedback** from staff and managers (e.g. “we don’t understand when to override”) is used to improve training or guidance. **Incidents or near-misses** (e.g. document filed in wrong place, or gap missed) are reviewed to see if they are linked to misunderstanding of the AI; if so, training or the feature is adjusted.

---

## 5. Safeguards and Rollback

### How Issues Are Detected

- **Usage and behaviour:** The organisation (or the system) may review how the AI is used: for classification, how often the suggestion is accepted vs overridden, and whether there are patterns (e.g. one user always accepts without checking). For gap detection, how often findings are confirmed vs dismissed and whether reasons are recorded. Unusual patterns (e.g. no overrides, or all findings dismissed without reason) can trigger a closer look.
- **Outcomes:** Spot checks or audits of the **folder** (e.g. are documents in the right section? are gaps being closed?) and of **compliance status** (e.g. does the rule-based status match what inspectors would see?) help detect if the AI or its use is leading to wrong filing or missed gaps.
- **Staff and manager feedback:** Complaints, questions, or reports of confusion (“the AI said X but I think it’s Y”) or of over-reliance (“we just accept what it says”) are logged and reviewed. They are used to decide whether to reinforce training, change the feature, or pause rollout.
- **Incidents and regulator feedback:** Any **safety incident**, **data incident**, or **feedback from CQC or another regulator** that relates to the system or to AI use is investigated. If the cause is linked to the AI (e.g. wrong suggestion, or staff misunderstanding), the organisation decides whether to pause, restrict, or change the feature.

### How AI Features Can Be Paused or Disabled

- **At the flip of a switch (or equivalent):** The organisation should be able to **turn off** AI classification and/or AI gap detection **without** turning off the rest of the system. When classification is off, staff adding a document see only the list of sections and document types and choose themselves (Phase 1 behaviour). When gap detection is off, managers no longer see the AI-generated gap list; they still see the rule-based compliance status and task lists. So “pause” means: stop using the AI for that feature; the manual or rule-based part of the system continues.
- **Who can pause:** Only defined **roles** (e.g. system owner, compliance lead, or senior manager) may pause or re-enable AI features. The action is **logged** (who, when, which feature, and reason if recorded) so that the organisation can show inspectors or auditors that changes are controlled.
- **When to pause:** The organisation should pause an AI feature when: (1) a serious issue is detected (wrong suggestions, misuse, or breach of policy); (2) an incident is under investigation and the AI might be involved; (3) the regulator has asked for a pause; or (4) the organisation is doing planned maintenance or review of the AI and wants to avoid use during that time. Re-enabling happens only when the organisation is satisfied that the cause has been addressed and safeguards are in place.

### How the System Safely Reverts to Manual Processes

- **Classification:** When AI classification is paused or disabled, the **same** screen or flow for adding a document is used, but **no** AI suggestion is shown. The staff member sees only the list of sections and document types (from the blueprint) and chooses. Saving still requires their choice and is recorded (who, when). So the system reverts to **Phase 1** behaviour for that feature: no AI, same folder structure and rules.
- **Gap detection:** When AI gap detection is paused or disabled, managers (and any role that had access) **no longer** see the AI-generated list or explanations. They still see the **rule-based** compliance status (in date, due, overdue; Green, Amber, Red) and the **task lists** and reminders that the system generates from the rules and data. So they can still prioritise and act; they just do not have the AI’s “potential gaps” list. The system reverts to **Phase 1** (or Phase 2 if only gap detection is off) behaviour for that feature.
- **No data loss:** Pausing or disabling the AI does **not** delete or change any care content, any compliance status, or any audit trail. The data that was entered or the status that was calculated while the AI was in use remains. Only the **AI output** (suggestion or gap list) is no longer shown or updated. Staff and managers continue to work with the same folder and the same rules; they just do not receive AI assistance for the paused feature.
- **Communication:** When the organisation pauses an AI feature, it should **tell** the affected staff and managers (e.g. “AI classification is temporarily off; please carry on choosing section and type yourself”) so that they do not expect the suggestion and so that they know the system is still safe to use.

---

## 6. Inspection and Audit Readiness

### How This Phased Approach Supports Inspection Readiness at All Times

- **Phase 1 alone is inspection-ready.** From the first day of Phase 1, the service has a digital folder that matches the blueprint, compliance status from the rules, reminders, emergency summary, and audit trail. Inspectors can see the same structure and evidence they expect. So even if the organisation never goes beyond Phase 1, or if it pauses AI and stays in Phase 1 (or Phase 2 without gap detection), the service is **always** able to show a complete, rule-based, human-operated system. Inspection readiness does **not** depend on AI.
- **When AI is in use (Phases 2–4), the same evidence is still there.** The folder, the rules, the status, and the audit trail are unchanged by the AI. The AI only **suggests** or **highlights**; it does not replace the record or the status. So inspectors still see the real evidence. The phased approach also means the organisation can **explain** what is AI and what is not: “this is the folder and the status from our rules; we also use AI to suggest where to file documents, but staff always confirm.”
- **At every phase, the organisation can describe what is in use.** For inspectors who ask “do you use AI?”, the answer is clear: “We are in Phase X. We use AI for [classification and/or gap detection] in this way; staff/managers always confirm. Here is our governance document and our training.” That supports Well-Led and transparency.

### How It Allows Honest Explanations to Inspectors

- **No hiding.** The organisation does not need to hide that it uses AI. The design (advisory only, human confirm, no AI sign-off) and the governance (approved prompt, mandatory language, training, phased rollout) are documented. The organisation can hand over (or show) the integration plan, the AI governance policy, and the use case documents and say: “This is how we use AI; this is how we keep humans in control.”
- **Clear boundaries.** The organisation can say honestly: “The AI suggests where to file a document; it does not file it. The AI highlights potential gaps; it does not decide compliance or change status. Our staff and managers confirm or dismiss. We have evidence of that from our rollout and our audits.” That avoids the risk of inspectors thinking the AI is making decisions.
- **If something went wrong.** If the organisation has had to pause an AI feature or has had an incident, it can explain what happened, what it did (paused, trained, fixed), and what it is doing now. The phased approach and the safeguards (pause, rollback, audit) show that the organisation takes AI use seriously and can respond when things go wrong.

### How It Avoids “Big Bang” Risk

- **Big bang** would mean: turning on the full system and all AI features for all staff and all services on one day. The risks would be: (1) the core system might not be ready or might have faults that affect everyone at once; (2) staff might not be trained or might be overwhelmed; (3) AI might behave in unexpected ways and the organisation would have no baseline to compare to; (4) if something went wrong, the whole deployment would be at risk and rollback would be complex.
- **Phased integration** avoids that by: (1) proving the core system first (Phase 1) in one service or area; (2) adding one AI feature at a time (classification, then gap detection) with controlled rollout and exit criteria; (3) giving each phase time to run and generate evidence before scaling or adding the next; (4) keeping the ability to pause or roll back **one** feature without stopping the whole system. So if AI classification causes problems, the organisation can turn it off and keep the rest of the system (and the manual way of filing) in place. The risk of a single change is contained, and the organisation always has a safe fallback (manual process) that is inspection-ready.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Philosophy** | Safety before speed; human control before automation; evidence before scale. |
| **Phase 1** | Manual digital system only; no AI; establishes core system and baseline. |
| **Phase 2** | AI classification in controlled use; staff confirm before save; no auto-file, no gap detection. |
| **Phase 3** | AI gap detection for managers only; advisory list; classification may roll out to all. |
| **Phase 4** | Expanded access and any further approved AI use cases; all governed; steady state. |
| **Entry/exit** | Each phase has entry criteria (before start) and exit criteria (before next); reasons to pause or stop are defined. |
| **Access and training** | Roles and access per phase; training and understanding checks before and after go-live. |
| **Safeguards and rollback** | Issues detected via usage, outcomes, feedback, incidents; AI can be paused per feature; system reverts to manual/rule-based without data loss. |
| **Inspection readiness** | Phase 1 is inspection-ready on its own; AI does not replace evidence; honest explanation and clear boundaries; phased approach avoids big bang risk. |

---

*This document is the official controlled technical integration plan for the digital CQC readiness system with AI-assisted features. It must be used when introducing the system into live care environments and when explaining deployment and governance to internal and external stakeholders, including regulators.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
