import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { APP_CONFIG } from "../config/appConfig";

export default function FeatureGate({ feature, children }) {
  const { organisation, loading } = useOrganisation();

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  const enabled = feature ? organisation?.features?.[feature] === true : true;
  if (enabled) return children;

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>{APP_CONFIG?.name || "SanctumCare"}</h2>
      <div
        style={{
          marginTop: 12,
          padding: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        This feature is not enabled for your organisation.
        <div style={{ marginTop: 10 }}>
          <Link to="/dashboard" style={{ color: "var(--primary)", fontWeight: 800 }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

