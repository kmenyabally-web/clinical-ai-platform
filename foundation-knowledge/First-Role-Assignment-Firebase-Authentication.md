# First Role Assignment: Firebase Authentication

**Formal Governance Evidence for a Regulated CQC Readiness System**

*This document records the first assignment of a role to a user in the digital CQC readiness system. It states why a role is being assigned at this stage, which role was selected and why, what authority that role is intended to allow and what it does not allow, how this preserves safety and aligns with CQC expectations, what actions were deliberately not taken, and the current system state. It does not contain code or setup instructions. Plain English only. It serves as formal governance evidence of the first role assignment decision.*

---

## 1. Purpose of First Role Assignment

### Why a Role Is Being Assigned at This Stage

- The organisation had already created the first user account in Firebase Authentication without assigning any role (as recorded in the First Controlled User Account Firebase Authentication document). The next planned step was to **assign the first role** to that user so that when the application is connected and the user signs in, the system will know what authority they have. Assigning a role at this stage means that the organisation has made a deliberate, documented decision about the first user’s role before any application is connected or any access to care data is possible. No sign-in, no data access, and no use of the system happens in this step; only the **decision and the assignment** of the role are recorded. So the first role is assigned **in isolation**: the user now has a role on record, but they cannot exercise it until the application is connected and they sign in in a later, governed step.

- Assigning the first role in its own step keeps the change **small and documentable**. The organisation can state exactly when the first role was assigned and can show that only one role was assigned to one user, with no data access granted and no application connected. It also establishes the pattern for future role assignment: each role is assigned deliberately, with a clear reason and with authority constrained to what that role is intended to allow. So this step is both a governance record and a template for how roles will be assigned to other users later.

---

### Why Starting with a Limited Role Is Important

- **Safety.** The system has four roles: admin, manager, staff, and inspector. Each role carries different authority. Starting with a **limited** role means that the first user is not given every possible permission at once. The role chosen for the first assignment is the one that is needed for the next step (setting up organisation and service structure) and no more. So the principle is: assign the minimum role required for the next governed step, and add further roles or users only when there is a clear need and a documented decision.

- **Clarity.** When the organisation is asked “who has what role?”, it can point to this step: we assigned one role (admin) to the first user, and we did not assign any other roles or grant any data access or connect any application. Starting with a limited role makes it easy to explain who can do what and why. It also makes it easier to add a second role or a second user later, because the first assignment is already clear and documented.

- **Governance.** CQC and UK data protection expect that access to care data is justified and controlled. Assigning a limited role first shows that the organisation does not grant broad access by default. The first user has the authority that goes with one role only; any additional authority (for example assigning a manager or staff role to another user) will be a separate, documented step. So starting with a limited role supports the organisation’s ability to demonstrate that access decisions are intentional and recorded.

---

## 2. Role Selected

### Which Role Was Selected

- **The role selected was admin.** The first user (the single account created in the First Controlled User Account document) has been assigned the **admin** role. No other role (manager, staff, or inspector) was assigned to this user. No other user has been assigned any role. So the first role assignment is: first user, admin role only.

---

### Why This Role Was Chosen as the First Role

- **Admin is the role that can establish organisation and service structure.** Before any staff or manager can work with people and care folders, the system must have at least one organisation and at least one service. In the agreed access rules, only the **admin** role can create and update organisation-level information (organisation identity, registered locations, organisation-level governance contacts). Admin (together with manager) can also create and update services and people. So admin is the role that is needed to “bootstrap” the system: to create the first organisation record and the first service record when the application is connected. Choosing admin as the first role means that when the organisation is ready for the next step (connecting the application and creating the first organisation and service), the first user will already have the role that allows them to do that. No second user or second role is required for that step.

- **Admin has no direct access to care folder content by default.** Admin is responsible for organisation-level and (with manager) service-level setup. Admin does not, by the agreed design, have a list of services they “work in” in the same way as staff or manager; their authority is over organisation and over the ability to create or update services and people when the organisation and service structure is being set up. So assigning admin first does not create a user who can immediately read or write person-level or care folder data across the system; it creates a user who can, when the application is connected, set up the structure that other roles (manager, staff) will then use. That makes admin the safest and most logical first role: it enables the next step without granting broad access to care content.

- **One admin is enough for the first step.** The organisation only needs one user with the authority to create the first organisation and first service. Assigning admin to the first user satisfies that need. Additional admin users, or manager and staff users, will be assigned in later steps when the organisation has decided who should have access and for what purpose. So choosing admin as the first role avoids over-assignment: we assign one role to one user, and we do not assign admin to multiple users or add manager or staff roles in this step.

---

### What Responsibility This Role Carries Conceptually

