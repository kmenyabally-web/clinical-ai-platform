import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePatients } from "../hooks/usePatients";
import { addNursingObservation, getNursingObservationsForPatient } from "../services/nursingObservationsService";
import { showToast } from "../utils/toast";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

const inputStyle = {
  width: "100%",
  maxWidth: 480,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const textareaStyle = {
  ...inputStyle,
  maxWidth: "100%",
  minHeight: 88,
  resize: "vertical",
  fontFamily: "inherit",
};

function formatAdlsDisplay(o) {
  if (o == null) return "—";
  if (typeof o === "string") return o || "—";
  if (typeof o === "object" && o.washing != null) {
    return `${o.washing} · ${o.dressing} · ${o.hygiene}`;
  }
  return "—";
}

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

export default function NursingObservations() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [observationLevel, setObservationLevel] = useState("general");
  const [medicationAdherence, setMedicationAdherence] = useState("yes");
  const [nutrition, setNutrition] = useState("good");
  const [hydration, setHydration] = useState("adequate");
  const [sleep, setSleep] = useState("good");
  const [adlWashing, setAdlWashing] = useState("independent");
  const [adlDressing, setAdlDressing] = useState("independent");
  const [adlHygiene, setAdlHygiene] = useState("good");
  const [continence, setContinence] = useState("Continent");
  const [riskLevel, setRiskLevel] = useState("low");
  const [physicalHealth, setPhysicalHealth] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [observations, setObservations] = useState([]);

  useEffect(() => {
    if (!selectedPatientId && patients.length) {
      setSelectedPatientId(patients[0].id ?? "");
    }
  }, [patients, selectedPatientId]);

  useEffect(() => {
    if (!selectedPatientId || !organisationId) {
      setObservations([]);
      return;
    }
    let mounted = true;
    async function load() {
      setListLoading(true);
      try {
        const rows = await getNursingObservationsForPatient(selectedPatientId, { limitCount: 40 });
        if (mounted) setObservations(Array.isArray(rows) ? rows : []);
      } catch {
        if (mounted) setObservations([]);
      } finally {
        if (mounted) setListLoading(false);
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
    if (!permissions?.canAccessBehaviour) {
      const msg = "Your role does not have access.";
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
      await addNursingObservation({
        patientId: selectedPatientId,
        organisationId,
        observationLevel,
        medicationAdherence,
        nutrition,
        hydration,
        sleep,
        adls: { washing: adlWashing, dressing: adlDressing, hygiene: adlHygiene },
        continence,
        riskLevel,
        physicalHealth,
      });
      setPhysicalHealth("");
      showToast("Nursing observation saved.");
      const rows = await getNursingObservationsForPatient(selectedPatientId, { limitCount: 40 });
      setObservations(Array.isArray(rows) ? rows : []);
    } catch (err) {
      const msg = err?.message ?? "Could not save observation.";
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
      <h1 style={{ marginTop: 0 }}>Nursing observations</h1>
      <p style={{ color: "#64748b", marginTop: 0, maxWidth: 640 }}>
        Structured nursing inputs (V2: ADL domains, physical health note) feed CPA, MDT, risk, and alerts. Use alongside{" "}
        <Link to="/behaviour" style={{ color: "#005eb8", fontWeight: 700 }}>
          Behaviour Tracking
        </Link>{" "}
        for ABC logs.
      </p>

      {!permissions?.canAccessBehaviour ? (
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
      </div>

      <section
        style={{
          marginBottom: 24,
          padding: "1.25rem",
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Record observation</h2>
        {!selectedPatientId ? (
          <p style={{ color: "#64748b" }}>Select a patient to save a nursing observation.</p>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
              <label style={{ fontWeight: 700 }}>
                Observation level
                <select
                  value={observationLevel}
                  onChange={(e) => setObservationLevel(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="1:1">1:1</option>
                  <option value="intermittent">intermittent</option>
                  <option value="general">general</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Medication adherence
                <select
                  value={medicationAdherence}
                  onChange={(e) => setMedicationAdherence(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="yes">yes</option>
                  <option value="partial">partial</option>
                  <option value="no">no</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Nutrition
                <select
                  value={nutrition}
                  onChange={(e) => setNutrition(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="good">good</option>
                  <option value="poor">poor</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Hydration
                <select
                  value={hydration}
                  onChange={(e) => setHydration(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="adequate">adequate</option>
                  <option value="low">low</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Sleep
                <select
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="good">good</option>
                  <option value="disturbed">disturbed</option>
                </select>
              </label>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>ADLs (structured)</div>
              <label style={{ fontWeight: 700 }}>
                Washing
                <select
                  value={adlWashing}
                  onChange={(e) => setAdlWashing(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="independent">independent</option>
                  <option value="assisted">assisted</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Dressing
                <select
                  value={adlDressing}
                  onChange={(e) => setAdlDressing(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="independent">independent</option>
                  <option value="assisted">assisted</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Hygiene
                <select
                  value={adlHygiene}
                  onChange={(e) => setAdlHygiene(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="good">good</option>
                  <option value="poor">poor</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Continence
                <select
                  value={continence}
                  onChange={(e) => setContinence(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="Continent">Continent</option>
                  <option value="Incontinent">Incontinent</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Risk level
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value)}
                  style={{ ...inputStyle, display: "block", marginTop: 6 }}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label style={{ fontWeight: 700 }}>
                Physical health / clinical notes
                <textarea
                  value={physicalHealth}
                  onChange={(e) => setPhysicalHealth(e.target.value)}
                  style={{ ...textareaStyle, display: "block", marginTop: 6, maxWidth: "100%" }}
                  rows={4}
                  placeholder="Physical health observations, clinical context"
                />
              </label>
            </div>
            {saveError ? (
              <p role="alert" style={{ color: "#991b1b", fontWeight: 600, marginTop: 12 }}>
                {saveError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={saving || !permissions?.canAccessBehaviour}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#1976d2",
                color: "#fff",
                fontWeight: 800,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save Nursing Observation"}
            </button>
          </form>
        )}
      </section>

      <section
        style={{
          padding: "1.25rem",
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1.05rem", marginTop: 0 }}>Recent nursing observations</h2>
        {listLoading ? (
          <p style={{ color: "#64748b" }}>Loading…</p>
        ) : !selectedPatientId ? (
          <p style={{ color: "#64748b" }}>Select a patient.</p>
        ) : observations.length === 0 ? (
          <p style={{ color: "#64748b" }}>No observations recorded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {observations.map((o) => (
              <li
                key={o.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{formatCreatedAt(o)}</div>
                <div style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>
                  <strong>Observation:</strong> {o.observationLevel} · <strong>Meds:</strong> {o.medicationAdherence} ·{" "}
                  <strong>Nutrition:</strong> {o.nutrition} · <strong>Hydration:</strong> {o.hydration} ·{" "}
                  <strong>Sleep:</strong> {o.sleep} · <strong>ADLs:</strong> {formatAdlsDisplay(o.adls)} ·{" "}
                  <strong>Continence:</strong> {o.continence ?? "—"} · <strong>Risk:</strong> {o.riskLevel}
                </div>
                {o.physicalHealth || o.notes ? (
                  <p style={{ margin: "8px 0 0", fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {o.physicalHealth || o.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
