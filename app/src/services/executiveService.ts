/**
 * Organisation-level executive overview — batched patient risk/alert aggregation (no per-patient sequential fetches).
 */

import { getUserContext } from "./authService";
import { GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import { listHospitals, listWards } from "./structureService.js";
import { listPatientMetadata } from "./patientService.js";
import {
  fetchWardDashboardRows,
  type WardDashboardPatientRow,
  ALERT_TYPE_LABEL,
} from "./wardDashboardDataService";
import type { Alert } from "../models/alertModel";

export type ExecutiveWard = {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName: string;
};

export type ExecutivePatient = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  wardId: string;
  wardName: string;
  hospitalName: string;
};

export type ExecutiveRiskRow = {
  patientId: string;
  overallRisk: string;
  trend: string;
  score: number;
  drivers: string[];
};

export type ExecutiveAlertRow = {
  patientId: string;
  alertCount: number;
  alerts: Alert[];
};

export type ExecutiveKpis = {
  totalPatients: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  unknownRisk: number;
  /** Patients with ≥1 alert on latest snapshot. */
  activeAlertPatients: number;
  /** Total alert instances (latest snapshot per patient). */
  totalAlertInstances: number;
};

export type ExecutiveWardPerformance = {
  wardId: string;
  wardName: string;
  hospitalId: string;
  totalPatients: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  alertsCount: number;
  trend: "improving" | "stable" | "deteriorating";
  improvingCount: number;
  deterioratingCount: number;
  stableCount: number;
  complianceScore: number;
};

export type ExecutiveHighRiskWard = {
  wardId: string;
  wardName: string;
  hospitalId: string;
  highRiskPatientCount: number;
  mainIssue: string;
};

export type ExecutiveTopPatient = {
  patientId: string;
  displayName: string;
  wardName: string;
  hospitalId: string;
  aggregateScore: number;
  overallRisk: string;
  drivers: string[];
};

export type OrganisationOverviewOptions = {
  hospitalId?: string | null;
  wardId?: string | null;
};

export type OrganisationOverview = {
  wards: ExecutiveWard[];
  hospitals: { id: string; name: string }[];
  patients: ExecutivePatient[];
  risks: ExecutiveRiskRow[];
  alerts: ExecutiveAlertRow[];
  kpis: ExecutiveKpis;
  riskDistribution: { high: number; medium: number; low: number; unknown: number };
  wardPerformance: ExecutiveWardPerformance[];
  highRiskWards: ExecutiveHighRiskWard[];
  alertGroups: Record<string, number>;
  topRiskPatients: ExecutiveTopPatient[];
  improvingWards: { wardId: string; wardName: string; hospitalId: string }[];
  deterioratingWards: { wardId: string; wardName: string; hospitalId: string }[];
  /** Full merged rows (for advanced UI / filters). */
  patientRows: WardDashboardPatientRow[];
};

function normRisk(r: string): "high" | "medium" | "low" | "unknown" {
  const x = String(r ?? "").toLowerCase();
  if (x === "high" || x === "medium" || x === "low") return x;
  return "unknown";
}

function wardTrendFromCounts(improving: number, deteriorating: number, stable: number): "improving" | "stable" | "deteriorating" {
  if (deteriorating > improving && deteriorating >= stable) return "deteriorating";
  if (improving > deteriorating && improving >= stable) return "improving";
  return "stable";
}

function wardComplianceScoreFromSignals(args: {
  totalPatients: number;
  highRiskCount: number;
  alertsCount: number;
  improvingCount: number;
  deterioratingCount: number;
}): number {
  const { totalPatients, highRiskCount, alertsCount, improvingCount, deterioratingCount } = args;
  const denominator = Math.max(totalPatients, 1);
  const highRiskRatio = highRiskCount / denominator;
  const alertRatio = alertsCount / denominator;
  let score = 100;
  score -= Math.round(highRiskRatio * 45);
  score -= Math.round(alertRatio * 25);
  score -= Math.min(15, deterioratingCount * 5);
  score += Math.min(10, improvingCount * 3);
  return Math.max(0, Math.min(100, score));
}

