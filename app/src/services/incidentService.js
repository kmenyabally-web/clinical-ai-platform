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
import { getCurrentUserProfile } from "./organisation";
import { getPatientById } from "./patientService";
import { logAuditEventNonBlocking } from "./auditService";
import {
  assertTenantContext,
  tenantFieldsFromContext,
  assertSameOrganisationData,
  GENERIC_USER_ERROR_MESSAGE,
  normalizeHospitalScopeId,
} from "../utils/tenantContext";
import { orgIncidentsCollection, orgIncidentDocumentRef } from "../utils/tenantCollections";

const INCIDENTS_COLLECTION = "incidents";

function mergeIncidentDocsById(snapA, snapB) {
  const map = new Map();
  for (const d of [...(snapA?.docs ?? []), ...(snapB?.docs ?? [])]) {
    if (d?.id && !map.has(d.id)) map.set(d.id, d);
  }
  return [...map.values()];
}

async function resolveIncidentWriteRef(organisationId, incidentId) {
  const id = (incidentId ?? "").toString().trim();
  if (!id) throw new Error("incidentId is required.");
  const nested = orgIncidentDocumentRef(db, organisationId, id);
  const nSnap = await getDoc(nested);
  if (nSnap?.exists?.()) return nested;
  const root = doc(db, INCIDENTS_COLLECTION, id);
  const rSnap = await getDoc(root);
  if (!rSnap?.exists?.()) throw new Error("Incident not found.");
  const cur = rSnap.data() ?? {};
  if ((cur.organisationId ?? "").toString().trim() !== (organisationId ?? "").toString().trim()) {
    throw new Error("Organisation scope mismatch.");
  }
  return root;
}
const PATIENT_TIMELINE_COLLECTION = "patientTimeline";

function assertRequiredWriteContext({ organisationId, hospitalId, userId }) {
  if (!organisationId) throw new Error("Missing organisation");
  if (!hospitalId) throw new Error("Missing hospital");
  if (!userId) throw new Error("Missing user");
}

/** Sort key for incident rows (reportedAt preferred; legacy may use createdAt). */
function incidentTimeMillisFromData(x) {
  const v = x?.reportedAt ?? x?.createdAt ?? null;
  if (!v) return 0;
  if (typeof v === "object" && v !== null && typeof v.toMillis === "function") {
    try {
      return v.toMillis();
    } catch {
      return 0;
    }
  }
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
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
 * Scoped by organisation + patient hospital/ward (no service requirement).
 *
 * @param {Object} params
 * @param {string} params.organisationId
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

  const incidentsRef = orgIncidentsCollection(db, organisationId);
  const now = serverTimestamp();

  const incidentDoc = {
    incidentId: "",
    patientId,
    organisationId,
    hospitalId,
    wardId,
    type,
    severity,
    description: description.trim(),
    reportedBy,
    reportedAt: now,
    status,
    actionsTaken: actionsTaken?.trim() || "",
    actionTaken: actionsTaken?.trim() || "",
    linkedSafeguardingIds: [],
    linkedEvidence: Array.isArray(linkedEvidence) ? linkedEvidence : [],
    ...(auth.currentUser?.uid ? { createdBy: auth.currentUser.uid } : {}),
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
    serviceId: null,
    eventType,
    eventTitle,
    eventDescription: description.trim(),
    sourceCollection: INCIDENTS_COLLECTION,
    sourceId: incidentId,
    createdBy: reportedBy,
    metadata: { severity, status, incidentType: type },
  }).catch((err) => console.error("Timeline entry failed:", err));

  recalculateComplianceScoreAsync(organisationId, null);

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

  const incidentsRef = orgIncidentsCollection(db, orgId);
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

  const incidentsRef = orgIncidentsCollection(db, organisationId);
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

  const lim = typeof limitCount === "number" ? limitCount : 20;
  const nestedRef = orgIncidentsCollection(db, organisationId);
  const rootRef = collection(db, INCIDENTS_COLLECTION);
  let nestedSnap = { docs: [] };
  try {
    nestedSnap = await getDocs(
      query(
        nestedRef,
        where("patientId", "==", patientId.trim()),
        orderBy("createdAt", "desc"),
        limit(lim)
      )
    );
  } catch (e) {
    try {
      nestedSnap = await getDocs(query(nestedRef, where("patientId", "==", patientId.trim()), limit(lim)));
    } catch (e2) {
      console.warn("[incidentService] nested patient incidents skipped", e2);
    }
  }
  let rootSnap = { docs: [] };
  try {
    rootSnap = await getDocs(
      query(
        rootRef,
        where("organisationId", "==", organisationId),
        where("patientId", "==", patientId.trim()),
        orderBy("createdAt", "desc"),
        limit(lim)
      )
    );
  } catch {
    rootSnap = await getDocs(
      query(rootRef, where("organisationId", "==", organisationId), where("patientId", "==", patientId.trim()), limit(lim))
    );
  }
  const docs = mergeIncidentDocsById(nestedSnap, rootSnap);
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
 * Scoped by organisationId; optional hospital/ward filters apply client-side after fetch.
 *
 * @param {string} organisationId
 * @param {{ hospitalId?: string | null, wardId?: string | null, severity?: string | null, status?: string | null }} [filters]
 * @returns {Promise<Array<any>>}
 */
