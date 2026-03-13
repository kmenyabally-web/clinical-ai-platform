import { collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const PATIENTS_COLLECTION = "patients";

/**
 * Create a patient. All writes include organisationId and serviceId for multi-tenant safety.
 */
export async function createPatient({
  organisationId,
  serviceId,
  firstName,
  lastName,
  dateOfBirth,
  gender,
  nhsNumber,
}) {
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  const ref = collection(db, PATIENTS_COLLECTION);
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Unnamed patient";
  await addDoc(ref, {
    organisationId: organisationId.trim(),
    serviceId: serviceId ?? null,
    firstName: (firstName ?? "").trim(),
    lastName: (lastName ?? "").trim(),
    name,
    dateOfBirth: dateOfBirth ?? null,
    gender: (gender ?? "").trim() || null,
    nhsNumber: (nhsNumber ?? "").trim() || null,
    createdAt: serverTimestamp(),
  });
}

/**
 * List patients for an organisation. All queries include organisationId for multi-tenant safety.
 *
 * @param {string} organisationId
 * @param {{ serviceId?: string | null }} [options]
 * @returns {Promise<Array<{ id: string, name: string, dateOfBirth: any, serviceId: string | null }>>}
 */
export async function listPatients(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const ref = collection(db, PATIENTS_COLLECTION);
  const constraints = [where("organisationId", "==", organisationId.trim())];
  if (options?.serviceId != null && options.serviceId !== "") {
    constraints.push(where("serviceId", "==", options.serviceId));
  }
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const data = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      name: data.name ?? data.displayName ?? data.patientName ?? "",
      dateOfBirth: data.dateOfBirth ?? data.dob ?? data.DOB ?? null,
      serviceId: data.serviceId ?? null,
    };
  });
}

/**
 * Fetch patient summary for header (name, DOB, etc.). Returns null if doc not found.
 * Queries by organisationId and patientId for multi-tenant safety.
 */
export async function getPatientSummary(organisationId, patientId) {
  if (!organisationId?.trim() || !patientId?.trim()) return null;
  const ref = doc(db, PATIENTS_COLLECTION, patientId);
  if (!ref) return null;
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) return null;
  const data = snap.data?.() ?? {};
  if (data.organisationId && data.organisationId !== organisationId) return null;
  return {
    id: snap.id,
    patientId: snap.id,
    name: data.name ?? data.displayName ?? data.patientName ?? "",
    dateOfBirth: data.dateOfBirth ?? data.dob ?? data.DOB ?? null,
    serviceId: data.serviceId ?? null,
  };
}
