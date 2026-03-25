import { addDoc } from "firebase/firestore";
import { assertTenantContext } from "./tenantContext";

/**
 * addDoc with console logging and explicit error logging (no silent failures).
 * @param {import("firebase/firestore").CollectionReference} collectionRef
 * @param {Record<string, unknown>} data
 * @param {string} [label]
 */
export async function addDocLogged(collectionRef, data, label = "Firestore") {
  const org = data?.organisationId != null ? String(data.organisationId).trim() : "";
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
