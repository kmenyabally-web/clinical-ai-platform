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

const COLLECTION = "inspection_scores";

export async function saveInspectionScore(data) {
  return addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function listInspectionScores(organisationId, limitCount = 20) {
  const org = String(organisationId ?? "").trim();
  if (!org) return [];
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
}
