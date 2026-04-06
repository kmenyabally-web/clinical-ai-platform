/**
 * Error monitoring — Sentry when VITE_SENTRY_DSN is set; otherwise console-only via captureException.
 */

const dsn = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SENTRY_DSN : undefined;

let captureExceptionImpl = (error, context) => {
  console.error("[error]", error, context);
};

export function initErrorMonitoring() {
  if (!dsn || typeof window === "undefined") return;
  import("@sentry/react")
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE,
        tracesSampleRate: 0.1,
      });
      captureExceptionImpl = (err, ctx) => {
        Sentry.captureException(err, { extra: ctx });
      };
    })
    .catch(() => {
      /* optional dependency failed — keep console fallback */
    });
}

export function captureException(error, context = {}) {
  captureExceptionImpl(error, context);
}
