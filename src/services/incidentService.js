import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const INCIDENTS_COLLECTION = "incidents";
const MAX_FEED_ITEMS = 20;

export function isHighPrioritySafeguarding(type) {
  const t = String(type ?? "").trim().toLowerCase();
  return t === "abuse allegation" || t === "significant injury";
}

export async function createIncident(payload) {
  const {
    organisationId,
    patientId,
    type,
    description,
    witnesses,
    immediateActions,
    cqcNotified,
    cqcReferenceNumber,
    status,
    whereOccurred,
    whenOccurred,
    reportedBy,
    serviceId,
    severity,
  } = payload ?? {};

  if (!organisationId?.trim()) throw new Error("organisationId required");
  if (!patientId?.trim()) throw new Error("patientId required");
  if (!type?.trim()) throw new Error("incident type required");
  if (!severity?.trim()) throw new Error("severity required");
  if (!description?.trim()) throw new Error("description required");
  if (!whereOccurred?.trim()) throw new Error("where occurred is required");
  if (!whenOccurred) throw new Error("when occurred is required");

  const safeguardingHighPriority = isHighPrioritySafeguarding(type);

  const docData = {
    organisationId: organisationId.trim(),
    patientId: patientId.trim(),
    type: type.trim(),
    severity: severity.trim(),
    description: description.trim(),
    witnesses: String(witnesses ?? "").trim(),
    immediateActions: String(immediateActions ?? "").trim(),
    cqcNotified: !!cqcNotified,
    cqcReferenceNumber: cqcNotified ? String(cqcReferenceNumber ?? "").trim() : "",
    status: String(status ?? "Open").trim() || "Open",
    whereOccurred: whereOccurred.trim(),
    whenOccurred,
    reportedBy: String(reportedBy ?? "").trim(),
    safeguardingHighPriority,
    createdAt: serverTimestamp(),
  };
  if (serviceId) docData.serviceId = String(serviceId);

  const ref = await addDoc(collection(db, INCIDENTS_COLLECTION), docData);
  return { id: ref.id, safeguardingHighPriority };
}

export async function fetchOpenIncidents(organisationId, serviceId = null) {
  if (!organisationId?.trim()) return [];
  const constraints = [
    where("organisationId", "==", organisationId),
    where("status", "==", "Open"),
    orderBy("createdAt", "desc"),
    limit(MAX_FEED_ITEMS),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const snap = await getDocs(query(collection(db, INCIDENTS_COLLECTION), ...constraints));
  return (snap.docs ?? []).map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchRecentIncidents(organisationId, serviceId = null, maxItems = 25) {
  if (!organisationId?.trim()) return [];
  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("createdAt", "desc"),
    limit(maxItems),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const snap = await getDocs(query(collection(db, INCIDENTS_COLLECTION), ...constraints));
  return (snap.docs ?? []).map((d) => ({ id: d.id, ...d.data() }));
}
