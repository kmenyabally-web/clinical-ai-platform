/**
 * Stage 20B — Role and permission types.
 * No patient data, care records, uploads, or AI.
 * Governance-first, inspection-safe.
 */

export type Role = 'Manager' | 'QualityLead' | 'Viewer';

export const ROLES: Role[] = ['Manager', 'QualityLead', 'Viewer'];

/** Actions that can be permission-checked. Expand here only for governance-safe features. */
export type PermissionAction =
  | 'readiness:view'
  | 'readiness:update'
  | 'readiness:propose'
  | 'modules:enable'
  | 'careFolders:view'
  | 'careFolders:enable'
  | 'careFolders:createEmpty'
  | 'records:view'
  | 'records:create'
  | 'records:edit'
  | 'records:archive'
  | 'records:propose'
  | 'ai:use';