- **Organisation-level information.** The admin role is responsible, conceptually, for **organisation identity and governance**. That includes: the organisation’s name and stable identifier; any registered locations the organisation uses (if applicable); and organisation-level governance contacts (for example designated safeguarding lead). So the admin is the role that maintains “who we are” at the organisation level. Updates to this information should be rare (for example a change of organisation name or a new registered location) and should be recorded in the audit log. Frontline staff are not responsible for this; only administrators or senior managers are.

- **Service and person structure (with manager).** In the agreed rules, admin (or manager) can create and update services and people. So the admin role also carries responsibility for **setting up the first service or services** and, when needed, **creating the first person records**. That is the “structure” side: ensuring that the organisation has at least one service and that people can be added to that service. The admin does not, by design, have ongoing day-to-day access to every care folder in the way a manager or staff member does; their responsibility is to establish and maintain organisation and service structure so that managers and staff can then work within their scope. So conceptually, the admin role is about **governance and structure**, not about day-to-day care content entry or review.

- **No audit log or delete authority.** The admin role cannot create, update, or delete the audit log; no user role can. The admin role cannot delete organisation, service, or person records; the rules refuse delete for all users. So the responsibility of the admin is limited to **create and update** of organisation, service, and person (and, when the application supports it, the care folder under a person) within the agreed rules. They cannot remove evidence or alter the audit trail.

---

## 3. Scope of Authority

### What This Role Is Intended to Allow Later

- **When the application is connected and the user signs in**, the admin role is intended to allow the first user to: create and update the organisation record (organisation identity, registered locations if used, organisation-level governance contacts); create and update service records (service identity, type, organisation reference) so that the organisation has at least one service; and create person records (person identity, service reference, responsibility) so that people can be added to the service. So the role is intended to allow the **setup of organisation and service structure** and the **creation of people**, in line with the agreed access rules. It is also intended to allow the user to read organisation and service data so that they can manage it. It is **not** intended to allow the user to act as a day-to-day staff or manager across all care folders unless the organisation later assigns an additional role or scope; the first assignment is admin only.

- **Authority is enforced by the rules.** What the admin can do is defined by the Firestore security rules and by how the application uses the user’s role and scope. The rules already deployed (as recorded in the First Deployment Firestore Security Rules document) state that only the admin role can create or update organisation; only admin or manager can create or update services and people, within their organisation and scope. So the authority of the admin role is not open-ended; it is **constrained by the rules** that were approved and deployed in an earlier step. When the application is connected, every request from this user will be checked against those rules; only requests that match the admin role and the user’s organisation and scope will be allowed.

---

### What It Explicitly Does NOT Allow

- **It does not allow access to the audit log for create, update, or delete.** No user role can add, change, or remove audit entries through the rules. The audit log is append-only and is written by a secure server process when actions occur. So the admin role does not include any authority to edit or delete the audit trail.

- **It does not allow delete of organisation, service, or person.** The rules refuse delete for organisation, service, person, and care folder for all users. So the admin role does not allow the user to remove organisation, service, or person records or to delete care folder content. Critical evidence and structure cannot be removed by the admin or by any other role.

- **It does not allow inspector or read-only override.** The admin role is not the inspector role. When the organisation assigns an inspector account in a later step, that account will have read-only access. The admin role does not grant or remove inspector status; it is a separate role with separate authority.

- **It does not allow access without the application and sign-in.** The role is assigned so that when the user signs in through the application, the system will know they are an admin. The role does not by itself grant access to Firestore or to any data until the user has signed in and the application has sent requests that meet the rules. So the role does not allow “back door” or unauthenticated access; it only defines what the user will be allowed to do **when** they sign in through the application in a later step.

---

### Why Authority Is Deliberately Constrained

- **Least privilege.** The organisation has assigned only the admin role and only to one user. No manager, staff, or inspector role was assigned. No second admin was assigned. So the first user has the minimum authority needed for the next step (set up organisation and service) and no more. Constraining authority in this way reduces the risk of over-permission and makes it easier to explain to inspectors who can do what.

- **Role and rules together.** The authority of the admin role is not “do anything”; it is “do what the rules allow for the admin role.” The rules were written and reviewed so that admin can create and update organisation (and with manager, services and people) but cannot delete organisation, service, or person, and cannot touch the audit log. So authority is constrained both by “we only assigned one role” and by “the rules only allow that role to do certain things.” That double constraint supports safety and compliance.

- **No use until the application is connected.** Even with the admin role assigned, the user cannot exercise that authority in this step because no application is connected and no data access has been granted. So the organisation has constrained authority in time as well: the role is on record, but it cannot be used until the next governed step (connect application, sign-in, and then use the role to create organisation and service). That prevents any accidental or early use of admin authority before the organisation is ready.

