import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "rc_reports";

/**
 * @param {string} organisationId
 * @param {string} patientId
 * @param {{ limitCount?: number }} [opts]
 */
export async function listRcReportsForPatient(organisationId, patientId, opts = {}) {
  const org = (organisationId ?? "").toString().trim();
  const pid = (patientId ?? "").toString().trim();
  if (!org || !pid) return [];
  const lim = Math.min(Math.max(Number(opts.limitCount) || 20, 1), 50);
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("updatedAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() ?? {} }));
}

export async function getRcReportById(reportId) {
  const id = (reportId ?? "").toString().trim();
  if (!id) return null;
  const s = await getDoc(doc(db, COLLECTION, id));
  if (!s.exists()) return null;
  return { id: s.id, data: s.data() ?? {} };
}

/**
 * @param {{
 *   organisationId: string,
 *   patientId: string,
 *   sections: Record<string, unknown>,
 *   status?: string,
 *   signature?: Record<string, unknown>,
 *   createdBy?: string | null,
 *   authorRole?: string,
 * }} payload
 */
export async function createRcReport(payload) {
  const organisationId = (payload.organisationId ?? "").toString().trim();
  const patientId = (payload.patientId ?? "").toString().trim();
  if (!organisationId || !patientId) throw new Error("organisationId and patientId required");
  const ref = await addDoc(collection(db, COLLECTION), {
    organisationId,
    patientId,
    authorRole: payload.authorRole ?? "RC",
    sections: payload.sections && typeof payload.sections === "object" ? payload.sections : {},
    status: payload.status ?? "draft",
    signature: payload.signature && typeof payload.signature === "object" ? payload.signature : {},
    createdBy: payload.createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRcReport(reportId, updates) {
  const id = (reportId ?? "").toString().trim();
  if (!id) throw new Error("reportId required");
  const patch = { updatedAt: serverTimestamp() };
  if (updates.sections != null) patch.sections = updates.sections;
  if (updates.status != null) patch.status = updates.status;
  if (updates.signature != null) patch.signature = updates.signature;
  if (updates.updatedBy !== undefined) patch.updatedBy = updates.updatedBy;
  await updateDoc(doc(db, COLLECTION, id), patch);
}
