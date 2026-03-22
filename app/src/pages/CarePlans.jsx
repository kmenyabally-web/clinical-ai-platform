/** [ENABLEMENT GATE: STAGE 12 - AI CARE PLAN GENERATOR] */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  listAiCarePlanDraftsForPatient,
  saveAiCarePlanDraft,
} from "../services/carePlanManagementService";
import { listPatients } from "../services/patientService";
import { generateCarePlanDraft } from "../services/aiService";
import { getUserContext } from "../services/authService";
import { useService } from "../context/ServiceContext";
import { CarePlanFullViewModal } from "../components/CarePlanFullViewModal";

function formatSavedAt(createdAt) {
  if (!createdAt) return "—";
  try {
    const d = typeof createdAt.toDate === "function" ? createdAt.toDate() : new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export default function CarePlans() {
  const { currentServiceId } = useService();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [keyObservationsRisks, setKeyObservationsRisks] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [editedText, setEditedText] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const [recentPlans, setRecentPlans] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState(null);

  const [selectedPlan, setSelectedPlan] = useState(null);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const loadRecentCarePlans = useCallback(async () => {
    if (!selectedPatientId) {
      setRecentPlans([]);
      return;
    }
    setRecentLoading(true);
    setRecentError(null);
    try {
      const { organisationId } = await getUserContext();
      const list = await listAiCarePlanDraftsForPatient(organisationId || "dev-org-001", selectedPatientId);
      setRecentPlans(Array.isArray(list) ? list : []);
    } catch (err) {
      setRecentError(err?.message ?? "Failed to load saved plans.");
      setRecentPlans([]);
    } finally {
      setRecentLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const list = await listPatients();
        if (!mounted) return;
        setPatients(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!mounted) return;
        setPatientsError(err?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (mounted) setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    loadRecentCarePlans();
  }, [loadRecentCarePlans]);

  useEffect(() => {
    setSelectedPlan(null);
  }, [selectedPatientId]);

  async function handleGenerate() {
    setSaveError(null);
    setSaveSuccess(null);

    if (!selectedPatient) return;
    if (!keyObservationsRisks.trim()) {
      setSaveError("Please enter Key Observations / Risks before generating.");
      return;
    }

    setGenerating(true);
    try {
      const fullName = `${selectedPatient.firstName ?? ""} ${selectedPatient.lastName ?? ""}`.trim();
      const dob = selectedPatient.dob ? String(selectedPatient.dob) : "";
      const observations = [dob ? `DOB: ${dob}` : null, keyObservationsRisks]
        .filter(Boolean)
        .join("\n\n");

      const text = await generateCarePlanDraft(fullName || "Patient", observations);

      setGeneratedText(text);
      setEditedText(text);
    } catch (err) {
      setSaveError(err?.message ?? "Failed to generate care plan.");
      setGeneratedText("");
      setEditedText("");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(null);

    if (!selectedPatient) return;
    const generatedPlan = editedText.trim();
    if (!generatedPlan) {
      setSaveError("Nothing to save yet. Generate a draft first.");
      return;
    }

    setSaveLoading(true);
    try {
      const { organisationId } = await getUserContext();
      await saveAiCarePlanDraft({
        patientId: selectedPatient.id,
        content: generatedPlan,
        organisationId: organisationId || "dev-org-001",
      });
      setSaveSuccess("Saved to patient record.");
      await loadRecentCarePlans();
    } catch (err) {
      setSaveError(err?.message ?? "Failed to save care plan.");
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 1040, margin: "0 auto" }}>
      <style>{`
        @keyframes cqcSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>AI Care Plan Generator</h1>
          <p style={{ margin: 0, color: "#555", fontSize: "0.9rem" }}>
            Generate a Regulation 9 compliant draft for clinician review.
          </p>
          <p style={{ margin: "0.35rem 0 0 0", color: "#777", fontSize: "0.85rem" }}>
            Service: {currentServiceId ?? "—"}
          </p>
        </div>
      </div>

      {(patientsLoading || generating) && (
        <div style={{ marginBottom: 12, color: "#64748b", fontWeight: 800, fontSize: 13 }}>
          {generating ? "Generating AI draft…" : "Loading patients…"}
        </div>
      )}

      {patientsError && (
        <div role="alert" style={{ marginBottom: 12, padding: "0.75rem 1rem", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 12, color: "#b71c1c" }}>
          {patientsError}
        </div>
      )}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "1rem" }}>Inputs</h2>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 12, alignItems: "start" }}>
          <div>
            <label style={{ display: "block", fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Patient</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={patientsLoading || patients.length === 0}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              {patients.map((p) => {
                const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
                return (
                  <option key={p.id} value={p.id}>
                    {fullName || p.id} ({p.id})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Key Observations / Risks</label>
            <textarea
              value={keyObservationsRisks}
              onChange={(e) => setKeyObservationsRisks(e.target.value)}
              rows={6}
              placeholder="Add key observations and risks to inform the draft (e.g., mobility concerns, nutrition risk, support needs)…"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", resize: "vertical", fontSize: 13, lineHeight: 1.4 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || patientsLoading || !selectedPatientId}
            style={{
              padding: "10px 14px",
              background: "#005eb8",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 900,
              cursor: generating ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              opacity: generating ? 0.75 : 1,
            }}
          >
            {generating ? (
              <>
                <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", borderTopColor: "#fff", animation: "cqcSpin 0.9s linear infinite" }} />
                Generating AI…
              </>
            ) : (
              "Generate AI Care Plan"
            )}
          </button>
        </div>
      </section>

      {saveError && (
        <div role="alert" style={{ marginBottom: 12, padding: "0.75rem 1rem", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 12, color: "#b71c1c" }}>
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div role="status" style={{ marginBottom: 12, padding: "0.75rem 1rem", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, color: "#3730a3", fontWeight: 900 }}>
          {saveSuccess}
        </div>
      )}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.5rem" }}>Document Preview</h2>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.85rem", fontWeight: 800 }}>
          You can edit the draft before saving to the patient record.
        </p>

        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          rows={14}
          placeholder="Click “Generate AI Care Plan” to create a draft…"
          disabled={!generatedText || generating}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            resize: "vertical",
            fontSize: 13,
            lineHeight: 1.4,
            background: !generatedText ? "#f8fafc" : "#fff",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!generatedText?.trim() || saveLoading || generating}
            style={{
              padding: "10px 14px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 900,
              cursor: saveLoading ? "default" : "pointer",
              opacity: saveLoading ? 0.75 : 1,
            }}
          >
            {saveLoading ? "Saving…" : "Save to Patient Record"}
          </button>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
          <p style={{ margin: 0, fontWeight: 900, color: "#b45309", fontSize: 13 }}>
            AI-generated draft. Must be reviewed and signed off by a qualified clinician.
          </p>
        </div>
      </section>

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.5rem" }}>Recent Care Plans</h2>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.85rem", fontWeight: 700 }}>
          Saved AI drafts for the selected patient (Firestore <code style={{ fontSize: 12 }}>care_plans</code>, status{" "}
          <code style={{ fontSize: 12 }}>draft</code>).
        </p>

        {recentLoading && (
          <p style={{ margin: "0.75rem 0 0 0", color: "#64748b", fontSize: 13, fontWeight: 700 }}>Loading saved plans…</p>
        )}

        {recentError && (
          <div role="alert" style={{ marginTop: 12, padding: "0.75rem 1rem", background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 12, color: "#b71c1c" }}>
            {recentError}
          </div>
        )}

        {!recentLoading && !recentError && selectedPatientId && recentPlans.length === 0 && (
          <p style={{ margin: "0.75rem 0 0 0", color: "#64748b", fontSize: 13 }}>No saved drafts for this patient yet.</p>
        )}

        {!recentLoading && recentPlans.length > 0 && (
          <ul style={{ listStyle: "none", margin: "12px 0 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {recentPlans.map((plan) => {
              const excerpt = (plan.content ?? "").trim().slice(0, 280);
              const more = (plan.content ?? "").trim().length > 280 ? "…" : "";
              return (
                <li
                  key={plan.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>{formatSavedAt(plan.createdAt)}</div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #005eb8",
                        background: "#fff",
                        color: "#005eb8",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      View Full Plan
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontFamily: "inherit",
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: "#1e293b",
                    }}
                  >
                    {excerpt}
                    {more}
                  </pre>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <CarePlanFullViewModal
        open={selectedPlan != null}
        onClose={() => setSelectedPlan(null)}
        patientName={
          selectedPatient
            ? `${selectedPatient.firstName ?? ""} ${selectedPatient.lastName ?? ""}`.trim() || "Patient"
            : "Patient"
        }
        generatedAtLabel={selectedPlan ? formatSavedAt(selectedPlan.createdAt) : "—"}
        planContent={selectedPlan?.content ?? ""}
      />
    </div>
  );
}
