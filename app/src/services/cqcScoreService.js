import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const CQC_SCORES_COLLECTION = "cqcScores";

/**
 * Fetch CQC readiness scores for an organisation.
 * Always filters by organisationId so other tenants' data is never included.
 *
 * @param {string} organisationId
 * @returns {Promise<Array<{ domain: string, score: number, lastCalculated: any, openActions: number, riskLevel: string }>>}
 */
export async function fetchCqcScores(organisationId) {
  if (!organisationId?.trim()) return [];
  const ref = collection(db, CQC_SCORES_COLLECTION);
  const q = query(ref, where("organisationId", "==", organisationId));
  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];
  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      organisationId: x.organisationId ?? organisationId,
      domain: x.domain ?? "",
      score: typeof x.score === "number" ? x.score : 0,
      lastCalculated: x.lastCalculated ?? null,
      openActions: typeof x.openActions === "number" ? x.openActions : 0,
      riskLevel: x.riskLevel ?? "High",
    };
  });
}

