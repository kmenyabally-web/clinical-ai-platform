import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const OrganisationContext = createContext(null);

export const useOrganisation = () => useContext(OrganisationContext);

function normalizeOrganisationType(source) {
  const raw = String(source || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!raw) return "CARE_HOME";
  if (raw === "ORGANIZATION" || raw === "ORGANISATION") return "CARE_HOME";
  return raw;
}

export const OrganisationProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [organisationId, setOrganisationIdState] = useState(null);
  const [organisation, setOrganisation] = useState(null);
  const [hospitalId, setHospitalId] = useState(null);
  const [wardId, setWardId] = useState(null);
  const [loading, setLoading] = useState(true);

  const setOrganisationId = (id) => {
    const next = id || null;
    setOrganisationIdState(next);
    if (next) {
      localStorage.setItem("organisationId", next);
    } else {
      localStorage.removeItem("organisationId");
    }
  };

  useEffect(() => {
    const storedOrg = localStorage.getItem("organisationId");
    if (storedOrg) {
      setOrganisationIdState(storedOrg);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          console.warn("User doc missing");
          setLoading(false);
          return;
        }

        const data = userSnap.data() ?? {};
        const storedOrg = localStorage.getItem("organisationId");
        const orgId = data.organisationId || data.orgId || data.organizationId || storedOrg || null;
        const role = String(data.role || data.systemRole || "STAFF").toUpperCase();
        const hospId = data.hospitalId || null;
        const wId = data.wardId || null;

        let org = null;
        if (orgId) {
          const orgSnap = await getDoc(doc(db, "organisations", orgId));
          if (orgSnap.exists()) {
            const rawOrg = { id: orgSnap.id, ...orgSnap.data() };
            if (!rawOrg?.organisationId || !rawOrg?.name) {
              console.warn("⚠️ Invalid organisation skipped:", rawOrg);
              org = null;
            } else {
              org = rawOrg;
            }
          }
        }

        if (!orgId && role !== "SUPER_ADMIN") {
          console.warn("No organisation for user");
        }

        const normalizedProfile = {
          ...data,
          organisationId: orgId,
          hospitalId: hospId,
          wardId: wId,
          organisationType: normalizeOrganisationType(data.organisationType || org?.organisationType || org?.type),
        };

        setProfile(normalizedProfile);
        setOrganisationIdState(orgId || null);
        setOrganisation(org || null);
        setHospitalId(hospId);
        setWardId(wId);

        console.log("ORG RESOLUTION:", {
          profileOrg: normalizedProfile?.organisationId ?? null,
          finalOrg: orgId || null,
        });
        console.log("🔥 FINAL ORG STATE:", {
          profileOrg: normalizedProfile?.organisationId ?? null,
          resolvedOrg: orgId || null,
        });
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const hasFeature = useMemo(
    () => (feature) => {
      const plan = String(organisation?.plan || organisation?.planName || "").toUpperCase();
      if (!plan) return true;
      if (feature === "audit" || feature === "reports") return plan === "ENTERPRISE";
      return true;
    },
    [organisation]
  );

  return (
    <OrganisationContext.Provider
      value={{
        profile,
        organisationId: organisationId || null,
        setOrganisationId,
        organisation,
        hospitalId,
        wardId,
        loading,
        hasFeature,
        organisationType: normalizeOrganisationType(profile?.organisationType || organisation?.organisationType || organisation?.type),
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};