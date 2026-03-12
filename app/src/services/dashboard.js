import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Maps Stage-20 readiness level to a compliance percentage for aggregation.
 * @type {Record<string, number>}
 */
const READINESS_TO_SCORE = {
  "Not started": 0,
  "In progress": 25,
  Defined: 50,
  Reviewed: 75,
  Assured: 100,
};

/**
 * Fetch domain-level readiness for an organisation and compute compliance aggregates.
 * Reads from organisations/{orgId}/readiness (Stage-20). Safe when collection is empty.
 *
 * @param {string} organisationId - Organisation ID (must be non-empty)
 * @returns {Promise<{ domains: Array<{ id: string, domainKey?: string, readinessLevel: string, compliancePercent: number }>, overallCompliancePercent: number }>}
 */
export async function fetchReadinessForCompliance(organisationId) {
  if (!organisationId?.trim()) {
    return { domains: [], overallCompliancePercent: 0 };
  }
  const readinessRef = collection(db, "organisations", organisationId, "readiness");
  const snapshot = await getDocs(readinessRef);
  const docs = snapshot?.docs ?? [];
  const domains = [];
  let sum = 0;
  for (const docSnap of docs) {
    if (!docSnap) continue;
    const data = docSnap.data?.() ?? {};
    const level = data.readinessLevel ?? "Not started";
    const compliancePercent = READINESS_TO_SCORE[level] ?? 0;
    domains.push({
      id: docSnap.id ?? "",
      domainKey: data.domainKey ?? docSnap.id ?? "",
      readinessLevel: level,
      compliancePercent,
    });
    sum += compliancePercent;
  }
  const count = domains.length;
  const overallCompliancePercent = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  return { domains, overallCompliancePercent };
}
