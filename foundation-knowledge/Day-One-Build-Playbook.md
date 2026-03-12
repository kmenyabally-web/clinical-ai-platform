# Day-One Build Playbook: First Technical Build

**Plain-English Guide for a Safe, Disciplined Start to a Regulated Care Platform**

*This document defines what day one of the first technical build of the digital CQC readiness system is for, the exact order of activities, where to stop, what must not happen, what success looks like, and what must be documented. It is not a technical setup guide. It does not contain code or a coding plan. Plain English only.*

---

## 1. Purpose of Day One

### What Day One Is For

- **Day one is for putting the foundations in place.** The aim is to create a clear, agreed structure for the project and for the way information will be organised. By the end of day one, the team has: a shared place for the build; a clear plan for who can access what (identity and roles); and a defined structure for where care data, documents, and audit will live. Nothing that goes in on day one should need to be ripped out later because it was wrong or out of scope.
- **Day one is for alignment, not for features.** Everyone agrees what “organisation,” “service,” “person,” “care folder,” “section,” and “document type” mean in this build, and where those concepts will sit in the system. The eight sections and the list of document types from the blueprint are locked in as the structure. No screens, no sign-in flows, and no real care content are built on day one; the groundwork is laid so that day two and beyond can build on it without redoing the basics.
- **Day one is for staying within what is already approved.** The first technical build scope and the minimum Firebase setup document define what is in and out of scope. Day one does not add anything that would require new governance or new approvals. It only sets up what is needed to support the first build as already defined.

---

### What Day One Is NOT For

- **Day one is not for building the application that staff will use.** No sign-in screen, no people list, no care folder screen, and no document upload are built on day one. Those come later. Day one is only structure and planning.
- **Day one is not for loading real data or real users.** No real names, no real care plans, and no real documents are added. Placeholders and structure only. Real data and user accounts are added when the build is ready to support them safely.
- **Day one is not for making the system “look good” or “feel finished.”** No colours, layouts, or polished interfaces. No time is spent on how things look. That comes after the structure and the flows work.
- **Day one is not for proving that the full system works.** The goal is not an end-to-end demo. The goal is that the next day can start from a solid, agreed base without confusion or rework.

---

### Why Restraint on Day One Matters in Regulated Systems

- **Care data and evidence are sensitive.** Once the structure is wrong or the wrong things are connected, fixing it later can put data at risk or create gaps in the audit trail. Getting the structure and the boundaries right on day one reduces the chance of having to change them when real data or real users are involved.
- **Inspectors and regulators expect the service to be able to explain how the system is set up.** If day one is chaotic or goes beyond what is approved (for example adding AI or automation), the organisation cannot give a clear, honest account of “what we built and why.” Restraint on day one keeps the story simple and truthful.
- **Rushing leads to shortcuts.** In regulated care, shortcuts often mean missing audit, missing access control, or mixing data that should be separate. A disciplined day one—with a clear order of activities and a clear stop point—makes it less likely that the team will skip steps or add ungoverned features “because we had time.”
- **The first day sets the tone.** If the team learns on day one that they stop at the stop point and do not start the next phase early, that discipline carries through the rest of the build. If day one becomes “we did a bit of everything,” the rest of the build is harder to control and to explain.

---

## 2. Day-One Build Order

The following activities should happen on day one **in this order**. Nothing that belongs to a later phase (for example screens, sign-in flows, or compliance logic) is included here.

**Step 1: Project setup and structure**

- Agree and create the shared place where the build will live (for example the project or repository that will hold the application and any configuration).
- Agree the high-level structure: where the application code will sit, where configuration will sit, and where the foundation documents (scope, blueprint, compliance rules, screen requirements, Firebase minimum setup) are kept and referenced.
- Agree naming and conventions for the project so that everyone uses the same terms (for example “care folder,” “section,” “document type”) and so that the structure can be found easily later. No code is written for features; only the minimal structure needed so that day two has a clear starting point.

**Step 2: Identity and access planning**

- Write down the three roles that the first build must support: staff, manager, and inspector (read-only). No implementation of sign-in or roles yet; only a short document or list that states: who each role is; what each role can see (for example staff see their people or their service; manager sees the whole service; inspector sees read-only); and what each role must never be able to do (for example inspector must never edit or delete).
- Write down that the system must always know “who” is acting (the signed-in user) so that the audit trail can record who did what. The plan states that every action that changes data will be tied to a user identity; no implementation of authentication or audit yet.
- Confirm that this plan matches the Required Screens document and the Minimum Firebase Setup document (roles and access). Any difference is resolved on day one so that day two does not build to a different plan.

**Step 3: Data and document placeholders**

