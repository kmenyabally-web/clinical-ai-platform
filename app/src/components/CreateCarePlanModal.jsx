import { useEffect, useState, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { listPatients } from "../services/patientService";

export default function CreateCarePlanModal({ open, onClose, onCreate, loading }) {
  const { organisationId } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  const [patientId, setPatientId] = useState("");
  const [careNeeds, setCareNeeds] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [supportStrategies, setSupportStrategies] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const resetForm = () => {
    setPatientId("");
    setCareNeeds("");
    setRiskAssessment("");
    setSupportStrategies("");
    setReviewDate("");
  };

  const loadPatients = useCallback(() => {
    if (!organisationId) {
      setPatients([]);
      return;
    }
    setPatientsLoading(true);
    setPatientsError(null);
    listPatients(organisationId, { serviceId: currentServiceId ?? undefined })
      .then((list) => setPatients(Array.isArray(list) ? list : []))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Firestore query failed:", err);
        setPatientsError(err?.message ?? "Failed to load patients.");
        setPatients([]);
      })
      .finally(() => setPatientsLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    if (open) {
      loadPatients();
    } else {
      resetForm();
    }
  }, [open, loadPatients]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patientId || !careNeeds.trim()) return;
    onCreate({
      patientId,
      careNeeds,
      riskAssessment,
      supportStrategies,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
    });
  };

  const currentServiceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        "Current service"
      : "All services";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(15,23,42,0.35)",
          padding: "1.5rem 1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Create care plan</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "1.2rem",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {patientsError && (
          <p role="alert" style={{ color: "#b91c1c", marginBottom: "0.75rem" }}>
            {patientsError}
          </p>
        )}

        <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "#64748b" }}>
          Service scope: <strong>{currentServiceName}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={patientsLoading || loading}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            >
              <option value="">{patientsLoading ? "Loading patients…" : "Select a patient"}</option>
              {(patients ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || "Unnamed patient"} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Care Needs</label>
            <textarea
              value={careNeeds}
              onChange={(e) => setCareNeeds(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              required
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Risk Assessment</label>
            <textarea
              value={riskAssessment}
              onChange={(e) => setRiskAssessment(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Support Strategies</label>
            <textarea
              value={supportStrategies}
              onChange={(e) => setSupportStrategies(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Review Date</label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              disabled={loading}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || patientsLoading || !patientId || !careNeeds.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#005eb8",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Saving…" : "Create care plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

