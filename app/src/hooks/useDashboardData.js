import { useState, useEffect, useMemo } from "react";
import { fetchReadinessForCompliance } from "../services/dashboard";

/**
 * Dashboard data scoped by organisation. Fetches domain compliance from Firestore
 * and uses organisation doc for action counts. Stable references to avoid excessive re-renders.
 *
 * @param {string | null} organisationId
 * @param {{ openActionCount?: number, highRiskActionCount?: number } | null} organisation
 * @returns {{ loading: boolean, error: string | null, isEmpty: boolean, overallCompliancePercent: number, openActionCount: number, highRiskActionCount: number, domains: Array<{ id: string, domainKey?: string, readinessLevel: string, compliancePercent: number }> }}
 */
export function useDashboardData(organisationId, organisation) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [complianceData, setComplianceData] = useState({
    domains: [],
    overallCompliancePercent: 0,
  });

  useEffect(() => {
    if (!organisationId) {
      setComplianceData({ domains: [], overallCompliancePercent: 0 });
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    fetchReadinessForCompliance(organisationId)
      .then((result) => {
        if (!cancelled && result) {
          const domains = Array.isArray(result.domains) ? result.domains : [];
          const overallCompliancePercent = typeof result.overallCompliancePercent === "number" ? result.overallCompliancePercent : 0;
          setComplianceData({ domains, overallCompliancePercent });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load dashboard data.");
          setComplianceData({ domains: [], overallCompliancePercent: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const openActionCount = useMemo(
    () => (organisation && typeof organisation.openActionCount === "number" ? organisation.openActionCount : 0),
    [organisation?.openActionCount]
  );
  const highRiskActionCount = useMemo(
    () => (organisation && typeof organisation.highRiskActionCount === "number" ? organisation.highRiskActionCount : 0),
    [organisation?.highRiskActionCount]
  );

  const isEmpty = !loading && !error && complianceData.domains.length === 0;

  return {
    loading,
    error: error ?? null,
    isEmpty,
    overallCompliancePercent: typeof complianceData.overallCompliancePercent === "number" ? complianceData.overallCompliancePercent : 0,
    openActionCount,
    highRiskActionCount,
    domains: Array.isArray(complianceData.domains) ? complianceData.domains : [],
  };
}
