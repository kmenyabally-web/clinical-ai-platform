/**
 * Persist aggregate risk snapshots to `risk_scores` for audit and dashboard trends.
 */

import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { assertSameOrganisationData, GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import type { RiskScore } from "../models/riskModel";

export const RISK_SCORES_COLLECTION = "risk_scores";

export type RiskScoreSnapshotRow = {
  id: string;
  patientId: string;
  organisationId: string;
  overallRisk: string;
  score: number;
  trend: string;
  drivers: string[];
  behaviourRisk: number;
  incidentRisk: number;
  clinicalRisk: number;
  createdAt: unknown;
};

export async function recordRiskScoreSnapshot(args: {
  organisationId: string;
  patientId: string;
  risk: RiskScore;
}): Promise<void> {
  const organisationId = String(args.organisationId ?? "").trim();
  const patientId = String(args.patientId ?? "").trim();
  if (!organisationId || !patientId) return;

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const r = args.risk;
  const score = r.behaviourRisk + r.incidentRisk + r.clinicalRisk;

  await addDoc(collection(db, RISK_SCORES_COLLECTION), {
    organisationId,
    patientId,
    overallRisk: r.overallRisk,
    score,
    trend: r.trend,
    drivers: Array.isArray(r.riskDrivers) ? r.riskDrivers : [],
    behaviourRisk: r.behaviourRisk,
    incidentRisk: r.incidentRisk,
    clinicalRisk: r.clinicalRisk,
    createdAt: serverTimestamp(),
  });
}

function mapSnap(id: string, x: Record<string, unknown>): RiskScoreSnapshotRow {
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

/** Recent snapshots for dashboard (newest first). */
export async function listRecentRiskScoreSnapshots(
  organisationId: string,
  { limitCount = 25 } = {}
): Promise<RiskScoreSnapshotRow[]> {
  const org = String(organisationId ?? "").trim();
  if (!org) return [];

  const { organisationId: ctxOrg } = await getUserContext();
  if (!ctxOrg || ctxOrg !== org) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }

  const cap = Math.min(100, Math.max(5, limitCount));
  const q = query(
    collection(db, RISK_SCORES_COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(cap)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((d) => mapSnap(d.id, (d.data() ?? {}) as Record<string, unknown>));
}
