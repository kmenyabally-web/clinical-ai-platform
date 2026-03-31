/**
 * Structured behaviour logs (collection `behaviours`).
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { assertSameOrganisationData, GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import { isDocumentActive } from "../utils/auditSchema";
import { logEntityAudit } from "./auditService";

export const BEHAVIOURS_COLLECTION = "behaviours";

/** Structured behaviour types (CQC-aligned capture). Legacy rows may use older labels. */
export const behaviourTypes = [
  "Aggression",
  "Self-harm",
  "Absconding",
  "Medication refusal",
  "Property damage",
] as const;

const ALLOWED_BEHAVIOUR_TYPES = new Set<string>(behaviourTypes as unknown as string[]);

export type BehaviourExtraction = {
  riskLevel: string;
  behaviourFlag: boolean;
  requiresReview: boolean;
};

/** Placeholder for future NLP / rules-based extraction from note text. */
export async function extractBehaviourFromNote(noteContent: string): Promise<BehaviourExtraction> {
  void noteContent;
  return {
    riskLevel: "LOW",
    behaviourFlag: false,
    requiresReview: false,
  };
}

export type StructuredBehaviourLog = {
  id: string;
  patientId: string;
  organisationId: string;
  behaviourType: string;
  severity: string;
  trigger: string;
  action: string;
  stompRelated: boolean;
  medicationRefused: boolean;
  recordedBy: string;
  createdAt: unknown;
  eventAt: unknown;
};

type LegacyBehaviourRow = {
  noteId: string;
  patientId: string;
  discipline: string;
  behaviour: string;
  createdAt: unknown;
};

/** Entries without a real behaviour type are legacy/bad rows — exclude from UI and analytics. */
export function isValidStructuredBehaviourLog(b: { behaviourType?: unknown }): boolean {
  const t = typeof b?.behaviourType === "string" ? b.behaviourType.trim() : "";
  return Boolean(t);
}

function mapBehaviourDoc(d: QueryDocumentSnapshot): StructuredBehaviourLog {
  const x = d.data() ?? {};
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    behaviourType: typeof x.behaviourType === "string" ? x.behaviourType : "",
    severity: typeof x.severity === "string" ? x.severity : "",
    trigger: typeof x.trigger === "string" ? x.trigger : "",
    action: typeof x.action === "string" ? x.action : "",
    stompRelated: x.stompRelated === true,
    medicationRefused: x.medicationRefused === true,
    recordedBy: typeof x.recordedBy === "string" ? x.recordedBy : "",
    createdAt: x.createdAt ?? null,
    eventAt: x.eventAt ?? x.createdAt ?? null,
  };
}

/**
 * Persist a structured behaviour event (single source of truth for behaviour capture).
 */
export async function createBehaviourLog(params: {
  patientId: string;
  organisationId: string;
  behaviourType: string;
  severity: string;
  trigger: string;
  action: string;
  stompRelated: boolean;
  medicationRefused: boolean;
  /** When false, `eventAt` is set to server time at write. */
  useManualEventTime: boolean;
  manualEventAt: Date | null;
}): Promise<{ id: string }> {
  const patientId = (params.patientId ?? "").toString().trim();
  const organisationId = (params.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const bt = (params.behaviourType ?? "").toString().trim();
  const sev = (params.severity ?? "").toString().trim();
  const tr = (params.trigger ?? "").toString().trim();
  const act = (params.action ?? "").toString().trim();
  if (!bt || !sev) {
    throw new Error("Behaviour type and severity are required.");
  }
  if (!ALLOWED_BEHAVIOUR_TYPES.has(bt)) {
    throw new Error("Select a valid behaviour type.");
  }
  if (!tr || !act) {
    throw new Error("Trigger and action taken are required.");
  }

  let eventAt: ReturnType<typeof serverTimestamp> | Timestamp;
  if (params.useManualEventTime && params.manualEventAt && !Number.isNaN(params.manualEventAt.getTime())) {
    eventAt = Timestamp.fromDate(params.manualEventAt);
  } else {
    eventAt = serverTimestamp();
  }

  const payload: Record<string, unknown> = {
    patientId,
    organisationId,
    behaviourType: bt,
    severity: sev,
    trigger: tr,
    action: act,
    stompRelated: Boolean(params.stompRelated),
    medicationRefused: Boolean(params.medicationRefused),
    recordedBy: uid,
    eventAt,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, BEHAVIOURS_COLLECTION), payload);
  return { id: ref.id };
}

/**
 * Structured behaviour rows for a patient, newest first (Firestore `orderBy` on `createdAt`).
 */
export async function fetchStructuredBehaviourLogsForPatient(
  patientId: string,
  { limitCount = 80 } = {}
): Promise<StructuredBehaviourLog[]> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];

  const { organisationId } = await getUserContext();
  if (!organisationId) return [];

  const cap = Math.min(500, Math.max(20, limitCount));

  const q = query(
    collection(db, BEHAVIOURS_COLLECTION),
    where("organisationId", "==", organisationId),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(cap)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? [])
    .map((doc) => mapBehaviourDoc(doc))
    .filter((row) => isValidStructuredBehaviourLog(row))
    .filter((row) => isDocumentActive(row as Record<string, unknown>));
}

/**
 * Legacy list shape — **only** from `behaviours` (no clinical-note merge).
 */
export async function fetchBehaviourForPatient(
  patientId: string,
  { limitCount = 80 } = {}
): Promise<Array<LegacyBehaviourRow | Record<string, unknown>>> {
  const logs = await fetchStructuredBehaviourLogsForPatient(patientId, { limitCount });
  return logs.map((b) => ({
    id: b.id,
    noteId: "",
    patientId: b.patientId,
    discipline: "",
    behaviour: b.behaviourType,
    createdAt: b.createdAt,
  }));
}