- Define the **information structure** that the system will use: organisation, service, person, care folder, eight sections, document types per section. This is the same structure as in the Active Care Folder blueprint and the compliance rules. Write it down or represent it in a simple form (for example a list or a diagram) so that everyone agrees what “one folder per person” and “eight sections” mean and what the sections and document types are called.
- Define where **structured information** will live (for example care plan text, dates, who is responsible, last review date, next review date) and where **documents** (files such as PDFs and scans) will live. The rule is: structured information and documents are separate; documents do not overwrite structured records. This is written down so that when the build implements storage, it follows this split.
- Define where **audit** (who did what, when) will live. The rule is: audit is separate from care content; audit is append-only and not editable or deletable by users. This is written down so that the build never mixes audit with content and never allows users to change or delete audit entries.
- No real data is added. No real organisation, service, person, or document is created. Only the structure and the rules for where things will go. If the team uses a technical store (for example a database or backend), they may create the **empty** structure (for example empty containers or placeholders for organisation, service, person, folder, sections, document types, audit) so that day two can start from a real structure—but still with no real care data or real users.

**Step 4: Alignment check**

- Check that everything done on day one matches: the First Technical Build Scope, the Minimum Firebase Setup for the First Build, the Required Screens for the First Technical Build, and the Active Care Folder blueprint. If anything does not match, it is corrected or noted as a deliberate exception (and if it is an exception, it is written down with a reason).
- Confirm that nothing from the “forbidden” or “out of scope” lists in those documents has been added (no AI, no automation, no external integrations, no UI polish, no real data).

**Step 5: End-of-day documentation**

- Complete the documentation described in section 6 below. No one leaves day one without this being done.

---

## 3. Explicit Stop Points

### What Must Be Completed Before Stopping

- **Project setup and structure** must be done: the shared place exists, the high-level structure is agreed, and naming and conventions are written down or agreed.
- **Identity and access planning** must be done: the three roles (staff, manager, inspector) are written down with what each can see and do and what each must not do; the need to tie every action to a user identity for audit is written down.
- **Data and document placeholders** must be done: the information structure (organisation, service, person, folder, eight sections, document types) is defined and agreed; the split between structured information and documents is written down; the rule that audit is separate and append-only is written down; and, if the team uses a technical store, the empty or placeholder structure exists so that day two can build on it.
- **Alignment check** must be done: the team has checked day one’s work against the scope, minimum Firebase setup, required screens, and blueprint, and any exceptions are documented.
- **End-of-day documentation** must be done: the decisions and the state of the build are written down as set out in section 6.

If any of these is not complete, day one is not finished. The team stops only when all of the above are done. If time is short, the scope of day one is not expanded; the team completes the list above and stops.

---

### What Must NOT Be Started Even If Time Remains

- **Sign-in or authentication implementation.** Even if there is time, the first real sign-in flow is not built on day one. Day one is planning and structure only; implementation of sign-in starts on a later day when the structure is in place.
- **Screens or user-facing flows.** No sign-in screen, no home screen, no people list, no care folder screen, no document screen, and no inspection view are built on day one. Required screens are defined in the Required Screens document; building them starts later.
- **Document upload or viewing.** No flow for uploading or opening files is built on day one. The structure for where documents will live is defined; the actual upload and view flows come later.
- **Compliance status logic.** No rules for “in date,” “due,” or “overdue” are implemented on day one. The compliance rules document exists; implementing the logic that uses it starts later.
- **Reminders or task list.** No generation or display of tasks is built on day one.
- **Emergency summary.** No screen or view that pulls the seven emergency-critical items is built on day one.
- **Audit trail implementation.** The rule that audit exists and is append-only is written down; the actual recording of “who did what, when” when users take actions is implemented when those actions exist (later days).
- **Service-level compliance view.** No manager screen that shows counts or lists across the service is built on day one.
- **Review completion or sign-off flow.** No screen or step for completing a review is built on day one.

If time remains after the required day-one activities are done, the team **stops**. They do not use the extra time to start the next phase. They document the state, hand over, and let day two start from a clean, agreed base.

---

### Why Stopping Early Is Safer Than Pushing On

- **Starting the next phase “because we have time” often means skipping checks.** The next phase (for example sign-in or the first screen) needs the structure and the plan to be solid. If the team starts it in a rush at the end of day one, they may not test it properly or may wire it to the wrong place. Doing it properly on day two, when the structure is documented and agreed, is safer.
- **Half-done features are hard to explain and hard to hand over.** If day one ends with “we started the sign-in screen but it doesn’t work yet,” the next person (or the next day) has to guess what was intended and what was not. A clean stop at “structure and plan only” means the next day starts with no half-finished work.
- **In regulated systems, “we did a bit of everything” makes accountability harder.** If something goes wrong later, the organisation needs to be able to say what was built when and why. A clear day-one boundary (“we only did structure and planning”) makes that story clear. A blurred boundary (“we did structure and then we started sign-in”) makes it harder to explain and to audit.
- **Fatigue and pressure lead to mistakes.** The end of the day is when people are most likely to skip a step or add something that is not in scope. A strict stop point protects against that. “We stop when the list is done” is a simple rule that everyone can follow.

