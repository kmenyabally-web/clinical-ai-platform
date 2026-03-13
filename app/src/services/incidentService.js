import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { addTimelineEntry } from "./patientTimelineService";
import { recalculateComplianceScoreAsync } from "./complianceEngine";

const INCIDENTS_COLLECTION = "incidents";
const PATIENT_TIMELINE_COLLECTION = "patientTimeline";

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
 * Create an incident and a linked patientTimeline event.
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
export async function createIncident({
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
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  if (!serviceId?.trim()) throw new Error("serviceId is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  if (!type?.trim()) throw new Error("type is required");
  if (!severity?.trim()) throw new Error("severity is required");
  if (!description?.trim()) throw new Error("description is required");
  if (!reportedBy?.trim()) throw new Error("reportedBy is required");

  const incidentsRef = collection(db, INCIDENTS_COLLECTION);
  const now = serverTimestamp();

  const incidentDoc = {
    incidentId: "",
    patientId,
    organisationId,
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

  // Legacy: patientTimeline collection (existing behaviour).
  const timelineRef = collection(db, PATIENT_TIMELINE_COLLECTION);
  await addDoc(timelineRef, {
    eventId: incidentId,
    patientId,
    organisationId,
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

  return docs.map((d) => {
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
}

