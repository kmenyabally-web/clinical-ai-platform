/**
 * Stage 20B — Permissions public API.
 */

export {
  hasPermission,
  canWriteReadiness,
  canProposeReadiness,
  canEnableModules,
  canViewCareFolders,
  canEnableCareFolders,
  canCreateEmptyCareFolder,
  canViewRecords,
  canCreateRecords,
  canEditRecords,
  canArchiveRecords,
  canProposeRecordEdits,
  canUseAi,
} from './mapping';
export type { Role, PermissionAction } from './types';
export { ROLES } from './types';
