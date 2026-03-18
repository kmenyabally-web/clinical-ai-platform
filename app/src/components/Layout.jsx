import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganisation } from "../context/OrganisationContext";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const { organisationId, isPlatformAdmin, loading, error } = useOrganisation();
  const location = useLocation();

  const showOrgGuard = !loading && !organisationId && !isPlatformAdmin;

  return (
    <div style={layoutStyles.app}>
      <Sidebar />
      <div style={layoutStyles.main}>
        <Header />
        <div style={layoutStyles.content}>
          <div style={layoutStyles.subNav}>
            <NavLink to="/" label="Governance" active={location.pathname === "/"} />
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
          {showOrgGuard ? (
            <div
              role="alert"
              style={{
                maxWidth: 640,
                margin: "2rem auto",
                padding: "1.5rem 1.75rem",
                borderRadius: 12,
                border: "1px solid #fee2e2",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              <h1 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                No organisation selected.
              </h1>
              {error && (
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  {error}
                </p>
              )}
              {!error && (
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  Your account is not currently linked to an organisation. Please contact an
                  administrator to be assigned to an organisation.
                </p>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
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