---

## 4. Forbidden Activities on Day One

The following must **not** happen on day one. Each is forbidden for the reason given.

**Connecting or integrating AI**

- **What is forbidden:** No AI service, no AI model, no AI-based suggestion (for example for document type or section), and no storage of AI prompts or AI outputs. No connection to any system that makes decisions or classifications on behalf of the system.
- **Why:** The first technical build and the MVLS explicitly exclude AI. AI is planned for a later phase with its own governance. Adding AI on day one would breach the approved scope and would require new governance before the organisation could use the system. It would also mix “prove the foundation” with “prove AI,” which would complicate testing and inspection readiness.

**Adding automation that acts on data or users**

- **What is forbidden:** No automatic sending of messages (emails, push notifications) to users or to people outside the system. No scheduled jobs that change care content, status, or audit. No automatic “mark as overdue” or “send reminder” that runs without a user opening the system and taking an action.
- **Why:** The first build is human-operated and rule-based. Reminders and status are driven by user actions and by the application when the user is using it; they are not driven by background automation. Adding automation on day one would go beyond the scope and would make it harder to explain to inspectors that “only humans change the record.”

**Designing or building UI polish**

- **What is forbidden:** No time spent on colours, fonts, detailed layouts, or making screens “look nice.” No refinement of buttons, spacing, or visual design. No prototypes or mock-ups that are meant to be the final look and feel.
- **Why:** Day one is for structure and planning, not for the way the system looks. UI design and polish come after the structure and the flows work. Spending day one on polish would delay the foundation and could lock in a design before the structure is right.

**Integrating external systems**

- **What is forbidden:** No connection to electronic patient records, pharmacy systems, local authority systems, or any other external system. No import or sync of data from elsewhere. No export or push of data to external systems.
- **Why:** The first build is standalone. Data is entered or uploaded by staff; it is not imported or synced. Integrations are out of scope for the first build and need their own design and safety review. Adding an integration on day one would breach scope and could create data or safety risks before the core is proven.

**Loading real personal or care data**

- **What is forbidden:** No real names of people using the service, no real care plans, no real risk assessments, no real incident reports, and no real documents (PDFs, scans) that contain real person data. No real user accounts for real staff or managers.
- **Why:** Until the structure, access control, and audit are in place and tested, real data must not be loaded. Loading it on day one would put person data at risk and could create compliance or data protection issues. Placeholders and structure only.

**Implementing sign-in, screens, or user flows**

- **What is forbidden:** No implementation of the sign-in flow, no building of any of the required screens (people list, care folder, document screen, emergency summary, inspection view, and so on), and no end-to-end user journey. No “we’ll just get one screen working.”
- **Why:** Day one is for foundation only. Screens and flows are built when the structure and the plan are documented and agreed. Building them on day one would mix “structure” with “features” and would make it harder to keep the build disciplined and explainable.

**Changing the approved scope or the blueprint**

- **What is forbidden:** No adding of features or document types that are not in the First Technical Build Scope or the Active Care Folder blueprint. No removing of the eight sections or the agreed document types. No “we’ll add just one more thing.”
- **Why:** The scope and the blueprint have been agreed for the first build. Day one does not change them. Changes would need governance and could affect inspection readiness. If someone thinks something is missing, it is written down for later discussion; it is not added on day one.

---

## 5. Definition of a “Good Day One”

At the end of day one, the following should be true. If they are, day one has been successful.

**Clear structure exists**

- The team has a shared place for the build and an agreed high-level structure (where the application and configuration live, where foundation documents are referenced).
- The information structure is defined and agreed: organisation, service, person, care folder, eight sections, document types. Everyone uses the same terms and the same list of sections and document types from the blueprint.
- If a technical store is used, the empty or placeholder structure for organisation, service, person, folder, sections, document types, and audit exists and matches the agreed plan. No real care data or real users are in the system.

**Identity and access are planned**

- The three roles (staff, manager, inspector) are written down with what each can see and do and what each must not do.
- The rule that every action that changes data must be tied to a user identity (for audit) is written down and agreed.
- The plan matches the Required Screens and Minimum Firebase Setup documents; any difference has been resolved or documented as an exception.

**Data and documents are clearly separated**

- The split between structured information (care content, dates, status) and documents (files) is written down. The rule that documents do not overwrite structured records is written down.
- The rule that audit is separate, append-only, and not editable or deletable by users is written down.

