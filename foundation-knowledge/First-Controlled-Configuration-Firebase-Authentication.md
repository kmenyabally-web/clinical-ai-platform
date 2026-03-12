# First Controlled Configuration: Firebase Authentication

**Governance Evidence for Regulated UK Healthcare**

*This document records the first controlled configuration of Firebase Authentication for the digital CQC readiness system. It states why authentication was enabled at this stage, exactly what was enabled and what was not, what actions were deliberately not taken, how this preserves safety and compliance, and what readiness it creates for the next step. It does not contain code or setup instructions. Plain English only. It provides governance evidence of safe, minimal authentication setup.*

---

## 1. Purpose of Enabling Authentication

### Why Authentication Was Enabled at This Stage

- The organisation had already completed **read-only first access** to the Firebase console (as recorded in the Safe Read-Only First Firebase Access document) and had agreed the **minimum Firebase setup** and the **first technical build scope**. The next planned step was to enable the **sign-in capability** that the application will use so that staff, managers, and inspectors can prove who they are. Enabling authentication at this stage means that when the application is built and connected later, sign-in can work without a second, rushed configuration step. The authentication service is “ready” in the sense that one sign-in method is turned on; it is not yet used by any person or application.
- Enabling authentication now follows a **controlled, step-by-step** approach: first observe the console, then enable one authentication method in isolation, then (on later steps) create the data structure, then build and connect the application, then create user accounts and assign roles. Doing authentication in its own step keeps the change small, documentable, and reversible if needed. It also avoids the risk of enabling authentication at the same time as creating users or connecting the app, which would make it harder to say exactly what was done when and why.

---

### What Problem It Is Intended to Solve Later

- **Identity for every action.** When staff add a document, complete a review, or update a care plan, the system must know **who** did it. The audit trail (“who did what, when”) depends on the signed-in user’s identity. Enabling authentication now means that when the application is connected and users are created, every action can be tied to a real identity. Without authentication enabled, the application could not support sign-in and could not record “who” in the audit trail; enabling it in this step solves that dependency in advance.
- **Controlled access to care data.** The first build requires three roles: staff, manager, and inspector (read-only). The application will use the identity provided by authentication to decide what each user can see and do. Enabling authentication now means that when the application and the access rules are built, they can rely on “the user has signed in and has this identity.” The problem of “only the right people see and do the right things” is solved later by the application and the rules; this step ensures the **mechanism** for identity (sign-in) is in place.
- **Inspection and accountability.** CQC expects the service to control who can see and change care records and to show who did what. Enabling authentication is the first technical step toward that: it is the service that will verify who the user is. This configuration does not by itself create any users or access; it creates the **foundation** so that when users and roles are added, the story for inspectors is clear: “staff and inspectors sign in; the system knows who they are; access and audit are based on that identity.”

---

## 2. Scope of What Was Enabled

The following states exactly what was done in this first controlled configuration. Nothing beyond this was enabled or created.

---

### Which Authentication Method Was Enabled

- **One sign-in method only** was enabled, as agreed for the first build in the minimum Firebase setup document. That method is the one the organisation will use for staff, managers, and inspectors in the first build (for example email and password, or the single sign-on method agreed by the organisation). No other sign-in methods (for example social sign-in, phone, or additional providers) were enabled. The authentication area is now “on” for that one method only; no other methods are active.

---

### That No Users Were Created

- **No user accounts were created.** No staff, manager, or inspector accounts exist. No test accounts and no administrator accounts were added. The list of users in the authentication area remains empty (or unchanged from before this configuration). Enabling the sign-in method does not create any users; it only allows the authentication service to accept sign-in requests using that method **when** users are created in a later, planned step. So at this moment, no one can sign in, because no one has an account.

---

### That No Applications Were Connected

- **No frontend application or client was connected** to the authentication service. No web app, mobile app, or other software was registered or linked to the project for the purpose of sign-in. The authentication service is enabled but is not yet used by any application. When the application is built and connected in a later step, it will be explicitly registered and linked; that has not happened in this step. So there is no way for a user (even if an account existed) to sign in through an app, because no app is connected yet.

---

### That No Roles or Permissions Were Assigned

- **No roles or permissions were assigned** to any user or to any application. The minimum setup document requires three roles (staff, manager, inspector). Those roles will be applied by the application and by the rules that control access to data; they are not stored or assigned in the authentication service in this step. The authentication service only answers “who is this user?” (identity); it does not answer “what can this user do?” (roles and permissions). Role assignment and permission rules are part of a later step when the application and the data structure are in place. So this configuration does not grant anyone access to any data or screen.

---

## 3. Actions Explicitly NOT Taken

The following actions were **deliberately not performed** during this first controlled configuration. This list is part of the governance record.

