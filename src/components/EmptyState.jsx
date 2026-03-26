import { Link } from "react-router-dom";

/**
 * Onboarding empty state when organisation or services are not set up yet.
 * Shown on Dashboard when Firestore data is missing for a new organisation.
 */
export default function EmptyState() {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        maxWidth: 560,
        margin: "2rem auto",
        textAlign: "center",
        background: "#f8fafc",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginTop: 0, marginBottom: "1rem", color: "#1e293b" }}>
        Welcome to SanctumCare
      </h1>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
        No services configured yet.
        <br />
        Create your first service to begin your compliance readiness assessment.
      </p>
      <Link
        to="/services"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "12px 24px",
          background: "#1976d2",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "1rem",
        }}
      >
        Create First Service
      </Link>
    </div>
  );
}
