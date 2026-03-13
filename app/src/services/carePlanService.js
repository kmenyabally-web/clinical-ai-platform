import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { addTimelineEntry } from "./patientTimelineService";
import { recalculateComplianceScoreAsync } from "./complianceEngine";

const CARE_PLANS_COLLECTION = "carePlans";
const PATIENT_TIMELINE_COLLECTION = "patientTimeline";

/**
 * Fetch care plans for a patient within an organisation/service.
 * Always filters by organisationId and patientId, and optionally by serviceId.
 */
export async function fetchCarePlans(organisationId, patientId, serviceId) {
  if (!organisationId?.trim() || !patientId?.trim()) return [];

  const ref = collection(db, CARE_PLANS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId),
    where("patientId", "==", patientId),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));

  // Updated first, then created
  const q = query(ref, ...constraints, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      carePlanId: x.carePlanId ?? d?.id ?? "",
      patientId: x.patientId ?? patientId,
      organisationId: x.organisationId ?? organisationId,
      serviceId: x.serviceId ?? serviceId ?? null,
      title: x.title ?? "",
      description: x.description ?? "",
      goals: x.goals ?? "",
      interventions: x.interventions ?? "",
      reviewDate: x.reviewDate ?? null,
      createdBy: x.createdBy ?? "",
      createdAt: x.createdAt ?? null,
      updatedAt: x.updatedAt ?? null,
    };
  });
}

/**
 * Create a new care plan and record a timeline event.
 */
export async function createCarePlan({
  organisationId,
  serviceId,
  patientId,
  title,
  description,
  goals,
  interventions,
  reviewDate,
  createdBy,
}) {
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  if (!serviceId?.trim()) throw new Error("serviceId is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  if (!title?.trim()) throw new Error("title is required");
  if (!createdBy?.trim()) throw new Error("createdBy is required");

  const ref = collection(db, CARE_PLANS_COLLECTION);
  const now = serverTimestamp();

  const payload = {
    carePlanId: "",
    patientId,
    organisationId,
    serviceId,
    title: title.trim(),
    description: description?.trim() || "",
    goals: goals?.trim() || "",
    interventions: interventions?.trim() || "",
    reviewDate: reviewDate ?? null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  const snap = await addDoc(ref, payload);
  const carePlanId = snap.id;
  await updateDoc(snap, { carePlanId });

  await addTimelineEvent({
    patientId,
    organisationId,
    serviceId,
    carePlanId,
    title,
    createdBy,
    action: "created",
  });

  await addTimelineEntry({
    organisationId,
    patientId,
    serviceId,
    eventType: "care_plan",
    eventTitle: "Care plan updated",
    eventDescription: `${title.trim()} created`,
    sourceCollection: CARE_PLANS_COLLECTION,
    sourceId: carePlanId,
    createdBy,
    metadata: { action: "created" },
  }).catch((err) => console.error("Timeline entry failed:", err));

  recalculateComplianceScoreAsync(organisationId, serviceId);

  return { id: carePlanId };
}

/**
 * Update an existing care plan and record a timeline event.
 */
export async function updateCarePlan({
  id,
  organisationId,
  serviceId,
  patientId,
  title,
  description,
  goals,
  interventions,
  reviewDate,
  updatedBy,
}) {
  if (!id?.trim()) throw new Error("carePlan id is required");
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  if (!serviceId?.trim()) throw new Error("serviceId is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  if (!title?.trim()) throw new Error("title is required");
  if (!updatedBy?.trim()) throw new Error("updatedBy is required");

  const ref = doc(db, CARE_PLANS_COLLECTION, id);
  const now = serverTimestamp();

  const updates = {
    title: title.trim(),
    description: description?.trim() || "",
    goals: goals?.trim() || "",
    interventions: interventions?.trim() || "",
    reviewDate: reviewDate ?? null,
    updatedAt: now,
  };

  await updateDoc(ref, updates);

  await addTimelineEvent({
    patientId,
    organisationId,
    serviceId,
    carePlanId: id,
    title,
    createdBy: updatedBy,
    action: "updated",
  });

  await addTimelineEntry({
    organisationId,
    patientId,
    serviceId,
    eventType: "care_plan",
    eventTitle: "Care plan updated",
    eventDescription: `${title.trim()} updated`,
    sourceCollection: CARE_PLANS_COLLECTION,
    sourceId: id,
    createdBy: updatedBy,
    metadata: { action: "updated" },
  }).catch((err) => console.error("Timeline entry failed:", err));

  recalculateComplianceScoreAsync(organisationId, serviceId);
}

async function addTimelineEvent({
  patientId,
  organisationId,
  serviceId,
  carePlanId,
  title,
  createdBy,
  action,
}) {
  const ref = collection(db, PATIENT_TIMELINE_COLLECTION);
  const now = serverTimestamp();
  await addDoc(ref, {
    eventId: carePlanId,
    patientId,
    organisationId,
    serviceId,
    type: "care_plan_update",
    description: `${title.trim()} ${action}`,
    createdBy,
    createdAt: now,
    metadata: {
      carePlanId,
      action,
      entityType: "carePlan",
    },
  });
}

