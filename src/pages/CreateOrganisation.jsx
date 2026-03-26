import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import { useOrganisation } from "../context/OrganisationContext";
import { createOrganisation } from "../services/organisation";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export default function CreateOrganisation() {
  const { isSuperAdmin } = useRole();
  const { setOrganisationId } = useOrganisation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateOrganisation = async () => {
    if (creating) return;
    if (!name || !orgId) {
      alert("Name and Organisation ID required");
      return;
    }

    try {
      setCreating(true);
      const newOrgId = await createOrganisation({
        name,
        organisationId: orgId,
        plan: "BASIC",
      });

      console.log("✅ ORG CREATED:", newOrgId);
      setOrganisationId(newOrgId);
      localStorage.setItem("organisationId", newOrgId);
      if (auth.currentUser?.uid) {
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { organisationId: newOrgId, orgId: newOrgId },
          { merge: true }
        );
      }
      navigate("/organisation-dashboard");
    } catch (err) {
      console.error("❌ CREATE ORG ERROR:", err);
      alert("Failed to create organisation");
    } finally {
      setCreating(false);
    }
  };

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <h2>Create Organisation</h2>

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label>Organisation ID</label>
      <input value={orgId} onChange={(e) => setOrgId(e.target.value)} />

      <label>Admin Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />

      <label>Temporary Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

      <button onClick={handleCreateOrganisation} disabled={creating}>
        {creating ? "Creating..." : "Create Organisation"}
      </button>
    </div>
  );
}