export async function fetchIncidents(organisationId, filters = {}) {
  if (!organisationId?.trim()) return [];

  const { hospitalId: filterHospitalId, wardId: filterWardId, severity, status } = filters;
  const ctx = await getUserContext().catch(() => ({}));
  const ctxHospitalId = ctx?.hospitalId ?? null;
  const roleUpper = (ctx?.role ?? "").toString().trim().toUpperCase();
  const profile =
    auth.currentUser?.uid != null ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const skipOrgWideHospitalScope =
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "GLOBAL_ADMIN" ||
    roleUpper === "GROUP_ADMIN" ||
    profile?.isGlobalAdmin === true;

  const rootRef = collection(db, INCIDENTS_COLLECTION);
  const nestedRef = orgIncidentsCollection(db, organisationId);

  const buildRootConstraints = (includeOrderBy) => {
    const c = [where("organisationId", "==", organisationId)];
    if (severity) c.push(where("severity", "==", severity));
    if (status) c.push(where("status", "==", status));
    if (includeOrderBy) c.push(orderBy("reportedAt", "desc"));
    c.push(limit(500));
    return c;
  };

  const buildNestedConstraints = (includeOrderBy) => {
    const c = [];
    if (severity) c.push(where("severity", "==", severity));
    if (status) c.push(where("status", "==", status));
    if (includeOrderBy) c.push(orderBy("reportedAt", "desc"));
    c.push(limit(500));
    return c;
  };

  let nestedSnap = { docs: [] };
  try {
    nestedSnap = await getDocs(query(nestedRef, ...buildNestedConstraints(true)));
  } catch (err) {
    console.warn("Nested incidents query failed; using fallback without orderBy", err);
    try {
      nestedSnap = await getDocs(query(nestedRef, ...buildNestedConstraints(false)));
    } catch (e2) {
      console.warn("[incidentService] nested incidents list skipped", e2);
    }
  }

  let rootSnap;
  try {
    rootSnap = await getDocs(query(rootRef, ...buildRootConstraints(true)));
  } catch (err) {
    console.warn("Primary incidents query failed; using fallback without orderBy", err);
    rootSnap = await getDocs(query(rootRef, ...buildRootConstraints(false)));
  }
  const docs = mergeIncidentDocsById(nestedSnap, rootSnap);

  let mapped = docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      incidentId: x.incidentId ?? d?.id ?? "",
      patientId: x.patientId ?? "",
      organisationId: x.organisationId ?? organisationId,
      hospitalId: typeof x.hospitalId === "string" ? x.hospitalId : "",
      wardId: typeof x.wardId === "string" ? x.wardId : "",
      type: x.type ?? "",
      severity: x.severity ?? "",
      description: x.description ?? "",
      reportedBy: x.reportedBy ?? "",
      reportedAt: x.reportedAt ?? x.createdAt ?? null,
      status: x.status ?? "open",
      actionsTaken: x.actionsTaken ?? "",
      actionTaken: typeof x.actionTaken === "string" ? x.actionTaken : x.actionsTaken ?? "",
      incidentType: x.incidentType ?? x.type ?? "",
      linkedSafeguardingIds: Array.isArray(x.linkedSafeguardingIds) ? x.linkedSafeguardingIds : [],
      linkedEvidence: Array.isArray(x.linkedEvidence) ? x.linkedEvidence : [],
    };
  });
  mapped.sort((a, b) => incidentTimeMillisFromData(b) - incidentTimeMillisFromData(a));
  mapped.forEach((row) => assertSameOrganisationData(row.organisationId, organisationId));

  const fh = filterHospitalId ? String(filterHospitalId).trim() : "";
  const fw = filterWardId ? String(filterWardId).trim() : "";
  if (fh) mapped = mapped.filter((r) => (r.hospitalId ?? "") === fh);
  if (fw) mapped = mapped.filter((r) => (r.wardId ?? "") === fw);

  const scopedHospital = normalizeHospitalScopeId(ctxHospitalId);
  if (scopedHospital && !skipOrgWideHospitalScope) {
    const uniquePatientIds = Array.from(
      new Set(mapped.map((r) => (r.patientId ?? "").toString().trim()).filter(Boolean))
    );
    const hospitalByPatientId = new Map();
    await Promise.all(
      uniquePatientIds.map(async (pid) => {
        try {
          const p = await getPatientById(pid);
          const orgOk = (p.organisationId ?? "") === organisationId;
          const hosp = typeof p.hospitalId === "string" ? p.hospitalId : null;
          hospitalByPatientId.set(pid, orgOk ? hosp : null);
        } catch {
          hospitalByPatientId.set(pid, null);
        }
      })
    );

    return mapped.filter((r) => hospitalByPatientId.get(String(r.patientId ?? "").trim()) === scopedHospital);
  }

  return mapped;
}

