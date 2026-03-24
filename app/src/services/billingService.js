import {
  collection,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { fetchServices } from "./servicesService";
import { productionLogger } from "../lib/productionLogger";
import { normalizePlanKey } from "../utils/featureAccess";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";

/**
 * Canonical plan keys stored on `subscriptions.planName` and `organisations.plan`.
 * Legacy values (Starter, Professional, …) are normalised via {@link normalizePlanKey}.
 */
export const PLANS = {
  BASIC: "BASIC",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

/** Max services per plan. null = unlimited. */
export const PLAN_MAX_SERVICES = {
  [PLANS.BASIC]: 1,
  [PLANS.PRO]: 5,
  [PLANS.ENTERPRISE]: null,
};

/** Billing cycles. */
export const BILLING_CYCLES = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
};

/**
 * Get plan limits (lightweight, in-memory).
 * @param {string} planName
 * @returns {{ maxServices: number | null }}
 */
export function getPlanLimits(planName) {
  const key = normalizePlanKey(planName);
  const max =
    PLAN_MAX_SERVICES[key] !== undefined ? PLAN_MAX_SERVICES[key] : PLAN_MAX_SERVICES[PLANS.BASIC];
  return { maxServices: max ?? null };
}

/**
 * Fetch the active subscription for an organisation. Single read; lightweight.
 * @param {string} organisationId
 * @returns {Promise<{ id: string, organisationId: string, planName: string, status: string, billingCycle: string, startDate: unknown, endDate: unknown, createdAt: unknown } | null>}
 */
export async function getSubscription(organisationId) {
  if (!organisationId?.trim()) return null;
  const ref = collection(db, SUBSCRIPTIONS_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", organisationId),
    where("status", "==", "active"),
    limit(1)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const d = docs[0];
  if (!d || typeof d.exists !== "function" || !d.exists()) return null;
  const x = d.data?.() ?? {};
  return {
    id: d.id ?? "",
    organisationId: x.organisationId ?? organisationId,
    planName: normalizePlanKey(x.planName ?? PLANS.BASIC),
    status: x.status ?? "active",
    billingCycle: x.billingCycle ?? BILLING_CYCLES.MONTHLY,
    startDate: x.startDate ?? null,
    endDate: x.endDate ?? null,
    createdAt: x.createdAt ?? null,
  };
}

/**
 * Create a new subscription (e.g. on org signup). Logs SUBSCRIPTION_CREATED.
 * @param {string} organisationId
 * @param {string} planName
 * @param {string} [billingCycle=monthly]
 * @param {{ organisationId: string, userId: string, userRole: string }} [auditContext]
 * @returns {Promise<{ id: string }>}
 */
export async function createSubscription(organisationId, planName, billingCycle = BILLING_CYCLES.MONTHLY, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const canonical = normalizePlanKey(planName ?? PLANS.BASIC);
  const ref = collection(db, SUBSCRIPTIONS_COLLECTION);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + (billingCycle === BILLING_CYCLES.ANNUAL ? 12 : 1));
  const docData = {
    organisationId,
    planName: canonical,
    status: "active",
    billingCycle: billingCycle ?? BILLING_CYCLES.MONTHLY,
    startDate: serverTimestamp(),
    endDate: Timestamp.fromDate(endDate),
    createdAt: serverTimestamp(),
  };
  const snap = await addDoc(ref, docData);
  productionLogger.subscription.created(organisationId, docData.planName, docData.billingCycle);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      action: "SUBSCRIPTION_CREATED",
      entityType: "SUBSCRIPTION",
      entityId: snap.id,
      entityName: canonical,
      previousValue: null,
      newValue: { planName: docData.planName, billingCycle: docData.billingCycle },
    });
  }
  return { id: snap.id };
}

/**
 * Change plan (upgrade/downgrade). Logs PLAN_CHANGED. Only one active subscription per org; we update the existing doc.
 * @param {string} organisationId
 * @param {string} newPlanName
 * @param {{ organisationId: string, userId: string, userRole: string }} [auditContext]
 * @returns {Promise<void>}
 */
