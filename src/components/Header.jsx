import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import NotificationBell from "./NotificationBell";
import ServiceSwitcher from "./ServiceSwitcher";

export default function Header() {
  const { user, logout } = useAuth();
  const { organisation, organisationId } = useOrganisation();
  const { role } = useRole();
  const isSuperAdmin = role === "SUPER_ADMIN";

  return (
    <div style={styles.headerWrap}>
      <div style={styles.heroBanner}>
        SanctumCare — Clinical Intelligence Platform
      </div>
      <div style={styles.header}>
        <div style={styles.orgRow}>
          <span>{isSuperAdmin ? "Organisation: System Level" : (organisation?.name ? `Organisation: ${organisation.name}` : "Organisation: —")}</span>
          <ServiceSwitcher />
        </div>

        <div style={styles.user}>
          {organisationId && <NotificationBell />}
          <span>{user?.email}</span>
          <button style={styles.button} onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  headerWrap: {
    borderBottom: "1px solid #e0e0e0",
    backgroundColor: "#ffffff",
  },
  heroBanner: {
    background: "linear-gradient(90deg, #0f4c81 0%, #1f6aa5 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "0.95rem",
    padding: "10px 24px",
    letterSpacing: "0.02em",
  },
  header: {
    height: "64px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
  },
  org: {
    fontWeight: 500,
  },
  orgRow: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  button: {
    padding: "6px 12px",
    backgroundColor: "#005eb8",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
};