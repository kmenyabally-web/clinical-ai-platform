import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { addTimelineEntry } from "./patientTimelineService";
import { recalculateComplianceScoreAsync } from "./complianceEngine";
import { auth } from "../firebase";
import { getUserContext } from "./authService";
import { getPatientById } from "./patientService";
import { logAuditEventNonBlocking } from "./auditService";
import {
  assertTenantContext,
  tenantFieldsFromContext,
  assertSameOrganisationData,
  GENERIC_USER_ERROR_MESSAGE,
} from "../utils/tenantContext";

const INCIDENTS_COLLECTION = "incidents";
const PATIENT_TIMELINE_COLLECTION = "patientTimeline";

function assertRequiredWriteContext({ organisationId, hospitalId, userId }) {
  if (!organisationId) throw new Error("Missing organisation");
  if (!hospitalId) throw new Error("Missing hospital");
  if (!userId) throw new Error("Missing user");
}

export const INCIDENT_TYPES = [
  "safeguarding",
  "medication_error",
  "fall",
  "aggression",
  "absconding",
  "neglect",
  "other",
];

export const INCIDENT_SEVERITY = ["low", "medium", "high", "critical"];

/**
 * Legacy: Create an incident and a linked patientTimeline event.
 * Ensures organisationId, serviceId, reportedBy and reportedAt are always set.
 *
 * @param {Object} params
 * @param {string} params.organisationId
 * @param {string} params.serviceId
 * @param {string} params.patientId
 * @param {string} params.type
 * @param {string} params.severity
 * @param {string} params.description
 * @param {string} [params.actionsTaken]
 * @param {string} params.reportedBy - userId or email
 * @param {Array<string>} [params.linkedEvidence]
 * @param {string} [params.status]
 * @returns {Promise<{ id: string }>}
 */
export async function createIncidentLegacy({
  organisationId,
  serviceId,
  patientId,
  type,
  severity,
  description,
  actionsTaken,
  reportedBy,
  linkedEvidence = [],
  status = "open",
}) {
  if (!organisationId?.trim()) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!serviceId?.trim()) throw new Error("serviceId is required");
  if (!patientId?.trim()) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!type?.trim()) throw new Error("type is required");
  if (!severity?.trim()) throw new Error("severity is required");
  if (!description?.trim()) throw new Error("description is required");
  if (!reportedBy?.trim()) throw new Error("reportedBy is required");

  const patient = await getPatientById(patientId.trim());
  const hospitalId = (patient.hospitalId && String(patient.hospitalId).trim()) || "";
  const wardId = (patient.wardId && String(patient.wardId).trim()) || "";
  assertRequiredWriteContext({
    organisationId,
    hospitalId,
    userId: auth.currentUser?.uid ?? reportedBy ?? null,
  });
  assertTenantContext(organisationId, hospitalId);

  const incidentsRef = collection(db, INCIDENTS_COLLECTION);
  const now = serverTimestamp();

  const incidentDoc = {
    incidentId: "",
    patientId,
    organisationId,
    hospitalId,
    wardId,
    serviceId,
    type,
    severity,
    description: description.trim(),
    reportedBy,
    reportedAt: now,
    status,
    actionsTaken: actionsTaken?.trim() || "",
    linkedEvidence: Array.isArray(linkedEvidence) ? linkedEvidence : [],
  };

  const incidentSnap = await addDoc(incidentsRef, incidentDoc);
  const incidentId = incidentSnap.id;
  await updateDoc(incidentSnap, { incidentId });

  await logAuditEventNonBlocking({
    action: "INCIDENT_REPORT_CREATED",
    incidentId,
    patientId,
    severity,
    incidentType: type,
  }).catch(() => {});

  // Legacy: patientTimeline collection (existing behaviour).
  const timelineRef = collection(db, PATIENT_TIMELINE_COLLECTION);
  await addDoc(timelineRef, {
    eventId: incidentId,
    patientId,
    organisationId,
    hospitalId,
    wardId,
    serviceId,
    type: type === "safeguarding" ? "safeguarding" : "incident",
    title: type === "safeguarding" ? "Safeguarding concern" : "Incident report",
    description: description.trim(),
    createdBy: reportedBy,
    createdAt: now,
    metadata: {
      severity,
      incidentType: type,
      status,
      linkedEvidence: Array.isArray(linkedEvidence) ? linkedEvidence : [],
      incidentCollection: INCIDENTS_COLLECTION,
    },
  });

  // Unified patient_timeline (new schema).
  const eventType = type === "safeguarding" ? "safeguarding" : "incident";
  const eventTitle = type === "safeguarding" ? "Safeguarding alert created" : "Incident reported";
  await addTimelineEntry({
    organisationId,
    patientId,
    hospitalId,
    wardId,
    serviceId,
    eventType,
    eventTitle,
    eventDescription: description.trim(),
    sourceCollection: INCIDENTS_COLLECTION,
    sourceId: incidentId,
    createdBy: reportedBy,
    metadata: { severity, status, incidentType: type },
  }).catch((err) => console.error("Timeline entry failed:", err));

  recalculateComplianceScoreAsync(organisationId, serviceId);

  return { id: incidentId };
}

