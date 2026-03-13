import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

/** Firestore collection for the unified patient timeline (all event types). */
export const PATIENT_TIMELINE_COLLECTION = "patient_timeline";

/** Supported event types for the timeline. */
export const TIMELINE_EVENT_TYPES = [
  "clinical_note",
  "incident",
  "safeguarding",
  "care_plan",
  "document",
  "medication",
  "assessment",
];

/**
 * Add a timeline entry. Call this when creating/updating clinical notes, incidents,
 * safeguarding, care plans, or document uploads. All queries must include organisationId.
 *
 * @param {Object} params
 * @param {string} params.organisationId
 * @param {string} params.patientId
 * @param {string} [params.serviceId]
 * @param {string} params.eventType - One of TIMELINE_EVENT_TYPES
 * @param {string} params.eventTitle
 * @param {string} [params.eventDescription]
 * @param {string} [params.sourceCollection] - e.g. "incidents", "carePlans", "evidence"
 * @param {string} [params.sourceId]
 * @param {string} params.createdBy
 * @param {Object} [params.metadata] - Optional extra (e.g. severity, location)
 * @returns {Promise<string>} New document id
 */
export async function addTimelineEntry({
  organisationId,
  patientId,
  serviceId,
  eventType,
  eventTitle,
  eventDescription = "",
  sourceCollection = "",
  sourceId = "",
  createdBy,
  metadata = null,
}) {
  if (!organisationId?.trim() || !patientId?.trim()) {
    throw new Error("organisationId and patientId are required");
  }
  if (!eventType || !eventTitle?.trim() || !createdBy?.trim()) {
    throw new Error("eventType, eventTitle and createdBy are required");
  }

  const ref = collection(db, PATIENT_TIMELINE_COLLECTION);
  const doc = {
    organisationId: organisationId.trim(),
    patientId: patientId.trim(),
    serviceId: serviceId ?? null,
    eventType: String(eventType),
    eventTitle: String(eventTitle).trim(),
    eventDescription: String(eventDescription ?? "").trim(),
    sourceCollection: String(sourceCollection ?? ""),
    sourceId: String(sourceId ?? ""),
    createdBy: String(createdBy).trim(),
    createdAt: serverTimestamp(),
  };
  if (metadata != null && typeof metadata === "object") {
    doc.metadata = metadata;
  }

  const snap = await addDoc(ref, doc);

  if (
    (eventType === "clinical_note" || eventType === "assessment") &&
    organisationId?.trim() &&
    (serviceId != null && serviceId !== "")
  ) {
    import("./complianceEngine").then(({ recalculateComplianceScoreAsync }) => {
      recalculateComplianceScoreAsync(organisationId, serviceId);
    }).catch(() => {});
  }

  return snap.id;
}

/**
 * Fetch patient timeline events. Always filters by organisationId and patientId.
 * Optional: serviceId (as third arg or in options), eventType, dateFrom, dateTo (ISO strings). Sorted by createdAt desc.
 *
 * Firestore index required: patient_timeline (organisationId ASC, patientId ASC, createdAt DESC).
 * If filtering by serviceId: (organisationId, patientId, serviceId, createdAt DESC).
 *
 * @param {string} organisationId
 * @param {string} patientId
 * @param {string|object|null} [serviceIdOrOptions] - serviceId string or options { serviceId, eventType, dateFrom, dateTo }
 */
export async function fetchPatientTimeline(organisationId, patientId, serviceIdOrOptions = {}) {
  if (!organisationId?.trim() || !patientId?.trim()) {
    return [];
  }

  const options =
    serviceIdOrOptions != null && typeof serviceIdOrOptions === "object" && !Array.isArray(serviceIdOrOptions)
      ? serviceIdOrOptions
      : { serviceId: serviceIdOrOptions ?? null };
  const { serviceId = null, eventType = null, dateFrom = null, dateTo = null } = options;
  const ref = collection(db, PATIENT_TIMELINE_COLLECTION);

  const constraints = [
    where("organisationId", "==", organisationId.trim()),
    where("patientId", "==", patientId.trim()),
    orderBy("createdAt", "desc"),
  ];

  if (serviceId != null && serviceId !== "") {
    constraints.splice(constraints.length - 1, 0, where("serviceId", "==", serviceId));
  }

  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  let list = docs.map((d) => mapDocToEvent(d));

  if (eventType) {
    list = list.filter((e) => e.eventType === eventType);
  }
  if (dateFrom) {
    const t = new Date(dateFrom).getTime();
    list = list.filter((e) => (e.createdAt ? toMillis(e.createdAt) : 0) >= t);
  }
  if (dateTo) {
    const t = new Date(dateTo).getTime();
    list = list.filter((e) => (e.createdAt ? toMillis(e.createdAt) : 0) <= t);
  }

  return list;
}

/**
 * Fetch clinical notes for an organisation, optionally filtered by serviceId.
 * Uses organisationId-scoped query; filters by eventType "clinical_note" client-side.
 * All queries include organisationId for multi-tenant safety.
 *
 * @param {string} organisationId
 * @param {{ serviceId?: string | null, limitCount?: number }} [options]
 * @returns {Promise<Array<any>>}
 */
