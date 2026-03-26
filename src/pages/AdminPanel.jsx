import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useNavigate } from "react-router-dom";
import {
  getPlatformStats,
  listOrganisationsWithDetails,
  getPlatformMetrics,
  suspendOrganisation,
  reactivateOrganisation,
  adminUpdatePlan,
  adminCancelSubscription,
} from "../services/adminService";
import { PLANS } from "../services/billingService";
import { getOrganisation } from "../services/organisation";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.9rem",
};

const thTdStyle = {
  border: "1px solid #e0e0e0",
  padding: "10px 12px",
  textAlign: "left",
};

function MetricCard({ title, value }) {
  return (
    <div style={{ ...cardStyle, minWidth: 140, flex: 1 }}>
      <div style={{ color: "#666", fontSize: "0.875rem", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BarChart({ data, title, maxBars = 12 }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const slice = data.slice(-maxBars);
  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, fontSize: "1rem" }}>{title}</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>
        {slice.map(({ month, count }) => (
          <div
            key={month}
            style={{
              flex: 1,
              minWidth: 24,
              background: "#005eb8",
              height: `${(count / max) * 100}%`,
              borderRadius: "4px 4px 0 0",
              title: `${month}: ${count}`,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, fontSize: "0.7rem", color: "#666" }}>
        {slice.map(({ month }) => (
          <span key={month} style={{ flex: 1, minWidth: 24, overflow: "hidden", textOverflow: "ellipsis" }}>
            {month.slice(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { isSuperAdmin } = useRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [detailOrgId, setDetailOrgId] = useState(null);
  const [detailOrg, setDetailOrg] = useState(null);

  const auditContext = {
    userId: user?.uid ?? "",
    userRole: "platform_admin",
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getPlatformStats(),
      listOrganisationsWithDetails(),
      getPlatformMetrics(),
    ])
      .then(([s, o, m]) => {
        if (!cancelled) {
          setStats(s);
          setOrgs(o);
          setMetrics(m);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load admin data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function refresh() {
    setActionLoading("refresh");
    try {
      const [s, o, m] = await Promise.all([
        getPlatformStats(),
        listOrganisationsWithDetails(),
        getPlatformMetrics(),
      ]);
      setStats(s);
      setOrgs(o);
      setMetrics(m);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSuspend(organisationId) {
    if (!window.confirm("Suspend this organisation? Users will lose access until reactivated.")) return;
    setActionLoading(`suspend-${organisationId}`);
    try {
      await suspendOrganisation(organisationId, auditContext);
      await refresh();
      setDetailOrgId(null);
      setDetailOrg(null);
    } catch (e) {
      setError(e?.message ?? "Failed to suspend");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReactivate(organisationId) {
    setActionLoading(`reactivate-${organisationId}`);
    try {
      await reactivateOrganisation(organisationId, auditContext);
      await refresh();
      setDetailOrgId(null);
      setDetailOrg(null);
    } catch (e) {
      setError(e?.message ?? "Failed to reactivate");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpgradePlan(organisationId, newPlanName) {
    setActionLoading(`plan-${organisationId}`);
    try {
      await adminUpdatePlan(organisationId, newPlanName, auditContext);
      await refresh();
    } catch (e) {
      setError(e?.message ?? "Failed to update plan");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSubscription(organisationId) {
    if (!window.confirm("Cancel this organisation's subscription?")) return;
    setActionLoading(`cancel-${organisationId}`);
    try {
      await adminCancelSubscription(organisationId, auditContext);
      await refresh();
    } catch (e) {
      setError(e?.message ?? "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  }

  async function viewDetails(organisationId) {
    setDetailOrgId(organisationId);
    setDetailOrg(null);
    try {
      const org = await getOrganisation(organisationId);
      setDetailOrg(org);
    } catch {
      setDetailOrg(null);
    }
  }

  if (loading) {
    return <div style={{ padding: "1rem 0" }}>Loading admin dashboard…</div>;
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>Platform Admin</h1>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <MetricCard title="Total organisations" value={stats.totalOrganisations} />
          <MetricCard title="Total users" value={stats.totalUsers} />
          <MetricCard title="Active subscriptions" value={stats.activeSubscriptions} />
          <MetricCard title="Total services" value={stats.totalServices} />
        </div>
      )}

      {/* Platform metrics charts */}
      {metrics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <BarChart data={metrics.organisationsByMonth} title="Organisations (by month)" />
          <BarChart data={metrics.servicesByMonth} title="Services created (by month)" />
          <BarChart data={metrics.inspectionsByMonth} title="Inspection simulations (by month)" />
        </div>
      )}

      {/* Organisation management */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Organisations</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => navigate("/system-admin/create-organisation")}
                style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "pointer" }}
              >
                + Create Organisation
              </button>
            ) : null}
            <button
              type="button"
              onClick={refresh}
              disabled={!!actionLoading}
              style={{ padding: "6px 12px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", cursor: "pointer" }}
            >
              Refresh
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>Organisation</th>
                <th style={thTdStyle}>Plan</th>
                <th style={thTdStyle}>Services</th>
                <th style={thTdStyle}>Subscription</th>
                <th style={thTdStyle}>Status</th>
                <th style={thTdStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td style={thTdStyle}>{org.name || org.id}</td>
                  <td style={thTdStyle}>{org.planName}</td>
                  <td style={thTdStyle}>{org.numberOfServices}</td>
                  <td style={thTdStyle}>{org.subscriptionStatus}</td>
                  <td style={thTdStyle}>{org.status}</td>
                  <td style={thTdStyle}>
                    <button
                      type="button"
                      onClick={() => viewDetails(org.id)}
                      style={{ marginRight: 8, padding: "4px 8px", fontSize: "0.85rem" }}
                    >
                      View
                    </button>
                    {org.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handleSuspend(org.id)}
                        disabled={!!actionLoading}
                        style={{ marginRight: 8, padding: "4px 8px", fontSize: "0.85rem", color: "#c62828" }}
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(org.id)}
                        disabled={!!actionLoading}
                        style={{ marginRight: 8, padding: "4px 8px", fontSize: "0.85rem", color: "#2e7d32" }}
                      >
                        Reactivate
                      </button>
                    )}
                    {org.subscriptionStatus === "active" && (
                      <>
                        <select
                          aria-label="Change plan"
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v && v !== org.planName) handleUpgradePlan(org.id, v);
                          }}
                          disabled={!!actionLoading}
                          style={{ marginRight: 8, padding: "4px 8px", fontSize: "0.85rem" }}
                        >
                          <option value="">Change plan</option>
                          {Object.values(PLANS).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleCancelSubscription(org.id)}
                          disabled={!!actionLoading}
                          style={{ padding: "4px 8px", fontSize: "0.85rem", color: "#c62828" }}
                        >
                          Cancel sub
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organisation detail modal / inline */}
      {detailOrgId && (
        <div style={{ ...cardStyle, marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Organisation details: {detailOrgId}</h3>
          {detailOrg ? (
            <pre style={{ margin: 0, fontSize: "0.85rem", overflow: "auto" }}>
              {JSON.stringify(detailOrg, null, 2)}
            </pre>
          ) : (
            <p>Loading…</p>
          )}
          <button
            type="button"
            onClick={() => { setDetailOrgId(null); setDetailOrg(null); }}
            style={{ marginTop: 8, padding: "6px 12px" }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
