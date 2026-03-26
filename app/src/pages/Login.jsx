import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { productionLogger } from "../lib/productionLogger";
import { APP_CONFIG } from "../config/appConfig";

export default function Login() {
  const { user, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect if already logged in
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
      const cred = await login(email, password);
      productionLogger.auth.signInSuccess(cred.user.uid, email);
      navigate(from, { replace: true });
    } catch (err) {
      productionLogger.auth.signInFailure(err.code ?? "unknown", email);
      console.error("LOGIN ERROR:", err);
      setError(
        (err.code ? err.code : "Unknown error") +
          " — " +
          (err.message ? err.message : "Login failed")
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
      <h1>{APP_CONFIG.name}</h1>
      <p style={{ marginTop: 6, marginBottom: 18, color: "var(--text-muted)", fontWeight: 700, fontSize: 13 }}>
        Secure Clinical &amp; Compliance System
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
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

        <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        New organisation?{" "}
        <Link to="/signup" style={{ color: "#005eb8" }}>Create account</Link>
      </p>
    </div>
  );
}