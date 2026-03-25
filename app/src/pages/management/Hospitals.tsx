import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganisation } from "../../context/OrganisationContext";
import { listOrganisationsForManagement } from "../../services/organisation";
import { createHospital, listAllHospitals, listHospitals } from "../../services/structureService";
import { managementStyles as s } from "./managementStyles";
import ActionBar from "../../components/ActionBar";

export default function Hospitals() {
  const { organisationId, isPlatformAdmin } = useOrganisation();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgFilter, setOrgFilter] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; name: string; organisationId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [modalOrgId, setModalOrgId] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveOrgFilter = isPlatformAdmin ? orgFilter : organisationId ?? "";

  const loadOrgs = useCallback(async () => {
    const list = await listOrganisationsForManagement(!!isPlatformAdmin, organisationId ?? null);
    setOrgs((list ?? []).map((o) => ({ id: o.id, name: o.name || o.id })));
    if (!isPlatformAdmin && organisationId) {
      setOrgFilter(organisationId);
    }
  }, [isPlatformAdmin, organisationId]);

  const loadHospitals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPlatformAdmin && !effectiveOrgFilter?.trim()) {
        const all = await listAllHospitals();
        setRows(Array.isArray(all) ? all : []);
        return;
      }
      if (!effectiveOrgFilter?.trim()) {
        setRows([]);
        return;
      }
      const list = await listHospitals(effectiveOrgFilter.trim());
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load hospitals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgFilter, isPlatformAdmin]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) loadOrgs();
  }, [loadOrgs, isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) loadHospitals();
  }, [loadHospitals, isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (isPlatformAdmin && orgs.length && !orgFilter) {
      setOrgFilter(orgs[0].id);
    }
  }, [isPlatformAdmin, orgs, orgFilter]);

  function openHospitalModal() {
    if (!effectiveOrgFilter?.trim()) return;
    setModalOpen(true);
    setModalOrgId(effectiveOrgFilter || "");
    setName("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const oid = modalOrgId.trim();
    if (!name.trim() || !oid) return;
    setSaving(true);
    setError(null);
    try {
      await createHospital(oid, { name: name.trim() });
      setModalOpen(false);
      setName("");
      await loadHospitals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hospital.");
    } finally {
      setSaving(false);
    }
  }

  if (!isPlatformAdmin && !organisationId) {
    return <Navigate to="/create-organisation" replace />;
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Hospitals</h1>
      <p style={s.muted}>Register hospitals and scope them to an organisation.</p>

      <ActionBar
        actions={[
          {
            label: "➕ Add Hospital",
            onClick: openHospitalModal,
          },
        ]}
      />

      {error ? (
        <p role="alert" style={s.alert}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
        {isPlatformAdmin ? (
          <label style={{ ...s.label, marginBottom: 0 }}>
            Organisation
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              style={s.select}
            >
              <option value="">All organisations</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span style={s.muted}>
            Organisation: <strong>{orgs.find((o) => o.id === organisationId)?.name ?? organisationId}</strong>
          </span>
        )}
      </div>

      {isPlatformAdmin && !orgFilter ? (
        <p style={s.muted}>Select an organisation to filter, or view all hospitals.</p>
      ) : null}

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Organisation ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>
                  <code style={{ fontSize: 12 }}>{r.organisationId}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={s.td} colSpan={2}>
                  No hospitals yet. Add a hospital for this organisation.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {modalOpen ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="add-hosp-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="add-hosp-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Add hospital
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAdd}>
              <label style={s.label}>
                Name
                <input required value={name} onChange={(e) => setName(e.target.value)} style={s.input} />
              </label>
              <label style={s.label}>
                Organisation
                <select
                  required
                  value={modalOrgId}
                  onChange={(e) => setModalOrgId(e.target.value)}
                  style={s.select}
            >
                  <option value="">Select organisation</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={saving} style={s.btnPrimary}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" style={s.btnGhost} onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
