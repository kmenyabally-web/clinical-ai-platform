/**
 * Rule-based care monitoring analysis from structured fields and/or free text (notes, charts).
 * Not a substitute for clinical judgment — supports documentation and review prompts.
 */

export type HydrationRiskLevel = "none" | "low" | "moderate" | "high";

export type BowelSignal = {
  constipation: boolean;
  diarrhoea: boolean;
};

export type CareMonitoringInput = {
  /** Combined monitoring narrative (notes, handover, chart entries). */
  monitoringText?: string;
  fluidIntakeMl24h?: number | null;
  fluidTargetMl24h?: number | null;
  /** Approximate proportion of expected meals taken (0–100). */
  mealIntakeApproxPct?: number | null;
  /** Explicit flag from structured monitoring. */
  reducedOralIntake?: boolean | null;
  /** Structured stool classification when available. */
  lastStoolType?: "normal" | "constipation" | "diarrhoea" | "unknown" | null;
};

export type CareMonitoringAnalysis = {
  hydrationRisk: HydrationRiskLevel;
  hydrationDetail: string | null;
  poorNutrition: boolean;
  nutritionDetail: string | null;
  bowelIssues: BowelSignal;
  bowelDetail: string | null;
  clinicalConcerns: string[];
  narrative: string;
};

const HYDRATION_HIGH =
  /\b(dehydrat|severely?\s+dehydrat|acute\s+kidney|aki\b|hypernatraem|hypernatrem)/i;
const HYDRATION_MODERATE =
  /\b(reduced\s+fluid|low\s+fluid|inadequate\s+fluid|poor\s+fluid|fluid\s+deficit|refusing\s+drinks?|minimal\s+drinks?|sips\s+only|not\s+drinking|dehydrat|risk\s+of\s+dehydrat|dry\s+mouth|concentrated\s+urine|dark\s+urine)/i;
const NUTRITION_POOR =
  /\b(poor\s+nutrition|malnutrition|weight\s+loss|unintentional\s+weight|reduced\s+appetite|poor\s+appetite|minimal\s+oral\s+intake|refusing\s+food|skipped\s+meals?|eating\s+little|low\s+calorie|nutritional\s+risk|must score|must\b)/i;

const BOWEL_CONST =
  /\b(constipat|no\s+bowel|no\s+open|bowels?\s+not\s+open|hard\s+stool|strain|impacted?|fecal\s+loading)/i;
const BOWEL_DIARR =
  /\b(diarrhoea|diarrhea|loose\s+stool|frequent\s+stool|watery\s+stool|gastroenteritis)/i;

function normText(s: string): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeText(...parts: (string | null | undefined)[]): string {
  return normText(parts.filter(Boolean).join("\n"));
}

/**
 * Derive hydration tier from text + optional fluid metrics.
 */
function assessHydration(text: string, input: CareMonitoringInput): { level: HydrationRiskLevel; detail: string | null } {
  const intake = input.fluidIntakeMl24h;
  const target = input.fluidTargetMl24h;
  if (typeof intake === "number" && typeof target === "number" && target > 0) {
    const ratio = intake / target;
    if (ratio < 0.4) return { level: "high", detail: "Fluid intake is well below the expected 24-hour target." };
    if (ratio < 0.65) return { level: "moderate", detail: "Fluid intake is reduced relative to the 24-hour target." };
    if (ratio < 0.85) return { level: "low", detail: "Fluid intake is slightly below the 24-hour target." };
  }

  if (HYDRATION_HIGH.test(text)) return { level: "high", detail: "Documentation suggests significant dehydration or related acute risk." };
  if (HYDRATION_MODERATE.test(text)) {
    return {
      level: "moderate",
      detail: "Documentation suggests reduced fluid intake over recent care, placing the person at risk of dehydration.",
    };
  }
  return { level: "none", detail: null };
}

function assessNutrition(text: string, input: CareMonitoringInput): { poor: boolean; detail: string | null } {
  if (input.reducedOralIntake === true) {
    return { poor: true, detail: "Structured record indicates reduced oral intake." };
  }
  if (typeof input.mealIntakeApproxPct === "number" && input.mealIntakeApproxPct < 50) {
    return { poor: true, detail: "Meal intake appears substantially below expected levels." };
  }
  if (NUTRITION_POOR.test(text)) {
    return { poor: true, detail: "Documentation suggests nutritional risk or reduced food intake." };
  }
  return { poor: false, detail: null };
}

