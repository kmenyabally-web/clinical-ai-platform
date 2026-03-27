import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { listPatients } from "../services/patientService";
import QuickNoteBox from "../components/QuickNoteBox";

const btn = {
  display: "block",
  width: "100%",
  minHeight: 56,
  marginBottom: 12,
  padding: "16px 18px",
  borderRadius: 14,
  border: "none",
  fontSize: 18,
  fontWeight: 800,
  cursor: "pointer",
  textAlign: "center",
  textDecoration: "none",
  boxSizing: "border-box",
};

/**
 * Minimal, large-touch home for CARER uiMode organisations.
 */
export default function CarerDashboard() {
  const { organisationId, hasFeature, organisation } = useOrganisation();
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!organisationId) {
      setPatients([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    listPatients({})
      .then((list) => {
        if (!cancelled) setPatients(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setPatients([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const label = organisation?.name ? String(organisation.name) : "Care";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 14px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 6px 0" }}>
        {label}
      </h1>
      <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: 14 }}>
        Quick actions — tap a button
      </p>

      {hasFeature("tasks") ? (
        <Link to="/tasks" style={{ ...btn, background: "#005eb8", color: "#fff" }}>
          My tasks
        </Link>
      ) : null}

      <Link to="/patients" style={{ ...btn, background: "#0f172a", color: "#fff" }}>
        My patients
      </Link>

      {hasFeature("clinicalNotes") ? (
        <div style={{ marginTop: 8 }}>
          <QuickNoteBox patients={patients} patientsLoading={loading} />
        </div>
      ) : null}

      {hasFeature("medication") ? (
        <Link to="/care-plans" style={{ ...btn, background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}>
          Medication
        </Link>
      ) : null}

      <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
        Signed in as {user?.email ?? user?.uid ?? "—"}
      </p>
    </div>
  );
}
