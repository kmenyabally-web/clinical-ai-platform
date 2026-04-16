import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useOrganisation } from "./OrganisationContext";
import { listHospitals, listWards, listWardsForOrganisation } from "../services/structureService";

const STORAGE_PREFIX = "cqc.structure.";

/** Profile placeholders that must not block picking a real hospital/ward in the UI. */
function isPlaceholderHospitalId(id) {
  if (id == null || typeof id !== "string") return true;
  const t = id.trim();
  if (!t) return true;
  return t.toUpperCase() === "UNASSIGNED";
}

function isPlaceholderWardId(id) {
  if (id == null || typeof id !== "string") return true;
  const t = id.trim();
  if (!t) return true;
  return t.toUpperCase() === "UNASSIGNED";
}

const StructureContext = createContext(null);

export function useStructure() {
  const ctx = useContext(StructureContext);
  if (!ctx) throw new Error("useStructure must be used within StructureProvider");
  return ctx;
}

/**
 * Hospital / ward scope for the current organisation.
 * Persists hospital + ward selection in localStorage; seeds from user profile when present.
 */
export function StructureProvider({ children }) {
  const { organisationId, userProfile } = useOrganisation();
  const DEMO_MODE = true;
  const [hospitals, setHospitals] = useState([]);
  const [wards, setWards] = useState([]);
  const [currentHospitalId, setCurrentHospitalIdState] = useState(null);
  const [currentWardId, setCurrentWardIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  const storageKeyHospital = organisationId ? `${STORAGE_PREFIX}${organisationId}.hospitalId` : null;
  const storageKeyWard = organisationId ? `${STORAGE_PREFIX}${organisationId}.wardId` : null;

  useEffect(() => {
    if (!organisationId) {
      setHospitals([]);
      setWards([]);
      setCurrentHospitalIdState(null);
      setCurrentWardIdState(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await listHospitals(organisationId);
        if (!mounted) return;
        setHospitals(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setHospitals([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId || hospitals.length === 0) return;
    const fromProfile = userProfile?.hospitalId;
    const stored = storageKeyHospital ? localStorage.getItem(storageKeyHospital) : null;
    let preferred = null;
    for (const c of [fromProfile, stored]) {
      if (c != null && !isPlaceholderHospitalId(c) && hospitals.some((h) => h.id === c)) {
        preferred = c;
        break;
      }
    }
    if (preferred) {
      setCurrentHospitalIdState(preferred);
      if (DEMO_MODE && storageKeyHospital) localStorage.setItem(storageKeyHospital, preferred);
    } else {
      const firstAvailableHospital = hospitals[0]?.id ?? null;
      setCurrentHospitalIdState(firstAvailableHospital);
      if (storageKeyHospital) {
        if (firstAvailableHospital) localStorage.setItem(storageKeyHospital, firstAvailableHospital);
        else localStorage.removeItem(storageKeyHospital);
      }
    }
  }, [organisationId, hospitals, userProfile?.hospitalId, storageKeyHospital]);

  useEffect(() => {
    if (!organisationId) {
      setWards([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const list = currentHospitalId
          ? await listWards(organisationId, currentHospitalId)
          : await listWardsForOrganisation(organisationId);
        if (mounted) setWards(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setWards([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [organisationId, currentHospitalId]);

  useEffect(() => {
    if (wards.length === 0) {
      setCurrentWardIdState(null);
      return;
    }
    const fromProfile = userProfile?.wardId;
    const stored = storageKeyWard ? localStorage.getItem(storageKeyWard) : null;
    let preferred = null;
    for (const c of [fromProfile, stored]) {
      if (c != null && !isPlaceholderWardId(c) && wards.some((w) => w.id === c)) {
        preferred = c;
        break;
      }
    }
    if (preferred) {
      setCurrentWardIdState(preferred);
      if (DEMO_MODE && storageKeyWard) localStorage.setItem(storageKeyWard, preferred);
    } else if (wards.length === 1) {
      const only = wards[0].id;
      setCurrentWardIdState(only);
      if (storageKeyWard) localStorage.setItem(storageKeyWard, only);
    } else {
      setCurrentWardIdState(null);
    }
  }, [currentHospitalId, wards, userProfile?.wardId, storageKeyWard]);

  const setCurrentHospitalId = useCallback(
    (id) => {
      if (DEMO_MODE) return;
      const next = id || null;
      setCurrentHospitalIdState(next);
      setCurrentWardIdState(null);
      if (storageKeyHospital) {
        if (next) localStorage.setItem(storageKeyHospital, next);
        else localStorage.removeItem(storageKeyHospital);
      }
      if (storageKeyWard) localStorage.removeItem(storageKeyWard);
    },
    [storageKeyHospital, storageKeyWard]
  );

  const setCurrentWardId = useCallback(
    (id) => {
      if (DEMO_MODE) return;
      const next = id || null;
      setCurrentWardIdState(next);
      if (storageKeyWard) {
        if (next) localStorage.setItem(storageKeyWard, next);
        else localStorage.removeItem(storageKeyWard);
      }
    },
    [storageKeyWard]
  );

  const currentHospital = useMemo(
    () => hospitals.find((h) => h.id === currentHospitalId) ?? null,
    [hospitals, currentHospitalId]
  );
  const currentWard = useMemo(
    () => wards.find((w) => w.id === currentWardId) ?? null,
    [wards, currentWardId]
  );

  const canCreatePatient = Boolean(currentHospitalId && currentWardId);

  const value = useMemo(
    () => ({
      hospitals,
      wards,
      currentHospitalId,
      currentWardId,
      currentHospital,
      currentWard,
      setCurrentHospitalId,
      setCurrentWardId,
      loading,
      canCreatePatient,
    }),
    [
      hospitals,
      wards,
      currentHospitalId,
      currentWardId,
      currentHospital,
      currentWard,
      setCurrentHospitalId,
      setCurrentWardId,
      loading,
      canCreatePatient,
    ]
  );

  return <StructureContext.Provider value={value}>{children}</StructureContext.Provider>;
}
