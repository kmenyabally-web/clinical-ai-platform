import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { Link, Outlet, useLocation } from "react-router-dom";
import CreateOrganisation from "../pages/setup/CreateOrganisation";
import SystemStatus from "./SystemStatus";

export default function Layout() {
  const { user } = useAuth();
  const { organisationId, hospitalId, isPlatformAdmin, loading, needsSetup } = useOrganisation();
  const location = useLocation();

  const showHospitalWarning = !loading && !!organisationId && !hospitalId && !isPlatformAdmin;

  if (!loading && user && needsSetup) {
    return <CreateOrganisation />;
  }

  return (
    <div style={layoutStyles.app}>
      <Sidebar />
      <div style={layoutStyles.main}>
        <Header />
        <div style={layoutStyles.content}>
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
          </div>
          {showHospitalWarning ? (
            <div
              role="status"
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #fcd34d",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "0.875rem",
              }}
            >
              <strong>No hospital assigned.</strong> Some features need a hospital — contact admin if
              required.
            </div>
          ) : null}
          <Outlet />
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
    backgroundColor: "#f5f7fa",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    padding: "32px",
    overflowY: "auto",
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
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  },
  linkActive: {
    backgroundColor: "#e2e8f0",
  },
};