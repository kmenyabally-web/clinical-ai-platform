# First Creation: Firestore Collections

**Formal Governance Evidence for a Regulated CQC Readiness System**

*This document records the first creation of Firestore collections for the digital CQC readiness system. It states why collections were created at this stage and why they were created empty (with placeholders only), which collections now exist and what each represents, how placeholders were used and that no real data was added, that security rules were already in place, what risks were avoided, and the current system state. It does not contain code or setup instructions. Plain English only. It serves as formal governance evidence of safe Firestore structure creation.*

---

## 1. Purpose of Collection Creation

### Why Collections Were Created at This Stage

- The organisation had already enabled the Firestore database (as recorded in the First Controlled Enablement Firestore Database document) and had deployed the approved Firestore security rules (as recorded in the First Deployment Firestore Security Rules document). The agreed collection structure was defined in the Firestore Collection Structure for the First Live Build document. The next planned step was to **create the collections** so that the store has a clear, documented structure before any application is connected or any real data is added. Creating the collections at this stage means that when the application is built and when the first organisation, service, person, and audit entries are added later, they will go into the right place from the start. No real data exists yet; so creating the collections now does not involve moving or migrating data. It only creates the empty structure so that the first use of the store (when it happens) is already organised in line with the agreed plan.

- Creating the collections in their own step keeps the change **small and documentable**. The organisation can state exactly when the structure was first created and can show that only the agreed top-level collections were created, with no real data and no sub-collections. It also ensures that the store is never filled with care data without a clear structure: the sequence is “database enabled,” then “rules deployed,” then “collections created,” then (in later steps) “application connected,” “users created,” and “data added.” So the structure is in place before any sensitive data or live use.

---

### Why They Were Created Empty

- The collections were created **empty** in the sense that no real organisation, service, person, or audit data was added. The only documents added were **placeholder documents** (see section 3) so that each collection exists and can be seen and protected by the rules. Creating them empty means that no care data, no person data, and no audit history exists in the store. When the organisation is ready to add real data (for example the first organisation record, the first service, or the first person), that will be done in a later, governed step with the application and users in place. Creating the collections empty avoids the risk of adding real data before access control and user roles are in use, and it keeps this step purely about structure, not content.

---

## 2. Collections Created

The following **four top-level collections** now exist. No other top-level collections were created. Sub-collections (for example registered locations under an organisation, or the care folder under a person) were not created in this step; they will be created when real organisation and person records are added in a later step.

---

### Organisations

- **What it represents:** The place where **organisation-level information** will be held. Each organisation (the provider that runs one or more services) will have one record in this collection. The information will include the organisation’s identity (name and a stable identifier), any registered locations the organisation uses (if applicable), and organisation-level governance contacts. This collection does not hold care content or person-level data; it holds only what is needed to identify the organisation and to support registration and governance. It is the top of the hierarchy: organisation then services then people then care folders.

---

### Services

- **What it represents:** The place where **service or ward-level information** will be held. Each service (ward, team, care home, or service the organisation runs) will have one record in this collection. The information will include the service’s identity (name and a stable identifier), which organisation it belongs to, the type of service, and a summary of compliance for that service. This collection does not hold the full care folder for each person; it holds only what is needed to list the service, show its type, and show the service-level compliance view. The list of people in a service is found by asking which people belong to that service (people hold a reference to their service), not by storing a copy of the list here.

---

### People

- **What it represents:** The place where **person-level care information** will be held. Each person using the service will have one record in this collection. The information at the person level will include who the person is (identity reference and display name), which service they belong to, who is responsible for them (for example key worker), and the overall status of their care folder. Under each person, the **care folder** will later live in a dedicated sub-collection: the eight sections and document types from the Active Care Folder blueprint, with content, dates, and references to uploaded files. So the “people” collection is the top-level place for person information; the detailed folder will sit under each person when real data is added.

---

### Audit Log

- **What it represents:** The place where **audit and history information** will be held. It is a log of actions: each entry will record who did what and when (and optionally for which organisation, service, or person). The entries are append-only: new entries will be added when actions occur; existing entries will not be edited or deleted by users. This collection does not hold care content; it holds only the record of changes (document uploads, content updates, reviews and sign-offs, responsibility changes, organisation or service information changes). It is separate from organisation, service, and person data so that the audit trail cannot be overwritten or mixed with care content.

---

## 3. Use of Placeholder Documents

### Why Placeholder Documents Were Used

- In Firestore, a collection is not visible or usable until it has at least one document (or is created in a way that establishes the collection). To create the four collections in a single, controlled step, the organisation used **placeholder documents**. A placeholder is a minimal document that exists only so that the collection exists; it does not represent a real organisation, service, person, or audit entry. Using placeholders allows the organisation to say that “the four collections now exist” and to confirm that the security rules apply to those collection paths. Without a placeholder (or an equivalent way to create the collection), the collection would not exist and the rules could not be verified or applied to that path. So placeholders were used for **structure only**: to bring the agreed collections into existence so that the store is ready for real data in a later step.

---

### Confirmation That No Real Data Was Added

- **No real data was added.** No organisation names, no service names, no person names, no care plans, no risk assessments, no dates, no audit entries. No test data and no real data. The only documents added were the minimal placeholders described above. Placeholder documents do not contain any personal data, any care content, or any information that could be used to identify a real organisation, service, or person. They are marked or named so that they can be identified as placeholders and removed or replaced when the first real records are added. So this step is purely structural; the store remains empty of care data and person data.

---

## 4. Security and Compliance Confirmation

### That Firestore Security Rules Were Already Deployed

