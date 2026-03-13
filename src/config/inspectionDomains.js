/**
 * CQC Key Questions (inspection themes). Used for inspection_questions domainType.
 */
export const CQC_KEY_QUESTIONS = [
  { value: "safe", label: "Safe" },
  { value: "effective", label: "Effective" },
  { value: "caring", label: "Caring" },
  { value: "responsive", label: "Responsive" },
  { value: "well-led", label: "Well-led" },
];

export const RESPONSE_VALUES = [
  { value: "Yes", label: "Yes", scoreFactor: 1 },
  { value: "Partial", label: "Partial", scoreFactor: 0.5 },
  { value: "No", label: "No", scoreFactor: 0 },
];

/** Risk bands for inspection score (0–100). */
export const INSPECTION_RISK_LOW_MIN = 80;
export const INSPECTION_RISK_MEDIUM_MIN = 60;

export function getInspectionRiskLevel(score) {
  if (score >= INSPECTION_RISK_LOW_MIN) return "Low risk";
  if (score >= INSPECTION_RISK_MEDIUM_MIN) return "Medium risk";
  return "High risk";
}
