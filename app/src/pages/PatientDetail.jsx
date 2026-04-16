import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { getPatientSummary } from "../services/patientService";
import { formatUkDate } from "../utils/dateFormat";
import { CLINICAL_EMPTY_PATIENT } from "../constants/clinicalCopy";

function formatDate(value) {
  return formatUkDate(value, "—");
}

export default function PatientDetail() {
  const { id: patientId } = useParams();
  const { organisationId } = useOrganisation();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisationId || !patientId) {
      setPatient(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getPatientSummary(organisationId, patientId)
      .then(setPatient)
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [organisationId, patientId]);

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "#666" }}>Loading patient…</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ padding: 40 }}>
        <p className="clinical-empty">{CLINICAL_EMPTY_PATIENT}</p>
        <Link to="/patients" style={{ color: "#2563eb", marginTop: 8, display: "inline-block" }}>
          ← Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 className="page-title" style={{ marginTop: 0 }} data-demo-guide="patient-detail-title">
        {patient.name || "Unnamed patient"}
      </h1>
      <p style={{ margin: "0 0 1rem 0", color: "#555", fontSize: "0.95rem" }}>
        DOB: {formatDate(patient.dateOfBirth)}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          to={`/patients/${patientId}/timeline`}
          style={{ padding: "10px 20px", background: "#e0f2fe", borderRadius: 8, textDecoration: "none", color: "#0369a1", fontWeight: 500 }}
        >
          View timeline
        </Link>
        <Link
          to={`/patients/${patientId}/care-plans`}
          style={{ padding: "10px 20px", background: "#dcfce7", borderRadius: 8, textDecoration: "none", color: "#166534", fontWeight: 500 }}
        >
          Care plans
        </Link>
        <Link
          to="/patients"
          style={{ padding: "10px 20px", background: "#f1f5f9", borderRadius: 8, textDecoration: "none", color: "#334155" }}
        >
          ← Back to patients
        </Link>
      </div>
    </div>
  );
}
