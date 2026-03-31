/**
 * Lightweight audit rows for management actions (Firestore `audit_logs`).
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

/**
 * @param {{ action: string, entityType: string, entityId: string, organisationId?: string | null }} p
 */
export async function logManagementAudit(p) {
  const uid = auth.currentUser?.uid ?? null;
  try {
    await addDoc(collection(db, "audit_logs"), {
      action: p.action,
      entityType: p.entityType,
      entityId: p.entityId,
      userId: uid,
      organisationId: p.organisationId ?? null,
      timestamp: serverTimestamp(),
    });
  } catch {
    // non-fatal
  }
}
