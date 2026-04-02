import { useState, useEffect, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  getSubscription,
  updateSubscriptionPlan,
  cancelSubscription,
  createCheckoutSession,
  PLANS,
  getPlanLimits,
  BILLING_CYCLES,
} from "../services/billingService";
import { getSubscription as getPreStripeSubscription, MOCK_PLANS } from "../services/subscriptionService";
import { hasFeature as hasPlanFeature } from "../utils/featureAccess.js";
import { PLANS as PLAN_DEFS } from "../constants/plans";
import { formatUkDate } from "../utils/dateFormat";

const cardStyle: CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

function formatDate(ts: unknown) {
  return formatUkDate(ts, "—");
}

/**
 * Billing and subscription — organisation-scoped plan, Stripe Checkout for paid tiers, manual downgrade to Basic.
 */
export default function Billing() {
  const { organisationId, organisation, reload, effectivePlanKey } = useOrganisation();
  const { user } = useAuth();
  const { role, can } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof getSubscription>>>(null);
  const [preStripeSubscription, setPreStripeSubscription] = useState<Awaited<ReturnType<typeof getPreStripeSubscription>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const canManageBilling = can("organisation:manage");

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      reload();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, reload, setSearchParams]);

  useEffect(() => {
    if (!organisationId) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSubscription(organisationId)
      .then(setSubscription)
      .catch((e: Error) => setError(e?.message ?? "Failed to load subscription"))
      .finally(() => setLoading(false));
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId) {
      setPreStripeSubscription(null);
      return;
    }
    getPreStripeSubscription(organisationId).then(setPreStripeSubscription).catch(() => setPreStripeSubscription(null));
  }, [organisationId]);

  async function handleChangePlanLocal(newPlanKey: string) {
    if (!organisationId || !canManageBilling) return;
    setError(null);
    setActionLoading(true);
    try {
      await updateSubscriptionPlan(
        organisationId,
        newPlanKey,
        { organisationId, userId: user?.uid ?? "", userRole: role ?? "" }
      );
      const updated = await getSubscription(organisationId);
      setSubscription(updated);
      reload();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message ?? "Failed to change plan.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCheckoutPaid(planKey: string) {
    if (!organisationId || !canManageBilling) return;
    setError(null);
    setActionLoading(true);
    try {
      const origin = window.location.origin;
      const { url } = await createCheckoutSession(
        organisationId,
        planKey,
        BILLING_CYCLES.MONTHLY,
        `${origin}/billing?checkout=success`,
        `${origin}/billing?checkout=cancel`
      );
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Checkout did not return a redirect URL. Is the billing backend deployed?");
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message ?? "Failed to start checkout.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSelectPlan(planKey: string) {
    if (planKey === PLANS.BASIC) {
      await handleChangePlanLocal(planKey);
      return;
    }
    await handleCheckoutPaid(planKey);
  }

  async function handleCancel() {
    if (!organisationId || !canManageBilling) return;
    if (!window.confirm("Cancel subscription? You will keep access until the end of the current period.")) return;
    setError(null);
    setActionLoading(true);
    try {
      await cancelSubscription(organisationId, {
        organisationId,
        userId: user?.uid ?? "",
        userRole: role ?? "",
      });
      setSubscription(null);
      reload();
    } catch (e: unknown) {
      const err = e as Error;
      setError(err?.message ?? "Failed to cancel.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <div style={{ padding: "1rem 0" }}>Loading…</div>;

  const currentKey = subscription?.planName ?? effectivePlanKey ?? PLANS.BASIC;

  return (
    <div style={{ padding: "1rem 0", maxWidth: 960 }}>
      <h1 style={{ marginTop: 0 }}>Billing &amp; subscription</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        {organisation?.name ?? "Organisation"} · effective plan <strong>{currentKey}</strong> (billing is per organisation, not per user).
      </p>

      {!canManageBilling && (
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          Only organisation admins can change billing. You can view the current plan below.
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {!subscription && !loading && organisationId && (
        <div style={cardStyle}>
          <p style={{ marginTop: 0 }}>
            No active subscription document found for this organisation. Complete signup or contact support. You can
            still choose a target plan below once billing is provisioned.
          </p>
        </div>
      )}

      {subscription && (
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
            Service limit:{" "}
            {getPlanLimits(subscription.planName).maxServices == null
              ? "Unlimited"
              : getPlanLimits(subscription.planName).maxServices}
          </p>
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Pre-Stripe plan access</h2>
        <p style={{ color: "#666", marginTop: 0 }}>
          Current plan: <strong>{preStripeSubscription?.plan ?? "FREE"}</strong>
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Plan</th>
                <th style={{ textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb" }}>Evidence Pack</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(MOCK_PLANS).map(([plan, features]) => (
                <tr key={plan}>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>{plan}</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid #f1f5f9" }}>
                    {features.evidencePack ? "Enabled" : "Locked"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#64748b", marginBottom: 0, marginTop: 10, fontSize: "0.85rem" }}>
          Effective access now:{" "}
          <strong>{hasPlanFeature(preStripeSubscription, "evidencePack") ? "Evidence Pack enabled" : "Evidence Pack locked"}</strong>
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Plans &amp; pricing</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {(Object.keys(PLAN_DEFS) as Array<keyof typeof PLAN_DEFS>).map((key) => {
            const def = PLAN_DEFS[key];
            const isCurrent = currentKey === key;
            const priceLabel = `£${def.price}/mo`;
            return (
              <div
                key={key}
                style={{
                  border: `1px solid ${isCurrent ? "#1976d2" : "#e0e0e0"}`,
                  borderRadius: 12,
                  padding: "1rem",
                  background: isCurrent ? "#e3f2fd" : "#fafafa",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{def.name}</div>
                <div style={{ fontSize: "1.25rem", marginTop: 8 }}>{priceLabel}</div>
                <ul style={{ margin: "0.75rem 0 0 1rem", padding: 0, fontSize: "0.85rem", color: "#555" }}>
                  {def.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {canManageBilling && !isCurrent && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSelectPlan(key)}
                    style={{
                      marginTop: 12,
                      width: "100%",
                      padding: "8px 12px",
                      background: "#1976d2",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {key === PLANS.BASIC ? "Switch to Starter" : `Upgrade to ${def.name}`}
                  </button>
                )}
                {isCurrent && (
                  <p style={{ marginTop: 12, marginBottom: 0, fontSize: "0.85rem", color: "#1976d2" }}>
                    Current plan
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: "0.8rem", color: "#888", marginTop: 12, marginBottom: 0 }}>
          Paid tiers use Stripe Checkout where configured (Cloud Functions and <code>VITE_FIREBASE_FUNCTIONS_URL</code>).
          Switching to Starter without checkout is available for manual plan assignment.
        </p>
      </div>

      {subscription && canManageBilling && (
            <div style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Change plan (quick)</h2>
              <p style={{ color: "#666", marginBottom: "1rem" }}>
                Same keys as subscription records: BASIC · PRO · ENTERPRISE
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.values(PLANS)
                  .filter((p) => p !== subscription.planName)
                  .map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => handleChangePlanLocal(plan)}
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
                      Set to {plan}
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
    </div>
  );
}
