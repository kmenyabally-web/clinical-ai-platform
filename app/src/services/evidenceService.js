import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { addPatientTimelineEvent } from "./patientTimelineService";

const EVIDENCE_COLLECTION = "evidence";
const MAX_ITEMS = 200;

function mapDocToEvidence(d, organisationId) {
  const x = d?.data?.() ?? {};
  return {
    id: d?.id ?? "",
    organisationId: x.organisationId ?? organisationId,
    serviceId: x.serviceId ?? null,
    domain: x.domain ?? "",
    title: x.title ?? "",
    fileUrl: x.fileUrl ?? "",
    uploadedBy: x.uploadedBy ?? "",
    uploadedAt: x.uploadedAt ?? x.createdAt ?? null,
    status: x.status ?? "active",
  };
}

/**
 * Fetch evidence for an organisation and service. Query filters by organisationId and serviceId when provided.
 * @param {string} organisationId
 * @param {string} [serviceId] - When provided, query includes where("serviceId", "==", serviceId).
 * @returns {Promise<Array<{ id: string, organisationId: string, serviceId: string | null, domain: string, title: string, fileUrl: string, uploadedBy: string, uploadedAt: unknown, status: string }>>}
 */
export async function fetchEvidence(organisationId, serviceId) {
  if (!organisationId?.trim()) return [];
  const col = collection(db, EVIDENCE_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("uploadedAt", "desc"),
    limit(MAX_ITEMS),
  ];
  if (serviceId != null && serviceId !== "") {
    constraints.push(where("serviceId", "==", serviceId));
  }
  const q = query(col, ...constraints);
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  let list = docs.map((d) => mapDocToEvidence(d, organisationId));
  if (serviceId == null || serviceId === "") {
    list = list.filter((e) => e.serviceId == null || e.serviceId === "");
  }
  return list;
}

/**
 * Subscribe to evidence in real time. New uploads appear immediately.
 * @param {string} organisationId
 * @param {string} [serviceId]
 * @param {(list: Array<{ id: string, organisationId: string, serviceId: string | null, domain: string, title: string, fileUrl: string, uploadedBy: string, uploadedAt: unknown, status: string }>) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribeEvidence(organisationId, serviceId, onUpdate) {
  if (!organisationId?.trim()) {
    onUpdate([]);
    return () => {};
  }
  const col = collection(db, EVIDENCE_COLLECTION);
  const constraints = [
    where("organisationId", "==", organisationId),
    orderBy("uploadedAt", "desc"),
    limit(MAX_ITEMS),
  ];
  if (serviceId != null && serviceId !== "") {
    constraints.push(where("serviceId", "==", serviceId));
  }
  const q = query(col, ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot?.docs ?? [];
      let list = docs.map((d) => mapDocToEvidence(d, organisationId));
      if (serviceId == null || serviceId === "") {
        list = list.filter((e) => e.serviceId == null || e.serviceId === "");
      }
      onUpdate(list);
    },
    () => onUpdate([])
  );
}

/**
 * Upload an evidence file and create an evidence document.
 * @param {string} organisationId
 * @param {string} [serviceId]
 * @param {string} domain - One of: safe, effective, caring, responsive, well-led
 * @param {string} title
 * @param {File} file
 * @param {string} uploadedBy - User ID
 * @param {string} [patientId] Optional; when provided, a patientTimeline event is created.
 * @returns {Promise<{ id: string }>}
 */
export async function uploadEvidence(organisationId, serviceId, domain, title, file, uploadedBy, patientId) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  if (!domain?.trim()) throw new Error("domain required");
  if (!title?.trim()) throw new Error("title required");
  if (!file) throw new Error("File required");
  if (!isSupportedFileType(file)) throw new Error("File type not supported. Use: pdf, docx, xlsx, jpg, png.");

  const col = collection(db, EVIDENCE_COLLECTION);
  const docData = {
    organisationId,
    serviceId: serviceId ?? null,
    domain: domain.trim().toLowerCase(),
    title: title.trim(),
    fileUrl: "",
    uploadedBy: uploadedBy ?? "",
    uploadedAt: serverTimestamp(),
    status: "active",
  };
  const docRef = await addDoc(col, docData);
  const fileId = docRef.id;
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const storagePath = `organisations/${organisationId}/evidence/${fileId}${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytesResumable(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(docRef, { fileUrl });

  if (patientId && typeof patientId === "string" && patientId.trim()) {
    await addPatientTimelineEvent({
      eventId: fileId,
      patientId: patientId.trim(),
      organisationId,
      serviceId: serviceId ?? null,
      type: "evidence_upload",
      title: title.trim(),
      description: "",
      createdBy: uploadedBy ?? "",
      metadata: {
        domain,
        fileName: file.name,
        collection: EVIDENCE_COLLECTION,
      },
    });
  }

  import("./complianceEngine").then(({ recalculateComplianceScoreAsync }) => {
    recalculateComplianceScoreAsync(organisationId, serviceId ?? undefined);
  }).catch(() => {});

  return { id: fileId };
}

const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"];

export function isSupportedFileType(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
