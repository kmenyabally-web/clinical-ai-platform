# First Controlled Enablement: Firestore Database

**Governance Evidence for Regulated UK Healthcare**

*This document records the first controlled enablement of the Firestore database for the digital CQC readiness system. It states why the database was enabled at this stage, how it was configured for safety and compliance (mode and region), exactly what exists and what does not, what actions were deliberately not taken, how this preserves safety and data protection, and what readiness it creates for the next step. It does not contain code or setup instructions. Plain English only. It provides governance evidence of safe, minimal Firestore enablement.*

---

## 1. Purpose of Enabling Firestore

### Why Firestore Was Enabled at This Stage

- The organisation had already completed **read-only first access** to the Firebase console, had enabled **Firebase Authentication** in a controlled way (as recorded in the First Controlled Configuration Firebase Authentication document), and had agreed the **minimum Firebase setup** and the **first technical build scope**. The next planned step was to enable the **place where structured information will be stored**: organisation and service details, person and care folder structure, care content (care plans, risk assessments, dates, who to contact, allergies, and so on), responsibility, compliance status or the data to calculate it, and the audit trail (who did what, when). In the minimum setup document, this is called “structured information storage” and is kept separate from document (file) storage. Firestore is the part of the platform that will hold that structured information. Enabling it at this stage means that when the application is built and the structure (organisation, service, person, folder, sections, document types, audit) is created in a later step, the database is already in place and secured. No data is stored in this step; only the database is turned on and set to a safe, locked state.
- Enabling Firestore now follows the same **controlled, step-by-step** approach as authentication: each major part of the platform is enabled or created on its own, with clear boundaries. Enabling the database in its own step keeps the change small, documentable, and reversible if needed. It also avoids the risk of enabling the database and creating collections or adding data in the same step, which would make it harder to say exactly what was done when and would increase the chance of putting data in the wrong place or before access rules exist.

---

### What It Is Intended to Support Later

- **Structured care information.** The care folder (eight sections, document types, care plan text, risk assessment text, daily notes, dates, who to contact, allergies, medication list, consent, incidents, and so on) must be stored in a form the application can read and use for status (in date, due, overdue) and for display. Firestore, once enabled and then structured in a later step, will hold that information. Enabling it now prepares the **place** so that when the structure is created (for example the equivalent of organisation, service, person, folder, sections, document types, and audit), it has a secure, empty database to go into.
- **Compliance status and reminders.** The system must show what is in date, due, or overdue and must drive reminders and tasks. That depends on dates (last review, next review) and on the presence of documents—all of which are structured information. Firestore will hold that data so that the application can calculate status and show the right screens. Enabling it now ensures that when the application and the compliance rules are built, the data store is ready.
- **Audit trail.** The system must record who did what and when. The audit trail is stored separately from care content and is append-only and not editable by users. Firestore will hold the audit entries. Enabling it now in a locked state means that when the audit structure is created and the rules are written, the place for audit already exists and is secured; no one can read or write it until the rules explicitly allow it for the right roles.
- **Inspection and accountability.** CQC expects the service to hold care records in a clear structure and to show who did what. Firestore, once structured and ruled correctly in later steps, will be the store that supports that. Enabling it now in a minimal, locked way is the first technical step toward “our structured care data and audit live here, and access is controlled by rules we will add when the application is ready.”

---

## 2. Mode and Region Selection

### That Firestore Was Enabled in Production (Locked) Mode

- **What this means:** The database was enabled in a mode that **blocks all read and write access by default**. No application and no user can read from or write to the database until explicit access rules are added in a later step. The database is “on” but **locked**: it exists and is ready to hold data, but nothing and no one can read or write it until the organisation writes rules that say who can do what (for example staff can read and write their service’s data; inspector can read only). This is sometimes referred to as production mode or locked mode: security first, access only when the organisation deliberately grants it.
- **Why it matters for compliance:** In regulated healthcare, care data must not be accessible until access control is in place. Enabling the database in locked mode ensures that no one—no application, no staff member, no outsider—can read or write structured data until the rules are written and the application is connected in a controlled way. That supports CQC expectations (access control, need-to-know) and data protection (no unauthorised access). It also means that when the organisation does add rules later, it does so consciously and can document what each rule allows; there is no “open” period where the database was readable or writable by default.

