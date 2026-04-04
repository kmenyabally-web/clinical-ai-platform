/**
 * Persisted combined MDT summaries (`mdt_summaries`).
 */

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
import { db } from "../firebase";
import type { MDTSummaryStructured } from "./mdtSummaryEngine";

const COLLECTION = "mdt_summaries";

function millisFromFirestoreOrDate(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && typeof (v as { toMillis?: () => number }).toMillis === "function") {
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

function sectionsToPlainText(sections: unknown): string {
  if (!sections || typeof sections !== "object") return "";
  const o = sections as Record<string, { text?: string }>;
  const ids = Object.keys(o).sort((a, b) => Number(a) - Number(b));
  const parts: string[] = [];
  for (const id of ids) {
    const t = o[id]?.text?.trim();
    if (t) parts.push(`Section ${id}: ${t}`);
  }
  return parts.join("\n\n");
}

function updatedAtMillis(data: { updatedAt?: unknown; createdAt?: unknown }): number {
  return Math.max(millisFromFirestoreOrDate(data.updatedAt), millisFromFirestoreOrDate(data.createdAt));
}

/**
 * Latest non-empty CPA discipline report per template key → payload for {@link buildMDTInput}.
 */
export function buildReportsPayloadFromCpaDocuments(
  rows: Array<{ id: string; data: Record<string, unknown> }>
): Record<string, string | null> {
  const best = new Map<string, { t: number; text: string }>();

  for (const row of rows) {
    const dk = String(row.data?.disciplineKey ?? "").trim();
    if (!dk) continue;
    const text = sectionsToPlainText(row.data?.sections);
    if (!text.trim()) continue;
    const t = updatedAtMillis(row.data as { updatedAt?: unknown; createdAt?: unknown });
    const prev = best.get(dk);
    if (!prev || t >= prev.t) best.set(dk, { t, text });
  }

  return {
    nursing: best.get("nurse")?.text ?? null,
    psychiatry: best.get("psychiatrist")?.text ?? null,
    psychology: best.get("psychologist")?.text ?? null,
    occupational_therapy: best.get("occupational_therapist")?.text ?? null,
    salt: best.get("speech_language_therapist")?.text ?? null,
  };
}

const MAX_REPORTS_USED_FIELD_LEN = 12000;

function truncateReportsUsed(map: Record<string, string | null>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(map)) {
    if (v == null || !String(v).trim()) {
      out[k] = null;
      continue;
    }
    const s = String(v);
    out[k] = s.length > MAX_REPORTS_USED_FIELD_LEN ? `${s.slice(0, MAX_REPORTS_USED_FIELD_LEN)}…` : s;
  }
  return out;
}

export async function createMdtSummaryRecord(payload: {
  organisationId: string;
  patientId: string;
  reportsUsed: Record<string, string | null>;
  summary: MDTSummaryStructured;
  createdBy?: string | null;
}): Promise<string> {
  const organisationId = String(payload.organisationId ?? "").trim();
  const patientId = String(payload.patientId ?? "").trim();
  if (!organisationId || !patientId) throw new Error("organisationId and patientId required");

  const ref = await addDoc(collection(db, COLLECTION), {
    organisationId,
    patientId,
    reportsUsed: truncateReportsUsed(payload.reportsUsed),
    summary: payload.summary,
    generatedAt: serverTimestamp(),
    createdBy: payload.createdBy ?? null,
  });
  return ref.id;
}

export async function listMdtSummariesForPatient(
  organisationId: string,
  patientId: string,
  opts: { limitCount?: number } = {}
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return [];

  const lim = Math.min(Math.max(Number(opts.limitCount) || 15, 1), 40);
  const q = query(
    collection(db, COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("generatedAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() ?? {} }));
}
