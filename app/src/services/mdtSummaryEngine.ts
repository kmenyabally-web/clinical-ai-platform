/**
 * MDT utilities:
 * - {@link buildMdtSummaryForCpa}: note-based buckets for single-discipline CPA prompts.
 * - {@link buildMDTInput}, {@link buildMDTPrompt}, {@link generateMDTSummary}: combined CPA reports → structured team summary (AI).
 */

import { groupNotesByDiscipline, summariseNotes } from "../utils/mdtNoteGrouping.js";
import { generateAIContent } from "./geminiAiService.js";
import { fetchIncidentsForPatient } from "./incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "./behaviourService";

/** @param notes Clinical notes */
export function buildMdtSummaryForCpa(notes: unknown[]): string {
  const g = groupNotesByDiscipline(Array.isArray(notes) ? notes : []);
  const blocks: [string, unknown[]][] = [
    ["Nursing", g.nursing],
    ["Psychiatry", g.psychiatry],
    ["Psychology", g.psychology],
    ["Occupational therapy", g.occupationalTherapy],
    ["Speech and language", g.speechAndLanguage],
    ["Support / other", g.supportWorker],
  ];
  return blocks
    .map(([label, bucket]) => {
      const body = summariseNotes(bucket);
      return `=== ${label} (summary) ===\n${body}`;
    })
    .join("\n\n")
    .slice(0, 80000);
}

export type MDTCombinedReportsInput = {
  nursing?: string | null;
  psychiatry?: string | null;
  psychology?: string | null;
  occupational_therapy?: string | null;
  salt?: string | null;
};

export type MDTSummaryStructured = {
  overallSummary: string;
  nursing: string;
  psychiatry: string;
  psychology: string;
  ot: string;
  salt: string;
  keyRisks: string[];
  riskTrend: string;
  recommendations: string[];
  carePlanChanges: string[];
};

function toNullableText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function buildMDTInput(reports: Record<string, unknown> | null | undefined): MDTCombinedReportsInput {
  const r = reports && typeof reports === "object" ? reports : {};
  return {
    nursing: toNullableText(r.nursing ?? r.nurse),
    psychiatry: toNullableText(r.psychiatry ?? r.psychiatrist),
    psychology: toNullableText(r.psychology ?? r.psychologist),
    occupational_therapy: toNullableText(r.occupational_therapy ?? r.occupational_therapist ?? r.ot),
    salt: toNullableText(r.salt ?? r.speech_language_therapist),
  };
}

function safeJsonForPrompt(data: unknown): string {
  try {
    return JSON.stringify(data, (_key, value) => {
      if (value != null && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch {
          return String(value);
        }
      }
      return value;
    });
  } catch {
    return "{}";
  }
}

export function buildMDTPrompt(mdtData: MDTCombinedReportsInput): string {
  return `
You are generating an MDT (Multi-Disciplinary Team) clinical summary.

STRICT RULES:
- Use ONLY provided data
- Do NOT hallucinate
- Be concise and clinically accurate
- Highlight risks clearly
- Output MUST be a single JSON object only (no markdown fences, no commentary)

-----------------------------------
STRUCTURE (map into JSON fields below):

1. Overall Clinical Summary → overallSummary
2. Nursing → nursing
3. Medical (Psychiatry / Responsible Clinician) → psychiatry
4. Psychology → psychology
5. Occupational Therapy → ot
6. Speech & Language Therapy → salt
7. Key Risks → keyRisks (array of short strings)
8. Risk Trend (Improving / Stable / Deteriorating) → riskTrend
9. MDT Recommendations → recommendations (array of strings)
10. Care Plan Adjustments → carePlanChanges (array of strings)

Required JSON shape:
{
  "overallSummary": "",
  "nursing": "",
  "psychiatry": "",
  "psychology": "",
  "ot": "",
  "salt": "",
  "keyRisks": [],
  "riskTrend": "",
  "recommendations": [],
  "carePlanChanges": []
}

Use "" for a discipline if its data was null or empty. Use [] for unknown lists.

-----------------------------------
DATA:

${safeJsonForPrompt(mdtData)}
`;
}

export const MDT_SUMMARY_AI_FALLBACK_MESSAGE =
  "MDT summary could not be generated. Please review discipline reports.";

function emptyStructuredSummary(message: string): MDTSummaryStructured {
  return {
    overallSummary: message,
    nursing: "",
    psychiatry: "",
    psychology: "",
    ot: "",
    salt: "",
    keyRisks: [],
    riskTrend: "Stable",
    recommendations: [],
    carePlanChanges: [],
  };
}

