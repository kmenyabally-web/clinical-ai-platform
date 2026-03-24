/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY] + hospital / ward scope */

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listPatients, createPatient } from "../services/patientService";
import { listWards } from "../services/structureService";
import { logAuditEventNonBlocking } from "../services/auditService";
import { useOrganisation } from "../context/OrganisationContext";
import { useStructure } from "../context/StructureContext";
import { useRole } from "../context/RoleContext";

export default function PatientList() {
  const { organisationId, organisation } = useOrganisation();
  const {
    hospitals,
    wards,
    currentHospitalId,
    currentWardId,
    setCurrentHospitalId,
    setCurrentWardId,
    loading: structureLoading,
  } = useStructure();
  const { role } = useRole();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const mayAddPatient =
    Boolean(organisationId) && role && !["Auditor", "Inspector"].includes(role);

  const load = useCallback(async () => {
    if (!organisationId) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const filters = {};
      if (currentHospitalId) filters.hospitalId = currentHospitalId;
      if (currentWardId) filters.wardId = currentWardId;
      const data = await listPatients(filters);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [organisationId, currentHospitalId, currentWardId]);

  useEffect(() => {
    if (structureLoading) return;
    load();
  }, [load, structureLoading]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const normalizedTerm = (debouncedSearchTerm || "").trim().toLowerCase();
  const isSearchActive = normalizedTerm.length > 0;

  const filteredRows = !isSearchActive
    ? rows
    : rows.filter((r) => {
        const first = (r.firstName || "").toString().toLowerCase();
        const last = (r.lastName || "").toString().toLowerCase();
        return first.includes(normalizedTerm) || last.includes(normalizedTerm);
      });

  useEffect(() => {
    if (!isSearchActive) return;
    logAuditEventNonBlocking({
      action: "PATIENT_SEARCH",
      metadata: {
        searchTerm: debouncedSearchTerm,
        resultCount: filteredRows.length,
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <span style={styles.badge}>Stage 3</span>
        <span style={styles.subtitle}>Hospital-scoped metadata</span>
        {isSearchActive ? <span style={styles.searchBadge}>Search Active</span> : null}
      </div>

      <h2 style={styles.title}>Patient list</h2>

      {organisationId ? (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "#f8fafc",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 800 }}>
            Hospital
            <select
              value={currentHospitalId ?? ""}
              onChange={(e) => setCurrentHospitalId(e.target.value || null)}
              style={styles.select}
            >
              <option value="">All hospitals</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name || h.id}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 800 }}>
            Ward
            <select
              value={currentWardId ?? ""}
              onChange={(e) => setCurrentWardId(e.target.value || null)}
              disabled={!currentHospitalId}
              style={styles.select}
            >
              <option value="">{currentHospitalId ? "All wards in hospital" : "Select hospital first"}</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name || w.id}
                </option>
              ))}
            </select>
          </label>
          {mayAddPatient ? (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setCreateError(null);
              }}
              style={styles.addBtn}
            >
              Add patient
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#64748b", maxWidth: 280 }}>
              Your role does not include creating patients (e.g. Inspector).
            </span>
          )}
        </div>
      ) : null}

      <div style={styles.searchRow}>
        <label style={styles.searchLabel} htmlFor="patientSearch">
          Search
        </label>
        <input
          id="patientSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type a first or last name…"
          style={styles.searchInput}
        />
      </div>

      {structureLoading || isLoading ? (
        <p style={styles.text}>Loading patient metadata…</p>
      ) : error ? (
        <div style={styles.errorBox}>
          <div style={styles.errorTitle}>Governance / Access Error</div>
          <div style={styles.errorText}>{error?.message || String(error)}</div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>First name</th>
              <th style={styles.th}>Last name</th>
              <th style={styles.th}>Hospital</th>
              <th style={styles.th}>Ward</th>
              <th style={styles.th}>DOB</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link to={`/patients/${r.id}`} style={styles.nameLink}>
                    {r.firstName}
                  </Link>
                </td>
                <td style={styles.td}>
                  <Link to={`/patients/${r.id}`} style={styles.nameLink}>
                    {r.lastName}
                  </Link>
                </td>
                <td style={styles.td}>{r.hospitalName || r.hospitalId || "—"}</td>
                <td style={styles.td}>{r.wardName || r.wardId || "—"}</td>
                <td style={styles.td}>{formatDob(r.dob)}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={5}>
                  {isSearchActive
                    ? "No patients match your search criteria."
                    : "No patients found for this scope."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {showCreate && organisationId && mayAddPatient ? (
        <CreatePatientModal
          organisationId={organisationId}
          hospitals={hospitals}
          wards={wards}
          defaultHospitalId={currentHospitalId}
          defaultWardId={currentWardId}
          onClose={() => {
            setShowCreate(false);
            setCreateError(null);
          }}
          onSubmit={async (payload) => {
            setCreating(true);
            setCreateError(null);
            try {
              await createPatient(payload);
              setShowCreate(false);
              await load();
            } catch (err) {
              setCreateError(err?.message ?? "Failed to create patient.");
            } finally {
              setCreating(false);
            }
          }}
          loading={creating}
          error={createError}
        />
      ) : null}
    </div>
  );
}

function CreatePatientModal({
  organisationId,
  organisationName,
  hospitals,
  wards,
  defaultHospitalId,
  defaultWardId,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [hospitalId, setHospitalId] = useState(defaultHospitalId || "");
  const [wardId, setWardId] = useState(defaultWardId || "");
  const [wardOptions, setWardOptions] = useState(wards);

  React.useEffect(() => {
    setWardOptions(wards);
  }, [wards]);

  React.useEffect(() => {
    if (!organisationId || !hospitalId?.trim()) {
      setWardOptions([]);
      setWardId("");
      return;
    }
    let cancelled = false;
    listWards(organisationId, hospitalId)
      .then((list) => {
        if (!cancelled) setWardOptions(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setWardOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId, hospitalId]);

  const hospitalName = hospitals.find((h) => h.id === hospitalId)?.name ?? "";
  const wardName = wardOptions.find((w) => w.id === wardId)?.name ?? "";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hospitalId?.trim() || !wardId?.trim()) return;
    onSubmit({
      organisationId,
      hospitalId,
      wardId,
      hospitalName,
      wardName,
      firstName,
      lastName,
      dateOfBirth: dob || null,
      gender: "",
      nhsNumber: "",
    });
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Add patient</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">
            ×
          </button>
        </div>
        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.9rem" }}>
            {error}
          </p>
        ) : null}
        {hospitals.length === 0 ? (
          <div
            style={{
              padding: "12px 14px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
              marginBottom: 12,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <strong>No hospitals in this organisation yet.</strong> Add a hospital and at least one ward under{" "}
            <Link to="/management/hospitals" style={{ color: "#005eb8", fontWeight: 800 }}>
              Management → Hospitals
            </Link>{" "}
            before registering patients.
          </div>
        ) : null}
        <form onSubmit={handleSubmit}>
          <label style={styles.lbl}>
            Organisation
            <input readOnly value={organisationName || organisationId} style={{ ...styles.input, background: "#f8fafc" }} />
          </label>
          <label style={styles.lbl}>
            Hospital *
            <select
              required
              value={hospitalId}
              onChange={(e) => {
                const v = e.target.value;
                setHospitalId(v);
                setWardId("");
              }}
              style={styles.select}
            >
              <option value="">Select hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.lbl}>
            Ward *
            <select required value={wardId} onChange={(e) => setWardId(e.target.value)} style={styles.select}>
              <option value="">Select ward</option>
              {wardOptions.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.lbl}>
            First name
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.lbl}>
            Last name
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.lbl}>
            Date of birth
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={styles.input} />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={loading || hospitals.length === 0} style={styles.primaryBtn}>
              {loading ? "Saving…" : "Create"}
            </button>
            <button type="button" onClick={onClose} style={styles.secondaryBtn}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDob(value) {
  if (!value) return "";
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return "";
}

const styles = {
  container: {
    padding: 20,
    fontFamily: "sans-serif",
    maxWidth: 960,
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e0f2fe",
    color: "#075985",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    color: "#334155",
    fontWeight: 600,
  },
  searchBadge: {
    display: "inline-block",
    backgroundColor: "#fff7ed",
    color: "#9a3412",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 14px 0",
    color: "#0f172a",
  },
  text: {
    color: "#334155",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  searchRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    minWidth: 56,
  },
  searchInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 13,
  },
  select: {
    minWidth: 200,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 13,
  },
  addBtn: {
    padding: "10px 16px",
    background: "#005eb8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 13,
  },
  tr: {},
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontSize: 13,
  },
  nameLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 800,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
  },
  errorTitle: {
    fontWeight: 800,
    color: "#991b1b",
    marginBottom: 6,
  },
  errorText: {
    color: "#7f1d1d",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
  },
  modalCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "1.25rem 1.5rem",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
  },
  lbl: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: "#0f172a",
  },
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  },
  primaryBtn: {
    padding: "8px 16px",
    background: "#005eb8",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 16px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    cursor: "pointer",
  },
};