- **Creating user accounts.** No staff, manager, inspector, or test accounts were created. No one was added to the user list. Accounts will be created in a later step when the application is ready to use them and when the organisation has agreed who should have access. Creating accounts now would have allowed someone to sign in before the application and the access rules were in place, which would be unsafe.
- **Assigning access or permissions.** No access to data, screens, or services was assigned to any user or role. Roles (staff, manager, inspector) and what each can see and do will be defined and applied when the application and the data structure are built. Assigning access now would have been meaningless (no users, no app) and could have created confusion about “who has what” before the system is ready.
- **Connecting the frontend application.** No web or mobile application was connected or registered to use the authentication service. The application that staff and inspectors will use will be built and connected in a later step. Connecting an app now would have created a path for sign-in before user accounts and access rules exist; keeping the app disconnected keeps the boundary clear: authentication is “ready” but not yet in use.
- **Enabling other sign-in providers.** Only the one method agreed for the first build was enabled. No additional sign-in methods (for example social, phone, or another identity provider) were enabled. Adding more methods now would widen the configuration without a clear need for the first build and would require extra governance and testing. The first build uses one method only; other methods can be considered later if the organisation decides.
- **Changing any security or session settings.** No changes were made to session length, password rules, or other security settings beyond what was strictly required to enable the one sign-in method. Those settings can be reviewed and set in a later step when the organisation’s security policy is applied. Changing them now could have unintended effects when users are finally created.
- **Linking authentication to data or storage.** No rules or links were created that tie the authentication service to the database or to file storage. Access rules (who can read or write what) will be written when the data structure exists and when the application is connected. Linking authentication to data in this step would have been premature and could have created incorrect or incomplete access control.

---

### Why These Actions Were Postponed

- **Safety.** Creating users or connecting an app before the application and the access rules are ready could allow someone to sign in and reach data (or attempt to) before the system can properly restrict what they see and do. Postponing user creation and app connection until the application and rules are in place prevents any accidental or early access to care data.
- **Clarity.** Roles and permissions depend on the application and the data structure (for example “staff see only their service’s people”). Assigning them before the application exists would be unclear and might have to be redone. Postponing role and permission assignment until the application is built keeps the design clear and avoids rework.
- **Governance.** Each step (enable one method, create structure, build app, create users, assign roles) is easier to document and to explain when it is done on its own. Doing “authentication plus users plus app” in one go would make it harder to say what was done when and would blur the boundary between “authentication is ready” and “the system is live.” Postponing user creation, app connection, and role assignment keeps this step minimal and fully documentable.
- **Alignment with the build plan.** The first technical build scope and the day-one playbook assume a sequence: structure first, then application, then users and roles. Postponing these actions keeps this configuration in line with that sequence and ensures that the next step can proceed in the agreed order.

---

## 4. Safety and Compliance Rationale

### How Enabling Authentication in Isolation Preserves System Safety

- **No one can sign in yet.** Because no user accounts were created and no application was connected, there is no way for anyone to use the authentication service to sign in. The system is not “live” for users; it is only prepared for the day when the application and the first user accounts are added. So enabling authentication does not by itself create any new access path or risk of unauthorised use.
- **No link to care data.** Authentication was not linked to the database or to file storage. Even if a user account existed and an app were connected, the access rules that control what data each role can see and change are not yet in place. Enabling authentication in isolation means that the “who are you?” part is ready, but the “what can you do?” part is deliberately left for a later step when it can be done correctly.
- **Single, reversible change.** Only one thing was changed: one sign-in method was turned on. If the organisation needed to reverse this step (for example to switch to a different method), the change would be clear and contained. There are no users to remove, no app to disconnect, and no roles to undo. That keeps the system in a safe, understandable state.

---

### How It Prevents Accidental Access

- **No accounts, no sign-in.** Without user accounts, no one can sign in. Without a connected application, there is no place for a user to enter their details and attempt sign-in. So there is no risk of a staff member, manager, or inspector accidentally (or deliberately) signing in and reaching screens or data before the system is ready.
- **No permissions, no data access.** Even if someone had console or administrative access to the project, the authentication service does not by itself grant access to care data. Data access will be controlled by rules that are written when the data structure and the application exist. So this step does not open any new door to care data; it only prepares the identity mechanism for when that door is properly built and controlled.

---

### How It Supports Later Auditability

- **Clear record of what was done.** This document records that only one sign-in method was enabled; no users, no app, no roles. When the organisation is asked “how did you set up authentication?”, it can point to this step: we enabled one method in a controlled way and did nothing else. That supports both internal audit and external inspection.
- **Staged, explainable rollout.** The sequence is: first read-only observation, then enable authentication only, then (later) structure, application, users, roles. Each step has its own governance document. That makes it possible to show “we did not enable everything at once; we did it step by step and documented each step.” Auditability depends on that clarity.
- **Foundation for “who” in the audit trail.** When the application is built and users sign in, every action will be tied to an identity provided by this authentication service. Enabling it now in a controlled way means that when the audit trail is implemented, the organisation can say “the identity that appears in the audit trail comes from the authentication service we configured in this step.” So this step directly supports the future audit trail and the ability to answer “who did what, when.”

