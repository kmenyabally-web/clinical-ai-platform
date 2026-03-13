import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useOrganisation } from "./OrganisationContext";
import { useAuth } from "./AuthContext";
import { fetchServices } from "../services/servicesService";

/**
 * ServiceContext – current service scope within an organisation.
 * Provides currentServiceId, setCurrentServiceId, services (list the user can access), and currentService (resolved object).
 * Service managers see only services where managerId === user.uid; Admins see all services.
 */
const ServiceContext = createContext(null);

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error("useService must be used within ServiceProvider");
  return ctx;
}

export function ServiceProvider({ children }) {
  const { organisationId, userProfile } = useOrganisation();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [currentServiceId, setCurrentServiceIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  const role = userProfile?.role;
  const isAdmin = role === "Admin" || role === "ADMIN" || role === "admin";
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
      const options = isAdmin ? {} : { managerId: user?.uid ?? "" };
      const list = await fetchServices(organisationId, options);
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
  }, [organisationId, isAdmin, user?.uid]);

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
