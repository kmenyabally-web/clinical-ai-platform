import { useEffect, useMemo, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import {
  fetchPatientsForEvidencePack,
  generateBundle,
} from "../services/evidencePackService";

const CQC_BLUE = "#005eb8";
const CQC_GOLD = "#ffb81c";

export default function EvidencePack() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      if (!organisationId) {
        setPatients([]);
        setSelectedPatientId("");
        setLoadingPatients(false);
        return;
      }
      setLoadingPatients(true);
      setError("");
      try {
        const list = await fetchPatientsForEvidencePack(organisationId, currentServiceId);
        if (!mounted) return;
        setPatients(list);
        setSelectedPatientId(list[0]?.id ?? "");
      } catch (e) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load patients.");
        setPatients([]);
        setSelectedPatientId("");
      } finally {
        if (mounted) setLoadingPatients(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, [organisationId, currentServiceId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  async function handleDownload() {
    setError("");
    setSuccess("");
    setIsGenerating(true);
    try {
      const displayName =
        selectedPatient?.fullName ||
        `${selectedPatient?.firstName ?? ""} ${selectedPatient?.lastName ?? ""}`.trim() ||
        selectedPatientId;
      const counts = await generateBundle({
        organisationId,
        patientId: selectedPatientId,
        patientDisplayName: displayName,
        serviceId: currentServiceId,
      });
      setSuccess(
        `Evidence pack downloaded. Included ${counts.carePlans} care plans, ${counts.clinicalNotes} clinical notes, and ${counts.documentMetadata} document metadata records.`
      );
    } catch (e) {
      setError(e?.message ?? "Failed to generate evidence pack.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>SanctumCare Evidence Pack Generator</h1>
      <p style={{ margin: "0 0 1.5rem", color: "#475569", maxWidth: 720 }}>
        Generate an inspection-ready ZIP bundle containing care plans, clinical note summaries, and a manifest for audit trail purposes.
      </p>

      <section
        style={{
          background: "#fff",
          border: `1px solid ${CQC_BLUE}22`,
          borderTop: `4px solid ${CQC_GOLD}`,
          borderRadius: 12,
          padding: "1.25rem",
          maxWidth: 760,
          boxShadow: "0 2px 8px rgba(2, 6, 23, 0.06)",
        }}
      >
        <label htmlFor="patient-select" style={{ display: "block", fontWeight: 700, color: CQC_BLUE, marginBottom: 8 }}>
          Select Patient
        </label>
        <select
          id="patient-select"
          value={selectedPatientId}
          onChange={(e) => setSelectedPatientId(e.target.value)}
          disabled={loadingPatients || isGenerating || patients.length === 0}
          style={{
            width: "100%",
            maxWidth: 460,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            marginBottom: 16,
            background: "#fff",
          }}
        >
          {patients.length === 0 ? (
            <option value="">{loadingPatients ? "Loading patients..." : "No patients available"}</option>
          ) : (
            patients.map((patient) => {
              const label =
                patient.fullName ||
                `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
                patient.name ||
                patient.id;
              return (
                <option key={patient.id} value={patient.id}>
                  {label}
                </option>
              );
            })
          )}
        </select>

        <button
          type="button"
          onClick={handleDownload}
          disabled={isGenerating || loadingPatients || !selectedPatientId}
          style={{
            width: "100%",
            maxWidth: 460,
            padding: "14px 16px",
            fontSize: "1rem",
            fontWeight: 700,
            borderRadius: 10,
            border: "none",
            background: isGenerating ? "#93c5fd" : CQC_BLUE,
            color: "#fff",
            cursor: isGenerating ? "default" : "pointer",
            boxShadow: `0 0 0 3px ${CQC_GOLD}33`,
          }}
        >
          {isGenerating ? "Generating evidence pack..." : "Download Evidence Pack"}
        </button>

        {error ? (
          <p style={{ marginTop: 12, marginBottom: 0, color: "#b91c1c" }} role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p style={{ marginTop: 12, marginBottom: 0, color: "#166534" }} role="status">
            {success}
          </p>
        ) : null}
      </section>
    </div>
  );
}
