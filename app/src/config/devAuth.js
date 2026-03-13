/**
 * Development auth bypass configuration.
 *
 * DEV_AUTH_BYPASS is true only in Vite's development mode.
 * In production builds this will be false and normal Firebase auth is used.
 */
export const DEV_AUTH_BYPASS = import.meta.env.MODE === "development";

