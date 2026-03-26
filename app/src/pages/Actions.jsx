import { useState, useEffect, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { fetchComplianceActions, fetchComplianceDomains, createComplianceAction, updateComplianceAction } from "../services/complianceService";
import { Timestamp } from "firebase/firestore";
import ActionTable from "../components/ActionTable";
import CreateActionModal from "../components/CreateActionModal";

/**
 * Compliance Actions page. Lists all actions for the current organisation.
 * RBAC: Auditor read-only; Staff create + update status; Manager assign + manage; Admin full.
 */
export default function Actions() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();
  const { role, can } = useRole();
  const [actions, setActions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;

  const canCreate = can("audit:create");
  const canUpdateStatus = can("audit:create") || can("audit:update");

  const load = useCallback(() => {
    if (!organisationId) {
      setActions([]);
      setDomains([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetchComplianceActions(organisationId, { limitCount: 200, serviceId: currentServiceId }),
      fetchComplianceDomains(organisationId, currentServiceId),
    ])
      .then(([actionsList, domainsList]) => {
        setActions(actionsList ?? []);
        setDomains(domainsList ?? []);
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to load actions.");
        setActions([]);
        setDomains([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleCreate(payload) {
    if (!organisationId || !auditContext) return;
    setCreateLoading(true);
    const data = {
      ...payload,
      dueDate: payload.dueDate instanceof Date ? Timestamp.fromDate(payload.dueDate) : payload.dueDate,
    };
    createComplianceAction(organisationId, data, auditContext, currentServiceId)
      .then(() => {
        setModalOpen(false);
        load();
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to create action.");
      })
      .finally(() => setCreateLoading(false));
  }

  function handleStatusChange(action, newStatus) {
    if (!organisationId || !auditContext) return;
    setUpdatingId(action.id);
    updateComplianceAction(organisationId, action.id, { status: newStatus }, auditContext)
      .then(() => load())
      .catch((err) => {
        setError(err?.message ?? "Failed to update status.");
      })
      .finally(() => setUpdatingId(null));
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ margin: 0 }}>Compliance actions</h1>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "8px 16px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            New action
          </button>
        )}
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p aria-busy="true">Loading actions…</p>
      ) : (
        <>
          <ActionTable
            actions={actions}
            domains={domains}
            canUpdateStatus={canUpdateStatus}
            onStatusChange={handleStatusChange}
            updatingId={updatingId}
          />
        </>
      )}

      <CreateActionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        domains={domains}
        onSubmit={handleCreate}
        loading={createLoading}
      />
    </div>
  );
}
