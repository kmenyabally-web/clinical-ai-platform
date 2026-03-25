import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Builds discipline-specific MDT Ward Round groupings from organisation-scoped notes.
 * @param {string} patientId
 * @param {{ organisationId: string | null | undefined }} context
 * @returns {Promise<Record<string, string[]>>} Map of `mdtRole` → list of note texts
 */
export async function generateMDTReview(patientId, context) {
  const pid = (patientId ?? "").toString().trim();
  const organisationId = context?.organisationId ?? null;

  if (!pid || !organisationId?.trim()) return {};

  const q = query(
    collection(db, "notes"),
    where("patientId", "==", pid),
    where("organisationId", "==", String(organisationId).trim())
  );

  const snapshot = await getDocs(q);
  const grouped = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap?.data?.() ?? docSnap.data();
    const role =
      typeof data?.mdtRole === "string" && data.mdtRole.trim()
        ? data.mdtRole.trim()
        : "General";

    if (!grouped[role]) grouped[role] = [];

    const aiSummary =
      typeof data?.aiSummary === "string" && data.aiSummary.trim()
        ? data.aiSummary.trim()
        : "";
    const correctedText =
      typeof data?.correctedText === "string" && data.correctedText.trim()
        ? data.correctedText.trim()
        : "";
    const fallbackText =
      typeof data?.content === "string" && data.content.trim() ? data.content.trim() : "";

    const payloadText = aiSummary || correctedText || fallbackText;
    if (payloadText) grouped[role].push(payloadText);
  });

  return grouped;
}