export async function updateSubscriptionPlan(organisationId, newPlanName, auditContext) {
  if (!organisationId?.trim() || !newPlanName) throw new Error("organisationId and newPlanName required");
  const sub = await getSubscription(organisationId);
  if (!sub) throw new Error("No active subscription found");
  if (!sub.id) throw new Error("Invalid subscription reference");
  const subRef = doc(db, SUBSCRIPTIONS_COLLECTION, sub.id);
  if (!subRef) throw new Error("Invalid subscription reference");
  const previousPlan = sub.planName;
  const canonical = normalizePlanKey(newPlanName);
  await updateDoc(subRef, { planName: canonical });
  try {
    await setDoc(
      doc(db, "organisations", organisationId),
      { plan: canonical, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    /* org doc may not exist in edge cases */
  }
  productionLogger.subscription.planChanged(organisationId, previousPlan, canonical);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      action: "PLAN_CHANGED",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      entityName: canonical,
      previousValue: previousPlan,
      newValue: canonical,
    });
  }
}

/**
 * Cancel subscription (set status to cancelled). Does not delete; allows grace period or reactivation later.
 * @param {string} organisationId
 * @param {{ organisationId: string, userId: string, userRole: string }} [auditContext]
 * @returns {Promise<void>}
 */
export async function cancelSubscription(organisationId, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const sub = await getSubscription(organisationId);
  if (!sub) throw new Error("No active subscription found");
  if (!sub.id) throw new Error("Invalid subscription reference");
  const subRef = doc(db, SUBSCRIPTIONS_COLLECTION, sub.id);
  if (!subRef) throw new Error("Invalid subscription reference");
  await updateDoc(subRef, { status: "cancelled" });
  productionLogger.subscription.cancelled(organisationId);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      action: "PLAN_CHANGED",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      entityName: "cancelled",
      previousValue: sub.planName,
      newValue: "cancelled",
    });
  }
}

/**
 * Check whether the organisation can create one more service (plan limit). Lightweight: one subscription read + one services count.
 * @param {string} organisationId
 * @returns {Promise<{ allowed: boolean, current: number, max: number | null, planName: string }>}
 */
export async function checkServiceLimit(organisationId) {
  if (!organisationId?.trim()) return { allowed: false, current: 0, max: null, planName: null };
  const [sub, services] = await Promise.all([
    getSubscription(organisationId),
    fetchServices(organisationId),
  ]);
  const planName = sub?.planName ?? PLANS.BASIC;
  const max = getPlanLimits(planName).maxServices;
  const current = services.length;
  const allowed = max === null ? true : current < max;
  return { allowed, current, max, planName };
}

/**
 * Create a Stripe Checkout session via Cloud Functions (HTTPS).
 * Requires `VITE_FIREBASE_FUNCTIONS_URL` (e.g. https://europe-west1-PROJECT.cloudfunctions.net).
 * @param {string} organisationId
 * @param {string} planKey
 * @param {string} billingCycle
 * @param {string} successUrl
 * @param {string} cancelUrl
 * @returns {Promise<{ sessionId?: string, url?: string }>}
 */
export async function createCheckoutSession(organisationId, planKey, billingCycle, successUrl, cancelUrl) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required to start checkout.");

  const base = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
  if (!base?.trim()) {
    throw new Error(
      "Configure VITE_FIREBASE_FUNCTIONS_URL with your deployed Cloud Functions base URL (no trailing slash)."
    );
  }

  const token = await user.getIdToken();
  const url = `${String(base).replace(/\/$/, "")}/createCheckoutSession`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      organisationId,
      planKey: normalizePlanKey(planKey),
      billingCycle,
      successUrl,
      cancelUrl,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Checkout failed (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(data.error || data.message || text || `Checkout failed (${res.status})`);
  }
  return { sessionId: data.sessionId, url: data.url };
}

/**
 * Stripe Customer Billing Portal (optional — requires backend route).
 * @param {string} organisationId
 * @param {string} returnUrl
 * @returns {Promise<{ url?: string }>}
 */
export async function createBillingPortalSession(organisationId, returnUrl) {
  const base = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL;
  if (!base?.trim()) {
    console.warn("[billing] createBillingPortalSession: VITE_FIREBASE_FUNCTIONS_URL not set.");
    return Promise.resolve({});
  }
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const url = `${String(base).replace(/\/$/, "")}/createBillingPortalSession`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ organisationId, returnUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn("[billing] Billing portal failed:", data);
    return {};
  }
  return { url: data.url };
}
