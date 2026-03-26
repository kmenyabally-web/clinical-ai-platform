import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import SystemStatus from "./SystemStatus";
import { APP_CONFIG } from "../config/appConfig";

export default function Layout() {
  const { user } = useAuth();
  const { organisationId, hospitalId, isPlatformAdmin, loading, userProfile } = useOrganisation();
  const location = useLocation();
  const navigate = useNavigate();
  const missingOrganisation = !loading && user && !organisationId;

  const showHospitalWarning = !loading && !!organisationId && !hospitalId && !isPlatformAdmin;

  const appName = APP_CONFIG?.name || "SanctumCare";
  const appTagline = APP_CONFIG?.tagline || "Clinical Intelligence & Compliance Platform";
  console.log("🔥 BRAND CHECK:", appName);

  console.log("🧠 ORG STATE:", {
    organisationId,
    userProfile,
  });

  return (
    <div style={layoutStyles.app}>
      <Sidebar />
      <div style={layoutStyles.main}>
        <Header />
        <div style={layoutStyles.content}>
          <div style={layoutStyles.productHeader}>
            <h1
              style={{
                fontWeight: 700,
                fontSize: "22px",
                letterSpacing: "-0.02em",
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {appName}
            </h1>
            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: "12px",
                color: "var(--text-muted)",
                fontWeight: 700,
                letterSpacing: "0.01em",
              }}
            >
              {appTagline}
            </p>
            {!APP_CONFIG?.name ? <h1>SanctumCare</h1> : null}
          </div>
          <div style={layoutStyles.subNav} className="top-nav">
            <NavLink to="/" label="Home" active={location.pathname === "/"} />
            <NavLink
              to="/dashboard"
              label="Dashboard"
              active={location.pathname.startsWith("/dashboard")}
            />
            <NavLink
              to="/patients"
              label="Patient List"
              active={location.pathname.startsWith("/patients")}
            />
            {organisationId ? (
              <Link
                to="/organisation/settings/features"
                style={{
                  ...layoutStyles.link,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                ⚙️ Feature Settings
              </Link>
            ) : null}
          </div>
          {missingOrganisation ? (
            <>
              {console.warn("⚠️ Missing organisation — entering recovery mode")}
              <div
                style={{
                  background: "var(--background)",
                  color: "var(--text-muted)",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  marginBottom: "10px",
                }}
              >
                ⚠️ No organisation assigned. You are in recovery mode.
              </div>
              <button
                onClick={() => navigate("/system-admin/create-organisation")}
                style={{
                  background: "var(--primary)",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: "6px",
                  marginTop: "10px",
                  marginBottom: "10px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ➕ Create Organisation
              </button>
            </>
          ) : null}
          {showHospitalWarning ? (
            <div
              role="status"
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              <strong>No hospital assigned.</strong> Some features need a hospital — contact admin if
              required.
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate("/management/hospitals")}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Create Hospital
                </button>
              </div>
            </div>
          ) : null}
          <Outlet />
          <footer style={layoutStyles.footer}>
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </footer>
        </div>
      </div>
      <SystemStatus />
    </div>
  );
}

function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        ...layoutStyles.link,
        ...(active ? layoutStyles.linkActive : null),
      }}
    >
      {label}
    </Link>
  );
}

const layoutStyles = {
  app: {
    display: "flex",
    height: "100vh",
    backgroundColor: "var(--background)",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    padding: "24px",
    overflowY: "auto",
    maxWidth: 1100,
    width: "100%",
    margin: "0 auto",
  },
  subNav: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  link: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 6,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 12,
    color: "var(--text-primary)",
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
  },
  linkActive: {
    backgroundColor: "var(--surface-muted)",
    borderColor: "var(--border)",
  },
  productHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid var(--border)",
  },
  productName: {},
  productTagline: {},
  footer: {
    marginTop: 40,
    paddingTop: 12,
    fontSize: 12,
    color: "var(--text-muted)",
  },
};