/**
 * Physical health / vital signs observations (Firestore `physical_observations`).
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
} from "firebase/firestore";
import { db } from "../firebase";
import { calculateNEWS2, getRiskLevel } from "../utils/news2Calculator";
import { getPatientById } from "./patientService";

const COLLECTION = "physical_observations";

/**
 * @param {Record<string, unknown>} data
 */
function coerceString(data, key, fallback = "") {
  const v = data[key];
  return typeof v === "string" ? v.trim() : fallback;
}

/**
 * @param {{
 *   patientId: string,
 *   organisationId: string,
 *   hospitalId?: string | null,
 *   wardId?: string | null,
 *   temperature?: number | null,
 *   pulse?: number | null,
 *   systolicBP?: number | null,
 *   diastolicBP?: number | null,
 *   respiratoryRate?: number | null,
 *   oxygenSaturation?: number | null,
 *   bloodGlucose?: number | null,
 *   weight?: number | null,
 *   notes?: string | null,
 *   recordedBy: string,
 * }} payload
 */
export async function submitPhysicalObservation(payload) {
  const patientId = String(payload.patientId ?? "").trim();
  const organisationId = String(payload.organisationId ?? "").trim();
  if (!patientId) throw new Error("patientId is required");
  if (!organisationId) throw new Error("organisationId is required");

  // Enforce strict tenant scope: physical observations are hospital/ward scoped
  // and must match the patient record.
  const patient = await getPatientById(patientId);
  if ((patient.organisationId ?? "") !== organisationId) {
    throw new Error("organisationId mismatch between form and patient record.");
  }
  const hospitalId = String(patient.hospitalId ?? "").trim();
  const wardId = String(patient.wardId ?? "").trim();
  if (!hospitalId) throw new Error("Missing required context: hospitalId");
  if (!wardId) throw new Error("Missing required context: wardId");

  const vitals = {
    respiratoryRate: payload.respiratoryRate,
    oxygenSaturation: payload.oxygenSaturation,
    temperature: payload.temperature,
    pulse: payload.pulse,
  };
  const newsScore = calculateNEWS2(vitals);
  const riskLevel = getRiskLevel(newsScore);

  const doc = {
    patientId,
    organisationId,
    hospitalId,
    wardId,
    temperature: payload.temperature ?? null,
    pulse: payload.pulse ?? null,
    systolicBP: payload.systolicBP ?? null,
    diastolicBP: payload.diastolicBP ?? null,
    respiratoryRate: payload.respiratoryRate ?? null,
    oxygenSaturation: payload.oxygenSaturation ?? null,
    bloodGlucose: payload.bloodGlucose ?? null,
    weight: payload.weight ?? null,
    newsScore,
    riskLevel,
    notes: String(payload.notes ?? "").trim(),
    recordedBy: String(payload.recordedBy ?? "").trim() || "unknown",
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTION), doc);
  return { id: ref.id, newsScore, riskLevel };
}

/**
 * @param {string} organisationId
 * @param {string} patientId
 * @param {{ limitCount?: number }} [opts]
 */
export async function listPhysicalObservationsForPatient(organisationId, patientId, opts = {}) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return [];

  const lim = Math.min(Math.max(Number(opts.limitCount) || 100, 1), 500);
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(lim)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
}

/**
 * @param {string} organisationId
 * @param {{ limitCount?: number }} [opts]
 */
export async function listPhysicalObservationsForOrganisation(organisationId, opts = {}) {
  const org = String(organisationId ?? "").trim();
  if (!org) return [];
  const lim = Math.min(Math.max(Number(opts.limitCount) || 200, 1), 500);
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return (snap.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
}

export { COLLECTION as PHYSICAL_OBSERVATIONS_COLLECTION };
