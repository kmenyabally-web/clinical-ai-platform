/**
 * Detect if a Firestore error is due to a missing index.
 * Use to show a friendly "Database index building. Please refresh shortly." message.
 */
export function isIndexError(err) {
  if (!err) return false;
  const code = err.code || err?.message?.code;
  const message = String(err?.message ?? "");
  if (code === "failed-precondition") return true;
  if (/index|requires an index/i.test(message)) return true;
  return false;
}

export const INDEX_ERROR_MESSAGE = "Database index building. Please refresh shortly.";
