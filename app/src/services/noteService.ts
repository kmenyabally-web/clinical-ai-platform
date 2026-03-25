/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] — unified clinical core */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { logAction, logAudit } from "./auditService";
import { safeModeFields } from "../utils/safeMode";
import { getUserContext } from "./authService";
import { addTimelineEntry, PATIENT_TIMELINE_COLLECTION } from "./patientTimelineService";
import { getPatientById } from "./patientService";
import { getCurrentUserProfile } from "./organisation";
import { BEHAVIOURS_COLLECTION, extractBehaviourFromNote } from "./behaviourService";
import { processClinicalNote } from "./geminiAiService.js";
import { evaluateRisk } from "./riskEngine.js";
import { assertTenantContext } from "../utils/tenantContext.js";
import type {
  ClinicalCareFolder,
  ClinicalMdtReview,
  ClinicalNote,
  ClinicalReports,
  ClinicalStructuredData,
  ClinicalStructuredFields,
  ClinicalSummary,
} from "../types/clinical";

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
  if (typeof o.risk === "string") out.risk = o.risk;
  if (typeof o.physicalHealth === "string") out.physicalHealth = o.physicalHealth;
  if (typeof o.medicationIssues === "string") out.medicationIssues = o.medicationIssues;
  if (typeof o.progress === "string") out.progress = o.progress;
  if (typeof o.summary === "string") out.summary = o.summary;
  if (Array.isArray(o.riskIndicators)) {
    out.riskIndicators = o.riskIndicators.map((x) => String(x)).filter(Boolean);
  }
  if (Array.isArray(o.incidents)) {
    out.incidents = o.incidents.map((x) => String(x)).filter(Boolean);
  }
  return Object.keys(out).length ? out : undefined;
}

function safeString(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim();
  return s ? s : undefined;
}

function safeStructuredData(raw: unknown): ClinicalStructuredData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const structured = safeStructured(o);
  if (!structured && !safeString(o.discipline)) return undefined;
  return {
    ...(structured ?? {}),
    discipline: safeString(o.discipline) ?? structured?.discipline,
  };
}

function safeSummaries(raw: unknown): ClinicalSummary[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const out = raw
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const item = x as Record<string, unknown>;
        const title = safeString(item.title) ?? "Summary";
        const text = safeString(item.text) ?? "";
        if (!text) return null;
        return { title, text };
      })
      .filter(Boolean) as ClinicalSummary[];
    return out.length ? out : undefined;
  }
  // Backward compatibility: allow simple string array
  if (Array.isArray((raw as any).summaries)) return safeSummaries((raw as any).summaries);
  return undefined;
}

function safeMdtReview(raw: unknown, disciplineFallback: string): ClinicalMdtReview | null | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const summary = safeString(o.summary) ?? "";
  const discipline = safeString(o.discipline) ?? disciplineFallback ?? "Clinical";
  const recommendations = Array.isArray(o.recommendations) ? o.recommendations.map((x) => safeString(x) ?? "").filter(Boolean) : [];
  const risksToAddress = Array.isArray(o.risksToAddress) ? o.risksToAddress.map((x) => safeString(x) ?? "").filter(Boolean) : [];
  const nextActions = Array.isArray(o.nextActions) ? o.nextActions.map((x) => safeString(x) ?? "").filter(Boolean) : [];
  if (!summary && recommendations.length === 0 && risksToAddress.length === 0 && nextActions.length === 0) return undefined;
  return { discipline, summary: summary || "Not documented", recommendations, risksToAddress, nextActions };
}

function safeReports(raw: unknown): ClinicalReports | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const toSection = (v: unknown): { title: string; content: string } | undefined => {
    if (!v || typeof v !== "object") return undefined;
    const x = v as Record<string, unknown>;
    const title = safeString(x.title);
    const content = safeString(x.content);
    if (!title && !content) return undefined;
    return { title: title ?? "Report section", content: content ?? "" };
  };
  const reports: ClinicalReports = {
    cpa: toSection(o.cpa),
    tribunal: toSection(o.tribunal),
    mdtReview: toSection(o.mdtReview),
  };
  if (!reports.cpa && !reports.tribunal && !reports.mdtReview) return undefined;
  return reports;
}

