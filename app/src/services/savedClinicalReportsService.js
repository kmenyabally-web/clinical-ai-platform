import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { requireOrganisationId } from "../utils/tenantContext";

const REPORTS_COLLECTION = "reports";

/**
 * Persist a generated clinical report for audit / retrieval.
 * Document shape: patientId, organisationId, type, title, content (JSON string), createdAt, createdBy.
 *
 * @param {{
 *   organisationId: string,
 *   patientId: string,
 *   type: string,
 *   document: { title?: string, [key: string]: unknown },
 * }} args
 * @returns {Promise<{ id: string }>}
 */
export async function saveClinicalReportDocument({ organisationId, patientId, type, document }) {
  const org = requireOrganisationId(organisationId);
  const pid = String(patientId ?? "").trim();
  if (!pid) throw new Error("Patient is required to save this report.");

  const uid = auth.currentUser?.uid ?? null;
  const content = JSON.stringify(document);

  const ref = await addDoc(collection(db, REPORTS_COLLECTION), {
    patientId: pid,
    organisationId: org,
    orgId: org,
    type: String(type ?? "unknown"),
    title: document?.title ?? "",
    content,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });

  return { id: ref.id };
}
