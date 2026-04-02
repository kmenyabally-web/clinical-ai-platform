/**
 * Predictive intelligence engine.
 * Data-driven only: no hallucinated facts, only patterns present in provided evidence.
 */

export type PredictionInput = {
  behaviourLogs: unknown[];
  physicalHealth: unknown[];
  careLogs: unknown[];
  incidents: unknown[];
};

export type PredictionOutput = {
  predictions: string[];
  confidence: "High" | "Moderate";
};

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function toNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function getNewsScore(row: any): number | null {
  // Physical observations sometimes store `newsScore`.
  return toNumber(row?.newsScore ?? row?.news ?? null);
}

function getFluidValueMl(row: any): number | null {
  // Current care_logs schema uses: category="fluid" and amountMl (or value for legacy).
  const cat = String(row?.category ?? row?.type ?? "").trim().toLowerCase();
  if (cat !== "fluid") return null;
  return toNumber(row?.amountMl ?? row?.value ?? null);
}

function analyseTrend(data: PredictionInput) {
  const behaviourLogs = asArray(data.behaviourLogs);
  const physicalHealth = asArray(data.physicalHealth);

  const increasingBehaviour = behaviourLogs.slice(0, 3).length > behaviourLogs.slice(3, 6).length;

  const risingNEWS =
    getNewsScore(physicalHealth[0] as any) != null &&
    getNewsScore(physicalHealth[1] as any) != null &&
    (getNewsScore(physicalHealth[0] as any) as number) > (getNewsScore(physicalHealth[1] as any) as number);

  return { increasingBehaviour, risingNEWS };
}

function generatePredictions(data: PredictionInput): string[] {
  const predictions: string[] = [];

  const trend = analyseTrend(data);
  if (trend.increasingBehaviour) predictions.push("⚠️ Behaviour escalation likely");
  if (trend.risingNEWS) predictions.push("🚨 Clinical deterioration likely");

  const careLogs = asArray(data.careLogs);
  const dehydrationRiskIncreasing = careLogs.some((c) => {
    const ml = getFluidValueMl(c);
    if (ml == null) return false;
    return ml < 500;
  });
  if (dehydrationRiskIncreasing) predictions.push("⚠️ Dehydration risk increasing");

  // Incidents are currently not used in your provided rules; keep it data-driven-only and simple.
  return predictions;
}

function getConfidence(predictions: string[]) {
  return predictions.length > 2 ? "High" : "Moderate";
}

export function runPredictionEngine(input: PredictionInput): PredictionOutput {
  const predictions = generatePredictions(input);
  return { predictions, confidence: getConfidence(predictions) };
}

