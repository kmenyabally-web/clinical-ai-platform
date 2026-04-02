/** Physical health — NEWS observations + care monitoring (fluid, food, stool, urine). */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePatients } from "../hooks/usePatients";
import ObservationsSection from "../components/ObservationsSection";
import CareMonitoringSection from "../components/CareMonitoringSection";
import { isCareSetting, isClinicalSetting } from "../utils/orgHelpers";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

const tabBtn = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 14,
  color: "#334155",
};
const tabBtnActive = {
  ...tabBtn,
  borderColor: "#0d9488",
  background: "#e0f2f1",
  color: "#0f766e",
};

export default function PhysicalHealth() {
  const { organisationId, organisation } = useOrganisation();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();

  const [activeTab, setActiveTab] = useState("observations");

  const orgType = organisation?.type ?? "hospital";
  const careSetting = isCareSetting(orgType);
  const clinicalSetting = isClinicalSetting(orgType);

  const patientFromQuery = (searchParams.get("patient") ?? "").trim();
  const [selectedPatientId, setSelectedPatientId] = useState(patientFromQuery);

  useEffect(() => {
    if (patientFromQuery) setSelectedPatientId(patientFromQuery);
  }, [patientFromQuery]);

  useEffect(() => {
    // Care settings should focus on care monitoring, not NEWS observations.
    if (careSetting) setActiveTab("care");
  }, [careSetting]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  function onPatientChange(id) {
    setSelectedPatientId(id);
    const next = new URLSearchParams(searchParams);
    if (id) next.set("patient", id);
    else next.delete("patient");
    setSearchParams(next, { replace: true });
  }

  const inputStyle = {
    width: "100%",
    maxWidth: 400,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" };

  return (
    <div style={{ padding: "24px", maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>Physical health monitoring</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        NEWS observations and care monitoring (fluid, food, stool, urine). Open from a patient profile for a
        pre-selected patient.
      </p>

      {!organisationId ? (
        <div role="status" style={{ ...card, background: "#fffbeb", borderColor: "#fcd34d" }}>
          Select an organisation to record data.
        </div>
      ) : null}

      <div style={card}>
        <label htmlFor="phys-patient" style={labelStyle}>
          Patient
        </label>
        <select
          id="phys-patient"
          value={selectedPatientId}
          onChange={(e) => onPatientChange(e.target.value)}
          disabled={patientsLoading || !organisationId}
          style={inputStyle}
        >
          <option value="">— Select patient —</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {[p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.name || p.id}
            </option>
          ))}
        </select>
        {patientsError ? (
          <p style={{ color: "#b91c1c", marginTop: 8 }}>{patientsError}</p>
        ) : null}
        {selectedPatientId ? (
          <p style={{ marginTop: 12 }}>
            <Link to={`/patients/${selectedPatientId}`} style={{ color: "#2563eb", fontWeight: 600 }}>
              Open patient profile →
            </Link>
          </p>
        ) : null}
      </div>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}
        role="tablist"
        aria-label="Physical health sections"
      >
        {clinicalSetting ? (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "observations"}
            onClick={() => setActiveTab("observations")}
            style={activeTab === "observations" ? tabBtnActive : tabBtn}
          >
            Observations
          </button>
        ) : null}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "care"}
          onClick={() => setActiveTab("care")}
          style={activeTab === "care" ? tabBtnActive : tabBtn}
        >
          Care Monitoring
        </button>
      </div>

      {activeTab === "observations" && clinicalSetting && (
        <ObservationsSection
          organisationId={organisationId}
          selectedPatientId={selectedPatientId}
          selectedPatient={selectedPatient}
          user={user}
        />
      )}

      {activeTab === "care" && (
        <CareMonitoringSection
          organisationId={organisationId}
          selectedPatientId={selectedPatientId}
          selectedPatient={selectedPatient}
          user={user}
        />
      )}
    </div>
  );
}
