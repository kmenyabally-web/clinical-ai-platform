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
  type DocumentReference,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { logAction, logAudit, logAuditEvent, logEntityAudit } from "./auditService";
import { isDocumentActive } from "../utils/auditSchema";
import { canDeleteClinicalNotesAccess } from "../utils/rbac";
import { canApproveNote, getNormalizedNoteStatus, isSystemApproverRole } from "../utils/clinicalNoteApproval";
import { safeModeFields } from "../utils/safeMode";
import { getUserContext } from "./authService";
import { addTimelineEntry, PATIENT_TIMELINE_COLLECTION } from "./patientTimelineService";
import { getPatientById } from "./patientService";
import { getCurrentUserProfile } from "./organisation";
import { BEHAVIOURS_COLLECTION, extractBehaviourFromNote } from "./behaviourService";
import { processClinicalNote } from "./geminiAiService.js";
import { evaluateRisk } from "./riskEngine.js";
import { assertTenantContext, normalizeHospitalScopeId } from "../utils/tenantContext.js";
import { orgNotesCollection, orgNoteDocumentRef } from "../utils/tenantCollections";
import type { ClinicalNoteAddendumEntry, ClinicalNoteVersionEntry } from "../types/clinical";
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
export const NOTE_ADDENDUMS_COLLECTION = "note_addendums";

async function resolveClinicalNoteDocumentRef(organisationId: string, noteId: string): Promise<DocumentReference> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");
  const org = (organisationId ?? "").toString().trim();
  if (!org) throw new Error("Governance Error: organisationId is missing.");
  const nested = orgNoteDocumentRef(db, org, id);
  const nSnap = await getDoc(nested);
  if (nSnap.exists()) return nested;
  const root = doc(db, NOTES_COLLECTION, id);
  const rSnap = await getDoc(root);
  if (!rSnap.exists()) throw new Error("Note not found.");
  const row = rSnap.data() ?? {};
  const noteOrg = typeof row.organisationId === "string" ? row.organisationId.trim() : "";
  if (noteOrg && noteOrg !== org) throw new Error("403 Forbidden: organisation scope mismatch");
  return root;
}

/** Firestore rejects `undefined` anywhere in document data. */
function omitUndefinedFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function assertRequiredWriteContext({
  organisationId,
  hospitalId,
  userId,
}: {
  organisationId?: string | null;
  hospitalId?: string | null;
  userId?: string | null;
}) {
  if (!organisationId) throw new Error("Missing organisation");
  if (!hospitalId) throw new Error("Missing hospital");
  if (!userId) throw new Error("Missing user");
}

function assertCanApproveOrDeleteNotes(role: string | null | undefined): void {
  if (!canDeleteClinicalNotesAccess(role)) {
    throw new Error("Only Admin or Manager can approve or delete clinical notes.");
  }
}

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

function safeVersionEntries(raw: unknown): ClinicalNoteVersionEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ClinicalNoteVersionEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const content = typeof o.content === "string" ? o.content : "";
    const updatedBy = typeof o.updatedBy === "string" ? o.updatedBy : "";
    if (!content && !updatedBy) continue;
    out.push({
      content,
      updatedBy,
      updatedAt: o.updatedAt ?? null,
    });
  }
  return out.length ? out : undefined;
}

function safeAddendumEntries(raw: unknown): ClinicalNoteAddendumEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: ClinicalNoteAddendumEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const content = typeof o.content === "string" ? o.content : typeof (o as { text?: string }).text === "string" ? (o as { text: string }).text : "";
    const createdBy = typeof o.createdBy === "string" ? o.createdBy : "";
    const role = typeof o.role === "string" ? o.role : "";
    if (!id || !content) continue;
    out.push({
      id,
      content,
      createdBy,
      role,
      createdAt: o.createdAt ?? null,
      organisationId: typeof o.organisationId === "string" ? o.organisationId : undefined,
      hospitalId: typeof o.hospitalId === "string" ? o.hospitalId : undefined,
      wardId: typeof o.wardId === "string" ? o.wardId : undefined,
      patientId: typeof o.patientId === "string" ? o.patientId : undefined,
    });
  }
  return out.length ? out : undefined;
}

/**
 * Normalises structured AI payload for Firestore (no `undefined` field values).
 * When the payload only includes e.g. `risk`, merge `discipline` from the note form via `disciplineFallback`.
 */