/** [ENABLEMENT GATE: STAGE 6 - INCIDENT REPORTING SYSTEM]
 *
 * createIncident(incidentData)
 *
 * Implements the simplified Stage 6 incident creation required by the latest prompt:
 * - Writes to "incidents"
 * - Automatically attaches organisationId from user context
 * - createdAt: serverTimestamp()
 * - status: "open"
 * - Audits via logAuditEventNonBlocking
 */
export async function createIncident(incidentData) {
  const safePayload = incidentData && typeof incidentData === "object" ? incidentData : {};
  const ctx = await getUserContext();
  const orgId = (ctx?.organisationId ?? "").toString().trim() || null;
  if (!orgId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  const tenant = tenantFieldsFromContext({
    organisationId: orgId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  assertRequiredWriteContext({
    organisationId: tenant.organisationId,
    hospitalId: tenant.hospitalId,
    userId: auth.currentUser?.uid ?? null,
  });
  assertTenantContext(tenant.organisationId, tenant.hospitalId);

  const incidentDoc = {
    ...safePayload,
    organisationId: orgId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    createdAt: serverTimestamp(),
    status: "open",
  };

  const incidentsRef = collection(db, INCIDENTS_COLLECTION);
  const snap = await addDoc(incidentsRef, incidentDoc);

  await logAuditEventNonBlocking({
    action: "INCIDENT_REPORT_CREATED",
    incidentId: snap.id,
    patientId: safePayload.patientId ?? null,
    metadata: {
      category: safePayload.category ?? null,
      severity: safePayload.severity ?? null,
    },
  }).catch(() => {});

  return { id: snap.id };
}

/** [ENABLEMENT GATE: STAGE 6 - INCIDENT REPORTING]
 *
 * createIncidentReport(data)
 *
 * Stage 6 simplified incident reporting API that automatically attaches:
 * - organisationId (from user context)
 * - reporterId (current user uid)
 * - createdAt (serverTimestamp)
 *
 * Required fields:
 * - title, occurredAt (JS Date), location, severity (low|medium|high), description, patientId
 */
export async function createIncidentReport({
  title,
  occurredAt,
  location,
  severity,
  description,
  patientId,
}) {
  const ctx = await getUserContext();
  const { organisationId } = ctx;
  const reporterId = auth.currentUser?.uid || null;

  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!reporterId) throw new Error("Governance Error: reporterId is required.");
  if (!patientId?.trim()) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!title?.trim()) throw new Error("title is required");
  if (!description?.trim()) throw new Error("description is required");
  if (!location?.trim()) throw new Error("location is required");
  if (!severity?.trim()) throw new Error("severity is required");
  if (!(occurredAt instanceof Date) || isNaN(occurredAt.getTime())) {
    throw new Error("occurredAt (Date) is required");
  }

  const patient = await getPatientById(patientId.trim());
  const hospitalId = (patient.hospitalId && String(patient.hospitalId).trim()) || "";
  const wardId = (patient.wardId && String(patient.wardId).trim()) || "";
  assertRequiredWriteContext({
    organisationId,
    hospitalId,
    userId: reporterId,
  });
  assertTenantContext(organisationId, hospitalId);

  const incidentsRef = collection(db, INCIDENTS_COLLECTION);
  const incidentDoc = {
    incidentId: "",
    organisationId,
    hospitalId,
    wardId,
    patientId: patientId.trim(),
    title: title.trim(),
    location: location.trim(),
    severity: severity.toLowerCase(),
    description: description.trim(),
    occurredAt, // stored as Timestamp by Firestore SDK
    reporterId,
    createdAt: serverTimestamp(),
    status: "open",
  };

  const snap = await addDoc(incidentsRef, incidentDoc);
  const incidentId = snap.id;
  await updateDoc(snap, { incidentId });

  await logAuditEventNonBlocking({
    action: "INCIDENT_REPORT_CREATED",
    incidentId,
    patientId: patientId.trim(),
    severity: severity.toLowerCase(),
  }).catch(() => {});

  return { id: incidentId };
}

/** [ENABLEMENT GATE: STAGE 6 - INCIDENT REPORTING]
 *
 * fetchIncidentsForPatient(patientId)
 *
 * Returns recent incidents for a single patient, scoped to current org.
 */
export async function fetchIncidentsForPatient(patientId, { limitCount = 20 } = {}) {
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!patientId?.trim()) return [];

  // Validate tenant scope for this patient (organisation + hospital).
  await getPatientById(patientId.trim());

  const ref = collection(db, INCIDENTS_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", organisationId),
    where("patientId", "==", patientId.trim()),
    orderBy("createdAt", "desc"),
    limit(typeof limitCount === "number" ? limitCount : 20)
  );

  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      incidentId: x.incidentId ?? d?.id ?? "",
      patientId: x.patientId ?? "",
      title: x.title ?? "",
      location: x.location ?? "",
      severity: x.severity ?? "",
      description: x.description ?? "",
      occurredAt: x.occurredAt ?? null,
      createdAt: x.createdAt ?? null,
      reporterId: x.reporterId ?? "",
      status: x.status ?? "open",
    };
  });
}

