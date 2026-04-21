import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import ContextGuard from "./ContextGuard";
import { Link, Outlet, useLocation } from "react-router-dom";
import SystemStatus from "./SystemStatus";
import { APP_CONFIG } from "../config/appConfig";
import DemoGuide from "./DemoGuide";
import { useAppContext } from "../context/AppContext";

export default function Layout() {
  const { organisationId, groupId } = useOrganisation();
  const { isSuperAdmin, isGroupAdmin } = useRole();
  const { demoMode } = useAppContext();
  const showEnterpriseLink =
    organisationId && (isSuperAdmin || (isGroupAdmin && groupId));
  const location = useLocation();

  const appName = APP_CONFIG?.name || "SanctumCare";
  const appTagline = APP_CONFIG?.tagline || "Clinical Intelligence & Compliance Platform";

  return (
    <div style={layoutStyles.app}>
      <Sidebar />
      <div style={layoutStyles.main}>
        <Header />
        <div style={layoutStyles.content}>
          <div style={layoutStyles.productHeader}>
            <h1 className="page-title" style={{ marginBottom: "0.35rem" }}>
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
            {showEnterpriseLink ? (
              <Link
                to="/enterprise"
                style={{
                  ...layoutStyles.link,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                🏢 Enterprise View
              </Link>
            ) : null}
          </div>
          <ContextGuard>
            <Outlet />
          </ContextGuard>
          {demoMode && <DemoGuide />}
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
    padding: "24px clamp(16px, 3vw, 32px)",
    overflowY: "auto",
    maxWidth: "none",
    width: "100%",
    margin: 0,
    boxSizing: "border-box",
  },
  subNav: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  link: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
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