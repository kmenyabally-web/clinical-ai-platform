import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import { db } from "../firebase";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { DEFAULT_ORG_FEATURES } from "../config/organisationTemplates";
import { GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";

const FEATURE_ORDER = [
  "clinicalNotes",
  "medication",
  "inspection",
  "evidencePack",
  "mdt",
  "risk",
  "vitals",
  "careLogs",
  "audit",
];

// Core: audit trail is always required.
// All other flags are optional modules and can be disabled/enabled per tenant.
const CORE_FEATURE_KEYS = new Set(["audit"]);

function featureLabel(key) {
  const map = {
    clinicalNotes: "Clinical Notes",
    medication: "Medication",
    inspection: "Inspection",
    evidencePack: "Evidence Pack",
    mdt: "MDT Reviews",
    risk: "Risk Intelligence",
    vitals: "Vitals",
    careLogs: "Care Logs",
    audit: "Audit Trail",
  };
  return map[key] ?? key;
}

export default function FeatureSettings() {
  const { organisationId, reload } = useOrganisation();
  const { role, isGlobalAdmin } = useRole();

  const [features, setFeatures] = useState({ ...DEFAULT_ORG_FEATURES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const allowed = role === "Admin" || role === "Manager" || isGlobalAdmin === true;
  const featureKeys = useMemo(() => {
    const keysFromDefault = Object.keys(DEFAULT_ORG_FEATURES);
    const keysFromState = Object.keys(features ?? {});
    const merged = Array.from(new Set([...FEATURE_ORDER, ...keysFromDefault, ...keysFromState]));
    return merged.filter(Boolean);
  }, [features]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

        const snap = await getDoc(doc(db, "organisations", organisationId));
        const loadedFeatures = snap.exists?.() ? snap.data?.().features : null;

        // Merge defaults so toggles are predictable even when older org docs are missing keys.
        const merged = {
          ...DEFAULT_ORG_FEATURES,
          ...(loadedFeatures && typeof loadedFeatures === "object" ? loadedFeatures : {}),
        };

        // Enforce core keys (non-negotiable).
        for (const k of CORE_FEATURE_KEYS) merged[k] = true;

        if (!cancelled) setFeatures(merged);
      } catch (e) {
        console.error("FEATURE SETTINGS LOAD ERROR:", e);
        if (!cancelled) setError(e?.message ?? "Something went wrong. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (allowed) load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [organisationId, allowed]);

  const toggleFeature = (key) => {
    if (CORE_FEATURE_KEYS.has(key)) return;
    setFeatures((prev) => ({ ...prev, [key]: !prev?.[key] }));
  };

  const saveFeatures = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

      const next = { ...features };
      for (const k of CORE_FEATURE_KEYS) next[k] = true;

      await updateDoc(doc(db, "organisations", organisationId), { features: next });
      await reload();
      setSuccess("Features updated");
    } catch (e) {
      console.error("FEATURE SETTINGS SAVE ERROR:", e);
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Access denied</h2>
        <p style={{ color: "var(--text-muted)" }}>Only organisation admins can change features.</p>
        <div style={{ marginTop: 12 }}>
          <Link to="/organisation-dashboard" style={{ color: "var(--primary)", fontWeight: 800 }}>
            Back
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>Loading…</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Feature Settings</h2>

      <p style={{ color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
        Toggle optional modules. Core capabilities are always enabled.
      </p>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 14,
            marginBottom: 12,
            padding: "10px 12px",
            background: "#ffe6e6",
            color: "#a10000",
            border: "1px solid #ffb3b3",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          style={{
            marginTop: 14,
            marginBottom: 12,
            padding: "10px 12px",
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {success}
        </div>
      ) : null}

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {featureKeys.map((key) => {
          const isCore = CORE_FEATURE_KEYS.has(key);
          const checked = !!features?.[key];
          return (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--surface)",
                cursor: isCore ? "not-allowed" : "pointer",
                opacity: isCore ? 0.9 : 1,
              }}
              title={isCore ? "Core feature (cannot be disabled)" : "Toggle this module"}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isCore}
                onChange={() => toggleFeature(key)}
              />
              <span style={{ fontWeight: 800, fontSize: 14 }}>{featureLabel(key)}</span>
              {isCore ? (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", fontWeight: 800 }}>
                  Required
                </span>
              ) : null}
            </label>
          );
        })}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={saveFeatures}
          disabled={saving}
          style={{
            padding: "10px 16px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

