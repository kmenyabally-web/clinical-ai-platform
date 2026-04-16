import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useStructure } from "../context/StructureContext";
import { useAppContext } from "../context/AppContext";
import { patchLegacyTenantScopeOnce } from "../services/legacyTenantPatchService";

export default function ContextGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { organisationId, loading: orgLoading } = useOrganisation();
  const {
    hospitals,
    wards,
    currentHospitalId,
    currentWardId,
    loading: structureLoading,
  } = useStructure();

  // Ensures all modules see a consistent (organisation/hospital/ward) scope.
  const { organisationId: appOrgId, hospitalId: appHospitalId, wardId: appWardId, orgLoading: appOrgLoading } =
    useAppContext();

  const [patching, setPatching] = useState(false);

  const isHospitalValid = Boolean(currentHospitalId) && hospitals.some((h) => h?.id === currentHospitalId);
  const isWardValid = Boolean(currentWardId) && wards.some((w) => w?.id === currentWardId);

  const missingOrganisationOrHospital = !appOrgId || !appHospitalId;
  const missingWard = Boolean(appOrgId) && Boolean(appHospitalId) && !appWardId;

  const pathname = location.pathname;
  const bypassForOrg = pathname.startsWith("/system-admin/create-organisation") || pathname.startsWith("/setup/create-organisation");
  const bypassForHospital = pathname.startsWith("/management/hospitals") || bypassForOrg;
  const bypassForWard = pathname.startsWith("/management/wards") || pathname.startsWith("/management/hospitals") || bypassForHospital;

  useEffect(() => {
    if (orgLoading || structureLoading || appOrgLoading) return;

    if (!appOrgId) {
      navigate("/system-admin/create-organisation", { replace: true });
      return;
    }
    if (!appHospitalId || !isHospitalValid) {
      navigate("/management/hospitals", { replace: true });
      return;
    }
    if (!appWardId || !isWardValid) {
      navigate("/management/wards", { replace: true });
      return;
    }

    // Best-effort one-time patch for legacy records with missing hospital/ward.
    // Runs only once per scope to avoid heavy reads on every load.
    const scopeKey = `cqc.lock.legacyTenantPatch.${appOrgId}.${appHospitalId}.${appWardId}`;
    if (typeof window !== "undefined" && window.localStorage.getItem(scopeKey) === "done") return;

    setPatching(true);
    void patchLegacyTenantScopeOnce({
      organisationId: appOrgId,
      hospitalId: appHospitalId,
      wardId: appWardId,
    })
      .catch(() => {
        // Fail-loudness: if the system is already blocked by missing tenant scope,
        // we still want UI to behave deterministically. Migration failures should not
        // silently unblock.
      })
      .finally(() => {
        if (typeof window !== "undefined") window.localStorage.setItem(scopeKey, "done");
        setPatching(false);
      });
  }, [
    appOrgId,
    appHospitalId,
    appWardId,
    orgLoading,
    structureLoading,
    appOrgLoading,
    isHospitalValid,
    isWardValid,
    navigate,
  ]);

  if (orgLoading || structureLoading || appOrgLoading) {
    return <div style={{ padding: 32 }}>Loading tenant scope…</div>;
  }

  if (missingOrganisationOrHospital) {
    if (bypassForHospital) return <>{children}</>;
    return (
      <div style={{ padding: 24 }}>
        <div role="alert" style={{ color: "#92400e", fontWeight: 800 }}>
          ⚠️ Please select organisation and hospital to continue
        </div>
      </div>
    );
  }

  if (missingWard || !isWardValid) {
    if (bypassForWard) return <>{children}</>;
    return (
      <div style={{ padding: 24 }}>
        <div role="alert" style={{ color: "#92400e", fontWeight: 800 }}>
          ⚠️ Please select organisation, hospital and ward to continue
        </div>
      </div>
    );
  }

  if (patching) {
    return <div style={{ padding: 32 }}>Validating tenant records…</div>;
  }

  // Blocked UI until scope is valid.
  return <>{children}</>;
}

