import { useState, useEffect, type CSSProperties } from "react";
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
import { PLANS as PLAN_DEFS } from "../constants/plans";
import { formatUkDate } from "../utils/dateFormat";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

const DEMO_MAIL = "mailto:sales@sanctumcare.app?subject=SanctumCare%20billing%20enquiry";

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
 * Billing — organisation-scoped plan display. Commercial upgrades go through Request Demo (no in-app Stripe).
 */
export default function Billing() {
  const { organisationId, organisation, reload, effectivePlanKey } = useOrganisation();
  const { user } = useAuth();
  const { role, can } = useRole();
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof getSubscription>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
      .catch((e: Error) => setError(e?.message ?? "Failed to load subscription"))
      .finally(() => setLoading(false));
  }, [organisationId]);

  async function handleChangePlanLocal(newPlanKey: string) {
    if (!organisationId || !canManageBilling) return;
    setError(null);
    setActionLoading(true);
    try {
      await updateSubscriptionPlan(organisationId, newPlanKey, {
        organisationId,
        userId: user?.uid ?? "",
        userRole: role ?? "",
      });
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
    <div
      style={{
        padding: "1rem 0",
        width: "100%",
        maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Billing &amp; subscription</h1>
      <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
        {organisation?.name ?? "Organisation"} · effective plan <strong>{currentKey}</strong> (per organisation, not per
        user). Upgrades and enterprise terms are arranged via demo — no self-serve card checkout in this build.
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
            No active subscription document found for this organisation. Provisioning is admin-controlled — use{" "}
            <a href={DEMO_MAIL}>Request demo</a> to align a plan, or contact support.
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
        <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Plans &amp; pricing</h2>
        <p style={{ color: "#64748b", marginTop: 0, fontSize: "0.95rem" }}>
          Starter <strong>£59</strong> · Professional <strong>£99</strong> (most popular) · Enterprise <strong>£249+</strong>
        </p>
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
            const priceLabel = key === "ENTERPRISE" ? `£${def.price}+/mo` : `£${def.price}/mo`;
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
                {key === "PRO" ? (
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#1976d2", marginTop: 4 }}>Most popular</div>
                ) : null}
                <div style={{ fontSize: "1.25rem", marginTop: 8 }}>{priceLabel}</div>
                <ul style={{ margin: "0.75rem 0 0 1rem", padding: 0, fontSize: "0.85rem", color: "#555" }}>
                  {def.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  href={DEMO_MAIL}
                  style={{
                    display: "block",
                    marginTop: 12,
                    width: "100%",
                    textAlign: "center",
                    padding: "8px 12px",
                    background: "#1976d2",
                    color: "#fff",
                    borderRadius: 8,
                    fontWeight: 600,
                    textDecoration: "none",
                    boxSizing: "border-box",
                  }}
                >
                  Request demo
                </a>
                {isCurrent && (
                  <p style={{ marginTop: 12, marginBottom: 0, fontSize: "0.85rem", color: "#1976d2" }}>
                    Current plan
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {subscription && canManageBilling && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Admin: plan record (manual)</h2>
          <p style={{ color: "#666", marginBottom: "1rem" }}>
            For testing or support-assigned plans only — keys: BASIC · PRO · ENTERPRISE
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
