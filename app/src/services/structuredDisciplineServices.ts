/**
 * Latest structured MDT discipline records per patient (V2).
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { assertSameOrganisationData, GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import type { PsychologyTrackingRecord } from "../models/psychologyModel";
import type { PsychiatryRecord, PsychiatryMedicationRow, PsychiatryMse } from "../models/psychiatryModel";
import type { OTRecord } from "../models/otModel";
import type { SALTRecord } from "../models/saltModel";

export const PSYCHOLOGY_TRACKING_COLLECTION = "psychology_tracking";
export const PSYCHIATRY_STRUCTURED_COLLECTION = "psychiatry_structured";
export const OT_STRUCTURED_COLLECTION = "ot_structured";
export const SALT_STRUCTURED_COLLECTION = "salt_structured";

function mapPsychology(d: QueryDocumentSnapshot): PsychologyTrackingRecord {
  const x = d.data() ?? {};
  const triggers = Array.isArray(x.triggers) ? (x.triggers as unknown[]).filter((t) => typeof t === "string") : [];
  const coping = Array.isArray(x.copingStrategies)
    ? (x.copingStrategies as unknown[]).filter((t) => typeof t === "string")
    : [];
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    triggers,
    copingStrategies: coping,
    therapyEngagement:
      x.therapyEngagement === "good" || x.therapyEngagement === "partial" || x.therapyEngagement === "poor"
        ? x.therapyEngagement
        : "partial",
    behaviourPatterns: typeof x.behaviourPatterns === "string" ? x.behaviourPatterns : "",
    riskFormulation: typeof x.riskFormulation === "string" ? x.riskFormulation : "",
    createdBy: typeof x.createdBy === "string" ? x.createdBy : "",
    createdAt: x.createdAt ?? null,
  };
}

function mapMse(x: unknown): PsychiatryMse {
  if (!x || typeof x !== "object") {
    return { mood: "", thought: "", perception: "", insight: "" };
  }
  const o = x as Record<string, unknown>;
  return {
    mood: typeof o.mood === "string" ? o.mood : "",
    thought: typeof o.thought === "string" ? o.thought : "",
    perception: typeof o.perception === "string" ? o.perception : "",
    insight: typeof o.insight === "string" ? o.insight : "",
  };
}

function mapMedication(x: unknown): PsychiatryMedicationRow[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((m) => m && typeof m === "object")
    .map((m) => {
      const o = m as Record<string, unknown>;
      return {
        name: typeof o.name === "string" ? o.name : "",
        dose: typeof o.dose === "string" ? o.dose : "",
        changes: typeof o.changes === "string" ? o.changes : "",
      };
    });
}

function mapPsychiatry(d: QueryDocumentSnapshot): PsychiatryRecord {
  const x = d.data() ?? {};
  const rl = String(x.riskLevel ?? "").toLowerCase();
  const riskLevel = rl === "high" || rl === "medium" || rl === "low" ? rl : "low";
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    diagnosis: typeof x.diagnosis === "string" ? x.diagnosis : "",
    medication: mapMedication(x.medication),
    sideEffects: typeof x.sideEffects === "string" ? x.sideEffects : "",
    mse: mapMse(x.mse),
    riskLevel,
    capacity: typeof x.capacity === "string" ? x.capacity : "",
    createdBy: typeof x.createdBy === "string" ? x.createdBy : "",
    createdAt: x.createdAt ?? null,
  };
}

function mapOT(d: QueryDocumentSnapshot): OTRecord {
  const x = d.data() ?? {};
  const il = String(x.independenceLevel ?? "").toLowerCase();
  const independenceLevel =
    il === "low" || il === "medium" || il === "high" ? il : "medium";
  const adlScore = typeof x.adlScore === "number" && !Number.isNaN(x.adlScore) ? x.adlScore : Number(x.adlScore) || 0;
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    adlScore,
    independenceLevel,
    activityParticipation: typeof x.activityParticipation === "string" ? x.activityParticipation : "",
    routineStructure: typeof x.routineStructure === "string" ? x.routineStructure : "",
    cognitiveFunction: typeof x.cognitiveFunction === "string" ? x.cognitiveFunction : "",
    dischargeReadiness: typeof x.dischargeReadiness === "string" ? x.dischargeReadiness : "",
    createdBy: typeof x.createdBy === "string" ? x.createdBy : "",
    createdAt: x.createdAt ?? null,
  };
}

function mapSALT(d: QueryDocumentSnapshot): SALTRecord {
  const x = d.data() ?? {};
  const cl = String(x.communicationLevel ?? "").toLowerCase();
  const communicationLevel =
    cl === "verbal" || cl === "non-verbal" || cl === "limited" ? cl : "limited";
  const ul = String(x.understandingLevel ?? "").toLowerCase();
  const understandingLevel =
    ul === "good" || ul === "partial" || ul === "poor" ? ul : "partial";
  const sr = String(x.swallowRisk ?? "").toLowerCase();
  const swallowRisk = sr === "high" || sr === "medium" || sr === "low" ? sr : "low";
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    communicationLevel,
    understandingLevel,
    aidsUsed: typeof x.aidsUsed === "string" ? x.aidsUsed : "",
    swallowRisk,
    dietLevel: typeof x.dietLevel === "string" ? x.dietLevel : "",
    mealtimeSupport: typeof x.mealtimeSupport === "string" ? x.mealtimeSupport : "",
    createdBy: typeof x.createdBy === "string" ? x.createdBy : "",
    createdAt: x.createdAt ?? null,
  };
}

async function latestDoc<T>(
  collectionName: string,
  patientId: string,
  map: (d: QueryDocumentSnapshot) => T
): Promise<T | null> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return null;
  const { organisationId } = await getUserContext();
  if (!organisationId) return null;
  const q = query(
    collection(db, collectionName),
    where("organisationId", "==", organisationId),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  const doc = snap.docs[0];
  return doc ? map(doc) : null;
}

export async function getLatestPsychologyTrackingForPatient(patientId: string): Promise<PsychologyTrackingRecord | null> {
  return latestDoc(PSYCHOLOGY_TRACKING_COLLECTION, patientId, mapPsychology);
}

export async function getLatestPsychiatryStructuredForPatient(patientId: string): Promise<PsychiatryRecord | null> {
  return latestDoc(PSYCHIATRY_STRUCTURED_COLLECTION, patientId, mapPsychiatry);
}

export async function getLatestOTStructuredForPatient(patientId: string): Promise<OTRecord | null> {
  return latestDoc(OT_STRUCTURED_COLLECTION, patientId, mapOT);
}

export async function getLatestSALTStructuredForPatient(patientId: string): Promise<SALTRecord | null> {
  return latestDoc(SALT_STRUCTURED_COLLECTION, patientId, mapSALT);
}

export type AddPsychologyTrackingInput = {
  patientId: string;
  organisationId: string;
  triggers: string[];
  copingStrategies: string[];
  therapyEngagement: "good" | "partial" | "poor";
  behaviourPatterns: string;
  riskFormulation: string;
};

export async function addPsychologyTracking(data: AddPsychologyTrackingInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);
  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = await addDoc(collection(db, PSYCHOLOGY_TRACKING_COLLECTION), {
    patientId,
    organisationId,
    triggers: Array.isArray(data.triggers) ? data.triggers.filter((t) => typeof t === "string") : [],
    copingStrategies: Array.isArray(data.copingStrategies) ? data.copingStrategies.filter((t) => typeof t === "string") : [],
    therapyEngagement: data.therapyEngagement,
    behaviourPatterns: (data.behaviourPatterns ?? "").toString(),
    riskFormulation: (data.riskFormulation ?? "").toString(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export type AddPsychiatryStructuredInput = Omit<PsychiatryRecord, "id" | "createdAt" | "createdBy"> & {
  organisationId: string;
};

export async function addPsychiatryStructured(data: AddPsychiatryStructuredInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);
  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = await addDoc(collection(db, PSYCHIATRY_STRUCTURED_COLLECTION), {
    patientId,
    organisationId,
    diagnosis: (data.diagnosis ?? "").toString(),
    medication: Array.isArray(data.medication) ? data.medication : [],
    sideEffects: (data.sideEffects ?? "").toString(),
    mse: data.mse ?? { mood: "", thought: "", perception: "", insight: "" },
    riskLevel: data.riskLevel,
    capacity: (data.capacity ?? "").toString(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export type AddOTStructuredInput = Omit<OTRecord, "id" | "createdAt" | "createdBy"> & { organisationId: string };

export async function addOTStructured(data: AddOTStructuredInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);
  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = await addDoc(collection(db, OT_STRUCTURED_COLLECTION), {
    patientId,
    organisationId,
    adlScore: typeof data.adlScore === "number" ? data.adlScore : Number(data.adlScore) || 0,
    independenceLevel: data.independenceLevel,
    activityParticipation: (data.activityParticipation ?? "").toString(),
    routineStructure: (data.routineStructure ?? "").toString(),
    cognitiveFunction: (data.cognitiveFunction ?? "").toString(),
    dischargeReadiness: (data.dischargeReadiness ?? "").toString(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export type AddSALTStructuredInput = Omit<SALTRecord, "id" | "createdAt" | "createdBy"> & { organisationId: string };

export async function addSALTStructured(data: AddSALTStructuredInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);
  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = await addDoc(collection(db, SALT_STRUCTURED_COLLECTION), {
    patientId,
    organisationId,
    communicationLevel: data.communicationLevel,
    understandingLevel: data.understandingLevel,
    aidsUsed: (data.aidsUsed ?? "").toString(),
    swallowRisk: data.swallowRisk,
    dietLevel: (data.dietLevel ?? "").toString(),
    mealtimeSupport: (data.mealtimeSupport ?? "").toString(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

/** Aliases for CPA aggregator / specs. */
export const getPsychologyData = getLatestPsychologyTrackingForPatient;
export const getPsychiatryData = getLatestPsychiatryStructuredForPatient;
export const getOTData = getLatestOTStructuredForPatient;
export const getSALTData = getLatestSALTStructuredForPatient;
