import { useState, useEffect } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  getSubscription,
  updateSubscriptionPlan,
  cancelSubscription,
  PLANS,
  getPlanLimits,
} from "../services/billingService";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

function formatDate(ts) {
  if (!ts) return "—";
  try {
    const d = ts.toMillis ? ts.toMillis() : (ts.seconds ?? 0) * 1000;
    return new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return "—";
  }
}

/**
 * Billing and subscription page. Shows current plan, billing cycle, renewal date.
 * Only organisation Admins may upgrade, downgrade, or cancel (RBAC).
 */
export default function Billing() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const { role, can } = useRole();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = role === "Admin";
  const canManageBilling = can("organisation:manage");

  useEffect(() => {
    if (!organisationId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSubscription(organisationId)
      .then(setSubscription)
      .catch((e) => setError(e?.message ?? "Failed to load subscription"))
      .finally(() => setLoading(false));
  }, [organisationId]);

  async function handleChangePlan(newPlanName) {
    if (!organisationId || !canManageBilling) return;
    setError(null);
    setActionLoading(true);
    try {
      await updateSubscriptionPlan(
        organisationId,
        newPlanName,
        { organisationId, userId: user?.uid, userRole: role ?? "" }
      );
      const updated = await getSubscription(organisationId);
      setSubscription(updated);
    } catch (e) {
      setError(e?.message ?? "Failed to change plan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!organisationId || !canManageBilling) return;
    if (!window.confirm("Cancel subscription? You will keep access until the end of the current period.")) return;
    setError(null);
    setActionLoading(true);
    try {
      await cancelSubscription(organisationId, {
        organisationId,
        userId: user?.uid,
        userRole: role ?? "",
      });
      setSubscription(null);
    } catch (e) {
      setError(e?.message ?? "Failed to cancel.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "1rem 0" }}>Loading…</div>;

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>Billing &amp; subscription</h1>
      {!canManageBilling && (
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Only organisation Admins can change plan or cancel. You can view your current plan below.
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {!subscription && !loading && (
        <div style={cardStyle}>
          <p>No active subscription found for this organisation. Contact support or complete signup to get started.</p>
        </div>
      )}

      {subscription && (
        <>
          <div style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Current plan</h2>
            <p style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 0 }}>{subscription.planName}</p>
            <p style={{ color: "#666", marginTop: 4 }}>
              Billing cycle: <strong>{subscription.billingCycle}</strong>
            </p>
            <p style={{ color: "#666", marginTop: 4 }}>
              Renewal date: <strong>{formatDate(subscription.endDate)}</strong>
            </p>
            <p style={{ fontSize: "0.875rem", color: "#888", marginTop: 8 }}>
              Service limit: {getPlanLimits(subscription.planName).maxServices == null ? "Unlimited" : getPlanLimits(subscription.planName).maxServices}
            </p>
          </div>

          {canManageBilling && (
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Change plan</h2>
              <p style={{ color: "#666", marginBottom: "1rem" }}>
                Starter (1 service) · Professional (up to 5) · Enterprise (unlimited)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.values(PLANS)
                  .filter((p) => p !== subscription.planName)
                  .map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => handleChangePlan(plan)}
                      disabled={actionLoading}
                      style={{
                        padding: "8px 16px",
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: actionLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      Switch to {plan}
                    </button>
                  ))}
              </div>
              <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={actionLoading}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    color: "#c62828",
                    border: "1px solid #c62828",
                    borderRadius: 8,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel subscription
                </button>
              </div>
            </div>
          )}

          <div style={{ ...cardStyle, background: "#f5f5f5" }}>
            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Payment</h3>
            <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: 0 }}>
              Payment integration (e.g. Stripe) can be connected here. Use the placeholder in <code>billingService.js</code> to add Checkout and Billing Portal sessions.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
