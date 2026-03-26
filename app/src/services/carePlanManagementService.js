import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { addTimelineEntry } from "./patientTimelineService";
import { getPatientById } from "./patientService";
import { assertTenantContext, TENANT_UNSCOPED_WARD } from "../utils/tenantContext";

const CARE_PLANS_COLLECTION = "care_plans";
const CARE_PLAN_VERSIONS_COLLECTION = "care_plan_versions";

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  return isNaN(d.getTime()) ? null : d;
}

function normaliseStatus(status) {
  if (status === "draft") return "draft";
  const allowed = ["active", "review_due", "archived"];
  if (!status || !allowed.includes(status)) return "active";
  return status;
}

function snapshotFromDoc(d) {
  const x = d?.data?.() ?? {};
  return {
    id: d?.id ?? "",
    organisationId: x.organisationId ?? "",
    hospitalId: x.hospitalId ?? "",
    wardId: x.wardId ?? "",
    serviceId: x.serviceId ?? null,
    patientId: x.patientId ?? "",
    careNeeds: x.careNeeds ?? "",
    riskAssessment: x.riskAssessment ?? "",
    supportStrategies: x.supportStrategies ?? "",
    reviewDate: x.reviewDate ?? null,
    status: normaliseStatus(x.status),
    createdBy: x.createdBy ?? "",
    createdAt: x.createdAt ?? null,
    updatedAt: x.updatedAt ?? null,
    version: typeof x.version === "number" ? x.version : 1,
    content: typeof x.content === "string" ? x.content : "",
  };
}