function safeCareFolder(raw: unknown): ClinicalCareFolder | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const placementsRaw = Array.isArray(o.suggestedPlacements) ? o.suggestedPlacements : [];
  const suggestedPlacements = placementsRaw
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const item = x as Record<string, unknown>;
      const section = safeString(item.section);
      const documentType = safeString(item.documentType);
      const title = safeString(item.title);
      const content = safeString(item.content);
      if (!section || !documentType || !title || !content) return null;
      return { section, documentType, title, content };
    })
    .filter(Boolean) as ClinicalCareFolder["suggestedPlacements"] extends Array<infer T> ? T[] : any;
  const careFolder: ClinicalCareFolder = { suggestedPlacements: suggestedPlacements.length ? suggestedPlacements : [] };
  if (!careFolder.suggestedPlacements || careFolder.suggestedPlacements.length === 0) return undefined;
  return careFolder;
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
    organisationId: typeof x.organisationId === "string" ? x.organisationId : undefined,
    hospitalId: typeof x.hospitalId === "string" ? x.hospitalId : undefined,
    wardId: typeof x.wardId === "string" ? x.wardId : undefined,
    content: typeof x.content === "string" ? x.content : "",
    originalText: typeof x.originalText === "string" ? x.originalText : undefined,
    correctedText: typeof x.correctedText === "string" ? x.correctedText : undefined,
    aiSummary: x.aiSummary != null ? String(x.aiSummary) : null,
    behaviour: x.behaviour != null ? String(x.behaviour) : null,
    risk: x.risk != null ? String(x.risk) : null,
    engagement: x.engagement != null ? String(x.engagement) : null,
    structured: mergedStructured,
    correctedNote: safeString(x.correctedNote),
    structuredData: safeStructuredData(x.structuredData),
    summaries: safeSummaries(x.summaries),
    mdtReview: safeMdtReview(x.mdtReview, discipline) ?? null,
    reports: safeReports(x.reports) ?? null,
    careFolder: safeCareFolder(x.careFolder) ?? null,
    createdAt: x.createdAt ?? null,
    authorEmail: typeof x.authorEmail === "string" ? x.authorEmail : undefined,
    mood: legacyMood,
    authorId: typeof x.authorId === "string" ? x.authorId : undefined,
    authorRole: typeof x.authorRole === "string" || x.authorRole === null ? (x.authorRole as string | null) : undefined,
    mdtRole: typeof x.mdtRole === "string" || x.mdtRole === null ? (x.mdtRole as string | null) : undefined,
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

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role: authorRole } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const mdtProfile = auth.currentUser?.uid ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const mdtRole = mdtProfile?.mdtRole ?? null;

  const content = (noteData.content ?? "").toString().trim();
  const category = (noteData.category ?? "").toString().trim();
  const authorEmail = (noteData.authorEmail ?? auth.currentUser?.email ?? "").toString().trim();
  const authorId = auth.currentUser?.uid ?? null;
  const mood = (noteData.mood ?? "").toString().trim() || null;
  const serviceId = (noteData.serviceId as string | null | undefined) ?? null;
  const disciplineRaw = (noteData.discipline ?? "").toString().trim();
  const structuredData = safeStructuredData(noteData.structuredData ?? noteData.structured);
  const structured = safeStructured(noteData.structuredData ?? noteData.structured);
  const correctedNote = safeString(noteData.correctedNote);

  const summaries = safeSummaries(noteData.summaries);
  const mdtReview = safeMdtReview(noteData.mdtReview, disciplineRaw) ?? null;
  const reports = safeReports(noteData.reports) ?? null;
  const careFolder = safeCareFolder(noteData.careFolder) ?? null;

  if (!content) throw new Error("content is required.");
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(`category is required and must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`);
  }
  if (!authorEmail) throw new Error("authorEmail is required.");

  const discipline = disciplineRaw.trim();
  if (!discipline) {
    throw new Error("MDT role (discipline) is required. Select a role from the list.");
  }

  // Denormalise patient tenant scope onto the note document so Firestore
  // security rules can enforce hospital scoping without cross-document reads.
  const patient = await getPatientById(targetPatientId);
  const hospitalId = patient.hospitalId || (ctxHospitalId ? String(ctxHospitalId) : "");
  const wardId = patient.wardId || (ctxWardId ? String(ctxWardId) : "");

  if (!hospitalId) {
    throw new Error("hospitalId is required to create clinical notes.");
  }

  const aiResult = (await processClinicalNote(content).catch(() => null)) as Record<string, unknown> | null;

  const correctedTextRaw = aiResult?.correctedText != null ? String(aiResult.correctedText).trim() : "";
  const correctedText = correctedTextRaw || content;
  const aiSummary =
    aiResult?.summary != null && String(aiResult.summary).trim() !== "" ? String(aiResult.summary).trim() : null;

  const riskData = evaluateRisk({
    correctedText:
      (aiResult?.correctedText != null ? String(aiResult.correctedText) : "") || content,
  });

  const noteDoc: Record<string, unknown> = {
    ...safeModeFields(),
    organisationId,
    patientId: targetPatientId,
    hospitalId,
    wardId,
    originalText: content,
    correctedText,
    content: correctedText,
    category,
    discipline,
    authorEmail,
    authorId: authorId ?? undefined,
    authorRole: authorRole ?? null,
    mdtRole,
    mood: aiResult?.mood != null ? (String(aiResult.mood).trim() || null) : mood ?? null,
    behaviour: aiResult?.behaviour != null ? String(aiResult.behaviour).trim() || null : null,
    risk: aiResult?.risk != null ? String(aiResult.risk).trim() || null : null,
    engagement: aiResult?.engagement != null ? String(aiResult.engagement).trim() || null : null,
    incidents: aiResult?.incidents != null ? String(aiResult.incidents).trim() || null : null,
    aiSummary,
    createdAt: serverTimestamp(),
  };
  if (structured) noteDoc.structured = structured;
  if (correctedNote) noteDoc.correctedNote = correctedNote;
  if (structuredData) noteDoc.structuredData = structuredData;
  if (summaries) noteDoc.summaries = summaries;
  if (mdtReview) noteDoc.mdtReview = mdtReview;
  if (reports) noteDoc.reports = reports;
  if (careFolder) noteDoc.careFolder = careFolder;

  assertTenantContext(organisationId, hospitalId);

  const noteSnap = await addDoc(collection(db, NOTES_COLLECTION), noteDoc);

  try {
    await addDoc(collection(db, "risk_alerts"), {
      ...safeModeFields(),
      patientId: targetPatientId,
      organisationId,
      hospitalId,
      wardId,
      noteId: noteSnap.id,
      ...riskData,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("risk_alerts write failed (non-fatal).", e);
  }

  const behaviour = await extractBehaviourFromNote(correctedText);
  try {
    await addDoc(collection(db, BEHAVIOURS_COLLECTION), {
      ...safeModeFields(),
      patientId: targetPatientId,
      organisationId,
      hospitalId,
      wardId,
      noteId: noteSnap.id,
      discipline,
      ...behaviour,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Behaviour record write failed (non-fatal).", e);
  }

  try {
    await addDoc(collection(db, PATIENT_TIMELINE_COLLECTION), {
      organisationId,
      hospitalId,
      wardId,
      patientId: targetPatientId,
      type: "NOTE",
      refId: noteSnap.id,
      summary: (aiSummary ?? correctedText).slice(0, 120),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("patient_timeline NOTE link failed (non-fatal).", e);
  }

  try {
    await addTimelineEntry({
      organisationId,
      patientId: targetPatientId,
      hospitalId,
      wardId,
      serviceId: serviceId ?? undefined,
      eventType: "clinical_note",
      eventTitle: `${category} clinical note`,
      eventDescription: correctedText,
      sourceCollection: NOTES_COLLECTION,
      sourceId: noteSnap.id,
      createdBy: authorEmail,
      metadata: { category, mood, discipline, structured, aiSummary },
    });
  } catch {
    console.warn("Clinical note timeline entry failed (non-fatal).");
  }

  void logAction("CLINICAL_NOTE_CREATE", auth.currentUser?.uid ?? null);
  void logAudit("CREATE_NOTE", {
    userId: auth.currentUser?.uid ?? null,
    organisationId,
    patientId: targetPatientId,
    noteId: noteSnap.id,
  });

  return { id: noteSnap.id };
}

/**
 * Read from `notes` (or legacy) with org scope. Tries orderBy first; on failure (missing index / rules),
 * falls back to equality-only query + client-side sort so notes still display.
 */
async function fetchNotesFromCollection(
  collectionName: string,
  organisationId: string,
  hospitalId: string | null,
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
  if (hospitalId) constraintsBase.push(where("hospitalId", "==", hospitalId));
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
  const { organisationId, hospitalId: ctxHospitalId } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");
  if (!ctxHospitalId) throw new Error("hospitalId is required for clinical note queries.");

  const [a, b] = await Promise.all([
    fetchNotesFromCollection(NOTES_COLLECTION, organisationId, ctxHospitalId ?? null, patientId, limitCount).catch((e) => {
      console.error(`[noteService] Failed to read "${NOTES_COLLECTION}":`, e);
      return [];
    }),
    // Legacy notes may not have `hospitalId` denormalised; read without hospital filter then enforce via patient lookup when needed.
    fetchNotesFromCollection(LEGACY_CLINICAL_NOTES_COLLECTION, organisationId, null, patientId, limitCount).catch((e) => {
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

  // Hospital boundary enforcement for organisation-scoped note listing.
  // Notes themselves are scoped by (organisationId, patientId), so we filter by
  // each patient's hospitalId when listing across multiple patients.
  if (ctxHospitalId && !patientId) {
    const uniquePatientIds = Array.from(
      new Set(merged.map((n) => (n.patientId ?? "").toString().trim()).filter(Boolean))
    );

    const hospitalByPatientId = new Map<string, string | null>();
    await Promise.all(
      uniquePatientIds.map(async (pid) => {
        try {
          const snap = await getDoc(doc(db, "patients", pid));
          const x = snap?.data?.() ?? {};
          const orgOk = x.organisationId ? x.organisationId === organisationId : x.organisationId === organisationId;
          const hosp = typeof x.hospitalId === "string" ? x.hospitalId : null;
          hospitalByPatientId.set(pid, orgOk ? hosp : null);
        } catch {
          hospitalByPatientId.set(pid, null);
        }
      })
    );

    const filtered = merged.filter((n) => hospitalByPatientId.get(String(n.patientId ?? "")) === ctxHospitalId);
    merged.splice(0, merged.length, ...filtered);
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
  // Validate tenant scope (organisation + hospital) for this specific patient.
  await getPatientById(pid);
  return fetchClinicalNotesForOrganisation({ patientId: pid, limitCount });
}

/**
 * Create or update a full clinical note (e.g. AI Studio / structured ingestion).
 * Preserves governance and writes optional `structured` payload when provided.
 */
export async function saveClinicalNote(note: ClinicalNote): Promise<{ id: string }> {
  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role: ctxRole } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");
  if (!ctxHospitalId) throw new Error("hospitalId is required for clinical note writes.");

  const mdtProfileSave = auth.currentUser?.uid ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const mdtRoleSave = mdtProfileSave?.mdtRole ?? null;

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
  const structuredData = safeStructuredData(note.structuredData ?? note.structured);
  const correctedNote = safeString(note.correctedNote);
  const summaries = safeSummaries(note.summaries);
  const mdtReview = safeMdtReview(note.mdtReview, discipline) ?? null;
  const reports = safeReports(note.reports) ?? null;
  const careFolder = safeCareFolder(note.careFolder) ?? null;

  const patient = await getPatientById(patientId);
  const hospitalId = patient.hospitalId || (ctxHospitalId ? String(ctxHospitalId) : "");
  const wardId = patient.wardId || (ctxWardId ? String(ctxWardId) : "");
  if (!hospitalId) throw new Error("hospitalId is required to save clinical notes.");

  const authorId = auth.currentUser?.uid ?? null;
  const authorRole = ctxRole ?? note.authorRole ?? null;

  // Safety rule: when updating an existing note, never overwrite the original raw note text.
  // We only update structured/AI fields.
  const updatePayload: Record<string, unknown> = {
    organisationId,
    patientId,
    hospitalId,
    wardId,
    discipline,
    category,
    authorEmail,
    authorId: authorId ?? undefined,
    authorRole: authorRole ?? null,
    mood: structured?.mood ?? null,
    structured: structured ?? null,
    updatedAt: serverTimestamp(),
  };
  if (correctedNote) updatePayload.correctedNote = correctedNote;
  if (structuredData) updatePayload.structuredData = structuredData;
  if (summaries) updatePayload.summaries = summaries;
  if (mdtReview) updatePayload.mdtReview = mdtReview;
  if (reports) updatePayload.reports = reports;
  if (careFolder) updatePayload.careFolder = careFolder;

  const createPayload: Record<string, unknown> = {
    ...safeModeFields(),
    ...updatePayload,
    content,
    mdtRole: mdtRoleSave,
    mood: structured?.mood ?? null,
    behaviour: null,
    incidents: null,
    risks: null,
    engagement: null,
  };

  const noteId = (note.id ?? "").toString().trim();

  if (noteId) {
    const ref = doc(db, NOTES_COLLECTION, noteId);
    await updateDoc(ref, updatePayload);
    try {
      await addTimelineEntry({
        organisationId,
        patientId,
        hospitalId,
        wardId,
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

  assertTenantContext(organisationId, hospitalId);

  const noteSnap = await addDoc(collection(db, NOTES_COLLECTION), { ...createPayload, createdAt: serverTimestamp() });

  const behaviourSave = await extractBehaviourFromNote(content);
  try {
    await addDoc(collection(db, BEHAVIOURS_COLLECTION), {
      ...safeModeFields(),
      patientId,
      organisationId,
      hospitalId,
      wardId,
      noteId: noteSnap.id,
      discipline,
      ...behaviourSave,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Behaviour record write failed (non-fatal).", e);
  }

  try {
    await addDoc(collection(db, PATIENT_TIMELINE_COLLECTION), {
      organisationId,
      hospitalId,
      wardId,
      patientId,
      type: "NOTE",
      refId: noteSnap.id,
      summary: content.slice(0, 120),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("patient_timeline NOTE link failed (non-fatal).", e);
  }

  try {
    await addTimelineEntry({
      organisationId,
      patientId,
      hospitalId,
      wardId,
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

  void logAction("CLINICAL_NOTE_CREATE", auth.currentUser?.uid ?? null);

  return { id: noteSnap.id };
}

/**
 * Update AI-only fields for an existing note.
 * Safety: does not touch raw `content`, `discipline`, or `category` unless the caller includes them.
 */
export async function updateClinicalNoteAiOutputs(
  noteId: string,
  aiPatch: Record<string, unknown>
): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");
  if (!aiPatch || typeof aiPatch !== "object") throw new Error("aiPatch is required.");

  const ref = doc(db, NOTES_COLLECTION, id);
  await updateDoc(ref, aiPatch);
}
