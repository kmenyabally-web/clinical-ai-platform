# First Deployment: Firestore Security Rules

**Formal Governance Evidence for a Regulated CQC Readiness System**

*This document records the first deployment of Firestore security rules for the digital CQC readiness system. It states why the rules were deployed at this stage, exactly what was deployed and what was not, that the deployed rules match the approved version, how the deployment is low-risk and how rollback would work, and the post-deployment state. It does not contain code or setup instructions. Plain English only. It serves as formal governance evidence of safe Firestore rules deployment.*

---

## 1. Purpose of Rules Deployment

### Why the Rules Were Deployed at This Stage

- The organisation had already enabled the Firestore database in a locked state (as recorded in the First Controlled Enablement Firestore Database document) and had completed a formal security review of the rules (as recorded in the Firestore Security Rules Review document), which resulted in approval with required conditions. The next planned step was to **deploy** the approved security rules so that the store is no longer only “locked” by the platform default but is **governed by the agreed rules**. Deploying the rules at this stage means that when the application is built and connected later, and when the first data and users are added, the store will already enforce who can read and write what. No data, no application, and no user accounts exist yet; so deploying the rules now does not change anyone’s access to live data. It only puts the rules in place so that the first access to the store (when it happens) is already controlled by the agreed behaviour.

- Deploying the rules in their own step keeps the change **small and documentable**. The organisation can state exactly when the rules were first deployed and can show that the rules were not altered during deployment. It also ensures that the store is never used for care data without the rules being active: the sequence is “database enabled and locked,” then “rules deployed,” then (in later steps) “structure created,” “application connected,” “users created,” and “data added.” So the rules are in place before any sensitive data or live use.

---

### What Risks This Deployment Is Intended to Control

- **Wrong or missing access control.** If the store were used without rules (or with weak or ad hoc rules), care data could be read or changed by the wrong people, or the audit log could be edited or deleted. Deploying the approved rules ensures that from the moment the store is used, every read and write is checked against the agreed conditions: only signed-in users, only within their organisation and service scope, with inspectors read-only and the audit log protected from user create, update, or delete. So the deployment is intended to control the risk that the store could be accessed or modified in a way that does not match the access intent.

- **Cross-service or unauthenticated access.** The rules enforce that no one can read or write organisation, service, person, or care folder data without being signed in and without the data being within their allowed scope. Deploying them ensures that when the application and users are added later, cross-service data leakage and unauthenticated access are prevented at the store from day one.

- **Tampering with evidence or audit.** The rules prevent any user from deleting or editing the audit log and from deleting organisation, service, person, or care folder records. Deploying them ensures that when the system goes live, the store will refuse any attempt to remove or alter evidence or history, which supports CQC expectations and accountability.

---

## 2. Scope of What Was Deployed

The following states exactly what was done in this deployment. Nothing beyond this was deployed or changed.

---

### Only Firestore Security Rules Were Deployed

- **What was deployed:** The Firestore security rules file that was reviewed and approved (as set out in the Firestore Security Rules Review document) was deployed to the project’s Firestore database. That file defines how the store decides whether to allow or refuse each request to read or write data (by organisation, service, person, care folder, and audit log). No other part of the system was deployed: no application code, no file storage rules, no authentication configuration changes, and no other platform settings. So the only change in this step was that the store now uses these rules to evaluate every request.

---

### That No Data Exists

- **No data was added or changed.** The store remains empty: no organisation records, no service records, no person records, no care folder content, and no audit entries. The deployment of the rules does not create or modify any data. It only defines how the store will behave when requests are made in the future. So there is no care data or person data in the store at this time.

---

### That No Applications Are Connected

- **No application was deployed or connected.** No web or mobile application is registered or linked to the project for the purpose of reading or writing the store. No client is sending requests to the store on behalf of users. So although the rules are now active, there is no application making requests yet. The rules will apply when the application is built and connected in a later step.

---

### That No Users Exist

- **No user accounts exist.** No staff, manager, admin, or inspector accounts have been created in the authentication service. So no one can sign in and no one can make requests to the store. The rules are in place but there are no users to allow or deny yet. User creation and the assignment of roles and scope (organisation, service list) will happen in a later step when the application is ready.

---

## 3. Confirmation of Approved Version

### That the Deployed Rules Exactly Match the Approved Version

- The rules that were deployed are the **same** as the version that was reviewed and approved in the Firestore Security Rules Review document. That review confirmed that the rules correctly implement the agreed access intent, guardrails, and conceptual rule behaviour (default deny, role and scope checks, read-only inspection, audit protection, no cross-service access without authority, authentication required). The file that was deployed was not modified after the review and before deployment. So the organisation can state that the live rules are the approved rules.

---

### That No Changes Were Made During Deployment

- **No edits were made to the rules during the deployment step.** The approved file was deployed as-is. No additions, removals, or adjustments were made for convenience or for “temporary” access. So the deployment record is clear: what was approved is what is now in effect. If any change to the rules is needed in the future, it will require a new review and approval and will be documented as a separate change.

