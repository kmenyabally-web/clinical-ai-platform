import { getOrganisation } from "./organisation";
import { getService } from "./servicesService";
import {
  fetchComplianceDomains,
  fetchComplianceStats,
  fetchComplianceActions,
} from "./complianceService";
import { fetchDocumentCountsByDomain } from "./documentService";
import { getSessionsForOrganisation } from "./inspectionService";
import { getRiskLevel } from "./readinessService";
import { logAuditEventNonBlocking } from "./auditService";
import { CQC_DOCUMENT_DOMAINS } from "../config/documentDomains";
import { DOMAIN_TO_STATS_FIELD } from "../config/documentDomains";

const DEDUCTION_OVERDUE = 3;
const DEDUCTION_HIGH_SEVERITY = 5;
const DEDUCTION_MISSING_EVIDENCE = 5;

/**
 * Domain summary for report: name, score, readiness level.
 * Uses compliance_domains (one query).
 * @param {string} organisationId
 * @returns {Promise<Array<{ domainKey: string, name: string, compliancePercent: number, readinessLevel: string }>>}
 */
export async function generateDomainSummary(organisationId) {
  if (!organisationId?.trim()) return [];
  const domains = await fetchComplianceDomains(organisationId);
  return domains.map((d) => ({
    domainKey: d.domainKey ?? d.id,
    name: d.name ?? d.domainKey ?? "",
    compliancePercent: typeof d.compliancePercent === "number" ? d.compliancePercent : 0,
    readinessLevel: d.readinessLevel ?? "Not started",
  }));
}

/**
 * Action summary: open count, overdue count/actions, high severity count/actions.
 * Uses compliance_stats (one read) and fetchComplianceActions for lists (one read).
 * @param {string} organisationId
 * @returns {Promise<{ openCount: number, overdueCount: number, overdueActions: Array<{ id: string, title: string, dueDate: unknown }>, highSeverityCount: number, highSeverityActions: Array<{ id: string, title: string, riskLevel: string }> }>}
 */
export async function generateActionSummary(organisationId) {
  if (!organisationId?.trim()) {
    return {
      openCount: 0,
      overdueCount: 0,
      overdueActions: [],
      highSeverityCount: 0,
      highSeverityActions: [],
    };
  }
  const [stats, actions] = await Promise.all([
    fetchComplianceStats(organisationId),
    fetchComplianceActions(organisationId, { limitCount: 100 }),
  ]);
  const now = Date.now();
  const openActions = actions.filter((a) => a.status !== "complete");
  const overdueActions = openActions.filter((a) => {
    const due = a.dueDate?.toMillis?.() ?? (a.dueDate?.seconds != null ? a.dueDate.seconds * 1000 : null);
    return due != null && due < now;
  });
  const highSeverityActions = openActions.filter((a) => a.riskLevel === "high");
  return {
    openCount: stats?.openActionCount ?? openActions.length,
    overdueCount: overdueActions.length,
    overdueActions: overdueActions.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate })),
    highSeverityCount: stats?.highRiskActionCount ?? highSeverityActions.length,
    highSeverityActions: highSeverityActions.map((a) => ({ id: a.id, title: a.title, riskLevel: a.riskLevel })),
  };
}

/**
 * Evidence summary: total count and per-domain counts (one read via document_stats).
 * @param {string} organisationId
 * @returns {Promise<{ totalCount: number, byDomain: Array<{ domainKey: string, label: string, count: number }> }>}
 */
export async function generateEvidenceSummary(organisationId) {
  if (!organisationId?.trim()) {
    return {
      totalCount: 0,
      byDomain: CQC_DOCUMENT_DOMAINS.map((d) => ({ domainKey: d.value, label: d.label, count: 0 })),
    };
  }
  const counts = await fetchDocumentCountsByDomain(organisationId);
  const byDomain = CQC_DOCUMENT_DOMAINS.map((d) => {
    const field = DOMAIN_TO_STATS_FIELD[d.value];
    const count = field ? (counts[field] ?? 0) : 0;
    return { domainKey: d.value, label: d.label, count };
  });
  return {
    totalCount: counts.totalCount ?? byDomain.reduce((s, d) => s + d.count, 0),
    byDomain,
  };
}

/**
 * Generate full CQC Readiness Report. Runs all data fetches in parallel for performance.
 * Uses compliance_stats where possible. Logs REPORT_GENERATED on success.
 *
 * @param {string} organisationId
 * @param {{ organisationId: string, userId: string, userRole: string } | undefined} auditContext
 * @param {{ serviceId?: string | null }} [options] When serviceId is set, report is service-specific.
 * @returns {Promise<{
 *   generatedAt: string,
 *   organisation: { id: string, name: string, providerId?: string },
 *   readinessScore: number,
 *   riskLevel: string,
 *   domainSummary: Array<{ domainKey: string, name: string, compliancePercent: number, readinessLevel: string }>,
 *   actionSummary: { openCount: number, overdueCount: number, overdueActions: Array<{ id: string, title: string, dueDate: unknown }>, highSeverityCount: number, highSeverityActions: Array<{ id: string, title: string, riskLevel: string }> },
 *   evidenceSummary: { totalCount: number, byDomain: Array<{ domainKey: string, label: string, count: number }> },
 *   latestInspection: { id: string, overallScore: number | null, riskLevel: string | null, completedAt: unknown } | null
 * }>}
 */