---

### That a UK or EU Data Region Was Selected

- **What this means:** When the database was enabled, the organisation selected a **UK or EU data region** for where the data will be stored. That means the structured information (and, when it is added later, the care content and audit trail) is held on systems located in the United Kingdom or the European Union, not in other countries, unless the organisation has a separate, approved arrangement for data outside the UK or EU.
- **Why it matters for compliance:** UK data protection law (UK GDPR) and the expectations of the Information Commissioner’s Office (ICO) and of CQC include that personal data (including data about people using the service and about staff) should be stored in a way that respects data residency and that keeps data within the UK or within territories that are considered adequate or otherwise properly safeguarded. Selecting a UK or EU region at enablement means the organisation has made the choice early and can explain to regulators, inspectors, and data subjects that care data is held in the UK or EU. It also avoids having to move data or change region later, which could be disruptive and could create compliance or contractual issues. For a regulated care system, stating clearly that “we enabled the database in a UK [or EU] region” is part of the governance evidence that the organisation takes data protection and residency seriously.

---

## 3. Scope of What Was Enabled

### What Now Exists

- **An empty, secured database.** The Firestore database is **enabled** and **exists** as the place where structured information will later be stored. It is **empty**: no organisation, no service, no person, no care folder, no care content, no audit entries. It is **secured**: because it was enabled in production (locked) mode, no read or write access is allowed until rules are added. So the organisation now has “a database that is on, in the right region, and locked,” and nothing else. No care data or person data exists in it.

---

### What Does Not Exist Yet

- **No collections.** The minimum setup document describes a structure: organisation, service, person, care folder, sections, document types, audit. In Firestore, that structure will be represented by collections (and, when data is added, documents). None of those collections were created in this step. The database is a blank slate. Collections will be created in a later step when the organisation defines the exact structure (for example the names and hierarchy of collections) in line with the blueprint and the day-one decisions.
- **No data.** No organisation names, no service names, no person names, no care plans, no risk assessments, no dates, no audit entries. No test data and no real data. The database holds nothing. Data will be added only when the application is built, the structure exists, the rules are in place, and the organisation has agreed to add data (for example for pilot).
- **No access.** Because the database is in locked mode and no rules were written that allow read or write, no application and no user has access to the database. There is no way to read from it or write to it until the next step (or a later step) adds rules and connects the application. So “enabled” does not mean “accessible”; it means “the store exists and is secured.”

---

## 4. Actions Explicitly NOT Taken

The following actions were **deliberately not performed** during this first controlled enablement. This list is part of the governance record.

- **Creating collections.** No collections (for example for organisation, service, person, folder, section, document type, or audit) were created. The structure will be created in a later step when it is designed in line with the minimum setup document and the Active Care Folder blueprint. Creating collections now would have been premature (the exact structure may be refined when the application is built) and could have led to the wrong hierarchy or naming. Restraint keeps the next step clear: “create the structure according to the agreed plan.”
- **Adding documents.** No documents (no records, no fields, no data) were added. No test data and no real data. Adding data now would have put information into the database before access rules exist and before the application can enforce who sees what. Restraint ensures that the first data that enters the database does so when the system can protect it and when the organisation has agreed what data is being stored and why.
- **Writing access rules.** No rules that allow any application or user to read or write the database were written. The database remains in locked mode: default deny. Rules will be written in a later step when the application is ready and when the organisation has defined how roles (staff, manager, inspector) map to read and write access (for example staff can read and write their service’s data; inspector can read only). Writing rules now would have been premature (no structure, no app) and could have created rules that are wrong or incomplete. Restraint ensures that when rules are written, they are written once, correctly, for the actual structure and roles.
- **Connecting applications.** No frontend or backend application was connected to the database. No web app, mobile app, or other software was given permission or configured to read from or write to Firestore. Connecting an app now would have created a path for data access before the structure and the rules exist. Restraint keeps the boundary clear: the database is “ready” but not yet in use by any application.
- **Importing or migrating data.** No data was imported from another system or migrated from elsewhere. The first build is standalone; data is entered or uploaded by staff through the application when it is built. Importing data in this step would have been out of scope and could have created data protection or quality issues (wrong format, wrong structure, or data that has not been through the agreed governance). Restraint keeps the first build within the agreed scope.

