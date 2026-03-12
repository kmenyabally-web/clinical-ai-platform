import { fetchComplianceDomains, fetchComplianceStats, fetchComplianceActions } from "./complianceService";
import { fetchDocumentCountsByDomain } from "./documentService";
import { CQC_DOCUMENT_DOMAINS } from "../config/documentDomains";
import { DOMAIN_TO_STATS_FIELD } from "../config/documentDomains";

/** Deduction points per finding (scoring model). */
const DEDUCTION_OVERDUE_ACTION = 3;
const DEDUCTION_HIGH_SEVERITY_OPEN = 5;
const DEDUCTION_MISSING_DOMAIN_EVIDENCE = 5;

/** Risk level thresholds. */
const RISK_LOW_MIN = 80;
const RISK_MEDIUM_MIN = 60;

/**
 * Classify risk level from score (0–100).
 * Low: 80–100, Medium: 60–79, High: below 60.
 */
export function getRiskLevel(score) {
  if (score >= RISK_LOW_MIN) return "Low";
  if (score >= RISK_MEDIUM_MIN) return "Medium";
  return "High";
}

/**
 * Domains that require evidence (all five CQC domains).
 */
const EVIDENCE_DOMAIN_KEYS = CQC_DOCUMENT_DOMAINS.map((d) => d.value);

/**
 * Detect domains with no evidence documents. Uses document_stats (one read).
 * @param {string} organisationId
 * @returns {Promise<Array<{ domainKey: string, label: string }>>}
 */
export async function detectMissingEvidence(organisationId, serviceId) {
  if (!organisationId?.trim()) return [];
  const counts = await fetchDocumentCountsByDomain(organisationId, serviceId);
  const missing = [];
  for (const d of CQC_DOCUMENT_DOMAINS) {
    const field = DOMAIN_TO_STATS_FIELD[d.value];
    const count = field ? counts[field] : 0;
    if (!count || count === 0) {
      missing.push({ domainKey: d.value, label: d.label });
    }
  }
  return missing;
}

/**
 * Get count of overdue open actions (dueDate < now, status open or in-progress).
 * Fetches open actions (limit 100) and filters client-side to avoid composite index; efficient for typical org size.
 * @param {string} organisationId
 * @returns {Promise<{ count: number, actions: Array<{ id: string, title: string, dueDate: unknown }> }>}
 */
export async function getOverdueActions(organisationId, serviceId) {
  if (!organisationId?.trim()) return { count: 0, actions: [] };
  const actions = await fetchComplianceActions(organisationId, { limitCount: 100, serviceId });
  const now = Date.now();
  const overdue = actions.filter((a) => {
    if (a.status === "complete") return false;
    const due = a.dueDate?.toMillis?.() ?? (a.dueDate && typeof a.dueDate === "object" && "seconds" in a.dueDate ? a.dueDate.seconds * 1000 : null);
    return due != null && due < now;
  });
  return {
    count: overdue.length,
    actions: overdue.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate })),
  };
}

/**
 * Calculate overall CQC readiness score (0–100) and risk level.
 * Uses: compliance_domains (average score), compliance_stats (open + high-risk counts), overdue actions, document_stats (missing evidence).
 * Deductions: overdue × 3, high-severity open × 5, missing domain evidence × 5.
 *
 * @param {string} organisationId
 * @returns {Promise<{ overallReadinessScore: number, riskLevel: string, baseScore: number, deductions: { overdue: number, highSeverity: number, missingEvidence: number }, overdueCount: number, highSeverityCount: number, missingEvidenceCount: number }>}
 */
