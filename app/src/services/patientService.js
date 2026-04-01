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
  limit,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { logAuditEventNonBlocking, logAction, logAudit, logAuditEvent, logEntityAudit } from "./auditService";
import { addDocLogged } from "../utils/firestoreWrite";
import { safeModeFields } from "../utils/safeMode";
import {
  GENERIC_USER_ERROR_MESSAGE,
  requirePatientId,
  assertSameOrganisationData,
  assertPatientOrganisationMatch,
} from "../utils/tenantContext";
import { isDocumentActive } from "../utils/auditSchema";
import { assertManagementWrite } from "./managementPermissions";
import { logManagementAudit } from "./managementAuditLog";

const PATIENTS_COLLECTION = "patients";
const MAX_ORG_WIDE_PATIENTS = 500;

function normalizeStompMedication(raw) {
  const item = raw && typeof raw === "object" ? raw : {};
  return {
    name: String(item.name ?? "").trim(),
    indication: String(item.indication ?? "").trim(),
    startDate: item.startDate ?? null,
    reviewDate: item.reviewDate ?? null,
    hasReductionPlan: item.hasReductionPlan === true,
    lastReviewedAt: item.lastReviewedAt ?? null,
  };
}

function normalizeStompMedicationsArray(medications) {
  if (!Array.isArray(medications)) return [];
  return medications
    .map(normalizeStompMedication)
    .filter((m) => m.name || m.indication || m.reviewDate || m.hasReductionPlan || m.startDate || m.lastReviewedAt);
}

function validateStompMedications(medications) {
  const list = normalizeStompMedicationsArray(medications);
  list.forEach((m, index) => {
    const label = `Medication ${index + 1}`;
    if (!m.indication) {
      throw new Error(`${label}: indication is required when medication is recorded.`);
    }
    if (!m.reviewDate) {
      throw new Error(`${label}: reviewDate is required when medication is recorded.`);
    }
  });
  return list;
}

function assertRequiredWriteContext({ organisationId, hospitalId, userId }) {
  if (!organisationId) throw new Error("Missing organisation");
  if (!hospitalId) throw new Error("Missing hospital");
  if (!userId) throw new Error("Missing user");
}

/**
 * @param {Record<string, unknown>} filters
 * @param {string} [filters.hospitalId]
 * @param {string} [filters.wardId]
 * @param {string} [filters.serviceId]
 */
export async function listPatientMetadata(filters = {}) {
  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId } = await getUserContext();

  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const allInOrganisation =
    filters.allInOrganisation === true ||
    filters.scope === "organisation" ||
    filters.organisationWide === true;

  const serviceId = filters.serviceId != null ? String(filters.serviceId).trim() : "";

  let snapshot;
  if (allInOrganisation) {
    const q = query(
      collection(db, PATIENTS_COLLECTION),
      where("organisationId", "==", organisationId),
      limit(MAX_ORG_WIDE_PATIENTS)
    );
    snapshot = await getDocs(q);
  } else {
    const hospitalId =
      filters.hospitalId != null
        ? String(filters.hospitalId).trim()
        : ctxHospitalId != null
          ? String(ctxHospitalId).trim()
          : "";
    const wardId =
      filters.wardId != null ? String(filters.wardId).trim() : ctxWardId != null ? String(ctxWardId).trim() : "";

    if (!hospitalId) {
      throw new Error("hospitalId is required for multi-tenant patient queries.");
    }

    const constraints = [where("organisationId", "==", organisationId), where("hospitalId", "==", hospitalId)];
    if (wardId) constraints.push(where("wardId", "==", wardId));

    const q = query(collection(db, PATIENTS_COLLECTION), ...constraints);
    snapshot = await getDocs(q);
  }

  const docs = (snapshot?.docs ?? []).filter((d) => isDocumentActive(d.data() ?? {}));

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

  // hospitalId/wardId filtering is enforced in Firestore query constraints above.
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
 * All patients for the signed-in tenant — single Firestore filter on `organisationId` only
 * (no ward/service/hospital narrowing in the query).
 *
 * @param {string} organisationId - Must match {@link getUserContext} organisationId.
 */
/**
 * @param {string} organisationId
 * @param {{ includeArchived?: boolean }} [options]
 */
