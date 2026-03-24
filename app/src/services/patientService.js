/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY]
 *
 * Patient metadata service — organisation-scoped; optional hospital / ward filters.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { logAuditEventNonBlocking } from "./auditService";
import { addDocLogged } from "../utils/firestoreWrite";

const PATIENTS_COLLECTION = "patients";

/**
 * @param {Record<string, unknown>} filters
 * @param {string} [filters.hospitalId]
 * @param {string} [filters.wardId]
 * @param {string} [filters.serviceId]
 */
export async function listPatientMetadata(filters = {}) {
  const { organisationId } = await getUserContext();

  if (!organisationId) {
    throw new Error("Governance Error: organisationId is required for Stage 3.");
  }

  const q = query(
    collection(db, PATIENTS_COLLECTION),
    where("organisationId", "==", organisationId)
  );

  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  let results = docs.map((d) => {
    const data = d?.data?.() ?? {};

    if (
      Object.prototype.hasOwnProperty.call(data, "clinicalNotes") ||
      Object.prototype.hasOwnProperty.call(data, "medicalHistory")
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "Stage 3 metadata read: clinical fields present but ignored for patientId:",
        d?.id
      );
    }

    return {
      id: d?.id ?? "",
      firstName: typeof data.firstName === "string" ? data.firstName : "",
      lastName: typeof data.lastName === "string" ? data.lastName : "",
      dob: data.dob ?? data.dateOfBirth ?? null,
      hospitalId: typeof data.hospitalId === "string" ? data.hospitalId : "",
      wardId: typeof data.wardId === "string" ? data.wardId : "",
      hospitalName: typeof data.hospitalName === "string" ? data.hospitalName : "",
      wardName: typeof data.wardName === "string" ? data.wardName : "",
      serviceId: typeof data.serviceId === "string" ? data.serviceId : null,
      name:
        `${typeof data.firstName === "string" ? data.firstName : ""} ${typeof data.lastName === "string" ? data.lastName : ""}`.trim() ||
        "",
      dateOfBirth: data.dateOfBirth ?? data.dob ?? null,
    };
  });

  const hospitalId = filters.hospitalId != null ? String(filters.hospitalId).trim() : "";
  const wardId = filters.wardId != null ? String(filters.wardId).trim() : "";
  const serviceId = filters.serviceId != null ? String(filters.serviceId).trim() : "";

  if (hospitalId) {
    results = results.filter((p) => p.hospitalId === hospitalId);
  }
  if (wardId) {
    results = results.filter((p) => p.wardId === wardId);
  }
  if (serviceId) {
    results = results.filter((p) => !p.serviceId || p.serviceId === serviceId);
  }

  await logAuditEventNonBlocking({
    action: "METADATA_READ_LIST",
    entityType: "PATIENT",
    organisationId,
    count: results.length,
  });

  return results;
}

/**
 * List patients — supports optional filters or legacy `(organisationId, { serviceId })` (org id ignored; scope is from auth).
 * @param {Record<string, unknown>|string} [arg1]
 * @param {Record<string, unknown>} [arg2]
 */
export function listPatients(arg1, arg2) {
  if (arg2 !== undefined && typeof arg2 === "object" && arg2 !== null) {
    return listPatientMetadata(arg2);
  }
  if (arg1 !== undefined && typeof arg1 === "object" && arg1 !== null && !Array.isArray(arg1)) {
    return listPatientMetadata(arg1);
  }
  return listPatientMetadata({});
}

/**
 * Create a patient (organisation, hospital, ward required).
 * @param {object} params
 * @param {string} params.organisationId
 * @param {string} params.hospitalId
 * @param {string} params.wardId
 * @param {string} [params.serviceId]
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {unknown} [params.dateOfBirth]
 * @param {string} [params.gender]
 * @param {string} [params.nhsNumber]
 * @returns {Promise<{ id: string }>}
 */
