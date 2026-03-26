import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import { listOrganisationsForManagement } from "../../services/organisation";
import { SYSTEM_ROLES, MDT_ROLES, listUsersInOrganisation, updateUserAssignment } from "../../services/userManagementService";
import { listHospitals, listWards } from "../../services/structureService";
import { managementStyles as s } from "./managementStyles";
import { MANAGEMENT_ALLOWED_ROLES } from "../../config/routes";
import ActionBar from "../../components/ActionBar";
import AddUserModal from "../../components/AddUserModal";

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

  const [showAddUser, setShowAddUser] = useState(false);

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

  if (!canManageUsers) {
    return (
      <div style={s.page}>
        <p>You need user management permission (Admin or Manager).</p>
      </div>
    );
  }

  if (!isPlatformAdmin && !organisationId) {
    return <Navigate to="/create-organisation" replace />;
  }

  return (
    <div style={s.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={s.h1}>Users</h1>
          <p style={s.muted}>Invite users and assign roles and hospital / ward scope.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!effectiveOrgId?.trim()) return;
            setShowAddUser(true);
          }}
          style={s.btnPrimary}
        >
          + Add User
        </button>
      </div>

      <ActionBar
        actions={[
          {
            label: "➕ Add User",
            onClick: () => {
              if (!effectiveOrgId?.trim()) return;
              setShowAddUser(true);
            },
          },
        ]}
      />

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
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : users.length === 0 ? (
        <div>
          <p style={s.muted}>No users in this organisation.</p>
          <button
            type="button"
            onClick={() => {
              if (!effectiveOrgId?.trim()) return;
              setShowAddUser(true);
            }}
            style={s.btnPrimary}
          >
            Create first user
          </button>
        </div>
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
        </div>
      )}

      <AddUserModal
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        onCreated={() => {
          void load();
        }}
        defaultOrganisationId={effectiveOrgId}
        organisations={orgs}
        isPlatformAdmin={isPlatformAdmin}
      />
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
