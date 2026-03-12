/**
 * Stage 20B — Centralised permission mapping.
 * Single source of truth for role → action. Enforce at logic level, not only UI.
 */

import type { Role, PermissionAction } from './types';

/** Role-to-permission matrix. True = allowed. */
const ROLE_PERMISSIONS: Record<Role, Record<PermissionAction, boolean>> = {
  Manager: {
    'readiness:view': true,
    'readiness:update': true,
    'readiness:propose': true,
    'modules:enable': true,
    'careFolders:view': true,
    'careFolders:enable': true,
    'careFolders:createEmpty': true,
    'records:view': true,
    'records:create': true,
    'records:edit': true,
    'records:archive': true,
    'records:propose': true,
    'ai:use': true,
  },
  QualityLead: {
    'readiness:view': true,
    'readiness:update': false,
    'readiness:propose': true,
    'modules:enable': false,
    'careFolders:view': true,
    'careFolders:enable': false,
    'careFolders:createEmpty': false,
    'records:view': true,
    'records:create': false,
    'records:edit': false,
    'records:archive': false,
    'records:propose': true,
    'ai:use': false,
  },
  Viewer: {
    'readiness:view': true,
    'readiness:update': false,
    'readiness:propose': false,
    'modules:enable': false,
    'careFolders:view': true,
    'careFolders:enable': false,
    'careFolders:createEmpty': false,
    'records:view': true,
    'records:create': false,
    'records:edit': false,
    'records:archive': false,
    'records:propose': false,
    'ai:use': false,
  },
};

/**
 * Central permission check. Use for all UI and logic decisions.
 * Do not rely only on hiding UI — enforce in handlers and services too.
 */
export function hasPermission(action: PermissionAction, role: Role): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  return rolePerms[action] === true;
}

/** Whether the role can write to live readiness (Manager only). */
export function canWriteReadiness(role: Role): boolean {
  return hasPermission('readiness:update', role);
}

/** Whether the role can create readiness proposals (Manager, QualityLead). */
export function canProposeReadiness(role: Role): boolean {
  return hasPermission('readiness:propose', role);
}

/** Whether the role can toggle future module flags (Manager only). */
export function canEnableModules(role: Role): boolean {
  return hasPermission('modules:enable', role);
}

/** Whether the role can view care folder structure when enabled (all roles). */
export function canViewCareFolders(role: Role): boolean {
  return hasPermission('careFolders:view', role);
}

/** Whether the role can set careFoldersEnabled on the organisation (Manager only). */
export function canEnableCareFolders(role: Role): boolean {
  return hasPermission('careFolders:enable', role);
}

/** Whether the role can create empty care folder records (Manager only). */
export function canCreateEmptyCareFolder(role: Role): boolean {
  return hasPermission('careFolders:createEmpty', role);
}

/** Whether the role can view patient records (all roles when care folders enabled). */
export function canViewRecords(role: Role): boolean {
  return hasPermission('records:view', role);
}

/** Whether the role can create patient records (Manager only). */
export function canCreateRecords(role: Role): boolean {
  return hasPermission('records:create', role);
}

/** Whether the role can edit patient records (Manager only). */
export function canEditRecords(role: Role): boolean {
  return hasPermission('records:edit', role);
}

/** Whether the role can archive (soft-delete) records (Manager only). */
export function canArchiveRecords(role: Role): boolean {
  return hasPermission('records:archive', role);
}

/** Whether the role can submit record edit proposals (QualityLead, Manager). */
export function canProposeRecordEdits(role: Role): boolean {
  return hasPermission('records:propose', role);
}

/** Whether the role may invoke AI assistance (Manager only). Requires org aiEnabled to be true. */
export function canUseAi(role: Role): boolean {
  return hasPermission('ai:use', role);
}