---

### Why Restraint at This Stage Is Important

- **Safety.** Creating collections or adding data before access rules exist could allow anyone with technical access to the project to read or change data if rules were later added in error. Keeping the database empty and locked until rules and the application are in place prevents any accidental or early access to care information.
- **Correct structure.** The exact shape of the structure (how organisation, service, person, folder, sections, document types, and audit are represented) may be refined when the application is built. Creating collections in this step could lock in a structure that later has to be changed, causing rework or confusion. Restraint allows the next step to create the structure once, in line with the final design.
- **Governance and auditability.** Each step is easier to document and to explain when it is done on its own. “We enabled the database in locked mode in a UK [or EU] region; we did not create collections, add data, or write rules.” That is a clear, defensible statement. Doing “enable plus create structure plus add test data” in one go would blur the boundary and would make it harder to say what was done when and why. Restraint supports governance and inspection readiness.
- **Data protection.** No personal data or care data exists in the database yet. So there is no data to breach, no data to lose, and no data subject to incorrect access. Restraint keeps the organisation in a safe position: when data is first stored, it will be stored with structure and rules already in place.

---

## 5. Safety, Privacy, and Compliance Rationale

### How Enabling Firestore in This Way Preserves Patient Safety

- **No care data yet.** Because no collections were created and no documents were added, there is no care plan, no risk assessment, no medication list, and no other information about any person using the service. So there is no risk of wrong information being shown to staff, no risk of a mix-up between people, and no risk of missing or incorrect data affecting care decisions. Patient safety is preserved because the database does not yet hold any information that could affect care.
- **No access.** Because the database is in locked mode and no rules allow read or write, no one can read or change anything. So there is no risk of the wrong person seeing sensitive information or of data being altered or deleted by mistake. When data is added in a later step, it will be added only after the application and the rules can enforce who sees what and who can change what. Enabling the database in a locked, empty state keeps patient safety at the centre: first secure the store, then add structure and rules, then add data.
- **Clear path for audit and traceability.** The minimum setup document requires that the audit trail (who did what, when) is stored separately and is append-only. Enabling Firestore now in a controlled way means that when the audit structure is created later, it will live in a database that was from the start configured for security (locked mode) and for the right region (UK or EU). That supports the future integrity of the audit trail and thus the ability to hold people accountable and to protect patients through traceability.

---

### How It Protects Data Privacy

- **No personal data stored.** No names, no identifiers, no care content, no staff data. The database is empty. So there is no personal data to be lost, leaked, or accessed without a lawful basis. Data protection (UK GDPR) applies when personal data is processed; at this step, no personal data is processed in Firestore. The organisation can state that “at the time of first enablement, no personal data was stored in the database.”
- **UK or EU region.** Selecting a UK or EU data region at enablement supports data residency and helps the organisation meet expectations under UK GDPR and ICO guidance. It also makes it easier to explain to data subjects and to regulators where their data will be held when the system goes live. Privacy is protected by choosing the region before any data is stored.
- **Access denied by default.** Locked mode means that even if someone had technical access to the project, they could not read or write the database until rules explicitly allow it. That protects against unauthorised access and against accidental exposure. When rules are added later, they will be added consciously and in line with the principle of least privilege (staff, manager, inspector only what they need). Enabling in locked mode is a privacy-by-design choice: no access until the organisation grants it in a controlled way.

---

### How It Aligns with UK Healthcare and CQC Expectations

