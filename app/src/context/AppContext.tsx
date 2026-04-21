import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useOrganisation } from "./OrganisationContext";
import { useRole } from "./RoleContext";
import { useStructure } from "./StructureContext";

export type AppTenantContextValue = {
  organisationId: string | null;
  hospitalId: string | null;
  wardId: string | null;
  patientId: string | null;
  userId: string | null;
  role: string;
  authLoading: boolean;
  orgLoading: boolean;
  scopeRevision: number;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
};

const AppContext = createContext<AppTenantContextValue | null>(null);

export function useAppContext(): AppTenantContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return ctx;
}

/**
 * Single source of truth for tenant + identity fields used across the app.
 * organisationId is resolved from the signed-in user's Firestore profile (via OrganisationContext), not guessed in leaf components.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const {
    organisationId,
    hospitalId: profileHospitalId,
    wardId: profileWardId,
    loading: orgLoading,
    scopeRevision,
  } = useOrganisation();
  const { currentHospitalId, currentWardId } = useStructure();
  const { role } = useRole();

  // Guided demo experience (fixed tenant + patient).
  const [demoMode, setDemoMode] = useState(false);
  const lockedOrganisationId = "demo-org";
  const lockedHospitalId = "hospital001";
  const lockedWardId = "ward_picu";
  const lockedPatientId = "patient001";

  const value = useMemo(
    () => ({
      organisationId: demoMode ? lockedOrganisationId : organisationId ?? null,
      hospitalId: demoMode
        ? lockedHospitalId
        : currentHospitalId != null && String(currentHospitalId).trim()
          ? String(currentHospitalId).trim()
          : profileHospitalId != null && String(profileHospitalId).trim()
            ? String(profileHospitalId).trim()
            : null,
      wardId: demoMode
        ? lockedWardId
        : currentWardId != null && String(currentWardId).trim()
          ? String(currentWardId).trim()
          : profileWardId != null && String(profileWardId).trim()
            ? String(profileWardId).trim()
            : null,
      patientId: demoMode ? lockedPatientId : null,
      userId: user?.uid ?? null,
      role: role ?? "STAFF",
      authLoading,
      orgLoading,
      scopeRevision,
      demoMode,
      setDemoMode,
    }),
    [
      demoMode,
      organisationId,
      currentHospitalId,
      currentWardId,
      profileHospitalId,
      profileWardId,
      user?.uid,
      role,
      authLoading,
      orgLoading,
      scopeRevision,
      setDemoMode,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
