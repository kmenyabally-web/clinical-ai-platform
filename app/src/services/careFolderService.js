// src/services/careFolderService.js

/** [ENABLEMENT GATE: STAGE 5 - CLINICAL READ ENABLED]
 *
 * Care folder service – Stage 4 & 5 (Readiness + Clinical Read).
 *
 * Stage 4 (not fully shown here):
 * - getFolderReadiness(patientId, options) – metadata‑only readiness view.
 *
 * Stage 5:
 * - getDocumentContent(patientId, docId) – full clinical content read
 *   for authorised roles (staff, manager, admin) within scoped org/service.
 *
 * Audit:
 * - Readiness checks log VIEW / DOCUMENT_METADATA.
 * - Content reads log VIEW_CONTENT / DOCUMENT.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { logEvent } from "./auditService";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "../constants/auditTaxonomy";

/** [ENABLEMENT GATE: STAGE 5 - CLINICAL READ ENABLED]
 *
 * getDocumentContent(patientId, docId)
 *
 * Returns a full clinical document for authorised roles.
 *
 * Enforcement:
 * - Only roles staff, manager, admin may read content.
 * - organisationId is verified via user claims.
 * - The document must belong to the same organisation.
 *
 * Data integrity:
 * - Read‑only; this function does NOT write or update clinical data.
 * - Does NOT expose auditLog collection; separation of duties is preserved.
 *
 * Audit:
 * - Logs a VIEW_CONTENT event for entityType DOCUMENT, including docId.
 */
export async function getDocumentContent(patientId, docId) {
  const { role, organisationId } = await getUserContext();

  if (!organisationId || !patientId || !docId) {
    throw new Error("Missing organisation, patient, or document context.");
  }

  const allowedRoles = new Set(["staff", "manager", "admin"]);
  if (!allowedRoles.has(role)) {
    // Inspectors and any other roles are blocked from content reads at Stage 5.
    throw new Error(
      "Access denied: role not permitted to read clinical content at this gate."
    );
  }

  // Anchor read at the patient-level careFolder subcollection.
  const docRef = doc(db, "people", patientId, "careFolder", docId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("Clinical document not found.");
  }

  const data = snap.data() || {};

  // Confirm org scoping: the document must belong to the same organisation.
  if (data.organisationId && data.organisationId !== organisationId) {
    throw new Error(
      "Access denied: organisation scope mismatch for clinical document."
    );
  }

  const result = {
    id: snap.id,
    documentType: data.documentType ?? "",
    title: data.title ?? "",
    status: data.status ?? null,
    lastReviewDate: data.lastReviewDate ?? null,
    lastReviewedBy: data.lastReviewedBy ?? null,
    content: data.content ?? "",
  };

  try {
    await logEvent({
      action: AUDIT_ACTIONS.VIEW_CONTENT || AUDIT_ACTIONS.VIEW,
      entityType: AUDIT_ENTITIES.DOCUMENT,
      entityId: docId,
      entityName: result.title || result.documentType || "CLINICAL_DOCUMENT",
      patientId,
    });
  } catch {
    // logEvent already logs a critical non‑PHI error.
  }

  return result;
}

