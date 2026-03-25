/**
 * One-shot Firestore connectivity test. Creates `test/{autoId}`.
 * Enable: runs in Vite dev, or set VITE_FIRESTORE_TEST_WRITE=true in .env
 */
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { assertTenantContext, tenantFieldsFromContext } from "../utils/tenantContext";

let testWriteRan = false;

export async function testWrite() {
  let ctx = null;
  try {
    ctx = await getUserContext();
  } catch {
    return null;
  }
  const tenant = tenantFieldsFromContext({
    organisationId: ctx.organisationId,
    hospitalId: ctx.hospitalId,
    wardId: ctx.wardId,
  });
  if (!tenant.organisationId?.trim()) {
    return null;
  }
  assertTenantContext(tenant.organisationId, tenant.hospitalId);

  const payload = {
    message: "Firebase working",
    organisationId: tenant.organisationId,
    hospitalId: tenant.hospitalId,
    wardId: tenant.wardId,
    createdAt: serverTimestamp(),
  };
  if (import.meta.env.DEV) {
    console.log("Debug:", { testWrite: "saving" });
  }
  try {
    const docRef = await addDoc(collection(db, "test"), payload);
    if (import.meta.env.DEV) {
      console.log("Debug:", { testWriteOk: true });
    }
    return docRef.id;
  } catch (err) {
    console.warn("Test write failed", err);
    // Fail-safe: never throw here. This script runs during app boot and
    // an unhandled rejection can prevent the UI from rendering.
    return null;
  }
}

/** Avoid duplicate runs under React StrictMode (dev double-mount). */
export function runFirestoreTestWriteOnce() {
  if (import.meta.env.DEV !== true) return;
  if (testWriteRan) return;
  testWriteRan = true;
  // Ensure no unhandled promise rejections from this boot-time test.
  void testWrite().catch(() => null);
}
