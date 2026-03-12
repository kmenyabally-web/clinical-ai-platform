import { useState, useEffect } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import {
  fetchComplianceDomains,
  fetchComplianceStats,
  fetchUrgentComplianceActions,
} from "../services/complianceService";

/**
 * Loads compliance_domains, compliance_stats, and high-priority compliance_actions
 * for the current organisation and service (when multi-service is used).
 *
 * @returns {{ domains: Array, stats: Object | null, urgentActions: Array, loading: boolean, error: string | null }}
 */
export function useComplianceData() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const [domains, setDomains] = useState([]);
  const [stats, setStats] = useState(null);
  const [urgentActions, setUrgentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setDomains([]);
      setStats(null);
      setUrgentActions([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let cancelled = false;

    Promise.all([
      fetchComplianceDomains(organisationId, currentServiceId),
      fetchComplianceStats(organisationId, currentServiceId),
      fetchUrgentComplianceActions(organisationId, 10, currentServiceId),
    ])
      .then(([domainsList, statsDoc, actionsList]) => {
        if (cancelled) return;
        setDomains(Array.isArray(domainsList) ? domainsList : []);
        setStats(statsDoc ?? null);
        setUrgentActions(Array.isArray(actionsList) ? actionsList : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load compliance data.");
          setDomains([]);
          setStats(null);
          setUrgentActions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organisationId, currentServiceId]);

  return {
    domains: Array.isArray(domains) ? domains : [],
    stats: stats ?? null,
    urgentActions: Array.isArray(urgentActions) ? urgentActions : [],
    loading,
    error: error ?? null,
  };
}
