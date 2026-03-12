/**
 * Stage 20B — Reusable permission guard.
 * Renders children only when the user has the required permission.
 * Always enforce at logic level as well; this is for UI only.
 */

import type { ReactNode } from 'react';
import { hasPermission } from './mapping';
import type { PermissionAction, Role } from './types';

export type PermissionGuardProps = {
  action: PermissionAction;
  role: Role;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Renders children only if hasPermission(action, role) is true.
 * Use fallback to show a disabled or hidden state when permission is missing.
 */
export function PermissionGuard({ action, role, children, fallback = null }: PermissionGuardProps): ReactNode {
  if (!hasPermission(action, role)) {
    return fallback;
  }
  return children;
}
