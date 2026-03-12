# Audit model

Immutable, append-only audit logging for compliance and accountability. Logs are never updated or deleted.

## Collection: audit_logs

Each document is one event. All fields are required at write time.

| Field          | Type   | Description |
|----------------|--------|--------------|
| organisationId | string | Tenant scope |
| userId         | string | Firebase Auth UID of actor |
| userRole       | string | Role at time of action |
| action         | string | e.g. action_created, status_changed, score_updated |
| entityType     | string | e.g. compliance_action, compliance_domain, user |
| entityId       | string | Document or entity ID |
| entityName     | string | Human-readable name/title |
| previousValue  | any    | State before change (omit for creates) |
| newValue       | any    | State after change |
| timestamp      | Timestamp | Server or client time |

## Actions

- `action_created` – entity created
- `action_updated` – entity fields updated
- `status_changed` – status field changed (e.g. open → completed)
- `score_updated` – compliance/domain score changed
- `role_changed` – user role changed
- `INSPECTION_STARTED` – inspection simulation session started (entityType: INSPECTION_SESSION)
- `INSPECTION_COMPLETED` – inspection simulation completed; newValue includes overallScore, riskLevel, createdActionIds
- `REPORT_GENERATED` – CQC Readiness Report generated (entityType: REPORT); newValue includes reportType, readinessScore, riskLevel
- `NOTIFICATION_CREATED` – Compliance alert created (entityType: NOTIFICATION); newValue includes type, severity
- `SUBSCRIPTION_CREATED` – New subscription created (entityType: SUBSCRIPTION); newValue includes planName, billingCycle
- `PLAN_CHANGED` – Subscription plan changed or subscription cancelled; previousValue/newValue hold old plan, new plan, or "cancelled"
- `ORG_SUSPENDED` – Organisation suspended by platform admin (entityType: ORGANISATION; newValue: "suspended")
- `ORG_REACTIVATED` – Organisation reactivated by platform admin (entityType: ORGANISATION; newValue: "active")
- `PLAN_UPDATED` – Subscription plan updated or cancelled by platform admin (entityType: SUBSCRIPTION; previousValue/newValue as above)

## Usage

Use `auditService.logAuditEvent()` with explicit params, or `useAuditLogger()` in React for helpers that inject organisationId, userId, userRole from context. Logging is non-blocking; failures must not break the main operation.

## Integration with writes

Compliance write functions in `complianceService.js` accept an optional `auditContext` and call the audit service after each successful write:

- `createComplianceAction(organisationId, data, auditContext)` → logs `action_created`
- `updateComplianceAction(organisationId, actionId, updates, auditContext)` → logs `action_updated` and `status_changed` when status changes
- `completeComplianceAction(organisationId, actionId, auditContext)` → logs `status_changed` (open → completed)
- `updateComplianceDomainScore(organisationId, domainId, updates, auditContext)` → logs `score_updated` when compliancePercent changes

Pass `auditContext` from the UI: `{ organisationId, userId: user.uid, userRole: role }` from `useOrganisation()`, `useAuth()`, `useRole()`. User role changes should be logged by the code that updates the user document (e.g. call `useAuditLogger().logRoleChanged(...)` after updating role in Firestore).
