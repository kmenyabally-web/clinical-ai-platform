import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useOrganisation } from "./OrganisationContext";
import { useRole } from "./RoleContext";

export type AppTenantContextValue = {
  organisationId: string | null;
  hospitalId: string | null;
  wardId: string | null;
  userId: string | null;
  role: string;
  authLoading: boolean;
  orgLoading: boolean;
  scopeRevision: number;
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
    hospitalId,
    wardId,
    loading: orgLoading,
    scopeRevision,
  } = useOrganisation();
  const { role } = useRole();

  const value = useMemo(
    () => ({
      organisationId: organisationId ?? null,
      hospitalId: hospitalId != null && String(hospitalId).trim() ? String(hospitalId).trim() : null,
      wardId: wardId != null && String(wardId).trim() ? String(wardId).trim() : null,
      userId: user?.uid ?? null,
      role: role ?? "STAFF",
      authLoading,
      orgLoading,
      scopeRevision,
    }),
    [organisationId, hospitalId, wardId, user?.uid, role, authLoading, orgLoading, scopeRevision]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
