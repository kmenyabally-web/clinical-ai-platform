/**
 * Shared data load for Weekly / Monthly patient MDT windows (notes, obs, incidents, structured disciplines).
 */

import { fetchClinicalNotesForPatient } from "./noteService";
import { groupNotesByDiscipline } from "../utils/mdtNoteGrouping.js";
import { getNursingObservationsForPatient } from "./nursingObservationsService";
import { fetchIncidentsForPatient } from "./incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "./behaviourService";
import { getABCLogsForPatient } from "./abcService";
import { getLatestFormulationForPatient } from "./formulationService";
import {
  getPsychologyData,
  getPsychiatryData,
  getOTData,
  getSALTData,
} from "./structuredDisciplineServices";
import type { NursingObservation } from "../models/nursingModel";
import type { ABCEntry } from "../models/abcModel";
import type { PsychologyTrackingRecord } from "../models/psychologyModel";
import type { PsychiatryRecord } from "../models/psychiatryModel";
import type { OTRecord } from "../models/otModel";
import type { SALTRecord } from "../models/saltModel";

function noteToMillis(n: unknown): number {
  if (!n || typeof n !== "object") return 0;
  const x = n as Record<string, unknown>;
  const ca = x.createdAt;
  if (ca && typeof ca === "object" && ca !== null && "toMillis" in ca && typeof (ca as { toMillis: () => number }).toMillis === "function") {
    try {
      return (ca as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (ca && typeof ca === "object" && ca !== null && "seconds" in ca && typeof (ca as { seconds: number }).seconds === "number") {
    return (ca as { seconds: number }).seconds * 1000;
  }
  return 0;
}

function millisFromFirestoreOrDate(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && typeof (v as { toMillis?: () => number }).toMillis === "function") {
    try {
      return (v as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (v instanceof Date) return v.getTime();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function filterByDays<T>(items: T[], getMillis: (x: T) => number, daysBack: number): T[] {
  const start = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  return (items ?? []).filter((x) => {
    const t = getMillis(x);
    return t >= start;
  });
}

export type PatientPeriodMdtLoadResult = {
  daysBack: 7 | 30;
  grouped: ReturnType<typeof groupNotesByDiscipline>;
  nursingObs: NursingObservation[];
  incidents: unknown[];
  abcFiltered: ABCEntry[];
  behaviours: unknown[];
  formulation: unknown;
  psychologyRec: PsychologyTrackingRecord | null;
  psychiatryRec: PsychiatryRecord | null;
  otRec: OTRecord | null;
  saltRec: SALTRecord | null;
};

/**
 * Load and scope patient data for a 7- or 30-day reporting window.
 */
export async function loadPatientPeriodMdtData(
  _organisationId: string,
  patientId: string,
  daysBack: 7 | 30
): Promise<PatientPeriodMdtLoadResult> {
  const pid = String(patientId ?? "").trim();

  const emptyGrouped = groupNotesByDiscipline([]);
  const empty: PatientPeriodMdtLoadResult = {
    daysBack,
    grouped: emptyGrouped,
    nursingObs: [],
    incidents: [],
    abcFiltered: [],
    behaviours: [],
    formulation: null,
    psychologyRec: null,
    psychiatryRec: null,
    otRec: null,
    saltRec: null,
  };

  if (!pid) return empty;

  const [
    allNotes,
    nursingObsAll,
    incidentsAll,
    behavioursAll,
    abcAll,
    formulation,
    psychologyRec,
    psychiatryRec,
    otRec,
    saltRec,
  ] = await Promise.all([
    fetchClinicalNotesForPatient(pid, { limitCount: 100 }).catch(() => []),
    getNursingObservationsForPatient(pid, { limitCount: 50 }).catch(() => []),
    fetchIncidentsForPatient(pid, { limitCount: 100 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 100 }).catch(() => []),
    getABCLogsForPatient(pid, { limitCount: 100 }).catch(() => []),
    getLatestFormulationForPatient(pid).catch(() => null),
    getPsychologyData(pid).catch(() => null),
    getPsychiatryData(pid).catch(() => null),
    getOTData(pid).catch(() => null),
    getSALTData(pid).catch(() => null),
  ]);

  let notes = filterByDays(Array.isArray(allNotes) ? allNotes : [], noteToMillis, daysBack);
  if (!notes.length && Array.isArray(allNotes) && allNotes.length) {
    notes = allNotes;
  }

  const nursingObs = filterByDays(
    Array.isArray(nursingObsAll) ? nursingObsAll : [],
    (o) => millisFromFirestoreOrDate(o.createdAt),
    daysBack
  );
  const incidents = filterByDays(Array.isArray(incidentsAll) ? incidentsAll : [], (row) => {
    const x = row as { occurredAt?: unknown; createdAt?: unknown; reportedAt?: unknown };
    return Math.max(
      millisFromFirestoreOrDate(x.occurredAt),
      millisFromFirestoreOrDate(x.createdAt),
      millisFromFirestoreOrDate(x.reportedAt)
    );
  }, daysBack);
  const abcFiltered = filterByDays(Array.isArray(abcAll) ? abcAll : [], (e) => millisFromFirestoreOrDate(e.createdAt), daysBack);
  const behaviours = filterByDays(Array.isArray(behavioursAll) ? behavioursAll : [], (row) => {
    const x = row as { clinicalTime?: string; createdAt?: unknown };
    const t = x.clinicalTime ? new Date(x.clinicalTime).getTime() : millisFromFirestoreOrDate(x.createdAt);
    return Number.isNaN(t) ? 0 : t;
  }, daysBack);

  return {
    daysBack,
    grouped: groupNotesByDiscipline(notes),
    nursingObs,
    incidents,
    abcFiltered,
    behaviours,
    formulation,
    psychologyRec,
    psychiatryRec,
    otRec,
    saltRec,
  };
}
