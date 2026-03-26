import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";

export default function SystemOrganisations() {
  const { isGlobalAdmin } = useRole();
  const { user } = useAuth();
  const { reload } = useOrganisation();
  const navigate = useNavigate();
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switchingOrgId, setSwitchingOrgId] = useState("");

  const loadOrganisations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "organisations"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOrganisations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Failed to load organisations", e);
      setError("Failed to load organisations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isGlobalAdmin) return;
    loadOrganisations();
  }, [isGlobalAdmin, loadOrganisations]);

  const handleEnterOrganisation = async (org) => {
    const targetOrgId = (org?.organisationId || org?.id || "").toString().trim();
    if (!targetOrgId || !user?.uid) return;
    setSwitchingOrgId(targetOrgId);
    setError("");
    try {
      console.log("🔁 SWITCHING TO ORG:", targetOrgId);
      await setDoc(
        doc(db, "users", user.uid),
        { organisationId: targetOrgId, orgId: targetOrgId },
        { merge: true }
      );
      await reload();
      navigate("/organisation-dashboard");
    } catch (e) {
      console.error("Failed to switch organisation", e);
      setError("Failed to switch organisation.");
    } finally {
      setSwitchingOrgId("");
    }
  };

  if (!isGlobalAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>System Organisations</h1>
            <p style={styles.subtitle}>
              Manage tenants and enter organisation context for operational setup.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/system-admin/create-organisation")}
            style={styles.primaryButton}
          >
            + Create Organisation
          </button>
        </div>

        {error ? <div style={styles.errorText}>{error}</div> : null}

        {loading ? (
          <div style={styles.mutedText}>Loading organisations...</div>
        ) : organisations.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.mutedText}>No organisations found.</p>
            <button
              type="button"
              onClick={() => navigate("/system-admin/create-organisation")}
              style={styles.primaryButton}
            >
              Create first organisation
            </button>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <div style={styles.tableHeader}>
              <span>Organisation</span>
              <span>Organisation ID</span>
              <span>Action</span>
            </div>
            {organisations.map((org) => {
              const targetId = org.organisationId || org.id;
              const entering = switchingOrgId === targetId;
              return (
                <div key={org.id} style={styles.tableRow}>
                  <span style={styles.orgName}>{org.name || "Unnamed Organisation"}</span>
                  <code style={styles.code}>{targetId}</code>
                  <button
                    type="button"
                    onClick={() => handleEnterOrganisation(org)}
                    disabled={entering}
                    style={styles.secondaryButton}
                  >
                    {entering ? "Entering..." : "Enter"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 24,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#0f172a",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: 14,
  },
  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr auto",
    gap: 12,
    padding: "10px 12px",
    background: "#f8fafc",
    color: "#475569",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr auto",
    gap: 12,
    alignItems: "center",
    padding: "10px 12px",
    borderTop: "1px solid #f1f5f9",
  },
  orgName: {
    fontWeight: 600,
    color: "#0f172a",
  },
  code: {
    fontSize: 12,
    color: "#334155",
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 12,
    fontWeight: 600,
  },
  mutedText: {
    color: "#64748b",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
};