/**
 * Fetch incidents for an organisation with optional filters.
 *
 * @param {string} organisationId
 * @param {{ serviceId?: string | null, severity?: string | null, status?: string | null }} [filters]
 * @returns {Promise<Array<any>>}
 */
export async function fetchIncidents(organisationId, filters = {}) {
  if (!organisationId?.trim()) return [];

  const { serviceId, severity, status } = filters;
  const { hospitalId: ctxHospitalId } = await getUserContext().catch(() => ({}));
  const ref = collection(db, INCIDENTS_COLLECTION);

  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("reportedAt", "desc"),
  ];

  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  if (severity) constraints.push(where("severity", "==", severity));
  if (status) constraints.push(where("status", "==", status));

  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  const mapped = docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      incidentId: x.incidentId ?? d?.id ?? "",
      patientId: x.patientId ?? "",
      organisationId: x.organisationId ?? organisationId,
      serviceId: x.serviceId ?? null,
      type: x.type ?? "",
      severity: x.severity ?? "",
      description: x.description ?? "",
      reportedBy: x.reportedBy ?? "",
      reportedAt: x.reportedAt ?? null,
      status: x.status ?? "open",
      actionsTaken: x.actionsTaken ?? "",
      linkedEvidence: Array.isArray(x.linkedEvidence) ? x.linkedEvidence : [],
    };
  });
  mapped.forEach((row) => assertSameOrganisationData(row.organisationId, organisationId));

  // Hospital boundary enforcement for organisation-scoped incident listings.
  // Incidents themselves are scoped by organisationId only; we filter by the patient's hospitalId.
  if (ctxHospitalId) {
    const uniquePatientIds = Array.from(
      new Set(mapped.map((r) => (r.patientId ?? "").toString().trim()).filter(Boolean))
    );
    const hospitalByPatientId = new Map();
    await Promise.all(
      uniquePatientIds.map(async (pid) => {
        try {
          const snap = await getDoc(doc(db, "patients", pid));
          const x = snap?.data?.() ?? {};
          const orgOk = x.organisationId ? x.organisationId === organisationId : true;
          const hosp = typeof x.hospitalId === "string" ? x.hospitalId : null;
          hospitalByPatientId.set(pid, orgOk ? hosp : null);
        } catch {
          hospitalByPatientId.set(pid, null);
        }
      })
    );

    return mapped.filter((r) => hospitalByPatientId.get(String(r.patientId ?? "").trim()) === ctxHospitalId);
  }

  return mapped;
}

