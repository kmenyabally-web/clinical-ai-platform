import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import { listOrganisationsForManagement } from "../../services/organisation";
import {
  SYSTEM_ROLES,
  MDT_ROLES,
  createOrganisationUserAccount,
  listUsersInOrganisation,
  updateUserAssignment,
} from "../../services/userManagementService";
import { listHospitals, listWards } from "../../services/structureService";
import { managementStyles as s } from "./managementStyles";
import { MANAGEMENT_ALLOWED_ROLES } from "../../config/routes";

export default function Users() {
  const { organisationId, isPlatformAdmin } = useOrganisation();
  const { isAllowed } = useRole();
  const canManageUsers = isAllowed(MANAGEMENT_ALLOWED_ROLES);

  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [orgFilter, setOrgFilter] = useState("");
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email?: string;
      displayName?: string;
      role: string | null;
      mdtRole: string | null;
      orgId: string | null;
      hospitalId: string | null;
      wardId: string | null;
    }>
  >([]);
  const [hospitals, setHospitals] = useState<Array<{ id: string; name: string }>>([]);
  const [wardMap, setWardMap] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState<string>("Staff");
  const [mdtRole, setMdtRole] = useState<string>(MDT_ROLES[0] ?? "Nurse");
  const [modalOrgId, setModalOrgId] = useState("");
  const [modalHospitalId, setModalHospitalId] = useState("");
  const [modalWardId, setModalWardId] = useState("");
  const [modalHospitals, setModalHospitals] = useState<Array<{ id: string; name: string }>>([]);
  const [modalWards, setModalWards] = useState<Array<{ id: string; name: string }>>([]);
  const [creating, setCreating] = useState(false);

  const effectiveOrgId = isPlatformAdmin ? orgFilter : organisationId ?? "";

  const loadOrgs = useCallback(async () => {
    const list = await listOrganisationsForManagement(!!isPlatformAdmin, organisationId ?? null);
    setOrgs((list ?? []).map((o) => ({ id: o.id, name: o.name || o.id })));
    if (!isPlatformAdmin && organisationId) setOrgFilter(organisationId);
  }, [isPlatformAdmin, organisationId]);

  const load = useCallback(async () => {
    if (!effectiveOrgId?.trim()) {
      setUsers([]);
      setHospitals([]);
      setWardMap({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const oid = effectiveOrgId.trim();
      const [u, h] = await Promise.all([listUsersInOrganisation(oid), listHospitals(oid)]);
      setUsers(Array.isArray(u) ? u : []);
      setHospitals(Array.isArray(h) ? h : []);
      const map: Record<string, Array<{ id: string; name: string }>> = {};
      for (const hosp of h) {
        const wards = await listWards(oid, hosp.id);
        map[hosp.id] = Array.isArray(wards) ? wards : [];
      }
      setWardMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveOrgId]);

  useEffect(() => {
    if (isPlatformAdmin || organisationId) loadOrgs();
  }, [loadOrgs, isPlatformAdmin, organisationId]);

  useEffect(() => {
    if (isPlatformAdmin && orgs.length && !orgFilter) {
      setOrgFilter(orgs[0].id);
    }
  }, [isPlatformAdmin, orgs, orgFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen || !modalOrgId?.trim()) {
      setModalHospitals([]);
      setModalWards([]);
      return;
    }
    let cancelled = false;
    listHospitals(modalOrgId.trim())
      .then((h) => {
        if (!cancelled) setModalHospitals(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        if (!cancelled) setModalHospitals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, modalOrgId]);

  useEffect(() => {
    if (!modalOpen || !modalOrgId?.trim() || !modalHospitalId?.trim()) {
      setModalWards([]);
      return;
    }
    let cancelled = false;
    listWards(modalOrgId.trim(), modalHospitalId.trim())
      .then((w) => {
        if (!cancelled) setModalWards(Array.isArray(w) ? w : []);
      })
      .catch(() => {
        if (!cancelled) setModalWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, modalOrgId, modalHospitalId]);

  async function saveRow(
    userId: string,
    nextRole: string,
    nextMdt: string,
    hospitalId: string,
    wardId: string
  ) {
    if (!nextRole?.trim() || !nextMdt?.trim()) {
      setError("System role and MDT role are required.");
      return;
    }
    setSavingId(userId);
    setError(null);
    try {
      await updateUserAssignment(userId, {
        role: nextRole.trim(),
        mdtRole: nextMdt.trim(),
        hospitalId: hospitalId || null,
        wardId: wardId || null,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const oid = modalOrgId.trim();
    if (!email.trim() || password.length < 6 || !oid) return;
    if (!systemRole?.trim() || !mdtRole?.trim()) {
      setError("System role and MDT role are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createOrganisationUserAccount({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        role: systemRole.trim(),
        mdtRole: mdtRole.trim(),
        organisationId: oid,
        hospitalId: modalHospitalId.trim() || null,
        wardId: modalWardId.trim() || null,
      });
      setModalOpen(false);
      setDisplayName("");
      setEmail("");
      setPassword("");
      setSystemRole("Staff");
      setMdtRole(MDT_ROLES[0] ?? "Nurse");
      setModalHospitalId("");
      setModalWardId("");
      await load();
    } catch (err: unknown) {
      const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Failed to create user.";
      setError(code === "functions/already-exists" ? "That email is already registered." : msg);
    } finally {
      setCreating(false);
    }
  }

  if (!canManageUsers) {
    return (
      <div style={s.page}>
        <p>You need user management permission (Admin or Manager).</p>
      </div>
    );
  }

  if (!isPlatformAdmin && !organisationId) {
    return (
      <div style={s.page}>
        <h1 style={s.h1}>Users</h1>
        <div style={s.callout}>
          <strong>No organisation assigned.</strong>{" "}
          <Link to="/management/organisations" style={{ color: "#005eb8", fontWeight: 700 }}>
            Complete organisation setup
          </Link>{" "}
          first.
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Users</h1>
      <p style={s.muted}>Invite users and assign roles and hospital / ward scope.</p>

      {error ? (
        <p role="alert" style={s.alert}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        {isPlatformAdmin ? (
          <label style={{ ...s.label, marginBottom: 0 }}>
            Organisation
            <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={s.select}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          style={s.btnPrimary}
          disabled={!effectiveOrgId?.trim()}
          onClick={() => {
            setModalOpen(true);
            setModalOrgId(effectiveOrgId || "");
            setModalHospitalId("");
            setModalWardId("");
            setDisplayName("");
            setEmail("");
            setPassword("");
            setSystemRole("Staff");
            setMdtRole(MDT_ROLES[0] ?? "Nurse");
          }}
        >
          Add user
        </button>
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>User</th>
                <th style={s.th}>System role</th>
                <th style={s.th}>MDT role</th>
                <th style={s.th}>Hospital</th>
                <th style={s.th}>Ward</th>
                <th style={s.th} />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
                  hospitals={hospitals}
                  wardMap={wardMap}
                  saving={savingId === u.id}
                  onSave={saveRow}
                />
              ))}
            </tbody>
          </table>
          {users.length === 0 ? <p style={s.muted}>No users in this organisation.</p> : null}
        </div>
      )}

      {modalOpen ? (
        <div style={s.modalBackdrop} role="presentation">
          <div style={{ ...s.modalCard, maxWidth: 460 }} role="dialog" aria-modal="true" aria-labelledby="add-user-title">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 id="add-user-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                Add user
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
            <form onSubmit={handleCreateUser}>
              {isPlatformAdmin ? (
                <label style={s.label}>
                  Organisation
                  <select
                    required
                    value={modalOrgId}
                    onChange={(e) => {
                      setModalOrgId(e.target.value);
                      setModalHospitalId("");
                      setModalWardId("");
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
                Name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={s.input} />
              </label>
              <label style={s.label}>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                Temporary password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={s.input}
                />
              </label>
              <label style={s.label}>
                System role *
                <select
                  required
                  value={systemRole}
                  onChange={(e) => setSystemRole(e.target.value)}
                  style={s.select}
                >
                  {SYSTEM_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                MDT role *
                <select required value={mdtRole} onChange={(e) => setMdtRole(e.target.value)} style={s.select}>
                  {MDT_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Hospital
                <select
                  value={modalHospitalId}
                  onChange={(e) => {
                    setModalHospitalId(e.target.value);
                    setModalWardId("");
                  }}
                  style={s.select}
                >
                  <option value="">Optional</option>
                  {modalHospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={s.label}>
                Ward
                <select
                  value={modalWardId}
                  onChange={(e) => setModalWardId(e.target.value)}
                  disabled={!modalHospitalId}
                  style={s.select}
                >
                  <option value="">Optional</option>
                  {modalWards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <p style={{ ...s.muted, marginTop: -4 }}>
                The user should sign in with the email and password above, then change password if your policy requires
                it.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="submit" disabled={creating} style={s.btnPrimary}>
                  {creating ? "Creating…" : "Create user"}
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

function UserRow({
  u,
  hospitals,
  wardMap,
  saving,
  onSave,
}: {
  u: {
    id: string;
    email?: string;
    displayName?: string;
    role: string | null;
    mdtRole: string | null;
    hospitalId: string | null;
    wardId: string | null;
  };
  hospitals: Array<{ id: string; name: string }>;
  wardMap: Record<string, Array<{ id: string; name: string }>>;
  saving: boolean;
  onSave: (userId: string, role: string, mdtRole: string, hospitalId: string, wardId: string) => void;
}) {
  const [r, setR] = useState(u.role ?? "");
  const [m, setM] = useState(u.mdtRole ?? MDT_ROLES[0] ?? "");
  const [hospitalId, setHospitalId] = useState(u.hospitalId ?? "");
  const [wardId, setWardId] = useState(u.wardId ?? "");

  useEffect(() => {
    setR(u.role ?? "");
    setM(u.mdtRole ?? MDT_ROLES[0] ?? "");
    setHospitalId(u.hospitalId ?? "");
    setWardId(u.wardId ?? "");
  }, [u.id, u.role, u.mdtRole, u.hospitalId, u.wardId]);

  const wards = hospitalId ? wardMap[hospitalId] ?? [] : [];

  return (
    <tr>
      <td style={s.td}>
        <div style={{ fontWeight: 700 }}>{u.displayName || "—"}</div>
        <code style={{ fontSize: 11 }}>{u.id}</code>
        {u.email ? <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div> : null}
      </td>
      <td style={s.td}>
        <select value={r} onChange={(e) => setR(e.target.value)} style={s.select}>
          {SYSTEM_ROLES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </td>
      <td style={s.td}>
        <select value={m} onChange={(e) => setM(e.target.value)} style={s.select}>
          {MDT_ROLES.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </td>
      <td style={s.td}>
        <select
          value={hospitalId}
          onChange={(e) => {
            setHospitalId(e.target.value);
            setWardId("");
          }}
          style={s.select}
        >
          <option value="">—</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </td>
      <td style={s.td}>
        <select
          value={wardId}
          onChange={(e) => setWardId(e.target.value)}
          disabled={!hospitalId}
          style={s.select}
        >
          <option value="">—</option>
          {wards.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </td>
      <td style={s.td}>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (!r?.trim() || !m?.trim()) return;
            onSave(u.id, r, m, hospitalId, wardId);
          }}
          style={{
            padding: "6px 12px",
            background: "#0f172a",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {saving ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
