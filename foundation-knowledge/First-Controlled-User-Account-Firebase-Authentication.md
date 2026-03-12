# First Controlled User Account: Firebase Authentication

**Formal Governance Evidence for a Regulated CQC Readiness System**

*This document records the first controlled creation of a user account in Firebase Authentication for the digital CQC readiness system. It states why a user account was created at this stage, exactly what was created and what was not, that no roles or access were assigned and no application is connected, how this preserves data protection and aligns with CQC and UK governance, what actions were deliberately not taken, and the current system state. It does not contain code or setup instructions. Plain English only. It serves as formal governance evidence of safe initial user creation.*

---

## 1. Purpose of Creating the First User

### Why a User Account Was Created at This Stage

- The organisation had already enabled Firebase Authentication with one sign-in method (as recorded in the First Controlled Configuration Firebase Authentication document), had enabled and secured the Firestore database and deployed security rules (as recorded in the First Deployment Firestore Security Rules and First Creation Firestore Collections documents), and had agreed the sequence for bringing the system into use. The next planned step was to **create the first user account** in a controlled way so that the organisation has a single, documented identity in the authentication service before any roles are assigned, any application is connected, or any access to care data is possible. Creating the first user at this stage means that when the organisation is ready to assign roles and connect the application in later steps, there is already one governed account to use. No access to data or to the application is granted in this step; only the authentication record (the fact that this user exists and can be identified by the system) is created. So the first user is created **in isolation**: the account exists, but it cannot be used to reach any care data or to perform any action in the system until roles and the application are in place.

- Creating the first user in its own step keeps the change **small and documentable**. The organisation can state exactly when the first account was created and can show that no roles or permissions were assigned and no application was connected. It also proves that the process for creating users works in a controlled way before more accounts are added. When staff, manager, and inspector accounts are created later, the organisation will follow the same governed approach: create the account first, then assign role and scope in a separate, documented step. So this step establishes the pattern for safe user creation and provides one known account for governance and for the next steps.

---

### What It Is Intended to Enable Later

- **Role assignment.** When the application and the access rules are ready, the organisation will assign roles (staff, manager, admin, inspector) and scope (organisation, list of services) to users. The first user created in this step will be a candidate for that assignment in a later step. Creating the account now means that when the organisation is ready to assign the first role (for example a system administrator or a test manager), the identity already exists; the organisation only adds the role and scope, it does not create the account and assign the role in one go. So this step enables a clear separation: “first we create the account; later we assign what this account can do.”

- **Application sign-in.** When the application is built and connected, users will sign in using the authentication service. The first user account created in this step will be able to sign in only when the application is connected and when the organisation has decided to allow it. Creating the account now does not by itself allow sign-in to any live system; it prepares one identity so that when the application is connected and roles are assigned, the organisation can test sign-in and access with a known, governed account. So this step enables later sign-in and testing without rushing account creation at the same time as go-live.

- **Audit trail identity.** When the audit trail is used, each action will be tied to the signed-in user’s identity. The first user created in this step will have an identity that the system can record (for example “user X completed this action”). That identity will only appear in the audit trail when the user has actually signed in through the application and performed an action; in this step, the user has not signed in and has no access, so no audit entries exist for them yet. So this step enables the future audit trail to have a real, governed identity to attach to actions when the system is in use.

---

## 2. Scope of the User Account

The following states exactly what was done when creating the first user. Nothing beyond this was created or configured.

---

### That Only a Basic Authentication Record Was Created

- **What was created:** A single **basic authentication record** in the Firebase Authentication service. That means the user has an identity that the authentication service recognises (for example an email address and a stored credential, or the equivalent for the sign-in method that was enabled). The record is the minimum needed for the authentication service to say “this person exists and can be identified when they sign in.” No extra information (for example display name, phone number, or custom attributes) was added unless it was strictly required by the sign-in method. So the first user is a minimal record: “this identity exists in the authentication service,” and nothing more.

---

### That No Roles or Permissions Were Assigned

- **No roles or permissions were assigned.** The user does not have a role (staff, manager, admin, or inspector) in the application or in the access rules. The user does not have any permission to read or write data, to view screens, or to perform actions. Role and permission assignment will happen in a later step when the application is connected and when the organisation has agreed how roles are stored and enforced (for example in custom claims or in the application). So the first user is “unassigned”: they exist as an identity but have no defined role or permission in the system.

---

### That the User Has No Access to Firestore Data

