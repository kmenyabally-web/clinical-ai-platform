# Safe, Read-Only First Access to Firebase

**Governance Evidence for Regulated UK Healthcare**

*This document records the first access to the Firebase console for the digital CQC readiness system. It states why access was taken at this stage, what was observed, what was deliberately not done, what risks were avoided, and what readiness was gained for the next step. It does not contain code or setup instructions. Plain English only. It provides governance evidence that first access was safe and intentional.*

---

## 1. Purpose of First Firebase Access

### Why the Firebase Console Was Accessed at This Stage

- The organisation had already agreed the **minimum Firebase setup** required for the first technical build (as set out in the Minimum Firebase Setup for First Build document) and the **first technical build scope**. Before any configuration or creation of databases, storage, or authentication was planned, the responsible person needed to **see what the console offers** and how it is organised. Access at this stage was to **look only**: to understand the layout of the console, the main areas that correspond to “where data will live” and “where sign-in will be managed,” and to confirm that the console matches what the minimum setup document describes. No decision to configure or create anything was made during this access; the purpose was observation and understanding only.

---

### What This Access Was Intended to Achieve

- **Familiarity with the console.** To see the main areas of the console (project overview, authentication, database, storage) and to understand in plain terms what each area is for. So that when the organisation is ready to configure (on a later, planned occasion), the person doing the work knows where to go and is not exploring for the first time while making changes.
- **Alignment with the minimum setup document.** To confirm that the concepts in the minimum setup document (structured information storage, document storage, authentication, audit) have a clear counterpart in the console. So that there is no surprise later (“we didn’t know this existed”) and so that the next step can be planned against what is actually there.
- **Governance evidence.** To create a written record that first access was **read-only** and that no configuration, creation, or data handling was performed. So that the organisation can show an inspector or auditor that access to the platform was disciplined and intentional from the start.

---

### What This Access Was NOT Intended to Achieve

- **Configuration or setup.** First access was not for creating databases, enabling sign-in methods, creating storage areas, or writing any rules. Those actions are planned for a later step, with their own governance and documentation.
- **Loading or viewing real data.** No care data, no person data, and no documents exist in the project at this stage. First access was not for uploading, viewing, or testing with real or test data. The project was observed in its initial or empty state only.
- **Deciding how to configure.** First access was not for making final decisions about structure, rules, or security settings. It was for understanding what the console contains so that such decisions can be made later in a planned way, with the minimum setup document and the build scope as the reference.
- **Proving that the system works.** No end-to-end flow (sign-in, folder, document) was built or tested. First access was observation only; proving that the system works comes in later build phases.

---

## 2. Firebase Components Observed

The following describes what each main area of the console represents, in plain English, and how it relates to a regulated healthcare system. No configuration or technical setup is described.

---

### Project Overview

- **What it represents:** The top-level view of the project. It shows the project name and gives access to the main areas of the system: where users are managed (authentication), where structured information can be stored (database), and where files can be stored (storage). It is the “front door” to the project rather than a place where care data or documents are held.
- **How it relates to regulated healthcare:** In the CQC readiness system, one project will hold the data for the organisation and its services, people, care folders, and audit. The project overview is where the organisation confirms which project is being used and where authorised people go to manage or monitor the project. Keeping one project for the first build (and knowing how to identify it) supports clear governance and makes it easier to explain to inspectors “this is where our data lives.”

---

### Authentication

- **What it represents:** The area where the system that **verifies who a user is** (sign-in) is managed. It is where sign-in methods (for example email and password, or single sign-on) can be enabled or disabled, and where the list of users who have been created can be seen. It does not hold care content or documents; it holds only the information needed to know “this person signed in and has this identity” so that the application can apply roles (staff, manager, inspector) and record “who” in the audit trail.
- **How it relates to regulated healthcare:** Staff, managers, and inspectors must sign in so that the system knows who is acting. The authentication area is where the organisation will later configure how sign-in works and where it can see who has accounts. For CQC and data protection, access to care data must be controlled; authentication is the first step in “only the right people see and do the right things.” Observing this area at first access confirms where identity and sign-in will be managed when the organisation is ready to configure.

