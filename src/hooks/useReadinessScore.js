import { useState, useEffect, useRef } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  calculateReadinessScore,
  calculateDomainRisk,
} from "../services/readinessService";
import { logAuditEventNonBlocking } from "../services/auditService";

/**
 * CQC readiness score and risk for the current organisation and service (when multi-service is used).
 * Returns: overallScore, riskLevel, domainScores, overdueActions, missingEvidence.
 */
export function useReadinessScore() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();
  const { role } = useRole();
  const [overallScore, setOverallScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("High");
  const [domainScores, setDomainScores] = useState([]);
  const [overdueActions, setOverdueActions] = useState([]);
  const [missingEvidence, setMissingEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const previousScoreRef = useRef(null);

  useEffect(() => {
    if (!organisationId) {
      setOverallScore(0);
      setRiskLevel("High");
      setDomainScores([]);
      setOverdueActions([]);
      setMissingEvidence([]);
      setLoading(false);
      setError(null);
      previousScoreRef.current = null;
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      calculateReadinessScore(organisationId, currentServiceId),
      calculateDomainRisk(organisationId, currentServiceId),
    ])
      .then(([readinessRaw, domainsRaw]) => {
        const readiness = readinessRaw && typeof readinessRaw === "object" ? readinessRaw : {};
        const domains = Array.isArray(domainsRaw) ? domainsRaw : [];
        setOverallScore(readiness.overallReadinessScore ?? 0);
        setRiskLevel(readiness.riskLevel ?? "High");
        setOverdueActions(Array.isArray(readiness.overdueActions) ? readiness.overdueActions : []);
        setMissingEvidence(Array.isArray(readiness.missingEvidence) ? readiness.missingEvidence : []);
        setDomainScores(domains);

        const newScore = readiness.overallReadinessScore ?? 0;
        if (
          previousScoreRef.current !== null &&
          previousScoreRef.current !== newScore &&
          user?.uid
        ) {
          logAuditEventNonBlocking({
            organisationId,
            userId: user.uid,
            userRole: role ?? "",
            serviceId: currentServiceId ?? undefined,
            action: "READINESS_RECALCULATED",
            entityType: "ORGANISATION",
            entityId: organisationId,
            entityName: organisationId,
            previousValue: previousScoreRef.current,
            newValue: {
              overallReadinessScore: newScore,
              riskLevel: readiness.riskLevel,
              ...readiness.deductions,
            },
          });
        }
        previousScoreRef.current = newScore;
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to calculate readiness.");
        setOverallScore(0);
        setRiskLevel("High");
        setDomainScores([]);
        setOverdueActions([]);
        setMissingEvidence([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId, user?.uid, role]);

  return {
    overallScore: typeof overallScore === "number" ? overallScore : 0,
    riskLevel: riskLevel ?? "High",
    domainScores: Array.isArray(domainScores) ? domainScores : [],
    overdueActions: Array.isArray(overdueActions) ? overdueActions : [],
    missingEvidence: Array.isArray(missingEvidence) ? missingEvidence : [],
    loading,
    error: error ?? null,
  };
}
