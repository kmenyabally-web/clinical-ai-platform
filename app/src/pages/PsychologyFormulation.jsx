import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePatients } from "../hooks/usePatients";
import { addFormulation, getLatestFormulationForPatient } from "../services/formulationService";
import { showToast } from "../utils/toast";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

const textareaStyle = {
  width: "100%",
  maxWidth: 640,
  minHeight: 72,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
  fontFamily: "inherit",
  resize: "vertical",
};

function formatCreatedAt(entry) {
  const raw = entry?.createdAt;
  if (raw == null) return "—";
  if (typeof raw?.toDate === "function") {
    try {
      return raw.toDate().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-GB");
}

export default function PsychologyFormulation() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [presentingProblems, setPresentingProblems] = useState("");
  const [predisposingFactors, setPredisposingFactors] = useState("");
  const [precipitatingFactors, setPrecipitatingFactors] = useState("");
  const [perpetuatingFactors, setPerpetuatingFactors] = useState("");
  const [protectiveFactors, setProtectiveFactors] = useState("");
  const [triggers, setTriggers] = useState("");
  const [copingStrategies, setCopingStrategies] = useState("");
  const [strengths, setStrengths] = useState("");
  const [riskFormulation, setRiskFormulation] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [latest, setLatest] = useState(null);
  const [latestLoading, setLatestLoading] = useState(false);

  const canUse = Boolean(permissions?.canAccessMDT || permissions?.canAccessBehaviour);

  useEffect(() => {
    if (!selectedPatientId && patients.length) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId || !organisationId) {
      setLatest(null);
      return;
    }
    let mounted = true;
    async function load() {
      setLatestLoading(true);
      try {
        const row = await getLatestFormulationForPatient(selectedPatientId);
        if (mounted) setLatest(row);
      } catch {
        if (mounted) setLatest(null);
      } finally {
        if (mounted) setLatestLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId, organisationId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError(null);
    if (!canUse) {
      const msg = "Your role does not have access to record formulations.";
      setSaveError(msg);
      showToast(msg);
      return;
    }
    if (!organisationId || !selectedPatientId || !user?.uid) {
      setSaveError("Missing organisation, patient, or sign-in.");
      return;
    }

    setSaving(true);
    try {
      await addFormulation({
        patientId: selectedPatientId,
        organisationId,
        presentingProblems,
        predisposingFactors,
        precipitatingFactors,
        perpetuatingFactors,
        protectiveFactors,
        triggers,
        copingStrategies,
        strengths,
        riskFormulation,
      });
      showToast("Formulation saved.");
      const row = await getLatestFormulationForPatient(selectedPatientId);
      setLatest(row);
    } catch (err) {
      const msg = err?.message ?? "Could not save formulation.";
      setSaveError(msg);
      showToast(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: "2rem",
        width: "100%",
        fontFamily: "sans-serif",
        maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Psychology formulation</h1>
      <p style={{ color: "#64748b", marginTop: 0, maxWidth: 720 }}>
        Structured 5P formulation and risk narrative feed psychology CPA sections and the MDT summary context.
      </p>

      {!canUse ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "12px 14px",
            borderRadius: 10,
            color: "#991b1b",
            marginBottom: 14,
          }}
        >
          Your role does not have access to this module.
        </div>
      ) : null}

      {!organisationId ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "12px 14px",
            borderRadius: 10,
            color: "#991b1b",
            marginBottom: 14,
          }}
        >
          Loading organisation...
        </div>
      ) : null}

      {patientsError ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "12px 14px",
            borderRadius: 10,
            color: "#991b1b",
            marginBottom: 14,
          }}
        >
          {patientsError}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <label style={{ fontWeight: 800 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || patients.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {patientsLoading ? (
              <option value="">Loading patients…</option>
            ) : patients.length ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}
                </option>
              ))
            ) : (
              <option value="">No patients found</option>
            )}
          </select>
        </label>
        <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
          Open patient list
        </Link>
        <Link to="/reports" style={{ color: "#005eb8", fontWeight: 700, textDecoration: "none" }}>
          AI Reports
        </Link>
      </div>

      <section
        style={{
          marginBottom: 24,
          padding: "1.25rem",
          background: "#faf5ff",
          borderRadius: 12,
          border: "1px solid #e9d5ff",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Latest formulation (this patient)</h2>
        {latestLoading ? (
          <p style={{ color: "#64748b" }}>Loading…</p>
        ) : !selectedPatientId ? (
          <p style={{ color: "#64748b" }}>Select a patient.</p>
        ) : !latest ? (
          <p style={{ color: "#64748b" }}>No formulation recorded yet.</p>
        ) : (
          <div style={{ fontSize: 14, color: "#1e1b4b", lineHeight: 1.55 }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>{formatCreatedAt(latest)}</div>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Presenting problems:</strong> {latest.presentingProblems || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Predisposing:</strong> {latest.predisposingFactors || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Precipitating:</strong> {latest.precipitatingFactors || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Perpetuating:</strong> {latest.perpetuatingFactors || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Protective:</strong> {latest.protectiveFactors || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Triggers:</strong> {latest.triggers || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Coping:</strong> {latest.copingStrategies || "—"}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              <strong>Strengths:</strong> {latest.strengths || "—"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Risk formulation:</strong> {latest.riskFormulation || "—"}
            </p>
          </div>
        )}
      </section>

      <section
        style={{
          padding: "1.25rem",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Record formulation</h2>
        {!selectedPatientId ? (
          <p style={{ color: "#64748b" }}>Select a patient to save a formulation.</p>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gap: 14, maxWidth: 680 }}>
              {[
                ["Presenting problems", presentingProblems, setPresentingProblems],
                ["Predisposing factors", predisposingFactors, setPredisposingFactors],
                ["Precipitating factors", precipitatingFactors, setPrecipitatingFactors],
                ["Perpetuating factors", perpetuatingFactors, setPerpetuatingFactors],
                ["Protective factors", protectiveFactors, setProtectiveFactors],
                ["Triggers", triggers, setTriggers],
                ["Coping strategies", copingStrategies, setCopingStrategies],
                ["Strengths", strengths, setStrengths],
                ["Risk formulation", riskFormulation, setRiskFormulation],
              ].map(([label, value, setter]) => (
                <label key={label} style={{ fontWeight: 700 }}>
                  {label}
                  <textarea
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    style={{ ...textareaStyle, display: "block", marginTop: 6, maxWidth: "100%" }}
                    rows={label === "Risk formulation" ? 4 : 3}
                  />
                </label>
              ))}
            </div>
            {saveError ? (
              <p role="alert" style={{ color: "#991b1b", fontWeight: 600, marginTop: 12 }}>
                {saveError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving || !canUse}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#6d28d9",
                color: "#fff",
                fontWeight: 800,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save Formulation"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
