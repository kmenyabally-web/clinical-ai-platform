import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  doc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { logAuditEventNonBlocking } from "./auditService";
import { getUserContext } from "./authService";
import { DOMAIN_TO_STATS_FIELD } from "../config/documentDomains";

const POLICIES_COLLECTION = "policies";
const EVIDENCE_DOCUMENTS_COLLECTION = "evidence_documents";
const DOCUMENT_STATS_COLLECTION = "document_stats";
const PAGE_SIZE = 50;

// Stage 12 managed document system (expiry + category tiles)
const MANAGED_DOCUMENTS_COLLECTION = "documents";
const MANAGED_CATEGORIES = ["Insurance", "Policies", "ID", "Training", "Other"];

/** Supported file types for upload (Storage). */
export const SUPPORTED_FILE_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"];
const SUPPORTED_ACCEPT = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";

export function getSupportedAcceptString() {
  return SUPPORTED_ACCEPT;
}

export function isSupportedFileType(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return SUPPORTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getCollectionForType(documentType) {
  return documentType === "policy" ? POLICIES_COLLECTION : EVIDENCE_DOCUMENTS_COLLECTION;
}

/**
 * Get or create document_stats doc for an organisation; return its ref.
 */
async function getOrCreateDocumentStatsRef(organisationId, serviceId) {
  if (!organisationId?.trim()) return null;
  const col = collection(db, DOCUMENT_STATS_COLLECTION);
  const constraints = [where("organisationId", "==", organisationId), limit(1)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(col, ...constraints);
  const snapshot = await getDocs(q);
  const firstDoc = snapshot?.docs?.[0];
  if (firstDoc && firstDoc.ref) return firstDoc.ref;
  const docData = {
    organisationId,
    totalCount: 0,
    governance: 0,
    safeguarding: 0,
    mentalCapacity: 0,
    staffing: 0,
    carePlanning: 0,
    lastUpdated: serverTimestamp(),
  };
  if (serviceId) docData.serviceId = serviceId;
  return addDoc(col, docData);
}

function incrementDocumentCount(organisationId, domainType, serviceId) {
  const field = DOMAIN_TO_STATS_FIELD[domainType];
  if (!field) return Promise.resolve();
  return getOrCreateDocumentStatsRef(organisationId, serviceId ?? null).then((statsRef) => {
    if (!statsRef) return;
    return updateDoc(statsRef, {
      totalCount: increment(1),
      [field]: increment(1),
      lastUpdated: serverTimestamp(),
    });
  });
}

/**
 * Upload file to Firebase Storage at /organisations/{organisationId}/documents/{fileId}.
 * Write metadata to policies or evidence_documents by documentType. Audit: DOCUMENT_UPLOAD.
 *
 * @param {string} organisationId
 * @param {{ title: string, documentType: string, domainType: string, description?: string, file: File }} payload
 * @param {{ userId: string, userRole: string }} auditContext
 * @returns {Promise<{ id: string, collection: string }>}
 */
export async function uploadDocument(organisationIdOrFile, payload, auditContext, serviceId) {
  // Stage 12 managed document upload: uploadDocument(file, metadata)
  // - Writes to Storage: /organisations/{organisationId}/documents/
  // - Writes to Firestore: collection /documents with expiryDate + category.
  if (organisationIdOrFile && typeof organisationIdOrFile === "object" && typeof organisationIdOrFile.name === "string") {
    const file = organisationIdOrFile;
    const metadata = payload ?? {};

    if (!file) throw new Error("File required");
    if (!isSupportedFileType(file)) throw new Error("File type not supported. Use: pdf, docx, xlsx, jpg, png.");

    const { organisationId: claimsOrgId } = await getUserContext();
    const scopedOrgId = (claimsOrgId ?? "dev-org-001").toString().trim();

    const category = (metadata.category ?? "Other").toString().trim();
    if (!MANAGED_CATEGORIES.includes(category)) {
      throw new Error(`Invalid category. Must be one of: ${MANAGED_CATEGORIES.join(", ")}`);
    }

    const rawExpiry = metadata.expiryDate ?? null;
    let expiryDate = null;
    if (rawExpiry != null && rawExpiry !== "") {
      const d = rawExpiry instanceof Date ? rawExpiry : new Date(rawExpiry);
      if (isNaN(d.getTime())) throw new Error("expiryDate is not a valid date.");
      expiryDate = d;
    }

    const col = collection(db, MANAGED_DOCUMENTS_COLLECTION);
    const docRef = doc(col);
    const fileId = docRef.id;

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
    const storagePath = `organisations/${scopedOrgId}/documents/${fileId}${ext}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytesResumable(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);

    await setDoc(docRef, {
      organisationId: scopedOrgId,
      fileName: file.name,
      fileUrl,
      category,
      expiryDate: expiryDate ?? null,
      uploadedAt: serverTimestamp(),
    });

    return { id: fileId };
  }

  // Legacy behaviour (existing policies / evidence_documents document system).
  const organisationId = organisationIdOrFile;
  if (!organisationId?.trim()) throw new Error("organisationId required");

  const { title, documentType, domainType, description, file } = payload;
  if (!file) throw new Error("File required");
  if (!isSupportedFileType(file)) throw new Error("File type not supported. Use: pdf, docx, xlsx, jpg, png.");

  const colName = getCollectionForType(documentType ?? "evidence");
  const col = collection(db, colName);
  const docData = {
    organisationId,
    serviceId: serviceId ?? null,
    title: title?.trim() ?? "",
    documentType: documentType ?? "evidence",
    domainType: domainType ?? "",
    description: description?.trim() ?? "",
    fileUrl: "",
    fileName: file.name,
    uploadedBy: auditContext?.userId ?? "",
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(col, docData);
  const fileId = docRef.id;
  // Storage path: /organisations/{organisationId}/documents/{fileId}
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const storagePath = `organisations/${organisationId}/documents/${fileId}${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytesResumable(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);
  await updateDoc(docRef, { fileUrl });

  await incrementDocumentCount(organisationId, domainType, serviceId);

  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "",
      serviceId: serviceId ?? undefined,
      action: "DOCUMENT_UPLOAD",
      entityType: "DOCUMENT",
      entityId: fileId,
      entityName: docData.title || file.name,
      previousValue: null,
      newValue: { title: docData.title, documentType: docData.documentType, domainType: docData.domainType },
    });
  }

  return { id: fileId, collection: colName };
}

/**
 * Fetch managed Stage 12 documents (category + expiryDate).
 * No ordering here to avoid needing new composite indexes.
 *
 * @param {string} organisationId
 * @returns {Promise<Array<{id:string,fileName:string,fileUrl:string,category:string,expiryDate:any,uploadedAt:any}>>}
 */
export async function fetchManagedDocuments(organisationId) {
  const collectionName = "documents";
  const scopedOrgId = (organisationId ?? "").toString().trim();
  if (!scopedOrgId) return [];
  const q = query(
    collection(db, collectionName),
    where("organisationId", "==", scopedOrgId)
  );

  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      fileName: x.fileName ?? "",
      fileUrl: x.fileUrl ?? "",
      category: x.category ?? "Other",
      expiryDate: x.expiryDate ?? null,
      uploadedAt: x.uploadedAt ?? null,
    };
  });
}

