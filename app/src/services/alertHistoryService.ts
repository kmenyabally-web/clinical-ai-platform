/**
 * Persist early-warning alert snapshots to `alerts` (audit + dashboard).
 */

import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { assertSameOrganisationData, GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import type { Alert, AlertSeverity, AlertSource } from "../models/alertModel";

export const ALERTS_HISTORY_COLLECTION = "alerts";

function alertToPlain(a: Alert): Record<string, unknown> {
  return {
    id: a.id,
    patientId: a.patientId,
    type: a.type,
    severity: a.severity,
    message: a.message,
    source: a.source,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt ?? ""),
  };
}

const ALERT_SOURCES = new Set<string>(["nursing", "psychology", "psychiatry", "ot", "salt"]);

function normStoredSource(s: unknown): AlertSource {
  const t = String(s ?? "").trim().toLowerCase();
  if (ALERT_SOURCES.has(t)) return t as AlertSource;
  return "nursing";
}

function normStoredSeverity(s: unknown): AlertSeverity {
  const t = String(s ?? "").trim().toLowerCase();
  if (t === "high" || t === "medium" || t === "low") return t;
  return "low";
}

/** Rehydrate alerts written by {@link recordAlertSnapshot} for UI / role filtering. */
export function parseStoredAlerts(patientId: string, raw: unknown): Alert[] {
  if (!Array.isArray(raw)) return [];
  const pid = String(patientId ?? "").trim();
  const out: Alert[] = [];
  let i = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      id: String(o.id ?? `stored-${pid}-${i}`),
      patientId: pid,
      type: String(o.type ?? ""),
      severity: normStoredSeverity(o.severity),
      message: String(o.message ?? ""),
      source: normStoredSource(o.source),
      createdAt: new Date(),
    });
    i += 1;
  }
  return out;
}

export type AlertSnapshotRow = {
  id: string;
  patientId: string;
  organisationId: string;
  alerts: Record<string, unknown>[];
  createdAt: unknown;
};

export async function recordAlertSnapshot(args: {
  organisationId: string;
  patientId: string;
  alerts: Alert[];
}): Promise<void> {
  const organisationId = String(args.organisationId ?? "").trim();
  const patientId = String(args.patientId ?? "").trim();
  if (!organisationId || !patientId) return;

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const list = Array.isArray(args.alerts) ? args.alerts : [];
  if (list.length === 0) return;

  await addDoc(collection(db, ALERTS_HISTORY_COLLECTION), {
    organisationId,
    patientId,
    alerts: list.map(alertToPlain),
    createdAt: serverTimestamp(),
  });
}

function mapSnap(id: string, x: Record<string, unknown>): AlertSnapshotRow {
  const raw = x.alerts;
  const alerts = Array.isArray(raw)
    ? (raw as Record<string, unknown>[]).filter((r) => r && typeof r === "object")
    : [];
  return {
    id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    alerts,
    createdAt: x.createdAt ?? null,
  };
}

/** Recent alert snapshots for dashboard (newest first). */
export async function listRecentAlertSnapshots(
  organisationId: string,
  { limitCount = 25 } = {}
): Promise<AlertSnapshotRow[]> {
  const org = String(organisationId ?? "").trim();
  if (!org) return [];

  const { organisationId: ctxOrg } = await getUserContext();
  if (!ctxOrg || ctxOrg !== org) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }

  const cap = Math.min(100, Math.max(5, limitCount));
  const q = query(
    collection(db, ALERTS_HISTORY_COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(cap)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((d) => mapSnap(d.id, (d.data() ?? {}) as Record<string, unknown>));
}
