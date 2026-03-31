/**
 * Standard audit / lifecycle fields for Firestore documents (CQC-aligned).
 * New writes should include these; reads filter {@link isDocumentActive}.
 */

/** @returns {Record<string, unknown>} */
export function auditFieldsOnCreate(userId) {
  const uid = userId != null ? String(userId) : null;
  return {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  };
}

/** Soft-delete patch (use with updateDoc). */
export function auditFieldsSoftDelete(userId) {
  const uid = userId != null ? String(userId) : null;
  return {
    isDeleted: true,
    deletedAt: null, // set server-side in caller
    deletedBy: uid,
  };
}

/** @param {Record<string, unknown> | null | undefined} data */
export function isDocumentActive(data) {
  if (!data || typeof data !== "object") return false;
  return data.isDeleted !== true;
}
