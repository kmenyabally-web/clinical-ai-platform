# Stage 20C — Care folder structure (empty, governed)

## 1. Updated Firestore schema

### Organisation document

**Path:** `/organisations/{orgId}`

| Field                 | Type    | Description |
|-----------------------|---------|-------------|
| name                  | string  | (existing)  |
| serviceType           | string  | (existing)  |
| status                 | string  | (existing)  |
| **careFoldersEnabled**| boolean | **New.** Default `false`. Only Manager may update. When `true`, Care Folders section is visible and empty folders can be created. |

### Care folders collection

**Path:** `/organisations/{orgId}/careFolders/{folderId}`

| Field      | Type     | Description |
|------------|----------|-------------|
| orgId      | string   | Organisation ID (must match path). |
| folderId   | string   | Document ID / folder identifier. |
| status     | string   | Always `"empty"` in Stage 20C. |
| sections   | array    | Fixed list of section placeholders; no user content. |
| createdAt  | string   | ISO timestamp. |
| createdBy  | string   | Firebase UID of Manager who created. |

**sections** (array of objects):

| Field              | Type   | Description |
|--------------------|--------|-------------|
| name               | string | One of: "Personal Overview", "Health Needs", "Mental Health Support", "Risk & Safeguarding", "Capacity & Consent", "Review & Outcomes". |
| placeholderMessage | string | Fixed: "Content not yet enabled. Governance-first deployment." |

- No nested collections under `careFolders/{folderId}`.
- No writes to section content; no patient or service user data.

---

## 2. Care folder data model (app)

- **CareFolderDoc**: `orgId`, `folderId`, `status: 'empty'`, `sections[]`, `createdAt`, `createdBy`.
- **CareFolderSectionPlaceholder**: `name`, `placeholderMessage` (fixed).
- **Section names**: Personal Overview, Health Needs, Mental Health Support, Risk & Safeguarding, Capacity & Consent, Review & Outcomes.
- **buildEmptySections()**: returns the fixed array of placeholders.
- **buildEmptyCareFolderDoc(orgId, folderId, uid)**: returns the document to create (Manager only).

---

## 3. Role-based enablement logic

| Action                     | Manager | QualityLead | Viewer |
|----------------------------|---------|-------------|--------|
| View Care Folders (if enabled) | Yes     | Yes         | Yes    |
| Change careFoldersEnabled | Yes     | No          | No     |
| Create empty care folder  | Yes     | No          | No     |
| Add content to sections   | No      | No          | No     |

- **Enablement flag**: Only Manager may set `careFoldersEnabled` to `true` or `false`. Use `assertCanEnableCareFolders(role)` before updating the organisation document; app must only update the `careFoldersEnabled` field.
- **View**: If `careFoldersEnabled === true`, all roles with `careFolders:view` see the Care Folders area (list of empty folders and section placeholders). If `careFoldersEnabled === false`, show the locked message only.
- **Create empty folder**: Only Manager. Use `assertCanCreateEmptyCareFolder(role)` and `buildEmptyCareFolderDoc(orgId, folderId, uid)` then Firestore `set()`; rules allow create only for Manager.

---

## 4. Updated security rules (summary)

- **organisations/{orgId}**: Read if org match. Update allowed only for Manager (app restricts to `careFoldersEnabled`). No create/delete.
- **organisations/{orgId}/careFolders/{folderId}**: Read if org match. Create allowed only for Manager. Update and delete denied (no writes inside sections; no nested data).
- **organisations/{orgId}/careFolders/{folderId}/{document=**}**: All read/write denied (no subcollections or section content).

---

## 5. UI navigation and behaviour

### Navigation

- Add a new navigation item: **"Care Folders"** (e.g. next to Overview, Governance, etc.). Visible to all roles; destination behaviour depends on enablement and role.

### When careFoldersEnabled === false

- Show a single governance message only (no list, no create):
  - **"Care folders are not enabled for this organisation. Governance approval required."**
- Do not show empty folder list or create button. Optionally show an explanation that only a Manager can enable care folders via organisation settings.

### When careFoldersEnabled === true

- **All roles**: See the Care Folders section and the list of empty care folders. Each folder shows its sections with the **placeholder only**: "Content not yet enabled. Governance-first deployment."
- **Manager only**: Show a control to **create a new empty folder** (e.g. "Create empty care folder"). On create, use `buildEmptyCareFolderDoc(orgId, folderId, uid)` and write to `organisations/{orgId}/careFolders/{folderId}`. Do not allow editing of sections or adding content.
- **QualityLead / Viewer**: No create button; read-only list and section placeholders.

### Tone

- Inspection-safe, governance-first language. No patient or service user data. No uploads. No AI. Care folders remain empty structure only; activation is governance-led.

---

## 6. New / updated files (Stage 20C)

| Path | Purpose |
|------|--------|
| `permissions/types.ts` | Added `careFolders:view`, `careFolders:enable`, `careFolders:createEmpty`. |
| `permissions/mapping.ts` | Role matrix and helpers for care folder permissions. |
| `permissions/usePermission.ts` | Hook exposes `canViewCareFolders`, `canEnableCareFolders`, `canCreateEmptyCareFolder`. |
| `models/careFolder.ts` | CareFolderDoc, section names, placeholder message, `buildEmptySections()`. |
| `services/careFolderEnablement.ts` | `assertCanEnableCareFolders`, `assertCanCreateEmptyCareFolder`, `buildEmptyCareFolderDoc`. |
| `firestore.rules` | Organisation update (Manager); careFolders read/create (Manager create only); deny nested. |
| `STAGE-20C-CARE-FOLDER-STRUCTURE.md` | This document. |
