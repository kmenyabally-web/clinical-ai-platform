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
import { BEHAVIOUR_TYPES, normalizeLegacyBehaviourType } from "../constants/behaviours";
import { sortBehavioursByClinicalTimeDesc } from "../utils/behaviourClinicalTime";

export const BEHAVIOURS_COLLECTION = "behaviours";

/** Canonical behaviour types (see `../constants/behaviours`). */
export const behaviourTypes = BEHAVIOUR_TYPES;

const ALLOWED_BEHAVIOUR_TYPES = new Set<string>(BEHAVIOUR_TYPES);

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
  /** When the behaviour occurred (ISO 8601). Primary timeline field. */
  clinicalTime: string | null;
  behaviourType: string;
  /** Present when `behaviourType` is `"Other"` (or legacy free-text capture). */
  behaviourCustom: string | null;
  severity: string;
  trigger: string;
  action: string;
  stompRelated: boolean;
  medicationRefused: boolean;
  /** Same as `recordedBy` on new writes; preferred field for new code. */
  createdBy: string;
  recordedBy: string;
  hospitalId: string | null;
  wardId: string | null;
  createdAt: unknown;
  /** Legacy duplicate of clinical instant; prefer `clinicalTime` for display. */
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
export function isValidStructuredBehaviourLog(b: {
  behaviourType?: unknown;
  behaviourCustom?: unknown;
}): boolean {
  const t = typeof b?.behaviourType === "string" ? b.behaviourType.trim() : "";
  if (!t) return false;
  if (t === "Other") {
    const c = typeof b?.behaviourCustom === "string" ? b.behaviourCustom.trim() : "";
    return Boolean(c);
  }
  return true;
}

function coerceId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t || null;
  }
  return null;
}

function mapBehaviourDoc(d: QueryDocumentSnapshot): StructuredBehaviourLog {
  const x = d.data() ?? {};
  const rawType = typeof x.behaviourType === "string" ? x.behaviourType : "";
  const normalizedType = normalizeLegacyBehaviourType(rawType);
  const rawCustom = typeof x.behaviourCustom === "string" ? x.behaviourCustom.trim() : "";
  const clinicalTime =
    typeof x.clinicalTime === "string" && x.clinicalTime.trim() ? x.clinicalTime.trim() : null;
  const uid =
    (typeof x.createdBy === "string" && x.createdBy.trim() ? x.createdBy.trim() : "") ||
    (typeof x.recordedBy === "string" && x.recordedBy.trim() ? x.recordedBy.trim() : "");
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    clinicalTime,
    behaviourType: normalizedType,
    behaviourCustom: rawCustom ? rawCustom : null,
    severity: typeof x.severity === "string" ? x.severity : "",
    trigger: typeof x.trigger === "string" ? x.trigger : "",
    action: typeof x.action === "string" ? x.action : "",
    stompRelated: x.stompRelated === true,
    medicationRefused: x.medicationRefused === true,
    createdBy: uid,
    recordedBy: typeof x.recordedBy === "string" ? x.recordedBy : uid,
    hospitalId: coerceId(x.hospitalId),
    wardId: coerceId(x.wardId),
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
  /** When the behaviour occurred (ISO 8601), from auto or manual entry. */
  clinicalTimeIso: string;
  hospitalId?: string | null;
  wardId?: string | null;
  behaviourType: string;
  /** Required when `behaviourType` is `"Other"`. */
  behaviourCustom?: string | null;
  severity: string;
  trigger: string;
  action: string;
  stompRelated: boolean;
  medicationRefused: boolean;
}): Promise<{ id: string }> {
  const patientId = (params.patientId ?? "").toString().trim();
  const organisationId = (params.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const bt = (params.behaviourType ?? "").toString().trim();
  const customRaw = (params.behaviourCustom ?? "").toString().trim();
  const sev = (params.severity ?? "").toString().trim();
  const tr = (params.trigger ?? "").toString().trim();
  const act = (params.action ?? "").toString().trim();
  if (!bt || !sev) {
    throw new Error("Behaviour type and severity are required.");
  }
  if (!ALLOWED_BEHAVIOUR_TYPES.has(bt)) {
    throw new Error("Select a valid behaviour type.");
  }
  if (bt === "Other" && !customRaw) {
    throw new Error("Specify the behaviour when type is Other.");
  }
  if (!tr || !act) {
    throw new Error("Trigger and action taken are required.");
  }

  const clinicalRaw = (params.clinicalTimeIso ?? "").toString().trim();
  if (!clinicalRaw) {
    throw new Error("Clinical time is required.");
  }
  const clinicalDate = new Date(clinicalRaw);
  if (Number.isNaN(clinicalDate.getTime())) {
    throw new Error("Invalid clinical time.");
  }
  const clinicalIso = clinicalDate.toISOString();

  const hospitalId = coerceId(params.hospitalId);
  const wardId = coerceId(params.wardId);

  const eventAt = Timestamp.fromDate(clinicalDate);

  const payload: Record<string, unknown> = {
    patientId,
    organisationId,
    clinicalTime: clinicalIso,
    behaviourType: bt,
    severity: sev,
    trigger: tr,
    action: act,
    stompRelated: Boolean(params.stompRelated),
    medicationRefused: Boolean(params.medicationRefused),
    createdBy: uid,
    recordedBy: uid,
    eventAt,
    createdAt: serverTimestamp(),
  };
  if (hospitalId) payload.hospitalId = hospitalId;
  if (wardId) payload.wardId = wardId;
  if (bt === "Other" && customRaw) {
    payload.behaviourCustom = customRaw;
  }

  const ref = await addDoc(collection(db, BEHAVIOURS_COLLECTION), payload);
  return { id: ref.id };
}

/**
 * Structured behaviour rows for a patient, newest by **clinical** time (falls back for legacy rows).
 * Fetches by `createdAt` so documents without `clinicalTime` are included, then sorts in memory.
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
  const rows = (snap.docs ?? [])
    .map((doc) => mapBehaviourDoc(doc))
    .filter((row) => isValidStructuredBehaviourLog(row))
    .filter((row) => isDocumentActive(row as Record<string, unknown>));
  return sortBehavioursByClinicalTimeDesc(rows);
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
    behaviour:
      b.behaviourType === "Other" && b.behaviourCustom
        ? `Other (${b.behaviourCustom})`
        : b.behaviourType,
    createdAt: b.createdAt,
  }));
}
