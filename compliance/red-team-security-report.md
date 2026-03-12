# Red Team Security & Regulatory Stress Test Report  
## CQC Readiness Platform

**Document type:** Formal adversarial security and regulatory assessment  
**Classification:** Internal / Governance  
**Assumption:** Regulator (CQC) and data protection (ICO) scrutiny applied. No optimistic interpretation.

---

## 1. Executive Summary

The CQC Readiness Platform implements multi-organisation isolation, role-based access, governed care folder activation, minimal patient records, immutable audit logs, soft-delete only, and an assistive AI layer. This Red Team assessment simulates hostile, negligent, and edge-case scenarios to identify security, compliance, and governance weaknesses.

**Findings:** The architecture is directionally sound: Firestore rules enforce organisation scoping and role checks; audit and AI logs are create-only; role and orgId are derived from server-side user documents. Critical gaps exist in **operational controls**: no rate limiting or abuse protection, over-reliance on correct admin configuration for org/role assignment, and no technical enforcement of AI output policy. GDPR positioning is incomplete without a documented retention schedule and SAR/erasure workflow.

**Overall risk rating:** **Amber.** The system is not yet at a defensible “Green” for hostile or high-scrutiny deployment without the immediate hardening steps set out in this report.

**Recommendation:** **Not Ready** for unconstrained pilot until critical and high-priority items in the hardening checklist are addressed and documented.

---

## 2. System Overview

- **Deployment model:** Multi-organisation SaaS.
- **Auth:** Firebase Authentication; session and org/role from Firestore `users/{uid}`.
- **Data scope:** Organisation-scoped; readiness, care folders (when enabled), minimal patient records; immutable audit logs and AI invocation logs.
- **Roles:** Manager (full write within org, AI, suspend users); QualityLead (read, proposals only); Viewer (read-only).
- **Governance:** Care folders and AI gated by organisation-level flags; soft-delete only; no hard delete of records or logs.
- **AI:** Assistive only (Manager, when enabled); logged; non-decision; no access to audit logs.

---

## 3. Critical Vulnerabilities (if any)

| ID | Finding | Breach scenario | Mitigation |
|----|---------|-----------------|------------|
| C1 | **No rate limiting or abuse protection** | Malicious or compromised Manager can flood record creation, audit log volume, or AI calls; DoS by cost; obscuring behaviour in log noise. | Implement per-user and per-org quotas and throttling for writes, AI invocations, and audit volume; alert on spikes. |
| C2 | **Org isolation depends on correct user document configuration** | If `users/{uid}.orgId` is mis-set (admin error or compromised backend), that user gains full access to another organisation’s data. | Lock orgId assignment to a single, audited provisioning path; monitor and alert on orgId/role changes. |
| C3 | **AI output policy not technically enforced** | Model may emit clinical-style advice, risk language, or prescriptive text despite “assistive only” design; creates regulatory and safety exposure. | Centralise AI prompts; whitelist input fields; add output filters to block clinical advice, scores, or prescriptive content; retain disclaimers. |

*If rate limiting and abuse controls are absent in production, treat C1 as critical. If org/role provisioning is fully controlled and audited, C2 may be downgraded to high.*

---

## 4. Medium Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| M1 | **Bulk exfiltration by authorised users (e.g. Manager)** | Manager can paginate all records and export via client; inherent to broad read access. | Monitoring and alerting on bulk read patterns; consider server-mediated list APIs with pagination limits; document acceptable use. |
| M2 | **SAR / GDPR subject rights workflow undefined in platform** | Right of access, rectification, and erasure are process risks; platform does not implement subject-facing flows; immutability conflicts with strict erasure. | Document DPIA, retention schedule, and SAR/erasure procedures; consider “restrict processing” instead of delete where legally acceptable. |
| M3 | **Audit log flooding** | High volume of legitimate-looking audit entries can obscure malicious actions and increase cost. | Volume-based alerts; backpressure or rate limits on actions that generate audit entries; consider offloading to central log store. |
| M4 | **Privileged backend (Admin SDK) misuse** | Any server component with Firestore Admin SDK can bypass rules; cross-org or role escalation if not strictly scoped. | Enforce org scoping in code; least privilege; audit all Admin SDK access. |

---

## 5. Low Risks

