/**
 * Error monitoring for production. Integrate Sentry or Firebase Crashlytics.
 * Set VITE_SENTRY_DSN to enable Sentry; otherwise errors are only logged to console.
 */

const dsn = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SENTRY_DSN : undefined;

let captureExceptionImpl = (error, context) => {
  console.error("[error]", error, context);
};

export function initErrorMonitoring() {
  if (dsn && typeof window !== "undefined") {
    try {
      // Optional: dynamic import so Sentry is only loaded when DSN is set
      // import('@sentry/react').then((Sentry) => { Sentry.init({ dsn, ... }); captureExceptionImpl = Sentry.captureException; });
      // For now, no runtime dependency; add @sentry/react and uncomment:
      // import * as Sentry from '@sentry/react';
      // Sentry.init({ dsn, environment: import.meta.env.VITE_APP_ENV, tracesSampleRate: 0.1 });
      // captureExceptionImpl = (err, ctx) => { Sentry.captureException(err, { extra: ctx }); };
    } catch (e) {
      console.warn("[errorMonitoring] init failed", e);
    }
  }
}

export function captureException(error, context = {}) {
  captureExceptionImpl(error, context);
}
