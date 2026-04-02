/**
 * Care plan risk engine + (optional) AI refinement.
 *
 * This engine is intentionally deterministic by default; AI is used only to refine
 * wording and clinical tone while keeping the same risk categories supplied by the engine.
 */

import { generateAIContent, stripJsonFence } from "./geminiAiService";

export type CarePlanEngineInput = {
  notes: unknown[];
  behaviourLogs: unknown[];
  physicalHealth: unknown[];
  careLogs: unknown[];
  incidents: unknown[];
};

export type CarePlanEngineOutput = {
  risks: string[];
  interventions: string[];
  monitoring: string[];
  overallScore: number;
  rating: "GREEN" | "AMBER" | "RED";
};

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function getNumeric(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function logCategory(row: any): string {
  return String(row?.category ?? row?.type ?? row?.logType ?? "").trim().toLowerCase();
}

function detectRisk(data: CarePlanEngineInput): string[] {
  const risks: string[] = [];

  const behaviour = asArray(data.behaviourLogs);
  if (behaviour.length > 5) risks.push("Behaviour escalation");

  const physical = asArray(data.physicalHealth) as Array<Record<string, unknown>>;
  if (physical.some((p) => getNumeric((p as any)?.newsScore) != null && Number((p as any)?.newsScore) >= 5)) {
    risks.push("Clinical deterioration");
  }

  const careLogs = asArray(data.careLogs) as Array<Record<string, unknown>>;
  const dehydration = careLogs.some((c) => {
    const cat = logCategory(c);
    if (cat !== "fluid") return false;
    // Legacy example used c.value; current schema uses amountMl.
    const ml = getNumeric((c as any)?.amountMl ?? (c as any)?.value ?? null);
    if (ml == null) return false;
    return ml < 500;
  });
  if (dehydration) risks.push("Dehydration risk");

  // Optional: incidents can contribute to responsiveness needs.
  const incidents = asArray(data.incidents) as Array<Record<string, unknown>>;
  const criticalish = incidents.some((i) => {
    const sev = String(i?.severity ?? "").trim().toLowerCase();
    return sev === "critical" || sev === "high";
  });
  if (criticalish) risks.push("Incident escalation");

  return Array.from(new Set(risks));
}

function generateCarePlan(data: CarePlanEngineInput): CarePlanEngineOutput {
  const risks = detectRisk(data);

  const interventions: string[] = ["Increase monitoring", "Review care plan", "MDT discussion"];
  const monitoring: string[] = ["Daily observations", "Behaviour tracking", "Fluid intake monitoring"];

  // Tailor interventions based on detected risks.
  if (risks.includes("Dehydration risk")) interventions.unshift("Implement hydration protocol and document response");
  if (risks.includes("Clinical deterioration")) interventions.unshift("Escalate clinical review pathway and document actions taken");
  if (risks.includes("Behaviour escalation")) interventions.unshift("Revisit behaviour support strategies and document de-escalation outcomes");
  if (risks.includes("Incident escalation")) interventions.unshift("Review incident learning and update prevention strategies");

  if (risks.includes("Dehydration risk")) monitoring.unshift("Track fluid balance and consider escalation triggers");
  if (risks.includes("Clinical deterioration")) monitoring.unshift("Increase frequency of vital sign checks per escalation guidance");
  if (risks.includes("Behaviour escalation")) monitoring.unshift("Ensure behaviour charting includes triggers, actions, and outcomes");

  const { overallScore, rating } = scoreFromRisks(risks);
  return { risks, interventions, monitoring, overallScore, rating };
}

function scoreFromRisks(risks: string[]): { overallScore: number; rating: "GREEN" | "AMBER" | "RED" } {
  const penalties: Record<string, number> = {
    "Behaviour escalation": 15,
    "Clinical deterioration": 25,
    "Dehydration risk": 20,
    "Incident escalation": 20,
  };

  const totalPenalty = risks.reduce((sum, r) => sum + (penalties[r] ?? 10), 0);
  const overallScore = Math.max(0, Math.min(100, 100 - totalPenalty));

  const rating: "GREEN" | "AMBER" | "RED" = overallScore >= 80 ? "GREEN" : overallScore >= 65 ? "AMBER" : "RED";
  return { overallScore, rating };
}

async function enhanceCarePlanWithAI(base: CarePlanEngineOutput): Promise<CarePlanEngineOutput> {
  // If there is no risk, keep deterministic output (AI adds cost and may change intent).
  if (!base.risks.length) return base;

  const prompt = [
    "You are a clinical care planning assistant.",
    "Rewrite the following care plan items in professional, person-centred clinical tone.",
    "DO NOT invent new risks, diagnoses, medications, or facts.",
    "Keep the risks list as-is (same wording) and return updated interventions and monitoring with clearer, actionable wording.",
    "",
    "STRICT DATA MODE:",
    "- Use ONLY the provided risks/interventions/monitoring.",
    "- Output must be JSON only.",
    "",
    `RISK CATEGORIES: ${JSON.stringify(base.risks)}`,
    `INTERVENTIONS: ${JSON.stringify(base.interventions)}`,
    `MONITORING: ${JSON.stringify(base.monitoring)}`,
    "",
    "Return exactly this JSON shape:",
    '{ "risks": string[], "interventions": string[], "monitoring": string[] }',
  ].join("\n");

  const aiText = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
  if (!aiText) return base;

  try {
    const cleaned = stripJsonFence(aiText);
    const parsed = JSON.parse(cleaned);
    const out: CarePlanEngineOutput = {
      risks: Array.isArray(parsed?.risks) ? parsed.risks.map((x: any) => String(x)) : base.risks,
      interventions: Array.isArray(parsed?.interventions)
        ? parsed.interventions.map((x: any) => String(x)).filter(Boolean)
        : base.interventions,
      monitoring: Array.isArray(parsed?.monitoring) ? parsed.monitoring.map((x: any) => String(x)).filter(Boolean) : base.monitoring,
      overallScore: base.overallScore,
      rating: base.rating,
    };
    // Ensure risks are not changed (keeps engine intent deterministic).
    out.risks = base.risks;
    return out;
  } catch {
    return base;
  }
}

export function runCarePlanEngine(input: CarePlanEngineInput): CarePlanEngineOutput {
  return generateCarePlan(input);
}

export async function runCarePlanEngineWithAI(input: CarePlanEngineInput): Promise<CarePlanEngineOutput> {
  const base = generateCarePlan(input);
  return enhanceCarePlanWithAI(base);
}