- **The user has no access to Firestore data.** The Firestore security rules that were deployed in a previous step allow read and write only when the signed-in user’s token contains the correct organisation, service list, and role. The first user has not been given any organisation, service list, or role in the token (or in any place the rules use). So even if the user were to sign in (for example via a console or a test tool), any request to read or write Firestore would be refused by the rules, because the user would not have the required claims or scope. So the first user cannot access any organisation, service, person, care folder, or audit data. No access to the structured store was granted in this step.

---

### That No Application Is Connected

- **No application is connected.** No web or mobile application is registered or linked to the project for the purpose of sign-in. So the first user cannot sign in through the normal application that staff and inspectors will use, because that application does not exist or is not connected yet. There is no “place” for the user to enter their details and sign in to the CQC readiness system. If the user were to sign in via some other means (for example a developer tool or the Firebase console), they would still have no role or scope and would therefore have no access to Firestore or to any care data under the deployed rules. So creating the first user does not create a path to the live system; the application path is not yet open.

---

## 3. Safety and Compliance Rationale

### How Creating a User in This Controlled Way Preserves Data Protection

- **No personal or care data is accessible.** The first user has no role, no scope, and no permission to read or write Firestore. The rules refuse any request that does not include the correct organisation, service list, and role. So the user cannot see or change any organisation, service, person, care folder, or audit data. Creating the account in this minimal way means that no new access to personal data or care data is created. Data protection is preserved because the user is an identity only; they are not granted access to any data held in the system.

- **No data is stored about the user beyond what is needed for sign-in.** The authentication record holds only what is required for the chosen sign-in method (for example identifier and credential). No care-related or role-related data is stored in this step. So the organisation is not collecting or processing extra personal data beyond what is necessary for the purpose of “this user can be identified when they sign in.” That aligns with data minimisation and with the principle that data is only held for a clear purpose.

---

### How It Prevents Unauthorised Access

- **The user cannot reach care data.** Without a role and without organisation and service scope in the token (or in whatever the rules use), every Firestore request from this user would be refused by the deployed rules. So there is no path from “first user signs in” to “first user reads or writes care data.” Unauthorised access is prevented by the rules that were already in place before this user was created.

- **No application path yet.** Because no application is connected, the user cannot sign in through the normal user interface. So there is no risk of a staff member or inspector accidentally using this account to reach the system before roles and access are properly configured. Unauthorised access is also prevented by the fact that the application is not yet the route for sign-in.

- **One account, fully documented.** The organisation has created exactly one user and has documented that no roles or access were assigned. So there is no ambiguity about “who has access.” The first user is known and governed; no other accounts exist yet. That makes it easier to prevent and to detect any future unauthorised use, because the set of accounts is small and documented.

---

### How It Aligns with CQC and UK Governance Expectations

- **Access control.** CQC expects the service to control who can see and change care records. Creating the first user without assigning any role or access shows that the organisation does not grant access until it is deliberate and documented. The user exists as an identity only; what they can do will be decided in a later, governed step when the application and the rules are ready. That aligns with CQC’s expectation that access is intentional and controlled.

- **Accountability.** CQC expects the service to know who did what. The first user has an identity that can later be used in the audit trail when they are given a role and when they sign in through the application. Creating the account in a controlled way means that when the audit trail records “user X did this,” the organisation can show that “user X” was created in this step and was later assigned a role in a documented way. That supports accountability and the ability to explain to inspectors how user identities are brought into the system.

- **UK data protection and governance.** UK GDPR and the ICO expect organisations to process personal data fairly, with a clear purpose and with appropriate security. Creating one user account in isolation, with no access to care data and no extra processing, is a minimal, purposeful step. The organisation can explain to data subjects and to regulators that the first user was created for the purpose of establishing a governed identity before any access is granted, and that access will be granted only in a later, documented step. That aligns with the expectation that data and access are managed in a planned, transparent way.

---

## 4. Actions Explicitly NOT Taken

The following actions were **deliberately not performed** when creating the first user. This list is part of the governance record.

---

### Assigning Roles

- **No role was assigned.** The user does not have the role of staff, manager, admin, or inspector. Roles will be assigned in a later step when the application is connected and when the organisation has agreed how roles are stored (for example in custom claims or in application configuration). Assigning a role now would have suggested that the user has access before the application and the rules are ready to enforce it. Restraint is critical: the organisation must be able to say that no one had a role until roles were deliberately assigned in a governed step.

---

### Granting Access

- **No access was granted** to Firestore, to file storage, or to any part of the system. The user cannot read or write any data. Granting access now would have created a path to care data before the application is in place and before the organisation has confirmed who should see what. Restraint is critical: access must only be granted when the application and the rules can enforce it and when the organisation has approved it.

---

### Signing In

