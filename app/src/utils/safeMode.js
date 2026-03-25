/** Pre-deployment flag: tag tenant writes as test data when true. */
export const isSafeMode = import.meta.env.VITE_SAFE_MODE === "true";

export function safeModeFields() {
  return { isTest: isSafeMode };
}
