/**
 * Read V2 structured discipline + nursing shapes for risk and early-warning engines.
 */

export function nursingObservationText(n: unknown): string {
  if (!n || typeof n !== "object") return "";
  const o = n as Record<string, unknown>;
  return String(o.physicalHealth ?? o.notes ?? "").trim();
}

export function nursingMedicationNonCompliant(n: unknown): boolean {
  if (!n || typeof n !== "object") return false;
  const s = String((n as Record<string, unknown>).medicationAdherence ?? "")
    .trim()
    .toLowerCase();
  return s === "no" || s === "partial";
}

export function nursingAdlDeclineFromObs(n: unknown): boolean {
  if (!n || typeof n !== "object") return false;
  const o = n as Record<string, unknown>;
  const adls = o.adls;
  if (adls && typeof adls === "object" && !Array.isArray(adls)) {
    const a = adls as Record<string, unknown>;
    if (a.washing === "assisted" || a.dressing === "assisted" || a.hygiene === "poor") return true;
  }
  const s = String(adls ?? "").toLowerCase();
  return /declin|reduced|increase.*support|1:1|fully assist|dependent|worsen|lower level|decreas|needs support/i.test(s);
}

export function readPsychiatryRiskLevel(doc: unknown): "low" | "medium" | "high" | null {
  if (!doc || typeof doc !== "object") return null;
  const r = String((doc as Record<string, unknown>).riskLevel ?? "")
    .trim()
    .toLowerCase();
  if (r === "high" || r === "medium" || r === "low") return r;
  return null;
}

export function readPsychiatryMedicationNonCompliance(doc: unknown, inferred: boolean): boolean {
  if (doc && typeof doc === "object") {
    const meds = (doc as Record<string, unknown>).medication;
    if (Array.isArray(meds)) {
      for (const m of meds) {
        if (!m || typeof m !== "object") continue;
        const changes = String((m as Record<string, unknown>).changes ?? "").toLowerCase();
        if (/non|refus|poor|miss|discontinu|hold|declin|spit/i.test(changes)) return true;
      }
    }
  }
  return inferred;
}

export function readOTIndependenceLow(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  return String((doc as Record<string, unknown>).independenceLevel ?? "")
    .trim()
    .toLowerCase() === "low";
}

export function readSaltSwallowRisk(doc: unknown): "low" | "medium" | "high" | null {
  if (!doc || typeof doc !== "object") return null;
  const r = String((doc as Record<string, unknown>).swallowRisk ?? "")
    .trim()
    .toLowerCase();
  if (r === "high" || r === "medium" || r === "low") return r;
  return null;
}

export function readPsychologyTherapyPoor(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return false;
  return String((doc as Record<string, unknown>).therapyEngagement ?? "")
    .trim()
    .toLowerCase() === "poor";
}
