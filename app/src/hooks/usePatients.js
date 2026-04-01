import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useOrganisation } from "../context/OrganisationContext";

/**
 * Central patient source for all modules.
 * Tenant scope: organisationId + active records only.
 */
export function usePatients() {
  const { organisationId } = useOrganisation();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setPatients([]);
      setLoading(true);
      setError(null);
      return;
    }
    let cancelled = false;
    async function loadPatients() {
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, "patients"),
          where("organisationId", "==", organisationId)
        );
        const snapshot = await getDocs(q);
        if (cancelled) return;
        const rows = snapshot.docs
          .map((d) => ({
          id: d.id,
          ...(d.data() ?? {}),
          }))
          // Align with the app's "active document" logic: treat missing `isDeleted` as active.
          .filter((p) => p.isDeleted !== true);
        setPatients(rows);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  return useMemo(
    () => ({
      data: patients,
      patients,
      loading,
      organisationReady: Boolean(organisationId),
      error,
    }),
    [patients, loading, error, organisationId]
  );
}