export async function calculateReadinessScore(organisationId, serviceId) {
  if (!organisationId?.trim()) {
    return {
      overallReadinessScore: 0,
      riskLevel: "High",
      baseScore: 0,
      deductions: { overdue: 0, highSeverity: 0, missingEvidence: 0 },
      overdueCount: 0,
      highSeverityCount: 0,
      missingEvidenceCount: 0,
    };
  }

  const [domainsRaw, stats, overdueResultRaw, missingEvidenceRaw] = await Promise.all([
    fetchComplianceDomains(organisationId, serviceId),
    fetchComplianceStats(organisationId, serviceId),
    getOverdueActions(organisationId, serviceId),
    detectMissingEvidence(organisationId, serviceId),
  ]);
  const domains = Array.isArray(domainsRaw) ? domainsRaw : [];
  const overdueResult = overdueResultRaw && typeof overdueResultRaw === "object" ? overdueResultRaw : { count: 0, actions: [] };
  const missingEvidence = Array.isArray(missingEvidenceRaw) ? missingEvidenceRaw : [];

  const openActionCount = stats?.openActionCount ?? 0;
  const highRiskActionCount = stats?.highRiskActionCount ?? 0;
  const overdueCount = overdueResult?.count ?? 0;
  const missingEvidenceCount = missingEvidence.length;

  const baseScore =
    domains.length > 0
      ? domains.reduce((sum, d) => sum + (d.compliancePercent ?? 0), 0) / domains.length
      : 100;

  const deductionOverdue = overdueCount * DEDUCTION_OVERDUE_ACTION;
  const deductionHighSeverity = highRiskActionCount * DEDUCTION_HIGH_SEVERITY_OPEN;
  const deductionMissingEvidence = missingEvidenceCount * DEDUCTION_MISSING_DOMAIN_EVIDENCE;
  const totalDeduction = deductionOverdue + deductionHighSeverity + deductionMissingEvidence;

  const overallReadinessScore = Math.max(0, Math.min(100, Math.round((baseScore - totalDeduction) * 10) / 10));
  const riskLevel = getRiskLevel(overallReadinessScore);

  const result = {
    overallReadinessScore,
    riskLevel,
    baseScore: Math.round(baseScore * 10) / 10,
    deductions: {
      overdue: deductionOverdue,
      highSeverity: deductionHighSeverity,
      missingEvidence: deductionMissingEvidence,
    },
    overdueCount,
    highSeverityCount: highRiskActionCount,
    missingEvidenceCount,
    overdueActions: Array.isArray(overdueResult?.actions) ? overdueResult.actions : [],
    missingEvidence,
  };

  return result;
}

/**
 * Per-domain readiness and risk. Uses compliance_domains for score; applies same risk bands.
 * @param {string} organisationId
 * @returns {Promise<Array<{ domainKey: string, label: string, score: number, riskLevel: string, hasEvidence: boolean }>>}
 */
export async function calculateDomainRisk(organisationId, serviceId) {
  if (!organisationId?.trim()) {
    return CQC_DOCUMENT_DOMAINS.map((d) => ({
      domainKey: d.value,
      label: d.label,
      score: 0,
      riskLevel: "High",
      hasEvidence: false,
    }));
  }

  const [domainsRaw, docCountsRaw] = await Promise.all([
    fetchComplianceDomains(organisationId, serviceId),
    fetchDocumentCountsByDomain(organisationId, serviceId),
  ]);
  const domains = Array.isArray(domainsRaw) ? domainsRaw : [];
  const docCounts = docCountsRaw && typeof docCountsRaw === "object" ? docCountsRaw : {};

  const domainByKey = new Map(domains.map((d) => [d.domainKey ?? d.id, d]));

  return CQC_DOCUMENT_DOMAINS.map((d) => {
    const domain = domainByKey.get(d.value);
    const score = domain ? (domain.compliancePercent ?? 0) : 0;
    const field = DOMAIN_TO_STATS_FIELD[d.value];
    const docCount = field ? (docCounts[field] ?? 0) : 0;
    const hasEvidence = docCount > 0;
    return {
      domainKey: d.value,
      label: d.label,
      score,
      riskLevel: getRiskLevel(score),
      hasEvidence,
    };
  });
}