---

### How It Aligns with CQC Expectations

- **Access control.** CQC expects the service to control who can see and change care records. Enabling authentication is the first technical enabler of that: it is the service that will verify who the user is. That it was done in isolation (no users, no app, no roles yet) shows that the organisation is building access control in a planned way rather than turning it on without preparation.
- **Accountability.** CQC expects the service to know who did what. The audit trail depends on a reliable identity for each user. Enabling authentication in this step ensures that when users and the application are added, the identity that the audit trail records will come from a properly configured, documented source. That supports the service’s ability to demonstrate accountability to CQC.
- **No premature or ungoverned access.** CQC would be concerned if the service had created user accounts or connected an application before the system could properly restrict what users see and do. By not creating users or connecting the app in this step, the organisation demonstrates that it will not allow real access until the application and the access rules are in place. That aligns with CQC’s expectation that care data is protected and that access is intentional and controlled.

---

## 5. Readiness for the Next Step

### What This Step Now Makes Possible

- **Sign-in can be used when the application is ready.** When the application is built and connected in a later step, it can use the authentication service to let users sign in. The organisation does not need to return to the console to “turn on” authentication at that point; it is already enabled. So the next step that involves the application can assume that the sign-in method is available.
- **Identity will be available for the audit trail.** When the application records “who did what, when,” it will use the identity that the authentication service provides after sign-in. This step ensures that the authentication service is ready to provide that identity when the first user accounts are created and the application is connected. So the next steps (create structure, build app, create users) can proceed with the knowledge that “who” will be available for the audit trail.
- **A single, documented configuration.** The organisation now has a clear record of what “first authentication configuration” meant: one method enabled, nothing else. That makes it easier to plan the next step (for example “create the data structure” or “build and connect the application”) without ambiguity about what is already in place.

---

### What Must Still Be Done Before Any Real Access Is Allowed

- **Create the data structure.** The place where care data, documents, and audit will be stored (database and storage) must be created and structured according to the minimum setup document and the day-one decisions. Until that exists, there is no care data to access; and the application cannot enforce “staff see only their people” or “inspector is read-only” without a structure to attach those rules to.
- **Build and connect the application.** The application that staff and inspectors will use (screens, sign-in flow, folder, documents, and so on) must be built and connected to the authentication service and to the data structure. Until that is done, no one can sign in through the app or see any screen. Connecting the app will be a separate, documented step.
- **Create user accounts.** The first user accounts (staff, manager, and optionally a test inspector account) must be created in a planned way, with the organisation’s approval. Until accounts exist, no one can sign in even if the app were connected. User creation will happen when the application is ready and when the organisation has decided who should have access.
- **Assign roles and enforce access rules.** The application and the rules that control access to data must be configured so that each user has the correct role (staff, manager, or inspector) and so that the rules enforce “staff see only their people,” “manager sees the service,” and “inspector is read-only.” Until that is done, real access must not be allowed. Role assignment and rule configuration will happen when the application and the data structure are in place.
- **Test sign-in and access before go-live.** Before any real staff or inspector uses the system, sign-in and access must be tested: that the right people can sign in, that they see only what they should, and that the audit trail records who did what. That testing is a later step, after users and the application are in place.

**Summary:** Enabling authentication in this step **does not** by itself allow any real access. Real access will only be allowed after the data structure exists, the application is built and connected, user accounts are created, roles and access rules are in place, and sign-in and access have been tested. This step only makes it possible to do those things later with the authentication service already prepared.

---

## 6. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Enable the sign-in capability the application will use later, in a controlled step, so that identity is ready for the audit trail and for access control without creating any access yet. |
| **Scope** | One sign-in method enabled; no users created; no applications connected; no roles or permissions assigned. |
| **Actions not taken** | No user accounts, no access assignment, no app connection, no other sign-in providers, no security setting changes, no link to data. Postponed to keep the step minimal, safe, and documentable. |
| **Safety and compliance** | No one can sign in; no link to care data; single reversible change; prevents accidental access; supports auditability and a clear rollout story; aligns with CQC on access control and accountability. |
| **Readiness** | Sign-in can be used when the app is ready; identity will be available for the audit trail. Before real access: create structure, build and connect app, create users, assign roles and rules, test. |

---

*This document provides governance evidence of the first controlled configuration of Firebase Authentication for the digital CQC readiness system. It should be kept with other foundation and governance documents and used when explaining how authentication was brought into use in a safe, minimal way.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
