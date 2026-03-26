import React from "react";

import { APP_CONFIG } from "../config/appConfig";
import { useNavigate } from "react-router-dom";

function ButtonPrimary({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--primary)",
        color: "#fff",
        padding: "10px 18px",
        border: "none",
        borderRadius: 8,
        fontWeight: 800,
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function ButtonSecondary({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "var(--surface)",
        color: "var(--text-primary)",
        padding: "10px 18px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        fontWeight: 800,
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

export default function LandingPage() {
  const name = APP_CONFIG?.name || "SanctumCare";
  const tagline = APP_CONFIG?.tagline || "Secure Clinical Intelligence & Compliance Platform";
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
      {/* HERO */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px 36px 20px" }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "var(--primary)" }}>{name}</h1>
        <p style={{ margin: "10px 0 18px 0", color: "var(--text-muted)", fontWeight: 700, fontSize: 13 }}>
          {tagline}
        </p>

        <h2 style={{ margin: 0, fontSize: 38, fontWeight: 900, lineHeight: 1.1 }}>
          Pass inspections with confidence — every time.
        </h2>
        <p style={{ margin: "16px 0 22px 0", color: "var(--text-muted)", fontSize: 15, maxWidth: 620, lineHeight: 1.6 }}>
          Track care, identify risks, and generate inspection-ready evidence packs instantly.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <ButtonPrimary onClick={() => navigate("/signup")}>Start Free Trial</ButtonPrimary>
          <ButtonSecondary onClick={() => navigate("/login")}>Login</ButtonSecondary>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>The Problem</h3>
              <ul style={{ margin: "14px 0 0 18px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                <li>• Notes scattered across systems</li>
                <li>• No clear audit trail</li>
                <li>• Risk patterns missed</li>
                <li>• Evidence takes hours to compile</li>
              </ul>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>The Solution</h3>
              <ul style={{ margin: "14px 0 0 18px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                <li>✔ Real-time clinical tracking</li>
                <li>✔ AI-powered insights</li>
                <li>✔ Full audit trail</li>
                <li>✔ One-click evidence packs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px" }}>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Built for modern healthcare teams</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginTop: 24 }}>
          {[
            {
              title: "Clinical Intelligence",
              desc: "AI-enhanced notes, behaviour tracking, and patient timelines.",
            },
            {
              title: "Inspection Readiness",
              desc: "Real-time compliance scoring and risk alerts.",
            },
            {
              title: "Evidence Packs",
              desc: "One-click export of inspection-ready documentation.",
            },
            {
              title: "Secure & Multi-Tenant",
              desc: "Role-based access with full audit tracking.",
            },
          ].map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{f.title}</h4>
              <p style={{ margin: "10px 0 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px" }}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>How it works</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginTop: 22 }}>
            {[
              ["1", "Record clinical notes"],
              ["2", "Track patient progress"],
              ["3", "Detect risks automatically"],
              ["4", "Generate evidence packs"],
            ].map(([num, label]) => (
              <div key={num} style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ color: "var(--primary)", fontWeight: 900, fontSize: 18 }}>{num}</div>
                <p style={{ margin: "10px 0 0 0", color: "var(--text-muted)", fontSize: 13 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 20px" }}>
        <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Pricing</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 22 }}>
          {[
            { title: "Starter", price: "£49/month", accent: "light" },
            { title: "Professional", price: "£149/month", accent: "light" },
            { title: "Enterprise", price: "£399/month", accent: "primary" },
          ].map((p) => (
            <div
              key={p.title}
              style={{
                background: p.accent === "primary" ? "var(--primary)" : "var(--surface)",
                color: p.accent === "primary" ? "#fff" : "var(--text-primary)",
                border: p.accent === "primary" ? "none" : "1px solid var(--border)",
                borderRadius: 10,
                padding: 18,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>{p.title}</h4>
              <p style={{ margin: "10px 0 0 0", color: p.accent === "primary" ? "rgba(255,255,255,0.9)" : "var(--text-muted)", fontWeight: 900 }}>
                {p.price}
              </p>
              {p.title === "Enterprise" ? (
                <p style={{ margin: "10px 0 0 0", fontSize: 13, lineHeight: 1.55 }}>
                  Evidence packs, inspection engine, full AI features
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--primary)", color: "#fff", textAlign: "center", padding: "56px 20px" }}>
        <h3 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Be inspection-ready — without the stress.</h3>
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={() => alert("Demo booking is not wired yet.")}
            style={{
              background: "#fff",
              color: "var(--primary)",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Book Demo
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: "center", color: "var(--text-muted)", padding: "22px 20px", fontSize: 12 }}>
        © {new Date().getFullYear()} {name}. All rights reserved.
      </footer>
    </div>
  );
}

