# First Controlled Sign-In Test: Manager Role

**Formal Governance Evidence for a Regulated CQC Readiness System**

*This document records the first controlled sign-in test for a user with an assigned role in the digital CQC readiness system. It explains why the test was carried out at this stage, which user and role were tested, what was observed in terms of access and restriction, how this confirms safe role enforcement in line with CQC expectations, what actions were deliberately not taken, and the system state after the test. It does not contain code or technical instructions. Plain English only. It serves as formal governance evidence of safe role-based access validation.*

---

## 1. Purpose of the Sign-In Test

### Why a Sign-In Test Was Performed at This Stage

- The organisation had already created a first user account, assigned that user a role, and recorded those steps (first controlled user account and first role assignment). The next planned step was to **confirm that sign-in works for that user and that the assigned role is recognised**, without giving access to any care or inspection data. The aim was to prove that the identity and role can be used by the system, while still keeping the system in a pre-live, safe state.
- The sign-in test was carried out at a point where **no live application screens or data** were in use. It was intended simply to show that the user could be authenticated and that their role claim was present, not to exercise any of the system’s features or to reach any real records. This keeps the test focused on identity and role recognition only.

---

### Why the Test Was Limited to Observation Only

- **Observation only** means that the test was limited to seeing whether sign-in succeeded and whether the user was recognised as holding the “manager” role. No attempt was made to open care folders, view lists of people, or use any management functions. The tester observed only that the sign-in step completed successfully and that the system treated the user as a manager in name; no actions were taken that could change or expose data.
- Limiting the test in this way keeps the change **small and safe**. It avoids mixing “does sign-in work?” with “what can this user do?”, which are separate questions that must be answered at different stages. The first question is about identity; the second is about access and behaviour. This document relates only to the first.

---

## 2. User and Role Tested

### Which User Was Tested

- The user tested was the **existing authentication user** with the email address `kmenyabally@gmail.com`. This is the same user whose account creation and role assignment were recorded in earlier governance documents. No new user was created for this test; the test used the existing, governed account.

---

### Which Role the User Holds

- The user holds the **manager** role, as recorded in the technical role assignment step where a custom claim was set to indicate that this user is a manager. The sign-in test was designed to confirm that when this user signs in, the system can see that they are a manager and treat them accordingly when, in later steps, access to actual screens and data is considered.

---

### Confirmation That No Additional Permissions Were Present

- During this test, the user had **no additional roles** (such as admin, staff, or inspector) and no extra permissions beyond the manager role claim. No special console or system privileges were granted. The only change made in preparation for this test was the earlier step that set the user’s role to “manager”. So the test relates strictly to “a manager user signing in”, not to a mixture of roles.

---

## 3. Observed Access and Restrictions

### What the User Could See or Access

- When the user signed in, the system **successfully recognised their identity and role**. The test confirmed that:
  - The user could complete the sign-in process using their existing credentials.
  - The system identified the user as the same person whose account and role had been recorded.
  - The role associated with the user was “manager”.
- The sign-in step did not lead to any live care or inspection screens. Where a simple confirmation view was shown (for example a basic “signed in” or “welcome” message), it contained **no person names, no care content, and no audit information**. It served only to confirm that sign-in had worked.

---

### What Was Explicitly NOT Accessible

- During the test, the user **could not**:
  - View any organisation records (no list of organisations, no organisation details).
  - View any service records (no list of services, no service dashboards).
  - View any person records or care folders (no lists of people, no sections, no document types, no care plans or risk assessments).
  - View any audit log entries (no history of “who did what, when”).
  - Access or change any Firestore collections directly.
- No screens or views that display **real inspection evidence or care data** were available during this test. In effect, the test showed that the user could sign in and be recognised as a manager in name, but could not yet do anything in the system that would read or change live data.

---

## 4. Safety and Compliance Confirmation

### Correct Role Enforcement

- The test confirms that **role enforcement works at the identity level**: when the manager user signs in, the system recognises them as a manager and does not confuse them with other roles. This is important for later access control, where the manager role will be used to decide which services and people they can see and what actions they can take. The sign-in test shows that the building block for that enforcement (identity plus role) is functioning as expected.

---

### Effective Access Restriction

- The test also confirms that **access remains restricted** at this stage. Although the user was recognised as a manager, they were not able to view or change any care or inspection data. This shows that:
  - Having a role does not by itself give immediate access to data.
  - The system still requires further steps (such as connecting the full application and applying the data access rules) before any manager can see or act on real records.
- This behaviour is consistent with the principle of **default deny**: until the full set of conditions for access is met (sign-in, role, correct organisation and service scope, and connection through the governed application), care and inspection data remain protected.

---

### Alignment With CQC Expectations

- CQC expects that:
  - Access is based on clear roles.
  - Access is limited to what staff need to see and do.
  - Systems are tested in a controlled way before they are used for real care decisions.
- This sign-in test aligns with those expectations by:
  - Demonstrating that the system can distinguish a manager from other roles.
  - Showing that a manager user does **not** automatically see any data without the correct context and rules in place.
  - Keeping the test narrow and documented, so that the service can explain exactly what was done: “we confirmed sign-in and role recognition only; we did not expose or change any care data.”

---

## 5. Actions Explicitly NOT Taken

The following actions were **deliberately avoided** during this first controlled sign-in test:

- **Editing data**: The user did not edit, update, or delete any organisation, service, person, care folder, or audit records. No form submissions or save actions were performed.
- **Creating records**: No new organisation, service, person, care folder entry, or audit entry was created as part of this test. The test did not involve adding any new information to the system.
- **Connecting a full application**: No live staff or manager application was connected or used in a way that would present real care or inspection screens. Any test view used was minimal and did not display real data.
- **Expanding permissions**: No changes were made to the user’s role or to system-wide permissions during the test. The user remained a manager only; no additional rights (such as admin or inspector) were added.
- **Adding further users or roles**: No new users were created and no roles were assigned to other accounts in connection with this test. The scope remained one user and one role.

Avoiding these actions kept the test **strictly within the bounds of identity and role recognition**, and ensured that no care or inspection data was placed at risk.

---

## 6. Current System State

### System State After the Test

- **User and role**: The user `kmenyabally@gmail.com` continues to exist in the authentication service with the manager role. The test did not change their account beyond confirming that sign-in works.
- **Data and structure**: The Firestore database, its collections (organisations, services, people, audit log), and any placeholders remain unchanged. No new data was added and no existing data was edited or removed.
- **Applications and access**: No full application was connected or brought into live use as part of this test. There is still no general route for staff or managers to sign in and reach live data. Access to care and inspection information remains blocked until later, governed steps are taken.
- **Next steps**: Future steps will involve connecting the governed application, carefully testing that managers can see only the services and people they are responsible for, and confirming that inspectors remain read-only. Those steps will each be documented separately. This document relates only to the first, narrow test that “a manager user can sign in and be recognised, without seeing or changing any real data.”

---

*This document is the formal governance evidence of the first controlled sign-in test for a user with an assigned role in the digital CQC readiness system. It should be kept with other foundation and governance documents and used when explaining to auditors or inspectors how role-based access was first validated in a safe, minimal way.*

*Document version: 1.0 | Plain English only | No code or technical instructions.*

