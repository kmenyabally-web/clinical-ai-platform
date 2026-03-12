import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { useService } from "../context/ServiceContext";
import { useNotifications } from "../hooks/useNotifications";
import { markNotificationRead } from "../services/notificationService";
import { evaluateAndCreateNotifications } from "../services/notificationService";
import { NOTIFICATION_TYPES } from "../services/notificationService";
import { Link } from "react-router-dom";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "0.75rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  borderLeft: "4px solid #1976d2",
};

const severityBorder = {
  high: "#c62828",
  medium: "#f9a825",
  low: "#2e7d32",
};

function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts.toMillis ? ts.toMillis() : (ts.seconds ?? 0) * 1000;
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function Notifications() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const { can, role } = useRole();
  const canMarkResolved = can("audit:update");
  const { notifications, loading, error, refresh } = useNotifications({ limitCount: 50 });

  const { currentServiceId } = useService();
  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;

  async function handleEvaluate() {
    if (!organisationId || !auditContext) return;
    try {
      await evaluateAndCreateNotifications(organisationId, auditContext, currentServiceId);
      refresh();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMarkRead(id) {
    if (!organisationId || !canMarkResolved) return;
    try {
      await markNotificationRead(organisationId, id);
      refresh();
    } catch (e) {
      console.error(e);
    }
  }

  const typeLabel = (type) => {
    const map = {
      [NOTIFICATION_TYPES.ACTION_OVERDUE]: "Overdue action",
      [NOTIFICATION_TYPES.HIGH_RISK_ACTION]: "High risk action",
      [NOTIFICATION_TYPES.MISSING_EVIDENCE]: "Missing evidence",
      [NOTIFICATION_TYPES.READINESS_DROP]: "Readiness drop",
      [NOTIFICATION_TYPES.INSPECTION_HIGH_RISK]: "Inspection high risk",
    };
    return map[type] ?? type;
  };

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>Notifications</h1>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Compliance alerts and system notifications. All roles can view; only Admins and Managers can mark alerts as resolved.
      </p>

      {canMarkResolved && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            onClick={handleEvaluate}
            style={{
              padding: "8px 16px",
              background: "#f5f5f5",
              border: "1px solid #ccc",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Check for new alerts
          </button>
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {loading && <p style={{ color: "#666" }}>Loading…</p>}

      {!loading && notifications.length === 0 && (
        <p style={{ color: "#666" }}>No notifications.</p>
      )}

      {!loading && notifications.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {notifications.map((n) => (
            <li key={n.id}>
              <div
                style={{
                  ...cardStyle,
                  borderLeftColor: severityBorder[n.severity] ?? "#1976d2",
                  opacity: n.read ? 0.85 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase" }}>
                      {typeLabel(n.type)}
                    </span>
                    <h2 style={{ fontSize: "1rem", margin: "4px 0", fontWeight: 600 }}>{n.title}</h2>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#444" }}>{n.message}</p>
                    <p style={{ marginTop: 8, fontSize: "0.75rem", color: "#888" }}>
                      {formatDate(n.createdAt)}
                      {n.read && " · Read"}
                    </p>
                  </div>
                  {!n.read && canMarkResolved && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.875rem",
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      Mark resolved
                    </button>
                  )}
                </div>
                {n.relatedEntityType === "compliance_action" && n.relatedEntityId && (
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: "0.875rem" }}>
                    <Link to={`/actions`}>View actions</Link>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
