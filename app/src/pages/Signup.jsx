import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerWithOrganisation } from "../services/signupService";

export default function Signup() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { uid, organisationId } = await registerWithOrganisation(email, password, organisationName);
      productionLogger.auth.signUpSuccess(uid, organisationId);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      setError(
        err.code ? `${err.code} — ${err.message}` : err.message || "Signup failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem" }}>Checking session...</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 420 }}>
      <h1>Create account</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Create your organisation and start with a Starter plan (1 service). You can upgrade from Billing later.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "10px",
            background: "#ffe6e6",
            color: "#a10000",
            border: "1px solid #ffb3b3",
            borderRadius: "4px",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Organisation name</label>
          <br />
          <input
            type="text"
            value={organisationName}
            onChange={(e) => setOrganisationName(e.target.value)}
            required
            placeholder="e.g. Acme Care Ltd"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "8px 16px",
            background: "#005eb8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "#005eb8" }}>Sign in</Link>
      </p>
    </div>
  );
}
