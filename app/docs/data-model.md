# Firestore data model (compliance)

All compliance data is scoped by `organisationId`.

## Platform administration

### platform_admins

Platform-level administrators who can access the Admin Control Panel. Not scoped by organisation.

| Field    | Type      | Description |
|----------|-----------|-------------|
| userId   | string    | Firebase Auth UID. Required. |
| email    | string    | Admin email (for display). |
| createdAt| Timestamp | When the admin was added. |

**Security:** Only users whose `userId` appears in this collection can access the `/admin` panel. Enforce in UI and in admin APIs. For Firestore rules, use **document ID = userId** (e.g. `platform_admins/{uid}`) so that `exists(platform_admins/$(request.auth.uid))` can enforce platform-admin-only access. If you use auto-generated document IDs, add a document with ID = the user's UID when granting platform admin.

--- With multi-service support, compliance data also includes **serviceId** where listed; queries filter by both organisationId and serviceId when a service is in scope.

## Subscriptions and billing

### subscriptions

One active subscription per organisation. Used for plan limits and billing.

| Field         | Type      | Description |
|---------------|-----------|-------------|
| organisationId | string   | Required. Tenant scope. |
| planName      | string    | Starter \| Professional \| Enterprise |
| status        | string    | active \| cancelled \| past_due \| trialing |
| billingCycle  | string    | monthly \| annual |
| startDate     | Timestamp | When subscription started. |
| endDate       | Timestamp | Renewal/expiry date. |
| createdAt     | Timestamp | When created. |

**Plan feature limits:**

| Plan         | Max services |
|--------------|--------------|
| Starter      | 1            |
| Professional | 5            |
| Enterprise   | unlimited    |

**RBAC:** Only organisation Admins may manage subscriptions (upgrade, downgrade, cancel). Enforce in UI and in billing service where applicable.

---

## Services (multi-service per organisation)

### services

One document per service within an organisation.

| Field          | Type      | Description |
|----------------|-----------|-------------|
| organisationId | string    | Required. Parent organisation. |
| serviceName    | string    | Display name. |
| serviceType    | string    | e.g. residential, domiciliary, nursing. |
| location       | string    | Optional. |
| managerId      | string    | Optional. User ID of assigned manager (RBAC: manager sees only this service). |
| createdAt      | Timestamp | When created. |

**RBAC:** Admins see all services in the org. Service managers (Manager/QualityLead) see only services where `managerId` equals their user ID.

**Indexes:** For `fetchServices` with `managerId` filter, a composite index on `services` (organisationId, managerId, serviceName) is required. For org-only list, (organisationId, serviceName). Create via Firebase Console if the query fails.

---

## Root collections

### compliance_domains

One document per domain per organisation. Tracks CQC domain-level compliance (five domains).

| Field              | Type   | Description                          |
|--------------------|--------|--------------------------------------|
| organisationId     | string | Required. Tenant scope.               |
| serviceId          | string | Optional. When set, scoped to service; per-service readiness. |
| domainKey          | string | e.g. safe, effective, caring, responsive, well-led |
| name               | string | Display name                         |
| compliancePercent  | number | 0–100                                |
| readinessLevel     | string | Not started / In progress / Defined / Reviewed / Assured |
| sortOrder          | number | Optional display order               |

### compliance_actions

Actions (e.g. from audits or improvement plans). Scoped by organisation and optionally by service.

| Field          | Type   | Description                    |
|----------------|--------|--------------------------------|
| organisationId | string | Required. Tenant scope.        |
| serviceId      | string | Optional. Service scope.       |
| domainId       | string | Optional. Link to domain.      |
| title          | string | Action title                   |
| priority       | string | high \| medium \| low         |
| riskLevel      | string | high \| medium \| low         |
| status         | string | open \| in-progress \| complete (workflow) |
| description    | string | Optional.                    |
| assignedTo     | string | Optional. Assigned user.     |
| dueDate        | Timestamp | Optional                    |
| createdAt      | Timestamp | Optional                    |
| updatedAt      | Timestamp | Optional. Set on update.   |

### compliance_stats

One document per organisation (or per organisation+service when serviceId is used). Aggregated stats for the dashboard.

| Field                  | Type   | Description                |
|------------------------|--------|----------------------------|
| organisationId         | string | Required. Tenant scope.   |
| serviceId              | string | Optional. When set, stats for that service. |
| overallComplianceScore | number | 0–100                     |
| totalDomains            | number | Count of domains          |
| openActionCount         | number | Open actions              |
| highRiskActionCount     | number | High-risk open actions    |
| lastUpdated             | Timestamp | Optional               |

Document ID can be `organisationId` for a single stats doc per org, or auto-generated with `organisationId` as a field.

---

## Evidence and policy documents

Two Firestore collections: **policies** (policy documents) and **evidence_documents** (evidence). Same schema; all queries must include `organisationId`.

