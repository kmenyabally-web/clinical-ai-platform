/**
 * Structured nursing observations — collection `nursing_observations`.
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
import type { NursingAdls, NursingObservation } from "../models/nursingModel";

export const NURSING_OBSERVATIONS_COLLECTION = "nursing_observations";

export type AddNursingObservationInput = {
  patientId: string;
  organisationId: string;
  observationLevel: string;
  medicationAdherence: string;
  nutrition: string;
  hydration: string;
  sleep: string;
  /** V2 structured ADLs or legacy single string. */
  adls: NursingAdls | string;
  continence?: string;
  riskLevel: string;
  /** V2 physical / clinical free text (stored; legacy `notes` still read for old docs). */
  physicalHealth: string;
};

function normalizeAdlField<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  const hit = allowed.find((a) => a.toLowerCase() === s);
  return hit ?? fallback;
}

function mapAdlsFromFirestore(x: Record<string, unknown>): NursingAdls | string {
  const raw = x.adls;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.washing === "string" && typeof o.dressing === "string" && typeof o.hygiene === "string") {
      return {
        washing: normalizeAdlField(o.washing, ["independent", "assisted"] as const, "independent"),
        dressing: normalizeAdlField(o.dressing, ["independent", "assisted"] as const, "independent"),
        hygiene: normalizeAdlField(o.hygiene, ["good", "poor"] as const, "good"),
      };
    }
  }
  if (typeof raw === "string") return raw;
  return "";
}

export function mapNursingDoc(d: QueryDocumentSnapshot): NursingObservation {
  const x = d.data() ?? {};
  const physicalHealth =
    typeof x.physicalHealth === "string" && x.physicalHealth.trim()
      ? x.physicalHealth
      : typeof x.notes === "string"
        ? x.notes
        : "";
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    observationLevel: typeof x.observationLevel === "string" ? x.observationLevel : "",
    medicationAdherence: typeof x.medicationAdherence === "string" ? x.medicationAdherence : "",
    nutrition: typeof x.nutrition === "string" ? x.nutrition : "",
    hydration: typeof x.hydration === "string" ? x.hydration : "",
    sleep: typeof x.sleep === "string" ? x.sleep : "",
    adls: mapAdlsFromFirestore(x),
    continence: typeof x.continence === "string" ? x.continence : undefined,
    riskLevel: typeof x.riskLevel === "string" ? x.riskLevel : "",
    physicalHealth,
    notes: typeof x.notes === "string" ? x.notes : undefined,
    createdAt: x.createdAt ?? null,
  };
}

export async function addNursingObservation(data: AddNursingObservationInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const physicalHealth = (data.physicalHealth ?? "").toString().trim();
  const payload: Record<string, unknown> = {
    patientId,
    organisationId,
    observationLevel: (data.observationLevel ?? "").toString().trim(),
    medicationAdherence: (data.medicationAdherence ?? "").toString().trim(),
    nutrition: (data.nutrition ?? "").toString().trim(),
    hydration: (data.hydration ?? "").toString().trim(),
    sleep: (data.sleep ?? "").toString().trim(),
    adls: typeof data.adls === "string" ? (data.adls ?? "").toString().trim() : data.adls,
    riskLevel: (data.riskLevel ?? "").toString().trim(),
    physicalHealth,
    notes: physicalHealth,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  if (data.continence != null && String(data.continence).trim()) {
    payload.continence = String(data.continence).trim();
  }

  const ref = await addDoc(collection(db, NURSING_OBSERVATIONS_COLLECTION), payload);
  return { id: ref.id };
}

export async function getNursingObservationsForPatient(
  patientId: string,
  { limitCount = 50 } = {}
): Promise<NursingObservation[]> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];

  const { organisationId } = await getUserContext();
  if (!organisationId) return [];

  const cap = Math.min(200, Math.max(10, limitCount));

  const q = query(
    collection(db, NURSING_OBSERVATIONS_COLLECTION),
    where("organisationId", "==", organisationId),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(cap)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((doc) => mapNursingDoc(doc));
}