/**
 * Debug-only helper: fetch documents from the `documents` collection with no filters.
 * Use to confirm whether data exists when the scoped query returns [].
 */
export async function fetchAllManagedDocumentsNoFilterDebug(limitCount = 25) {
  const q = query(collection(db, "documents"), limit(limitCount));
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      fileName: x.fileName ?? "",
      fileUrl: x.fileUrl ?? "",
      category: x.category ?? "Other",
      expiryDate: x.expiryDate ?? null,
      uploadedAt: x.uploadedAt ?? null,
      organisationId: x.organisationId ?? null,
    };
  });
}

/**
 * Debug-only helper: fetch documents if they were stored incorrectly as a sub-collection:
 * organisations/{organisationId}/documents/{docId}
 */
export async function fetchOrgDocumentsSubcollectionDebugNoFilter(organisationId, limitCount = 25) {
  const orgId = (organisationId ?? "").toString().trim();
  if (!orgId) return [];
  const q = query(collection(db, "organisations", orgId, "documents"), limit(limitCount));
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      ...x,
    };
  });
}

/**
 * Fetch documents from both policies and evidence_documents for an organisation.
 * All queries filter by organisationId. Results merged and sorted by createdAt desc; paginated.
 */
export async function fetchDocuments(organisationId, options = {}) {
  if (!organisationId?.trim()) return { documents: [], lastDoc: null };
  const { limitCount = PAGE_SIZE, startAfter: cursor, serviceId } = options;
  const policyConstraints = [where("organisationId", "==", organisationId), orderBy("createdAt", "desc"), limit(limitCount)];
  const evidenceConstraints = [where("organisationId", "==", organisationId), orderBy("createdAt", "desc"), limit(limitCount)];
  if (serviceId) {
    policyConstraints.push(where("serviceId", "==", serviceId));
    evidenceConstraints.push(where("serviceId", "==", serviceId));
  }
  const [policiesSnap, evidenceSnap] = await Promise.all([
    getDocs(query(collection(db, POLICIES_COLLECTION), ...policyConstraints)),
    getDocs(query(collection(db, EVIDENCE_DOCUMENTS_COLLECTION), ...evidenceConstraints)),
  ]);

  const toItem = (docSnap, collectionName) => {
    const x = docSnap?.data?.() ?? {};
    return {
      id: docSnap?.id ?? "",
      collection: collectionName,
      title: x.title ?? "",
      documentType: x.documentType ?? (collectionName === POLICIES_COLLECTION ? "policy" : "evidence"),
      domainType: x.domainType ?? "",
      description: x.description ?? "",
      fileUrl: x.fileUrl ?? "",
      fileName: x.fileName ?? "",
      uploadedBy: x.uploadedBy ?? "",
      createdAt: x.createdAt ?? null,
      updatedAt: x.updatedAt ?? null,
    };
  };
  const policies = (policiesSnap?.docs ?? []).map((d) => toItem(d, POLICIES_COLLECTION));
  const evidence = (evidenceSnap?.docs ?? []).map((d) => toItem(d, EVIDENCE_DOCUMENTS_COLLECTION));
  const combined = [...policies, ...evidence].sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  const documents = combined.slice(0, limitCount);
  const lastDoc = null; // cursor-based pagination across two collections is more involved; simple slice for now
  return { documents, lastDoc };
}

