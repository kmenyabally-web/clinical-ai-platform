/**
 * CQC inspection defence engine (scoring + actionable action plan).
 *
 * Input is expected to be *real* data already fetched from Firestore:
 * { notes, incidents, behaviourLogs, physicalHealth, careLogs, policies }.
 */

export type InspectionDefenceInput = {
  notes: unknown[];
  incidents: unknown[];
  behaviourLogs: unknown[];
  physicalHealth: unknown[];
  careLogs: unknown[];
  policies: unknown[];
};

export type DomainScore = {
  score: number;
  issues: string[];
  strengths: string[];
};

export type InspectionDefenceOutput = {
  domains: {
    SAFE: DomainScore;
    EFFECTIVE: DomainScore;
    CARING: DomainScore;
    RESPONSIVE: DomainScore;
    WELL_LED: DomainScore;
  };
  overallScore: number;
  rating: "GREEN" | "AMBER" | "RED";
  actionPlan: string[];
};

function clamp100(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function toMillis(ts: unknown): number {
  // Firestore Timestamp or Date or ISO string/number.
  if (!ts) return 0;
  if (typeof ts === "object") {
    const maybe = ts as { toMillis?: () => number; toDate?: () => Date };
    if (typeof maybe.toMillis === "function") {
      try {
        return maybe.toMillis();
      } catch {
        return 0;
      }
    }
    if (typeof maybe.toDate === "function") {
      try {
        return maybe.toDate().getTime();
      } catch {
        return 0;
      }
    }
  }
  if (ts instanceof Date) return ts.getTime();
  const d = new Date(ts as any);
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function latestFirst<T extends Record<string, unknown>>(rows: T[]): T[] {
  return [...rows].sort((a, b) => toMillis(b.createdAt ?? b.recordedAt ?? b.eventAt) - toMillis(a.createdAt ?? a.recordedAt ?? a.eventAt));
}

function noteText(notes: unknown[]): string {
  const list = asArray(notes);
  const parts: string[] = [];
  for (const n of list) {
    if (!n || typeof n !== "object") continue;
    const o = n as Record<string, unknown>;
    const body =
      (typeof o.correctedNote === "string" && o.correctedNote) ||
      (typeof o.correctedText === "string" && o.correctedText) ||
      (typeof o.aiSummary === "string" && o.aiSummary) ||
      (typeof o.content === "string" && o.content) ||
      (typeof o?.structured?.summary === "string" && o.structured.summary) ||
      "";
    const s = String(body).trim();
    if (s) parts.push(s);
  }
  return parts.join("\n");
}

function scorePenalty(missing: boolean, penalty: number) {
  return missing ? penalty : 0;
}

function severityIsHigh(sev: unknown): boolean {
  const s = String(sev ?? "").trim().toLowerCase();
  return s === "high" || s === "critical";
}

function severityIsCritical(sev: unknown): boolean {
  const s = String(sev ?? "").trim().toLowerCase();
  return s === "critical";
}

function riskFromPhysical(physicalHealth: unknown[]): {
  highNews: boolean;
  latestRiskLevel: "low" | "medium" | "high" | null;
  issues: string[];
} {
  const list = asArray(physicalHealth) as Array<Record<string, unknown>>;
  const sorted = latestFirst(list);
  const latest = sorted[0] ?? null;
  const rl = String(latest?.riskLevel ?? "").toLowerCase();
  const latestRiskLevel = rl === "high" || rl === "medium" || rl === "low" ? (rl as any) : null;

  let highNews = false;
  const issues: string[] = [];

  for (const row of sorted.slice(0, 20)) {
    const news = typeof row.newsScore === "number" ? row.newsScore : Number(row.newsScore);
    if (Number.isFinite(news) && news >= 5) highNews = true;

    const rr = row.respiratoryRate != null ? Number(row.respiratoryRate) : null;
    const spo2 = row.oxygenSaturation != null ? Number(row.oxygenSaturation) : null;
    const temp = row.temperature != null ? Number(row.temperature) : null;
    const pulse = row.pulse != null ? Number(row.pulse) : null;

    if (rr != null && Number.isFinite(rr) && rr > 25) issues.push("Elevated respiratory rate observed (RR > 25).");
    if (spo2 != null && Number.isFinite(spo2) && spo2 < 92) issues.push("Low oxygen saturation observed (SpO2 < 92%).");
    if (temp != null && Number.isFinite(temp) && temp > 38) issues.push("Fever noted (temperature > 38°C).");
    if (pulse != null && Number.isFinite(pulse) && pulse > 120) issues.push("Tachycardia noted (pulse > 120 bpm).");
  }

  return { highNews, latestRiskLevel, issues: Array.from(new Set(issues)) };
}

function riskFromCareLogs(careLogs: unknown[]): {
  lowFluid: boolean;
  poorNutrition: boolean;
  bowelIssue: "constipation" | "diarrhoea" | "unknown" | null;
  issues: string[];
} {
  const list = asArray(careLogs) as Array<Record<string, unknown>>;
  const sorted = latestFirst(list);

  // Compute "last 24h" and "last 48h" using recordedAt/createdAt.
  const now = Date.now();
  const last24 = sorted.filter((r) => {
    const ms = toMillis(r.recordedAt ?? r.createdAt);
    return ms && now - ms <= 24 * 60 * 60 * 1000;
  });
  const last48 = sorted.filter((r) => {
    const ms = toMillis(r.recordedAt ?? r.createdAt);
    return ms && now - ms <= 48 * 60 * 60 * 1000;
  });

  let fluidMl = 0;
  let fluidCount = 0;
  for (const r of last24) {
    if (String(r.category ?? r.type ?? "").toLowerCase() !== "fluid") continue;
    const ml = r.amountMl != null ? Number(r.amountMl) : null;
    if (ml != null && Number.isFinite(ml) && ml > 0) {
      fluidMl += ml;
      fluidCount += 1;
    }
  }

  const foodPct: number[] = [];
  for (const r of last24) {
    if (String(r.category ?? r.type ?? "").toLowerCase() !== "food") continue;
    const pe = r.percentEaten != null ? Number(r.percentEaten) : null;
    if (pe != null && Number.isFinite(pe)) foodPct.push(pe);
  }

  const stools = last48.filter((r) => String(r.category ?? r.type ?? "").toLowerCase() === "stool");
  let bowelIssue: "constipation" | "diarrhoea" | "unknown" | null = null;
  if (stools.length === 0) {
    bowelIssue = "unknown";
  } else {
    const latestB = stools[0];
    const b = latestB?.bristolScale != null ? Number(latestB.bristolScale) : null;
    if (b != null && Number.isFinite(b)) {
      if (b <= 2) bowelIssue = "constipation";
      else if (b >= 6) bowelIssue = "diarrhoea";
      else bowelIssue = null;
    }
  }

  const issues: string[] = [];
  const lowFluid = fluidMl > 0 ? fluidMl < 800 : last24.length > 0; // if logs exist but sum is low
  if (lowFluid) issues.push("Low fluid intake signal in recent care logs.");

  const avgFood = foodPct.length ? foodPct.reduce((a, b) => a + b, 0) / foodPct.length : null;
  const poorNutrition = avgFood != null ? avgFood < 50 : false;
  if (poorNutrition) issues.push("Poor nutrition signal in recent food logs (low % eaten).");

  if (bowelIssue === "constipation") issues.push("Possible constipation signal (Bristol 1–2 or missing bowel chart).");
  if (bowelIssue === "diarrhoea") issues.push("Possible diarrhoea signal (Bristol 6–7).");
  if (bowelIssue === "unknown" && stools.length === 0) issues.push("No recent stool records found in the last 48 hours.");

  return { lowFluid, poorNutrition, bowelIssue, issues: Array.from(new Set(issues)) };
}

function riskFromBehaviour(behaviourLogs: unknown[]): { behaviourRisk: boolean; criticalCount: number; issues: string[] } {
  const list = asArray(behaviourLogs) as Array<Record<string, unknown>>;
  const sorted = latestFirst(list);

  let criticalCount = 0;
  let behaviourRisk = false;
  const issues: string[] = [];

  for (const row of sorted.slice(0, 30)) {
    const sev = row.severity ?? row.level ?? "";
    if (severityIsCritical(sev)) {
      criticalCount += 1;
      behaviourRisk = true;
      issues.push("Critical behaviour incident recorded (requires escalation/review).");
    } else if (severityIsHigh(sev)) {
      behaviourRisk = true;
      issues.push("High-severity behaviour incident recorded.");
    }
  }

  return { behaviourRisk, criticalCount, issues: Array.from(new Set(issues)) };
}

function riskFromIncidents(incidents: unknown[]): { highCount: number; criticalCount: number; issues: string[] } {
  const list = asArray(incidents) as Array<Record<string, unknown>>;
  const sorted = latestFirst(list);

  let highCount = 0;
  let criticalCount = 0;
  const issues: string[] = [];

  for (const row of sorted.slice(0, 50)) {
    const sev = row.severity ?? "";
    if (severityIsCritical(sev)) {
      criticalCount += 1;
      issues.push("Critical incident recorded.");
    } else if (severityIsHigh(sev)) {
      highCount += 1;
      issues.push("High-severity incident recorded.");
    }
  }

  return { highCount, criticalCount, issues: Array.from(new Set(issues)) };
}

export function scoreSAFE(input: InspectionDefenceInput): DomainScore {
  const issues: string[] = [];
  const strengths: string[] = [];

  const notes = asArray(input.notes);
  const policies = asArray(input.policies);
  const incidents = asArray(input.incidents);
  const physical = asArray(input.physicalHealth);
  const careLogs = asArray(input.careLogs);

  let score = 100;

  score -= scorePenalty(policies.length === 0, 25);
  score -= scorePenalty(physical.length === 0, 20);
  score -= scorePenalty(notes.length === 0, 15);
  score -= scorePenalty(careLogs.length === 0, 10);

  if (policies.length > 0) strengths.push("Governance policies are present in the evidence library.");
  if (physical.length > 0) strengths.push("Physical observations evidence is available.");
  if (notes.length > 0) strengths.push("Clinical notes are present for review.");

  const pr = riskFromPhysical(physical);
  if (pr.highNews) issues.push("High NEWS score observation found — clinical escalation should be documented.");
  issues.push(...pr.issues);
  if (pr.latestRiskLevel) strengths.push(`Latest physical risk level: ${pr.latestRiskLevel}.`);

  const ir = riskFromIncidents(incidents);
  if (ir.criticalCount > 0) issues.push("Critical incidents require robust review and learning evidence.");
  if (ir.highCount > 2) issues.push("Multiple high-severity incidents: ensure themes, RCA, and mitigation are documented.");

  const uniqueIssues = Array.from(new Set(issues));
  return {
    score: clamp100(score - uniqueIssues.length * 2),
    issues: uniqueIssues,
    strengths: Array.from(new Set(strengths)),
  };
}

export function scoreEFFECTIVE(input: InspectionDefenceInput): DomainScore {
  const issues: string[] = [];
  const strengths: string[] = [];

  const notes = asArray(input.notes);
  const physical = asArray(input.physicalHealth);
  const careLogs = asArray(input.careLogs);
  const policies = asArray(input.policies);

  let score = 100;
  score -= scorePenalty(notes.length < 2, 18);
  score -= scorePenalty(physical.length === 0, 15);
  score -= scorePenalty(careLogs.length === 0, 14);
  score -= scorePenalty(policies.length === 0, 10);

  if (notes.length >= 2) strengths.push("Sufficient clinical notes exist to evidence assessment and review.");
  if (physical.length > 0) strengths.push("Vital sign evidence is present to support care decisions.");
  if (careLogs.length > 0) strengths.push("Care monitoring logs are present to support effective delivery.");

  const cr = riskFromCareLogs(careLogs);
  if (cr.lowFluid) issues.push("Effective hydration monitoring may be insufficient (low recent fluid intake).");
  if (cr.poorNutrition) issues.push("Effective nutrition monitoring may be insufficient (low % eaten).");
  if (cr.bowelIssue) issues.push("Bowel function monitoring should be clearly documented.");

  return {
    score: clamp100(score - issues.length * 2),
    issues: Array.from(new Set(issues)),
    strengths: Array.from(new Set(strengths)),
  };
}

export function scoreCARING(input: InspectionDefenceInput): DomainScore {
  const issues: string[] = [];
  const strengths: string[] = [];

  const notes = asArray(input.notes);
  const physical = asArray(input.physicalHealth);
  const careLogs = asArray(input.careLogs);

  let score = 100;
  score -= scorePenalty(notes.length === 0, 20);
  score -= scorePenalty(careLogs.length === 0, 12);
  score -= scorePenalty(physical.length === 0, 12);

  if (notes.length > 0) {
    const t = noteText(notes).toLowerCase();
    if (t.includes("wishes") || t.includes("preferences") || t.includes("best interests") || t.includes("voice")) {
      strengths.push("Notes include patient-centred language (wishes/preferences).");
    } else {
      strengths.push("Clinical notes are present to evidence care delivery and communication.");
    }
  }

  const cr = riskFromCareLogs(careLogs);
  if (cr.poorNutrition) issues.push("Nutrition concerns: document person-centred support and response.");
  if (cr.bowelIssue) issues.push("Bowel concerns: document comfort-focused interventions and outcomes.");

  const pr = riskFromPhysical(physical);
  if (pr.highNews) issues.push("High clinical risk: evidence empathy, escalation, and clear care conversations.");

  return {
    score: clamp100(score - issues.length * 2),
    issues: Array.from(new Set(issues)),
    strengths: Array.from(new Set(strengths)),
  };
}

export function scoreRESPONSIVE(input: InspectionDefenceInput): DomainScore {
  const issues: string[] = [];
  const strengths: string[] = [];

  const incidents = asArray(input.incidents);
  const behaviour = asArray(input.behaviourLogs);
  const physical = asArray(input.physicalHealth);

  let score = 100;

  score -= scorePenalty(incidents.length === 0, 10);
  score -= scorePenalty(behaviour.length === 0, 10);
  score -= scorePenalty(physical.length === 0, 10);

  const ir = riskFromIncidents(incidents);
  if (ir.criticalCount > 0) issues.push("Critical incidents: ensure immediate response and de-escalation actions are recorded.");
  if (ir.highCount > 0) strengths.push("Incidents evidence indicates responsiveness to concerns.");

  const br = riskFromBehaviour(behaviour);
  if (br.behaviourRisk) issues.push("Behaviour risk evidence suggests care should document de-escalation outcomes.");

  const pr = riskFromPhysical(physical);
  if (pr.highNews) issues.push("High NEWS: ensure escalation pathway was applied and actions are logged.");

  return {
    score: clamp100(score - issues.length * 2),
    issues: Array.from(new Set(issues)),
    strengths: Array.from(new Set(strengths)),
  };
}

export function scoreWELL_LED(input: InspectionDefenceInput): DomainScore {
  const issues: string[] = [];
  const strengths: string[] = [];

  const policies = asArray(input.policies);
  const incidents = asArray(input.incidents);
  const notes = asArray(input.notes);

  let score = 100;
  score -= scorePenalty(policies.length === 0, 28);
  score -= scorePenalty(notes.length < 2, 12);
  score -= scorePenalty(incidents.length === 0, 8);

  const t = policies.map((p) => String((p as any)?.type ?? (p as any)?.category ?? "").toLowerCase()).join(" ");
  if (policies.length > 0) strengths.push("Governance policies exist to underpin safe, effective, and responsive care.");
  if (t.includes("safeguard")) strengths.push("Safeguarding policy coverage detected.");
  if (t.includes("medication")) strengths.push("Medication policy coverage detected.");
  if (t.includes("behaviour")) strengths.push("Behaviour-related governance coverage detected.");

  const ir = riskFromIncidents(incidents);
  if (ir.highCount + ir.criticalCount > 3) issues.push("Many incidents: ensure robust governance, learning, and action tracking are evident.");

  return {
    score: clamp100(score - issues.length * 2),
    issues: Array.from(new Set(issues)),
    strengths: Array.from(new Set(strengths)),
  };
}

function overallRating(overallScore: number): InspectionDefenceOutput["rating"] {
  if (overallScore >= 80) return "GREEN";
  if (overallScore >= 65) return "AMBER";
  return "RED";
}

function generateActionPlan(input: InspectionDefenceInput, domainScores: InspectionDefenceOutput["domains"]): string[] {
  const actions: string[] = [];
  const policies = asArray(input.policies);
  const careLogs = asArray(input.careLogs);
  const physical = asArray(input.physicalHealth);
  const incidents = asArray(input.incidents);
  const behaviour = asArray(input.behaviourLogs);
  const notes = asArray(input.notes);

  if (!policies.length) {
    actions.push("Upload governance policies (safeguarding, medication, behaviour support, and general procedures).");
  }

  const cr = riskFromCareLogs(careLogs);
  if (cr.lowFluid) actions.push("Increase hydration monitoring (fluid balance, encouragement, and escalation triggers).");
  if (cr.poorNutrition) actions.push("Assess and document nutrition support needs (meal planning, appetite, and escalation).");
  if (cr.bowelIssue) {
    if (cr.bowelIssue === "constipation") actions.push("Implement bowel support plan (Bristol charting and constipation prevention).");
    else if (cr.bowelIssue === "diarrhoea") actions.push("Monitor bowel symptoms closely and document response/outcomes (loose stool/dehydration prevention).");
    else actions.push("Record bowel function (stool chart) consistently to evidence assessment and intervention.");
  }

  const pr = riskFromPhysical(physical);
  if (pr.highNews) actions.push("Document immediate clinical review and escalation actions for high NEWS observations.");

  const ir = riskFromIncidents(incidents);
  if (ir.highCount + ir.criticalCount > 0) actions.push("Review incident themes and document learning, RCA, and prevention measures.");

  const br = riskFromBehaviour(behaviour);
  if (br.behaviourRisk) actions.push("Review behaviour support plan and ensure de-escalation outcomes are recorded.");

  if (notes.length < 2) actions.push("Add recent clinical notes covering assessment, risk review, and care updates.");

  // Domain-level suggestions when a score is low.
  const entries = Object.entries(domainScores) as Array<[keyof InspectionDefenceOutput["domains"], DomainScore]>;
  for (const [domainKey, d] of entries) {
    if (d.score < 65) {
      const msg =
        domainKey === "SAFE"
          ? "Strengthen SAFE evidence: governance policies, safe escalation, and physical observation response."
          : domainKey === "EFFECTIVE"
            ? "Strengthen EFFECTIVE evidence: clear assessment-to-care link and monitoring outcomes."
            : domainKey === "CARING"
              ? "Strengthen CARING evidence: person-centred documentation, comfort interventions, and outcomes."
              : domainKey === "RESPONSIVE"
                ? "Strengthen RESPONSIVE evidence: timely action, escalation pathways, and documented outcomes."
                : "Strengthen WELL_LED evidence: governance oversight, learning loops, and policy coverage.";
      actions.push(msg);
    }
  }

  // De-dup but keep order.
  return Array.from(new Set(actions));
}

/**
 * Main entry: compute domain scores, overall score, and actionable action plan.
 */
export function runInspectionDefenceEngine(input: InspectionDefenceInput): InspectionDefenceOutput {
  const safe = scoreSAFE(input);
  const effective = scoreEFFECTIVE(input);
  const caring = scoreCARING(input);
  const responsive = scoreRESPONSIVE(input);
  const wellLed = scoreWELL_LED(input);

  const domains = {
    SAFE: safe,
    EFFECTIVE: effective,
    CARING: caring,
    RESPONSIVE: responsive,
    WELL_LED: wellLed,
  };

  const overallScore = Math.round(
    (domains.SAFE.score +
      domains.EFFECTIVE.score +
      domains.CARING.score +
      domains.RESPONSIVE.score +
      domains.WELL_LED.score) /
      5
  );

  const rating = overallRating(overallScore);
  const actionPlan = generateActionPlan(input, domains);

  return { domains, overallScore, rating, actionPlan };
}

