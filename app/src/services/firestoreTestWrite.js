/**
 * One-shot Firestore connectivity test. Creates `test/{autoId}`.
 * Enable: runs in Vite dev, or set VITE_FIRESTORE_TEST_WRITE=true in .env
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

let testWriteRan = false;

export async function testWrite() {
  const payload = {
    message: "Firebase working",
    createdAt: serverTimestamp(),
  };
  console.log("Saving:", payload);
  try {
    const docRef = await addDoc(collection(db, "test"), payload);
    console.log("TEST WRITE SUCCESS:", docRef.id);
    return docRef.id;
  } catch (err) {
    console.error("TEST WRITE FAILED:", err);
    throw err;
  }
}

/** Avoid duplicate runs under React StrictMode (dev double-mount). */
export function runFirestoreTestWriteOnce() {
  const enabled =
    import.meta.env.DEV === true || import.meta.env.VITE_FIRESTORE_TEST_WRITE === "true";
  if (!enabled) return;
  if (testWriteRan) return;
  testWriteRan = true;
  void testWrite();
}
