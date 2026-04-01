/**
 * Care monitoring logs — fluid, food, stool, urine (`care_logs`).
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "care_logs";

function coerceString(data, key, fallback = "") {
  const v = data[key];
  return typeof v === "string" ? v.trim() : fallback;
}

/**
 * @param {{
 *   patientId: string,
 *   organisationId: string,
 *   hospitalId?: string | null,
 *   wardId?: string | null,
 *   category: "fluid" | "food" | "stool" | "urine",
 *   recordedBy: string,
 *   recordedAt?: Date | null,
 *   amountMl?: number | null,
 *   fluidType?: string | null,
 *   mealType?: string | null,
 *   percentEaten?: number | null,
 *   foodNotes?: string | null,
 *   bristolScale?: number | null,
 *   urineAmount?: string | null,
 *   urineColour?: string | null,
 * }} payload
 */
export async function submitCareLog(payload) {
  const patientId = String(payload.patientId ?? "").trim();
  const organisationId = String(payload.organisationId ?? "").trim();
  const category = String(payload.category ?? "").trim();
  if (!patientId) throw new Error("patientId is required");
  if (!organisationId) throw new Error("organisationId is required");
  if (!["fluid", "food", "stool", "urine"].includes(category)) throw new Error("Invalid category");

  const recordedAt =
    payload.recordedAt instanceof Date && !Number.isNaN(payload.recordedAt.getTime())
      ? Timestamp.fromDate(payload.recordedAt)
      : serverTimestamp();

  const doc = {
    patientId,
    organisationId,
    hospitalId: coerceString(payload, "hospitalId", "") || "",
    wardId: coerceString(payload, "wardId", "") || "",
    category,
    recordedBy: String(payload.recordedBy ?? "").trim() || "unknown",
    recordedAt,
    createdAt: serverTimestamp(),
    amountMl: null,
    fluidType: null,
    mealType: null,
    percentEaten: null,
    foodNotes: "",
    bristolScale: null,
    urineAmount: null,
    urineColour: null,
  };

  if (category === "fluid") {
    doc.amountMl = typeof payload.amountMl === "number" && Number.isFinite(payload.amountMl) ? payload.amountMl : null;
    doc.fluidType = coerceString(payload, "fluidType", "") || null;
  } else if (category === "food") {
    doc.mealType = coerceString(payload, "mealType", "") || null;
    const pe = payload.percentEaten;
    doc.percentEaten =
      typeof pe === "number" && Number.isFinite(pe) ? Math.min(100, Math.max(0, Math.round(pe))) : null;
    doc.foodNotes = coerceString(payload, "foodNotes", "");
  } else if (category === "stool") {
    const b = payload.bristolScale;
    const n = typeof b === "number" ? b : Number(b);
    doc.bristolScale = Number.isFinite(n) && n >= 1 && n <= 7 ? Math.round(n) : null;
  } else if (category === "urine") {
    doc.urineAmount = coerceString(payload, "urineAmount", "") || null;
    doc.urineColour = coerceString(payload, "urineColour", "") || null;
  }

  const ref = await addDoc(collection(db, COLLECTION), doc);
  return { id: ref.id };
}

/**
 * @param {string} organisationId
 * @param {string} patientId
 * @param {{ limitCount?: number }} [opts]
 */
export async function listCareLogsForPatient(organisationId, patientId, opts = {}) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return [];

  const lim = Math.min(Math.max(Number(opts.limitCount) || 200, 1), 500);
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("recordedAt", "desc"),
    limit(lim)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
}

export { COLLECTION as CARE_LOGS_COLLECTION };
