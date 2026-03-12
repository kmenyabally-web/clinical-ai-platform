import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  updateDoc,
  doc,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { updateSubscriptionPlan, cancelSubscription, getSubscription, PLANS } from "./billingService";

const ORGANISATIONS_COLLECTION = "organisations";
const USERS_COLLECTION = "users";
const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const SERVICES_COLLECTION = "services";
const INSPECTION_SESSIONS_COLLECTION = "inspection_sessions";
const TREND_LIMIT = 200;

/**
 * Platform-level stats using count aggregation. Optimized; no full collection scan for documents.
 * @returns {Promise<{ totalOrganisations: number, totalUsers: number, activeSubscriptions: number, totalServices: number }>}
 */
export async function getPlatformStats() {
  const [orgCount, userCount, subCount, serviceCount] = await Promise.all([
    getCountFromServer(collection(db, ORGANISATIONS_COLLECTION)),
    getCountFromServer(collection(db, USERS_COLLECTION)),
    getCountFromServer(
      query(
        collection(db, SUBSCRIPTIONS_COLLECTION),
        where("status", "==", "active")
      )
    ),
    getCountFromServer(collection(db, SERVICES_COLLECTION)),
  ]);
  return {
    totalOrganisations: orgCount?.data?.()?.count ?? 0,
    totalUsers: userCount?.data?.()?.count ?? 0,
    activeSubscriptions: subCount?.data?.()?.count ?? 0,
    totalServices: serviceCount?.data?.()?.count ?? 0,
  };
}

/**
 * List organisations with plan, service count, and subscription status. Bounded read (limit 200 orgs).
 * @returns {Promise<Array<{ id: string, name: string, status: string, planName: string, subscriptionStatus: string, numberOfServices: number }>>}
 */
export async function listOrganisationsWithDetails() {
  const [orgSnap, subSnap, servicesSnap] = await Promise.all([
    getDocs(query(collection(db, ORGANISATIONS_COLLECTION), limit(TREND_LIMIT))),
    getDocs(query(collection(db, SUBSCRIPTIONS_COLLECTION), where("status", "==", "active"))),
    getDocs(collection(db, SERVICES_COLLECTION)),
  ]);

  const subsByOrg = new Map();
  (subSnap?.docs ?? []).forEach((d) => {
    const data = d?.data?.() ?? {};
    const oid = data.organisationId;
    if (oid) subsByOrg.set(oid, { id: d?.id ?? "", ...data });
  });

  const serviceCountByOrg = new Map();
  (servicesSnap?.docs ?? []).forEach((d) => {
    const data = d?.data?.() ?? {};
    const oid = data.organisationId;
    if (oid) serviceCountByOrg.set(oid, (serviceCountByOrg.get(oid) || 0) + 1);
  });

  return (orgSnap?.docs ?? []).map((d) => {
    const data = d?.data?.() ?? {};
    const id = d?.id ?? "";
    const sub = subsByOrg.get(id);
    return {
      id,
      name: data.name ?? "",
      status: data.status ?? "active",
      planName: sub?.planName ?? PLANS.STARTER,
      subscriptionStatus: sub ? "active" : "none",
      numberOfServices: serviceCountByOrg.get(id) ?? 0,
    };
  });
}

/**
 * Suspend an organisation. Logs ORG_SUSPENDED.
 * @param {string} organisationId
 * @param {{ userId: string, userRole: string }} auditContext - platform admin context
 */
export async function suspendOrganisation(organisationId, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const orgRef = doc(db, ORGANISATIONS_COLLECTION, organisationId);
  await updateDoc(orgRef, { status: "suspended" });
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "platform_admin",
      action: "ORG_SUSPENDED",
      entityType: "ORGANISATION",
      entityId: organisationId,
      entityName: organisationId,
      previousValue: "active",
      newValue: "suspended",
    });
  }
}

/**
 * Reactivate an organisation. Logs ORG_REACTIVATED.
 * @param {string} organisationId
 * @param {{ userId: string, userRole: string }} auditContext
 */
