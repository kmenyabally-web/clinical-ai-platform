import { Link } from "react-router-dom";

export default function Unauthorised() {
  return (
    <div style={{ padding: "2rem", maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Access denied</h1>
      <p style={{ color: "#475569" }}>You do not have permission to view this page.</p>
      <p>
        <Link to="/dashboard" style={{ color: "#005eb8", fontWeight: 700 }}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
