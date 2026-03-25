/**
 * Behaviour tracking linked to clinical notes (collection `behaviours`).
 */

import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";

export const BEHAVIOURS_COLLECTION = "behaviours";

export type BehaviourExtraction = {
  riskLevel: string;
  behaviourFlag: boolean;
  requiresReview: boolean;
};

/** Placeholder for future NLP / rules-based extraction from note text. */
export async function extractBehaviourFromNote(noteContent: string): Promise<BehaviourExtraction> {
  void noteContent;
  return {
    riskLevel: "LOW",
    behaviourFlag: false,
    requiresReview: false,
  };
}

type LegacyBehaviourRow = {
  noteId: string;
  patientId: string;
  discipline: string;
  behaviour: string;
  createdAt: unknown;
};

/**
 * Lists behaviour rows for a patient: prefers `behaviours` (tenant-scoped), falls back to structured notes.
 */
export async function fetchBehaviourForPatient(
  patientId: string,
  { limitCount = 80 } = {}
): Promise<Array<LegacyBehaviourRow | Record<string, unknown>>> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];

  try {
    const { organisationId, hospitalId } = await getUserContext();
    if (organisationId && hospitalId) {
      const q = query(
        collection(db, BEHAVIOURS_COLLECTION),
        where("organisationId", "==", organisationId),
        where("hospitalId", "==", hospitalId),
        where("patientId", "==", pid),
        limit(Math.min(500, Math.max(limitCount, 20)))
      );
      const snap = await getDocs(q);
      const docs = snap?.docs ?? [];
      if (docs.length > 0) {
        return docs
          .map((d) => {
            const x = d.data() ?? {};
            const risk = typeof x.riskLevel === "string" ? x.riskLevel : "LOW";
            const parts = [`Risk ${risk}`];
            if (x.behaviourFlag === true) parts.push("flag");
            if (x.requiresReview === true) parts.push("review");
            return {
              id: d.id,
              noteId: typeof x.noteId === "string" ? x.noteId : "",
              patientId: typeof x.patientId === "string" ? x.patientId : pid,
              discipline: typeof x.discipline === "string" ? x.discipline : "",
              behaviour: parts.join(" · "),
              riskLevel: x.riskLevel,
              behaviourFlag: x.behaviourFlag,
              requiresReview: x.requiresReview,
              createdAt: x.createdAt ?? null,
            };
          })
          .sort((a, b) => {
            const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
            return tb - ta;
          })
          .slice(0, limitCount);
      }
    }
  } catch (e) {
    console.warn("[behaviourService] behaviours query failed, using notes fallback:", e);
  }

  const { fetchClinicalNotesForPatient } = await import("./noteService");
  const notes = await fetchClinicalNotesForPatient(pid, { limitCount });
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((n) => typeof n?.structured?.behaviour === "string" && n.structured.behaviour.trim())
    .map((n) => ({
      noteId: n.id,
      patientId: n.patientId,
      discipline: n.discipline,
      behaviour: n.structured!.behaviour as string,
      createdAt: n.createdAt,
    }))
    .sort((a, b) => {
      const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return tb - ta;
    });
}
