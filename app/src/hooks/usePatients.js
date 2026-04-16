import { useEffect, useMemo, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useStructure } from "../context/StructureContext";
import { getPatientsByOrganisation } from "../services/patientService";

/**
 * Central patient source for all modules.
 * Tenant scope: organisationId + active records only.
 */
export function usePatients() {
  const { organisationId, scopeRevision } = useOrganisation();
  const { currentHospitalId, currentWardId, setCurrentHospitalId, setCurrentWardId } = useStructure();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setPatients([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    async function loadPatients() {
      setLoading(true);
      setError(null);
      try {
        const rows = await getPatientsByOrganisation(organisationId, { includeArchived: false });
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        const active = list.filter((p) => p.isDeleted !== true);
        if (!currentHospitalId) {
          const firstScoped = active.find((p) => p?.hospitalId);
          if (firstScoped?.hospitalId) {
            setCurrentHospitalId(firstScoped.hospitalId);
            if (!currentWardId && firstScoped?.wardId) {
              setCurrentWardId(firstScoped.wardId);
            }
          }
        }
        // eslint-disable-next-line no-console
        console.log("PATIENTS:", active);
        setPatients(active);
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
  }, [
    organisationId,
    scopeRevision,
    currentHospitalId,
    currentWardId,
    setCurrentHospitalId,
    setCurrentWardId,
  ]);

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
