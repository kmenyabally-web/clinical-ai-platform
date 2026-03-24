/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] — unified clinical core */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { addTimelineEntry } from "./patientTimelineService";
import type { ClinicalNote, ClinicalStructuredFields } from "../types/clinical";

/** Primary collection for clinical notes (Firestore source of truth). */
export const NOTES_COLLECTION = "notes";

/** Legacy collection — read-only merge for existing deployments. New writes use {@link NOTES_COLLECTION}. */
const LEGACY_CLINICAL_NOTES_COLLECTION = "clinical_notes";

function createdAtMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "object" && v !== null && "toMillis" in v && typeof (v as { toMillis: () => number }).toMillis === "function") {
    try {
      return (v as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (v instanceof Date) return v.getTime();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

const ALLOWED_CATEGORIES = ["Routine", "Emergency", "Wellbeing", "Structured"];

function safeStructured(raw: unknown): ClinicalStructuredFields | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: ClinicalStructuredFields = {};
  if (typeof o.behaviour === "string") out.behaviour = o.behaviour;
  if (typeof o.mood === "string") out.mood = o.mood;
  if (typeof o.engagement === "string") out.engagement = o.engagement;
  if (typeof o.physicalHealth === "string") out.physicalHealth = o.physicalHealth;
  if (typeof o.medicationIssues === "string") out.medicationIssues = o.medicationIssues;
  if (typeof o.summary === "string") out.summary = o.summary;
  if (Array.isArray(o.riskIndicators)) {
    out.riskIndicators = o.riskIndicators.map((x) => String(x)).filter(Boolean);
  }
  if (Array.isArray(o.incidents)) {
    out.incidents = o.incidents.map((x) => String(x)).filter(Boolean);
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Maps Firestore → ClinicalNote with safe fallbacks when `structured` or `discipline` are absent.
 * Merges legacy top-level `mood` into structured for consistent UI consumption.
 */
export function mapFirestoreClinicalNote(
  id: string,
  data: Record<string, unknown> | undefined | null
): ClinicalNote & { mood?: string | null } {
  const x = data ?? {};
  const structured = safeStructured(x.structured);
  const legacyMood = x.mood != null && String(x.mood).trim() !== "" ? String(x.mood) : null;
  const structuredMood = structured?.mood?.trim();
  const mergedStructured: ClinicalStructuredFields | undefined = (() => {
    if (!structured && !legacyMood) return undefined;
    const base: ClinicalStructuredFields = { ...(structured ?? {}) };
    if (legacyMood && !structuredMood) base.mood = legacyMood;
    return Object.keys(base).length ? base : undefined;
  })();

  const category = typeof x.category === "string" ? x.category : undefined;
  const discipline =
    typeof x.discipline === "string" && x.discipline.trim()
      ? x.discipline.trim()
      : category?.trim() || "Clinical";

  return {
    id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    discipline,
    category,
    content: typeof x.content === "string" ? x.content : "",
    structured: mergedStructured,
    createdAt: x.createdAt ?? null,
    authorEmail: typeof x.authorEmail === "string" ? x.authorEmail : undefined,
    mood: legacyMood,
  };
}

export async function addClinicalNote(
  patientId: string,
  noteData: Record<string, unknown>
): Promise<{ id: string }> {
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
  const serviceId = (noteData.serviceId as string | null | undefined) ?? null;
  const disciplineRaw = (noteData.discipline ?? "").toString().trim();
  const structured = safeStructured(noteData.structured);

  if (!content) throw new Error("content is required.");
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(`category is required and must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`);
  }
  if (!authorEmail) throw new Error("authorEmail is required.");

  const discipline = disciplineRaw.trim();
  if (!discipline) {
    throw new Error("MDT role (discipline) is required. Select a role from the list.");
  }

  const noteDoc: Record<string, unknown> = {
    organisationId,
    patientId: targetPatientId,
    content,
    category,
    discipline,
    authorEmail,
    mood,
    createdAt: serverTimestamp(),
  };
  if (structured) noteDoc.structured = structured;

  const noteSnap = await addDoc(collection(db, NOTES_COLLECTION), noteDoc);

  try {
    await addTimelineEntry({
      organisationId,
      patientId: targetPatientId,
      serviceId: serviceId ?? null,
      eventType: "clinical_note",
      eventTitle: `${category} clinical note`,
      eventDescription: content,
      sourceCollection: NOTES_COLLECTION,
      sourceId: noteSnap.id,
      createdBy: authorEmail,
      metadata: { category, mood, discipline, structured },
    });
  } catch {
    console.warn("Clinical note timeline entry failed (non-fatal).");
  }

  return { id: noteSnap.id };
}

/**
 * Read from `notes` (or legacy) with org scope. Tries orderBy first; on failure (missing index / rules),
 * falls back to equality-only query + client-side sort so notes still display.
 */
async function fetchNotesFromCollection(
  collectionName: string,
  organisationId: string,
  patientId: string | null,
  limitCount: number
): Promise<Array<ClinicalNote & { mood?: string | null }>> {
  const col = collection(db, collectionName);
  const pid = patientId ? (patientId ?? "").toString().trim() : "";
  const cap = Math.min(500, Math.max(limitCount, 50));

  const mapDocs = (snapshot: Awaited<ReturnType<typeof getDocs>>) =>
    (snapshot?.docs ?? []).map((d) => mapFirestoreClinicalNote(d.id, d.data() as Record<string, unknown>));

  const sortAndSlice = (rows: Array<ClinicalNote & { mood?: string | null }>) => {
    rows.sort((x, y) => createdAtMillis(y.createdAt) - createdAtMillis(x.createdAt));
    return rows.slice(0, limitCount);
  };

  const constraintsBase: ReturnType<typeof where>[] = [where("organisationId", "==", organisationId)];
  if (pid) constraintsBase.push(where("patientId", "==", pid));

  try {
    const qOrdered = query(
      col,
      ...constraintsBase,
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(qOrdered);
    return mapDocs(snapshot);
  } catch (err) {
    console.warn(
      `[noteService] orderBy query failed for "${collectionName}" (add Firestore composite index if possible). Using client sort.`,
      err
    );
    const qFallback = query(col, ...constraintsBase, limit(cap));
    const snapshot = await getDocs(qFallback);
    return sortAndSlice(mapDocs(snapshot));
  }
}

/**
 * Loads structured notes from Firestore. Merges `notes` (canonical) with legacy `clinical_notes` for continuity.
 */
export async function fetchClinicalNotesForOrganisation({
  patientId = null,
  limitCount = 300,
}: {
  patientId?: string | null;
  limitCount?: number;
} = {}): Promise<Array<ClinicalNote & { mood?: string | null }>> {
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const [a, b] = await Promise.all([
    fetchNotesFromCollection(NOTES_COLLECTION, organisationId, patientId, limitCount).catch((e) => {
      console.error(`[noteService] Failed to read "${NOTES_COLLECTION}":`, e);
      return [];
    }),
    fetchNotesFromCollection(LEGACY_CLINICAL_NOTES_COLLECTION, organisationId, patientId, limitCount).catch((e) => {
      console.warn(`[noteService] Legacy "${LEGACY_CLINICAL_NOTES_COLLECTION}" read skipped:`, e);
      return [];
    }),
  ]);

  const seen = new Set<string>();
  const merged: Array<ClinicalNote & { mood?: string | null }> = [];
  for (const row of [...a, ...b]) {
    const key = `${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }

  merged.sort((x, y) => createdAtMillis(y.createdAt) - createdAtMillis(x.createdAt));
  return merged.slice(0, limitCount);
}

export async function fetchClinicalNotesForPatient(
  patientId: string,
  { limitCount = 10 } = {}
): Promise<Array<ClinicalNote & { mood?: string | null }>> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];
  return fetchClinicalNotesForOrganisation({ patientId: pid, limitCount });
}

/**
 * Create or update a full clinical note (e.g. AI Studio / structured ingestion).
 * Preserves governance and writes optional `structured` payload when provided.
 */
export async function saveClinicalNote(note: ClinicalNote): Promise<{ id: string }> {
  const { organisationId } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const patientId = (note.patientId ?? "").toString().trim();
  if (!patientId) throw new Error("patientId is required.");

  const content = (note.content ?? "").toString().trim();
  if (!content) throw new Error("content is required.");

  const authorEmail = (note.authorEmail ?? auth.currentUser?.email ?? "").toString().trim();
  if (!authorEmail) throw new Error("authorEmail is required.");

  const discipline = (note.discipline ?? "").toString().trim();
  if (!discipline) {
    throw new Error("MDT role (discipline) is required.");
  }
  const rawCategory = (note.category ?? "").toString().trim();
  const category = ALLOWED_CATEGORIES.includes(rawCategory) ? rawCategory : "Structured";
  const structured = safeStructured(note.structured);

  const basePayload: Record<string, unknown> = {
    organisationId,
    patientId,
    discipline,
    category,
    content,
    authorEmail,
    mood: structured?.mood ?? null,
    structured: structured ?? null,
    updatedAt: serverTimestamp(),
  };

  const noteId = (note.id ?? "").toString().trim();

  if (noteId) {
    const ref = doc(db, NOTES_COLLECTION, noteId);
    await updateDoc(ref, basePayload);
    try {
      await addTimelineEntry({
        organisationId,
        patientId,
        serviceId: null,
        eventType: "clinical_note",
        eventTitle: `${category} clinical note (updated)`,
        eventDescription: content,
        sourceCollection: NOTES_COLLECTION,
        sourceId: noteId,
        createdBy: authorEmail,
        metadata: { category, discipline, structured },
      });
    } catch {
      console.warn("Clinical note timeline update entry failed (non-fatal).");
    }
    return { id: noteId };
  }

  const noteSnap = await addDoc(collection(db, NOTES_COLLECTION), {
    ...basePayload,
    createdAt: serverTimestamp(),
  });

  try {
    await addTimelineEntry({
      organisationId,
      patientId,
      serviceId: null,
      eventType: "clinical_note",
      eventTitle: `${category} clinical note`,
      eventDescription: content,
      sourceCollection: NOTES_COLLECTION,
      sourceId: noteSnap.id,
      createdBy: authorEmail,
      metadata: { category, discipline, structured },
    });
  } catch {
    console.warn("Clinical note timeline entry failed (non-fatal).");
  }

  return { id: noteSnap.id };
}