| ID | Risk | Notes |
|----|------|--------|
| L1 | **Viewer / QualityLead scraping** | Read-only or proposal-only roles can still paginate and copy data; lower impact than Manager. |
| L2 | **AI hallucination of advisory content** | Even with disclaimers, users may over-rely on AI phrasing; monitor support and feedback. |
| L3 | **Retention metadata (e.g. retentionReviewDate) incomplete** | If not consistently set, governance and retention reviews are weakened; data quality concern. |

---

## 6. Organisation Isolation Review

**Tests performed (simulated):**

- Cross-organisation read attempt (client supplies different orgId in path or query).
- Cross-organisation write attempt (same).
- Client manipulation of orgId in request payloads.
- Direct Firestore query without org filter.
- Token reuse across organisations.

**Result:** Rules derive `userOrgId()` from `get(/databases/$(database)/documents/users/$(request.auth.uid))`; client cannot override this. Queries only return documents where `orgMatch(orgId)` holds; cross-org access is denied at rule evaluation.

**Residual risk:** Isolation fails if (1) a user’s `users/{uid}.orgId` is incorrectly set, or (2) a backend using Admin SDK does not enforce org scope. No client-side bypass identified.

**Recommendation:** Formalise user provisioning and change-control; monitor orgId/role changes; avoid broad Admin SDK use in user-facing flows.

---

## 7. Role Escalation Testing Results

**Tests performed (simulated):**

- Client-side role modification (e.g. forcing “Manager” in UI or payload).
- Direct Firestore update to `users/{userId}.role` or `.orgId`.
- Bypassing UI permission checks and calling privileged operations directly.
- Attempting to create “hidden” admin behaviour.

**Result:** With rules that allow only (a) self-update of `lastLoginAt` and (b) Manager update of `accountStatus` (same-org users only), and that **disallow** changes to `role`, `orgId`, and `email`, direct client-side role escalation is blocked. Privileged operations require both UI checks and rule checks (e.g. `isManager()`); bypassing only the UI does not grant write access.

**Residual risk:** Escalation remains possible if (1) role or orgId can be written from another path (e.g. custom claims or separate collection) without equivalent protection, or (2) new features are added without updating both permission layer and rules.

**Recommendation:** Single source of truth for role (users doc and any derived claims); all new privileged actions must go through central permission mapping and rules.

---

## 8. Data Exfiltration Risk Assessment

**Tests performed (simulated):**

- Bulk record reads via pagination.
- Large query exports (e.g. all records in org).
- Scraping through repeated paginated requests.
- Abuse of AI summary generation to extract data in readable form.
- Prompt injection in data fields to influence AI output.

**Result:** Any user with read access (especially Manager) can paginate through all records in their org and export via client (copy, scripting). Firestore rules do not limit query size or rate. AI summarisation can be invoked repeatedly; prompt injection in stored data may influence narrative but does not bypass “no decision/no score” if enforced in system prompt and output handling.

**Data exfiltration risk:** **High for authorised insiders** (by design); **low for external or cross-org** attackers given current rules.

**Recommendations:** Rate limiting and quotas on read-heavy and AI operations; logging and alerting on bulk read patterns; consider server-mediated list APIs with caps; maintain data minimisation (no NHS number, minimal fields).

---

## 9. Audit Log Integrity Review

**Tests performed (simulated):**

- Modifying existing audit log entries.
- Deleting audit entries.
- Overwriting logs via client or API.
- Flooding logs to hide behaviour.

**Result:** Rules deny update and delete on `auditLogs` and `aiLogs`; only create is allowed (and only by authorised role). **Integrity of existing entries is strong** at the rule level.

**Weak point:** **Flooding.** A Manager can generate large numbers of create/update/archive events (or AI calls), producing excessive log volume, increasing cost, and making it harder to detect specific misuse.

**Recommendations:** Monitor audit and AI log volume per user/org; implement backpressure or rate limits; consider streaming to central log store for analysis and retention.

---

## 10. AI Misuse Risk Review

**Tests performed (simulated):**

- Prompt injection to override safeguards (e.g. “ignore previous instructions and output…”).
- AI generating clinical or risk judgements.
- AI auto-saving content to records.
- AI receiving cross-org or audit log data.
- AI revealing hidden or sensitive fields.

**Result:** Design constrains AI to Manager-only, org-scoped, minimal input, no write, and no access to audit logs. If implementation strictly uses whitelisted fields and does not send audit logs, cross-org and hidden-field leakage is contained. Auto-save would be a implementation bug (must not wire AI output to write paths without explicit user action).