---

## 4. Safety and Rollback Considerations

### Why This Deployment Is Low-Risk

- **No live data or live users.** The store is empty and no application is connected and no users exist. So the deployment does not affect anyone’s current access to care data or any live workflow. Nothing that staff, managers, or inspectors do today is changed by this step. The only effect of the rules is to define how the store will behave when it is used later. That makes the deployment low-risk: the rules cannot block or allow access to real data or real users yet, because there are none.

- **Rules have been formally reviewed.** The rules were reviewed against the agreed behaviour and access intent and were approved with conditions (as recorded in the Firestore Security Rules Review). So the organisation is not deploying untested or unreviewed logic; it is deploying rules that have been checked for compliance, safety, and inspection readiness.

- **Controlled, single change.** Only one thing was changed: the rules attached to the store. No data was migrated, no application was updated, and no user accounts were created. So the deployment is easy to describe and to reverse if needed.

---

### How the System Could Be Safely Rolled Back If Required

- **What rollback means here.** “Rollback” means reverting the store to a state where the rules that were deployed in this step are no longer in effect. In practice, that would mean deploying a previous version of the rules (for example the platform default that denies all access) or a minimal rule set that again denies all read and write. The store would then be in a locked state similar to the state it was in after the database was first enabled and before this deployment.

- **Why rollback would be safe.** Because no data exists and no applications are connected and no users exist, reverting the rules would not affect any live data or any user. No one would lose access to care information, because no one has access yet. The only effect would be that the store would again refuse all requests (or would use whatever rules were deployed in place of the current ones). So rollback is safe from a data and user perspective.

- **When rollback might be considered.** Rollback might be considered if a serious flaw were found in the deployed rules after deployment (for example a condition that incorrectly allows or denies access) and the organisation decided to revert to a known-safe state while the rules are corrected and re-reviewed. The organisation would then deploy the corrected rules after a new review. Because this is the first deployment, the “previous” state is the locked state (no rules or default-deny only); reverting to that would be a clear, documentable step.

---

## 5. Post-Deployment State

### What Is Now Protected

- **The store is governed by the agreed rules.** Every request to read or write data in the store (when such requests are made in the future) will be evaluated against the deployed rules. So the store will refuse unauthenticated access, will allow read and write only where the user’s role and scope (organisation, service list) permit, will block inspectors from any create, update, or delete, will block all user create, update, and delete on the audit log, and will block delete on organisation, service, person, and care folder data. In that sense, the store is **now protected** by the rules: the protection is active as soon as any client or application makes a request.

- **Unknown or new paths remain denied.** The rules include a default deny, so any path that does not match the explicit organisation, service, person, care folder, or audit rules will be refused. So if a new collection or path were added by mistake, it would not be accessible until a rule explicitly allows it. That keeps the store fail-safe.

---

### What Is Still Inactive

- **No data.** The store still holds no organisation, service, person, care folder, or audit data. So there is nothing to read or protect beyond the structure (when it is created). The rules are active but there is no content yet.

- **No application.** No application is connected to the store. So no requests are being made. The rules are “live” in the sense that they would apply to any request, but no request is being made until the application is built and connected.

- **No users.** No user accounts exist. So no one can sign in and no one can trigger a request that the rules would allow or deny. User creation and role assignment are still to be done.

- **No structure.** The collections (organisation, service, person, care folder, audit) may not yet exist or may be empty. Creating the structure and adding data are later steps. So the rules are in place for when that structure exists and is used.

---

### Summary of Current System State

- **In place:** Firestore database enabled (locked mode, UK or EU region); Firebase Authentication enabled (one sign-in method, no users); Firestore security rules deployed and active. The store is empty and governed by the approved rules; no one can access it yet because no application is connected and no users exist.
- **Not yet in place:** Collections and data structure; application build and connection; user accounts and role assignment; care data; audit entries (which will be written by a server process when the application is live). The conditions set out in the Firestore Security Rules Review (server-side audit write, custom claims and token issuance, application scoping of audit read) must be satisfied before the system is used for real care data.

---

## 6. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Deploy the approved Firestore security rules so the store is governed by the agreed behaviour before any data, application, or users exist; controls wrong access, cross-service leakage, and tampering with evidence or audit. |
| **Scope** | Only Firestore security rules were deployed; no data, no applications connected, no users. |
| **Approved version** | Deployed rules exactly match the version approved in the Firestore Security Rules Review; no changes were made during deployment. |
| **Safety** | Low-risk because no live data or users; rollback is safe (revert to locked or previous rules) and would not affect any care data or user. |
| **Post-deployment** | Store is protected by the rules for all future requests; data, application, users, and structure are still inactive and will be added in later steps. |

---

*This document is the formal governance evidence of the first deployment of Firestore security rules for the digital CQC readiness system. It should be retained with other foundation and governance documents and used when explaining to auditors or inspectors when and how the rules were deployed.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