export async function getPatientsByOrganisation(organisationId, options = {}) {
  const org = (organisationId ?? "").toString().trim();
  if (!org) return [];
  const { organisationId: ctxOrg } = await getUserContext();
  if (!ctxOrg || ctxOrg !== org) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
  const includeArchived = options.includeArchived === true;
  const q = query(collection(db, PATIENTS_COLLECTION), where("organisationId", "==", org));
  const snap = await getDocs(q);
  const rows = snap.docs
    .filter((d) => (includeArchived ? true : isDocumentActive(d.data() ?? {})))
    .map((d) => {
      const data = d.data() ?? {};
      return { ...data, id: d.id };
    });
  await logAuditEventNonBlocking({
    action: "METADATA_READ_LIST",
    entityType: "PATIENT",
    organisationId: org,
    count: rows.length,
  });
  return rows;
}

/**
 * Org-wide patient list (no hospital/ward filter). Alias for {@link getPatientsByOrganisation}.
 * @param {string} organisationId
 * @param {{ includeArchived?: boolean }} [options]
 */
export const getPatientsByOrg = getPatientsByOrganisation;

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
  assertPatientOrganisationMatch(organisationId, ctx.organisationId);

  const resolvedHospitalId = hospitalId?.trim()
    ? hospitalId.trim()
    : ctx.hospitalId != null
      ? String(ctx.hospitalId).trim()
      : "";
  const resolvedWardId = wardId?.trim()
    ? wardId.trim()
    : ctx.wardId != null
      ? String(ctx.wardId).trim()
      : "";

  if (!resolvedHospitalId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  assertRequiredWriteContext({
    organisationId,
    hospitalId: resolvedHospitalId,
    userId: auth.currentUser?.uid ?? null,
  });

  const firstName = (params.firstName ?? "").toString().trim();
  const lastName = (params.lastName ?? "").toString().trim();
  const name = `${firstName} ${lastName}`.trim() || "Unnamed patient";

  const patientPayload = {
    ...safeModeFields(),
    organisationId,
    hospitalId: resolvedHospitalId,
    wardId: resolvedWardId || "",
    name,
    hospitalName: (params.hospitalName ?? "").toString().trim(),
    wardName: (params.wardName ?? "").toString().trim(),
    serviceId: params.serviceId != null ? String(params.serviceId).trim() || null : null,
    firstName,
    lastName,
    dateOfBirth: params.dateOfBirth ?? null,
    dob: params.dateOfBirth ?? null,
    gender: (params.gender ?? "").toString().trim(),
    nhsNumber: (params.nhsNumber ?? "").toString().trim(),
    stompMonitoring: Boolean(params.stompMonitoring),
    medications: normalizeStompMedicationsArray(params.medications),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    ...(auth.currentUser?.uid ? { createdBy: auth.currentUser.uid, updatedBy: auth.currentUser.uid } : {}),
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
  void logEntityAudit({
    action: "CREATE_PATIENT",
    entityType: "patient",
    entityId: docRef.id,
    metadata: { organisationId },
  });

  void logAction("PATIENT_CREATE", auth.currentUser?.uid ?? null);
  await logAudit("CREATE_PATIENT", {
    userId: auth.currentUser?.uid ?? null,
    organisationId,
    patientId: docRef.id,
  });
  void logAuditEvent({
    action: "CREATE_PATIENT",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
    },
    organisationId,
    hospitalId: resolvedHospitalId,
    wardId: resolvedWardId || null,
    patientId: docRef.id,
    metadata: {
      name,
      serviceId: patientPayload.serviceId ?? null,
    },
  });

  return { id: docRef.id };
}

/**
 * getPatientById(id)
 */
export async function getPatientById(id) {
  const patientId = requirePatientId(id);

  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ref = doc(db, PATIENTS_COLLECTION, patientId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const err = new Error("Patient not found.");
    err.status = 404;
    throw err;
  }

  const data = snap.data() || {};

  if (data.isDeleted === true) {
    const err = new Error("Patient not found.");
    err.status = 404;
    throw err;
  }

  if (data.organisationId) assertPatientOrganisationMatch(data.organisationId, organisationId);

  // Firestore rules already enforce tenant access on patient reads. Do not require profile
  // hospital/ward to match the patient record — profile may be UNASSIGNED or a different site
  // while the user legitimately works under StructureContext / patient-assigned scope.

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
    stompMonitoring: data.stompMonitoring === true,
    medications: normalizeStompMedicationsArray(data.medications),
  };
}