**Nothing breaks compliance**

- No AI, no automation, no external integrations, and no real personal or care data have been added. No screens or user flows have been built that could create ungoverned or untested behaviour.
- The work done on day one aligns with the First Technical Build Scope, the Minimum Firebase Setup, the Required Screens, and the Active Care Folder blueprint. Any exception is documented with a reason.

**The system is ready for day two**

- The next person (or the next day) can pick up from a clear, written state. They know what was decided, what structure exists, and what the plan is for identity, data, and audit. They do not have to guess or reverse-engineer what was done on day one.
- There are no half-finished features or “we started but didn’t finish” items. Day two can start with the next phase (for example sign-in or the first screen) without cleaning up day one first.

**Summary in one sentence:** A good day one is when the foundation is in place, the plan is written down, nothing out of scope has been added, and the team can stop and hand over to day two without confusion or rework.

---

## 6. Communication and Documentation

### What Should Be Documented at the End of Day One

- **What was done.** A short list of the activities that were completed: project setup and structure, identity and access planning, data and document placeholders, alignment check. If the team created an empty or placeholder structure in a technical store, that is noted (what was created, what it is for). No need for long prose; a clear list is enough.
- **What was agreed.** The agreed information structure (organisation, service, person, folder, eight sections, document types). The agreed roles and what each can and cannot do. The agreed rules: structured information and documents separate; documents do not overwrite structured records; audit separate and append-only. Where this lives (for example a one-page “Day one decisions” or “Foundation summary” in the project) should be fixed and known to the team.
- **What was not done.** A short list of what was deliberately not started: no sign-in implementation, no screens, no document upload, no compliance logic, no real data, no AI, no automation, no integrations. This helps the next day (or a new person) avoid assuming that something was already built.
- **Any exceptions or open points.** If anything on day one did not match the scope or the blueprint, it is written down with the reason (for example “we used name X for the section because…”). If a decision was deferred (for example “we will decide the exact list of structured document types on day two”), that is written down so that it is not forgotten.

---

### What Decisions Must Be Written Down

- **Roles and access.** The three roles (staff, manager, inspector) and what each can see and do and what each must not do. This must be in writing so that when sign-in and screens are built, they follow the same plan.
- **Information structure.** Organisation, service, person, care folder, eight sections, and the list of document types per section (from the blueprint). This must be in writing so that when data storage and screens are built, everyone uses the same structure.
- **Separation rules.** Structured information and documents are stored separately; documents do not overwrite structured records; audit is stored separately and is append-only and not editable or deletable by users. These must be in writing so that the build never breaks them.
- **Scope boundary.** That day one stayed within the First Technical Build Scope and did not add AI, automation, external integrations, or real data. If anyone is in doubt later, the written record shows what was in scope for day one.

---

### Why This Matters for Continuity and Inspection Readiness

- **Continuity:** If someone joins the team later or works on day three or day ten, they can read what was decided on day one and understand the foundation. They do not have to ask “why is it structured like this?” or “what are the roles?”—it is written down. That reduces the risk of building something that contradicts the day-one decisions.
- **Handover:** If the person who did day one is not the person who does day two, the written documentation is the handover. “Here is what we did, what we agreed, and what we did not do.” The next day can start without redoing or guessing.
- **Inspection readiness:** If an inspector or auditor later asks “how did you set up the system?” or “how do you control access?”, the organisation can point to the foundation documents and the day-one decisions. “We defined the structure and the roles on day one and built to that plan.” Written decisions make that story clear and honest. Undocumented decisions do not.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose of day one** | Put the foundation in place (structure, identity plan, data and document placeholders); align with approved scope; do not build features or load real data. |
| **Build order** | (1) Project setup and structure, (2) Identity and access planning, (3) Data and document placeholders, (4) Alignment check, (5) End-of-day documentation. |
| **Stop points** | Do not stop until setup, identity plan, placeholders, alignment, and documentation are complete. Do not start sign-in, screens, upload, compliance logic, or any later phase even if time remains. |
| **Forbidden** | No AI, no automation, no UI polish, no external integrations, no real data, no implementation of sign-in or screens, no scope or blueprint changes. |
| **Good day one** | Clear structure exists; identity and data rules are planned and written down; nothing breaks compliance; the system is ready for day two with no half-finished work. |
| **Documentation** | Document what was done, what was agreed, what was not done, and any exceptions. Write down roles and access, information structure, separation rules, and scope boundary. This supports continuity and inspection readiness. |

---

*This document defines the day-one build playbook for the first technical build of the digital CQC readiness system. It should be used to run day one in a safe, disciplined way and to hand over to day two without confusion or rework.*

*Document version: 1.0 | Plain English only | No code or technical implementation.*