- **Confirmed.** The Firestore security rules were deployed in a previous step (as recorded in the First Deployment Firestore Security Rules document) before the collections were created. So when the collections were created, the store was already governed by the approved rules. The rules were not changed as part of this step. The organisation can state that the structure was created in an environment where access control was already in place.

---

### That Collections Are Protected by Default-Deny Rules

- **Confirmed.** The deployed rules include a **default deny**: any request that does not match a specific rule is refused. The rules explicitly allow read and write only for organisation, service, person, care folder, and audit log paths when the signed-in user’s role and scope (organisation, list of services) permit it. The four collections created in this step (organisations, services, people, audit log) are covered by those rules. So the new collections are protected by the same default-deny and explicit-grant behaviour as the rest of the store. No path is open by default; access is only allowed where the rules say so.

---

### That No Unauthorised Access Is Possible

- **Confirmed.** No user can read or write any of the four collections without being signed in and without the request matching the rules (for example the user’s organisation and service list must match the data they are asking to see or change). No application is connected yet, and no user accounts exist, so no requests are being made. When the application and users are added later, every request will be evaluated by the rules; unauthenticated access and cross-service access are not allowed. So the organisation can confirm that the collections are protected and that no unauthorised access is possible under the current rules.

---

## 5. Risks Avoided

The following explains what risks were avoided by the way this step was carried out: no real data, no sub-collections, and no application connection.

---

### By Not Adding Data

- **Data in the wrong place or before access control is in use.** If real organisation, service, person, or audit data had been added in this step, the organisation would have had to ensure that every field was correct, that no test or dummy data was mixed with real data, and that access was already correctly restricted. Adding no data avoids the risk of putting care data or person data into the store before the application is connected and before user roles and scope are in use. It also avoids the risk of creating data that later has to be moved, renamed, or deleted because the structure was wrong. So the risk of “data too early” or “data in the wrong structure” was avoided.

- **Exposure of personal or care data.** Until the application and users exist, the only way to add data would be outside the normal application flow (for example via a console or script). Adding no real data means that no personal data or care content is present to be exposed by mistake or misconfiguration. So the risk of exposing real data during structure creation was avoided.

---

### By Not Creating Sub-Collections

- **Sub-collections** are the nested places under an organisation (for example registered locations) and under a person (the care folder with sections and document types). They were **not** created in this step. Creating them would require at least one organisation document and one person document to nest under. Because no real organisation or person records exist yet, creating sub-collections would have meant creating more placeholder or dummy structure under placeholders, which would complicate the structure and could lead to confusion about what is real and what is placeholder. Not creating sub-collections keeps this step to the four top-level collections only. Sub-collections will be created when the first real organisation and person records are added in a later step. So the risk of an over-complex or ambiguous structure was avoided.

---

### By Not Connecting an Application

- **Requests before the application is ready.** If an application had been connected in this step, it could have tried to read or write the store. The store is empty (except for placeholders), so there would be little to read and no real data to change; but connecting an application would mix “structure creation” with “application go-live” and would make it harder to say exactly what was done when. Not connecting an application keeps this step purely about the store structure. The application will be connected in a later step when the organisation is ready for the first use. So the risk of overlapping or poorly defined steps was avoided.

---

## 6. Current System State

### What Exists

- **Four top-level collections:** organisations, services, people, and audit log. Each exists and is protected by the deployed Firestore security rules. Each contains only the minimal placeholder document or documents used to create the collection; no real data.
- **Security rules in effect.** The store is governed by the approved rules (default deny, role and scope checks, inspector read-only, audit and delete protections). The rules apply to the four collections and to any sub-collections that will be created later (for example under organisation or under person).
- **No sub-collections.** The nested places (registered locations under an organisation, care folder under a person) do not exist yet. They will be created when real organisation and person records are added.

---

### What Does Not Exist

- **No real data.** No organisation records, no service records, no person records, no care folder content, and no audit entries. No test data and no real data. Only placeholders for structure.
- **No application connected.** No web or mobile application is reading or writing the store. No client is sending requests.
- **No user accounts.** No staff, manager, admin, or inspector accounts exist. No one can sign in and no one can make requests to the store.
- **No sub-collections.** Registered locations and care folder sub-collections will be created in a later step when the first real organisation and person records are added.

---

### Summary

- **In place:** Firestore database enabled (locked mode, UK or EU region); Firestore security rules deployed and active; four top-level collections (organisations, services, people, audit log) created with placeholders only; no real data, no sub-collections, no application, no users.
- **Not yet in place:** Real organisation, service, person, and audit data; sub-collections (registered locations, care folder); application build and connection; user accounts and role assignment. The next steps will add real data and sub-collections when the application and users are ready.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Create the four agreed Firestore collections at this stage so the store has a clear structure before any application or real data; created empty (placeholders only) to avoid adding data before access control and users are in use. |
| **Collections created** | Organisations (organisation-level information), Services (service-level information), People (person-level information), Audit log (append-only who did what, when). No sub-collections. |
| **Placeholders** | Used so each collection exists and can be protected by the rules; no real data was added. |
| **Security** | Rules were already deployed; collections are protected by default-deny rules; no unauthorised access is possible. |
| **Risks avoided** | Not adding data (no data in wrong place, no exposure); not creating sub-collections (no over-complex structure); not connecting an application (clear, single step). |
| **Current state** | Four collections exist with placeholders only; rules active; no real data, no sub-collections, no application, no users. |

---

*This document is the formal governance evidence of the first creation of Firestore collections for the digital CQC readiness system. It should be retained with other foundation and governance documents and used when explaining to auditors or inspectors when and how the structure was created.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
