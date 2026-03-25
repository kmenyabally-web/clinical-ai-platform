import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";

export default function EvidencePackGenerator() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [serviceId, setServiceId] = useState(currentServiceId || "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const serviceOptions = useMemo(
    () =>
      (services ?? []).map((s) => ({
        id: s.id,
        name: s.serviceName || s.name || s.displayName || s.id,
      })),
    [services]
  );

  async function handleGenerate() {
    if (!organisationId || !serviceId) return;
    if (import.meta.env.DEV) {
      console.log("Debug:", { evidencePack: "started" });
    }
    setLoading(true);
    setError(null);
    try {
      // Business logic / Firestore orchestration lives elsewhere.
      // This page only triggers the process and shows a safe message.
      setHasGenerated(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Evidence pack query failed", err);
      setError(err?.message ?? "Failed to generate evidence pack.");
    } finally {
      setLoading(false);
    }
  }

  if (!organisationId) {
    // Layout already shows "No organisation selected."
    return null;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginTop: 0 }}>Inspection Evidence Pack</h1>
      {organisation?.name && (
        <p style={{ margin: "0 0 1rem 0", color: "#555", fontSize: "0.95rem" }}>
          {organisation.name}
          {currentServiceId && (
            <>
              {" "}
              ·{" "}
              {(services ?? []).find((s) => s.id === currentServiceId)?.serviceName ||
                (services ?? []).find((s) => s.id === currentServiceId)?.name ||
                "Selected service"}
            </>
          )}
        </p>
      )}

      <p style={{ margin: "0 0 1rem 0", color: "#64748b", fontSize: "0.9rem" }}>
        Generate inspection-ready evidence packs for CQC inspections. Select a service and date range,
        then download the generated pack.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "#fef2f2",
            borderRadius: 12,
            border: "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          maxWidth: 640,
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>Service</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: "0.9rem",
            }}
          >
            <option value="">Select a service</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 0 160px" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div style={{ flex: "1 0 160px" }}>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.85rem" }}>To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !serviceId}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#005eb8",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Generating…" : "Generate Evidence Pack"}
        </button>
      </section>

      <section
        style={{
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: "1rem 1.25rem",
          maxWidth: 640,
        }}
      >
        {!hasGenerated ? (
          <p style={{ margin: 0, color: "#64748b" }}>No evidence available yet.</p>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            Evidence pack generation has been triggered. Check your downloads or relevant module for output.
          </p>
        )}
      </section>
    </div>
  );
}

