import { useState, useEffect, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useService } from "../context/ServiceContext";
import {
  fetchServices,
  createService,
  updateService,
} from "../services/servicesService";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

/**
 * Services page. Managers and Admins can view, create services, and assign managers.
 * Service managers (Manager/QualityLead) see only their assigned service(s).
 */
export default function Services() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const { can, role } = useRole();
  const { services, loading: contextLoading, refreshServices, isAdmin } = useService();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [assigningId, setAssigningId] = useState(null);
  const [assignManagerId, setAssignManagerId] = useState("");

  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;
  const canManage = can("audit:update");

  useEffect(() => {
    refreshServices();
  }, [refreshServices]);

  async function handleCreate() {
    if (!organisationId || !auditContext || !createName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await createService(
        organisationId,
        {
          serviceName: createName.trim(),
          serviceType: createType.trim(),
          location: createLocation.trim(),
        },
        auditContext
      );
      setCreateModal(false);
      setCreateName("");
      setCreateType("");
      setCreateLocation("");
      refreshServices();
    } catch (e) {
      setError(e?.message ?? "Failed to create service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignManager(serviceId) {
    if (!organisationId || !auditContext) return;
    setAssigningId(serviceId);
    setError(null);
    try {
      await updateService(
        organisationId,
        serviceId,
        { managerId: assignManagerId.trim() || null },
        auditContext
      );
      setAssignManagerId("");
      setAssigningId(null);
      refreshServices();
    } catch (e) {
      setError(e?.message ?? "Failed to update manager.");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>Services</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        {isAdmin
          ? "Manage services for your organisation. Assign a manager to restrict that service to their view."
          : "Services you are assigned to manage."}
      </p>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {canManage && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            style={{
              padding: "10px 20px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create service
          </button>
        </div>
      )}

      {createModal && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>New service</h2>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: 4 }}>Service name *</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. North Branch"
              style={{ width: "100%", maxWidth: 400, padding: "8px 12px" }}
            />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: 4 }}>Service type</label>
            <input
              type="text"
              value={createType}
              onChange={(e) => setCreateType(e.target.value)}
              placeholder="e.g. residential, domiciliary"
              style={{ width: "100%", maxWidth: 400, padding: "8px 12px" }}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: 4 }}>Location</label>
            <input
              type="text"
              value={createLocation}
              onChange={(e) => setCreateLocation(e.target.value)}
              placeholder="Optional"
              style={{ width: "100%", maxWidth: 400, padding: "8px 12px" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !createName.trim()}
              style={{
                padding: "8px 16px",
                background: "#2e7d32",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setCreateModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {contextLoading && services.length === 0 && <p style={{ color: "#666" }}>Loading…</p>}
      {!contextLoading && services.length === 0 && (
        <p style={{ color: "#666" }}>No services yet. Create one to get started.</p>
      )}

      {services.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {services.map((s) => (
            <li key={s.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{s.serviceName || "Unnamed service"}</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "#666" }}>
                    {s.serviceType && <span>{s.serviceType}</span>}
                    {s.location && <span> · {s.location}</span>}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#888" }}>
                    Manager: {s.managerId ? s.managerId : "Not assigned"}
                  </p>
                </div>
                {canManage && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Manager user ID"
                      value={assigningId === s.id ? assignManagerId : ""}
                      onChange={(e) => setAssignManagerId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAssignManager(s.id)}
                      style={{ padding: "6px 10px", width: 180 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAssignManager(s.id)}
                      disabled={assigningId === s.id}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                        background: "#37474f",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Assign manager
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