---

## 4. Safety and Compliance Rationale

### How Assigning This Role in Isolation Preserves System Safety

- **No new access path in this step.** Assigning the admin role does not connect an application or open Firestore to this user. The user still cannot sign in through the CQC readiness application (no application is connected) and cannot read or write data until they sign in through an application that sends requests that meet the rules. So assigning the role in isolation does not create a new way for anyone to reach care data. System safety is preserved because the **assignment** of the role is separate from the **use** of the role; use will only happen when the application is connected and the user signs in in a later step.

- **One role, one user.** Only one role (admin) was assigned to only one user. So the system does not have a large set of users with overlapping or unclear authority. If something were to go wrong, the organisation could point to a single user and a single role and could review or revoke that assignment. That keeps the system in a simple, understandable state and preserves safety by limiting the number of privileged accounts.

- **Rules already in place.** The Firestore security rules were deployed before this step. So when the admin user eventually signs in and the application sends requests, every request will be checked against those rules. The rules will allow only what is permitted for the admin role (create and update organisation, and with scope, services and people); they will refuse delete and any access to the audit log. So assigning the role does not weaken the rules; it only defines which user will have admin authority when they use the application. Safety is preserved by the rules that are already active.

---

### How It Prevents Over-Permission

- **No additional roles.** The first user was not assigned manager, staff, or inspector. So they do not have the combined authority of “admin plus manager” or “admin plus staff.” Over-permission is avoided by assigning exactly one role and by documenting that no other roles were assigned in this step.

- **No scope beyond what is needed.** The admin role will need an organisation (and possibly a service list) when the user signs in and uses the application, so that the rules can evaluate “this user is admin for this organisation.” In this step, the organisation has not granted a broad or vague scope; it has assigned the admin role with the understanding that scope (organisation, and any service list) will be set when the application is connected and when the first organisation and service are created. So scope is deliberately left for the next step, which prevents over-permission (for example giving the admin “all services” or “all organisations” before any structure exists).

- **No other users granted roles.** No second user was assigned any role. So there is no risk of “we assigned admin to the first user and also gave manager to five others” in the same step. Restraint in the number of users and roles in this step is how over-permission is avoided.

---

### How It Aligns with CQC Expectations

- **Access control.** CQC expects the service to control who can see and change care records. Assigning the admin role in a documented, isolated step shows that the organisation decides who has what authority deliberately and records that decision. The first user has one role (admin) with a clear, limited responsibility (organisation and service structure). That aligns with CQC’s expectation that access is intentional and that roles are defined and assigned in a governed way.

- **Accountability.** CQC expects the service to know who did what. When the admin user signs in and performs actions (for example creating the first organisation or service), those actions will be recorded in the audit trail under their identity. Assigning the role in this step means that when the audit trail is used, the organisation can show that “this identity was assigned the admin role in the First Role Assignment step” and that all actions performed under that identity are attributable to a known, governed account. That supports accountability and the ability to explain to inspectors how the first privileged user was created and what they are allowed to do.

- **No premature access.** CQC would be concerned if the service had granted broad access (for example many roles or many users) before the application and the rules were ready. By assigning one role (admin) to one user and not connecting the application or granting data access in this step, the organisation demonstrates that it will not allow real use of that role until the application is connected and sign-in and access are tested. That aligns with CQC’s expectation that care data is protected and that access is brought into use in a controlled, staged way.

---

## 5. Actions Explicitly NOT Taken

The following actions were **deliberately not performed** when assigning the first role. This list is part of the governance record.

---

### Granting Data Access

- **No separate step was taken to “grant data access.”** The admin role, when used through the application, will allow the user to create and update organisation and service (and person) in line with the rules. That access will only apply when the user signs in and when the application is connected. In this step, the organisation did not open Firestore or any other data store to this user by a separate action (for example a console grant or a bypass). Data access will only exist when the user signs in through the application and the rules allow the request. So “granting data access” as a separate action was not taken; access will follow from sign-in and the rules when the application is connected.

---

### Connecting an Application

- **No application was connected.** No web or mobile application was linked to the project for sign-in or for access to Firestore. So the user cannot sign in through the normal application and cannot use their admin role to create or update organisation or service yet. Connecting the application will be a separate, documented step. Not connecting the app in this step means that the role assignment does not create any immediate path to the system; the user has the role on record but no way to use it until the app is connected.

---

### Testing Permissions

- **No permission testing was performed.** The organisation did not sign in as this user and did not attempt to create or update organisation, service, or person, or to read or write any data. Testing that the admin role works correctly (that the user can create organisation and service when they sign in) will happen in a later step when the application is connected and when the organisation is ready to test sign-in and access. Not testing in this step keeps the step to “assign the role” only and avoids any accidental creation of data or use of the system before the organisation has agreed that testing may begin.

