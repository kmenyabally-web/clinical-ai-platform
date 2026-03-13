import Sidebar from "./Sidebar";
import Header from "./Header";
import { useOrganisation } from "../context/OrganisationContext";

export default function Layout({ children }) {
  const { organisationId, isPlatformAdmin, loading, error } = useOrganisation();

  const showOrgGuard = !loading && !organisationId && !isPlatformAdmin;

  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.main}>
        <Header />
        <div style={styles.content}>
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
            children
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
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
};