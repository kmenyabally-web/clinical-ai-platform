import { useEffect, useMemo, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useRole } from "../context/RoleContext";
import ProtectedPage from "../components/ProtectedPage";
import {
  archivePolicy,
  createPolicy,
  listPolicies,
  POLICY_OPTIONS,
  POLICY_STATUS_OPTIONS,
  updatePolicy,
} from "../services/policyService";

function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB");
}

export default function Policies() {
  const { organisationId, organisation } = useOrganisation();
  const { user } = useAuth();
  const { role, can } = useRole();
  const permissions = usePermissions();
  const features = organisation?.features ?? {};
  const policiesEnabled = features?.policies === true;
  const canManagePolicies = Boolean(
    can("organisation:manage") ||
    permissions?.canManagePolicies ||
      permissions?.canManageUsers ||
      ["ADMIN", "MANAGER", "SUPER_ADMIN", "GLOBAL_ADMIN"].includes(String(role ?? "").toUpperCase())
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({ title: "", type: "GENERAL", content: "" });
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);

  async function load() {
    if (!organisationId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const list = await listPolicies(organisationId);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message ?? "Failed to load policies.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  const filteredRows = useMemo(() => {
    return [...rows]
      .filter((r) => (typeFilter === "ALL" ? true : r.type === typeFilter))
      .filter((r) => (statusFilter === "ALL" ? true : r.status === statusFilter))
      .sort((a, b) => toMs(b.updatedAt || b.createdAt) - toMs(a.updatedAt || a.createdAt));
  }, [rows, typeFilter, statusFilter]);

  const selected = filteredRows.find((r) => r.id === selectedId) ?? null;

  async function onCreate(e) {
    e.preventDefault();
    if (!canManagePolicies || !organisationId) return;
    setSaving(true);
    setError("");
    try {
      await createPolicy({
        organisationId,
        title: form.title,
        type: form.type,
        content: form.content,
        user: { uid: user?.uid ?? null },
      });
      setForm({ title: "", type: "GENERAL", content: "" });
      await load();
    } catch (e2) {
      setError(e2?.message ?? "Failed to create policy.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit() {
    if (!canManagePolicies || !selected) return;
    setSaving(true);
    setError("");
    try {
      await updatePolicy(
        selected.id,
        {
          title: form.title,
          type: form.type,
          content: form.content,
          status: selected.status,
        },
        { uid: user?.uid ?? null }
      );
      setEditing(false);
      await load();
    } catch (e) {
      setError(e?.message ?? "Failed to update policy.");
    } finally {
      setSaving(false);
    }
  }

  async function onArchive() {
    if (!canManagePolicies || !selected) return;
    setSaving(true);
    setError("");
    try {
      await archivePolicy(selected.id, { uid: user?.uid ?? null });
      setSelectedId("");
      setEditing(false);
      await load();
    } catch (e) {
      setError(e?.message ?? "Failed to archive policy.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!selected || editing) return;
    setForm({
      title: selected.title ?? "",
      type: selected.type ?? "GENERAL",
      content: selected.content ?? "",
    });
  }, [selected, editing]);

  if (!policiesEnabled) return null;

  return (
    <div style={{ padding: 24, maxWidth: 1160, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Policies</h1>
      <p style={{ marginTop: 0, color: "#64748b" }}>
        Governance library for {organisation?.name || "organisation"}.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <label style={label}>
            Type
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={input}>
              <option value="ALL">All</option>
              {POLICY_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={input}>
              <option value="ALL">All</option>
              {POLICY_STATUS_OPTIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          {canManagePolicies ? (
            <ProtectedPage permission="organisation:manage">
              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "12px 0" }} />
              <h3 style={{ marginTop: 0 }}>Create policy</h3>
              <form onSubmit={onCreate}>
                <label style={label}>
                  Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    style={input}
                    required
                  />
                </label>
                <label style={label}>
                  Type
                  <select
                    value={form.type}
                    onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                    style={input}
                  >
                    {POLICY_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={label}>
                  Content
                  <textarea
                    rows={6}
                    value={form.content}
                    onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                    style={{ ...input, resize: "vertical" }}
                  />
                </label>
                <button type="submit" disabled={saving} style={primaryBtn}>
                  {saving ? "Saving..." : "Create policy"}
                </button>
              </form>
            </ProtectedPage>
          ) : (
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Read-only policy access for your role.
            </div>
          )}
        </section>

        <section style={card}>
          {error ? <div style={{ color: "#991b1b", marginBottom: 10 }}>{error}</div> : null}
          {loading ? <p>Loading policies...</p> : null}
          {!loading && filteredRows.length === 0 ? <p>No policies found.</p> : null}
          {!loading && filteredRows.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12 }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 600, overflowY: "auto" }}>
                {filteredRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      setEditing(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 10,
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      background: selectedId === r.id ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {r.type} · v{r.version} · {r.status}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                {selected ? (
                  <>
                    <h3 style={{ marginTop: 0 }}>{selected.title}</h3>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                      {selected.type} · v{selected.version} · {selected.status} · Updated {formatDate(selected.updatedAt)}
                    </div>
                    {!editing ? (
                      <>
                        <pre style={pre}>{selected.content || "No content"}</pre>
                        {canManagePolicies ? (
                          <ProtectedPage permission="organisation:manage">
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(true);
                                  setForm({
                                    title: selected.title,
                                    type: selected.type,
                                    content: selected.content,
                                  });
                                }}
                                style={secondaryBtn}
                              >
                                Edit
                              </button>
                              {selected.status !== "ARCHIVED" ? (
                                <button type="button" onClick={onArchive} style={dangerBtn} disabled={saving}>
                                  Archive
                                </button>
                              ) : null}
                            </div>
                          </ProtectedPage>
                        ) : null}
                      </>
                    ) : (
                      <ProtectedPage permission="organisation:manage">
                        <label style={label}>
                          Title
                          <input
                            value={form.title}
                            onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                            style={input}
                          />
                        </label>
                        <label style={label}>
                          Type
                          <select
                            value={form.type}
                            onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                            style={input}
                          >
                            {POLICY_OPTIONS.map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={label}>
                          Content
                          <textarea
                            rows={10}
                            value={form.content}
                            onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
                            style={{ ...input, resize: "vertical" }}
                          />
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={onSaveEdit} style={primaryBtn} disabled={saving}>
                            Save changes
                          </button>
                          <button type="button" onClick={() => setEditing(false)} style={secondaryBtn}>
                            Cancel
                          </button>
                        </div>
                      </ProtectedPage>
                    )}
                  </>
                ) : (
                  <p>Select a policy to view.</p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

const card = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
  padding: 12,
};
const label = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 700 };
const input = { border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 13 };
const pre = {
  marginTop: 0,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  whiteSpace: "pre-wrap",
  maxHeight: 420,
  overflowY: "auto",
};
const primaryBtn = {
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#005eb8",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
const secondaryBtn = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};
const dangerBtn = {
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#fff1f2",
  color: "#9f1239",
  fontWeight: 700,
  cursor: "pointer",
};
