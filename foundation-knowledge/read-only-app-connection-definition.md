read-only-app-connection-definition.md
1. Purpose of the Read-Only Connection
The first connection between the application and the CQC readiness platform is deliberately limited to read-only access so that the organisation can observe how identity and roles flow through the system without any possibility of changing care or inspection data.
In a regulated care environment, this reduces risk by ensuring that the very first live link between app and platform cannot create, alter, or delete records, and is used only to confirm that sign-in, role recognition, and basic navigation work as expected.
This staged approach allows the organisation to detect design mistakes, misunderstandings about roles, or unexpected behaviour in a safe, non-destructive context before any write access is introduced.
2. Identity and Role Recognition
The application is allowed to read whether the user is signed in and to retrieve their basic identity (for example, an internal user identifier and display name) for the purpose of showing “you are signed in as …”.
The application is allowed to read the user’s assigned role (for example, staff, manager, admin, inspector) as a simple label, and, where already defined, their organisation context (which organisation they belong to).
No additional personal details beyond what is required to show who is signed in and what role they hold should be read at this stage; the focus is on confirming that the platform and app agree on who the user is and what role they are in, not on exposing wider profile or employment information.
3. Permitted Read-Only Access
At this first connection stage, the application may read only the following:
Authentication status: whether there is a signed-in user or not.
User identifier and name: enough to display “you are signed in as [name]” within the app.
Role label: the user’s assigned role (for example, “manager”) so the app can show which role is active.
Organisation context (high level only): the name or identifier of the organisation the user belongs to, purely to display context such as “Organisation: [name]”.
No live care or inspection data: the application must not, at this stage, read any person records, care folders, sections, document types, care plans, risk assessments, incidents, or audit history. Any screens displayed should use only static or sample content that does not come from real records.
4. Explicitly Prohibited Actions
During the first read-only connection, the application must not:
Create any data: no new organisations, services, people, care folder entries, documents, or audit records.
Edit or update any data: no changes to existing organisation, service, person, folder, or audit information.
Delete any data: no deletion of any record or file, including test or placeholder entries.
Upload files or documents: no file uploads, scans, images, or attachments routed into the system.
Trigger AI or automation: no use of AI to generate, summarise, classify, or otherwise process care or inspection data, and no automated decisions or status changes based on live data.
Read detailed care content: no retrieval of live care plans, risk assessments, daily notes, incidents, or other clinical or care content.
Access audit history: no reading of the audit log or any “who did what, when” entries.
Change settings or configuration: no modification of roles, permissions, organisation or service configuration, or system-wide settings.
5. Safety and CQC Alignment
This read-only boundary reflects least privilege: the app gets only what it needs to prove that identity and role recognition work, and nothing more. This is consistent with CQC expectations that access should be based on clear roles and should be no broader than necessary.
By separating “connect the app in read-only mode” from “allow the app to write or update data”, the organisation can show that deployment is staged and controlled, with each step documented and reviewed before moving on.
CQC expects providers to be able to demonstrate that systems have been tested safely before they are used for real care work. A first connection that only reads basic identity and role information, and does not touch care or inspection records, is strong evidence of that controlled, safety-first approach.
6. Preconditions for Advancing Beyond Read-Only
Before any form of write access (including creating, editing, or deleting records, or uploading files) is considered, the following must be proven and formally documented:
Identity and role behaviour: evidence that sign-in works reliably, that users always see the correct role, and that the system does not confuse roles between accounts.
Access design review: a clear, agreed design showing exactly which roles may write what (e.g. managers for their services, staff for their own work, inspectors read-only), linked back to governance and CQC requirements.
Security rules review: confirmation that the live security rules enforce the intended behaviour for each role and that default-deny remains in place for any undefined paths or operations.
Data protection assessment: an explicit review (for example, within a DPIA or equivalent) that confirms introducing write access will not compromise confidentiality, integrity, or availability of care and inspection data.
Testing plan and rollback plan: a documented plan for how write access will be tested (who, what, when, and on what data) and how the system can be rolled back to read-only or disconnected if unexpected behaviour or risk is identified.
Only when these preconditions have been met, and the evidence has been reviewed and accepted through the organisation’s governance route, should any change be made to move beyond this first read-only application connection boundary.