---

### Firestore Database

- **What it represents:** The area where **structured information** is stored. Structured information means information that the application can read by name or type: for example organisation and service names, the list of people, the eight sections of the care folder, document types, care plan text, risk assessment text, dates (last review, next review), who is responsible, and the audit log (who did what, when). It is not where files (PDFs, scans, images) are stored; those go in storage. The database holds the “fields and records” that drive the folder structure, compliance status, and audit trail.
- **How it relates to regulated healthcare:** The care folder (eight sections, document types, care content, dates, status, audit) must be stored in a structured way so that the application can show the right screen, calculate “in date / due / overdue,” and record who did what. The minimum setup document requires that structured information and documents are kept separate and that audit is kept separate and is not editable. Observing the database area at first access confirms where that structured information will live when the organisation creates it later. No data was viewed or added during first access; the area was observed only to understand its role.

---

### Storage

- **What it represents:** The area where **files** are stored: the documents that staff upload, such as PDFs, scanned forms, and images. Each file is linked (by the application) to a person, a section, and a document type. Storage does not hold the structured fields (care plan text, dates, status); it holds the files themselves. The minimum setup document requires that files are stored separately from structured information and that uploading a file does not overwrite the structured record (for example the care plan dates and who reviewed).
- **How it relates to regulated healthcare:** Much of the evidence in care folders is in the form of documents (capacity assessments, DoLS authorisations, letters, photos). Those must be stored in a way that is traceable (who uploaded, when) and that does not replace the structured record. Observing the storage area at first access confirms where uploaded documents will live when the organisation enables it later. No files were uploaded or viewed during first access; the area was observed only to understand its role.

---

## 3. Actions Explicitly NOT Taken

The following actions were **deliberately not performed** during first access. This list is part of the governance record.

- **Creating databases.** No new database was created. No structure (organisation, service, person, folder, section, document type, audit) was created or modified. The database area was observed only; no “create” or “add” actions were used.
- **Enabling authentication providers.** No sign-in method (for example email/password or single sign-on) was enabled or configured. No decision was made about which provider to use. The authentication area was observed only; no “enable” or “add provider” actions were used.
- **Creating or configuring storage.** No storage area was created or configured. No rules for who can upload or read files were added or changed. The storage area was observed only; no “create” or “edit rules” actions were used.
- **Uploading data.** No care data, no person data, no documents, and no test data were uploaded. No files were placed in storage. No structured records were added to the database. The project was left in the same state as before first access (empty or initial).
- **Writing or changing rules.** No rules that control who can read or write what (for database or storage) were written, edited, or deleted. No security or access rules were changed. Observing the console did not include changing any rules.
- **Creating user accounts.** No test or real user accounts were created in the authentication area. No one was added or removed from the user list.
- **Linking or integrating other services.** No connection to other systems (for example analytics, messaging, or external databases) was added or configured. First access was limited to observation of the main console areas only.

---

### Why Restraint at This Stage Matters

- **Configuration must be planned.** Creating databases, enabling authentication, or writing rules without a plan that matches the minimum setup document and the build scope could lead to wrong structure, wrong access control, or missing audit. Restraint at first access means that when configuration happens, it happens in a planned step with the right documents and approvals in place.
- **No accidental change.** In regulated care, any change to where data lives or who can access it must be intentional and documented. If the first access had included “just creating the database” or “just enabling email sign-in,” the organisation might not have had a clear record of why and when, and might have created something that did not match the agreed structure. Read-only access removes the risk of accidental creation or configuration.
- **Governance and inspection.** The organisation must be able to say “our first access was read-only; we observed only; we did not configure until we were ready.” That story is only true if restraint is exercised and recorded. Restraint at this stage supports both internal governance and the ability to explain to an inspector or auditor how the platform was brought into use.

---

## 4. Risks Avoided by Read-Only Access

### From a Compliance Perspective

