/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { addTimelineEntry } from "./patientTimelineService";

const CLINICAL_NOTES_COLLECTION = "clinical_notes";

const ALLOWED_CATEGORIES = ["Routine", "Emergency", "Wellbeing"];

export async function addClinicalNote(patientId, noteData) {
  const targetPatientId = (patientId ?? "").toString().trim();
  if (!targetPatientId) throw new Error("patientId is required.");

  if (!noteData || typeof noteData !== "object") {
    throw new Error("noteData is required.");
  }

  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const content = (noteData.content ?? "").toString().trim();
  const category = (noteData.category ?? "").toString().trim();
  const authorEmail = (noteData.authorEmail ?? auth.currentUser?.email ?? "").toString().trim();
  const mood = (noteData.mood ?? "").toString().trim() || null;
  const serviceId = noteData.serviceId ?? null;

  if (!content) throw new Error("content is required.");
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(`category is required and must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`);
  }
  if (!authorEmail) throw new Error("authorEmail is required.");

  // 1) Primary record in clinical_notes
  const noteDoc = {
    organisationId,
    patientId: targetPatientId,
    content,
    category,
    authorEmail,
    mood,
    createdAt: serverTimestamp(),
  };

  const noteSnap = await addDoc(collection(db, CLINICAL_NOTES_COLLECTION), noteDoc);

  // 2) Also create a patient_timeline entry for compatibility with existing UI
  //    and compliance calculations.
  try {
    await addTimelineEntry({
      organisationId,
      patientId: targetPatientId,
      serviceId: serviceId ?? null,
      eventType: "clinical_note",
      eventTitle: `${category} clinical note`,
      eventDescription: content,
      sourceCollection: CLINICAL_NOTES_COLLECTION,
      sourceId: noteSnap.id,
      createdBy: authorEmail,
      metadata: { category, mood },
    });
  } catch {
    // If timeline write fails due to rules/index gaps, the primary clinical note still exists.
    // eslint-disable-next-line no-console
    console.warn("Clinical note timeline entry failed (non-fatal).");
  }

  return { id: noteSnap.id };
}

export async function fetchClinicalNotesForOrganisation({ patientId = null, limitCount = 300 } = {}) {
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const constraints = [where("organisationId", "==", organisationId)];
  if (patientId) {
    const pid = (patientId ?? "").toString().trim();
    if (pid) constraints.push(where("patientId", "==", pid));
  }

  const q = query(
    collection(db, CLINICAL_NOTES_COLLECTION),
    ...constraints,
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  const docs = snapshot?.docs ?? [];

  return docs.map((d) => {
    const x = d?.data?.() ?? {};
    return {
      id: d?.id ?? "",
      patientId: x.patientId ?? "",
      content: x.content ?? "",
      category: x.category ?? "",
      mood: x.mood ?? null,
      authorEmail: x.authorEmail ?? "",
      createdAt: x.createdAt ?? null,
    };
  });
}

export async function fetchClinicalNotesForPatient(patientId, { limitCount = 10 } = {}) {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];
  return fetchClinicalNotesForOrganisation({ patientId: pid, limitCount });
}