function mainIssueForWard(rows: WardDashboardPatientRow[]): string {
  const high = rows.filter((r) => r.overallRisk === "high");
  const counts = new Map<string, number>();
  for (const r of high) {
    for (const a of r.allAlerts) {
      const k = a.type || "other";
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  let best = "";
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  if (!best) {
    const d = high.flatMap((r) => r.drivers);
    return d[0] ?? "Clinical review recommended";
  }
  return ALERT_TYPE_LABEL[best] || best.replace(/_/g, " ");
}

/**
 * Recompute KPIs, ward performance, charts, and lists from a patient row set (e.g. after client-side risk filter).
 */
export function aggregateOrganisationOverview(
  wards: ExecutiveWard[],
  hospitals: { id: string; name: string }[],
  patientRows: WardDashboardPatientRow[]
): OrganisationOverview {
  const hospitalNameById = new Map(hospitals.map((h) => [h.id, h.name || ""]));

  const patients: ExecutivePatient[] = patientRows.map((r) => ({
    id: r.patientId,
    name: r.displayName,
    firstName: "",
    lastName: "",
    hospitalId: r.hospitalId || "",
    wardId: r.wardId || "",
    wardName: r.wardName || "",
    hospitalName: hospitalNameById.get(r.hospitalId) ?? "",
  }));

  const risks: ExecutiveRiskRow[] = patientRows.map((r) => ({
    patientId: r.patientId,
    overallRisk: r.overallRisk,
    trend: r.trend,
    score: r.aggregateScore,
    drivers: r.drivers,
  }));

  const alerts: ExecutiveAlertRow[] = patientRows.map((r) => ({
    patientId: r.patientId,
    alertCount: r.allAlerts.length,
    alerts: r.allAlerts,
  }));

  const riskDistribution = { high: 0, medium: 0, low: 0, unknown: 0 };
  let activeAlertPatients = 0;
  let totalAlertInstances = 0;
  const alertGroups: Record<string, number> = {
    behaviour_escalation: 0,
    medication_non_compliance: 0,
    dysphagia_risk: 0,
    functional_decline: 0,
  };

  for (const r of patientRows) {
    const lv = normRisk(r.overallRisk);
    riskDistribution[lv] += 1;
    if (r.allAlerts.length > 0) activeAlertPatients += 1;
    totalAlertInstances += r.allAlerts.length;
    for (const a of r.allAlerts) {
      const t = String(a.type ?? "other");
      alertGroups[t] = (alertGroups[t] ?? 0) + 1;
    }
  }

  const kpis: ExecutiveKpis = {
    totalPatients: patientRows.length,
    highRisk: riskDistribution.high,
    mediumRisk: riskDistribution.medium,
    lowRisk: riskDistribution.low,
    unknownRisk: riskDistribution.unknown,
    activeAlertPatients,
    totalAlertInstances,
  };

  const wardIds = [...new Set(wards.map((w) => w.id))];
  const wardPerformance: ExecutiveWardPerformance[] = wardIds.map((wid) => {
    const w = wards.find((x) => x.id === wid);
    const inWard = patientRows.filter((r) => r.wardId === wid);
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    let improvingCount = 0;
    let deterioratingCount = 0;
    let stableCount = 0;
    let alertsCount = 0;
    for (const r of inWard) {
      const lv = normRisk(r.overallRisk);
      if (lv === "high") highRiskCount += 1;
      else if (lv === "medium") mediumRiskCount += 1;
      else if (lv === "low") lowRiskCount += 1;
      alertsCount += r.allAlerts.length;
      if (r.trend === "improving") improvingCount += 1;
      else if (r.trend === "deteriorating") deterioratingCount += 1;
      else stableCount += 1;
    }
    const trend = wardTrendFromCounts(improvingCount, deterioratingCount, stableCount);
    const complianceScore = wardComplianceScoreFromSignals({
      totalPatients: inWard.length,
      highRiskCount,
      alertsCount,
      improvingCount,
      deterioratingCount,
    });
    return {
      wardId: wid,
      wardName: w?.name || wid,
      hospitalId: w?.hospitalId || "",
      totalPatients: inWard.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      alertsCount,
      trend,
      improvingCount,
      deterioratingCount,
      stableCount,
      complianceScore,
    };
  });

  wardPerformance.sort((a, b) => b.highRiskCount - a.highRiskCount || b.alertsCount - a.alertsCount);

  const highRiskWards: ExecutiveHighRiskWard[] = wardPerformance
    .filter((w) => w.highRiskCount > 0)
    .map((w) => {
      const inWard = patientRows.filter((r) => r.wardId === w.wardId);
      return {
        wardId: w.wardId,
        wardName: w.wardName,
        hospitalId: w.hospitalId,
        highRiskPatientCount: w.highRiskCount,
        mainIssue: mainIssueForWard(inWard),
      };
    })
    .sort((a, b) => b.highRiskPatientCount - a.highRiskPatientCount);

  const topRiskPatients: ExecutiveTopPatient[] = [...patientRows]
    .sort((a, b) => b.aggregateScore - a.aggregateScore)
    .slice(0, 5)
    .map((r) => ({
      patientId: r.patientId,
      displayName: r.displayName,
      wardName: r.wardName || "—",
      hospitalId: r.hospitalId || "",
      aggregateScore: r.aggregateScore,
      overallRisk: r.overallRisk,
      drivers: r.drivers.slice(0, 3),
    }));

  const improvingWards = wardPerformance
    .filter((w) => w.trend === "improving" && w.totalPatients > 0)
    .map((w) => ({ wardId: w.wardId, wardName: w.wardName, hospitalId: w.hospitalId }));

  const deterioratingWards = wardPerformance
    .filter((w) => w.trend === "deteriorating" && w.totalPatients > 0)
    .map((w) => ({ wardId: w.wardId, wardName: w.wardName, hospitalId: w.hospitalId }));

  return {
    wards,
    hospitals,
    patients,
    risks,
    alerts,
    kpis,
    riskDistribution,
    wardPerformance,
    highRiskWards,
    alertGroups,
    topRiskPatients,
    improvingWards,
    deterioratingWards,
    patientRows,
  };
}

/**
 * Load hospitals, wards, scoped patients, then one batched risk/alert merge via {@link fetchWardDashboardRows}.
 */
export async function getOrganisationOverview(
  orgId: string,
  options: OrganisationOverviewOptions = {}
): Promise<OrganisationOverview> {
  const org = String(orgId ?? "").trim();
  if (!org) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const { organisationId: ctxOrg } = await getUserContext();
  if (!ctxOrg || ctxOrg !== org) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const hospitalFilter = String(options.hospitalId ?? "").trim();
  const wardFilter = String(options.wardId ?? "").trim();

  const hospitals = await listHospitals(org);
  const hList = Array.isArray(hospitals) ? hospitals : [];

  const wardLists = await Promise.all(
    hList.map(async (h) => {
      const w = await listWards(org, h.id);
      return (Array.isArray(w) ? w : []).map((x) => ({
        id: x.id,
        name: typeof x.name === "string" ? x.name : "",
        hospitalId: h.id,
        hospitalName: typeof h.name === "string" ? h.name : "",
      }));
    })
  );
  const wards: ExecutiveWard[] = wardLists.flat();

  let rawPatients = await listPatientMetadata(
    hospitalFilter ? { hospitalId: hospitalFilter, wardId: wardFilter || undefined } : { allInOrganisation: true }
  );
  const pr = Array.isArray(rawPatients) ? rawPatients : [];

  let patients: ExecutivePatient[] = pr.map((p) => ({
    id: p.id,
    name: p.name || "",
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    hospitalId: p.hospitalId || "",
    wardId: p.wardId || "",
    wardName: p.wardName || "",
    hospitalName: p.hospitalName || "",
  }));

  if (hospitalFilter && wardFilter) {
    patients = patients.filter((p) => p.wardId === wardFilter);
  } else if (!hospitalFilter && wardFilter) {
    patients = patients.filter((p) => p.wardId === wardFilter);
  }

  const patientRows = patients.length === 0 ? [] : await fetchWardDashboardRows(org, patients);

  const hospitalsNorm = hList.map((h) => ({ id: h.id, name: h.name || "" }));
  return aggregateOrganisationOverview(wards, hospitalsNorm, patientRows);
}
