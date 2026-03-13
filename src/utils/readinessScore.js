/**
 * Evidence-based CQC readiness scoring.
 * Data source: Firestore collection "evidence" (organisationId, serviceId, domain, title, fileUrl, uploadedAt).
 * Domains: Safe, Effective, Caring, Responsive, Well-led.
 * Each domain requires at least 3 evidence documents for 100%.
 */

const EVIDENCE_DOMAIN_KEYS = ["safe", "effective", "caring", "responsive", "well-led"];

/** Score per domain: 0 docs = 0%, 1 = 33%, 2 = 66%, 3+ = 100% */
function scoreFromCount(count) {
  if (count >= 3) return 100;
  if (count === 2) return 66;
  if (count === 1) return 33;
  return 0;
}

/** Risk: 0–40 = High, 41–70 = Medium, 71–100 = Low */
function riskLevelFromScore(score) {
  if (typeof score !== "number" || score < 0) return "High";
  if (score <= 40) return "High";
  if (score <= 70) return "Medium";
  return "Low";
}

/**
 * Calculate readiness scores from an array of evidence documents.
 * Each evidence item should have at least: { domain: string } (normalised to lowercase).
 *
 * @param {Array<{ domain?: string }>} evidence - List of evidence documents from Firestore
 * @returns {{
 *   safeScore: number,
 *   effectiveScore: number,
 *   caringScore: number,
 *   responsiveScore: number,
 *   wellLedScore: number,
 *   overallScore: number,
 *   riskLevel: string
 * }}
 */
export function calculateReadinessFromEvidence(evidence) {
  const list = Array.isArray(evidence) ? evidence : [];
  const counts = { safe: 0, effective: 0, caring: 0, responsive: 0, "well-led": 0 };

  list.forEach((item) => {
    const domain = (item.domain || "").toString().trim().toLowerCase();
    if (domain && counts.hasOwnProperty(domain)) {
      counts[domain] += 1;
    }
  });

  const safeScore = scoreFromCount(counts.safe);
  const effectiveScore = scoreFromCount(counts.effective);
  const caringScore = scoreFromCount(counts.caring);
  const responsiveScore = scoreFromCount(counts.responsive);
  const wellLedScore = scoreFromCount(counts["well-led"]);

  const domainScores = [safeScore, effectiveScore, caringScore, responsiveScore, wellLedScore];
  const overallScore =
    domainScores.length > 0
      ? Math.round(
          domainScores.reduce((a, b) => a + b, 0) / domainScores.length
        )
      : 0;

  const riskLevel = riskLevelFromScore(overallScore);

  return {
    safeScore,
    effectiveScore,
    caringScore,
    responsiveScore,
    wellLedScore,
    overallScore,
    riskLevel,
  };
}
