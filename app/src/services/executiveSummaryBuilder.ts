/**
 * Executive summary block for clinical reports (decision-ready overview).
 */

export type ExecutiveSummaryInput = {
  risk?: { overallRisk?: string; trend?: string } | null;
  alerts?: unknown[] | null;
  summaryHighlights?: string | null;
};

export function buildExecutiveSummary(data: ExecutiveSummaryInput): string {
  const risk = String(data.risk?.overallRisk ?? "low").toLowerCase();
  const trend = String(data.risk?.trend ?? "stable").toLowerCase();
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const highlights =
    typeof data.summaryHighlights === "string" && data.summaryHighlights.trim()
      ? data.summaryHighlights.trim()
      : "variable engagement";

  const riskLabel = risk === "high" || risk === "medium" || risk === "low" ? risk : "low";

  const concerns = alerts.length
    ? "identified clinical risks and behavioural indicators requiring monitoring"
    : "no significant automated alert flags in the current snapshot";

  const prose = `The patient currently presents with an overall risk level assessed as ${riskLabel.toUpperCase()}, with a trend described as ${trend}. Key concerns during this reporting period include ${concerns}. The patient continues to demonstrate ${highlights}, with ongoing MDT involvement recommended to support clinical stability.`;

  return prose.replace(/\s+/g, " ").trim();
}