---

### Assigning Additional Roles

- **No additional roles were assigned to this user.** The first user has the admin role only. They do not have manager, staff, or inspector. So the user has one role and one role only. Assigning additional roles would have increased authority without a documented need for this step; it was deliberately not done.

- **No roles were assigned to any other user.** No second user was given admin, manager, staff, or inspector. So only one user has a role, and that user has one role (admin). Assigning roles to other users will happen in later steps when the organisation has decided who should have access and for what purpose.

---

### Signing In or Using the Role

- **The user was not signed in** as part of this step. No sign-in was performed with this account to access the project, the console, or any application. So the admin role has not been used. The first time this user signs in and uses their admin authority will be in a later, deliberate step (for example when the application is connected and the organisation runs a sign-in and access test). Not signing in or using the role in this step keeps the step to “assign the role” only and ensures that the first use of the role is documented and intended.

---

## 6. Current System State

### What Now Exists

- **One user** in the Firebase Authentication service, with **one role assigned: admin.** The user has an identity and a role on record. When the application is connected and the user signs in, the system will treat them as an admin and will allow them to create and update organisation and (with scope) services and people in line with the Firestore security rules. Until then, the user cannot sign in through the application and cannot exercise the role.
- **No other users with roles.** No other user accounts have been assigned any role. So the only user with a role is the first user, and the only role assigned is admin.
- **Firestore** with security rules deployed and four collections (organisations, services, people, audit log) as recorded in earlier governance documents. The rules are in place; they will allow the admin user to create and update organisation (and services and people when scope is set) when the user signs in through the application. No data access has been granted in this step; the rules and the role assignment together define what will be allowed when the application is connected.
- **No application connected.** No web or mobile application is linked for sign-in or for access to the CQC readiness system. So the first user cannot yet sign in or use their admin role.

---

### What Remains Inactive

- **No sign-in through the application.** The user has not signed in as part of this step, and there is no connected application for them to sign in to. The admin role is assigned but not yet used.
- **No creation or update of organisation, service, or person.** No organisation record, service record, or person record was created or updated in this step. The store remains as it was after the First Creation Firestore Collections step (four collections with placeholders only). The first creation of real organisation and service data will happen when the application is connected and the admin user signs in and performs those actions in a later step.
- **No permission testing.** No test was run to verify that the admin role allows the expected actions. Testing will happen when the application is connected.
- **No additional roles or users.** No manager, staff, or inspector role was assigned. No second user was given any role. The next steps may assign scope (organisation, service list) for the admin user when the application is connected, and may create additional users and assign them roles when the organisation is ready.

---

### Summary

- **In place:** One user with the admin role assigned; Firestore with rules and four collections; no application connected. The first user has the role on record but cannot sign in or use it until the application is connected.
- **Not yet in place:** Application connection; sign-in and use of the admin role; creation of the first organisation and first service; assignment of scope (organisation, service list) for the admin user; creation of additional users and assignment of manager, staff, or inspector roles. The next steps will connect the application and allow the first controlled sign-in and use of the admin role when the organisation is ready.

---

## 7. Summary

| Topic | In one sentence |
|-------|------------------|
| **Purpose** | Assign the first role (admin) to the first user at this stage so that when the application is connected, the system knows who has authority to set up organisation and service; starting with a limited role keeps the step safe and documentable. |
| **Role selected** | Admin: the role that can create and update organisation-level information and (with manager) services and people; chosen as the first role because it is needed to establish structure before staff or managers can have scope; carries responsibility for organisation identity and governance and for setting up the first service(s). |
| **Scope of authority** | Intended to allow later: create and update organisation, services, and people when the app is connected; does not allow delete, audit log edit, or access without sign-in through the app; authority is deliberately constrained by assigning one role only and by the existing rules. |
| **Safety and compliance** | Assigning in isolation preserves safety (no new access path, one role and one user, rules already in place); prevents over-permission (no additional roles or users, scope set later); aligns with CQC on access control, accountability, and no premature access. |
| **Actions not taken** | No granting of data access as a separate step, no application connection, no permission testing, no additional roles for this or any other user, no sign-in or use of the role. |
| **Current state** | One user with admin role assigned; no app connected, no sign-in, no use of role, no organisation or service data created; additional users and roles to be assigned in later steps. |

---

*This document is the formal governance evidence of the first role assignment in the digital CQC readiness system. It should be retained with other foundation and governance documents and used when explaining to auditors or inspectors when and how the first role was assigned.*

*Document version: 1.0 | Plain English only | No code or setup instructions.*
