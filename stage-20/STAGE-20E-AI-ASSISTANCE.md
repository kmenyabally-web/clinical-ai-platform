# Stage 20E — Governed AI assistance layer

## 1. AI architecture overview

- **Purpose**: Optional, assistive AI for readiness reflection, policy-gap prompting, care record summarisation, and improvement suggestions. AI does **not** make decisions, generate compliance scores, override human input, or modify records automatically.
- **Access**: AI features are available only to **Manager** role and only when the organisation has **aiEnabled === true**. If aiEnabled is false, all AI UI is hidden.
- **Invocation**: Every use is **manually triggered** (no automatic pop-ups). Each invocation is logged to `aiLogs`; logs are immutable.
- **Data**: AI receives only minimal, necessary data for the chosen feature. No bulk record processing, no cross-org data, no use of audit log data, no training on organisation data. Prompts/outputs are not stored externally beyond the session except where the user explicitly saves (e.g. copy to record after human review).
- **Output**: All AI output is clearly labelled as draft and requires human review; nothing is persisted unless a Manager explicitly saves it.

---

## 2. Feature flag structure

**Organisation document** `organisations/{orgId}`:

| Field        | Type    | Description |
|-------------|---------|-------------|
| aiEnabled   | boolean | Optional. Default false. When true, Manager sees AI features. Only Manager may change (via existing org update rule). |

- **UI**: If `aiEnabled === false` or role !== Manager, do not render any AI buttons or panels.
- **Logic**: Before calling any AI path, enforce `assertCanUseAi(role, aiEnabled)` and write an entry to `aiLogs`.

---

## 3. Updated Firestore schema (Stage 20E)

**Organisation** (add field):

- `aiEnabled` (boolean, optional, default false).

**New collection**:

**Path:** `/organisations/{orgId}/aiLogs/{logId}`

| Field       | Type   | Description |
|------------|--------|-------------|
| userId     | string | Firebase UID of user who invoked AI. |
| role       | string | User role at time of invocation. |
| timestamp  | string | ISO timestamp. |
| featureUsed| string | One of: readiness_reflection, policy_gap_prompt, care_record_summary, improvement_suggestions. |
| recordId   | string | Optional. Set when feature is care_record_summary (or other record-scoped use). |

- **Write**: Create only (Manager when invoking AI). No update or delete.
- **Read**: Allowed for users in same org (e.g. for governance review). AI must never read or write care folder `auditLogs`.

---

## 4. Security rule updates

- **organisations/{orgId}**: Unchanged. Manager may update (app restricts to allowed fields, including `aiEnabled`). No create/delete.
- **organisations/{orgId}/aiLogs/{logId}**:
  - **read**: if orgMatch(orgId).
  - **create**: if orgMatch(orgId) && isManager().
  - **update, delete**: false.

Only Manager can create aiLog entries (when they trigger an AI feature). No modification of existing aiLogs.

---

## 5. AI invocation logging structure

- **When**: Immediately after the user triggers an AI feature (e.g. "Generate Reflection Prompts", "Generate Summary (AI Assist)").
- **Where**: `organisations/{orgId}/aiLogs` with document built by `buildAiLogEntry(userId, role, featureUsed, recordId?)`.
- **Fields**: userId, role, timestamp, featureUsed, recordId (if applicable).
- **Immutability**: Rules allow create only; update and delete denied. Logs are for accountability and must not be altered.

---

## 6. UI integration summary

- **Visibility**: Show AI controls only when role === Manager and organisation.aiEnabled === true. Otherwise hide all AI entry points.
- **Readiness sections**: Optional button **"Generate Reflection Prompts"**. On use, AI suggests inspection-style reflective questions; display in a read-only panel. Do not change readiness level. Show disclaimer: *"AI support tool. Does not replace professional judgement."*
- **Care folder record**: Optional **"Generate Summary (AI Assist)"**. AI may summarise existing fields, highlight missing basic fields, suggest review areas. Output must be labelled *"AI-Generated Draft – Human Review Required"* and must not be saved unless the Manager manually saves. No automatic add/modify of record data.
- **Policy gap / improvement suggestions**: Same pattern: optional, manually invoked, read-only output panel, disclaimer, no auto-save.
- **Behaviour**: No automatic pop-ups; AI is manually invoked only. All panels that show AI output must include the disclaimer and, where relevant, the draft label.

---

## 7. Data protection controls (enforcement)

- **Minimal data**: Each AI feature sends only the minimal fields needed (e.g. readiness levels for reflection; record basic fields for summary). Do not send audit log content or full history.
- **No bulk**: Process one context at a time (e.g. one readiness area, one record). No batch or bulk record processing.
- **No cross-org**: Only data belonging to the user’s orgId is ever sent; orgId is validated before any AI call.
- **No training**: Organisation data is not used to train models; use only for per-request inference.
- **No external prompt storage**: Prompts and responses are not persisted to external systems beyond the session; if the user copies content into the app, that is an explicit human action (e.g. Manager save).

---

## 8. Features not introduced (Stage 20E)

- No automated compliance scoring.
- No clinical risk scoring.
- No medication analysis.
- No decision support logic.
- AI never reads or writes care folder audit logs.

---

## 9. New / updated files (Stage 20E)

| Path | Purpose |
|------|--------|
| `permissions/types.ts` | Added `ai:use`. |
| `permissions/mapping.ts` | Manager: ai:use true; QualityLead, Viewer: false. Added canUseAi(). |
| `permissions/index.ts`, `usePermission.ts` | Export and hook for ai:use. |
| `models/aiLog.ts` | AiFeatureUsed, AiLogEntryDoc. |
| `services/aiAssistance.ts` | assertCanUseAi(), buildAiLogEntry(), AI_DISCLAIMER, AI_DRAFT_LABEL. |
| `firestore.rules` | aiLogs: read org, create Manager only, no update/delete. |
| `STAGE-20E-AI-ASSISTANCE.md` | This document. |