### policies

Policy documents. Fields:

| Field          | Type   | Description |
|----------------|--------|-------------|
| organisationId | string | Required. Tenant scope. |
| serviceId      | string | Optional. Service scope. |
| title          | string | Document name/title. |
| documentType   | string | policy |
| domainType     | string | governance \| safeguarding \| mental-capacity \| staffing \| care-planning |
| description    | string | Optional. |
| fileUrl        | string | Firebase Storage download URL. |
| fileName       | string | Original file name. |
| uploadedBy     | string | User ID. |
| createdAt      | Timestamp | Set on create. |
| updatedAt      | Timestamp | Set on metadata update. |

### evidence_documents

Evidence documents. Same fields as policies; documentType = evidence.

### Firebase Storage

Files are stored at:

`/organisations/{organisationId}/documents/{fileId}`

Supported file types: pdf, docx, xlsx, jpg, png.

### document_stats

One document per organisation. Total and per-domain counts for dashboard (scalable).

| Field          | Type   | Description |
|----------------|--------|-------------|
| organisationId | string | Required. |
| totalCount     | number | Total documents. |
| governance     | number | Governance domain count. |
| safeguarding   | number | Safeguarding. |
| mentalCapacity | number | Mental Capacity. |
| staffing       | number | Staffing & Training. |
| carePlanning   | number | Care Planning. |
| lastUpdated    | Timestamp | Optional. |
| serviceId      | string    | Optional. When set, counts for that service. |

---

**Audit logs** (`audit_logs`): include optional **serviceId** in each event payload when the action is service-scoped.

---

## CQC Inspection Simulation

### inspection_questions

Structured questions aligned with CQC Key Questions. Not scoped by organisation (shared template).

| Field        | Type      | Description |
|-------------|-----------|-------------|
| questionText | string    | The question. |
| domainType   | string    | safe \| effective \| caring \| responsive \| well-led |
| guidanceText | string    | Optional. Guidance for assessor. |
| evidenceHint | string    | Optional. Recommended evidence. |
| riskWeight   | number    | Weight for scoring (e.g. 1–5). |
| createdAt    | Timestamp | Optional. When question was created. |

### inspection_sessions

One document per simulation run. Scoped by organisationId and optionally serviceId.

| Field          | Type      | Description |
|----------------|-----------|-------------|
| organisationId | string    | Required. Tenant scope. |
| serviceId      | string    | Optional. Service scope. |
| startedBy      | string    | User ID. |
| startedAt      | Timestamp | When started. |
| completedAt    | Timestamp | When completed (null if in progress). |
| overallScore   | number    | 0–100 when completed. |
| riskLevel      | string    | Low \| Medium \| High when completed. |

### inspection_responses

One document per question response per session. Document ID pattern: `{sessionId}_{questionId}` for idempotent writes.

| Field      | Type      | Description |
|------------|-----------|-------------|
| sessionId  | string    | Links to inspection_sessions. |
| questionId | string    | Links to inspection_questions. |
| response   | string    | Yes \| Partial \| No |
| answeredBy | string    | User ID of respondent. |
| answeredAt | Timestamp | When the response was saved. |
| createdAt  | Timestamp | Optional (legacy); prefer answeredAt. |

**RBAC:** Admin and Manager (and QualityLead) may start a simulation and answer questions (`audit:update`). Staff and Auditor may only view past session results (`audit:view`).

**Indexes:** For `getSessionsForOrganisation`, a composite index on `inspection_sessions` (organisationId, startedAt desc) may be required; create via Firebase Console if the query fails.

---

## Notifications and alerts

### notifications

Alerts and system notifications for compliance risks. Scoped by organisationId.

| Field             | Type      | Description |
|-------------------|-----------|-------------|
| organisationId    | string    | Required. Tenant scope. |
| serviceId         | string    | Optional. Service scope; alerts tied to service. |
| type              | string    | ACTION_OVERDUE \| HIGH_RISK_ACTION \| MISSING_EVIDENCE \| READINESS_DROP \| INSPECTION_HIGH_RISK |
| title             | string    | Short title. |
| message           | string    | Detail message. |
| severity          | string    | high \| medium \| low |
| relatedEntityType | string    | Optional. e.g. compliance_action, inspection_session, readiness. |
| relatedEntityId   | string    | Optional. ID of related entity. |
| createdAt         | Timestamp | When created. |
| read              | boolean   | Whether marked read (resolved). Default false. |

**Triggers:** Notifications are created when: compliance action becomes overdue; high-severity action created; readiness score falls below threshold; inspection simulation result is high risk; domain has no evidence documents.

**RBAC:** All roles may view. Only Admin and Manager may mark as read (resolve).

**Indexes:** For unread list, a composite index on `notifications` (organisationId, read, createdAt desc) may be required; create via Firebase Console if the query fails.
