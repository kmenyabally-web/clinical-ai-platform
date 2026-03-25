import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";

const NOTES_COLLECTION = "notes";

/**
 * Concatenate AI summaries for notes on a given calendar day (local time).
 * Queries are scoped by organisationId + hospitalId + patientId.
 *
 * @param {string} patientId
 * @param {string | Date | undefined} date - Calendar day; defaults to today
 * @returns {Promise<string>}
 */
export async function generateDailySummary(patientId, date) {
  const { organisationId, hospitalId } = await getUserContext();
  if (!organisationId?.trim() || !hospitalId?.trim()) {
    throw new Error("organisationId and hospitalId are required for summary queries.");
  }

  const pid = String(patientId ?? "").trim();
  if (!pid) return "";

  const q = query(
    collection(db, NOTES_COLLECTION),
    where("organisationId", "==", organisationId.trim()),
    where("hospitalId", "==", hospitalId.trim()),
    where("patientId", "==", pid)
  );

  const snapshot = await getDocs(q);

  const day =
    date instanceof Date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate())
      : date
        ? new Date(date)
        : new Date();
  if (Number.isNaN(day.getTime())) {
    const now = new Date();
    day.setTime(now.getTime());
  }
  day.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setDate(dayEnd.getDate() + 1);

  let combined = "";
  snapshot.forEach((docSnap) => {
    const data = docSnap.data?.() ?? {};
    const created = data.createdAt?.toDate?.() ?? data.createdAt;
    const t =
      created instanceof Date
        ? created.getTime()
        : created
          ? new Date(created).getTime()
          : 0;
    if (Number.isNaN(t) || t < day.getTime() || t >= dayEnd.getTime()) return;
    if (data.aiSummary) {
      combined += String(data.aiSummary) + "\n";
    }
  });

  return combined.trim();
}