export async function createPatient(params) {
  if (!params || typeof params !== "object") throw new Error("Invalid payload");
  const { organisationId, hospitalId, wardId } = params;
  const ctx = await getUserContext();
  if (!ctx.organisationId || ctx.organisationId !== organisationId) {
    const err = new Error("403 Forbidden: organisation scope mismatch");
    err.status = 403;
    throw err;
  }
  if (!hospitalId?.trim() || !wardId?.trim()) {
    throw new Error("hospitalId and wardId are required to create a patient.");
  }

  const firstName = (params.firstName ?? "").toString().trim();
  const lastName = (params.lastName ?? "").toString().trim();

  const patientPayload = {
    organisationId,
    hospitalId: hospitalId.trim(),
    wardId: wardId.trim(),
    hospitalName: (params.hospitalName ?? "").toString().trim(),
    wardName: (params.wardName ?? "").toString().trim(),
    serviceId: params.serviceId != null ? String(params.serviceId).trim() || null : null,
    firstName,
    lastName,
    dateOfBirth: params.dateOfBirth ?? null,
    dob: params.dateOfBirth ?? null,
    gender: (params.gender ?? "").toString().trim(),
    nhsNumber: (params.nhsNumber ?? "").toString().trim(),
    createdAt: serverTimestamp(),
  };
  const docRef = await addDocLogged(
    collection(db, PATIENTS_COLLECTION),
    patientPayload,
    "patients"
  );

  await logAuditEventNonBlocking({
    action: "PATIENT_CREATED",
    entityType: "PATIENT",
    organisationId,
    entityId: docRef.id,
  });

  return { id: docRef.id };
}

/**
 * getPatientById(id)
 */
export async function getPatientById(id) {
  const patientId = (id ?? "").toString().trim();
  if (!patientId) {
    throw new Error("Patient id is required.");
  }

  const { organisationId } = await getUserContext();
  if (!organisationId) {
    throw new Error("Governance Error: organisationId is required.");
  }

  const ref = doc(db, PATIENTS_COLLECTION, patientId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const err = new Error("Patient not found.");
    err.status = 404;
    throw err;
  }

  const data = snap.data() || {};

  if (data.organisationId && data.organisationId !== organisationId) {
    const err = new Error("403 Forbidden: Governance Breach");
    err.status = 403;
    throw err;
  }

  await logAuditEventNonBlocking({
    action: "PATIENT_RECORD_OPEN",
    patientId,
  });

  if (
    Object.prototype.hasOwnProperty.call(data, "clinicalNotes") ||
    Object.prototype.hasOwnProperty.call(data, "medicalHistory") ||
    Object.prototype.hasOwnProperty.call(data, "secretNotes")
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "Patient detail: restricted fields present but ignored for patientId:",
      patientId
    );
  }

  return {
    id: snap.id,
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    dob: data.dob ?? data.dateOfBirth ?? null,
    address: typeof data.address === "string" ? data.address : "",
    gpName: typeof data.gpName === "string" ? data.gpName : "",
    emergencyContact:
      typeof data.emergencyContact === "string" ? data.emergencyContact : "",
    organisationId: data.organisationId ?? organisationId,
    hospitalId: typeof data.hospitalId === "string" ? data.hospitalId : "",
    wardId: typeof data.wardId === "string" ? data.wardId : "",
    hospitalName: typeof data.hospitalName === "string" ? data.hospitalName : "",
    wardName: typeof data.wardName === "string" ? data.wardName : "",
  };
}

/**
 * Summary for timeline / lightweight pages (includes `name`, `dateOfBirth` aliases).
 * @param {string} organisationId
 * @param {string} patientId
 */
export async function getPatientSummary(organisationId, patientId) {
  const ctx = await getUserContext();
  if (!ctx.organisationId || ctx.organisationId !== organisationId) {
    const err = new Error("403 Forbidden: organisation scope mismatch");
    err.status = 403;
    throw err;
  }
  const p = await getPatientById(patientId);
  const name =
    `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "Unnamed patient";
  return {
    ...p,
    name,
    dateOfBirth: p.dob,
  };
}
