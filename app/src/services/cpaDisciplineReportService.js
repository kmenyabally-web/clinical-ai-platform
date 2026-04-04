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

const COLLECTION = "cpa_discipline_reports";

export async function listCpaDisciplineReportsForPatient(organisationId, patientId, opts = {}) {
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

export async function getCpaDisciplineReportById(reportId) {
  const id = (reportId ?? "").toString().trim();
  if (!id) return null;
  const s = await getDoc(doc(db, COLLECTION, id));
  if (!s.exists()) return null;
  return { id: s.id, data: s.data() ?? {} };
}

export async function createCpaDisciplineReport(payload) {
  const organisationId = (payload.organisationId ?? "").toString().trim();
  const patientId = (payload.patientId ?? "").toString().trim();
  const disciplineKey = (payload.disciplineKey ?? "").toString().trim();
  if (!organisationId || !patientId || !disciplineKey) throw new Error("organisationId, patientId, disciplineKey required");
  const ref = await addDoc(collection(db, COLLECTION), {
    organisationId,
    patientId,
    disciplineKey,
    sections: payload.sections && typeof payload.sections === "object" ? payload.sections : {},
    status: payload.status ?? "draft",
    createdBy: payload.createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCpaDisciplineReport(reportId, updates) {
  const id = (reportId ?? "").toString().trim();
  if (!id) throw new Error("reportId required");
  const patch = { updatedAt: serverTimestamp() };
  if (updates.sections != null) patch.sections = updates.sections;
  if (updates.status != null) patch.status = updates.status;
  if (updates.disciplineKey != null) patch.disciplineKey = updates.disciplineKey;
  if (updates.updatedBy !== undefined) patch.updatedBy = updates.updatedBy;
  await updateDoc(doc(db, COLLECTION, id), patch);
}
