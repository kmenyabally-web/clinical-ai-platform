/** [ENABLEMENT GATE: STAGE 9 / 14 - EVIDENCE PACK EXPORT] */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { getPatientsByOrg } from "../services/patientService";
import { getUserContext } from "../services/authService";
import {
  buildEvidencePackZip,
  generateCqcEvidencePackDocument,
  generateInspectionEnginePack,
} from "../services/evidencePackService";
import CqcInspectionPackView from "../components/evidence/CqcInspectionPackView";
import { logAuditEvent } from "../services/auditService";
import { getSubscription } from "../services/subscriptionService";
import { hasFeature } from "../utils/featureAccess.js";
import ActionBar from "../components/ActionBar";
import { APP_CONFIG } from "../config/appConfig";
import { generatePDF } from "../utils/professionalReportPdf";

export default function EvidencePack() {
  const { organisationId, organisation } = useOrganisation();
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const canAccess =
    import.meta.env.DEV === true || hasFeature(subscription, "evidencePack");
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
  const [inspectionDoc, setInspectionDoc] = useState(null);

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
    if (import.meta.env.DEV && organisation?.features) {
      // eslint-disable-next-line no-console -- dev diagnostics for evidence pack
      console.log("FEATURE FLAGS:", organisation.features);
    }
  }, [organisation]);

  useEffect(() => {
    if (!canAccess || !organisationId) {
      setPatients([]);
      setLoadingPatients(false);
      return;
    }
    let mounted = true;

    async function loadPatients() {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- evidence pack diagnostics
        console.log("ACTIVE ORG ID:", organisationId);
      }
      setLoadingPatients(true);
      setPatientsError(null);
      try {
        const data = await getPatientsByOrg(organisationId);
        if (!mounted) return;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console -- evidence pack diagnostics
          console.log("Loaded patients:", data);
          // eslint-disable-next-line no-console -- evidence pack diagnostics
          console.log("PATIENTS:", data);
        }
        setPatients(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        console.error("Failed to load patients", e);
        setPatientsError(e?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (mounted) setLoadingPatients(false);
      }
    }

    void loadPatients();
    return () => {
      mounted = false;
    };
  }, [canAccess, organisationId]);

  if (subscriptionLoading) {
    return (
      <div style={{ padding: "24px", width: "100%" }}>
        <h1 style={{ marginTop: 0 }}>{APP_CONFIG.name} Evidence Pack</h1>
        <p style={{ color: "#64748b" }}>Loading subscription…</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ padding: "24px", width: "100%" }}>
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
      const [data, docData] = await Promise.all([
        generateInspectionEnginePack({
          organisationId,
          patientId: selectedPatientId.trim() || null,
        }),
        selectedPatientId.trim()
          ? generateCqcEvidencePackDocument({
              organisationId,
              patientId: selectedPatientId.trim(),
            })
          : Promise.resolve(null),
      ]);
      setPack(data);
      setInspectionDoc(docData);
      setPackGeneratedAt(new Date().toLocaleString());
    } catch (e) {
      setError(e?.message ?? "Failed to generate evidence pack.");
      setPack(null);
      setInspectionDoc(null);
      setPackGeneratedAt("");
    } finally {
      setPackLoading(false);
    }
  }

  function handleExportInspectionPdf() {
    if (!inspectionDoc) return;
    generatePDF({
      fileName: `CQC_Evidence_Pack_${inspectionDoc.patientId}_${new Date().toISOString().slice(0, 10)}.pdf`,
      reportType: "CQC Evidence Pack",
      organisationName: organisation?.name ?? inspectionDoc.organisationId,
      hospitalName: selectedPatient?.hospitalName || selectedPatient?.hospitalId || "Not recorded",
      wardName: selectedPatient?.wardName || selectedPatient?.wardId || "Not recorded",
      patientName: inspectionDoc.patientName,
      nhsNumber: selectedPatient?.nhsNumber ?? null,
      generatedAt: new Date(inspectionDoc.generatedAt).toLocaleString("en-GB"),
      title: "CQC Evidence Pack V1",
      summary:
        "Inspection-ready evidence pack summarising patient overview, risk, trends, concerns, and care quality.",
      sections: inspectionDoc.sections.map((s) => ({
        heading: s.title,
        content: [s.summary, ...(s.keyPoints ?? []).map((p) => `- ${p}`)].filter(Boolean).join("\n\n"),
      })),
    });
  }

  return (
    <div style={{ padding: "24px", width: "100%" }}>
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
          Generate a CQC inspection engine view (five domains, gaps, risks) and a ZIP bundle of notes, care plans, and
          organisation documents. Select a patient before running the inspection preview to scope notes and care plans.
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
            label: packLoading ? "Running inspection engine…" : "Run CQC inspection engine",
            type: "secondary",
            onClick: () => handleGeneratePack(),
          },
        ]}
      />

      {!pack && !lastSummary && !packLoading && !generating ? (
        <p
          style={{
            margin: "0 0 16px 0",
            padding: "12px 14px",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            color: "#475569",
            fontSize: 14,
          }}
        >
          No evidence generated yet. Click generate.
        </p>
      ) : null}

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
            onChange={(e) => {
              const id = e.target.value;
              setSelectedPatientId(id);
            }}
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
            <option value="">Select patient</option>
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
        <>
          <p style={{ marginTop: 16, marginBottom: 0, color: "#64748b", fontSize: 13 }}>
            Organisation: <strong>{organisation?.name ?? "Unknown"}</strong>
            {" · "}
            Generated at: <strong>{packGeneratedAt || "—"}</strong>
            {pack.patientId ? (
              <>
                {" · "}
                Patient scope: <strong>{patientLabel}</strong>
              </>
            ) : (
              <>
                {" · "}
                <span style={{ color: "#b45309" }}>Org-wide notes (no patient selected)</span>
              </>
            )}
          </p>

          <CqcInspectionPackView pack={pack} />

          {inspectionDoc ? (
            <section
              id="cqc-evidence-pack-v1"
              style={{
                marginTop: 18,
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "1rem 1.1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#0f172a" }}>
                  CQC Evidence Pack V1
                </h3>
                <button
                  type="button"
                  onClick={handleExportInspectionPdf}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Export CQC PDF
                </button>
              </div>
              <p style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: 13 }}>
                Single inspector-ready document with patient, risk, trends, concerns, and care-quality indicators.
              </p>
              {inspectionDoc.sections.map((section) => (
                <div
                  key={section.title}
                  style={{
                    marginBottom: 12,
                    padding: "10px 12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    background: "#f8fafc",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{section.title}</h4>
                  <p style={{ margin: "8px 0 8px 0", color: "#334155", fontSize: 14, lineHeight: 1.5 }}>
                    {section.summary}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13 }}>
                    {(section.keyPoints ?? []).map((point, idx) => (
                      <li key={`${section.title}-${idx}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}

          <section
            style={{
              marginTop: 20,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: "0.95rem", fontWeight: 900, color: "#0f172a" }}>STOMP &amp; inspection scores</h3>
            <h4 style={{ margin: "8px 0 6px 0", fontSize: 13, color: "#64748b" }}>STOMP</h4>
            {(pack.stompCompliance ?? []).length === 0 ? (
              <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>No STOMP-monitored patients found.</p>
            ) : (
              (pack.stompCompliance ?? []).map((p, i) => (
                <div key={p.patientId ?? i} style={{ marginBottom: 8, color: "#334155", fontSize: 14 }}>
                  <strong>{p.patientName ?? p.patientId}</strong> — medications: {(p.medications ?? []).length}
                  {(p.alerts ?? []).length > 0 ? (
                    <ul style={{ margin: "6px 0 0 18px" }}>
                      {(p.alerts ?? []).map((a, j) => (
                        <li key={`${p.patientId}-a-${j}`}>
                          {a.severity === "high" ? "🔴" : "🟡"} {a.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: "#166534", fontSize: 13 }}>No STOMP alerts.</div>
                  )}
                </div>
              ))
            )}

            <h4 style={{ margin: "12px 0 6px 0", fontSize: 13, color: "#64748b" }}>Inspection snapshots</h4>
            <p style={{ marginTop: 0, color: "#334155", fontSize: 14 }}>
              Overall score: {pack.inspectionIntelligence?.overallScore ?? "—"} | Snapshots: {pack.inspectionIntelligence?.historyCount ?? 0}
            </p>
            {pack.inspectionIntelligence?.domainScores ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(pack.inspectionIntelligence.domainScores).map(([domain, score]) => (
                  <div
                    key={domain}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "6px 10px",
                      background: "#fff",
                      color: "#0f172a",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {domain}: {score}%
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>No inspection score snapshots yet.</p>
            )}
            {(pack.inspectionIntelligence?.keyAlerts ?? []).length > 0 ? (
              <ul style={{ margin: "8px 0 0 18px", fontSize: 14 }}>
                {(pack.inspectionIntelligence?.keyAlerts ?? []).map((a, idx) => (
                  <li key={`ia-${idx}`} style={{ color: a.level === "critical" ? "#991b1b" : "#9a3412" }}>
                    {a.level === "critical" ? "🔴" : "🟠"} {a.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
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