function safeStructuredData(raw: unknown, disciplineFallback?: string): ClinicalStructuredData | undefined {
  const fb = safeString(disciplineFallback);
  if (!raw || typeof raw !== "object") {
    return fb ? { discipline: fb } : undefined;
  }
  const o = raw as Record<string, unknown>;
  const structured = safeStructured(o);
  const disc = safeString(o.discipline) ?? fb;
  if (!structured && !disc) return undefined;
  const out: Record<string, unknown> = { ...(structured ?? {}) };
  if (disc) out.discipline = disc;
  return Object.keys(out).length ? (out as ClinicalStructuredData) : undefined;
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

  const status = getNormalizedNoteStatus(x as Record<string, unknown>);

  return {
    id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    discipline,
    role: typeof x.role === "string" && x.role.trim() ? x.role.trim() : discipline,
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
    structuredData: safeStructuredData(x.structuredData, discipline),
    summaries: safeSummaries(x.summaries),
    mdtReview: safeMdtReview(x.mdtReview, discipline) ?? null,
    reports: safeReports(x.reports) ?? null,
    careFolder: safeCareFolder(x.careFolder) ?? null,
    createdAt: x.createdAt ?? null,
    status: status as "draft" | "final" | "approved",
    authorEmail: typeof x.authorEmail === "string" ? x.authorEmail : undefined,
    mood: legacyMood,
    authorId: typeof x.authorId === "string" ? x.authorId : undefined,
    createdBy: typeof x.createdBy === "string" ? x.createdBy : typeof x.authorId === "string" ? x.authorId : undefined,
    createdByRole:
      typeof x.createdByRole === "string" && x.createdByRole.trim()
        ? x.createdByRole.trim()
        : typeof x.mdtRole === "string" && x.mdtRole.trim()
          ? x.mdtRole.trim()
          : undefined,
    authorRole: typeof x.authorRole === "string" || x.authorRole === null ? (x.authorRole as string | null) : undefined,
    mdtRole: typeof x.mdtRole === "string" || x.mdtRole === null ? (x.mdtRole as string | null) : undefined,
    approvedBy: typeof x.approvedBy === "string" ? x.approvedBy : undefined,
    approvedAt: x.approvedAt ?? null,
    approvedByRole: typeof x.approvedByRole === "string" ? x.approvedByRole : undefined,
    updatedAt: x.updatedAt ?? null,
    updatedBy: typeof x.updatedBy === "string" ? x.updatedBy : undefined,
    updatedByEmail: typeof x.updatedByEmail === "string" ? x.updatedByEmail : undefined,
    isDeleted: x.isDeleted === true,
    versions: safeVersionEntries(x.versions),
    addendums: safeAddendumEntries(x.addendums),
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
  const userId = auth.currentUser?.uid ?? null;
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const requestedOrg =
    noteData.organisationId != null && String(noteData.organisationId).trim() !== ""
      ? String(noteData.organisationId).trim()
      : "";
  if (requestedOrg && requestedOrg !== organisationId) {
    throw new Error("organisationId mismatch between form and session.");
  }

  const mdtProfile = auth.currentUser?.uid ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const mdtRole = mdtProfile?.mdtRole ?? null;

  const content = (noteData.content ?? "").toString().trim();
  const category = (noteData.category ?? "").toString().trim();
  const authorEmail = (noteData.authorEmail ?? auth.currentUser?.email ?? "").toString().trim();
  const mood = (noteData.mood ?? "").toString().trim() || null;
  const serviceId = (noteData.serviceId as string | null | undefined) ?? null;
  const disciplineRaw = (noteData.discipline ?? "").toString().trim();
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

  const structuredData = safeStructuredData(noteData.structuredData ?? noteData.structured, discipline);
  const structured = safeStructured(noteData.structuredData ?? noteData.structured);

  // Denormalise patient tenant scope onto the note document so Firestore
  // security rules can enforce hospital scoping without cross-document reads.
  const patient = await getPatientById(targetPatientId);
  const hospitalId = patient.hospitalId || (ctxHospitalId ? String(ctxHospitalId) : "");
  const wardId = patient.wardId || (ctxWardId ? String(ctxWardId) : "");

  if (!hospitalId) {
    throw new Error("hospitalId is required to create clinical notes.");
  }
  assertRequiredWriteContext({ organisationId, hospitalId, userId });

  const aiResult = (await processClinicalNote(content).catch(() => null)) as Record<string, unknown> | null;

  const correctedTextRaw = aiResult?.correctedText != null ? String(aiResult.correctedText).trim() : "";
  const correctedText = correctedTextRaw || content;
  const aiSummary =
    aiResult?.summary != null && String(aiResult.summary).trim() !== "" ? String(aiResult.summary).trim() : null;

  const riskData = evaluateRisk({
    correctedText:
      (aiResult?.correctedText != null ? String(aiResult.correctedText) : "") || content,
  });

  const resolvedRisk =
    structured?.risk != null && String(structured.risk).trim() !== ""
      ? String(structured.risk).trim().toLowerCase()
      : aiResult?.risk != null && String(aiResult.risk).trim() !== ""
        ? String(aiResult.risk).trim().toLowerCase()
        : null;

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
    role: discipline,
    authorEmail,
    authorRole: authorRole ?? null,
    mdtRole,
    mood: aiResult?.mood != null ? (String(aiResult.mood).trim() || null) : mood ?? null,
    behaviour: aiResult?.behaviour != null ? String(aiResult.behaviour).trim() || null : null,
    risk: resolvedRisk,
    engagement: aiResult?.engagement != null ? String(aiResult.engagement).trim() || null : null,
    incidents: aiResult?.incidents != null ? String(aiResult.incidents).trim() || null : null,
    aiSummary,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "draft",
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    versions: [],
    addendums: [],
    ...(userId ? { authorId: userId, createdBy: userId, updatedBy: userId } : {}),
    ...(mdtRole ? { createdByRole: mdtRole } : {}),
  };
  if (structured) noteDoc.structured = structured;
  if (correctedNote) noteDoc.correctedNote = correctedNote;
  if (structuredData) noteDoc.structuredData = structuredData;
  if (summaries) noteDoc.summaries = summaries;
  if (mdtReview) noteDoc.mdtReview = mdtReview;
  if (reports) noteDoc.reports = reports;
  if (careFolder) noteDoc.careFolder = careFolder;

  assertTenantContext(organisationId, hospitalId);

  const noteSnap = await addDoc(
    orgNotesCollection(db, organisationId),
    omitUndefinedFields(noteDoc)
  );

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
  void logAuditEvent({
    action: "CREATE_NOTE",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      role: authorRole ?? null,
    },
    organisationId,
    hospitalId,
    wardId,
    patientId: targetPatientId,
    metadata: {
      noteId: noteSnap.id,
      preview: content.slice(0, 100),
      category,
      discipline,
    },
  });

  return { id: noteSnap.id };
}

