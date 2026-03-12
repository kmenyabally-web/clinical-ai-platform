# Stage 20B — Role-based permission enforcement

## 1. Permission architecture overview

- **Central mapping**: All permissions are defined in `permissions/mapping.ts` via `ROLE_PERMISSIONS` and the single function `hasPermission(action, role)`.
- **Logic-level enforcement**: Every write path (readiness update, proposal create) must call the permission layer before performing Firestore writes. UI hiding alone is not sufficient.
- **UI layer**: Components use `usePermission(role)` or `<PermissionGuard action={...} role={...}>` to show/hide or disable controls. The same `role` comes from AuthContext (user doc from Firestore).
- **Firestore rules**: Server-side rules mirror the role model: only Manager can write to `readiness`; only Manager and QualityLead can create in `readinessProposals`; Viewer is read-only. All reads remain scoped to the user’s `orgId`.

Data flow:

1. User signs in → app loads `users/{uid}` → `orgId`, `role`, `status`.
2. If `status !== 'active'` or missing `orgId` → access denied.
3. All reads filtered by `orgId` (enforced by rules and app queries).
4. Before any write: app checks `hasPermission(...)` and then performs the write; rules re-validate role and `orgId`.

---

## 2. Role-to-permission mapping table

| Action                | Manager | QualityLead | Viewer |
|-----------------------|--------|-------------|--------|
| readiness:view        | Yes    | Yes         | Yes    |
| readiness:update      | Yes    | No          | No     |
| readiness:propose     | Yes    | Yes         | No     |
| modules:enable (flag) | Yes    | No          | No     |

- **Manager**: View readiness; update readiness status; submit proposals; can enable future modules (flag only).
- **QualityLead**: View readiness; submit proposals only; cannot update live readiness or enable modules.
- **Viewer**: Read-only access to readiness screens; no writes.

---

## 3. Firestore security rules (Stage 20B)

- **Location**: `stage-20/firestore.rules`.
- **Behaviour**:
  - Default deny for all paths.
  - `users/{uid}`: read own document only; no client writes.
  - `organisations/{orgId}`: read if `userOrgId() == orgId`; no client writes.
  - `organisations/{orgId}/readiness/{domainId}`: read if org match; create/update only if `isManager()` and org match; no delete.
  - `organisations/{orgId}/readinessProposals/{proposalId}`: read if org match; create only if Manager or QualityLead and org match; no update/delete.
  - `organisations/{orgId}/domains/{domainId}`: same as readiness (Manager write).
  - Role and org are taken from `get(/databases/$(database)/documents/users/$(request.auth.uid))`; no custom claims required.

---

## 4. Modified readiness update logic

- **Who**: Manager only (enforced in app via `canWriteReadiness(role)` and in rules via `isManager()`).
- **Where**: Writes go to `/organisations/{orgId}/readiness/{domain}` (or equivalent domain doc). Each document includes:
  - `lastUpdatedBy` (Firebase UID)
  - `lastUpdatedAt` (ISO timestamp)
- **How**: Use `buildReadinessUpdate()` in `services/readinessUpdate.ts`; call `assertCanUpdateReadiness(role)` before writing; then `set()` or `update()` in Firestore. No patient data, no care records.

QualityLead:

- **Who**: Manager or QualityLead (enforced via `canProposeReadiness(role)` and rules).
- **Where**: Creates documents in `/organisations/{orgId}/readinessProposals/` with `buildReadinessProposal()`. No direct change to live readiness.

---

## 5. New files created

| Path | Purpose |
|------|--------|
| `stage-20/permissions/types.ts` | Role and PermissionAction types |
| `stage-20/permissions/mapping.ts` | ROLE_PERMISSIONS matrix and hasPermission() |
| `stage-20/permissions/index.ts` | Public API for permissions |
| `stage-20/permissions/PermissionGuard.tsx` | React component to guard UI by permission |
| `stage-20/permissions/usePermission.ts` | Hook exposing can(action) and role |
| `stage-20/services/readinessUpdate.ts` | Build update payload; assert Manager; lastUpdatedBy/At |
| `stage-20/services/readinessProposals.ts` | Build proposal doc; assert can propose |
| `stage-20/firestore.rules` | Stage 20A+20B rules (auth, org isolation, role-based writes) |
| `stage-20/STAGE-20B-ARCHITECTURE.md` | This document |

---

## 6. UI adjustments (requirements)

- Show **role label** in top navigation (e.g. “Manager”, “QualityLead”, “Viewer”) from AuthContext.
- **Disable or hide** controls that require `readiness:update` or `readiness:propose` when the user lacks permission; use `PermissionGuard` or `usePermission().can(...)`.
- Keep copy and behaviour **inspection-safe**: no patient data, no care records, no uploads, no AI. Governance-first language only.

**Example — role in nav**: In your top nav (e.g. next to “Inspection Readiness · Read-Only”), render the current user’s role from context, e.g. `{role}` so it shows “Manager”, “QualityLead”, or “Viewer”. Only display; no editing of role in the app.
