import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import { createOrganisationUserAccount } from "../../services/userManagementService";
import { APP_CONFIG } from "../../config/appConfig";
import {
  getFeaturesForOrganisationType,
  getRolesForOrganisationType,
  getUiModeForOrganisationType,
} from "../../config/organisationTemplates";
import { createService } from "../../services/servicesService";

export default function CreateOrganisation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reload } = useOrganisation();
  const { isSuperAdmin } = useRole();
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState("");
  const [type, setType] = useState("hospital");
  const [adminEmail, setAdminEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (creating) return;
    if (!name || !orgId) {
      alert("All fields required");
      return;
    }
    if (isSuperAdmin && adminEmail && tempPassword.length > 0 && tempPassword.length < 8) {
      alert("Temporary password must be at least 8 characters");
      return;
    }

    const cleanedOrgId = orgId
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    try {
      setCreating(true);
      const features = getFeaturesForOrganisationType(type);
      const roles = getRolesForOrganisationType(type);
      const uiMode = getUiModeForOrganisationType(type);
      await setDoc(doc(db, "organisations", cleanedOrgId), {
        name: name.trim(),
        organisationId: cleanedOrgId,
        status: "active",
        plan: "BASIC",
        type,
        uiMode,
        features,
        roles,
        createdAt: serverTimestamp(),
        active: true,
      });
      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          { organisationId: cleanedOrgId, orgId: cleanedOrgId },
          { merge: true }
        );
        try {
          const auditContext = { organisationId: cleanedOrgId, userId: user.uid, userRole: "Admin" };
          await createService(
            cleanedOrgId,
            { serviceName: "General Service", serviceType: "General", location: "" },
            auditContext
          );
        } catch (svcErr) {
          console.warn("Default General Service could not be created (non-fatal):", svcErr);
        }
      }

      if (isSuperAdmin && adminEmail.trim() && tempPassword) {
        await createOrganisationUserAccount({
          email: adminEmail.trim(),
          password: tempPassword,
          displayName: `${name.trim()} Admin`,
          role: "Admin",
          mdtRole: "Clinical Lead",
          organisationId: cleanedOrgId,
          // Placeholder until hospital is created/assigned.
          hospitalId: "UNASSIGNED",
          wardId: null,
        });
      }
      await reload();
      navigate("/organisation-dashboard", { replace: true });

    } catch (error) {
      console.error("❌ ORG CREATE ERROR:", error);
      alert("Failed to create organisation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.brand}>
          <h1 style={styles.brandTitle}>{APP_CONFIG?.name || "SanctumCare"}</h1>
          <p style={styles.brandTagline}>
            {APP_CONFIG?.tagline || "Secure Clinical Intelligence & Compliance Platform"}
          </p>
        </header>

        <div style={styles.card}>
          <h2 style={styles.title}>Create Organisation</h2>
          <p style={styles.subtitle}>
            Set up a new tenant with a clean organisation ID. You can optionally provision an admin
            account with a temporary password.
          </p>

          <label style={styles.label}>Name</label>
          <input
            placeholder="Organisation Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            autoComplete="organization"
          />

          <label style={styles.label}>Organisation ID</label>
          <input
            placeholder="Organisation ID (e.g. priory-group)"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={styles.input}
            autoComplete="off"
            spellCheck={false}
          />

          <label style={styles.label}>Organisation Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={styles.select}
          >
            <option value="hospital">Hospital</option>
            <option value="mental_health_unit">Mental Health Unit</option>
            <option value="care_home">Care Home</option>
            <option value="nursing_home">Nursing Home</option>
            <option value="supported_living">Supported Living</option>
          </select>

          {isSuperAdmin ? (
            <>
              <label style={styles.label}>Admin Email</label>
              <input
                placeholder="Organisation Admin Email (optional)"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                style={styles.input}
                type="email"
                autoComplete="email"
              />
              <label style={styles.label}>Temporary Password</label>
              <input
                placeholder="Temporary Password (optional)"
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                style={styles.input}
                autoComplete="new-password"
              />
            </>
          ) : null}

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            style={{
              ...styles.button,
              ...(creating ? styles.buttonDisabled : {}),
            }}
          >
            {creating ? "Creating…" : "Create Organisation"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(24px, 5vw, 48px) 20px",
    background: "linear-gradient(165deg, #f8fafc 0%, #e2e8f0 45%, #f1f5f9 100%)",
  },
  shell: {
    width: "100%",
    maxWidth: 440,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 28,
  },
  brand: {
    textAlign: "center",
  },
  brandTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
    letterSpacing: "-0.03em",
    color: "#0f172a",
  },
  brandTagline: {
    margin: "10px 0 0 0",
    fontSize: 13,
    color: "#64748b",
    fontWeight: 500,
    lineHeight: 1.45,
    maxWidth: 360,
    marginLeft: "auto",
    marginRight: "auto",
  },
  card: {
    width: "100%",
    background: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: 16,
    padding: "28px 28px 26px",
    boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 20px 40px -12px rgba(15, 23, 42, 0.12)",
  },
  title: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: "1.25rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 22,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.55,
  },
  label: {
    display: "block",
    marginBottom: 6,
    marginTop: 12,
    fontWeight: 600,
    color: "#334155",
    fontSize: 13,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    outline: "none",
    background: "#fafafa",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    outline: "none",
    background: "#fafafa",
    cursor: "pointer",
  },
  button: {
    marginTop: 22,
    width: "100%",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "12px 18px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
};
