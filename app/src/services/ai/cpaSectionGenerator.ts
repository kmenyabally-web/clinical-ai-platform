/**
 * CPA section generation: aggregate real data → per-section slice → discipline prompt → Gemini.
 * Returns structured fields for audit (dataUsed, generatedAt, limitedData).
 */

import { generateAIContent } from "../geminiAiService.js";
import { buildMdtSummaryForCpa } from "../mdtSummaryEngine";
import { getPatientCPAData, extractMdtReviewsFromNotes } from "../cpaDataAggregator";
import { mapDataToSection } from "../cpaSectionMapper";
import { calculateAggregateRisk } from "../aggregatePatientRiskEngine";
import { buildPatientAlerts } from "../earlyWarningEngine";
import { buildPrompt, normalizeCpaDisciplineForPrompt } from "./cpaPromptBuilder";
import type { CpaAggregatedPatientData, CpaPatientDataBundle, CpaPromptPatientData } from "./cpaPatientDataTypes";
import { loadClinicalContextPromptForPatient } from "../../engine/clinicalContextResolver";

export type { CpaAggregatedPatientData, CpaPatientDataBundle, CpaPromptPatientData } from "./cpaPatientDataTypes";

export const CPA_SECTION_EMPTY_MESSAGE =
  "Insufficient information could be generated for this section (AI unavailable or records incomplete). Please edit manually or use Regenerate.";

const NO_DATA_MESSAGE = "No information recorded";

const LIMITED_DATA_THRESHOLD = 5;

function aggregateFromOverride(p: CpaPatientDataBundle, patientId: string): CpaAggregatedPatientData {
  const notes = Array.isArray(p.notes) ? p.notes : [];
  const pid = String(patientId ?? "").trim() || "unknown";
  const abcLogs = Array.isArray(p.abcLogs) ? p.abcLogs : [];
  const incidents = Array.isArray(p.incidents) ? p.incidents : [];
  const nursingObs = Array.isArray(p.nursingObs) ? p.nursingObs : [];
  const formulation = p.formulation !== undefined ? p.formulation : null;
  const psychology = p.psychology !== undefined ? p.psychology : null;
  const psychiatry = p.psychiatry !== undefined ? p.psychiatry : null;
  const ot = p.ot !== undefined ? p.ot : null;
  const salt = p.salt !== undefined ? p.salt : null;
  const risk = calculateAggregateRisk(pid, {
    abcLogs,
    incidents,
    nursingObs,
    formulation,
    psychiatryStructured: psychiatry,
    otStructured: ot,
    saltStructured: salt,
    psychologyStructured: psychology,
  });
  const physicalHealth = Array.isArray(p.physicalHealth) ? p.physicalHealth : [];
  const medications = Array.isArray(p.medications) ? p.medications : [];
  const alerts = buildPatientAlerts(pid, {
    abcLogs,
    incidents,
    nursingObs,
    formulation,
    physicalHealth,
    medications,
    psychiatryStructured: psychiatry,
    otStructured: ot,
    saltStructured: salt,
  });
  return {
    notes,
    behaviours: Array.isArray(p.behaviours) ? p.behaviours : [],
    incidents,
    physicalHealth,
    careLogs: Array.isArray(p.careLogs) ? p.careLogs : [],
    medications,
    mdtReviews: Array.isArray(p.mdtReviews) ? p.mdtReviews : extractMdtReviewsFromNotes(notes),
    abcLogs,
    nursingObs,
    formulation,
    psychology,
    psychiatry,
    ot,
    salt,
    risk,
    alerts,
    mdtSummaryText:
      typeof p.mdtSummaryText === "string" && p.mdtSummaryText.trim()
        ? p.mdtSummaryText
        : buildMdtSummaryForCpa(notes),
    capacityAssessment: p.capacityAssessment ?? null,
  };
}

function isEffectivelyEmptySectionData(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== "object") return true;
  const keys = Object.keys(data);
  if (keys.length === 0) return true;
  for (const k of keys) {
    const v = data[k];
    if (v == null || v === "") continue;
    if (typeof v === "string" && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (Array.isArray(v) && v.length > 0) return false;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length > 0) return false;
    if (typeof v === "string" && v.trim()) return false;
  }
  return true;
}

function countSectionDataItems(data: Record<string, unknown>): number {
  let n = 0;
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) n += v.length;
    else if (typeof v === "string" && v.trim()) n += Math.min(v.trim().length, 1);
    else if (v != null && typeof v === "object" && !Array.isArray(v)) n += 1;
  }
  return n;
}

function isLimitedSectionData(data: Record<string, unknown>): boolean {
  if (isEffectivelyEmptySectionData(data)) return false;
  return countSectionDataItems(data) < LIMITED_DATA_THRESHOLD;
}

