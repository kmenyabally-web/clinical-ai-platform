/**
 * V1 early warning engine: multi-disciplinary alerts from structured clinical data.
 */

import type { Alert, AlertSeverity, AlertSource } from "../models/alertModel";
import { normalizeUserDiscipline } from "../utils/reportDiscipline";
import { getABCLogsForPatient } from "./abcService";
import { fetchIncidentsForPatient } from "./incidentService";
import { getNursingObservationsForPatient } from "./nursingObservationsService";
import { getLatestFormulationForPatient } from "./formulationService";
import { getPatientById } from "./patientService";
import { listPhysicalObservationsForPatient } from "./physicalObservationsService";
import {
  getLatestOTStructuredForPatient,
  getLatestPsychiatryStructuredForPatient,
  getLatestSALTStructuredForPatient,
} from "./structuredDisciplineServices";
import {
  nursingAdlDeclineFromObs,
  nursingMedicationNonCompliant,
  nursingObservationText,
  readOTIndependenceLow,
  readPsychiatryMedicationNonCompliance,
  readPsychiatryRiskLevel,
  readSaltSwallowRisk,
} from "../utils/structuredClinicalSignals";

export type EarlyWarningEngineInput = {
  patientId?: string;
  abcLogs?: unknown[] | null;
  incidents?: unknown[] | null;
  nursingObs?: unknown[] | null;
  formulation?: unknown | null;
  physicalHealth?: unknown[] | null;
  medications?: unknown[] | null;
  psychiatry?: { medicationNonCompliance?: boolean } | null;
  ot?: { adlDecline?: boolean } | null;
  salt?: { swallowRisk?: string | null } | null;
  /** Latest structured discipline documents (V2). */
  psychiatryStructured?: unknown | null;
  otStructured?: unknown | null;
  saltStructured?: unknown | null;
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function newAlertId(patientId: string, type: string, index: number, t: number): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${patientId}:${type}:${index}:${t}`;
}

function hasPrecipitatingFactors(formulation: unknown | null | undefined): boolean {
  if (formulation == null || typeof formulation !== "object") return false;
  const p = (formulation as Record<string, unknown>).precipitatingFactors;
  if (typeof p === "string") return p.trim().length > 0;
  if (p != null && typeof p === "object" && !Array.isArray(p)) return Object.keys(p as object).length > 0;
  if (Array.isArray(p)) return p.length > 0;
  return Boolean(p);
}

export function inferDisciplineSignals(input: {
  nursingObs?: unknown[] | null;
  physicalHealth?: unknown[] | null;
  medications?: unknown[] | null;
}): {
  psychiatry: { medicationNonCompliance: boolean };
  ot: { adlDecline: boolean };
  salt: { swallowRisk: string | null };
} {
  const nursing = Array.isArray(input.nursingObs) ? input.nursingObs : [];
  const negMed = /non[\s-]?compli|poor|refus|declin|miss|spit|partial|inconsistent|variable|withheld|refusing/i;
  const posMed = /^(good|full|adequate|compliant|excellent|appropriate|yes)/i;

  const medicationNonCompliance = nursing.some((n) => {
    if (nursingMedicationNonCompliant(n)) return true;
    const s = String((n as Record<string, unknown>)?.medicationAdherence ?? "").trim();
    if (!s) return false;
    if (posMed.test(s) && !negMed.test(s)) return false;
    return negMed.test(s);
  });

  const meds = Array.isArray(input.medications) ? input.medications : [];
  const medObjFlag = meds.some((m) => {
    if (!m || typeof m !== "object") return false;
    const o = m as Record<string, unknown>;
    if (o.nonCompliance === true || o.medicationNonCompliance === true) return true;
    const c = String(o.compliance ?? o.adherence ?? o.status ?? "").trim();
    if (!c) return false;
    if (posMed.test(c) && !negMed.test(c)) return false;
    return negMed.test(c);
  });

  const adlDecline = nursing.some((n) => nursingAdlDeclineFromObs(n));

  const phys = Array.isArray(input.physicalHealth) ? input.physicalHealth : [];
  const noteBlob = [
    ...nursing.map((n) => nursingObservationText(n)),
    ...phys.map((p) => String((p as Record<string, unknown>)?.notes ?? "")),
  ]
    .join(" ")
    .toLowerCase();

  const swallowHigh =
    /\b(dysphagia|aspiration\s*risk|high\s*swallow|texture\s*modified|iddsi|thickened\s*(fluid|liquids)|nil\s*by\s*mouth|\bnbm\b|unsafe\s*swallow)\b/i.test(
      noteBlob
    );

  return {
    psychiatry: { medicationNonCompliance: medicationNonCompliance || medObjFlag },
    ot: { adlDecline },
    salt: { swallowRisk: swallowHigh ? "high" : null },
  };
}

type AlertDraft = Omit<Alert, "id" | "patientId" | "createdAt">;

/**
 * Core rules from spec (discipline objects may be inferred by {@link inferDisciplineSignals}).
 */
export function generateAlertDrafts(data: {
  abcLogs?: unknown[] | null;
  incidents?: unknown[] | null;
  formulation?: unknown | null;
  psychiatry?: { medicationNonCompliance?: boolean } | null;
  psychiatryRiskHigh?: boolean;
  ot?: { adlDecline?: boolean } | null;
  salt?: { swallowRisk?: string | null } | null;
}): AlertDraft[] {
  const alerts: AlertDraft[] = [];
  const abc = Array.isArray(data.abcLogs) ? data.abcLogs : [];
  const incidents = Array.isArray(data.incidents) ? data.incidents : [];

  if (abc.length >= 3) {
    alerts.push({
      type: "behaviour_escalation",
      severity: "high",
      message: "Frequent behavioural incidents recorded",
      source: "nursing",
    });
  }

  if (incidents.length > 0) {
    alerts.push({
      type: "incident",
      severity: "high",
      message: "Recent incident reported",
      source: "nursing",
    });
  }

  if (hasPrecipitatingFactors(data.formulation)) {
    alerts.push({
      type: "psychological_trigger",
      severity: "medium",
      message: "Known psychological triggers identified",
      source: "psychology",
    });
  }

  if (data.psychiatry?.medicationNonCompliance) {
    alerts.push({
      type: "medication_non_compliance",
      severity: "high",
      message: "Medication non-compliance detected",
      source: "psychiatry",
    });
  }

  if (data.psychiatryRiskHigh) {
    alerts.push({
      type: "psychiatric_clinical_risk",
      severity: "high",
      message: "High psychiatry structured risk level — review required",
      source: "psychiatry",
    });
  }

  if (data.ot?.adlDecline) {
    alerts.push({
      type: "functional_decline",
      severity: "medium",
      message: "Decline in functional independence",
      source: "ot",
    });
  }

  if (data.salt?.swallowRisk === "high") {
    alerts.push({
      type: "dysphagia_risk",
      severity: "high",
      message: "High swallowing risk — urgent review required",
      source: "salt",
    });
  }

  return alerts;
}

function finalizeDrafts(patientId: string, drafts: AlertDraft[]): Alert[] {
  const pid = String(patientId ?? "").trim() || "unknown";
  const t = Date.now();
  const createdAt = new Date(t);
  return drafts.map((d, i) => ({
    ...d,
    id: newAlertId(pid, d.type, i, t),
    patientId: pid,
    createdAt,
  }));
}

export function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/**
 * Merges optional explicit discipline flags with inferred nursing / physical / medication signals.
 */
export function buildPatientAlerts(patientId: string, input: EarlyWarningEngineInput): Alert[] {
  const inferred = inferDisciplineSignals({
    nursingObs: input.nursingObs,
    physicalHealth: input.physicalHealth,
    medications: input.medications,
  });

  const psychMedBase =
    input.psychiatry && typeof input.psychiatry.medicationNonCompliance === "boolean"
      ? input.psychiatry.medicationNonCompliance
      : inferred.psychiatry.medicationNonCompliance;
  const psychiatry = {
    medicationNonCompliance: readPsychiatryMedicationNonCompliance(input.psychiatryStructured, psychMedBase),
  };

  const psychiatryRiskHigh = readPsychiatryRiskLevel(input.psychiatryStructured) === "high";

  const ot = {
    adlDecline:
      (input.ot && typeof input.ot.adlDecline === "boolean" ? input.ot.adlDecline : inferred.ot.adlDecline) ||
      readOTIndependenceLow(input.otStructured),
  };

  const structuredSwallow = readSaltSwallowRisk(input.saltStructured);
  const saltSwallow =
    structuredSwallow === "high"
      ? "high"
      : input.salt && input.salt.swallowRisk != null && String(input.salt.swallowRisk).trim() !== ""
        ? String(input.salt.swallowRisk).trim()
        : inferred.salt.swallowRisk;

  const salt = { swallowRisk: saltSwallow };

  const drafts = generateAlertDrafts({
    abcLogs: input.abcLogs,
    incidents: input.incidents,
    formulation: input.formulation,
    psychiatry,
    psychiatryRiskHigh,
    ot,
    salt,
  });

  return sortAlertsBySeverity(finalizeDrafts(patientId, drafts));
}

/** Spec-shaped entry point: returns full {@link Alert} rows (ids + timestamps applied). */
export function generateAlerts(data: EarlyWarningEngineInput & { patientId: string }): Alert[] {
  return buildPatientAlerts(data.patientId, data);
}

export function userSeesAllAlerts(ctx: {
  mdtRole: string | null | undefined;
  role: string | null | undefined;
  enterpriseRoleCode?: string | null | undefined;
}): boolean {
  const ec = String(ctx.enterpriseRoleCode ?? "").toUpperCase();
  if (ec === "ADMIN" || ec === "MANAGER") return true;

  const m = `${ctx.mdtRole ?? ""} ${ctx.role ?? ""}`.toLowerCase();
  if (/\bnurse\b|nursing|\bhca\b|care assistant|support worker.*nurse/i.test(m)) return true;
  if (/responsible clinician|\brc\b|registered manager|clinical director|ward manager/i.test(m)) return true;
  if (/psychiatr|consultant.*psychiatr/i.test(m)) return true;

  const r = String(ctx.role ?? "").trim().toLowerCase();
  if (r === "admin" || r.includes("organisation admin") || r === "manager") return true;

  return false;
}

/**
 * Nurses / RC / admins: all alerts. Other disciplines: own specialty + nursing (shared safety).
 */
export function filterAlertsForRole(
  alerts: Alert[],
  ctx: { mdtRole: string | null | undefined; role: string | null | undefined; enterpriseRoleCode?: string | null | undefined }
): Alert[] {
  const list = Array.isArray(alerts) ? alerts : [];
  if (userSeesAllAlerts(ctx)) return list;

  const disc = normalizeUserDiscipline(ctx.mdtRole, ctx.role);
  const allowed = new Set<AlertSource>(["nursing"]);
  if (disc === "psychologist") allowed.add("psychology");
  if (disc === "psychiatrist") allowed.add("psychiatry");
  if (disc === "ot") allowed.add("ot");
  if (disc === "salt") allowed.add("salt");
  if (disc === "doctor") {
    allowed.add("psychiatry");
    allowed.add("nursing");
  }

  return list.filter((a) => allowed.has(a.source));
}

export async function fetchPatientEarlyWarnings(
  organisationId: string,
  patientId: string
): Promise<Alert[]> {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return [];

  const [abcLogs, incidents, nursingObs, formulation, patient, physicalHealth, psychiatryStructured, otStructured, saltStructured] =
    await Promise.all([
      getABCLogsForPatient(pid, { limitCount: 40 }).catch(() => []),
      fetchIncidentsForPatient(pid, { limitCount: 35 }).catch(() => []),
      getNursingObservationsForPatient(pid, { limitCount: 40 }).catch(() => []),
      getLatestFormulationForPatient(pid).catch(() => null),
      getPatientById(pid).catch(() => null),
      listPhysicalObservationsForPatient(org, pid, { limitCount: 25 }).catch(() => []),
      getLatestPsychiatryStructuredForPatient(pid).catch(() => null),
      getLatestOTStructuredForPatient(pid).catch(() => null),
      getLatestSALTStructuredForPatient(pid).catch(() => null),
    ]);

  const medications = patient && typeof patient === "object" && Array.isArray((patient as { medications?: unknown[] }).medications)
    ? (patient as { medications: unknown[] }).medications
    : [];

  return buildPatientAlerts(pid, {
    abcLogs: Array.isArray(abcLogs) ? abcLogs : [],
    incidents: Array.isArray(incidents) ? incidents : [],
    nursingObs: Array.isArray(nursingObs) ? nursingObs : [],
    formulation,
    physicalHealth: Array.isArray(physicalHealth) ? physicalHealth : [],
    medications,
    psychiatryStructured,
    otStructured,
    saltStructured,
  });
}
