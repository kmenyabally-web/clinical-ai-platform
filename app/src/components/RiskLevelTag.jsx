import { clinicalRiskVariant } from "../utils/clinicalRiskVariant";

/**
 * Risk band pill: LOW → green, MEDIUM → amber, HIGH → red.
 */
export default function RiskLevelTag({ level }) {
  const v = clinicalRiskVariant(level);
  const label = level != null && String(level).trim() !== "" ? String(level) : "—";
  return <span className={`tag-risk tag-risk--${v}`}>{label}</span>;
}
