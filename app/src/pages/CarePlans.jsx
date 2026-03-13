import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import CarePlanEditor from "../components/CarePlanEditor";
import { fetchCarePlans, createCarePlan, updateCarePlan } from "../services/carePlanService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";

function formatDate(value) {
  if (!value) return "—";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleDateString();
    } catch {
      return "—";
    }
  }
  const d = new Date(value);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export default function CarePlans() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [carePlans, setCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const currentServiceName = useMemo(() => {
    if (!Array.isArray(services) || services.length === 0) return "No service selected";
    const match = services.find((s) => s?.id === currentServiceId) ?? services[0];
    return match?.serviceName || match?.name || "Service";
  }, [services, currentServiceId]);

  const selectedPlan = useMemo(
    () => carePlans.find((p) => p.id === selectedId) ?? null,
    [carePlans, selectedId]
  );

  const loadPlans = useCallback(() => {
    if (!organisationId || !patientId) {
      setCarePlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCarePlans(organisationId, patientId, currentServiceId ?? null)
      .then((list) => setCarePlans(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load care plans."));
        setCarePlans([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, patientId, currentServiceId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  async function handleSave(payload) {
    if (!organisationId || !patientId || !currentServiceId || !user?.uid) return;
    setSaving(true);
    setError(null);
    try {
      if (selectedPlan) {
        await updateCarePlan({
          id: selectedPlan.id,
          organisationId,
          serviceId: currentServiceId,
          patientId,
          title: payload.title,
          description: payload.description,
          goals: payload.goals,
          interventions: payload.interventions,
          reviewDate: payload.reviewDate,
          updatedBy: user.email || user.uid,
        });
      } else {
        await createCarePlan({
          organisationId,
          serviceId: currentServiceId,
          patientId,
          title: payload.title,
          description: payload.description,
          goals: payload.goals,
          interventions: payload.interventions,
          reviewDate: payload.reviewDate,
          createdBy: user.email || user.uid,
        });
      }
      setSelectedId(null);
      loadPlans();
    } catch (err) {
      console.error("Failed to save care plan", err);
      setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to save care plan."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: "1.5rem" }}
      >
        <div>
          <h1 style={{ margin: 0, marginBottom: "0.25rem" }}>Care Plans</h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
            Manage care plans and reviews for the patient.
          </p>
          <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.85rem", color: "#777" }}>
            Patient ID: <code>{patientId ?? "Unknown"}</code>
            {patientId && (
              <Link
                to={`/patients/${patientId}/timeline`}
                style={{
                  marginLeft: "0.75rem",
                  color: "#2563eb",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                }}
              >
                View Timeline
              </Link>
            )}
          </p>
          <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.85rem", color: "#777" }}>
            Service: {currentServiceName}
          </p>
          {organisation && (
            <p style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.85rem", color: "#777" }}>
              Organisation: {organisation.name ?? organisation.id ?? "—"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#005eb8",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Create Care Plan
        </button>
      </div>

      {loading && (
        <section aria-busy="true">
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              color: "#666",
            }}
          >
            Loading care plans…
          </div>
        </section>
      )}

      {!loading && error && (
        <section style={{ marginTop: "0.75rem" }}>
          <div
            role="alert"
            style={{
              background: "#ffebee",
              border: "1px solid #ef9a9a",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              color: "#b71c1c",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        </section>
      )}

      <section
        style={{
          marginTop: "1rem",
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1rem", margin: 0, marginBottom: "0.5rem" }}>Existing plans</h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#fff",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              + New plan
            </button>
          </div>
          {carePlans.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
              No records yet
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {carePlans.map((plan) => (
                <li
                  key={plan.id}
                  style={{
                    padding: "0.5rem 0.25rem",
                    borderTop: "1px solid #e5e7eb",
                    cursor: "pointer",
                    color: selectedId === plan.id ? "#0f172a" : "#334155",
                    fontWeight: selectedId === plan.id ? 600 : 400,
                  }}
                  onClick={() => setSelectedId(plan.id)}
                >
                  <div>{plan.title || "Untitled plan"}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Review: {formatDate(plan.reviewDate)} · Updated: {formatDate(plan.updatedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            padding: "1rem 1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", margin: 0, marginBottom: "0.5rem" }}>
            {selectedPlan ? "Edit care plan" : "New care plan"}
          </h2>
          <CarePlanEditor carePlan={selectedPlan} onSave={handleSave} loading={saving} />
        </div>
      </section>
    </div>
  );
}

