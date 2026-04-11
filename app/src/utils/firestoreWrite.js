import { addDoc } from "firebase/firestore";
import { assertTenantContext } from "./tenantContext";

/**
 * Ensures tenant writes carry organisationId (governance).
 * @param {Record<string, unknown>} data
 * @param {string} [injectedOrganisationId] - merged into data when missing
 */
export function ensureWriteHasOrganisationId(data, injectedOrganisationId) {
  if (!data || typeof data !== "object") throw new Error("organisationId required");
  let org = data.organisationId != null ? String(data.organisationId).trim() : "";
  if (!org && injectedOrganisationId != null && String(injectedOrganisationId).trim()) {
    org = String(injectedOrganisationId).trim();
    data.organisationId = org;
  }
  if (!org) throw new Error("organisationId required");
  return org;
}

/**
 * addDoc with console logging and explicit error logging (no silent failures).
 * @param {import("firebase/firestore").CollectionReference} collectionRef
 * @param {Record<string, unknown>} data
 * @param {string} [label]
 * @param {string} [injectedOrganisationId] - if data.organisationId is empty, set before write
 */
export async function addDocLogged(collectionRef, data, label = "Firestore", injectedOrganisationId) {
  ensureWriteHasOrganisationId(data, injectedOrganisationId);
  const org = String(data.organisationId).trim();
  const hosp = data?.hospitalId != null ? String(data.hospitalId).trim() : "";
  if (org && hosp) {
    assertTenantContext(org, hosp);
  }
  if (import.meta.env.DEV) {
    console.log("Debug:", { firestoreWrite: label });
  }
  try {
    const docRef = await addDoc(collectionRef, data);
    if (import.meta.env.DEV) {
      console.log("Debug:", { firestoreOk: label, id: docRef.id });
    }
    return docRef;
  } catch (err) {
    console.error("FIRESTORE WRITE ERROR:", err);
    throw err;
  }
}
