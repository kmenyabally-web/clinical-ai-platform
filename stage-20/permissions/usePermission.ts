/**
 * Stage 20B — Hook for permission checks in components.
 * Use for both rendering and event handlers so logic is enforced, not only UI.
 */

import { useMemo } from 'react';
import { hasPermission } from './mapping';
import type { PermissionAction, Role } from './types';

export function usePermission(role: Role) {
  return useMemo(
    () => ({
      role,
      can: (action: PermissionAction) => hasPermission(action, role),
      canViewReadiness: hasPermission('readiness:view', role),
      canUpdateReadiness: hasPermission('readiness:update', role),
      canProposeReadiness: hasPermission('readiness:propose', role),
      canEnableModules: hasPermission('modules:enable', role),
      canViewCareFolders: hasPermission('careFolders:view', role),
      canEnableCareFolders: hasPermission('careFolders:enable', role),
      canCreateEmptyCareFolder: hasPermission('careFolders:createEmpty', role),
      canViewRecords: hasPermission('records:view', role),
      canCreateRecords: hasPermission('records:create', role),
      canEditRecords: hasPermission('records:edit', role),
      canArchiveRecords: hasPermission('records:archive', role),
      canProposeRecordEdits: hasPermission('records:propose', role),
      canUseAi: hasPermission('ai:use', role),
    }),
    [role]
  );
}
