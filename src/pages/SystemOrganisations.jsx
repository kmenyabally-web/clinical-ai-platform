import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";

export default function SystemOrganisations() {
  const { isSuperAdmin } = useRole();
  const { setOrganisationId } = useOrganisation();
  const navigate = useNavigate();
  const [organisations, setOrganisations] = useState([]);

  const handleEnterOrganisation = (orgId) => {
    console.log("🔁 SWITCHING TO ORG:", orgId);
    setOrganisationId(orgId);
    localStorage.setItem("organisationId", orgId);
    navigate("/organisation-dashboard");
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    const load = async () => {
      const snap = await getDocs(query(collection(db, "organisations")));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((org) => org.name && org.organisationId);
      console.log("✅ VALID ORGS:", list);
      setOrganisations(list);
    };
    load().catch((err) => console.error("Failed to load organisations", err));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <h2>Manage Organisations</h2>
      <Link to="/system-admin/create-organisation">+ Create Organisation</Link>
      <ul>
        {organisations.map((org) => (
          <li key={org.id}>
            {org.name || "Unnamed Organisation"}{" "}
            <button
              onClick={() => handleEnterOrganisation(org.id)}
            >
              Enter
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
