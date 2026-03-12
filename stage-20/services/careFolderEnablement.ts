/**
 * Stage 20C — Care folder enablement and empty folder creation.
 * Only Manager may enable flag or create empty folders. No content, no uploads, no personal data.
 */

import type { Role } from '../permissions';
import { canEnableCareFolders, canCreateEmptyCareFolder } from '../permissions';
import {
  buildEmptySections,
  type CareFolderDoc,
  type CareFolderSectionPlaceholder,
} from '../models/careFolder';

/** Assert that the role may set careFoldersEnabled. Manager only. */
export function assertCanEnableCareFolders(role: Role): void {
  if (!canEnableCareFolders(role)) {
    throw new Error('Permission denied: only Manager can enable care folders for this organisation.');
  }
}

/** Assert that the role may create an empty care folder. Manager only. */
export function assertCanCreateEmptyCareFolder(role: Role): void {
  if (!canCreateEmptyCareFolder(role)) {
    throw new Error('Permission denied: only Manager can create care folder records.');
  }
}

/**
 * Build a new empty care folder document. Caller must be Manager and use Firestore set().
 * No content in sections; placeholder only.
 */
export function buildEmptyCareFolderDoc(
  orgId: string,
  folderId: string,
  uid: string
): CareFolderDoc {
  const sections: CareFolderSectionPlaceholder[] = buildEmptySections();
  return {
    orgId,
    folderId,
    status: 'empty',
    sections,
    createdAt: new Date().toISOString(),
    createdBy: uid,
  };
}