export async function generateReadinessReport(organisationId, auditContext, options = {}) {
  if (!organisationId?.trim()) throw new Error("organisationId required");
  const { serviceId } = options;

  const [organisation, service, stats, domains, actions, evidenceCounts, sessions] = await Promise.all([
    getOrganisation(organisationId),
    serviceId ? getService(serviceId) : Promise.resolve(null),
    fetchComplianceStats(organisationId, serviceId),
    fetchComplianceDomains(organisationId, serviceId),
    fetchComplianceActions(organisationId, { limitCount: 100, serviceId }),
    fetchDocumentCountsByDomain(organisationId, serviceId),
    getSessionsForOrganisation(organisationId, { limitCount: 1, serviceId }),
  ]);

  const now = Date.now();
  const openActions = actions.filter((a) => a.status !== "complete");
  const overdueActions = openActions.filter((a) => {
    const due = a.dueDate?.toMillis?.() ?? (a.dueDate?.seconds != null ? a.dueDate.seconds * 1000 : null);
    return due != null && due < now;
  });
  const highSeverityActions = openActions.filter((a) => a.riskLevel === "high");
  const openCount = stats?.openActionCount ?? openActions.length;
  const highSeverityCount = stats?.highRiskActionCount ?? highSeverityActions.length;

  const missingEvidence = [];
  for (const d of CQC_DOCUMENT_DOMAINS) {
    const field = DOMAIN_TO_STATS_FIELD[d.value];
    const count = field ? (evidenceCounts[field] ?? 0) : 0;
    if (!count || count === 0) missingEvidence.push({ domainKey: d.value, label: d.label });
  }

  const baseScore =
    domains.length > 0
      ? domains.reduce((sum, d) => sum + (d.compliancePercent ?? 0), 0) / domains.length
      : 100;
  const totalDeduction =
    overdueActions.length * DEDUCTION_OVERDUE +
    highSeverityCount * DEDUCTION_HIGH_SEVERITY +
    missingEvidence.length * DEDUCTION_MISSING_EVIDENCE;
  const readinessScore = Math.max(0, Math.min(100, Math.round((baseScore - totalDeduction) * 10) / 10));
  const riskLevel = getRiskLevel(readinessScore);

  const domainSummary = domains.map((d) => ({
    domainKey: d.domainKey ?? d.id,
    name: d.name ?? d.domainKey ?? "",
    compliancePercent: typeof d.compliancePercent === "number" ? d.compliancePercent : 0,
    readinessLevel: d.readinessLevel ?? "Not started",
  }));

  const actionSummary = {
    openCount,
    overdueCount: overdueActions.length,
    overdueActions: overdueActions.map((a) => ({ id: a.id, title: a.title, dueDate: a.dueDate })),
    highSeverityCount,
    highSeverityActions: highSeverityActions.map((a) => ({ id: a.id, title: a.title, riskLevel: a.riskLevel })),
  };

  const evidenceSummary = {
    totalCount: evidenceCounts.totalCount ?? Object.keys(DOMAIN_TO_STATS_FIELD).reduce((s, k) => s + (evidenceCounts[DOMAIN_TO_STATS_FIELD[k]] ?? 0), 0),
    byDomain: CQC_DOCUMENT_DOMAINS.map((d) => {
      const field = DOMAIN_TO_STATS_FIELD[d.value];
      return { domainKey: d.value, label: d.label, count: field ? (evidenceCounts[field] ?? 0) : 0 };
    }),
  };

  const latestSession = sessions[0];
  const latestInspection =
    latestSession && latestSession.completedAt != null
      ? {
          id: latestSession.id,
          overallScore: latestSession.overallScore ?? null,
          riskLevel: latestSession.riskLevel ?? null,
          completedAt: latestSession.completedAt,
        }
      : null;

  const report = {
    generatedAt: new Date().toISOString(),
    organisation: {
      id: organisationId,
      name: organisation?.name ?? "",
      providerId: organisation?.providerId ?? null,
      serviceId: serviceId ?? null,
      serviceName: service?.serviceName ?? null,
    },
    readinessScore,
    riskLevel,
    domainSummary,
    actionSummary,
    evidenceSummary,
    latestInspection,
  };

  if (auditContext?.userId) {
    logAuditEventNonBlocking({
      organisationId,
      userId: auditContext.userId,
      userRole: auditContext.userRole ?? "",
      serviceId: serviceId ?? undefined,
      action: "REPORT_GENERATED",
      entityType: "REPORT",
      entityId: `readiness-${organisationId}-${Date.now()}`,
      entityName: "CQC Readiness Report",
      previousValue: null,
      newValue: { reportType: "readiness", readinessScore, riskLevel },
    });
  }

  return report;
}
