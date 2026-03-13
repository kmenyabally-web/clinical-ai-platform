import { useState, useEffect } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { fetchRecentDocuments } from "../services/documentService";

/**
 * Recently uploaded documents for the current organisation (for dashboard).
 */
export function useRecentDocuments(max = 5) {
  const { organisationId } = useOrganisation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organisationId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    fetchRecentDocuments(organisationId, max)
      .then((d) => setDocuments(Array.isArray(d) ? d : []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [organisationId, max]);

  return { documents, loading };
}
