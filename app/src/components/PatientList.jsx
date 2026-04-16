/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY] + hospital / ward scope */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  createPatient,
  updatePatientDemographics,
  softDeletePatient,
  getPatientsByOrganisation,
  restorePatient,
} from "../services/patientService";
import { showToast } from "../utils/toast";
import { listWards, listWardsForOrganisation } from "../services/structureService";
import { logAuditEventNonBlocking } from "../services/auditService";
import { useOrganisation } from "../context/OrganisationContext";
import { isOrganisationAdminRole } from "../utils/organisationAdmin";
import { useStructure } from "../context/StructureContext";
import { useRole } from "../context/RoleContext";
import { patientMatchesHospitalFilter, patientMatchesWardFilter } from "../utils/patientScopeMatch";

export default function PatientList() {
  const { organisationId, organisation, isPlatformAdmin } = useOrganisation();
  const organisationName = organisation?.name ?? "";
  const {
    hospitals,
    wards,
    currentHospitalId,
    currentWardId,
    currentHospital,
    currentWard,
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
  const [editPatient, setEditPatient] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveConfirmPatient, setArchiveConfirmPatient] = useState(null);
  const [restoreConfirmPatient, setRestoreConfirmPatient] = useState(null);
  /** Full org ward list — used to resolve wardId → label even when the ward filter is narrowed. */
  const [allOrgWards, setAllOrgWards] = useState([]);

  const canManagePatients = isOrganisationAdminRole(role) || Boolean(isPlatformAdmin);

  const mayAddPatient = Boolean(organisationId) && canManagePatients;

  const load = useCallback(async () => {
    if (!organisationId) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (showArchived && canManagePatients) {
        const all = await getPatientsByOrganisation(organisationId, { includeArchived: true });
        let list = Array.isArray(all) ? all.filter((p) => p.isDeleted === true) : [];
        if (currentHospitalId) {
          list = list.filter((p) => patientMatchesHospitalFilter(p, currentHospitalId, currentHospital?.name));
        }
        if (currentWardId) {
          list = list.filter((p) => patientMatchesWardFilter(p, currentWardId, currentWard?.name));
        }
        setRows(list);
      } else {
        // Org-wide read then client-side hospital/ward filter — same source as Clinical Notes / dropdowns.
        // Avoids Firestore hospitalId queries on the org subcollection that can return empty while notes still load.
        const all = await getPatientsByOrganisation(organisationId, { includeArchived: false });
        let list = Array.isArray(all) ? all.filter((p) => p.isDeleted !== true) : [];
        if (currentHospitalId) {
          list = list.filter((p) => patientMatchesHospitalFilter(p, currentHospitalId, currentHospital?.name));
        }
        if (currentWardId) {
          list = list.filter((p) => patientMatchesWardFilter(p, currentWardId, currentWard?.name));
        }
        setRows(list);
      }
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [organisationId, currentHospitalId, currentWardId, currentHospital, currentWard, showArchived, canManagePatients]);

  useEffect(() => {
    if (structureLoading) return;
    load();
  }, [load, structureLoading]);

  useEffect(() => {
    if (!organisationId) {
      setAllOrgWards([]);
      return;
    }
    let cancelled = false;
    listWardsForOrganisation(organisationId)
      .then((list) => {
        if (!cancelled) setAllOrgWards(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setAllOrgWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const hospitalDisplayById = useMemo(() => {
    const m = new Map();
    for (const h of hospitals) {
      if (h?.id) m.set(String(h.id), String(h.name || "").trim() || String(h.id));
    }
    return m;
  }, [hospitals]);

  const wardDisplayById = useMemo(() => {
    const m = new Map();
    const source = allOrgWards.length > 0 ? allOrgWards : wards;
    for (const w of source) {
      if (w?.id) m.set(String(w.id), String(w.name || "").trim() || String(w.id));
    }
    return m;
  }, [allOrgWards, wards]);

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
        const fullName = (r.name || "").toString().toLowerCase();
        return (
          first.includes(normalizedTerm) ||
          last.includes(normalizedTerm) ||
          fullName.includes(normalizedTerm)
        );
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

      {!organisationId ? (
        <p style={styles.text}>Loading organisation…</p>
      ) : null}

      {organisationId && canManagePatients ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#334155" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived records only
        </label>
      ) : null}

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
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", flex: "1 1 auto" }}>
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
                disabled={structureLoading}
                style={styles.select}
              >
                <option value="">
                  {currentHospitalId ? "All wards in hospital" : "All wards in organisation"}
                </option>
                {wards.map((w) => {
                  const h = hospitals.find((x) => x.id === w.hospitalId);
                  const suffix = !currentHospitalId && h?.name ? ` · ${h.name}` : "";
                  return (
                    <option key={w.id} value={w.id}>
                      {(w.name || w.id) + suffix}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", flex: "0 0 auto" }}>
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
        </div>
      ) : null}

      {organisationId && !structureLoading && !isLoading && !error && rows.length === 0 && !isSearchActive ? (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 10,
            color: "#92400e",
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          No patients found for current organisation. If you expect data here, confirm each patient document includes a
          matching <code style={{ fontSize: 13 }}>organisationId</code> (for example your tenant id).
          <div style={{ marginTop: 6 }}>⚠️ No patients — check data path</div>
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

      {!organisationId ? null : structureLoading || isLoading ? (
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
              {canManagePatients ? <th style={styles.th}>Actions</th> : null}
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
                <td style={styles.td}>
                  {(r.hospitalName || "").trim() ||
                    hospitalDisplayById.get(String(r.hospitalId || "").trim()) ||
                    r.hospitalId ||
                    "—"}
                </td>
                <td style={styles.td}>
                  {(r.wardName || "").trim() ||
                    wardDisplayById.get(String(r.wardId || "").trim()) ||
                    r.wardId ||
                    "—"}
                </td>
                <td style={styles.td}>{formatDob(r.dob)}</td>
                {canManagePatients ? (
                  <td style={styles.td}>
                    {showArchived ? (
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={() => setRestoreConfirmPatient(r)}
                        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #86efac", background: "#ecfdf5", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                      >
                        Restore
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditPatient(r);
                            setEditError(null);
                          }}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => setArchiveConfirmPatient(r)}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
                        >
                          {deletingId === r.id ? "…" : "Archive"}
                        </button>
                      </div>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={canManagePatients ? 6 : 5}>
                  {isSearchActive
                    ? "No patients match your search criteria."
                    : "No patients registered yet"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {editPatient && organisationId && canManagePatients ? (
        <EditPatientModal
          organisationId={organisationId}
          organisationName={organisationName}
          patient={editPatient}
          hospitals={hospitals}
          wards={wards}
          onClose={() => {
            setEditPatient(null);
            setEditError(null);
          }}
          onSubmit={async (payload) => {
            if (!canManagePatients) return;
            setEditSaving(true);
            setEditError(null);
            try {
              await updatePatientDemographics(editPatient.id, payload);
              setEditPatient(null);
              await load();
              showToast("Patient updated", "success");
            } catch (err) {
              const msg = err?.message ?? "Failed to update patient.";
              setEditError(msg);
              showToast(msg);
            } finally {
              setEditSaving(false);
            }
          }}
          loading={editSaving}
          error={editError}
        />
      ) : null}

      {archiveConfirmPatient && organisationId && canManagePatients ? (
        <ConfirmModal
          title="Archive patient record?"
          body="This will archive the record. It can be restored later."
          confirmLabel="Archive"
          onCancel={() => setArchiveConfirmPatient(null)}
          onConfirm={async () => {
            const p = archiveConfirmPatient;
            setArchiveConfirmPatient(null);
            if (!p?.id) return;
            setDeletingId(p.id);
            try {
              await softDeletePatient(p.id);
              showToast("Record archived", "success");
              await load();
            } catch (err) {
              showToast(err?.message ?? "Could not archive patient.");
            } finally {
              setDeletingId(null);
            }
          }}
        />
      ) : null}

      {restoreConfirmPatient && organisationId && canManagePatients ? (
        <ConfirmModal
          title="Restore patient record?"
          body="This will make the record active again in patient lists."
          confirmLabel="Restore"
          onCancel={() => setRestoreConfirmPatient(null)}
          onConfirm={async () => {
            const p = restoreConfirmPatient;
            setRestoreConfirmPatient(null);
            if (!p?.id) return;
            setDeletingId(p.id);
            try {
              await restorePatient(p.id);
              showToast("Patient restored", "success");
              await load();
            } catch (err) {
              showToast(err?.message ?? "Could not restore patient.");
            } finally {
              setDeletingId(null);
            }
          }}
        />
      ) : null}

      {showCreate && organisationId && mayAddPatient ? (
        <CreatePatientModal
          organisationId={organisationId}
          organisationName={organisationName}
          hospitals={hospitals}
          wards={wards}
          defaultHospitalId={currentHospitalId}
          defaultWardId={currentWardId}
          onClose={() => {
            setShowCreate(false);
            setCreateError(null);
          }}
          onSubmit={async (payload) => {
            if (!canManagePatients) return;
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

function ConfirmModal({ title, body, confirmLabel, onCancel, onConfirm }) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={{ ...styles.modalCard, maxWidth: 400 }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{title}</h2>
        <p style={{ color: "#475569", fontSize: 14 }}>{body}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" onClick={onCancel} style={styles.secondaryBtn}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={styles.primaryBtn}>
            {confirmLabel}
          </button>
        </div>
      </div>
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
  const [hasLD, setHasLD] = useState(false);
  const [hasMentalHealth, setHasMentalHealth] = useState(false);
  const [hospitalId, setHospitalId] = useState(defaultHospitalId || "");
  const [wardId, setWardId] = useState(defaultWardId || "");
  const [wardOptions, setWardOptions] = useState(wards);

  React.useEffect(() => {
    setHospitalId(defaultHospitalId || "");
    setWardId(defaultWardId || "");
  }, [defaultHospitalId, defaultWardId]);

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
      hasLD,
      hasMentalHealth,
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
            <select
              required
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              disabled={!hospitalId?.trim()}
              style={styles.select}
            >
              <option value="">{hospitalId?.trim() ? "Select ward" : "Select hospital first"}</option>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              <input type="checkbox" checked={hasLD} onChange={(e) => setHasLD(e.target.checked)} />
              Learning disability (LD) pathway
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              <input type="checkbox" checked={hasMentalHealth} onChange={(e) => setHasMentalHealth(e.target.checked)} />
              Mental health pathway
            </label>
          </div>
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

function EditPatientModal({
  organisationId,
  organisationName,
  patient,
  hospitals,
  wards,
  onClose,
  onSubmit,
  loading,
  error,
}) {
  const [firstName, setFirstName] = useState(patient?.firstName ?? "");
  const [lastName, setLastName] = useState(patient?.lastName ?? "");
  const [dob, setDob] = useState(() => formatDob(patient?.dob));
  const [hasLD, setHasLD] = useState(Boolean(patient?.hasLD));
  const [hasMentalHealth, setHasMentalHealth] = useState(Boolean(patient?.hasMentalHealth));

  React.useEffect(() => {
    setFirstName(patient?.firstName ?? "");
    setLastName(patient?.lastName ?? "");
    setDob(formatDob(patient?.dob));
    setHasLD(Boolean(patient?.hasLD));
    setHasMentalHealth(Boolean(patient?.hasMentalHealth));
  }, [patient]);

  const hospitalName = hospitals.find((h) => h.id === patient?.hospitalId)?.name ?? patient?.hospitalName ?? "";
  const wardName = wards.find((w) => w.id === patient?.wardId)?.name ?? patient?.wardName ?? "";

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      dateOfBirth: dob || null,
      hasLD,
      hasMentalHealth,
    });
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Edit patient</h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }} aria-label="Close">
            ×
          </button>
        </div>
        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: "0.9rem" }}>
            {error}
          </p>
        ) : null}
        <form onSubmit={handleSubmit}>
          <label style={styles.lbl}>
            Organisation
            <input value={organisationName || organisationId} readOnly style={{ ...styles.input, background: "#f8fafc" }} />
          </label>
          <label style={styles.lbl}>
            Hospital (locked after creation)
            <input value={hospitalName || hospitalId || "—"} readOnly style={{ ...styles.input, background: "#f8fafc" }} />
          </label>
          <label style={styles.lbl}>
            Ward (locked after creation)
            <input value={wardName || wardId || "—"} readOnly style={{ ...styles.input, background: "#f8fafc" }} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              <input type="checkbox" checked={hasLD} onChange={(e) => setHasLD(e.target.checked)} />
              Learning disability (LD) pathway
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              <input type="checkbox" checked={hasMentalHealth} onChange={(e) => setHasMentalHealth(e.target.checked)} />
              Mental health pathway
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button type="submit" disabled={loading || hospitals.length === 0} style={styles.primaryBtn}>
              {loading ? "Saving…" : "Save changes"}
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
    padding: "4px 0 20px 0",
    fontFamily: "sans-serif",
    width: "100%",
    maxWidth: "none",
    margin: 0,
    boxSizing: "border-box",
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
