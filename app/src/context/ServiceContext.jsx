import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useOrganisation } from "./OrganisationContext";
import { fetchServices } from "../services/servicesService";

/**
 * ServiceContext – current service scope within an organisation.
 * Provides currentServiceId, setCurrentServiceId, services (list for the org), and currentService (resolved object).
 * All org members receive the full service list for scoping; Firestore rules enforce tenant access.
 */
const ServiceContext = createContext(null);

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useService must be used within ServiceProvider");
  return ctx;
}

export function ServiceProvider({ children }) {
  const { organisationId, userProfile } = useOrganisation();
  const [services, setServices] = useState([]);
  const [currentServiceId, setCurrentServiceIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = userProfile?.role;
  const isAdmin =
    role === "Admin" ||
    role === "ADMIN" ||
    role === "admin" ||
    (userProfile?.systemRole ?? "").toString().trim().toUpperCase() === "SUPER_ADMIN" ||
    (userProfile?.systemRole ?? "").toString().trim().toUpperCase() === "GLOBAL_ADMIN";
  const isServiceManager = role === "Manager" || role === "QualityLead";

  const loadServices = useCallback(async () => {
    if (!organisationId) {
      setServices([]);
      setCurrentServiceIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Always list every service in the org for scoping (incidents, filters, dashboards).
      // Filtering by managerId hid all services for Staff/clinical users who are not assigned
      // as `managerId` on a row — Firestore rules still restrict reads to the tenant.
      const list = await fetchServices(organisationId, {});
      const safeList = Array.isArray(list) ? list : [];
      setServices(safeList);
      setCurrentServiceIdState((prev) => {
        if (safeList.length === 0) return null;
        if (safeList.length === 1) return safeList[0]?.id ?? null;
        if (prev && safeList.some((s) => s?.id === prev)) return prev;
        return safeList[0]?.id ?? null;
      });
    } catch (err) {
      setServices([]);
      setCurrentServiceIdState(null);
    } finally {
      setLoading(false);
    }
  }, [organisationId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const setCurrentServiceId = useCallback((id) => {
    setCurrentServiceIdState(id);
  }, []);

  const safeServices = Array.isArray(services) ? services : [];
  const currentService = useMemo(
    () => (currentServiceId ? (safeServices.find((s) => s?.id === currentServiceId) ?? null) : null),
    [currentServiceId, safeServices]
  );

  const value = useMemo(
    () => ({
      currentServiceId,
      setCurrentServiceId,
      services: safeServices,
      currentService,
      loading,
      isAdmin,
      isServiceManager,
      refreshServices: loadServices,
    }),
    [currentServiceId, setCurrentServiceId, safeServices, currentService, loading, isAdmin, isServiceManager, loadServices]
  );

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}