function assessBowel(text: string, input: CareMonitoringInput): { signal: BowelSignal; detail: string | null } {
  const signal: BowelSignal = { constipation: false, diarrhoea: false };
  if (input.lastStoolType === "constipation") signal.constipation = true;
  if (input.lastStoolType === "diarrhoea") signal.diarrhoea = true;

  if (BOWEL_CONST.test(text)) signal.constipation = true;
  if (BOWEL_DIARR.test(text)) signal.diarrhoea = true;

  if (signal.constipation && signal.diarrhoea) {
    return { signal, detail: "Stool records suggest altered bowel pattern (mixed or changing symptoms reported)." };
  }
  if (signal.constipation) {
    return { signal, detail: "Stool records or notes indicate possible constipation." };
  }
  if (signal.diarrhoea) {
    return { signal, detail: "Stool records or notes indicate possible diarrhoea or loose stools." };
  }
  return { signal, detail: null };
}

function collectClinicalConcerns(
  hydration: { level: HydrationRiskLevel; detail: string | null },
  nutrition: { poor: boolean; detail: string | null },
  bowel: { signal: BowelSignal; detail: string | null }
): string[] {
  const out: string[] = [];
  if (hydration.level === "high" || hydration.level === "moderate") {
    out.push(hydration.detail ?? "Hydration status requires attention.");
  }
  if (nutrition.poor) {
    out.push(nutrition.detail ?? "Nutritional intake may be inadequate.");
  }
  if (bowel.signal.constipation || bowel.signal.diarrhoea) {
    out.push(bowel.detail ?? "Bowel pattern may need review.");
  }
  return out;
}

/**
 * Compose a short professional paragraph (UK health/social care tone).
 */
function buildNarrative(
  hydration: { level: HydrationRiskLevel; detail: string | null },
  nutrition: { poor: boolean; detail: string | null },
  bowel: { signal: BowelSignal; detail: string | null }
): string {
  const sentences: string[] = [];

  if (hydration.level === "high") {
    sentences.push(
      "The patient appears to be at significant risk related to hydration status; urgent clinical review of fluid balance is appropriate."
    );
  } else if (hydration.level === "moderate") {
    sentences.push(
      "The patient demonstrates reduced fluid intake relative to recent care, placing them at risk of dehydration."
    );
  } else if (hydration.level === "low" && hydration.detail) {
    sentences.push(`Fluid intake should continue to be monitored (${hydration.detail.replace(/\.$/, "")}).`);
  }

  if (nutrition.poor && nutrition.detail) {
    sentences.push(`Nutrition records suggest concern: ${nutrition.detail.replace(/\.$/, "")}.`);
  }

  if (bowel.detail) {
    sentences.push(bowel.detail.endsWith(".") ? bowel.detail : `${bowel.detail}.`);
  }

  if (sentences.length === 0) {
    return "No specific hydration, nutrition, or bowel concerns were identified from the available monitoring information. Continue routine observation and documentation.";
  }

  sentences.push("Increased monitoring and intervention are recommended where concerns are present.");
  return sentences.join(" ");
}

/**
 * Primary API: analyse optional structured fields plus free-text monitoring narrative.
 */
export function analyzeCareMonitoring(input: CareMonitoringInput = {}): CareMonitoringAnalysis {
  const text = normText(input.monitoringText ?? "");

  const hydration = assessHydration(text, input);
  const nutrition = assessNutrition(text, input);
  const bowel = assessBowel(text, input);
  const clinicalConcerns = collectClinicalConcerns(hydration, nutrition, bowel);
  const narrative = buildNarrative(hydration, nutrition, bowel);

  return {
    hydrationRisk: hydration.level,
    hydrationDetail: hydration.detail,
    poorNutrition: nutrition.poor,
    nutritionDetail: nutrition.detail,
    bowelIssues: bowel.signal,
    bowelDetail: bowel.detail,
    clinicalConcerns,
    narrative,
  };
}

type NoteLike = {
  content?: string | null;
  correctedNote?: string | null;
  aiSummary?: string | null;
  structured?: {
    summary?: string | null;
    physicalHealth?: string | null;
    progress?: string | null;
  } | null;
  structuredData?: {
    summary?: string | null;
    physicalHealth?: string | null;
    progress?: string | null;
  } | null;
};

/**
 * Build monitoring text from recent clinical notes (newest first in array is fine; text is merged).
 */
export function analyzeCareMonitoringFromNotes(notes: NoteLike[]): CareMonitoringAnalysis {
  const chunks: string[] = [];
  for (const n of notes ?? []) {
    if (!n) continue;
    const sd = n.structuredData ?? n.structured;
    const body = mergeText(
      n.correctedNote ?? undefined,
      n.content ?? undefined,
      n.aiSummary ?? undefined,
      sd?.physicalHealth ?? undefined,
      sd?.summary ?? undefined,
      sd?.progress ?? undefined
    );
    if (body) chunks.push(body);
  }
  return analyzeCareMonitoring({ monitoringText: chunks.join("\n\n") });
}