/** Trim nested structures for Firestore / UI storage. */
export function truncateDataUsedForStorage(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > 12000 ? `${value.slice(0, 12000)}…` : value;
  }
  if (Array.isArray(value)) {
    const slice = value.slice(0, 45);
    return slice.map((item) => truncateDataUsedForStorage(item, depth + 1));
  }
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return String(value);
    }
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    let i = 0;
    for (const k of Object.keys(o)) {
      if (i++ > 60) {
        out.__truncated = true;
        break;
      }
      out[k] = truncateDataUsedForStorage(o[k], depth + 1);
    }
    return out;
  }
  return value;
}

export type GenerateCPASectionInput = {
  discipline: string;
  sectionName: string;
  patientId: string;
  organisationId: string;
  /** When set, skips network aggregate (caller must supply a consistent bundle). */
  patientData?: CpaPatientDataBundle;
};

export type GenerateCPASectionResult = {
  sectionName: string;
  content: string;
  dataUsed: Record<string, unknown>;
  generatedAt: string;
  limitedData: boolean;
};

/**
 * Generate one CPA section. Never throws — returns structured content on any failure.
 */
export async function generateCPASection(input: GenerateCPASectionInput): Promise<GenerateCPASectionResult> {
  const sectionName = String(input.sectionName ?? "").trim() || "Section";
  const generatedAt = new Date().toISOString();
  const emptyPayload = (): GenerateCPASectionResult => ({
    sectionName,
    content: CPA_SECTION_EMPTY_MESSAGE,
    dataUsed: {},
    generatedAt,
    limitedData: false,
  });

  try {
    const org = String(input.organisationId ?? "").trim();
    const pid = String(input.patientId ?? "").trim();
    if (!org || !pid) {
      return emptyPayload();
    }

    let fullData: CpaAggregatedPatientData;
    if (input.patientData && typeof input.patientData === "object") {
      fullData = aggregateFromOverride(
        {
          notes: Array.isArray(input.patientData.notes) ? input.patientData.notes : [],
          incidents: Array.isArray(input.patientData.incidents) ? input.patientData.incidents : [],
          behaviours: Array.isArray(input.patientData.behaviours) ? input.patientData.behaviours : [],
          physicalHealth: Array.isArray(input.patientData.physicalHealth) ? input.patientData.physicalHealth : [],
          medications: Array.isArray(input.patientData.medications) ? input.patientData.medications : [],
          carePlans: Array.isArray(input.patientData.carePlans) ? input.patientData.carePlans : [],
          careLogs: input.patientData.careLogs,
          mdtReviews: input.patientData.mdtReviews,
          mdtSummaryText: input.patientData.mdtSummaryText,
          abcLogs: input.patientData.abcLogs,
          nursingObs: input.patientData.nursingObs,
          formulation: input.patientData.formulation,
        },
        pid
      );
    } else {
      fullData = await getPatientCPAData(org, pid);
    }

    if (!fullData.clinicalContextBlock?.trim()) {
      const block = await loadClinicalContextPromptForPatient(org, pid);
      if (block) fullData = { ...fullData, clinicalContextBlock: block };
    }

    const baseSection = mapDataToSection(sectionName, fullData) as Record<string, unknown>;
    const sectionData = {
      ...baseSection,
      ...(fullData.risk ? { patientRisk: fullData.risk } : {}),
      ...(Array.isArray(fullData.alerts) && fullData.alerts.length > 0 ? { activeAlerts: fullData.alerts } : {}),
      ...(fullData.clinicalContextBlock?.trim()
        ? { sanctumClinicalContext: fullData.clinicalContextBlock }
        : {}),
    } as Record<string, unknown>;

    if (isEffectivelyEmptySectionData(sectionData)) {
      return {
        sectionName,
        content: NO_DATA_MESSAGE,
        dataUsed: truncateDataUsedForStorage(sectionData) as Record<string, unknown>,
        generatedAt,
        limitedData: false,
      };
    }

    const limitedData = isLimitedSectionData(sectionData);
    const promptDiscipline = normalizeCpaDisciplineForPrompt(input.discipline);
    const sectionForPrompt = { ...(sectionData as Record<string, unknown>) };
    delete sectionForPrompt.sanctumClinicalContext;
    const promptPatientData = {
      ...sectionForPrompt,
      discipline: input.discipline,
      sectionName,
    } as CpaPromptPatientData;
    const contextPayload = fullData.clinicalContextBlock?.trim()
      ? {
          sanctumClinicalContext: fullData.clinicalContextBlock,
          discipline: input.discipline,
          sectionName,
        }
      : undefined;
    const prompt = buildPrompt(promptDiscipline, sectionName, promptPatientData, contextPayload);
    const raw = await generateAIContent(prompt, { temperature: 0.12 });
    const text = typeof raw === "string" ? raw.trim() : "";
    const content = text || CPA_SECTION_EMPTY_MESSAGE;

    return {
      sectionName,
      content,
      dataUsed: truncateDataUsedForStorage(sectionData) as Record<string, unknown>,
      generatedAt,
      limitedData,
    };
  } catch {
    return emptyPayload();
  }
}