- **Wrong or incomplete structure.** If databases or storage had been created during first access without a full plan, the structure might not match the eight sections, the document types from the blueprint, or the separation of structured information, documents, and audit. Fixing it later could mean moving or redoing work and could create gaps in how data is organised. Read-only access meant no structure was created until the plan (minimum setup document and build scope) is applied in a dedicated configuration step.
- **Access rules written too early.** Rules that control who can read or write what must reflect the three roles (staff, manager, inspector) and the rule that inspectors cannot edit or delete. Writing rules during an “exploratory” first access could have led to rules that were too loose, too strict, or inconsistent with the required screens and access control. Not writing rules at first access avoids that risk; rules will be written when the application and roles are clearly defined.
- **Data protection and accountability.** Loading or viewing data (even test data) during first access could have created uncertainty about what data exists where and who has seen it. In a regulated system, the organisation must know what data is in the platform and for what purpose. Read-only access with no data upload or creation keeps the position clear: no care or person data was present or handled during first access.

---

### From a Safety Perspective

- **No live or test data at risk.** Because nothing was created or configured, there was no way to accidentally expose data, overwrite structured records with files, or leave audit unwritten. The project remained in a safe, unchanged state.
- **No authentication or access in place.** Because no sign-in methods were enabled and no user accounts were created, no one could sign in or access any part of the system. There was no risk of unauthorised access or of confusion about “who has an account.”
- **No dependency on unplanned setup.** If something had been created or configured on the fly, the next step might have depended on it (“we already created the database, so we have to use it”). Read-only access left the next step free to follow the minimum setup document exactly, with no need to work around or undo an earlier, unplanned action.

---

## 5. Readiness for Next Step

### What Understanding Was Gained

- **Where things will live.** The person who will later configure or oversee configuration now knows where in the console to find the areas for authentication, structured data (database), and files (storage). That reduces the chance of going to the wrong place or configuring the wrong component when the planned configuration step happens.
- **That the console matches the plan.** The minimum setup document describes structured storage, document storage, and authentication as separate concerns. The console has distinct areas for each. That alignment gives confidence that the plan can be implemented as written when the organisation is ready.
- **That nothing was changed.** Because no actions were taken other than observation, the next step starts from a clean state. There is no “we did something on first access that we now need to change or undo.” The next step can be: “apply the minimum setup document and the day-one decisions in a single, planned configuration.”

---

### What Confidence Was Gained for Proceeding Safely Later

- **First access was disciplined.** The organisation has a written record that first access was read-only and that specific actions (creating databases, enabling authentication, uploading data, writing rules) were not taken. That supports the expectation that future access will also be planned and documented.
- **The next step can be scoped clearly.** The next action can be defined as “configure according to the minimum setup document and the day-one build playbook,” without having to allow for or reverse any unplanned first-access changes.
- **Governance evidence exists.** If an inspector or auditor asks “how did you first use the Firebase platform?”, the organisation can point to this document: first access was observation only; no configuration or data handling; restraint was exercised and recorded. That supports both continuity and inspection readiness.

---

## 6. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose of first access** | To observe the console and understand where authentication, structured data, and files are managed; to align with the minimum setup document; to create governance evidence of read-only, intentional first access. |
| **Components observed** | Project overview (front door to the project); Authentication (where sign-in and user identity are managed); Database (where structured care and audit information will live); Storage (where uploaded documents will live). Each relates to the CQC readiness system as set out in the minimum setup document. |
| **Actions not taken** | No creating databases, enabling authentication, creating storage, uploading data, writing rules, creating users, or adding integrations. Restraint ensures configuration is planned and no accidental change occurs. |
| **Risks avoided** | Compliance: wrong structure, premature or wrong rules, unclear data handling. Safety: no data or access at risk, no unplanned setup creating dependency. |
| **Readiness for next step** | Understanding of where to configure what; confidence that the console matches the plan; clean state and governance evidence so the next step can be a single, planned configuration. |

---

*This document provides governance evidence of safe, intentional first access to Firebase for the digital CQC readiness system. It should be kept with other foundation and governance documents and used when explaining to internal or external parties how the platform was first used.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
