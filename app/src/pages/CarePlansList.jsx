import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { listCarePlans } from "../services/carePlanManagementService";
import CreateCarePlanModal from "../components/CreateCarePlanModal";
import { createCarePlanRecord } from "../services/carePlanManagementService";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { formatUkDate } from "../utils/dateFormat";

export default function CarePlansList() {
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();
  const [carePlans, setCarePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [creatingError, setCreatingError] = useState(null);

  const load = useCallback(() => {
    if (!organisationId) {
      setCarePlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listCarePlans(organisationId, { serviceId: currentServiceId ?? undefined })
      .then((list) => setCarePlans(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load care plans."));
        setCarePlans([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentServiceName =
    currentServiceId && Array.isArray(services)
      ? services.find((s) => s?.id === currentServiceId)?.serviceName ||
        services.find((s) => s?.id === currentServiceId)?.name ||
        "Current service"
      : "All services";

  const serviceNameById = useMemo(() => {
    const map = {};
    (services ?? []).forEach((s) => {
      if (s?.id) {
        map[s.id] = s.serviceName || s.name || s.displayName || s.id;
      }
    });
    return map;
  }, [services]);

  const handleCreateCarePlan = async (payload) => {
    if (!organisationId) return;
    setCreating(true);
    setCreatingError(null);
    try {
      await createCarePlanRecord({
        organisationId,
        serviceId: currentServiceId ?? null,
        patientId: payload.patientId,
        careNeeds: payload.careNeeds,
        riskAssessment: payload.riskAssessment,
        supportStrategies: payload.supportStrategies,
        reviewDate: payload.reviewDate,
        createdBy: organisation?.name || "system",
      });
      setCreating(false);
      setCreatingError(null);
      load();
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
      setCreating(false);
      setCreatingError(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Firestore query failed:", err);
      setCreatingError(err?.message ?? "Failed to create care plan.");
      setCreating(false);
    }
  };

  const formatDate = (value) => {
    return formatUkDate(value, "—");
  };

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ marginTop: 0 }}>Care Plans</h1>
      {organisation?.name && (
        <p style={{ margin: "0 0 1rem 0", color: "#555", fontSize: "0.95rem" }}>
          {organisation.name}
          {currentServiceId ? ` · ${currentServiceName}` : ""}
        </p>
      )}

      {error && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {creatingError && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: 8, color: "#b91c1c" }}>
          {creatingError}
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setCreating(true)}
          style={{
            padding: "8px 16px",
            background: "#005eb8",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Create care plan
        </button>
      </div>

      {loading && <p style={{ color: "#666" }}>Loading…</p>}

      {!loading && !error && carePlans.length === 0 && (
        <p style={{ color: "#64748b", padding: "2rem", background: "#f8fafc", borderRadius: 12 }}>
          No records yet
        </p>
      )}

      {!loading && carePlans.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Patient</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Service</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Review Date</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Status</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Last Updated</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {carePlans.map((cp) => (
                <tr key={cp.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>{cp.patientId}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>
                    {cp.serviceId ? serviceNameById[cp.serviceId] || cp.serviceId : "Organisation level"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>{formatDate(cp.reviewDate)}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem", textTransform: "capitalize" }}>
                    {cp.status || "active"}
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>{formatDate(cp.updatedAt)}</td>
                  <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem" }}>
                    <Link to={`/care-plans/${cp.id}`} style={{ color: "#2563eb", textDecoration: "none", fontSize: "0.85rem" }}>
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCarePlanModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={handleCreateCarePlan}
        loading={creating}
      />
    </div>
  );
}