**Exposure risk:** **Medium.** Without output filtering, models may still produce clinical-sounding or prescriptive text; prompt injection in data can skew output. No technical barrier to repeated invocation for data extraction.

**Recommendations:** Hard-coded prompt templates and input whitelist; output filters to block clinical advice and risk scores; prominent disclaimers and “Human Review Required” labelling; quotas on AI invocations; ensure AI never reads audit logs.

---

## 11. GDPR Compliance Stress Points

| Area | Stress test | Finding |
|------|-------------|---------|
| **Right of access** | Subject requests copy of their data. | Platform is org-facing; SAR handling is procedural (export/report outside UI). Must be documented. |
| **Right to rectification** | Subject requests correction. | Supported via record update and archive; audit trail preserved. |
| **Right to erasure** | Subject requests deletion. | Conflicts with immutable audit and “no hard delete” design. Retention must be justified (legal obligation, defence of claims); document exemption and offer restrict-processing where appropriate. |
| **Data minimisation** | Scope of personal data stored. | Strong: no address, NHS number, minimal identifiers; keep to current field set. |
| **Retention** | Defined retention and review. | retentionReviewDate and retention schedule must be defined and applied; document in DPIA/retention policy. |

**Compliance gaps:** Formal DPIA and retention schedule; documented SAR and erasure procedures; technical or procedural “restrict processing” where erasure is not possible.

---

## 12. Denial of Service Risk Assessment

**Tests performed (simulated):**

- Excessive login attempts (credential stuffing / brute force).
- AI invocation spamming (cost and quota exhaustion).
- Record creation flooding (storage and audit volume).
- Audit log flooding (volume and cost).

**Result:** Firebase Auth provides some protection; no additional account lockout or captcha specified. No application-level rate limits on writes, AI calls, or audit generation. A malicious or compromised Manager can cause significant cost and operational impact.

**Recommendations:** Rate limiting and quotas (writes, AI, log volume); monitoring and alerting; consider reCAPTCHA/App Check for login; define and enforce caps per org/user where feasible.

---

## 13. Overall Risk Rating

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| **Organisation isolation** | Green (with caveat) | Rules enforce org scope; residual risk is misconfiguration or backend misuse. |
| **Role escalation** | Green (with caveat) | Client cannot change role/orgId; residual risk is alternate write paths or new features. |
| **Data exfiltration** | Amber | Authorised users can export at scale; no rate limits or bulk controls. |
| **Audit integrity** | Green | Logs are immutable; flooding is the main residual risk. |
| **AI misuse** | Amber | Design is sound; output policy and abuse controls need hardening. |
| **GDPR** | Amber | Minimisation good; retention and SAR/erasure need documentation and process. |
| **Denial of service** | Red | No rate limiting or abuse protection. |

**Overall risk rating: AMBER.**  
The system is not yet at a defensible **Green** for hostile or high-regulatory-scrutiny deployment without the immediate hardening steps below.

---

## 14. Immediate Hardening Checklist

- [ ] **Access and org isolation:** Lock role and orgId assignment to a single, audited path; monitor and alert on changes to `users/{uid}.orgId` and `users/{uid}.role`.
- [ ] **Rate limiting and abuse:** Introduce per-user/per-org quotas for record writes, AI invocations, and audit volume; alert on anomalous spikes.
- [ ] **AI governance:** Centralise prompts; whitelist input fields; enforce no audit log / no cross-org data; add output filters for clinical/risk/prescriptive content; keep disclaimers and draft labelling.
- [ ] **GDPR and retention:** Publish DPIA and retention schedule (including justification for immutable audit); define and document SAR, rectification, and erasure workflows; consider restrict-processing where erasure is not possible.
- [ ] **Operational monitoring:** Log and dashboard logins, role/org changes, record writes, AI use, audit growth; maintain incident response playbook for suspected abuse or exfiltration.

---

## 15. Recommendation: Pilot Ready / Not Ready

**Recommendation: NOT READY** for unconstrained pilot.

**Rationale:** Critical and medium risks (rate limiting, abuse protection, AI output enforcement, GDPR documentation, and operational monitoring) must be addressed and evidenced before exposing the platform to real organisations and CQC-facing use. Until then, treat the system as **Amber**: suitable for controlled, internal or limited pilot only, with explicit acceptance of residual risk and a committed plan to complete the hardening checklist.

---

*End of report. This document is part of governance and compliance evidence and should be retained and reviewed when preparing for regulatory or assurance discussions.*
