# Verification and Assurance of Enforcement for the First Controlled Data Read

## Purpose of Enforcement Verification
In regulated health and social care systems, it is not sufficient to state that access controls exist or that teams intend to use them correctly. Enforcement must be proven to work in practice before trust is placed in the system. Policy and intent can guide behaviour, but they cannot prevent misconfiguration, human error, or misuse on their own. Verification ensures that the system itself actively prevents over-access.

By verifying enforcement before allowing any live or expanded data access, the organisation demonstrates that trust in the system is earned through evidence, not assumed. This is essential where failures could affect people using services, staff, and regulatory compliance.

## Pre-Read Verification Activities
Before the first controlled data read is permitted, structured checks are carried out to confirm that enforcement boundaries are active and correctly configured. These checks focus on confirming that access controls behave as intended at each layer, including authentication, authorisation rules, application behaviour, and environment separation.

Verification includes reviewing how access is supposed to work, confirming that only the narrowly defined read scope is possible, and ensuring there are no alternative routes through which data could be accessed unintentionally.

## Negative Testing and Boundary Confirmation
The system is deliberately tested to ensure that disallowed reads are blocked by design. This includes attempts to access data outside the permitted scope, requests using incorrect roles, and attempts to widen queries beyond what is allowed.

Successful verification requires that these attempts fail consistently and safely, without exposing partial data or system details. Failure is treated as confirmation that enforcement boundaries are working as intended.

## Evidence Capture and Record Keeping
Evidence is retained to demonstrate that enforcement verification has taken place. This includes records of what was tested, who performed the checks, when verification occurred, and the outcome of each activity.

These records provide an audit trail that can be reviewed internally and presented to inspectors if required, showing that enforcement was validated before trust was extended to the system.

## Independent Review and Sign-Off
Approval to progress beyond the first controlled read is separated from those who built or configured the system. A senior governance, assurance, or information oversight role reviews the verification evidence and confirms that enforcement is operating correctly before granting approval to proceed.

This separation ensures accountability and prevents conflicts of interest in access decisions.

## Failure Handling Before Live Access
If verification fails at any point, progression is stopped. Access remains paused until issues are corrected and verification is repeated. No live or expanded data access is permitted until enforcement failures are fully resolved and independently re-approved.

This ensures that safety and compliance are prioritised over speed or convenience.

## Alignment with CQC Inspection Expectations
This verification and assurance approach demonstrates safe deployment, risk awareness, and inspection readiness. It shows that access control is enforced by system design, verified through evidence, and governed through formal oversight, in line with CQC and UK information governance expectations.