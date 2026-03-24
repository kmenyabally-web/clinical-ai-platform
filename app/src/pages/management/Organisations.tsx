import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import {
  createOrganisation,
  listOrganisationsForManagement,
  updateOrganisation,
} from "../../services/organisation";
import { createSubscription, BILLING_CYCLES } from "../../services/billingService";
import { useAuth } from "../../context/AuthContext";
import { managementStyles as s } from "./managementStyles";
import type { PlanKey } from "../../constants/plans";

const PLAN_OPTIONS: PlanKey[] = ["BASIC", "PRO", "ENTERPRISE"];

export default function Organisations() {
  const { organisationId, organisation, isPlatformAdmin, reload } = useOrganisation();
  const { can } = useRole();
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; name: string; plan?: string; status?: string | null }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<PlanKey>("BASIC");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listOrganisationsForManagement(!!isPlatformAdmin, organisationId ?? null);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load organisations.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) load();
    else {
      setRows([]);
      setLoading(false);
    }
  }, [load, isPlatformAdmin, organisationId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const newId = doc(collection(db, "organisations")).id;
      await createOrganisation(newId, { name: name.trim(), status: "active", plan });
      const auditContext = {
        organisationId: newId,
        userId: user?.uid ?? "",
        userRole: isPlatformAdmin ? "platform_admin" : "Admin",
      };
      await createSubscription(newId, plan, BILLING_CYCLES.MONTHLY, auditContext);
      setModalOpen(false);
      setName("");
      setPlan("BASIC");
      await load();
      if (!isPlatformAdmin) await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organisation.");
    } finally {
      setSaving(false);
    }
  }

  const canAddOrg = isPlatformAdmin;

  if (!isPlatformAdmin && !organisationId) {
    return (
      <div style={s.page}>
        <h1 style={s.h1}>Organisations</h1>
        <div style={s.callout}>
          <strong>No organisation yet.</strong> Ask an administrator to assign your account to an organisation, or
          sign in as a platform administrator to create one.
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Organisations</h1>
      <p style={s.muted}>
        Tenant directory{organisation?.name ? ` · Current: ${organisation.name}` : ""}
      </p>

      {error ? (
        <p role="alert" style={s.alert}>
          {error}
        </p>
      ) : null}

      {!isPlatformAdmin && organisationId && rows.length === 0 && !loading ? (
        <div style={s.callout}>
          <strong>No organisation record found.</strong>{" "}
          <Link to="/management/hospitals" style={{ color: "#005eb8", fontWeight: 700 }}>
            Add hospitals and wards
          </Link>{" "}
          to finish setup.
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {canAddOrg ? (
          <button type="button" style={s.btnPrimary} onClick={() => setModalOpen(true)}>
            Add organisation
          </button>
        ) : (
          <p style={s.muted}>
            <strong>Add organisation</strong> is available to platform administrators only (new tenants). You can edit
            your current organisation name below.
          </p>
        )}
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Plan</th>
              <th style={s.th}>ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={s.td}>{r.name || "—"}</td>
                <td style={s.td}>{r.plan ?? "—"}</td>
                <td style={s.td}>
                  <code style={{ fontSize: 12 }}>{r.id}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={s.td} colSpan={3}>
                  No organisations yet. Create one to start onboarding clients.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {!isPlatformAdmin && organisationId && organisation && can("organisation:manage") ? (
        <EditOrgName
          organisationId={organisationId}
          initialName={organisation.name ?? ""}
          onSaved={() => {
            reload();
            load();
          }}
        />
      ) : null}

      {modalOpen ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="add-org-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="add-org-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Add organisation
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
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={s.input}
                  autoComplete="organization"
                />
              </label>
              <label style={s.label}>
                Plan
                <select value={plan} onChange={(e) => setPlan(e.target.value as PlanKey)} style={s.select}>
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
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

function EditOrgName({
  organisationId,
  initialName,
  onSaved,
}: {
  organisationId: string;
  initialName: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await updateOrganisation(organisationId, { name });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ marginTop: 24, maxWidth: 400 }}>
      <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Your organisation</h2>
      <label style={s.label}>
        Display name
        <input value={name} onChange={(e) => setName(e.target.value)} style={s.input} required />
      </label>
      {err ? (
        <p role="alert" style={s.alert}>
          {err}
        </p>
      ) : null}
      <button type="submit" disabled={saving} style={s.btnPrimary}>
        {saving ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