/** AI draft rows in `care_plans`: full text + draft status (separate from structured care plan records). */
export async function saveAiCarePlanDraft({ organisationId, patientId, content }) {
  const org = (organisationId ?? "").trim() || null;
  if (!org) throw new Error("organisationId is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  const body = String(content ?? "").trim();
  if (!body) throw new Error("content is required");

  const patient = await getPatientById(patientId.trim());
  const hospitalId = (patient.hospitalId && String(patient.hospitalId).trim()) || "";
  const wardId = (patient.wardId && String(patient.wardId).trim()) || TENANT_UNSCOPED_WARD;
  assertTenantContext(org, hospitalId);

  const ref = collection(db, CARE_PLANS_COLLECTION);
  const payload = {
    organisationId: org,
    hospitalId,
    wardId,
    patientId: patientId.trim(),
    content: body,
    status: "draft",
    createdAt: serverTimestamp(),
  };
  const snap = await addDoc(ref, payload);
  return { id: snap.id };
}

/** All care plan documents for a patient (AI drafts and structured records). */
export async function listCarePlansForPatient(organisationId, patientId, { limitCount = 200 } = {}) {
  const org = (organisationId ?? "").trim();
  const pid = (patientId ?? "").trim();
  if (!org || !pid) return [];

  const ref = collection(db, CARE_PLANS_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const rows = docs.map((d) => snapshotFromDoc(d));
  rows.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return rows;
}

/** List AI-saved drafts for a patient (documents with status "draft" and `content`). */
export async function listAiCarePlanDraftsForPatient(organisationId, patientId, { limitCount = 25 } = {}) {
  const org = (organisationId ?? "").trim() || null;
  if (!org) return [];
  if (!patientId?.trim()) return [];

  const ref = collection(db, CARE_PLANS_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", org),
    where("patientId", "==", patientId.trim()),
    where("status", "==", "draft"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs
    .map((d) => {
      const x = d?.data?.() ?? {};
      if (typeof x.content !== "string" || !x.content.trim()) return null;
      return {
        id: d.id,
        organisationId: x.organisationId ?? org,
        patientId: x.patientId ?? patientId,
        content: x.content,
        status: x.status ?? "draft",
        createdAt: x.createdAt ?? null,
      };
    })
    .filter(Boolean);
}

/** List care plans for an organisation (optionally by service). */
export async function listCarePlans(organisationId, { serviceId, limitCount = 100 } = {}) {
  if (!organisationId?.trim()) return [];
  const ref = collection(db, CARE_PLANS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId.trim()),
    orderBy("updatedAt", "desc"),
    limit(limitCount),
  ];
  if (serviceId) {
    constraints.splice(1, 0, where("serviceId", "==", serviceId));
  }
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map(snapshotFromDoc);
}

/** Fetch a single care plan by id, enforcing organisationId. */
export async function getCarePlanById(organisationId, carePlanId) {
  if (!organisationId?.trim() || !carePlanId?.trim()) return null;
  const ref = doc(db, CARE_PLANS_COLLECTION, carePlanId);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) return null;
  const data = snap.data?.() ?? {};
  if (data.organisationId && data.organisationId !== organisationId) return null;
  return snapshotFromDoc(snap);
}

/** List versions for a care plan (latest first). */
export async function listCarePlanVersions(organisationId, carePlanId, { limitCount = 20 } = {}) {
  if (!organisationId?.trim() || !carePlanId?.trim()) return [];
  const ref = collection(db, CARE_PLAN_VERSIONS_COLLECTION);
  const q = query(
    ref,
    where("organisationId", "==", organisationId.trim()),
    where("carePlanId", "==", carePlanId),
    orderBy("version", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      carePlanId: x.carePlanId ?? carePlanId,
      organisationId: x.organisationId ?? organisationId,
      serviceId: x.serviceId ?? null,
      patientId: x.patientId ?? "",
      version: typeof x.version === "number" ? x.version : 1,
      careNeeds: x.careNeeds ?? "",
      riskAssessment: x.riskAssessment ?? "",
      supportStrategies: x.supportStrategies ?? "",
      reviewDate: x.reviewDate ?? null,
      createdAt: x.createdAt ?? null,
      updatedAt: x.updatedAt ?? null,
      snapshotBy: x.snapshotBy ?? "",
    };
  });
}

/** Create a new care plan and first version + timeline entry. */
export async function createCarePlanRecord({
  organisationId,
  serviceId,
  patientId,
  careNeeds,
  riskAssessment,
  supportStrategies,
  reviewDate,
  createdBy,
}) {
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  if (!createdBy?.trim()) throw new Error("createdBy is required");

  const patient = await getPatientById(patientId.trim());
  const hospitalId = (patient.hospitalId && String(patient.hospitalId).trim()) || "";
  const wardId = (patient.wardId && String(patient.wardId).trim()) || TENANT_UNSCOPED_WARD;
  assertTenantContext(organisationId.trim(), hospitalId);

  const now = serverTimestamp();
  const ref = collection(db, CARE_PLANS_COLLECTION);
  const payload = {
    organisationId: organisationId.trim(),
    hospitalId,
    wardId,
    serviceId: serviceId ?? null,
    patientId: patientId.trim(),
    careNeeds: String(careNeeds ?? "").trim(),
    riskAssessment: String(riskAssessment ?? "").trim(),
    supportStrategies: String(supportStrategies ?? "").trim(),
    reviewDate: reviewDate ?? null,
    status: "active",
    createdBy,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const snap = await addDoc(ref, payload);
  const carePlanId = snap.id;
  await updateDoc(snap, { id: carePlanId });

  await addDoc(collection(db, CARE_PLAN_VERSIONS_COLLECTION), {
    ...payload,
    carePlanId,
    snapshotBy: createdBy,
  });

  await addTimelineEntry({
    organisationId,
    patientId,
    hospitalId,
    wardId,
    serviceId,
    eventType: "care_plan_update",
    eventTitle: "Care plan created",
    eventDescription: "Initial care plan created",
    sourceCollection: CARE_PLANS_COLLECTION,
    sourceId: carePlanId,
    createdBy,
    metadata: { action: "created" },
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Firestore query failed:", err);
  });

  return { id: carePlanId };
}

/** Update an existing care plan, record a new version and timeline entry. */
export async function updateCarePlanRecord({
  organisationId,
  id,
  serviceId,
  patientId,
  careNeeds,
  riskAssessment,
  supportStrategies,
  reviewDate,
  status,
  updatedBy,
}) {
  if (!organisationId?.trim()) throw new Error("organisationId is required");
  if (!id?.trim()) throw new Error("carePlan id is required");
  if (!patientId?.trim()) throw new Error("patientId is required");
  if (!updatedBy?.trim()) throw new Error("updatedBy is required");

  const ref = doc(db, CARE_PLANS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Care plan not found");
  const current = snapshotFromDoc(snap);
  if (current.organisationId && current.organisationId !== organisationId) {
    throw new Error("Cross-organisation access denied");
  }

  const nextVersion = (current.version ?? 1) + 1;
  const now = serverTimestamp();
  const updates = {
    careNeeds: String(careNeeds ?? current.careNeeds ?? "").trim(),
    riskAssessment: String(riskAssessment ?? current.riskAssessment ?? "").trim(),
    supportStrategies: String(supportStrategies ?? current.supportStrategies ?? "").trim(),
    reviewDate: reviewDate ?? current.reviewDate ?? null,
    status: normaliseStatus(status ?? current.status),
    updatedAt: now,
    version: nextVersion,
  };

  await updateDoc(ref, updates);

  let vHid = current.hospitalId;
  let vWid = current.wardId;
  if (!vHid?.trim()) {
    const p = await getPatientById(current.patientId.trim());
    vHid = (p.hospitalId && String(p.hospitalId).trim()) || "";
    vWid = (p.wardId && String(p.wardId).trim()) || vWid || TENANT_UNSCOPED_WARD;
  }
  assertTenantContext(current.organisationId, vHid);

  await addDoc(collection(db, CARE_PLAN_VERSIONS_COLLECTION), {
    organisationId: current.organisationId,
    hospitalId: vHid,
    wardId: vWid || TENANT_UNSCOPED_WARD,
    serviceId: current.serviceId,
    patientId: current.patientId,
    carePlanId: current.id,
    version: nextVersion,
    careNeeds: updates.careNeeds,
    riskAssessment: updates.riskAssessment,
    supportStrategies: updates.supportStrategies,
    reviewDate: updates.reviewDate,
    status: updates.status,
    createdAt: current.createdAt,
    updatedAt: now,
    snapshotBy: updatedBy,
  });

  await addTimelineEntry({
    organisationId,
    patientId,
    hospitalId: vHid,
    wardId: vWid || TENANT_UNSCOPED_WARD,
    serviceId: serviceId ?? current.serviceId,
    eventType: "care_plan_update",
    eventTitle: "Care plan updated",
    eventDescription: "Care plan updated",
    sourceCollection: CARE_PLANS_COLLECTION,
    sourceId: current.id,
    createdBy: updatedBy,
    metadata: { action: "updated", version: nextVersion },
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Firestore query failed:", err);
  });

  return { id };
}

/** Count care plans with a review date due within N days (for dashboard). */
export async function countCarePlansDueForReview(organisationId, { serviceId, withinDays = 7 } = {}) {
  if (!organisationId?.trim()) return 0;
  const ref = collection(db, CARE_PLANS_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId.trim()),
    where("status", "in", ["active", "review_due"]),
  ];
  if (serviceId) {
    constraints.push(where("serviceId", "==", serviceId));
  }
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  const now = Date.now();
  const windowMs = withinDays * 24 * 60 * 60 * 1000;
  const due = docs.filter((d) => {
    const x = d?.data?.() ?? {};
    const rd = toDate(x.reviewDate);
    if (!rd) return false;
    const diff = rd.getTime() - now;
    return diff >= 0 && diff <= windowMs;
  });
  return due.length;
}

