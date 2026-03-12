import { useState, useEffect } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { fetchDocumentCountsByDomain } from "../services/documentService";

/**
 * Document counts by CQC domain for the current organisation and service (when multi-service is used).
 */
export function useDocumentCounts() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const [counts, setCounts] = useState({
    totalCount: 0,
    governance: 0,
    safeguarding: 0,
    mentalCapacity: 0,
    staffing: 0,
    carePlanning: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisationId) {
      setCounts({ totalCount: 0, governance: 0, safeguarding: 0, mentalCapacity: 0, staffing: 0, carePlanning: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDocumentCountsByDomain(organisationId, currentServiceId)
      .then((c) => setCounts(c && typeof c === "object" ? c : { totalCount: 0, governance: 0, safeguarding: 0, mentalCapacity: 0, staffing: 0, carePlanning: 0 }))
      .catch(() => {
        setCounts({ totalCount: 0, governance: 0, safeguarding: 0, mentalCapacity: 0, staffing: 0, carePlanning: 0 });
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  return { counts, loading };
}
