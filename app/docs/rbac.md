# Role-Based Access Control (RBAC)

RBAC is implemented in the frontend using the user's `role` from the Firestore `users` collection (loaded via OrganisationContext). Permissions are derived from role; no separate permission fetch, so no UI flicker.

## Role → permissions

| Role     | Permissions |
|----------|--------------|
| Admin    | `audit:create`, `audit:update`, `audit:delete`, `audit:view`, `user:manage`, `organisation:manage` |
| Manager  | `audit:create`, `audit:update`, `audit:view` |
| QualityLead | Same as Manager (readiness sections). |
| Staff    | `audit:create`, `audit:view` |
| Auditor  | `audit:view` only (read-only; cannot modify data) |

## Constraints

- **Auditors** cannot modify data (view only).
- **Staff** cannot manage users (no `user:manage`).
- **Managers** cannot access organisation settings (no `organisation:manage`).
- **Admins** have full permissions.

## Usage

- **ProtectedPage**: Wrap a page; redirects to `/unauthorised` if the user lacks the required permission.
- **Can**: Renders children only when the user has the given permission.
- **useRole()**: Returns `{ role, permissions, loading, hasRole, can, isAllowed }`.
