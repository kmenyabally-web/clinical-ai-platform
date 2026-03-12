# Security rules (production)

Production-grade Firestore and Storage rules for tenant isolation, RBAC, audit immutability, and platform admin.

## File locations

- **Firestore:** `firestore.rules` (project root)
- **Storage:** `storage.rules` (project root)

Deploy with Firebase CLI: `firebase deploy --only firestore:rules` and `firebase deploy --only storage`.

---

## Firestore rules summary

### Tenant isolation

- All reads and writes that are org-scoped require **organisationId** to match the user’s org.
- User’s org is resolved in this order:
  1. **Custom claim** `request.auth.token.organisationId` (if set)
  2. **Firestore** `users/{uid}.orgId` (from `getUserDoc()`)
- Helpers: `userOrgId()`, `orgMatch(orgId)`.

### Service isolation

- Collections that include **serviceId** (e.g. `compliance_actions`, `compliance_domains`, `policies`, `evidence_documents`, `inspection_sessions`) enforce:
  - **Admin:** full access to all data in the org.
  - **Manager / QualityLead:** only documents for services where `services/{serviceId}.managerId == request.auth.uid`.
- Implemented via `canAccessService(orgId, serviceId)` (uses `get(services/{serviceId})` when `serviceId` is present).

### RBAC enforcement (database level)

| Role      | Firestore behaviour |
|----------|----------------------|
| Admin    | Full org access; create/update subscriptions, services, org; all compliance and documents. |
| Manager  | Service-level access where assigned; create/update compliance, documents, inspections; update org readiness. |
| QualityLead | Same as Manager (service-level where assigned). |
| Staff    | Limited write: compliance, documents; no subscription/service/org management. |
| Auditor  | Read-only for org data. |

- **audit_logs:** create + read only; **update and delete denied** (immutable).
- **notifications:** read all in org; **update** (e.g. mark read) only for Admin and Manager.

### Audit logs (immutable)

- **audit_logs:** `allow create, read; allow update, delete: if false`.
- Create validation: required fields `organisationId`, `userId`, `action`, `entityType`, `entityId`, `entityName`; `userId` must equal `request.auth.uid`.

### Validation (required fields and IDs)

- **users** (create): `orgId`, `role`, `status` (all strings).
- **organisations** (create): `name` (non-empty string), `status`.
- **subscriptions** (create): `organisationId`, `planName`, `status`, `billingCycle`; `status == 'active'`.
- **services** (create): `organisationId`, `serviceName`, `serviceType`, `location`.
- **compliance_actions** (create): `organisationId`, `title`, `status`.
- **audit_logs** (create): as above; `organisationId` and `userId` validated.
- **inspection_sessions** (create): `organisationId`, `startedBy`; `startedBy == request.auth.uid`.

All org- and service-scoped writes validate that **organisationId** (and **serviceId** when present) match the user’s org and service access.

### Admin panel (platform_admin)

- **platform_admins** collection: used to grant platform admin.
  - **Important:** Use **document ID = userId** (e.g. `platform_admins/{uid}`) so rules can use `exists(platform_admins/$(request.auth.uid))`. If you use auto-generated IDs, add a document whose ID is the user’s UID when granting access.
- When **isPlatformAdmin()** is true, the user can:
  - Read/write **organisations** (any), **subscriptions** (any), **services** (any), **users** (any) for admin panel operations.
- Only these users can read/write cross-tenant for admin; normal users are restricted by `orgMatch()` and RBAC.

---

## Storage rules

- Path: **`/organisations/{organisationId}/documents/{fileId}`**
- Rule: `request.auth != null && request.auth.token.organisationId == organisationId`
- **Custom claims:** Storage rules cannot read Firestore. For production, set **custom claims** (`organisationId`, and optionally `role`) via Admin SDK (e.g. on login or when assigning user to org) so that:
  - Storage access is limited to the user’s org.
  - Optional: use `role` in Firestore rules if you move to token-based role.

If you do not set custom claims, Storage rules will deny access unless you switch to signed URLs or a backend proxy that checks org in Firestore and returns a signed URL.

---

## Subscription enforcement (plan limits)

- **Firestore rules do not** enforce “max services per plan” (rules cannot count documents or read subscription + count in one expression).
- **Enforcement is in application code:**
  - **billingService.checkServiceLimit(organisationId)** is called in **servicesService.createService()** before creating a service.
  - If the plan limit is reached, `createService` throws and the client never sends a valid create; Firestore rules still require **organisationId** and **Admin** role for **services** create.
- So: **tenant + role** are enforced in rules; **plan limit** is enforced in the app so that e.g. Starter cannot create more than one service.

---

## Rate limiting

- **Not enforceable in Firestore or Storage rules.** The rules do not implement rate limits.
- Recommended:
  - **App Check** to reduce abuse from non-app clients.
  - **Cloud Functions** or backend middleware to rate limit writes to:
    - **notifications**
    - **audit_logs**
    - **inspection_sessions**
  - Optionally, batch or throttle these writes in the client (e.g. debounce audit logs, limit inspection session creation per user per hour).

---

## Checklist

- [ ] Deploy `firestore.rules` and `storage.rules`.
- [ ] Use **document ID = userId** for `platform_admins` (or add a doc with ID = uid when granting platform admin).
- [ ] For Storage: set **custom claims** (`organisationId`, optionally `role`) via Admin SDK, or use signed URLs / backend proxy.
- [ ] Keep subscription (plan limit) enforcement in app; rules only enforce org + Admin for service create.
- [ ] Add rate limiting for notifications, audit_logs, and inspection_sessions outside of rules (e.g. Cloud Functions or API layer).
