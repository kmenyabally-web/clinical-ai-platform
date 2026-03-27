import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { listPatients, createPatient } from "../services/patientService";
import { useRole } from "../context/RoleContext";
import { requireAdminRole } from "../lib/requireAdminAction";
import { isIndexError, INDEX_ERROR_MESSAGE } from "../lib/firestoreIndexError";
import { formatUkDate } from "../utils/dateFormat";
import ActionBar from "../components/ActionBar";

function formatDate(value) {
  return formatUkDate(value, "—");
}

export default function Patients() {
  const { organisationId, organisation } = useOrganisation();
  const { role } = useRole();
  const { currentServiceId, services } = useService();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = useCallback(() => {
    if (!organisationId) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listPatients(organisationId, { serviceId: currentServiceId ?? undefined })
      .then((list) => setPatients(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error("Firestore query failed:", err);
        setError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to load patients."));
        setPatients([]);
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

  return (
    <div style={styles.page}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Patients</h1>
          <p style={{ margin: 0, color: "#555", fontSize: "0.95rem" }}>
            {organisation?.name ? `${organisation.name}${currentServiceId ? ` · ${currentServiceName}` : ""}` : "Manage patients for this organisation."}
          </p>
        </div>
      </div>

      <ActionBar
        actions={[
          {
            label: "➕ Add Patient",
            onClick: () => {
              setShowCreateModal(true);
              setCreateError(null);
            },
          },
        ]}
      />

      {error && (
        <div role="alert" style={styles.errorAlert}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#666" }}>Loading patients…</p>}

      {!loading && !error && patients.length === 0 && (
        <div style={styles.emptyState}>
          <p style={{ marginTop: 0 }}>No patients yet.</p>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setCreateError(null);
            }}
            style={styles.emptyStateButton}
          >
            Create first patient
          </button>
        </div>
      )}

      {!loading && patients.length > 0 && (
        <ul style={styles.list}>
          {patients.map((p) => (
            <li
              key={p.id}
              style={styles.listItem}
            >
              <div>
                <strong style={{ fontSize: "1rem" }}>{p.name || "Unnamed patient"}</strong>
                <span style={{ marginLeft: 12, color: "#64748b", fontSize: "0.875rem" }}>
                  DOB: {formatDate(p.dateOfBirth)}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link
                  to={`/patients/${p.id}`}
                  style={{ padding: "8px 16px", background: "#f1f5f9", borderRadius: 8, textDecoration: "none", color: "#334155", fontSize: "0.875rem" }}
                >
                  View
                </Link>
                <Link
                  to={`/patients/${p.id}/timeline`}
                  style={{ padding: "8px 16px", background: "#e0f2fe", borderRadius: 8, textDecoration: "none", color: "#0369a1", fontSize: "0.875rem" }}
                >
                  Timeline
                </Link>
                <Link
                  to={`/patients/${p.id}/care-plans`}
                  style={{ padding: "8px 16px", background: "#dcfce7", borderRadius: 8, textDecoration: "none", color: "#166534", fontSize: "0.875rem" }}
                >
                  Care plans
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreateModal && (
        <CreatePatientModal
          organisationId={organisationId}
          currentServiceId={currentServiceId}
          services={services ?? []}
          onClose={() => { setShowCreateModal(false); setCreateError(null); }}
          onSubmit={async (data) => {
            if (!requireAdminRole(role)) return;
            setCreating(true);
            setCreateError(null);
            try {
              await createPatient({
                organisationId,
                serviceId: data.serviceId || currentServiceId || null,
                firstName: data.firstName,
                lastName: data.lastName,
                dateOfBirth: data.dateOfBirth || null,
                gender: data.gender,
                nhsNumber: data.nhsNumber,
              });
              setShowCreateModal(false);
              load();
            } catch (err) {
              console.error("Firestore query failed:", err);
              setCreateError(isIndexError(err) ? INDEX_ERROR_MESSAGE : (err?.message ?? "Failed to create patient."));
            } finally {
              setCreating(false);
            }
          }}
          loading={creating}
          error={createError}
        />
      )}
    </div>
  );
}

const styles = {
  page: {
    width: "100%",
    padding: 24,
  },
  errorAlert: {
    marginBottom: "1rem",
    padding: "1rem",
    background: "#fef2f2",
    borderRadius: 10,
    border: "1px solid #fecaca",
    color: "#b91c1c",
  },
  emptyState: {
    color: "#64748b",
    padding: "2rem",
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
  },
  emptyStateButton: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#005eb8",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    background: "#ffffff",
  },
  listItem: {
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
};

function CreatePatientModal({ organisationId, currentServiceId, services, onClose, onSubmit, loading, error }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nhsNumber, setNhsNumber] = useState("");
  const [serviceId, setServiceId] = useState(currentServiceId || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ firstName, lastName, dateOfBirth: dateOfBirth || null, gender, nhsNumber, serviceId: serviceId || null });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem 1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Add Patient</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">×</button>
        </div>
        {error && <p role="alert" style={{ color: "#b91c1c", marginBottom: "0.75rem", fontSize: "0.9rem" }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Gender</label>
            <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="Optional" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>NHS number</label>
            <input value={nhsNumber} onChange={(e) => setNhsNumber(e.target.value)} placeholder="Optional" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>Service</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
              <option value="">Organisation level</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.serviceName || s.name || s.id}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#005eb8", color: "#fff", fontWeight: 600, cursor: loading ? "default" : "pointer" }}>{loading ? "Saving…" : "Add Patient"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
