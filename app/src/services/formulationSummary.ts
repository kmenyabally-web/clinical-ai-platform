/**
 * Compact narrative block for MDT / CPA prompts from a formulation document.
 */

function pick(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  return s || "";
}

export function buildFormulationSummary(data: Record<string, unknown> | null | undefined): string {
  if (!data || typeof data !== "object") return "";

  return `
Presenting Problems: ${pick(data.presentingProblems)}

Predisposing: ${pick(data.predisposingFactors)}
Precipitating: ${pick(data.precipitatingFactors)}
Perpetuating: ${pick(data.perpetuatingFactors)}
Protective: ${pick(data.protectiveFactors)}

Triggers: ${pick(data.triggers)}
Coping strategies: ${pick(data.copingStrategies)}
Strengths: ${pick(data.strengths)}

Risk: ${pick(data.riskFormulation)}
`.trim();
}