export async function fetchClinicalNotesForOrganisation(organisationId, options = {}) {
  if (!organisationId?.trim()) return [];
  const limitCount = options?.limitCount ?? 300;
  const ref = collection(db, PATIENT_TIMELINE_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", organisationId.trim()),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  let list = docs.map((d) => mapDocToEvent(d));
  list = list.filter((e) => e.eventType === "clinical_note");
  if (options?.serviceId != null && options.serviceId !== "") {
    list = list.filter((e) => e.serviceId === options.serviceId);
  }
  return list;
}

/**
 * Subscribe to patient timeline in real time. Uses Firestore onSnapshot.
 * Always filters by organisationId and patientId. Optional serviceId.
 *
 * @param {string} organisationId
 * @param {string} patientId
 * @param {string|null} serviceId
 * @param {(events: Array<any>) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribePatientTimeline(organisationId, patientId, serviceId, onUpdate) {
  if (!organisationId?.trim() || !patientId?.trim()) {
    onUpdate([]);
    return () => {};
  }

  const ref = collection(db, PATIENT_TIMELINE_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId.trim()),
    where("patientId", "==", patientId.trim()),
    orderBy("createdAt", "desc"),
  ];
  if (serviceId != null && serviceId !== "") {
    constraints.splice(constraints.length - 1, 0, where("serviceId", "==", serviceId));
  }

  const q = query(ref, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot?.docs ?? [];
      const list = docs.map((d) => mapDocToEvent(d));
      onUpdate(list);
    },
    (err) => {
      console.error("Patient timeline subscription error:", err);
      onUpdate([]);
    }
  );
}

/**
 * Backward-compatible helper: add an event using legacy shape (type, title, description).
 * Writes to patient_timeline with eventType = type, eventTitle = title, eventDescription = description.
 * Used by evidence, incidents, care plans until they call addTimelineEntry directly.
 */
export async function addPatientTimelineEvent({
  eventId,
  patientId,
  organisationId,
  serviceId,
  type,
  title,
  description,
  createdBy,
  metadata,
}) {
  if (!organisationId?.trim() || !patientId?.trim()) return null;
  const eventType = type === "care_plan_update" ? "care_plan" : type === "evidence_upload" ? "document" : type || "clinical_note";
  try {
    return await addTimelineEntry({
      organisationId,
      patientId,
      serviceId: serviceId ?? null,
      eventType,
      eventTitle: title?.trim() || "Event",
      eventDescription: description ?? "",
      sourceCollection: metadata?.entityType === "carePlan" ? "carePlans" : metadata?.collection ?? "",
      sourceId: eventId ?? "",
      createdBy: createdBy ?? "",
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error("addPatientTimelineEvent failed:", e);
    return null;
  }
}

/**
 * Seed sample timeline events for testing. Creates one event per TIMELINE_EVENT_TYPES (or subset).
 */
export async function seedTimelineTestData(organisationId, patientId, serviceId, createdBy, count = 5) {
  if (!organisationId?.trim() || !patientId?.trim() || !createdBy?.trim()) {
    throw new Error("organisationId, patientId and createdBy required for seed");
  }

  const titles = [
    { eventType: "clinical_note", eventTitle: "Clinical note added", eventDescription: "Routine assessment completed." },
    { eventType: "incident", eventTitle: "Incident reported", eventDescription: "Minor fall in corridor. No injury." },
    { eventType: "safeguarding", eventTitle: "Safeguarding alert created", eventDescription: "Concern raised and logged." },
    { eventType: "care_plan", eventTitle: "Care plan updated", eventDescription: "Goals and interventions reviewed." },
    { eventType: "document", eventTitle: "Document uploaded", eventDescription: "Care plan PDF uploaded." },
  ];

  const toCreate = titles.slice(0, Math.min(count, titles.length));
  const ids = [];
  for (const t of toCreate) {
    const id = await addTimelineEntry({
      organisationId,
      patientId,
      serviceId: serviceId ?? null,
      eventType: t.eventType,
      eventTitle: t.eventTitle,
      eventDescription: t.eventDescription,
      sourceCollection: "test",
      sourceId: "",
      createdBy,
      metadata: { seeded: true },
    });
    ids.push(id);
  }
  return ids;
}

function toMillis(v) {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
}

function mapDocToEvent(d) {
  const x = d?.data?.() ?? {};
  return {
    id: d?.id ?? "",
    organisationId: x.organisationId ?? "",
    patientId: x.patientId ?? "",
    serviceId: x.serviceId ?? null,
    eventType: x.eventType ?? "clinical_note",
    eventTitle: x.eventTitle ?? "",
    eventDescription: x.eventDescription ?? "",
    sourceCollection: x.sourceCollection ?? "",
    sourceId: x.sourceId ?? "",
    createdBy: x.createdBy ?? "",
    createdAt: x.createdAt ?? null,
    metadata: x.metadata ?? null,
  };
}
