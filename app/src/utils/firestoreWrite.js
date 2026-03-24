import { addDoc } from "firebase/firestore";

/**
 * addDoc with console logging and explicit error logging (no silent failures).
 * @param {import("firebase/firestore").CollectionReference} collectionRef
 * @param {Record<string, unknown>} data
 * @param {string} [label]
 */
export async function addDocLogged(collectionRef, data, label = "Firestore") {
  console.log("Saving:", data);
  try {
    const docRef = await addDoc(collectionRef, data);
    console.log(`FIRESTORE OK [${label}]:`, docRef.id);
    return docRef;
  } catch (err) {
    console.error("FIRESTORE WRITE ERROR:", err);
    throw err;
  }
}