/**
 * Update STOMP monitoring fields on a patient.
 * Validation: when medications exist, each medication requires indication + reviewDate.
 *
 * @param {string} patientId
 * @param {{ stompMonitoring: boolean, medications: Array<{ name?: string, indication?: string, reviewDate?: unknown, hasReductionPlan?: boolean, startDate?: unknown, lastReviewedAt?: unknown }> }} payload
 * @returns {Promise<void>}
 */
export async function updatePatientStomp(patientId, payload) {
  const id = requirePatientId(patientId);
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ref = doc(db, PATIENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found.");
  const current = snap.data?.() ?? {};
  assertPatientOrganisationMatch(current.organisationId, organisationId);

  const stompMonitoring = payload?.stompMonitoring === true;
  const medications = validateStompMedications(payload?.medications);
  await updateDoc(ref, {
    stompMonitoring,
    medications,
    updatedAt: serverTimestamp(),
    ...(auth.currentUser?.uid ? { updatedBy: auth.currentUser.uid } : {}),
  });

  await logAuditEventNonBlocking({
    action: "PATIENT_STOMP_UPDATED",
    entityType: "PATIENT",
    organisationId,
    entityId: id,
    metadata: {
      stompMonitoring,
      medicationCount: medications.length,
    },
  });
}

/**
 * Update patient demographics (Admin / Manager).
 * organisationId, hospitalId, and wardId are locked after creation (governance).
 * @param {string} patientId
 * @param {Record<string, unknown>} updates
 */
export async function updatePatientDemographics(patientId, updates) {
  const id = requirePatientId(patientId);
  await assertManagementWrite();
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = doc(db, PATIENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found.");
  const cur = snap.data() ?? {};
  assertPatientOrganisationMatch(cur.organisationId, organisationId);
  if (cur.isDeleted === true) throw new Error("Patient has been deleted.");
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");

  const patch = {};
  if (updates && typeof updates === "object") {
    if (updates.firstName != null) patch.firstName = String(updates.firstName).trim();
    if (updates.lastName != null) patch.lastName = String(updates.lastName).trim();
    if (Object.prototype.hasOwnProperty.call(updates, "dateOfBirth")) {
      patch.dateOfBirth = updates.dateOfBirth ?? null;
      patch.dob = updates.dateOfBirth ?? null;
    }
    if (updates.address != null) patch.address = String(updates.address).trim();
    if (updates.gpName != null) patch.gpName = String(updates.gpName).trim();
    if (updates.emergencyContact != null) patch.emergencyContact = String(updates.emergencyContact).trim();
  }
  const first = patch.firstName !== undefined ? patch.firstName : cur.firstName ?? "";
  const last = patch.lastName !== undefined ? patch.lastName : cur.lastName ?? "";
  patch.name = `${first} ${last}`.trim() || (typeof cur.name === "string" ? cur.name : "") || "Unnamed patient";

  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_UPDATE",
    entityType: "patient",
    entityId: id,
    organisationId,
  });
}

/**
 * Soft-delete a patient record (hidden from active lists).
 * @param {string} patientId
 */
export async function softDeletePatient(patientId) {
  const id = requirePatientId(patientId);
  await assertManagementWrite();
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = doc(db, PATIENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found.");
  const cur = snap.data() ?? {};
  assertPatientOrganisationMatch(cur.organisationId, organisationId);
  if (cur.isDeleted === true) throw new Error("Patient has already been deleted.");
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");
  await updateDoc(ref, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_DELETE",
    entityType: "patient",
    entityId: id,
    organisationId,
  });
}

/**
 * Restore an archived patient record.
 * @param {string} patientId
 */
export async function restorePatient(patientId) {
  const id = requirePatientId(patientId);
  await assertManagementWrite();
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const ref = doc(db, PATIENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found.");
  const cur = snap.data() ?? {};
  assertPatientOrganisationMatch(cur.organisationId, organisationId);
  if (cur.isDeleted !== true) throw new Error("Patient is not archived.");
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Not authenticated.");
  await updateDoc(ref, {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  void logManagementAudit({
    action: "ORG_ADMIN_RESTORE",
    entityType: "patient",
    entityId: id,
    organisationId,
  });
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
