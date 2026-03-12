stage-13-first-read-rollback-and-stop-conditions.md
1. Purpose of Rollback and Stop Conditions
In regulated health and social care, any access to data must be reversible and controllable. Predefined stop and rollback conditions ensure that, if anything unexpected happens during the first permitted data read, the organisation can immediately halt and return the system to a safe state.
Defining these conditions before data access is attempted prevents decisions from being made under pressure or based on convenience. It ensures that safety, not expediency, governs how the system responds to anomalies or concerns.
2. Immediate Stop Triggers
The following events or observations require an immediate halt to any data access consideration, including the first permitted read:
The system displays or appears to have accessed any information beyond the agreed minimal non-personal item (for example, service names, counts, or any hint of person-level data).
There is inconsistent or unpredictable behaviour during the read (for example, sometimes showing more information than expected, or producing unexplained errors).
Any member of staff, tester, or observer expresses a reasonable concern that the behaviour is not fully understood or may be unsafe, even if no obvious data exposure is visible.
There is any sign, however small, that access controls or roles may not be working as designed (for example, different roles seeing different results when they should see the same).
The system behaves differently from what is described in the agreed design and governance documents for the first permitted read.
3. Rollback Principles
Safety first: the priority is to return the system to a state where no data reads are possible, even for the minimal permitted item, until the issue is understood and addressed.
Minimal change: rollback should remove or disable the specific access that enabled the first read, without making broad or ungoverned changes elsewhere in the system.
No additional exposure: rollback must not involve further viewing, exporting, or testing of data; it should reduce access, not expand it.
Reversibility: the steps taken to roll back should be simple, clearly described, and reversible later, once the cause has been understood and controls have been strengthened.
Traceability: every rollback action must be linked to a dated decision and to the observation that triggered it, so that the organisation can explain what happened and why.
4. Roles Responsible for Stopping or Rolling Back
Any member of the test or assurance team who observes a potential problem has the right and duty to call for an immediate pause while concerns are assessed.
The formal decision to stop or roll back rests with named senior roles, such as:
A senior digital or IT lead (for example, CIO, CNIO, or Head of Digital), and
A senior information governance or data protection lead (for example, Caldicott Guardian or Data Protection Officer).
These roles must be clearly identified in advance so there is no doubt about who can decide to halt progression. This authority cannot be lightly delegated because it directly affects data protection, patient safety, and regulatory compliance.
5. Actions Explicitly Prohibited During Rollback
During a stop or rollback, the following actions are forbidden:
Inspecting data directly: no one may browse or explore live records “to see what happened”.
Debugging through live access: no testing or troubleshooting may be performed that involves opening additional records or widening access. Investigation must use high-level information and, where needed, controlled, non-production environments.
Overriding controls: no temporary overrides, backdoors, or emergency permissions may be used to bypass the normal access rules.
Expanding the scope of access: no new roles, permissions, or integrations may be enabled while the system is in a stop or rollback state.
Silencing concerns: staff must not be discouraged from raising issues; reports of unexpected behaviour must be welcomed and recorded, not ignored.
6. Documentation and Evidence Requirements
When a stop or rollback is triggered, the organisation must record:
What was observed: a clear description, in plain English, of what was seen or experienced that caused concern.
When and by whom: the date and time, and the names or roles of the people who observed the issue and who decided to stop or roll back.
What actions were taken: a simple record of how access was halted or reduced, and which parts of the system were affected.
Initial assessment: whether any data is believed to have been exposed, even if only in part, and what immediate judgement has been made about risk.
Next steps: how the issue will be investigated, who is responsible, and when a further review will take place.
These records form part of both incident readiness and learning, and may be needed to demonstrate to CQC and other regulators that the organisation responds appropriately to emerging risks.
7. Regulatory and CQC Alignment
Predefined rollback and stop conditions show that the organisation has thought in advance about what could go wrong and how it will respond, rather than improvising in the moment. This aligns with CQC’s expectations for proactive risk management.
Clear authority, documentation, and prohibitions during rollback support safety and accountability: inspectors can see who acted, what they did, and how they avoided making the situation worse.
By making it easy to halt or reverse even the first, minimal data read, the organisation demonstrates that digital deployment is treated with the same seriousness as other safety-critical changes in care, which is central to CQC’s view of good governance and incident readiness.