/**
 * Update an open incident (description, severity, type, actions) before closure.
 */
export async function updateIncident(incidentId, updates = {}) {
  const id = (incidentId ?? "").toString().trim();
  if (!id) throw new Error("incidentId is required.");

  const ctx = await getUserContext();
  const orgId = (ctx?.organisationId ?? "").toString().trim();
  const uid = auth.currentUser?.uid ?? null;
  if (!orgId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!uid) throw new Error("You must be signed in.");

  const ref = await resolveIncidentWriteRef(orgId, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Incident not found.");
  const cur = snap.data() ?? {};
  if ((cur.organisationId ?? "").toString().trim() !== orgId) {
    throw new Error("Organisation scope mismatch.");
  }
  const st = (cur.status ?? "open").toString().trim().toLowerCase();
  if (st === "closed") throw new Error("Closed incidents cannot be edited.");

  const patch = {};
  if (typeof updates.description === "string") patch.description = updates.description.trim();
  if (typeof updates.severity === "string") patch.severity = updates.severity.trim().toLowerCase();
  if (typeof updates.type === "string") patch.type = updates.type.trim();
  if (typeof updates.incidentType === "string") patch.incidentType = updates.incidentType.trim();
  if (typeof updates.actionTaken === "string") patch.actionTaken = updates.actionTaken.trim();
  if (typeof updates.actionsTaken === "string") patch.actionsTaken = updates.actionsTaken.trim();
  if (Array.isArray(updates.linkedSafeguardingIds)) {
    patch.linkedSafeguardingIds = updates.linkedSafeguardingIds.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof updates.title === "string") patch.title = updates.title.trim();

  patch.updatedAt = serverTimestamp();
  patch.updatedBy = uid;

  await updateDoc(ref, patch);

  await logAuditEventNonBlocking({
    action: "INCIDENT_UPDATED",
    incidentId: id,
    organisationId: orgId,
    patientId: cur.patientId ?? null,
    metadata: { fields: Object.keys(patch) },
  }).catch(() => {});

  await addDoc(collection(db, "audit_logs"), {
    action: "UPDATE_INCIDENT",
    entityType: "incident",
    entityId: id,
    organisationId: orgId,
    performedBy: uid,
    timestamp: serverTimestamp(),
    metadata: { keys: Object.keys(patch) },
  }).catch(() => {});

  return { ok: true };
}

/**
 * Close an incident (status: closed).
 */
export async function closeIncident(incidentId, { closureNote = "" } = {}) {
  const id = (incidentId ?? "").toString().trim();
  if (!id) throw new Error("incidentId is required.");

  const ctx = await getUserContext();
  const orgId = (ctx?.organisationId ?? "").toString().trim();
  const uid = auth.currentUser?.uid ?? null;
  if (!orgId) throw new Error(GENERIC_USER_ERROR_MESSAGE);
  if (!uid) throw new Error("You must be signed in.");

  const ref = await resolveIncidentWriteRef(orgId, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Incident not found.");
  const cur = snap.data() ?? {};
  if ((cur.organisationId ?? "").toString().trim() !== orgId) {
    throw new Error("Organisation scope mismatch.");
  }

  await updateDoc(ref, {
    status: "closed",
    closedAt: serverTimestamp(),
    closedBy: uid,
    ...(closureNote?.trim() ? { closureNote: closureNote.trim() } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  await logAuditEventNonBlocking({
    action: "INCIDENT_CLOSED",
    incidentId: id,
    organisationId: orgId,
    patientId: cur.patientId ?? null,
  }).catch(() => {});

  await addDoc(collection(db, "audit_logs"), {
    action: "CLOSE_INCIDENT",
    entityType: "incident",
    entityId: id,
    organisationId: orgId,
    performedBy: uid,
    timestamp: serverTimestamp(),
    metadata: {},
  }).catch(() => {});

  return { ok: true };
}

