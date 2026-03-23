/**
 * staff_training collection — competency / certificate tracking.
 * Schema: organisationId, serviceId?, staffId, staffName?, trainingName, expiryDate,
 *         status (Valid|Expired), evidenceUrl, createdAt
 */

import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const COLLECTION = "staff_training";

export function parseUkDateString(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function coerceDate(expiryDate) {
  if (expiryDate == null) return null;
  if (typeof expiryDate?.toDate === "function") {
    try {
      const d = expiryDate.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (expiryDate instanceof Date) {
    return Number.isNaN(expiryDate.getTime()) ? null : expiryDate;
  }
  if (typeof expiryDate === "string") {
    const uk = parseUkDateString(expiryDate);
    if (uk) return uk;
  }
  const d = new Date(expiryDate);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeTrainingStatus(expiryDate) {
  const d = coerceDate(expiryDate);
  if (!d) return "Expired";
  const endOfExpiryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return endOfExpiryDay.getTime() >= Date.now() ? "Valid" : "Expired";
}

/**
 * @returns {Promise<Array<{ id: string, organisationId: string, serviceId: string|null, staffId: string, staffName: string, trainingName: string, expiryDate: *, status: string, evidenceUrl: string, createdAt: * }>>}
 */
export async function listStaffTraining(organisationId, serviceId = null) {
  if (!organisationId?.trim()) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where("organisationId", "==", organisationId.trim()))
  );
  let rows = (snap.docs ?? []).map((d) => {
    const x = d.data() ?? {};
    const expiry = x.expiryDate ?? null;
    const status = x.status && ["Valid", "Expired"].includes(x.status) ? x.status : computeTrainingStatus(expiry);
    return {
      id: d.id,
      organisationId: x.organisationId ?? "",
      serviceId: x.serviceId ?? null,
      staffId: x.staffId ?? "",
      staffName: x.staffName ?? "",
      trainingName: x.trainingName ?? "",
      expiryDate: expiry,
      status,
      evidenceUrl: x.evidenceUrl ?? "",
      createdAt: x.createdAt ?? null,
    };
  });
  if (serviceId) {
    rows = rows.filter((r) => r.serviceId === serviceId || r.serviceId == null);
  }
  rows.sort((a, b) => {
    const ta = coerceDate(a.expiryDate)?.getTime?.() ?? 0;
    const tb = coerceDate(b.expiryDate)?.getTime?.() ?? 0;
    return tb - ta;
  });
  return rows;
}

/**
 * Count distinct staff with Valid status per training name (for competency gaps).
 */
export function countValidStaffByTraining(records) {
  const map = new Map();
  for (const r of records ?? []) {
    if (r.status !== "Valid") continue;
    const name = String(r.trainingName ?? "").trim();
    if (!name) continue;
    if (!map.has(name)) map.set(name, new Set());
    const sid = String(r.staffId ?? "").trim();
    if (sid) map.get(name).add(sid);
  }
  const out = {};
  for (const [k, set] of map.entries()) {
    out[k] = set.size;
  }
  return out;
}

/**
 * @param {{ organisationId: string, serviceId?: string|null, staffId: string, staffName?: string, trainingName: string, expiryDate: Date|string, evidenceUrl?: string }} payload
 */
export async function createStaffTrainingRecord(payload) {
  const org = (payload.organisationId ?? "").trim();
  if (!org) throw new Error("organisationId required");
  if (!(payload.staffId ?? "").trim()) throw new Error("staffId required");
  if (!(payload.trainingName ?? "").trim()) throw new Error("trainingName required");

  let expiry = payload.expiryDate;
  if (typeof expiry === "string") {
    expiry = parseUkDateString(expiry) ?? new Date(expiry);
  }
  if (!(expiry instanceof Date) || Number.isNaN(expiry.getTime())) {
    throw new Error("expiryDate must be a valid date");
  }

  const expiryTs = Timestamp.fromDate(expiry);
  const status = computeTrainingStatus(expiryTs);

  const docData = {
    organisationId: org,
    serviceId: payload.serviceId ?? null,
    staffId: payload.staffId.trim(),
    staffName: String(payload.staffName ?? "").trim(),
    trainingName: payload.trainingName.trim(),
    expiryDate: expiryTs,
    status,
    evidenceUrl: String(payload.evidenceUrl ?? "").trim(),
    createdAt: serverTimestamp(),
  };

  const refDoc = await addDoc(collection(db, COLLECTION), docData);
  return { id: refDoc.id };
}

/**
 * Upload a certificate file and attach URL to an existing staff_training doc.
 */
export async function attachCertificateFile(organisationId, recordId, file) {
  if (!organisationId?.trim() || !recordId?.trim() || !file) throw new Error("organisationId, recordId, and file required");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `organisations/${organisationId.trim()}/staff_training/${recordId}/${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const evidenceUrl = await getDownloadURL(storageRef);
  await updateDoc(doc(db, COLLECTION, recordId), { evidenceUrl });
  return evidenceUrl;
}
