/** [ENABLEMENT GATE: STAGE 12 - AI CARE PLAN GENERATOR] */

import React, { useEffect, useMemo, useState } from "react";
import { createCarePlanRecord } from "../services/carePlanManagementService";
import { listPatients } from "../services/patientService";
import { generateClinicalCarePlan } from "../services/aiService";
import { getUserContext } from "../services/authService";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSectionText(text, heading) {
  if (!text) return "";
  const h = escapeRegExp(heading);
  // Expect headings like: "## Personal Preferences" (preferred by our prompt).
  const re = new RegExp(
    `(?:^|\\n)#{1,3}\\s*${h}\\s*(?:\\n|\\r\\n)([\\s\\S]*?)(?=(?:\\n#{1,3}\\s*[^\\n]+\\s*)|$)`,
    "m"
  );
  const m = text.match(re);
  if (m?.[1]) return m[1].trim();

  // Fallback: heading line without Markdown hashes.
  const re2 = new RegExp(`(?:^|\\n)${h}\\s*(?:\\n|\\r\\n)([\\s\\S]*?)(?=(?:\\n[^\\n]+\\s*\\n?)|$)`, "m");
  const m2 = text.match(re2);
  return (m2?.[1] ?? "").trim();
}

function parseCarePlanSections(editedText) {
  const sections = {
    personalPreferences: "",
    riskMitigation: "",
    mobilitySupport: "",
    nutritionHydration: "",
  };

  sections.personalPreferences = extractSectionText(editedText, "Personal Preferences");
  sections.riskMitigation = extractSectionText(editedText, "Risk Mitigation");
  sections.mobilitySupport = extractSectionText(editedText, "Mobility Support");
  sections.nutritionHydration = extractSectionText(editedText, "Nutrition/Hydration");

  const hasAny =
    Boolean(sections.personalPreferences) ||
    Boolean(sections.riskMitigation) ||
    Boolean(sections.mobilitySupport) ||
    Boolean(sections.nutritionHydration);

  if (!hasAny) {
    return {
      careNeeds: editedText.trim(),
      riskAssessment: "",
      supportStrategies: "",
    };
  }

  return {
    careNeeds: sections.personalPreferences,
    riskAssessment: sections.riskMitigation,
    supportStrategies: [sections.mobilitySupport, sections.nutritionHydration].filter(Boolean).join("\n\n"),
  };
}

export default function CarePlans() {
  const { user } = useAuth();
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

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

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
        if (!mounted) return;
        setPatientsLoading(false);
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

      const text = await generateClinicalCarePlan({
        patientName: fullName || "Patient",
        patientDob: dob,
        keyObservationsRisks,
      });

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
    if (!editedText.trim()) {
      setSaveError("Nothing to save yet. Generate a draft first.");
      return;
    }

    setSaveLoading(true);
    try {
      const { organisationId } = await getUserContext();
      const createdBy = user?.email || user?.uid || "Unknown";

      const { careNeeds, riskAssessment, supportStrategies } = parseCarePlanSections(editedText);
      const title = `AI Care Plan Draft - ${selectedPatient.firstName ?? "Patient"} ${selectedPatient.lastName ?? ""}`.trim();

      await createCarePlanRecord({
        organisationId,
        serviceId: currentServiceId ?? null,
        patientId: selectedPatient.id,
        careNeeds,
        riskAssessment,
        supportStrategies,
        reviewDate: null,
        createdBy,
      });

      setSaveSuccess("Draft saved to care plans. Please review and sign off.");
    } catch (err) {
      setSaveError(err?.message ?? "Failed to save care plan draft.");
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
          You can edit the draft before saving to care plans.
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
            disabled={!editedText.trim() || saveLoading || generating}
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
            {saveLoading ? "Saving…" : "Save to Care Plans"}
          </button>
        </div>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
          <p style={{ margin: 0, fontWeight: 900, color: "#b45309", fontSize: 13 }}>
            AI-generated draft. Must be reviewed and signed off by a qualified clinician.
          </p>
        </div>
      </section>
    </div>
  );
}

