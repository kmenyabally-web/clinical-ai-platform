/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY]
 *
 * Patient metadata service.
 *
 * Strict constraints:
 * - Read-only
 * - Scoped by organisationId from the user's governance context
 * - Returns metadata only: id, firstName, lastName, dob
 * - Does not expose clinicalNotes or medicalHistory (even if present in documents)
 */

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { logAuditEventNonBlocking } from "./auditService";

const PATIENTS_COLLECTION = "patients";

/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY]
 *
 * listPatientMetadata()
 *
 * Returns an array of basic patient metadata:
 *   { id, firstName, lastName, dob }
 *
 * Governance:
 * - Requires organisationId in the current user context.
 * - Audits using logAuditEventNonBlocking with action METADATA_READ_LIST.
 */
export async function listPatientMetadata() {
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

  const results = docs.map((d) => {
    const data = d?.data?.() ?? {};

    // Guardrail: we do not use or return clinical content fields.
    if (Object.prototype.hasOwnProperty.call(data, "clinicalNotes") ||
        Object.prototype.hasOwnProperty.call(data, "medicalHistory")) {
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
    };
  });

  await logAuditEventNonBlocking({
    action: "METADATA_READ_LIST",
    entityType: "PATIENT",
    organisationId,
    count: results.length,
  });

  return results;
}

/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY]
 *
 * Compatibility alias.
 * Many existing screens/services import listPatients.
 * At Stage 3, listPatients is metadata-only and returns:
 *   { id, firstName, lastName, dob }
 */
export const listPatients = listPatientMetadata;

/** [ENABLEMENT GATE: STAGE 5 - PATIENT DETAIL (NON-CLINICAL FIELDS)]
 *
 * getPatientById(id)
 *
 * Fetches a single patient record and returns ONLY allowed non-clinical fields:
 * - id, firstName, lastName, dob, address, gpName, emergencyContact
 *
 * Safety:
 * - Verifies patient.organisationId matches the current user's organisationId.
 * - If mismatch, throws a 403-style governance breach error.
 * - Ignores any fields such as clinicalNotes, medicalHistory, secretNotes.
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
  };
}