- **Controlled rollout.** CQC and NHS digital governance expect that new systems are introduced in a planned, documented way. Enabling the database on its own, with no data and no access, shows that the organisation is building the platform step by step and can explain each step. That aligns with the expectation that the service can describe how it set up and secured its digital care records.
- **Access control and need-to-know.** CQC expects the service to control who can see and change care records. Enabling Firestore in locked mode ensures that access will only be granted when the organisation writes rules that reflect the three roles (staff, manager, inspector) and the principle that inspectors are read-only. So this step is the foundation for “only the right people see and do the right things”; the actual rules come later, but the database is from the start in a state that allows no access until those rules exist.
- **Audit and accountability.** CQC expects the service to know who did what and when. Firestore will hold the audit trail. Enabling it now in a secured, empty state means that when the audit structure is created and the application starts writing “who did what, when,” that information will live in a database that was configured for security and region from day one. That supports the service’s ability to demonstrate accountability to CQC.
- **Structure that matches the blueprint.** The minimum setup document and the Active Care Folder blueprint define the eight sections and the document types. When collections and structure are created in a later step, they will follow that blueprint. Enabling the database now without creating structure keeps the next step clean: “create the structure that matches the blueprint,” with no legacy or wrong structure to undo. That aligns with CQC’s expectation that care evidence is organised in a clear, consistent way.

---

## 6. Readiness for the Next Step

### What This Step Now Makes Possible

- **A secure place for structured information.** When the organisation is ready to create the structure (organisation, service, person, folder, sections, document types, audit), that structure will go into a database that already exists, is in the right region (UK or EU), and is locked. The next step does not need to “enable” the database; it only needs to create the structure and then write the rules that allow the application (and only the application, with the right role checks) to read and write.
- **No rework of region or mode.** Because region and mode were set at enablement, the organisation will not need to move data or change the database configuration later for compliance. The next steps can focus on structure, rules, and application.
- **Clear governance record.** The organisation has a written record of what “first Firestore enablement” meant: enabled in production (locked) mode, UK or EU region, no collections, no data, no access. That makes it easier to plan and document the next step (create structure, write rules, connect application) and to explain to inspectors or auditors how the database was brought into use.

---

### What Must Still Happen Before Any Real Data Can Be Stored

- **Create the structure.** The structure (collections and, when needed, subcollections or documents) that represents organisation, service, person, care folder, eight sections, document types, and audit must be created in line with the minimum setup document and the Active Care Folder blueprint. Until that exists, there is no place to put care data or audit entries in the right shape.
- **Write access rules.** Rules that control who can read and write what must be written and applied. The rules must reflect the three roles (staff, manager, inspector) and must ensure that staff see only their service’s data, that inspectors can only read, and that the audit store is append-only and not editable or deletable by users. Until rules are in place, the database must remain locked (no access). Real data must not be stored until the rules are in place and tested.
- **Build and connect the application.** The application that staff and inspectors will use must be built and connected to the database. The application will use the signed-in user’s identity (from Firebase Authentication) and the rules to read and write data. Until the application is connected and the rules are active, no one should be able to store or retrieve data through the app. Data entry and upload by staff happen only when the application is live and the organisation has agreed to go live (for example for pilot).
- **Decide when to add data.** The organisation must decide when to add real data (organisation name, services, people, care content). That may be after a test or pilot phase with test data, or when the pilot service is ready to use the system. No real person data or care data should be stored until the organisation has approved it and the structure and rules are in place.

**Summary:** Enabling Firestore in this step **does not** by itself allow any real data to be stored. Real data will only be stored after the structure is created, the rules are written and tested, the application is built and connected, and the organisation has agreed to add data. This step only makes it possible to do those things later with a database that is already enabled, secured, and in the right region.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Enable the place where structured care information and audit will be stored, in a controlled step, so that the database exists and is secured before any structure or data is added. |
| **Mode and region** | Firestore was enabled in production (locked) mode so that no read or write access is allowed until rules are added; a UK or EU data region was selected to support data residency and UK GDPR compliance. |
| **Scope** | An empty, secured database exists; no collections, no data, and no access exist yet. |
| **Actions not taken** | No collections created, no documents or data added, no access rules written, no applications connected, no data imported. Restraint keeps the step minimal, safe, and documentable. |
| **Safety, privacy, compliance** | No care data yet (patient safety); no personal data stored, UK/EU region, access denied by default (data privacy); controlled rollout, access control foundation, audit foundation, structure to follow blueprint (UK healthcare and CQC). |
| **Readiness** | A secure place for structured information exists; next steps are create structure, write rules, build and connect application, then add data only when approved. |

---

*This document provides governance evidence of the first controlled enablement of the Firestore database for the digital CQC readiness system. It should be kept with other foundation and governance documents and used when explaining how the database was brought into use in a safe, minimal way.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