/**
 * Soft-delete a clinical note (retained for audit). Admin / Manager only.
 */
export async function deleteClinicalNote(noteId: string): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");
  assertCanApproveOrDeleteNotes(role);

  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Missing user.");

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;
  const noteOrg = typeof note.organisationId === "string" ? note.organisationId : "";
  if (noteOrg !== organisationId) throw new Error("Organisation scope mismatch.");

  const st = getNormalizedNoteStatus(note);
  if (st === "approved") {
    throw new Error("Approved notes cannot be deleted.");
  }

  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";

  await updateDoc(noteRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  void logAuditEvent({
    action: "SOFT_DELETE_NOTE",
    user: {
      uid,
      email: auth.currentUser?.email ?? null,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId || (ctxHospitalId ? String(ctxHospitalId) : ""),
    wardId: noteWardId || (ctxWardId ? String(ctxWardId) : null),
    patientId,
    metadata: { noteId: id },
  });
  void logEntityAudit({
    action: "SOFT_DELETE_NOTE",
    entityType: "clinical_note",
    entityId: id,
    organisationId,
    performedBy: uid,
    role: role ?? null,
    metadata: { patientId, organisationId },
  });
}

/**
 * Author soft-deletes own draft only (retained for audit).
 */
export async function softDeleteClinicalNoteAsAuthor(noteId: string): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Missing user.");

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;
  const noteOrg = typeof note.organisationId === "string" ? note.organisationId : "";
  if (noteOrg !== organisationId) throw new Error("Organisation scope mismatch.");

  if (note.isDeleted === true) throw new Error("Note already removed.");

  const stAuthor = getNormalizedNoteStatus(note);
  if (stAuthor !== "draft") {
    throw new Error("Only draft notes can be deleted by the author.");
  }

  const ownerId =
    typeof note.createdBy === "string" && note.createdBy.trim()
      ? note.createdBy.trim()
      : typeof note.authorId === "string" && note.authorId.trim()
        ? note.authorId.trim()
        : "";
  if (ownerId !== uid) {
    throw new Error("You can only delete your own draft notes.");
  }

  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";

  await updateDoc(noteRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  void logAuditEvent({
    action: "SOFT_DELETE_NOTE",
    user: {
      uid,
      email: auth.currentUser?.email ?? null,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId || (ctxHospitalId ? String(ctxHospitalId) : ""),
    wardId: noteWardId || (ctxWardId ? String(ctxWardId) : null),
    patientId,
    metadata: { noteId: id, authorSelfDelete: true },
  });
  void logEntityAudit({
    action: "SOFT_DELETE_NOTE",
    entityType: "clinical_note",
    entityId: id,
    organisationId,
    performedBy: uid,
    role: role ?? null,
    metadata: { patientId, organisationId, authorSelfDelete: true },
  });
}

/**
 * Draft → final (author only). No further body edits after this.
 */
export async function finalizeClinicalNote(noteId: string): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Missing user.");

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;
  const noteOrg = typeof note.organisationId === "string" ? note.organisationId : "";
  if (noteOrg !== organisationId) throw new Error("Organisation scope mismatch.");

  if (note.isDeleted === true) throw new Error("This note cannot be finalised.");

  const st = getNormalizedNoteStatus(note);
  if (st !== "draft") {
    throw new Error("Only draft notes can be finalised.");
  }

  const ownerId =
    typeof note.createdBy === "string" && note.createdBy.trim()
      ? note.createdBy.trim()
      : typeof note.authorId === "string" && note.authorId.trim()
        ? note.authorId.trim()
        : "";
  if (ownerId !== uid) {
    throw new Error("You can only finalise your own notes.");
  }

  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";

  await updateDoc(noteRef, {
    status: "final",
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    updatedByEmail: auth.currentUser?.email ?? null,
  });

  void logAuditEvent({
    action: "NOTE_FINALISED",
    user: {
      uid,
      email: auth.currentUser?.email ?? null,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId || (ctxHospitalId ? String(ctxHospitalId) : ""),
    wardId: noteWardId || (ctxWardId ? String(ctxWardId) : null),
    patientId,
    metadata: { noteId: id },
  });
  void logEntityAudit({
    action: "NOTE_FINALISED",
    entityType: "clinical_note",
    entityId: id,
    organisationId,
    performedBy: uid,
    role: role ?? null,
    metadata: { patientId, organisationId },
  });
  await addDoc(collection(db, "audit_logs"), {
    action: "NOTE_FINALISED",
    entityType: "note",
    entityId: id,
    performedBy: uid,
    role: role ?? null,
    organisationId,
    timestamp: serverTimestamp(),
    metadata: { noteId: id },
  }).catch(() => {});
}

/**
 * Update draft note body text only. Author-only; locked after finalisation.
 */
export async function updateDraftClinicalNoteContent(noteId: string, content: string): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  const updatedContent = (content ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");
  if (!updatedContent) throw new Error("content is required.");

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Missing user.");

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;
  const noteOrg = typeof note.organisationId === "string" ? note.organisationId : "";
  if (noteOrg !== organisationId) throw new Error("Organisation scope mismatch.");

  if (note.isDeleted === true) throw new Error("This note cannot be edited.");

  const stEdit = getNormalizedNoteStatus(note);
  if (stEdit !== "draft") {
    throw new Error("This record cannot be edited. Add addendum instead.");
  }

  const ownerId =
    typeof note.createdBy === "string" && note.createdBy.trim()
      ? note.createdBy.trim()
      : typeof note.authorId === "string" && note.authorId.trim()
        ? note.authorId.trim()
        : "";
  if (ownerId !== uid) {
    throw new Error("You can only edit your own draft notes.");
  }

  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";
  const userEmail = auth.currentUser?.email ?? null;

  const previousContent = typeof note.content === "string" ? note.content : "";
  const priorVersions = safeVersionEntries(note.versions) ?? [];
  // Firestore forbids FieldValue.serverTimestamp() inside array elements — use ISO strings.
  const nextVersions =
    previousContent !== updatedContent
      ? [
          ...priorVersions.map((v) => ({
            content: v.content,
            updatedBy: v.updatedBy,
            updatedAt: v.updatedAt,
          })),
          {
            content: previousContent,
            updatedBy: uid,
            updatedAt: new Date().toISOString(),
          },
        ]
      : priorVersions.map((v) => ({
          content: v.content,
          updatedBy: v.updatedBy,
          updatedAt: v.updatedAt,
        }));

  await updateDoc(noteRef, {
    content: updatedContent,
    ...(nextVersions.length ? { versions: nextVersions } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    updatedByEmail: userEmail ?? null,
  });

  void logAuditEvent({
    action: "NOTE_EDITED",
    user: {
      uid,
      email: userEmail,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId || (ctxHospitalId ? String(ctxHospitalId) : ""),
    wardId: noteWardId || (ctxWardId ? String(ctxWardId) : null),
    patientId,
    metadata: { noteId: id, preview: updatedContent.slice(0, 100) },
  });
  void logEntityAudit({
    action: "NOTE_EDITED",
    entityType: "clinical_note",
    entityId: id,
    organisationId,
    performedBy: uid,
    role: role ?? null,
    metadata: { patientId, organisationId, noteId: id, userId: uid },
  });
  await addDoc(collection(db, "audit_logs"), {
    action: "NOTE_EDITED",
    entityType: "note",
    entityId: id,
    performedBy: uid,
    role: role ?? null,
    noteId: id,
    userId: uid,
    organisationId,
    timestamp: serverTimestamp(),
    metadata: { preview: updatedContent.slice(0, 120) },
  }).catch(() => {});
}

/**
 * Approve a final clinical note. Discipline-based rules + Admin/Manager system override.
 */
export async function approveClinicalNote(noteId: string): Promise<void> {
  const id = (noteId ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");

  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const uid = auth.currentUser?.uid ?? null;
  if (!uid) throw new Error("Missing user.");

  const profile = auth.currentUser?.uid ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const approverMdt = profile?.mdtRole != null ? String(profile.mdtRole).trim() : "";

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;
  const noteOrg = typeof note.organisationId === "string" ? note.organisationId : "";
  if (noteOrg !== organisationId) throw new Error("Organisation scope mismatch.");

  if (!canApproveNote(approverMdt, note, uid, role)) {
    throw new Error("You do not have permission to approve this note.");
  }

  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";

  const approvedByRoleLabel =
    approverMdt ||
    (isSystemApproverRole(role) && role ? String(role).trim() : "") ||
    null;

  await updateDoc(noteRef, {
    status: "approved",
    approvedBy: uid,
    approvedAt: serverTimestamp(),
    approvedByRole: approvedByRoleLabel,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });

  void logAuditEvent({
    action: "NOTE_APPROVED",
    user: {
      uid,
      email: auth.currentUser?.email ?? null,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId || (ctxHospitalId ? String(ctxHospitalId) : ""),
    wardId: noteWardId || (ctxWardId ? String(ctxWardId) : null),
    patientId,
    metadata: { noteId: id, approvedByRole: approvedByRoleLabel },
  });
  void logEntityAudit({
    action: "NOTE_APPROVED",
    entityType: "clinical_note",
    entityId: id,
    organisationId,
    performedBy: uid,
    role: approvedByRoleLabel ?? approverMdt ?? role,
    metadata: {
      patientId,
      organisationId,
      noteId: id,
      approvedBy: uid,
      role: approvedByRoleLabel ?? approverMdt ?? role,
    },
  });
  await addDoc(collection(db, "audit_logs"), {
    action: "NOTE_APPROVED",
    entityType: "note",
    entityId: id,
    performedBy: uid,
    noteId: id,
    approvedBy: uid,
    role: approvedByRoleLabel ?? approverMdt ?? role,
    organisationId,
    timestamp: serverTimestamp(),
    metadata: { approvedByRole: approvedByRoleLabel },
  }).catch(() => {});
}

/**
 * Raw note documents for one org (canonical `notes` collection only).
 * Tries composite query (organisationId + orderBy createdAt); on failure (e.g. missing index),
 * falls back to equality-only query and sorts in memory so notes still load.
 */
export async function getNotes(
  organisationId: string,
  limitCount: number = 1000
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  return getOrganisationNoteDocuments(NOTES_COLLECTION, organisationId, limitCount);
}

/** Firestore Timestamp-safe sort (handles `seconds` / `toMillis` / missing). */
function sortNoteDocsByCreatedAtDesc<T extends { createdAt?: unknown }>(data: T[]): T[] {
  return [...data].sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt));
}

/**
 * Internal: canonical `notes` merge organisations/{orgId}/notes + root `notes` (legacy).
 * Other collection names use root-only reads.
 */
async function getOrganisationNoteDocuments(
  collectionName: string,
  organisationId: string,
  fetchCap: number
): Promise<Array<{ id: string } & Record<string, unknown>>> {
  const capped = Math.min(1000, Math.max(1, fetchCap));
  const merged = new Map<string, { id: string } & Record<string, unknown>>();

  const addFromSnap = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => {
    for (const d of snap.docs) {
      if (!merged.has(d.id)) merged.set(d.id, { ...d.data(), id: d.id });
    }
  };

  if (collectionName === NOTES_COLLECTION) {
    try {
      const nCol = orgNotesCollection(db, organisationId);
      try {
        const q = query(nCol, orderBy("createdAt", "desc"), limit(capped));
        const snap = await getDocs(q);
        addFromSnap(snap);
      } catch (err) {
        console.warn("Nested notes orderBy failed, using limit-only", err);
        const q2 = query(nCol, limit(capped));
        const snap = await getDocs(q2);
        addFromSnap(snap);
      }
    } catch (e) {
      console.warn("[noteService] nested notes read skipped", e);
    }
  }

  const col = collection(db, collectionName);
  try {
    const q = query(
      col,
      where("organisationId", "==", organisationId),
      orderBy("createdAt", "desc"),
      limit(capped)
    );
    const snap = await getDocs(q);
    addFromSnap(snap);
  } catch (err) {
    console.warn("Primary root notes query failed, using fallback", err);
    const qFallback = query(col, where("organisationId", "==", organisationId), limit(capped));
    const snap = await getDocs(qFallback);
    addFromSnap(snap);
  }

  const sorted = sortNoteDocsByCreatedAtDesc([...merged.values()]);
  return sorted.slice(0, capped);
}

/**
 * Read from `notes` (or legacy) with org scope.
 * Uses {@link getOrganisationNoteDocuments} so listing works even when the composite index is missing.
 */
async function fetchNotesFromCollection(
  collectionName: string,
  organisationId: string,
  hospitalId: string | null,
  patientId: string | null,
  limitCount: number
): Promise<Array<ClinicalNote & { mood?: string | null }>> {
  const pid = patientId ? (patientId ?? "").toString().trim() : "";
  const fetchCap = Math.min(1000, Math.max(limitCount * 3, 200));

  const raw = await getOrganisationNoteDocuments(collectionName, organisationId, fetchCap);
  const rows = raw.map(({ id, ...data }) =>
    mapFirestoreClinicalNote(id, data as Record<string, unknown>)
  );

  const sortAndSlice = (r: Array<ClinicalNote & { mood?: string | null }>) => {
    r.sort((x, y) => createdAtMillis(y.createdAt) - createdAtMillis(x.createdAt));
    return r.slice(0, limitCount);
  };

  const filterRows = (r: Array<ClinicalNote & { mood?: string | null }>) => {
    let out = r;
    if (hospitalId) out = out.filter((row) => (row.hospitalId ?? "") === hospitalId);
    if (pid) out = out.filter((row) => (row.patientId ?? "") === pid);
    return sortAndSlice(out);
  };

  return filterRows(rows);
}

/**
 * Loads structured notes from Firestore. Merges `notes` (canonical) with legacy `clinical_notes` for continuity.
 */
export async function fetchClinicalNotesForOrganisation({
  patientId = null,
  limitCount = 300,
  hospitalScopeId = null,
}: {
  patientId?: string | null;
  limitCount?: number;
  /** When set (e.g. from the patient record), prefer this over profile hospital for queries. */
  hospitalScopeId?: string | null;
} = {}): Promise<Array<ClinicalNote & { mood?: string | null }>> {
  const { organisationId, hospitalId: ctxHospitalId, role: ctxRole } = await getUserContext();
  if (!organisationId) throw new Error("Governance Error: organisationId is missing.");

  const pid = patientId != null ? String(patientId).trim() : "";
  const profile =
    auth.currentUser?.uid != null ? await getCurrentUserProfile(auth.currentUser.uid) : null;
  const roleUpper = (ctxRole ?? "").toString().trim().toUpperCase();
  /** Org-wide list: super/global/group admins must see all hospitals; profile hospital would hide notes. */
  const skipOrgWideHospitalScope =
    !pid &&
    (roleUpper === "SUPER_ADMIN" ||
      roleUpper === "GLOBAL_ADMIN" ||
      roleUpper === "GROUP_ADMIN" ||
      profile?.isGlobalAdmin === true);

  const fromPatient = normalizeHospitalScopeId(hospitalScopeId);
  const fromCtx = normalizeHospitalScopeId(ctxHospitalId);
  // Single-patient fetch: prefer patient record hospital, then profile. Org-wide list: use profile hospital
  // for staff/manager (one hospital) — never "UNASSIGNED". Admins skip hospital filter here.
  const effectiveHospitalIdForQuery = pid
    ? fromPatient ?? fromCtx
    : skipOrgWideHospitalScope
      ? null
      : fromCtx ?? null;

  const [a, b] = await Promise.all([
    fetchNotesFromCollection(NOTES_COLLECTION, organisationId, effectiveHospitalIdForQuery, pid || null, limitCount).catch((e) => {
      console.error(`[noteService] Failed to read "${NOTES_COLLECTION}":`, e);
      return [];
    }),
    // Legacy notes may not have `hospitalId` denormalised; read without hospital filter then enforce via patient lookup when needed.
    fetchNotesFromCollection(LEGACY_CLINICAL_NOTES_COLLECTION, organisationId, null, pid || null, limitCount).catch((e) => {
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
  const scopedCtxHospital = normalizeHospitalScopeId(ctxHospitalId);
  if (scopedCtxHospital && !pid && !skipOrgWideHospitalScope) {
    const uniquePatientIds = Array.from(
      new Set(merged.map((n) => (n.patientId ?? "").toString().trim()).filter(Boolean))
    );

    const hospitalByPatientId = new Map<string, string | null>();
    await Promise.all(
      uniquePatientIds.map(async (pPatientId) => {
        try {
          const p = await getPatientById(pPatientId);
          const orgOk = (p.organisationId ?? "") === organisationId;
          const hosp = typeof p.hospitalId === "string" ? p.hospitalId : null;
          hospitalByPatientId.set(pPatientId, orgOk ? hosp : null);
        } catch {
          hospitalByPatientId.set(pPatientId, null);
        }
      })
    );

    const filtered = merged.filter((n) => hospitalByPatientId.get(String(n.patientId ?? "")) === scopedCtxHospital);
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
  const patient = await getPatientById(pid);
  return fetchClinicalNotesForOrganisation({
    patientId: pid,
    limitCount,
    hospitalScopeId: patient.hospitalId ?? null,
  });
}

/**
 * Create or update a full clinical note (e.g. AI Studio / structured ingestion).
 * Preserves governance and writes optional `structured` payload when provided.
 */
export async function saveClinicalNote(note: ClinicalNote): Promise<{ id: string }> {
  const { organisationId, hospitalId: ctxHospitalId, wardId: ctxWardId, role: ctxRole } = await getUserContext();
  const userId = auth.currentUser?.uid ?? null;
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
  const structuredData = safeStructuredData(note.structuredData ?? note.structured, discipline);
  const correctedNote = safeString(note.correctedNote);
  const summaries = safeSummaries(note.summaries);
  const mdtReview = safeMdtReview(note.mdtReview, discipline) ?? null;
  const reports = safeReports(note.reports) ?? null;
  const careFolder = safeCareFolder(note.careFolder) ?? null;

  const patient = await getPatientById(patientId);
  const hospitalId = patient.hospitalId || (ctxHospitalId ? String(ctxHospitalId) : "");
  const wardId = patient.wardId || (ctxWardId ? String(ctxWardId) : "");
  if (!hospitalId) throw new Error("hospitalId is required to save clinical notes.");
  assertRequiredWriteContext({ organisationId, hospitalId, userId });

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
    role: discipline,
    mdtRole: mdtRoleSave,
    mood: structured?.mood ?? null,
    behaviour: null,
    incidents: null,
    risks: null,
    engagement: null,
    versions: [],
    addendums: [],
  };

  const noteId = (note.id ?? "").toString().trim();

  if (noteId) {
    throw new Error("This record cannot be edited. Add addendum instead.");
  }

  assertTenantContext(organisationId, hospitalId);

  const noteSnap = await addDoc(orgNotesCollection(db, organisationId), {
    ...createPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "draft",
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    ...(mdtRoleSave ? { createdByRole: mdtRoleSave } : {}),
  });

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
  void logAuditEvent({
    action: "CREATE_NOTE",
    user: {
      uid: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      role: authorRole ?? null,
    },
    organisationId,
    hospitalId,
    wardId,
    patientId,
    metadata: {
      noteId: noteSnap.id,
      preview: content.slice(0, 100),
      category,
      discipline,
    },
  });

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
  void noteId;
  void aiPatch;
  throw new Error("This record cannot be edited. Add addendum instead.");
}

export async function addAddendum(noteId: string, text: string): Promise<{ id: string }> {
  const id = (noteId ?? "").toString().trim();
  const addendumText = (text ?? "").toString().trim();
  if (!id) throw new Error("noteId is required.");
  if (!addendumText) throw new Error("addendum text is required.");

  const { organisationId, role } = await getUserContext();
  const userId = auth.currentUser?.uid ?? null;
  const userEmail = auth.currentUser?.email ?? null;
  if (!organisationId) throw new Error("Missing organisation");
  if (!userId) throw new Error("Missing user");

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  if (!noteSnap.exists()) throw new Error("Note not found.");
  const note = noteSnap.data() as Record<string, unknown>;

  const noteOrgId = typeof note.organisationId === "string" ? note.organisationId : "";
  const noteHospitalId = typeof note.hospitalId === "string" ? note.hospitalId.trim() : "";
  const noteWardId = typeof note.wardId === "string" ? note.wardId : "";
  const patientId = typeof note.patientId === "string" ? note.patientId : "";
  if (!noteOrgId || noteOrgId !== organisationId) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
  if (!noteHospitalId) {
    throw new Error("Note is missing hospital scope; cannot add addendum.");
  }

  const stAdd = getNormalizedNoteStatus(note);
  if (stAdd !== "approved" && stAdd !== "final") {
    throw new Error("Add addendum is only available after the note is finalised or approved.");
  }

  const addendumId = doc(collection(db, NOTE_ADDENDUMS_COLLECTION)).id;
  const roleLabel = (role ?? "").toString().trim();

  const existingEmbedded = safeAddendumEntries(note.addendums) ?? [];
  // Embedded addendum objects cannot use serverTimestamp() — Firestore rejects it in arrays.
  // Scope is always inherited from the parent note (not the user session) for consistency with Firestore rules.
  const newEntry: ClinicalNoteAddendumEntry = {
    id: addendumId,
    content: addendumText,
    createdBy: userId ?? "",
    role: roleLabel,
    createdAt: new Date().toISOString(),
    organisationId: noteOrgId,
    hospitalId: noteHospitalId,
    wardId: noteWardId || undefined,
    patientId: patientId || undefined,
  };

  const embeddedScopeFields = (a: ClinicalNoteAddendumEntry): Record<string, unknown> => {
    const org = a.organisationId ?? noteOrgId;
    const hosp = a.hospitalId ?? noteHospitalId;
    const w = (a.wardId ?? noteWardId)?.toString().trim();
    const p = (a.patientId ?? patientId)?.toString().trim();
    const o: Record<string, unknown> = { organisationId: org, hospitalId: hosp };
    if (w) o.wardId = w;
    if (p) o.patientId = p;
    return o;
  };

  await updateDoc(noteRef, {
    addendums: [
      ...existingEmbedded.map((a) => ({
        id: a.id,
        content: a.content,
        createdBy: a.createdBy,
        role: a.role,
        createdAt: a.createdAt,
        ...embeddedScopeFields(a),
      })),
      {
        id: newEntry.id,
        content: newEntry.content,
        createdBy: newEntry.createdBy,
        role: newEntry.role,
        createdAt: newEntry.createdAt,
        ...embeddedScopeFields(newEntry),
      },
    ],
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });

  try {
    await addDoc(collection(db, NOTE_ADDENDUMS_COLLECTION), {
      organisationId: noteOrgId,
      hospitalId: noteHospitalId,
      wardId: noteWardId || "",
      noteId: id,
      patientId,
      text: addendumText,
      authorId: userId,
      createdBy: userId,
      authorEmail: userEmail,
      authorRole: role ?? null,
      createdAt: serverTimestamp(),
      embeddedId: addendumId,
    });
  } catch (e) {
    console.warn("note_addendums mirror write failed (non-fatal).", e);
  }

  void logAuditEvent({
    action: "ADD_NOTE_ADDENDUM",
    user: {
      uid: userId,
      email: userEmail,
      role: role ?? null,
    },
    organisationId,
    hospitalId: noteHospitalId,
    wardId: noteWardId || null,
    patientId,
    metadata: {
      noteId: id,
      addendumId: addendumId,
      preview: addendumText.slice(0, 100),
    },
  });

  return { id: addendumId };
}

export async function fetchAddendumsForNote(noteId: string): Promise<
  Array<{
    id: string;
    text: string;
    authorEmail: string | null;
    role: string | null;
    createdAt: unknown;
  }>
> {
  const id = (noteId ?? "").toString().trim();
  if (!id) return [];
  const { organisationId, hospitalId } = await getUserContext();
  if (!organisationId) return [];

  const noteRef = await resolveClinicalNoteDocumentRef(organisationId, id);
  const noteSnap = await getDoc(noteRef);
  const embedded: Array<{
    id: string;
    text: string;
    authorEmail: string | null;
    role: string | null;
    createdAt: unknown;
  }> = [];
  if (noteSnap.exists()) {
    const nd = noteSnap.data() as Record<string, unknown>;
    const noteOrg = typeof nd.organisationId === "string" ? nd.organisationId : "";
    if (noteOrg === organisationId) {
      const addendums = safeAddendumEntries(nd.addendums) ?? [];
      for (const a of addendums) {
        embedded.push({
          id: a.id,
          text: a.content,
          authorEmail: null,
          role: a.role || null,
          createdAt: a.createdAt ?? null,
        });
      }
    }
  }

  if (!hospitalId) {
    return embedded.sort((x, y) => createdAtMillis(x.createdAt) - createdAtMillis(y.createdAt));
  }

  let legacy: Array<{
    id: string;
    text: string;
    authorEmail: string | null;
    role: string | null;
    createdAt: unknown;
    embeddedId?: string;
  }> = [];
  try {
    const q = query(
      collection(db, NOTE_ADDENDUMS_COLLECTION),
      where("organisationId", "==", organisationId),
      where("hospitalId", "==", hospitalId),
      where("noteId", "==", id),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    legacy = (snap.docs ?? []).map((d) => {
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        text: typeof x.text === "string" ? x.text : "",
        authorEmail: typeof x.authorEmail === "string" ? x.authorEmail : null,
        role: typeof x.authorRole === "string" ? x.authorRole : null,
        createdAt: x.createdAt ?? null,
        embeddedId: typeof x.embeddedId === "string" ? x.embeddedId : undefined,
      };
    });
  } catch {
    legacy = [];
  }

  const embeddedIds = new Set(embedded.map((e) => e.id));
  const merged = [...embedded];
  for (const row of legacy) {
    if (row.embeddedId && embeddedIds.has(row.embeddedId)) continue;
    const { embeddedId: _e, ...rest } = row;
    void _e;
    if (!embeddedIds.has(rest.id)) {
      merged.push(rest);
    }
  }
  merged.sort((x, y) => createdAtMillis(x.createdAt) - createdAtMillis(y.createdAt));
  return merged;
}
