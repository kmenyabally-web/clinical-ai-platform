/**
 * Structured production logging for auth, audit creation, and subscription changes.
 * In production, these can be sent to Cloud Logging / monitoring; for now they
 * go to console with a consistent shape for log aggregation.
 */

const LOG_CATEGORY = {
  AUTH: "auth",
  AUDIT: "audit_log",
  SUBSCRIPTION: "subscription",
};

const env = typeof import.meta !== "undefined" ? import.meta.env : {};
const isProd = env.VITE_APP_ENV === "production";

function serialize(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function logStructured(category, event, payload) {
  const entry = {
    ts: new Date().toISOString(),
    category,
    event,
    ...payload,
  };
  if (isProd) {
    console.info("[platform]", serialize(entry));
  } else {
    console.debug(`[${category}]`, event, payload);
  }
}

export const productionLogger = {
  auth: {
    signInSuccess: (uid, email) =>
      logStructured(LOG_CATEGORY.AUTH, "sign_in_success", { userId: uid, email: email ?? null }),
    signInFailure: (code, email) =>
      logStructured(LOG_CATEGORY.AUTH, "sign_in_failure", { code, email: email ?? null }),
    signOut: (uid) =>
      logStructured(LOG_CATEGORY.AUTH, "sign_out", { userId: uid }),
    signUpSuccess: (uid, organisationId) =>
      logStructured(LOG_CATEGORY.AUTH, "sign_up_success", { userId: uid, organisationId }),
  },
  audit: {
    created: (organisationId, action, entityType, entityId) =>
      logStructured(LOG_CATEGORY.AUDIT, "audit_log_created", {
        organisationId,
        action,
        entityType,
        entityId,
      }),
  },
  subscription: {
    created: (organisationId, planName, billingCycle) =>
      logStructured(LOG_CATEGORY.SUBSCRIPTION, "subscription_created", {
        organisationId,
        planName,
        billingCycle,
      }),
    planChanged: (organisationId, previousPlan, newPlan) =>
      logStructured(LOG_CATEGORY.SUBSCRIPTION, "plan_changed", {
        organisationId,
        previousPlan,
        newPlan,
      }),
    cancelled: (organisationId) =>
      logStructured(LOG_CATEGORY.SUBSCRIPTION, "subscription_cancelled", { organisationId }),
  },
};