export async function reactivateOrganisation(organisationId, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const orgRef = doc(db, ORGANISATIONS_COLLECTION, organisationId);
  await updateDoc(orgRef, { status: "active" });
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "platform_admin",
      action: "ORG_REACTIVATED",
      entityType: "ORGANISATION",
      entityId: organisationId,
      entityName: organisationId,
      previousValue: "suspended",
      newValue: "active",
    });
  }
}

/**
 * Admin: upgrade or change plan for an organisation. Logs PLAN_UPDATED.
 */
export async function adminUpdatePlan(organisationId, newPlanName, auditContext) {
  if (!organisationId?.trim() || !newPlanName) throw new Error("organisationId and newPlanName required");
  const sub = await getSubscription(organisationId);
  if (!sub) throw new Error("No active subscription found");
  const previousPlan = sub.planName;
  await updateSubscriptionPlan(organisationId, newPlanName, auditContext);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "platform_admin",
      action: "PLAN_UPDATED",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      entityName: newPlanName,
      previousValue: previousPlan,
      newValue: newPlanName,
    });
  }
}

/**
 * Admin: cancel subscription. Logs PLAN_UPDATED with newValue "cancelled".
 */
export async function adminCancelSubscription(organisationId, auditContext) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const sub = await getSubscription(organisationId);
  if (!sub) throw new Error("No active subscription found");
  const previousPlan = sub.planName;
  await cancelSubscription(organisationId, auditContext);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "platform_admin",
      action: "PLAN_UPDATED",
      entityType: "SUBSCRIPTION",
      entityId: sub.id,
      entityName: "cancelled",
      previousValue: previousPlan,
      newValue: "cancelled",
    });
  }
}

/**
 * Get timestamp from Firestore field (Timestamp or object with seconds).
 * @param {unknown} ts
 * @returns {number | null} milliseconds
 */
function toMs(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts.seconds != null) return ts.seconds * 1000;
  return null;
}

/**
 * Platform metrics for charts: counts by month (last 12 months). Bounded queries.
 * @returns {Promise<{ organisationsByMonth: Array<{ month: string, count: number }>, servicesByMonth: Array<{ month: string, count: number }>, inspectionsByMonth: Array<{ month: string, count: number }> }>}
 */
export async function getPlatformMetrics() {
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }

  const emptySeries = months.map((month) => ({ month, count: 0 }));
  const byMonth = (docs, dateField) => {
    const map = new Map(months.map((m) => [m, 0]));
    (docs ?? []).forEach((d) => {
      const data = d?.data?.() ?? {};
      const ts = toMs(data[dateField]);
      if (ts) {
        const key = new Date(ts).toISOString().slice(0, 7);
        if (map.has(key)) map.set(key, map.get(key) + 1);
      }
    });
    return months.map((month) => ({ month, count: map.get(month) ?? 0 }));
  };

  let orgDocs = [];
  let serviceDocs = [];
  let inspectionDocs = [];

  try {
    const orgRef = collection(db, ORGANISATIONS_COLLECTION);
    const orgQ = query(orgRef, orderBy("createdAt", "desc"), limit(TREND_LIMIT));
    const orgSnap = await getDocs(orgQ);
    orgDocs = orgSnap?.docs ?? [];
  } catch {
    // createdAt index may not exist; skip
  }

  try {
    const svcRef = collection(db, SERVICES_COLLECTION);
    const svcQ = query(svcRef, orderBy("createdAt", "desc"), limit(TREND_LIMIT));
    const svcSnap = await getDocs(svcQ);
    serviceDocs = svcSnap?.docs ?? [];
  } catch {
    // ignore
  }

  try {
    const insRef = collection(db, INSPECTION_SESSIONS_COLLECTION);
    const insQ = query(insRef, orderBy("startedAt", "desc"), limit(TREND_LIMIT));
    const insSnap = await getDocs(insQ);
    inspectionDocs = insSnap?.docs ?? [];
  } catch {
    // ignore
  }

  return {
    organisationsByMonth: byMonth(orgDocs, "createdAt"),
    servicesByMonth: byMonth(serviceDocs, "createdAt"),
    inspectionsByMonth: byMonth(inspectionDocs, "startedAt"),
  };
}