function hasAnyDisciplineData(input: MDTCombinedReportsInput): boolean {
  return Object.values(input).some((v) => typeof v === "string" && v.trim().length > 0);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function parseMdtSummaryJson(raw: string | null | undefined): MDTSummaryStructured | null {
  if (raw == null || !String(raw).trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw).trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  return {
    overallSummary: String(o.overallSummary ?? "").trim(),
    nursing: String(o.nursing ?? "").trim(),
    psychiatry: String(o.psychiatry ?? "").trim(),
    psychology: String(o.psychology ?? "").trim(),
    ot: String(o.ot ?? "").trim(),
    salt: String(o.salt ?? "").trim(),
    keyRisks: asStringArray(o.keyRisks),
    riskTrend: String(o.riskTrend ?? "").trim() || "Stable",
    recommendations: asStringArray(o.recommendations),
    carePlanChanges: asStringArray(o.carePlanChanges),
  };
}

export type ActivityWindowCounts = {
  incidents: number;
  behaviours: number;
};

/**
 * Compare recent vs prior windows: more incidents/behaviours → Deteriorating, fewer → Improving, else Stable.
 */
export function inferRiskTrendFromActivity(recent: ActivityWindowCounts, prior: ActivityWindowCounts): string {
  const scoreR = recent.incidents + recent.behaviours;
  const scoreP = prior.incidents + prior.behaviours;
  if (scoreR > scoreP) return "Deteriorating";
  if (scoreR < scoreP) return "Improving";
  return "Stable";
}

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

function incidentSortMillis(x: { createdAt?: unknown; occurredAt?: unknown }): number {
  return Math.max(millisFromFirestoreOrDate(x.occurredAt), millisFromFirestoreOrDate(x.createdAt));
}

/**
 * Count incidents and structured behaviour logs in [now - recentDays - priorDays, now), split into two windows.
 */
export async function fetchActivityWindowCounts(
  patientId: string,
  recentDays = 14,
  priorDays = 14
): Promise<{ recent: ActivityWindowCounts; prior: ActivityWindowCounts }> {
  const pid = String(patientId ?? "").trim();
  const empty = (): ActivityWindowCounts => ({ incidents: 0, behaviours: 0 });
  if (!pid) {
    return { recent: empty(), prior: empty() };
  }

  const now = Date.now();
  const recentStart = now - recentDays * 86400000;
  const priorStart = now - (recentDays + priorDays) * 86400000;

  const [incidents, behaviours] = await Promise.all([
    fetchIncidentsForPatient(pid, { limitCount: 120 }).catch(() => []),
    fetchStructuredBehaviourLogsForPatient(pid, { limitCount: 120 }).catch(() => []),
  ]);

  const incList = Array.isArray(incidents) ? incidents : [];
  const behList = Array.isArray(behaviours) ? behaviours : [];

  let recentI = 0;
  let priorI = 0;
  for (const row of incList) {
    const t = incidentSortMillis(row as { createdAt?: unknown; occurredAt?: unknown });
    if (t >= recentStart && t <= now) recentI += 1;
    else if (t >= priorStart && t < recentStart) priorI += 1;
  }

  let recentB = 0;
  let priorB = 0;
  for (const row of behList) {
    const r = row as { clinicalTime?: string | null; createdAt?: unknown };
    const t = r.clinicalTime ? new Date(r.clinicalTime).getTime() : millisFromFirestoreOrDate(r.createdAt);
    if (!t || Number.isNaN(t)) continue;
    if (t >= recentStart && t <= now) recentB += 1;
    else if (t >= priorStart && t < recentStart) priorB += 1;
  }

  return {
    recent: { incidents: recentI, behaviours: recentB },
    prior: { incidents: priorI, behaviours: priorB },
  };
}

export type GenerateMDTSummaryOptions = {
  /** When true, skip Gemini and return fallback structure. */
  skipAi?: boolean;
};

/**
 * Build combined MDT summary from per-discipline report texts (JSON output from Gemini).
 */
export async function generateMDTSummary(
  reports: Record<string, unknown> | null | undefined,
  options?: GenerateMDTSummaryOptions
): Promise<MDTSummaryStructured> {
  const input = buildMDTInput(reports);

  if (!hasAnyDisciplineData(input)) {
    return emptyStructuredSummary(
      "No discipline CPA report text was available. Save CPA reports per discipline first, then regenerate."
    );
  }

  if (options?.skipAi) {
    return emptyStructuredSummary(MDT_SUMMARY_AI_FALLBACK_MESSAGE);
  }

  const prompt = buildMDTPrompt(input);
  const raw = await generateAIContent(prompt, { temperature: 0.15, responseMimeType: "application/json" });
  const parsed = parseMdtSummaryJson(raw);
  if (!parsed) {
    return emptyStructuredSummary(MDT_SUMMARY_AI_FALLBACK_MESSAGE);
  }
  return parsed;
}

/**
 * Run AI summary, then set {@link MDTSummaryStructured.riskTrend} from incident/behaviour window counts (recent vs prior).
 */
export async function generateMDTSummaryWithActivityTrend(
  reports: Record<string, unknown> | null | undefined,
  patientId: string
): Promise<MDTSummaryStructured> {
  const [summary, windows] = await Promise.all([
    generateMDTSummary(reports),
    fetchActivityWindowCounts(patientId),
  ]);

  const heuristic = inferRiskTrendFromActivity(windows.recent, windows.prior);
  return { ...summary, riskTrend: heuristic };
}
