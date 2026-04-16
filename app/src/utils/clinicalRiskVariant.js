/**
 * Map free-text risk labels to tag variants for clinical UI.
 * @returns {"high"|"medium"|"low"|"unknown"}
 */
export function clinicalRiskVariant(level) {
  const s = String(level ?? "").toLowerCase();
  if (!s.trim()) return "unknown";
  if (/\bhigh\b/.test(s) || s === "h") return "high";
  if (/\bmedium\b/.test(s) || /\bmoderate\b/.test(s) || s === "m") return "medium";
  if (/\blow\b/.test(s) || s === "l") return "low";
  return "unknown";
}
