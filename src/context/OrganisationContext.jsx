import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const OrganisationContext = createContext();

export const useOrganisation = () => useContext(OrganisationContext);

export const OrganisationProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [organisationId, setOrganisationId] = useState(null);
  const [hospitalId, setHospitalId] = useState(null);
  const [wardId, setWardId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          console.error("User doc missing");
          setLoading(false);
          return;
        }

        const data = snap.data();

        console.log("✅ RAW USER DATA:", data);

        // 🔥 HARD FIX — FORCE NORMALISATION
        const orgId = data.organisationId || data.orgId || data.organizationId || null;
        const hospId = data.hospitalId || null;
        const wId = data.wardId || null;

        setProfile({
          ...data,
          organisationId: orgId,
          hospitalId: hospId,
          wardId: wId,
        });

        setOrganisationId(orgId);
        setHospitalId(hospId);
        setWardId(wId);

        console.log("✅ NORMALISED:", { orgId, hospId, wId });

      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <OrganisationContext.Provider
      value={{
        profile,
        organisationId,
        hospitalId,
        wardId,
        loading,
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};