- **The user was not signed in** as part of this step. No sign-in was performed with this account to access the project, the console, or any application. Signing in now would have mixed “create the account” with “use the account,” and could have created session or audit records before the organisation has decided how sign-in and audit will work in the live system. Restraint is critical: the first sign-in with this account should happen in a later, deliberate step when the application is connected and when the organisation is ready to test or to go live.

---

### Connecting an Application

- **No application was connected.** No web or mobile application was linked to the project for sign-in. Connecting an app now would have created a way for the first user (or anyone with an account) to attempt sign-in and to reach the system before roles and access are configured. Restraint is critical: the application will be connected in its own step when the organisation is ready for the first controlled sign-in and access test.

---

### Creating Additional Users

- **No additional user accounts were created.** Only one user was created in this step. Creating more users now would have expanded the set of identities without the same controlled, documented process for each. Restraint is critical: the organisation will create further accounts in later steps, one by one or in a small batch, with the same governance (create account, then assign role and scope in a separate step). This step is only about the **first** controlled user.

---

### Why Restraint Is Critical at This Stage

- **Safety.** Assigning roles or granting access before the application and the rules are ready could allow the user to reach care data or to perform actions that the system is not yet able to control properly. Restraint keeps the first user as an identity only, so that no new access or risk is introduced.

- **Clarity.** The organisation must be able to show that “first we created one account with no role and no access; later we will assign role and connect the application.” Doing too much in this step (roles, access, sign-in, app connection) would blur that story and would make it harder to explain to auditors or inspectors what was done when and why.

- **Governance.** Each step is easier to document and to approve when it does one thing. Creating the first user without roles, access, sign-in, or app connection keeps this step minimal and fully documentable. Restraint at this stage is what makes this document reliable as formal governance evidence of safe initial user creation.

---

## 5. Current System State

### What Exists

- **One user account** in the Firebase Authentication service. The account is a basic authentication record only: the user has an identity that the system can recognise when they sign in, but no role, no scope, and no permission to access any data or application.
- **Authentication service** with one sign-in method enabled (as configured in the First Controlled Configuration document). The first user was created using that method. No other users exist.
- **Firestore** with security rules deployed and four collections created (as recorded in the First Deployment and First Creation documents). The rules and the collections are in place; the first user has not been given any claim or scope that would allow them to read or write Firestore.
- **No application connected.** No web or mobile application is linked for sign-in or for access to the CQC readiness system.

---

### What Remains Inactive

- **No roles or permissions.** The first user has no role (staff, manager, admin, inspector) and no permission to read or write data or to use any part of the system. Role assignment will happen in a later step.
- **No access to Firestore data.** The first user cannot read or write organisation, service, person, care folder, or audit log data. The rules refuse any request from this user because they do not have the required organisation, service list, and role in their token (or in whatever the rules use). So the structured store remains inaccessible to this user until roles and scope are assigned in a later step.
- **No sign-in through the application.** The user has not signed in as part of this step, and there is no connected application for them to sign in to. The first sign-in will happen when the application is connected and when the organisation has decided to allow it.
- **No other users.** No other staff, manager, admin, or inspector accounts exist. Further accounts will be created in later steps when the organisation is ready.

---

### Summary

- **In place:** Firebase Authentication with one sign-in method; one basic user account with no role and no access; Firestore enabled with rules and four collections; no application connected. The first user exists as an identity only; they cannot access any care data or use the system until roles and the application are in place.
- **Not yet in place:** Role and scope assignment for the first user; connection of the application; first sign-in and access test; creation of additional user accounts. The next steps will assign roles and connect the application when the organisation is ready for controlled sign-in and access.

---

## 6. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Create the first user account in a controlled way so the organisation has one documented identity before any roles or access are granted; enables later role assignment, application sign-in, and audit trail identity. |
| **Scope** | Only a basic authentication record was created; no roles or permissions assigned; the user has no access to Firestore data; no application is connected. |
| **Safety and compliance** | Data protection preserved (no access to care data); unauthorised access prevented by rules and by no app connection; aligns with CQC and UK governance on access control, accountability, and minimal, purposeful processing. |
| **Actions not taken** | No role assignment, no access granted, no sign-in, no application connection, no additional users. Restraint is critical to keep this step minimal, safe, and documentable. |
| **Current state** | One user account exists with no role and no access; authentication and Firestore are in place; no application, no sign-in, no other users. |

---

*This document is the formal governance evidence of the first controlled user account created in Firebase Authentication for the digital CQC readiness system. It should be retained with other foundation and governance documents and used when explaining to auditors or inspectors when and how the first user was created.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
