import { useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useOrganisation } from "../../context/OrganisationContext";
import { createOrganisation } from "../../services/organisation";
import { createSubscription, BILLING_CYCLES } from "../../services/billingService";

/**
 * First-time tenant setup: creates organisations/{orgId}, links users/{uid}, and an active subscription.
 * Shown from Layout when needsSetup is true, or via /create-organisation.
 */
export default function CreateOrganisation() {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { organisationId, isPlatformAdmin } = useOrganisation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isPlatformAdmin) {
    return <Navigate to="/management/organisations" replace />;
  }

  const handleCreate = async () => {
    const auth = getAuth();
    const authUser = auth.currentUser;
    if (!authUser) {
      alert("Not authenticated");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      alert("Enter an organisation name");
      return;
    }
    setSaving(true);
    try {
      const orgId = organisationId || `org_${Date.now()}`;
      await createOrganisation(orgId, { name: trimmed, status: "active", plan: "BASIC" });
      await setDoc(
        doc(db, "organisations", orgId),
        { createdBy: authUser.uid },
        { merge: true }
      );
      await setDoc(
        doc(db, "users", authUser.uid),
        { organisationId: orgId, orgId },
        { merge: true }
      );
      await createSubscription(orgId, "BASIC", BILLING_CYCLES.MONTHLY, {
        organisationId: orgId,
        userId: authUser.uid,
        userRole: "Admin",
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to create organisation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginTop: 0, color: "#0f172a" }}>Create Organisation</h2>
      <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
        Your account needs a tenant before you can use the platform. Enter a name and create your organisation.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 16, color: "#0f172a" }}>
        Organisation name
        <input
          placeholder="Organisation Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: 16,
          }}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={handleCreate}
        style={{
          padding: "10px 16px",
          background: saving ? "#94a3b8" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: saving ? "not-allowed" : "pointer",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {saving ? "Creating…" : "Create Organisation"}
      </button>
    </div>
  );
}
