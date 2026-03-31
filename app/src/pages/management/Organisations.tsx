import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import {
  createOrganisation,
  listOrganisationsForManagement,
  softDeleteOrganisation,
  updateOrganisation,
} from "../../services/organisation";
import { isOrganisationAdminRole } from "../../utils/organisationAdmin";
import { createSubscription, BILLING_CYCLES } from "../../services/billingService";
import { useAuth } from "../../context/AuthContext";
import { managementStyles as s } from "./managementStyles";
import type { PlanKey } from "../../constants/plans";
import ActionBar from "../../components/ActionBar";

const PLAN_OPTIONS: PlanKey[] = ["BASIC", "PRO", "ENTERPRISE"];

export default function Organisations() {
  const { organisationId, organisation, isPlatformAdmin, reload } = useOrganisation();
  const { role, can, hasRole, enterpriseRoleCode } = useRole();
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<{ id: string; name: string; plan?: string; status?: string | null }>>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<PlanKey>("BASIC");
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState<{ id: string; name: string; plan?: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSavingId, setDeleteSavingId] = useState<string | null>(null);

  const canMutateStructure = isOrganisationAdminRole(role) || Boolean(isPlatformAdmin);

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

  /** Spec uses "ADMIN"; normalised system role is "Admin" (see rbac). */
  const isAdminUser =
    role === "Admin" || enterpriseRoleCode === "ADMIN" || hasRole("Admin");

  useEffect(() => {
    if (isPlatformAdmin || organisationId || isAdminUser) load();
    else {
      setRows([]);
      setLoading(false);
    }
  }, [load, isPlatformAdmin, organisationId, isAdminUser]);

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
      setPlatformModalOpen(false);
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
  /** Profile points at organisations/{id} but no document — invalid tenant state; Admin can repair. */
  const orphanOrganisationRef = Boolean(organisationId) && !organisation;
  /** Tenant Admin: create first org, or repair missing Firestore doc for existing organisationId. */
  const showAdminCreate =
    isAdminUser && !isPlatformAdmin && (!organisationId || orphanOrganisationRef);

  async function handleCreateOrganisation() {
    try {
      const authInst = getAuth();
      const authUser = authInst.currentUser;
      if (!authUser) {
        alert("User not authenticated");
        return;
      }
      setSaving(true);
      setError(null);
      const nameTrim = orgName.trim() || "New Organisation";

      if (organisationId) {
        const existing = await getDoc(doc(db, "organisations", organisationId));
        if (!existing.exists()) {
          await createOrganisation(organisationId, {
            name: nameTrim,
            status: "active",
            plan: "BASIC",
          });
          await setDoc(
            doc(db, "organisations", organisationId),
            { createdBy: authUser.uid },
            { merge: true }
          );
          await createSubscription(organisationId, "BASIC", BILLING_CYCLES.MONTHLY, {
            organisationId,
            userId: authUser.uid,
            userRole: "Admin",
          });
          setShowModal(false);
          setOrgName("");
          alert("Organisation created successfully");
          window.location.reload();
          return;
        }
        alert("Organisation already exists. Refreshing…");
        await reload();
        await load();
        setShowModal(false);
        setOrgName("");
        return;
      }

      const orgId = `org_${Date.now()}`;
      await createOrganisation(orgId, { name: nameTrim, status: "active", plan: "BASIC" });
      await setDoc(
        doc(db, "organisations", orgId),
        { createdBy: authUser.uid },
        { merge: true }
      );
      await setDoc(
        doc(db, "users", authUser.uid),
        { organisationId: orgId, orgId },
        { merge: true }
      );
      await createSubscription(orgId, "BASIC", BILLING_CYCLES.MONTHLY, {
        organisationId: orgId,
        userId: authUser.uid,
        userRole: "Admin",
      });
      setShowModal(false);
      setOrgName("");
      alert("Organisation created successfully");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to create organisation");
    } finally {
      setSaving(false);
    }
  }

  if (!isPlatformAdmin && !organisationId && !isAdminUser) {
    return <Navigate to="/create-organisation" replace />;
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Organisations</h1>
      <p style={s.muted}>
        Tenant directory{organisation?.name ? ` · Current: ${organisation.name}` : ""}
      </p>

      {canAddOrg ? (
        <ActionBar
          actions={[
            {
              label: "➕ Add Organisation",
              onClick: () => setPlatformModalOpen(true),
            },
          ]}
        />
      ) : null}

      {showAdminCreate ? (
        <button
          type="button"
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            marginBottom: "20px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
          onClick={() => setShowModal(true)}
        >
          + Create Organisation
        </button>
      ) : null}

      {showModal ? (
        <div style={s.modalBackdrop} role="presentation">
          <div className="modal" style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="admin-create-org-title">
            <h3 id="admin-create-org-title" style={{ marginTop: 0, marginBottom: 12 }}>
              Create Organisation
            </h3>
            <label style={s.label}>
              Organisation name
              <input
                placeholder="Organisation Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                style={s.input}
                autoComplete="organization"
              />
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={saving} onClick={handleCreateOrganisation} style={s.btnPrimary}>
                {saving ? "Creating…" : "Create"}
              </button>
              <button
                type="button"
                style={s.btnGhost}
                onClick={() => {
                  setShowModal(false);
                  setOrgName("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" style={s.alert}>
          {error}
        </p>
      ) : null}

      {!isPlatformAdmin && organisationId && rows.length === 0 && !loading ? (
        <div style={s.callout}>
          <strong>No organisation record found.</strong>{" "}
          {orphanOrganisationRef ? (
            <>
              Your account references an organisation ID, but there is no matching document in Firestore.{" "}
              {showAdminCreate
                ? "Use “Create Organisation” above to create the tenant record at your existing ID."
                : "Ask an organisation Admin to create the record, or contact support."}
            </>
          ) : (
            <>
              <Link to="/management/hospitals" style={{ color: "#005eb8", fontWeight: 700 }}>
                Add hospitals and wards
              </Link>{" "}
              to finish setup.
            </>
          )}
        </div>
      ) : null}

      {!canAddOrg ? (
        <p style={{ ...s.muted, marginBottom: 16 }}>
          <strong>Add organisation</strong> is available to platform administrators only (new tenants). You can edit
          your current organisation name below.
        </p>
      ) : null}

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Plan</th>
              <th style={s.th}>ID</th>
              {canMutateStructure ? <th style={s.th}>Actions</th> : null}
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
                {canMutateStructure ? (
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={{ ...s.btnGhost, fontSize: 12, padding: "4px 10px" }}
                        onClick={() => setEditRow({ id: r.id, name: r.name || "", plan: r.plan ?? "BASIC" })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deleteSavingId === r.id}
                        style={{
                          fontSize: 12,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: "1px solid #fecaca",
                          background: "#fff1f2",
                          color: "#991b1b",
                          fontWeight: 700,
                          cursor: deleteSavingId === r.id ? "wait" : "pointer",
                        }}
                        onClick={async () => {
                          if (!globalThis.confirm("Are you sure you want to delete this item?")) return;
                          setDeleteSavingId(r.id);
                          setError(null);
                          try {
                            await softDeleteOrganisation(r.id);
                            await load();
                            if (!isPlatformAdmin) await reload();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Delete failed.");
                          } finally {
                            setDeleteSavingId(null);
                          }
                        }}
                      >
                        {deleteSavingId === r.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td style={s.td} colSpan={canMutateStructure ? 4 : 3}>
                  No organisations yet. Create one to start onboarding clients.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      {!isPlatformAdmin && organisationId && organisation && isOrganisationAdminRole(role) ? (
        <EditOrgName
          organisationId={organisationId}
          initialName={organisation.name ?? ""}
          onSaved={() => {
            reload();
            load();
          }}
        />
      ) : null}

      {editRow ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="edit-org-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="edit-org-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Edit organisation
              </h2>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editRow.name.trim()) return;
                setEditSaving(true);
                setError(null);
                try {
                  await updateOrganisation(editRow.id, {
                    name: editRow.name.trim(),
                    plan: editRow.plan as PlanKey,
                  });
                  setEditRow(null);
                  await load();
                  await reload();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Update failed.");
                } finally {
                  setEditSaving(false);
                }
              }}
            >
              <label style={s.label}>
                Name
                <input
                  required
                  value={editRow.name}
                  onChange={(e) => setEditRow((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Plan
                <select
                  value={editRow.plan ?? "BASIC"}
                  onChange={(e) =>
                    setEditRow((prev) => (prev ? { ...prev, plan: e.target.value } : prev))
                  }
                  style={s.select}
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={editSaving} style={s.btnPrimary}>
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" style={s.btnGhost} onClick={() => setEditRow(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {platformModalOpen ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={s.modalCard} role="dialog" aria-modal="true" aria-labelledby="add-org-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="add-org-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Add organisation
              </h2>
              <button
                type="button"
                onClick={() => setPlatformModalOpen(false)}
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
                <button type="button" style={s.btnGhost} onClick={() => setPlatformModalOpen(false)}>
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
