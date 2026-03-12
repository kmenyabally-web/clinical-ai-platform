/**
 * Stage 20C — Care folder data model (empty structure only).
 * No patient/service user data. No content inside sections. Governance-first.
 */

export const CARE_FOLDER_SECTION_NAMES = [
  'Personal Overview',
  'Health Needs',
  'Mental Health Support',
  'Risk & Safeguarding',
  'Capacity & Consent',
  'Review & Outcomes',
] as const;

export type CareFolderSectionName = (typeof CARE_FOLDER_SECTION_NAMES)[number];

export const PLACEHOLDER_MESSAGE = 'Content not yet enabled. Governance-first deployment.';

/** Section entry: name only; no user content. Placeholder shown in UI only. */
export type CareFolderSectionPlaceholder = {
  name: CareFolderSectionName;
  placeholderMessage: string;
};

export type CareFolderStatus = 'empty';

/** Care folder document under /organisations/{orgId}/careFolders/{folderId}. No nested content. */
export type CareFolderDoc = {
  orgId: string;
  folderId: string;
  status: CareFolderStatus;
  sections: CareFolderSectionPlaceholder[];
  createdAt: string; // ISO
  createdBy: string;  // Firebase UID
};

/** Organisation document field added in Stage 20C. Only Manager may change. */
export type OrganisationCareFoldersEnabled = boolean;

/** Build the fixed empty sections array. No content; placeholder only. */
export function buildEmptySections(): CareFolderSectionPlaceholder[] {
  return CARE_FOLDER_SECTION_NAMES.map((name) => ({
    name,
    placeholderMessage: PLACEHOLDER_MESSAGE,
  }));
}
