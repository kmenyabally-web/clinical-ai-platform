/**
 * Development auth bypass configuration.
 *
 * For governance testing we explicitly disable the bypass so that
 * real Firebase Authentication behaviour (login/logout, claims)
 * is exercised even in development.
 */
export const DEV_AUTH_BYPASS = false;

