import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganisation } from "../../context/OrganisationContext";
import { listOrganisationsForManagement } from "../../services/organisation";
import {
  createWard,
  listAllWards,
  listHospitals,
  listWards,
} from "../../services/structureService";
import { managementStyles as s } from "./managementStyles";
import ActionBar from "../../components/ActionBar";

export default function Wards() {
  const { organisationId, isPlatformAdmin } = useOrganisation();
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgFilter, setOrgFilter] = useState("");
  const [hospitals, setHospitals] = useState<Array<{ id: string; name: string; organisationId: string }>>([]);
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; name: string; hospitalId: string; organisationId: string }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [modalHospitalId, setModalHospitalId] = useState("");
  const [modalOrgId, setModalOrgId] = useState("");
  const [hospitalsModal, setHospitalsModal] = useState<Array<{ id: string; name: string; organisationId: string }>>(
    []
  );
  const [saving, setSaving] = useState(false);

  const effectiveOrg = isPlatformAdmin ? orgFilter : organisationId ?? "";

  const loadOrgs = useCallback(async () => {
    const list = await listOrganisationsForManagement(!!isPlatformAdmin, organisationId ?? null);
    setOrgs((list ?? []).map((o) => ({ id: o.id, name: o.name || o.id })));
    if (!isPlatformAdmin && organisationId) setOrgFilter(organisationId);
  }, [isPlatformAdmin, organisationId]);

  const loadHospitalsForOrg = useCallback(
    async (oid: string) => {
      if (!oid?.trim()) {
        setHospitals([]);
        return;
      }
      try {
        const h = await listHospitals(oid.trim());
        setHospitals(Array.isArray(h) ? h : []);
      } catch {
        setHospitals([]);
      }
    },
    []
  );

  const loadWards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPlatformAdmin && !effectiveOrg?.trim() && !hospitalFilter?.trim()) {
        const all = await listAllWards({});
        setRows(Array.isArray(all) ? all : []);
        return;
      }
      const oid = effectiveOrg?.trim();
      const hid = hospitalFilter?.trim();
      if (isPlatformAdmin && oid && !hid) {
        const all = await listAllWards({ organisationId: oid });
        setRows(Array.isArray(all) ? all : []);
        return;
      }
      if (oid && hid) {
        const list = await listWards(oid, hid);
        setRows(Array.isArray(list) ? list : []);
        return;
      }
      setRows([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wards.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrg, hospitalFilter, isPlatformAdmin]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) loadOrgs();
  }, [loadOrgs, isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (effectiveOrg) loadHospitalsForOrg(effectiveOrg);
    else {
      setHospitals([]);
      setHospitalFilter("");
    }
  }, [effectiveOrg, loadHospitalsForOrg]);

  useEffect(() => {
    if (isPlatformAdmin && orgs.length && !orgFilter) {
      setOrgFilter(orgs[0].id);
    }
  }, [isPlatformAdmin, orgs, orgFilter]);

  useEffect(() => {
    if (!modalOpen || !modalOrgId?.trim()) {
      setHospitalsModal([]);
      return;
    }
    let cancelled = false;
    listHospitals(modalOrgId.trim())
      .then((list) => {
        if (!cancelled) setHospitalsModal(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setHospitalsModal([]);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, modalOrgId]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) loadWards();
  }, [loadWards, isPlatformAdmin, organisationId]);

  function openWardModal() {
    if (!effectiveOrg?.trim()) return;
    setModalOpen(true);
    const oid = effectiveOrg?.trim() ?? "";
    setModalOrgId(oid);
    setModalHospitalId(hospitalFilter?.trim() ?? "");
    setName("");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const oid = modalOrgId.trim();
    const hid = modalHospitalId.trim();
    if (!name.trim() || !oid || !hid) return;
    setSaving(true);
    setError(null);
    try {
      await createWard(oid, hid, { name: name.trim() });
      setModalOpen(false);
      setName("");
      await loadWards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ward.");
    } finally {
      setSaving(false);
    }
  }

  if (!isPlatformAdmin && !organisationId) {
    return <Navigate to="/create-organisation" replace />;
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Wards</h1>
      <p style={s.muted}>Wards belong to a hospital; organisation is stored for tenant isolation.</p>

      <ActionBar
        actions={[
          {
            label: "➕ Add Ward",
            onClick: openWardModal,
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
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={s.select}>
              <option value="">All (or pick to filter)</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label style={{ ...s.label, marginBottom: 0 }}>
          Hospital
          <select
            value={hospitalFilter}
            onChange={(e) => setHospitalFilter(e.target.value)}
            style={s.select}
            disabled={!effectiveOrg?.trim() || hospitals.length === 0}
          >
            <option value="">{effectiveOrg ? "Select hospital" : "Select organisation first"}</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Hospital ID</th>
              <th style={s.th}>Organisation ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>{r.name}</td>
                <td style={s.td}>
                  <code style={{ fontSize: 12 }}>{r.hospitalId}</code>
                </td>
                <td style={s.td}>
                  <code style={{ fontSize: 12 }}>{r.organisationId}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={s.td} colSpan={3}>
                  No wards in this scope. Select organisation and hospital, then add a ward.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {modalOpen ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="add-ward-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="add-ward-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Add ward
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
              {isPlatformAdmin ? (
                <label style={s.label}>
                  Organisation
                  <select
                    required
                    value={modalOrgId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setModalOrgId(v);
                      setModalHospitalId("");
                    }}
                    style={s.select}
                  >
                    <option value="">Select</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label style={s.label}>
                Hospital
                <select
                  required
                  value={modalHospitalId}
                  onChange={(e) => setModalHospitalId(e.target.value)}
                  style={s.select}
                >
                  <option value="">Select hospital</option>
                  {hospitalsModal.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              {!isPlatformAdmin ? (
                <p style={{ ...s.muted, marginTop: -4 }}>
                  Organisation is fixed to your tenant ({modalOrgId || organisationId}).
                </p>
              ) : null}
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
