import {
  collection,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { fetchServices } from "./servicesService";
import { productionLogger } from "../lib/productionLogger";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";

/** Plan names. */
export const PLANS = {
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

/** Max services per plan. null = unlimited. */
export const PLAN_MAX_SERVICES = {
  [PLANS.STARTER]: 1,
  [PLANS.PROFESSIONAL]: 5,
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
  return {
    maxServices: planName != null ? (PLAN_MAX_SERVICES[planName] ?? null) : null,
  };
}

/**
 * Fetch the active subscription for an organisation. Single read; lightweight.
 * Prefer this over heavy queries; do not call on every dashboard load—use in Billing page and before creating services.
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
    planName: x.planName ?? PLANS.STARTER,
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
  const ref = collection(db, SUBSCRIPTIONS_COLLECTION);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + (billingCycle === BILLING_CYCLES.ANNUAL ? 12 : 1));
  const docData = {
    organisationId,
    planName: planName ?? PLANS.STARTER,
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
      entityName: planName ?? PLANS.STARTER,
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
  await updateDoc(subRef, { planName: newPlanName });
  productionLogger.subscription.planChanged(organisationId, previousPlan, newPlanName);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      ...auditContext,
      action: "PLAN_CHANGED",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      entityName: newPlanName,
      previousValue: previousPlan,
      newValue: newPlanName,
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
  const planName = sub?.planName ?? PLANS.STARTER;
  const max = getPlanLimits(planName).maxServices;
  const current = services.length;
  const allowed = max === null ? true : current < max;
  return { allowed, current, max, planName };
}

// --- Stripe placeholder (prepare for payment provider) ---

/**
 * Create a Stripe Checkout session for subscription (placeholder).
 * When integrating: use Stripe SDK, create session, return sessionId/url for redirect.
 * @param {string} organisationId
 * @param {string} planName
 * @param {string} billingCycle
 * @param {string} successUrl
 * @param {string} cancelUrl
 * @returns {Promise<{ sessionId?: string, url?: string }>}
 */
export async function createCheckoutSession(organisationId, planName, billingCycle, successUrl, cancelUrl) {
  // Placeholder: real implementation would call backend or Stripe SDK
  console.warn("[billing] createCheckoutSession is a placeholder. Integrate Stripe when ready.");
  return Promise.resolve({});
}

/**
 * Create a Stripe Customer Billing Portal session (manage payment methods, invoices) (placeholder).
 * @param {string} organisationId
 * @param {string} returnUrl
 * @returns {Promise<{ url?: string }>}
 */
export async function createBillingPortalSession(organisationId, returnUrl) {
  console.warn("[billing] createBillingPortalSession is a placeholder. Integrate Stripe when ready.");
  return Promise.resolve({});
}
