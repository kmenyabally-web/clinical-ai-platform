import { Link, useNavigate } from "react-router-dom";
import { APP_CONFIG } from "../config/appConfig";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    period: "to get started",
    blurb: "Essential documentation and notes for small teams getting inspection-ready.",
    bullets: [
      "Clinical notes & core workflows",
      "Patient list & basic audit trail",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaTo: "/signup",
    variant: "default",
  },
  {
    id: "professional",
    name: "Professional",
    price: "£49",
    period: "/month per organisation",
    blurb: "Full inspection intelligence for growing providers who need AI and risk insight.",
    bullets: [
      "Everything in Starter",
      "AI-assisted notes & summaries",
      "Risk analytics & behaviour tracking",
      "Care tasks & shift-ready workflows",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    ctaTo: "/signup",
    variant: "highlight",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "tailored to your group",
    blurb: "Multi-site governance, advanced reporting, and evidence packs at scale.",
    bullets: [
      "Everything in Professional",
      "Advanced reports & audit exports",
      "Enterprise & group-level views",
      "Evidence packs & inspection tooling",
      "Dedicated success contact",
    ],
    cta: "Contact sales",
    ctaTo: "mailto:sales@sanctumcare.app?subject=SanctumCare%20Enterprise",
    variant: "enterprise",
  },
];

export default function Pricing() {
  const name = APP_CONFIG?.name || "SanctumCare";
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--text-primary)",
        fontFamily: "Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <header
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 20px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/"
          style={{
            fontWeight: 900,
            fontSize: 18,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          {name}
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link
            to="/login"
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-muted)",
              textDecoration: "none",
            }}
          >
            Login
          </Link>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Start Free Trial
          </button>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 28px" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--primary)", letterSpacing: "0.06em" }}>
          PRICING
        </p>
        <h1 style={{ margin: "10px 0 12px 0", fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 900, lineHeight: 1.15 }}>
          Simple plans. Serious outcomes.
        </h1>
        <p style={{ margin: 0, maxWidth: 640, fontSize: 16, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Choose the level that matches how you run care today. Upgrade when you need deeper intelligence, automation,
          and enterprise controls.
        </p>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 56px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {TIERS.map((tier) => {
            const isHighlight = tier.variant === "highlight";
            return (
              <div
                key={tier.id}
                style={{
                  position: "relative",
                  borderRadius: 14,
                  padding: "24px 22px",
                  border: isHighlight ? "2px solid var(--primary)" : "1px solid var(--border)",
                  background: isHighlight ? "var(--surface-muted)" : "var(--surface)",
                  boxShadow: isHighlight ? "0 12px 40px rgba(0, 94, 184, 0.12)" : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {isHighlight ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--primary)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "4px 12px",
                      borderRadius: 999,
                      letterSpacing: "0.04em",
                    }}
                  >
                    MOST POPULAR
                  </span>
                ) : null}
                <h2 style={{ margin: isHighlight ? "8px 0 0 0" : 0, fontSize: 20, fontWeight: 900 }}>{tier.name}</h2>
                <div style={{ marginTop: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>{tier.price}</span>
                  {tier.period ? (
                    <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                      {tier.period}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: "0 0 16px 0", fontSize: 14, lineHeight: 1.55, color: "var(--text-muted)" }}>
                  {tier.blurb}
                </p>
                <ul style={{ margin: "0 0 22px 0", paddingLeft: 18, flex: 1, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.65 }}>
                  {tier.bullets.map((b) => (
                    <li key={b} style={{ marginBottom: 8 }}>
                      {b}
                    </li>
                  ))}
                </ul>
                {isEnterprise ? (
                  <a
                    href={tier.ctaTo}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 900,
                      fontSize: 15,
                      textDecoration: "none",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      background: "var(--background)",
                    }}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(tier.ctaTo)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontWeight: 900,
                      fontSize: 15,
                      cursor: "pointer",
                      border: "none",
                      background: isHighlight ? "var(--primary)" : "var(--primary)",
                      color: "#fff",
                    }}
                  >
                    {tier.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section
        style={{
          background: "var(--primary)",
          color: "#fff",
          textAlign: "center",
          padding: "48px 20px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 900 }}>
          Ready to see SanctumCare in your team?
        </h2>
        <p style={{ margin: "12px auto 0", maxWidth: 520, opacity: 0.95, fontSize: 15, lineHeight: 1.5 }}>
          Start a free trial on Starter or Professional — no credit card required to explore core workflows.
        </p>
        <button
          type="button"
          onClick={() => navigate("/signup")}
          style={{
            marginTop: 22,
            background: "#fff",
            color: "var(--primary)",
            border: "none",
            borderRadius: 10,
            padding: "14px 28px",
            fontWeight: 900,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Start Free Trial
        </button>
      </section>

      <footer style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 20px", fontSize: 12 }}>
        © {new Date().getFullYear()} {name}. All rights reserved. ·{" "}
        <Link to="/" style={{ color: "var(--text-muted)" }}>
          Home
        </Link>
      </footer>
    </div>
  );
}
