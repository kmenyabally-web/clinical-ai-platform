import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { fetchPatientsForEvidencePack } from "../services/evidencePackService";
import { createIncident, isHighPrioritySafeguarding } from "../services/incidentService";
import { generateIncidentLessons } from "../services/aiService";
import { logAuditEventNonBlocking } from "../services/auditService";

const INCIDENT_TYPES = [
  "Fall",
  "Medication Error",
  "Abuse Allegation",
  "Significant Injury",
  "Pressure Damage",
  "Missing Person",
  "Other",
];

function toLocalDatetimeValue(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export default function Incidents() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiLessons, setAiLessons] = useState("");

  const [form, setForm] = useState({
    patientId: "",
    type: "Fall",
    whereOccurred: "",
    whenOccurred: toLocalDatetimeValue(),
    description: "",
    witnesses: "",
    immediateActions: "",
    cqcNotified: false,
    cqcReferenceNumber: "",
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

  const safeguardingHighPriority = useMemo(
    () => isHighPrioritySafeguarding(form.type),
    [form.type]
  );

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (!form.patientId) return "Select a patient.";
      if (!form.type) return "Select an incident type.";
      if (!form.whereOccurred.trim()) return "Enter where the incident occurred.";
      if (!form.whenOccurred) return "Enter when the incident occurred.";
    }
    if (currentStep === 2) {
      if (!form.description.trim()) return "Describe what happened.";
      if (!form.immediateActions.trim()) return "Add immediate actions taken.";
    }
    if (currentStep === 3) {
      if (form.cqcNotified && !form.cqcReferenceNumber.trim()) {
        return "Enter the CQC reference number or untick notification.";
      }
    }
    return "";
  }

  function handleNext() {
    const msg = validateStep(step);
    setError(msg);
    if (!msg) setStep((s) => Math.min(4, s + 1));
  }

  function handleBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleAiIncidentReview() {
    setError("");
    setAiLessons("");
    const validationMessage = validateStep(2);
    if (validationMessage) {
      setError(`Complete key incident details first. ${validationMessage}`);
      return;
    }
    setAiLoading(true);
    try {
      const text = await generateIncidentLessons(form);
      setAiLessons(text);
    } catch (e) {
      setError(e?.message ?? "AI review failed.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const msg = validateStep(3);
    if (msg) {
      setError(msg);
      return;
    }
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
        type: form.type,
        description: form.description,
        witnesses: form.witnesses,
        immediateActions: form.immediateActions,
        cqcNotified: form.cqcNotified,
        cqcReferenceNumber: form.cqcReferenceNumber,
        status: form.status,
        whereOccurred: form.whereOccurred,
        whenOccurred: new Date(form.whenOccurred).toISOString(),
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
        entityName: form.type,
        previousValue: null,
        newValue: { ...payload, safeguardingHighPriority: created.safeguardingHighPriority },
      });

      setSuccess("Incident submitted successfully.");
      setStep(1);
      setAiLessons("");
      setForm({
        patientId: form.patientId,
        type: "Fall",
        whereOccurred: "",
        whenOccurred: toLocalDatetimeValue(),
        description: "",
        witnesses: "",
        immediateActions: "",
        cqcNotified: false,
        cqcReferenceNumber: "",
        status: "Open",
      });
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
        Record incidents with safeguarding and CQC notification tracking.
      </p>

      <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#334155" }}>
        Step {step} of 4
      </div>

      {safeguardingHighPriority && (
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 600,
          }}
        >
          High Priority Safeguarding event detected.
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

      <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem" }}>
        {step === 1 && (
          <>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Who / Where / When</h2>
            <label style={{ display: "block", marginBottom: 10 }}>
              Patient
              <select
                value={form.patientId}
                onChange={(e) => updateField("patientId", e.target.value)}
                disabled={loadingPatients || patients.length === 0}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
              >
                {patients.length === 0 ? (
                  <option value="">No patients available</option>
                ) : (
                  patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName || `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: 10 }}>
              Incident Type
              <select
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
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
              Where did it happen?
              <input
                type="text"
                value={form.whereOccurred}
                onChange={(e) => updateField("whereOccurred", e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
              />
            </label>

            <label style={{ display: "block", marginBottom: 10 }}>
              When did it happen?
              <input
                type="datetime-local"
                value={form.whenOccurred}
                onChange={(e) => updateField("whenOccurred", e.target.value)}
                style={{ display: "block", marginTop: 6, padding: 8 }}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>What happened?</h2>
            <label style={{ display: "block", marginBottom: 10 }}>
              Description
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={5}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Witnesses
              <input
                type="text"
                value={form.witnesses}
                onChange={(e) => updateField("witnesses", e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
                placeholder="Names or roles"
              />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Immediate actions taken
              <textarea
                value={form.immediateActions}
                onChange={(e) => updateField("immediateActions", e.target.value)}
                rows={4}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
              />
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>CQC Notification & Status</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={form.cqcNotified}
                onChange={(e) => updateField("cqcNotified", e.target.checked)}
              />
              Has the CQC been notified via the Portal?
            </label>

            {form.cqcNotified && (
              <label style={{ display: "block", marginBottom: 10 }}>
                CQC reference number
                <input
                  type="text"
                  value={form.cqcReferenceNumber}
                  onChange={(e) => updateField("cqcReferenceNumber", e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
                />
              </label>
            )}

            <label style={{ display: "block", marginBottom: 10 }}>
              Status
              <select
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
              >
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Closed">Closed</option>
              </select>
            </label>
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Review & AI Incident Review</h2>
            <p style={{ marginTop: 0, color: "#555" }}>
              Review details, then optionally run AI analysis for Regulation 17 lessons learned.
            </p>
            <div style={{ fontSize: "0.9rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div><strong>Type:</strong> {form.type}</div>
              <div><strong>When:</strong> {form.whenOccurred}</div>
              <div><strong>Where:</strong> {form.whereOccurred}</div>
              <div><strong>Status:</strong> {form.status}</div>
              <div><strong>CQC notified:</strong> {form.cqcNotified ? "Yes" : "No"}</div>
              <div><strong>Safeguarding:</strong> {safeguardingHighPriority ? "High Priority" : "Standard"}</div>
            </div>

            <button
              type="button"
              onClick={handleAiIncidentReview}
              disabled={aiLoading}
              style={{ padding: "8px 14px", border: "1px solid #93c5fd", background: "#eff6ff", borderRadius: 8, cursor: "pointer", marginBottom: 12 }}
            >
              {aiLoading ? "Reviewing..." : "AI Incident Review"}
            </button>

            {aiLessons && (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#0f172a",
                  color: "#f8fafc",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  margin: 0,
                }}
              >
                {aiLessons}
              </pre>
            )}
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {step > 1 && (
            <button type="button" onClick={handleBack} style={{ padding: "8px 12px" }}>
              Back
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={handleNext} style={{ padding: "8px 12px" }}>
              Next
            </button>
          ) : (
            <button type="submit" disabled={submitting} style={{ padding: "8px 12px", background: "#005eb8", color: "#fff", border: "none", borderRadius: 8 }}>
              {submitting ? "Submitting..." : "Submit Incident"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
