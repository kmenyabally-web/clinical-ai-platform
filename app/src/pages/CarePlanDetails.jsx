import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { getCarePlanById, listCarePlanVersions, updateCarePlanRecord } from "../services/carePlanManagementService";
import { listStaffTraining, countValidStaffByTraining } from "../services/staffTrainingService";
import { getCompetencyGapWarning } from "../services/aiService";
import { getPatientById } from "../services/patientService";
import { formatUkDate } from "../utils/dateFormat";

function formatDate(value) {
  return formatUkDate(value, "—");
}

export default function CarePlanDetails() {
  const { carePlanId } = useParams();
  const { organisationId } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [carePlan, setCarePlan] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [careNeeds, setCareNeeds] = useState("");
  const [riskAssessment, setRiskAssessment] = useState("");
  const [supportStrategies, setSupportStrategies] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [status, setStatus] = useState("active");

  const [competencyWarning, setCompetencyWarning] = useState(null);
  const [competencyLoading, setCompetencyLoading] = useState(false);

  const serviceNameById = useMemo(() => {
    const map = {};
    (services ?? []).forEach((s) => {
      if (s?.id) {
        map[s.id] = s.serviceName || s.name || s.displayName || s.id;
      }
    });
    return map;
  }, [services]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!organisationId || !carePlanId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [cp, vers] = await Promise.all([
          getCarePlanById(organisationId, carePlanId),
          listCarePlanVersions(organisationId, carePlanId, { limitCount: 20 }),
        ]);
        if (cancelled) return;
        setCarePlan(cp);
        setVersions(Array.isArray(vers) ? vers : []);
        if (cp) {
          setCareNeeds(cp.careNeeds || "");
          setRiskAssessment(cp.riskAssessment || "");
          setSupportStrategies(cp.supportStrategies || "");
          if (cp.reviewDate) {
            const d = typeof cp.reviewDate.toDate === "function" ? cp.reviewDate.toDate() : new Date(cp.reviewDate);
            // eslint-disable-next-line no-restricted-globals
            setReviewDate(isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));
          } else {
            setReviewDate("");
          }
          setStatus(cp.status || "active");
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Firestore query failed:", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to load care plan.");
          setCarePlan(null);
          setVersions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [organisationId, carePlanId]);

  useEffect(() => {
    let cancelled = false;
    async function runMatch() {
      if (!organisationId || !carePlan?.patientId) {
        setCompetencyWarning(null);
        return;
      }
      setCompetencyLoading(true);
      setCompetencyWarning(null);
      try {
        const [patient, trainingRows] = await Promise.all([
          getPatientById(carePlan.patientId).catch(() => null),
          listStaffTraining(organisationId, currentServiceId ?? null),
        ]);
        if (cancelled) return;
        const validCounts = countValidStaffByTraining(trainingRows);
        const displayName = patient
          ? `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() || carePlan.patientId
          : carePlan.patientId;
        const msg = await getCompetencyGapWarning({
          patientDisplayName: displayName,
          careNeeds,
          riskAssessment,
          supportStrategies,
          planContent: "",
          validCountsByTraining: validCounts,
        });
        if (!cancelled) setCompetencyWarning(msg);
      } catch {
        if (!cancelled) setCompetencyWarning(null);
      } finally {
        if (!cancelled) setCompetencyLoading(false);
      }
    }
    runMatch();
    return () => {
      cancelled = true;
    };
  }, [organisationId, carePlan?.id, carePlan?.patientId, careNeeds, riskAssessment, supportStrategies, currentServiceId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!organisationId || !carePlanId || !carePlan?.patientId) return;
    setSaving(true);
    setError(null);
    try {
      await updateCarePlanRecord({
        organisationId,
        id: carePlanId,
        serviceId: currentServiceId ?? carePlan.serviceId ?? null,
        patientId: carePlan.patientId,
        careNeeds,
        riskAssessment,
        supportStrategies,
        reviewDate: reviewDate ? new Date(reviewDate) : null,
        status,
        updatedBy: "web-ui",
      });
      const latest = await getCarePlanById(organisationId, carePlanId);
      const vers = await listCarePlanVersions(organisationId, carePlanId, { limitCount: 20 });
      setCarePlan(latest);
      setVersions(Array.isArray(vers) ? vers : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Firestore query failed:", err);
      setError(err?.message ?? "Failed to update care plan.");
    } finally {
      setSaving(false);
    }
  };

  if (!organisationId) {
    // Layout guard will already show "No organisation selected."
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "#666" }}>Loading care plan…</p>
      </div>
    );
  }

  if (!carePlan) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
          No records yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginTop: 0 }}>Care Plan Details</h1>
      <p style={{ margin: "0 0 0.5rem 0", color: "#555", fontSize: "0.95rem" }}>
        Patient: <strong>{carePlan.patientId}</strong>
      </p>
      <p style={{ margin: "0 0 1rem 0", color: "#555", fontSize: "0.95rem" }}>
        Service:{" "}
        <strong>
          {carePlan.serviceId ? serviceNameById[carePlan.serviceId] || carePlan.serviceId : "Organisation level"}
        </strong>
      </p>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: "#fef2f2",
            borderRadius: 12,
            border: "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      {(competencyLoading || competencyWarning) && (
        <div
          role="status"
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            background: competencyWarning ? "#fffbeb" : "#f8fafc",
            borderRadius: 12,
            border: `1px solid ${competencyWarning ? "#fde68a" : "#e2e8f0"}`,
            color: competencyWarning ? "#92400e" : "#64748b",
            fontWeight: 700,
            fontSize: "0.95rem",
          }}
        >
          {competencyLoading && !competencyWarning
            ? "Checking staff training coverage against this care plan…"
            : competencyWarning || ""}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <form onSubmit={handleSave}>
          <h2 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.75rem" }}>Current care plan</h2>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Care Needs</label>
            <textarea
              value={careNeeds}
              onChange={(e) => setCareNeeds(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Risk Assessment</label>
            <textarea
              value={riskAssessment}
              onChange={(e) => setRiskAssessment(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Support Strategies</label>
            <textarea
              value={supportStrategies}
              onChange={(e) => setSupportStrategies(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 180px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Review Date</label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              />
            </div>
            <div style={{ flex: "0 0 160px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
              >
                <option value="active">Active</option>
                <option value="review_due">Review due</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.75rem" }}>
            Version: <strong>{carePlan.version ?? 1}</strong> · Last updated {formatDate(carePlan.updatedAt)}
          </p>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#005eb8",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div>
          <h2 style={{ fontSize: "1rem", marginTop: 0, marginBottom: "0.75rem" }}>Version history</h2>
          {versions.length === 0 ? (
            <p style={{ color: "#64748b", padding: "1.5rem", background: "#f8fafc", borderRadius: 12 }}>No records yet</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {versions.map((v) => (
                <li
                  key={v.id}
                  style={{
                    padding: "0.5rem 0.25rem",
                    borderTop: "1px solid #e5e7eb",
                    fontSize: "0.85rem",
                    color: "#334155",
                  }}
                >
                  <div>
                    Version <strong>{v.version}</strong> ·{" "}
                    <span>{formatDate(v.updatedAt || v.createdAt)}</span>
                  </div>
                  <div style={{ color: "#64748b" }}>Snapshot by {v.snapshotBy || "—"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

