import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { createOrganisation } from "../services/organisation";
import { createSubscription, BILLING_CYCLES } from "../services/billingService";
import { createService } from "../services/servicesService";

const DEFAULT_ORG_NAME = "New Organisation";
const DEFAULT_PLAN = "ENTERPRISE";
const DEFAULT_ORG_TYPE = "MENTAL_HEALTH";
const ORG_TYPES = ["MENTAL_HEALTH", "CARE_HOME", "NURSING_HOME"];

export default function Signup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organisationType, setOrganisationType] = useState(DEFAULT_ORG_TYPE);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const emailTrimmed = email.trim();
      const userCred = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
      const uid = userCred.user.uid;

      // Matches your onboarding requirement for deterministic org IDs (pre-Stripe).
      const organisationId = "org-" + Date.now();

      await createOrganisation(organisationId, {
        name: DEFAULT_ORG_NAME,
        status: "active",
        plan: DEFAULT_PLAN,
        type: organisationType,
      });

      // OrganisationContext reads users/{uid} -> organisationId/orgId.
      await setDoc(doc(db, "users", uid), {
        orgId: organisationId,
        organisationId,
        email: emailTrimmed,
        role: "Admin",
        mdtRole: "Clinical Lead",
        hospitalId: null,
        wardId: null,
        status: "active",
        createdAt: new Date().toISOString(),
      });

      const auditContext = { organisationId, userId: uid, userRole: "Admin" };

      await createSubscription(organisationId, DEFAULT_PLAN, BILLING_CYCLES.MONTHLY, auditContext);

      // Ensure tenant is usable immediately after signup.
      await createService(
        organisationId,
        {
          serviceName: `${DEFAULT_ORG_NAME} - Main`,
          serviceType: "Head Office",
          location: "",
        },
        auditContext
      );

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem" }}>Checking session...</div>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 420 }}>
      <h2>Create Account</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Start your SanctumCare workspace. Your organisation is created automatically.
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

      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: "1rem" }}>
          <label>Organisation type</label>
          <br />
          <select
            value={organisationType}
            onChange={(e) => setOrganisationType(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "var(--surface)",
              color: "var(--text-primary)",
            }}
          >
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
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
            placeholder="Password"
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
            fontWeight: 800,
          }}
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "#005eb8", fontWeight: 800 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
