/** [ENABLEMENT GATE: STAGE 9 / 14 - EVIDENCE PACK EXPORT] */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { listPatients } from "../services/patientService";
import { getUserContext } from "../services/authService";
import { buildEvidencePackZip, generateEvidencePack } from "../services/evidencePackService";
import { logAuditEvent } from "../services/auditService";
import { getSubscription } from "../services/subscriptionService";
import { hasFeature } from "../utils/featureAccess.js";
import ActionBar from "../components/ActionBar";
import { APP_CONFIG } from "../config/appConfig";

export default function EvidencePack() {
  const { organisationId, organisation } = useOrganisation();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const canAccess = hasFeature(subscription, "evidencePack");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSummary, setLastSummary] = useState(null);
  const [pack, setPack] = useState(null);
  const [packGeneratedAt, setPackGeneratedAt] = useState("");

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const patientLabel = selectedPatient
    ? `${selectedPatient.firstName ?? ""} ${selectedPatient.lastName ?? ""}`.trim() || selectedPatient.id
    : "";

  useEffect(() => {
    let mounted = true;
    async function loadSubscription() {
      if (!organisationId) {
        setSubscription(null);
        setSubscriptionLoading(false);
        return;
      }
      setSubscriptionLoading(true);
      try {
        const sub = await getSubscription(organisationId);
        if (!mounted) return;
        setSubscription(sub);
      } catch {
        if (!mounted) return;
        setSubscription(null);
      } finally {
        if (mounted) setSubscriptionLoading(false);
      }
    }
    loadSubscription();
    return () => {
      mounted = false;
    };
  }, [organisationId]);

  useEffect(() => {
    if (!canAccess) {
      setLoadingPatients(false);
      return;
    }
    let mounted = true;
    async function load() {
      setLoadingPatients(true);
      setPatientsError(null);
      try {
        const list = await listPatients();
        if (!mounted) return;
        setPatients(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setPatientsError(e?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (mounted) setLoadingPatients(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [canAccess]);

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  if (subscriptionLoading) {
    return (
      <div style={{ padding: "24px", maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>{APP_CONFIG.name} Evidence Pack</h1>
        <p style={{ color: "#64748b" }}>Loading subscription…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ padding: "24px", maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>{APP_CONFIG.name} Evidence Pack</h1>
        <p style={{ color: "#64748b" }}>
          Evidence pack export is available on the Enterprise plan.{" "}
          <Link to="/billing" style={{ color: "#005eb8", fontWeight: 700 }}>
            View billing &amp; plans
          </Link>
        </p>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
          Current plan: <strong>{subscription?.plan ?? "FREE"}</strong>
        </p>
      </div>
    );
  }

  async function handleGenerateBundle() {
    setError(null);
    setLastSummary(null);
    if (!selectedPatient) {
      setError("Select a patient.");
      return;
    }
    setGenerating(true);
    try {
      const { organisationId } = await getUserContext();
      const org = organisationId || null;
      if (!org) throw new Error("organisationId required");
      const { blob, rootFolderName, counts } = await buildEvidencePackZip({
        organisationId: org,
        patientId: selectedPatient.id,
        patientName: patientLabel,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `SanctumCare_Evidence_Pack_${dateStr}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setLastSummary({ rootFolderName, counts, filename });
      void logAuditEvent("REPORT_GENERATED", {
        organisationId: org,
        patientId: selectedPatient.id,
        metadata: { kind: "evidence_pack_zip", counts },
      });
    } catch (e) {
      setError(e?.message ?? "Failed to build evidence pack.");
    } finally {
      setGenerating(false);
    }
  }

  function generateZipEvidencePack() {
    void handleGenerateBundle();
  }

  async function handleGeneratePack() {
    setError(null);
    setPackLoading(true);
    try {
      const { organisationId } = await getUserContext();
      if (!organisationId) throw new Error("organisationId required");
      const data = await generateEvidencePack({ organisationId });
      setPack(data);
      setPackGeneratedAt(new Date().toLocaleString());
    } catch (e) {
      setError(e?.message ?? "Failed to generate evidence pack.");
      setPack(null);
      setPackGeneratedAt("");
    } finally {
      setPackLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: 920, margin: "0 auto" }}>
      <style>{`
        @keyframes cqcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <header style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, marginBottom: 6, fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
          {APP_CONFIG.name} — Evidence Pack
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Generated: {new Date().toLocaleDateString()}
        </p>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Generate a single inspection bundle (ZIP) containing clinical notes, care plans as readable text files, and
          organisation policy/evidence documents for the selected patient and organisation.
        </p>
      </header>

      <ActionBar
        actions={[
          {
            label: "⚡ Generate Evidence Pack",
            type: "generate",
            onClick: () => generateZipEvidencePack(),
          },
          {
            label: packLoading ? "Generating report..." : "Generate Evidence Pack (Preview)",
            type: "secondary",
            onClick: () => handleGeneratePack(),
          },
        ]}
      />

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1rem", fontWeight: 900, color: "#0f172a" }}>
          Patient
        </h2>
        {loadingPatients && <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Loading patients…</p>}
        {patientsError && (
          <div role="alert" style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b" }}>
            {patientsError}
          </div>
        )}
        {!loadingPatients && !patientsError && (
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patients.length === 0}
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 14,
            }}
          >
            {patients.map((p) => {
              const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
              return (
                <option key={p.id} value={p.id}>
                  {name || p.id}
                </option>
              );
            })}
          </select>
        )}
      </section>

      {error && (
        <div role="alert" style={{ marginBottom: 16, padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, color: "#991b1b" }}>
          {error}
        </div>
      )}

      {lastSummary && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: "0.75rem 1rem",
            background: "#ecfdf5",
            border: "1px solid #6ee7b7",
            borderRadius: 12,
            color: "#065f46",
            fontSize: 14,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>Download started: {lastSummary.filename}</strong>
          <span style={{ display: "block", fontSize: 13 }}>
            Folder inside ZIP: {lastSummary.rootFolderName}
          </span>
          <span style={{ display: "block", fontSize: 13, marginTop: 4 }}>
            Included: {lastSummary.counts.notes} note(s), {lastSummary.counts.carePlans} care plan(s), up to{" "}
            {lastSummary.counts.documents} organisation document(s).
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={handleGenerateBundle}
          disabled={generating || loadingPatients || !selectedPatientId || patients.length === 0}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: generating ? "#94a3b8" : "#0f172a",
            color: "#fff",
            fontWeight: 900,
            fontSize: 15,
            cursor: generating || loadingPatients ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {generating ? (
            <>
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.5)",
                  borderTopColor: "#fff",
                  animation: "cqcSpin 0.85s linear infinite",
                }}
              />
              Building bundle…
            </>
          ) : (
            "Generate Inspection Bundle"
          )}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#0f172a",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Export / Print
        </button>
      </div>

      {pack ? (
        <section
          style={{
            marginTop: 16,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1rem",
          }}
        >
          <p style={{ marginTop: 0, marginBottom: 8, color: "#64748b", fontSize: 13 }}>
            Organisation: <strong>{organisation?.name ?? "Unknown"}</strong>
            {" · "}
            Generated at: <strong>{packGeneratedAt || "—"}</strong>
          </p>
          <h2 style={{ marginTop: 0 }}>Evidence Pack</h2>
          <h3 style={{ marginBottom: 6 }}>Summary</h3>
          <p style={{ marginTop: 0 }}>{pack.summary}</p>

          <h3 style={{ marginBottom: 6 }}>Clinical Notes</h3>
          {(pack.notes ?? []).map((n, i) => (
            <div key={n.id ?? i} style={{ marginBottom: 6, color: "#334155" }}>
              {n.content ?? "No content"}
            </div>
          ))}

          <h3 style={{ marginBottom: 6, marginTop: 12 }}>Audit Logs</h3>
          {(pack.audits ?? []).map((a, i) => (
            <div key={a.id ?? i} style={{ marginBottom: 6, color: "#334155" }}>
              {(a.action ?? a.eventType ?? "UNKNOWN")} by {a.userEmail ?? "Unknown user"}
            </div>
          ))}

          <h3 style={{ marginBottom: 6, marginTop: 12 }}>Inspection Reports</h3>
          {(pack.inspections ?? []).map((r, i) => (
            <div key={r.id ?? i} style={{ marginBottom: 6, color: "#334155" }}>
              Score: {r.score ?? r.overallScore ?? "—"} | Rating: {r.rating ?? r.overallRating ?? "—"}
            </div>
          ))}
        </section>
      ) : null}

      <section style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid #e2e8f0" }}>
        <h3 style={{ marginTop: 0, fontSize: "0.95rem", fontWeight: 900, color: "#334155" }}>What is included</h3>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
          <li>
            <strong>notes/</strong> — one <code>.txt</code> per note (category, author, content).
          </li>
          <li>
            <strong>care_plans/</strong> — AI drafts and structured plans as readable <code>.txt</code> (not binary PDF).
          </li>
          <li>
            <strong>organisation_documents/</strong> — files from your organisation policy/evidence libraries (same org as
            the patient context).
          </li>
          <li>
            <strong>README.txt</strong> — manifest and generation metadata at the root of the folder inside the ZIP.
          </li>
        </ul>
        <p style={{ margin: "1rem 0 0 0", fontSize: 13, color: "#92400e", fontWeight: 700 }}>
          Confidential: handle per GDPR and organisational information governance. Suitable for CQC evidence when
          redaction and consent requirements are met.
        </p>
      </section>
    </div>
  );
}