/**
 * Fetch recently uploaded documents (e.g. for dashboard). organisationId required.
 */
export async function fetchRecentDocuments(organisationId, max = 5) {
  if (!organisationId?.trim()) return [];
  const [policiesSnap, evidenceSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, POLICIES_COLLECTION),
        where("organisationId", "==", organisationId),
        orderBy("createdAt", "desc"),
        limit(max)
      )
    ),
    getDocs(
      query(
        collection(db, EVIDENCE_DOCUMENTS_COLLECTION),
        where("organisationId", "==", organisationId),
        orderBy("createdAt", "desc"),
        limit(max)
      )
    ),
  ]);
  const toItem = (docSnap, collectionName) => {
    const x = docSnap?.data?.() ?? {};
    return {
      id: docSnap?.id ?? "",
      collection: collectionName,
      title: x.title ?? "",
      documentType: x.documentType ?? (collectionName === POLICIES_COLLECTION ? "policy" : "evidence"),
      domainType: x.domainType ?? "",
      fileName: x.fileName ?? "",
      fileUrl: x.fileUrl ?? "",
      uploadedBy: x.uploadedBy ?? "",
      createdAt: x.createdAt ?? null,
    };
  };
  const combined = [
    ...(policiesSnap?.docs ?? []).map((d) => toItem(d, POLICIES_COLLECTION)),
    ...(evidenceSnap?.docs ?? []).map((d) => toItem(d, EVIDENCE_DOCUMENTS_COLLECTION)),
  ]
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, max);
  return combined;
}

/**
 * Fetch document counts (total + by domain). One read; scales for thousands of docs.
 */
export async function fetchDocumentCountsByDomain(organisationId, serviceId) {
  if (!organisationId?.trim()) {
    return {
      totalCount: 0,
      governance: 0,
      safeguarding: 0,
      mentalCapacity: 0,
      staffing: 0,
      carePlanning: 0,
    };
  }
  const col = collection(db, DOCUMENT_STATS_COLLECTION);
  const constraints = [where("organisationId", "==", organisationId), limit(1)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const q = query(col, ...constraints);
  const snapshot = await getDocs(q);
  const d = snapshot?.docs?.[0]?.data?.() ?? null;
  const governance = typeof d?.governance === "number" ? d.governance : 0;
  const safeguarding = typeof d?.safeguarding === "number" ? d.safeguarding : 0;
  const mentalCapacity = typeof d?.mentalCapacity === "number" ? d.mentalCapacity : 0;
  const staffing = typeof d?.staffing === "number" ? d.staffing : 0;
  const carePlanning = typeof d?.carePlanning === "number" ? d.carePlanning : 0;
  const sum = governance + safeguarding + mentalCapacity + staffing + carePlanning;
  return {
    totalCount: typeof d?.totalCount === "number" ? d.totalCount : sum,
    governance,
    safeguarding,
    mentalCapacity,
    staffing,
    carePlanning,
  };
}

/**
 * Update document metadata (title, domainType, description). Manager/Admin only.
 * Decrements old domain count and increments new if domainType changed.
 */
export async function updateDocumentMetadata(organisationId, collectionName, documentId, updates, auditContext) {
  if (!organisationId?.trim() || !collectionName || !documentId) throw new Error("organisationId, collection, and documentId required");
  const col = collection(db, collectionName);
  const docRef = doc(col, documentId);
  if (!docRef) throw new Error("Invalid document reference");
  const { getDoc } = await import("firebase/firestore");
  const snap = await getDoc(docRef);
  if (!snap || typeof snap.exists !== "function" || !snap.exists()) throw new Error("Document not found");
  const prev = snap.data?.() ?? {};
  const newDomain = updates.domainType ?? prev.domainType;
  const oldDomain = prev.domainType;
  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "",
      action: "DOCUMENT_UPDATE",
      entityType: "DOCUMENT",
      entityId: documentId,
      entityName: updates.title ?? prev.title ?? "",
      previousValue: prev,
      newValue: { ...prev, ...updates },
    });
  }
  if (oldDomain !== newDomain && DOMAIN_TO_STATS_FIELD[oldDomain] && DOMAIN_TO_STATS_FIELD[newDomain]) {
    const statsRef = await getOrCreateDocumentStatsRef(organisationId);
    if (statsRef) {
      await updateDoc(statsRef, {
        [DOMAIN_TO_STATS_FIELD[oldDomain]]: increment(-1),
        [DOMAIN_TO_STATS_FIELD[newDomain]]: increment(1),
        lastUpdated: serverTimestamp(),
      });
    }
  }
}
