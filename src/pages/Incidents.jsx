import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { fetchPatientsForEvidencePack } from "../services/evidencePackService";
import {
  createIncident,
  fetchRecentIncidents,
} from "../services/incidentService";
import { generateCandourLetter } from "../services/aiService";
import { logAuditEventNonBlocking } from "../services/auditService";

function isDutyOfCandourSeverity(severity) {
  const s = String(severity ?? "").toLowerCase();
  return s === "medium" || s === "high";
}

const INCIDENT_TYPES = [
  "Fall",
  "Medication Error",
  "Behavior",
  "Pressure Sore",
  "Safeguarding/Abuse",
];

const SEVERITIES = ["Low", "Medium", "High"];

export default function Incidents() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

  const [candourModalOpen, setCandourModalOpen] = useState(false);
  const [candourLetterText, setCandourLetterText] = useState("");
  const [candourLoadingId, setCandourLoadingId] = useState(null);
  const [candourError, setCandourError] = useState(null);

  const [form, setForm] = useState({
    patientId: "",
    incidentType: "Fall",
    severity: "Low",
    description: "",
    immediateActions: "",
    cqcNotified: false,
    status: "Open",
  });

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      if (!organisationId) {
        setPatients([]);
        setLoadingPatients(false);
        return;
      }
      setLoadingPatients(true);
      try {
        const list = await fetchPatientsForEvidencePack(organisationId, currentServiceId);
        if (!mounted) return;
        setPatients(list);
        setForm((prev) => ({ ...prev, patientId: prev.patientId || list[0]?.id || "" }));
      } catch {
        if (!mounted) return;
        setPatients([]);
      } finally {
        if (mounted) setLoadingPatients(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, [organisationId, currentServiceId]);

  async function loadRecentIncidents() {
    if (!organisationId) {
      setRecentIncidents([]);
      setLoadingIncidents(false);
      return;
    }
    setLoadingIncidents(true);
    try {
      const list = await fetchRecentIncidents(organisationId, currentServiceId ?? null, 25);
      setRecentIncidents(Array.isArray(list) ? list : []);
    } catch {
      setRecentIncidents([]);
    } finally {
      setLoadingIncidents(false);
    }
  }

  useEffect(() => {
    loadRecentIncidents();
  }, [organisationId, currentServiceId]);

  const safeguardingSelected = form.incidentType === "Safeguarding/Abuse";

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleDraftCandourLetter(incident) {
    if (!incident?.id) return;
    setCandourError(null);
    setCandourLoadingId(incident.id);
    const patientData =
      patients.find((p) => p.id === incident.patientId) || {
        id: incident.patientId,
        firstName: "",
        lastName: "",
      };
    try {
      const letter = await generateCandourLetter(incident, patientData);
      setCandourLetterText(letter);
      setCandourModalOpen(true);
    } catch (err) {
      setCandourError(err?.message ?? "Could not generate Duty of Candour letter.");
      setCandourModalOpen(true);
      setCandourLetterText("");
    } finally {
      setCandourLoadingId(null);
    }
  }

  function closeCandourModal() {
    setCandourModalOpen(false);
    setCandourLetterText("");
    setCandourError(null);
  }

  async function copyCandourLetter() {
    if (!candourLetterText.trim()) return;
    try {
      await navigator.clipboard.writeText(candourLetterText);
    } catch {
      setCandourError("Copy failed. Select the text and copy manually.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.patientId) return setError("Select a patient.");
    if (!form.incidentType) return setError("Select an incident type.");
    if (!form.severity) return setError("Select severity.");
    if (!form.description.trim()) return setError("Enter a description.");
    if (!form.immediateActions.trim()) return setError("Enter immediate actions taken.");
    if (!organisationId) {
      setError("Organisation context missing.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        organisationId,
        serviceId: currentServiceId ?? null,
        patientId: form.patientId,
        type: form.incidentType,
        severity: form.severity,
        description: form.description,
        immediateActions: form.immediateActions,
        cqcNotified: form.cqcNotified,
        status: form.status,
        whereOccurred: "Not captured in this form",
        whenOccurred: new Date().toISOString(),
        witnesses: "",
        cqcReferenceNumber: "",
        reportedBy: user?.email ?? user?.uid ?? "",
      };

      const created = await createIncident(payload);
      logAuditEventNonBlocking({
        organisationId,
        userId: user?.uid ?? "",
        userRole: "",
        serviceId: currentServiceId ?? undefined,
        action: "INCIDENT_CREATED",
        entityType: "INCIDENT",
        entityId: created.id,
        entityName: form.incidentType,
        previousValue: null,
        newValue: { ...payload, safeguardingHighPriority: created.safeguardingHighPriority, uiMode: "complete-incident-ui" },
      });

      setSuccess("Incident submitted successfully.");
      setForm({
        patientId: "",
        incidentType: "Fall",
        severity: "Low",
        description: "",
        immediateActions: "",
        cqcNotified: false,
        status: "Open",
      });
      await loadRecentIncidents();
    } catch (err) {
      setError(err?.message ?? "Could not submit incident.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Incidents & Safeguarding</h1>
      <p style={{ color: "#555", marginBottom: "1rem" }}>
        Capture incidents quickly and track safeguarding-related events.
      </p>

      {safeguardingSelected && (
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid #ef4444",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 600,
          }}
        >
          Statutory Notification to CQC Required under Regulation 18.
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginBottom: "1rem", color: "#b91c1c" }}>
          {error}
        </div>
      )}
      {success && (
        <div role="status" style={{ marginBottom: "1rem", color: "#166534" }}>
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Incident Form</h2>

        <label style={{ display: "block", marginBottom: 10 }}>
          Patient
          <select
            value={form.patientId}
            onChange={(e) => updateField("patientId", e.target.value)}
            disabled={loadingPatients || patients.length === 0}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Incident Type
          <select
            value={form.incidentType}
            onChange={(e) => updateField("incidentType", e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Severity
          <select
            value={form.severity}
            onChange={(e) => updateField("severity", e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          >
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Description
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          Immediate Actions Taken
          <textarea
            value={form.immediateActions}
            onChange={(e) => updateField("immediateActions", e.target.value)}
            rows={4}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={form.cqcNotified}
            onChange={(e) => updateField("cqcNotified", e.target.checked)}
          />
          CQC Notified
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "8px 12px",
              background: "#005eb8",
              color: "#fff",
              border: "none",
              borderRadius: 8,
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      <section
        aria-label="Recent incidents"
        style={{ marginTop: "1.25rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Recent Incidents</h2>
        {loadingIncidents ? (
          <p style={{ color: "#666", marginBottom: 0 }}>Loading incidents...</p>
        ) : recentIncidents.length === 0 ? (
          <p style={{ color: "#666", marginBottom: 0 }}>No incidents recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {recentIncidents.map((incident) => {
              const isOpen = String(incident.status ?? "").toLowerCase() === "open";
              const badgeLabel = isOpen ? "Open" : "Resolved";
              return (
                <div key={incident.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <strong>{incident.type || "Incident"}</strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isOpen ? "#fef2f2" : "#ecfdf5",
                        color: isOpen ? "#991b1b" : "#166534",
                        border: `1px solid ${isOpen ? "#fecaca" : "#bbf7d0"}`,
                      }}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#334155" }}>
                    Severity: {incident.severity || "N/A"} · Patient: {incident.patientId || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#475569", marginTop: 2 }}>
                    {incident.description || "No description"}
                  </div>
                  {isDutyOfCandourSeverity(incident.severity) && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleDraftCandourLetter(incident)}
                        disabled={candourLoadingId === incident.id}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: candourLoadingId === incident.id ? "wait" : "pointer",
                        }}
                      >
                        {candourLoadingId === incident.id ? "Drafting…" : "Draft Duty of Candour Letter"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {candourModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="candour-title-src"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0" }}>
              <h2 id="candour-title-src" style={{ margin: 0, fontSize: "1.1rem" }}>
                Duty of Candour letter (draft)
              </h2>
              <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Regulation 20 — edit before sending.
              </p>
            </div>
            <div style={{ padding: "1rem 1.25rem", flex: 1, overflow: "auto" }}>
              {candourError && !candourLetterText ? (
                <p role="alert" style={{ color: "#b91c1c", margin: 0 }}>
                  {candourError}
                </p>
              ) : (
                <textarea
                  value={candourLetterText}
                  onChange={(e) => setCandourLetterText(e.target.value)}
                  rows={18}
                  style={{
                    width: "100%",
                    minHeight: 280,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              )}
            </div>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={copyCandourLetter}
                disabled={!candourLetterText.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 600,
                }}
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={closeCandourModal}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#005eb8",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
