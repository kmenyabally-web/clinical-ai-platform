/**
 * Batched risk, alert, and nursing data for ward dashboard (chunked `in` queries).
 */

import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import { RISK_SCORES_COLLECTION, type RiskScoreSnapshotRow } from "./riskScoreHistoryService";
import { ALERTS_HISTORY_COLLECTION, parseStoredAlerts, type AlertSnapshotRow } from "./alertHistoryService";
import { NURSING_OBSERVATIONS_COLLECTION, mapNursingDoc } from "./nursingObservationsService";
import type { NursingObservation } from "../models/nursingModel";
import type { Alert } from "../models/alertModel";

export const WARD_DASHBOARD_IN_CHUNK = 30;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function createdAtMillis(ca: unknown): number {
  if (ca == null) return 0;
  if (typeof ca === "object" && typeof (ca as { toMillis?: () => number }).toMillis === "function") {
    try {
      return (ca as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  const d = new Date(ca as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function mapRiskRow(id: string, x: Record<string, unknown>): RiskScoreSnapshotRow {
  return {
    id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    overallRisk: typeof x.overallRisk === "string" ? x.overallRisk : "",
    score: typeof x.score === "number" ? x.score : Number(x.score) || 0,
    trend: typeof x.trend === "string" ? x.trend : "",
    drivers: Array.isArray(x.drivers) ? (x.drivers as string[]).filter((d) => typeof d === "string") : [],
    behaviourRisk: typeof x.behaviourRisk === "number" ? x.behaviourRisk : 0,
    incidentRisk: typeof x.incidentRisk === "number" ? x.incidentRisk : 0,
    clinicalRisk: typeof x.clinicalRisk === "number" ? x.clinicalRisk : 0,
    createdAt: x.createdAt ?? null,
  };
}

function mapAlertRow(id: string, x: Record<string, unknown>): AlertSnapshotRow {
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

async function latestRiskMap(organisationId: string, patientIds: string[]): Promise<Map<string, RiskScoreSnapshotRow>> {
  const map = new Map<string, RiskScoreSnapshotRow>();
  const org = String(organisationId ?? "").trim();
  const ids = [...new Set(patientIds.map((p) => String(p ?? "").trim()).filter(Boolean))];
  const parts = chunk(ids, WARD_DASHBOARD_IN_CHUNK);
  await Promise.all(
    parts.map(async (group) => {
      if (group.length === 0) return;
      const q = query(
        collection(db, RISK_SCORES_COLLECTION),
        where("organisationId", "==", org),
        where("patientId", "in", group),
        orderBy("createdAt", "desc"),
        limit(300)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const row = mapRiskRow(d.id, (d.data() ?? {}) as Record<string, unknown>);
        if (!row.patientId) continue;
        if (!map.has(row.patientId)) map.set(row.patientId, row);
      }
    })
  );
  return map;
}

async function latestAlertSnapshotMap(
  organisationId: string,
  patientIds: string[]
): Promise<Map<string, AlertSnapshotRow>> {
  const map = new Map<string, AlertSnapshotRow>();
  const org = String(organisationId ?? "").trim();
  const ids = [...new Set(patientIds.map((p) => String(p ?? "").trim()).filter(Boolean))];
  const parts = chunk(ids, WARD_DASHBOARD_IN_CHUNK);
  await Promise.all(
    parts.map(async (group) => {
      if (group.length === 0) return;
      const q = query(
        collection(db, ALERTS_HISTORY_COLLECTION),
        where("organisationId", "==", org),
        where("patientId", "in", group),
        orderBy("createdAt", "desc"),
        limit(300)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const row = mapAlertRow(d.id, (d.data() ?? {}) as Record<string, unknown>);
        if (!row.patientId) continue;
        if (!map.has(row.patientId)) map.set(row.patientId, row);
      }
    })
  );
  return map;
}

async function latestNursingMap(
  organisationId: string,
  patientIds: string[]
): Promise<Map<string, NursingObservation>> {
  const map = new Map<string, NursingObservation>();
  const org = String(organisationId ?? "").trim();
  const ids = [...new Set(patientIds.map((p) => String(p ?? "").trim()).filter(Boolean))];
  const parts = chunk(ids, WARD_DASHBOARD_IN_CHUNK);
  await Promise.all(
    parts.map(async (group) => {
      if (group.length === 0) return;
      const q = query(
        collection(db, NURSING_OBSERVATIONS_COLLECTION),
        where("organisationId", "==", org),
        where("patientId", "in", group),
        orderBy("createdAt", "desc"),
        limit(400)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const row = mapNursingDoc(d);
        if (!row.patientId) continue;
        if (!map.has(row.patientId)) map.set(row.patientId, row);
      }
    })
  );
  return map;
}

const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortAlertsForDisplay(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

function nursingSummaryLine(n: NursingObservation): string {
  const parts = [
    n.observationLevel ? `Obs: ${n.observationLevel}` : "",
    n.riskLevel ? `Risk: ${n.riskLevel}` : "",
  ].filter(Boolean);
  const tail = (n.physicalHealth || n.notes || "").trim().slice(0, 72);
  if (tail) parts.push(tail + (tail.length >= 72 ? "…" : ""));
  return parts.join(" · ") || "Nursing observation recorded";
}

export type WardDashboardPatientRow = {
  patientId: string;
  displayName: string;
  wardId: string;
  wardName: string;
  hospitalId: string;
  overallRisk: "high" | "medium" | "low" | "unknown";
  trend: "improving" | "stable" | "deteriorating" | "unknown";
  /** Numeric aggregate from latest risk snapshot (behaviour + incident + clinical). */
  aggregateScore: number;
  drivers: string[];
  /** Up to 2 alerts after role filtering (caller may pass pre-filtered). */
  topAlerts: Alert[];
  allAlerts: Alert[];
  lastUpdatedMs: number;
  nursingSummary: string | null;
  nursingAtMs: number;
};

export const ALERT_TYPE_LABEL: Record<string, string> = {
  behaviour_escalation: "Behaviour escalation",
  medication_non_compliance: "Medication issue",
  dysphagia_risk: "Swallowing risk",
  functional_decline: "Functional decline",
  incident: "Incident",
  psychological_trigger: "Psychological triggers",
  psychiatric_clinical_risk: "Psychiatric clinical risk",
};

/**
 * Single batched load: parallel chunk queries for risk, alerts, nursing — then merge per patient.
 */
export async function fetchWardDashboardRows(
  organisationId: string,
  patients: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    wardId?: string;
    wardName?: string;
    hospitalId?: string;
  }[]
): Promise<WardDashboardPatientRow[]> {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const { organisationId: ctxOrg } = await getUserContext();
  if (!ctxOrg || ctxOrg !== org) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ids = patients.map((p) => String(p.id ?? "").trim()).filter(Boolean);
  if (ids.length === 0) return [];

  const [riskMap, alertMap, nursingMap] = await Promise.all([
    latestRiskMap(org, ids),
    latestAlertSnapshotMap(org, ids),
    latestNursingMap(org, ids),
  ]);

  const rows: WardDashboardPatientRow[] = [];

  for (const p of patients) {
    const patientId = String(p.id ?? "").trim();
    if (!patientId) continue;

    const displayName =
      (p.name && String(p.name).trim()) ||
      `${String(p.firstName ?? "").trim()} ${String(p.lastName ?? "").trim()}`.trim() ||
      patientId;

    const risk = riskMap.get(patientId);
    const rawRisk = String(risk?.overallRisk ?? "").toLowerCase();
    const overallRisk: WardDashboardPatientRow["overallRisk"] =
      rawRisk === "high" || rawRisk === "medium" || rawRisk === "low" ? rawRisk : "unknown";

    const rawTrend = String(risk?.trend ?? "").toLowerCase();
    const trend: WardDashboardPatientRow["trend"] =
      rawTrend === "improving" || rawTrend === "stable" || rawTrend === "deteriorating" ? rawTrend : "unknown";

    const drivers = Array.isArray(risk?.drivers) ? risk.drivers : [];

    const snap = alertMap.get(patientId);
    const allAlerts = snap ? sortAlertsForDisplay(parseStoredAlerts(patientId, snap.alerts)) : [];

    const n = nursingMap.get(patientId);
    const nursingSummary = n ? nursingSummaryLine(n) : null;

    const tRisk = risk ? createdAtMillis(risk.createdAt) : 0;
    const tAlert = snap ? createdAtMillis(snap.createdAt) : 0;
    const tNurse = n ? createdAtMillis(n.createdAt) : 0;
    const lastUpdatedMs = Math.max(tRisk, tAlert, tNurse);

    rows.push({
      patientId,
      displayName,
      wardId: String(p.wardId ?? ""),
      wardName: String(p.wardName ?? ""),
      hospitalId: String(p.hospitalId ?? ""),
      overallRisk,
      trend,
      aggregateScore: typeof risk?.score === "number" ? risk.score : Number(risk?.score) || 0,
      drivers,
      topAlerts: allAlerts.slice(0, 2),
      allAlerts,
      lastUpdatedMs,
      nursingSummary,
      nursingAtMs: tNurse,
    });
  }

  return rows;
}

export function riskSortRank(r: WardDashboardPatientRow["overallRisk"]): number {
  if (r === "high") return 0;
  if (r === "medium") return 1;
  if (r === "low") return 2;
  return 3;
}

export function sortWardRowsByRisk(rows: WardDashboardPatientRow[]): WardDashboardPatientRow[] {
  return [...rows].sort((a, b) => {
    const d = riskSortRank(a.overallRisk) - riskSortRank(b.overallRisk);
    if (d !== 0) return d;
    return b.lastUpdatedMs - a.lastUpdatedMs;
  });
}
