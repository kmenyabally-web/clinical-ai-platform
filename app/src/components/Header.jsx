import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { useAppContext } from "../context/AppContext";
import NotificationBell from "./NotificationBell";
import ServiceSwitcher from "./ServiceSwitcher";
import HospitalWardSelector from "./HospitalWardSelector";

export default function Header() {
  const { user, logout } = useAuth();
  const { organisation, organisationId } = useOrganisation();
  const { mdtRole } = useRole();
  const { demoMode, setDemoMode } = useAppContext();

  return (
    <div style={styles.header}>
      <div style={styles.orgRow}>
        {demoMode ? (
          <div style={styles.demoBanner}>
            <span>🟣 DEMO MODE ACTIVE — Using sample patient data (Daniel K)</span>
            <button type="button" className="btn btn-secondary" style={styles.exitDemoButton} onClick={() => setDemoMode(false)}>
              Exit Demo Mode
            </button>
          </div>
        ) : null}
        <span style={styles.orgText}>
          {`Organisation: ${organisation?.name?.trim() || "Unknown"}`}
        </span>
        <HospitalWardSelector locked={demoMode} />
        <ServiceSwitcher />
      </div>

      <div style={styles.user}>
        {organisationId && <NotificationBell />}
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {mdtRole ? (
            <span
              title="MDT / clinical role"
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "var(--text-primary)",
                backgroundColor: "#e0f2fe",
                border: "1px solid #7dd3fc",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              [{mdtRole}]
            </span>
          ) : null}
          {user?.email}
        </span>
        <button className="btn btn-primary" style={styles.button} onClick={logout}>
          Log out
        </button>
      </div>
    </div>
  );
}

const styles = {
  header: {
    minHeight: "64px",
    backgroundColor: "var(--surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 24px",
    position: "relative",
    zIndex: 55,
  },
  orgText: {
    fontWeight: 700,
    color: "var(--text-primary)",
    fontSize: 13,
  },
  orgRow: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    flexWrap: "wrap",
  },
  demoBanner: {
    flexBasis: "100%",
    background: "#eff6ff",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: 12,
    padding: "8px 12px",
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1.3,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  exitDemoButton: {
    padding: "6px 10px",
  },
  user: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  button: {
    padding: "8px 12px",
  },
};