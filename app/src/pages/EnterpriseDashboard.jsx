import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Link, Navigate } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { db } from "../firebase";
import { getGroupOrganisations } from "../services/groupService";
import { listInspectionScores } from "../services/inspectionScoreService";

function riskFromOverall(overall) {
  if (typeof overall !== "number" || Number.isNaN(overall)) return "—";
  if (overall <= 40) return "HIGH";
  if (overall <= 70) return "MEDIUM";
  return "LOW";
}

function trendLabel(prev, curr) {
  if (typeof prev !== "number" || typeof curr !== "number") return "—";
  const d = Math.round(curr - prev);
  if (d > 0) return `↑ ${d}`;
  if (d < 0) return `↓ ${Math.abs(d)}`;
  return "→";
}

function domainNum(ds, key) {
  if (!ds || typeof ds !== "object") return null;
  const k = String(key).toUpperCase();
  const v =
    ds[k] ??
    ds[key] ??
    ds.SAFE ??
    ds.EFFECTIVE ??
    ds["WELL_LED"] ??
    ds["WELL-LED"];
  return typeof v === "number" ? v : null;
}

/**
 * Multi-organisation view for GROUP_ADMIN / SUPER_ADMIN (scoped by groupId for group admins).
 */
export default function EnterpriseDashboard() {
  const { groupId, loading: orgLoading } = useOrganisation();
  const { isSuperAdmin, isGroupAdmin, loading: roleLoading } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSuperAdmin && !groupId) return;
    setLoading(true);
    setError(null);
    try {
      let orgs = [];
      if (groupId) {
        orgs = await getGroupOrganisations(groupId);
      } else if (isSuperAdmin) {
        const snap = await getDocs(query(collection(db, "organisations"), limit(400)));
        orgs = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
      } else {
        setRows([]);
        setLoading(false);
        return;
      }
      const enriched = await Promise.all(
        (orgs ?? []).map(async (org) => {
          const id = org.id ?? org.organisationId;
          const name = typeof org.name === "string" ? org.name : id;
          const scores = await listInspectionScores(id, 5).catch(() => []);
          const latest = Array.isArray(scores) && scores.length ? scores[0] : null;
          const prev = Array.isArray(scores) && scores.length > 1 ? scores[1] : null;
          const overall =
            typeof latest?.overallScore === "number" ? latest.overallScore : null;
          const prevOverall =
            typeof prev?.overallScore === "number" ? prev.overallScore : null;
          const ds = latest?.domainScores ?? null;
          return {
            id,
            name,
            overall,
            risk: riskFromOverall(overall),
            trend: trendLabel(prevOverall, overall),
            safe: domainNum(ds, "SAFE"),
            effective: domainNum(ds, "EFFECTIVE"),
            wellLed: domainNum(ds, "WELL_LED") ?? domainNum(ds, "WELL-LED"),
          };
        })
      );
      setRows(enriched);
    } catch (e) {
      setError(e?.message ?? "Failed to load enterprise data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, groupId]);

  useEffect(() => {
    if (!orgLoading && !roleLoading) void load();
  }, [load, orgLoading, roleLoading]);

  const highRiskCount = useMemo(
    () => rows.filter((r) => r.risk === "HIGH").length,
    [rows]
  );

  /** GROUP_ADMIN without a group: optional enterprise is off — same experience as standalone orgs. */
  if (!orgLoading && !roleLoading && isGroupAdmin && !groupId && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ padding: "16px 18px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
        Enterprise view
      </h1>
      <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: 14 }}>
        Organisations in your group — compare scores and open the Command Centre for each service.
      </p>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {highRiskCount > 0 ? (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          Group risk alert: {highRiskCount} organisation{highRiskCount === 1 ? "" : "s"} at{" "}
          <strong>HIGH</strong> risk (readiness score ≤ 40%).
        </div>
      ) : (
        <div
          style={{
            marginBottom: 20,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#f0fdf4",
            color: "#166534",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          No organisations flagged HIGH in this group from the latest saved scores.
        </div>
      )}

      {loading ? <p style={{ color: "#64748b" }}>Loading organisations…</p> : null}

      {!loading && rows.length === 0 && !error ? (
        <p style={{ color: "#64748b" }}>No organisations found for this group.</p>
      ) : null}

      <div style={{ overflowX: "auto", marginBottom: 28 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            minWidth: 720,
          }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "10px 8px" }}>Organisation</th>
              <th style={{ padding: "10px 8px" }}>Score</th>
              <th style={{ padding: "10px 8px" }}>Risk</th>
              <th style={{ padding: "10px 8px" }}>Trend</th>
              <th style={{ padding: "10px 8px" }}>SAFE</th>
              <th style={{ padding: "10px 8px" }}>EFFECTIVE</th>
              <th style={{ padding: "10px 8px" }}>WELL-LED</th>
              <th style={{ padding: "10px 8px" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 8px", fontWeight: 800 }}>{r.name}</td>
                <td style={{ padding: "12px 8px" }}>
                  {typeof r.overall === "number" ? `${Math.round(r.overall)}%` : "—"}
                </td>
                <td style={{ padding: "12px 8px", fontWeight: 800 }}>{r.risk}</td>
                <td style={{ padding: "12px 8px", color: "#475569" }}>{r.trend}</td>
                <td style={{ padding: "12px 8px" }}>{r.safe != null ? `${Math.round(r.safe)}` : "—"}</td>
                <td style={{ padding: "12px 8px" }}>{r.effective != null ? `${Math.round(r.effective)}` : "—"}</td>
                <td style={{ padding: "12px 8px" }}>{r.wellLed != null ? `${Math.round(r.wellLed)}` : "—"}</td>
                <td style={{ padding: "12px 8px" }}>
                  <Link
                    to={`/command-centre?organisationId=${encodeURIComponent(r.id)}`}
                    style={{ fontWeight: 800, color: "#005eb8" }}
                  >
                    Command Centre
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "#94a3b8" }}>
        Scores use the latest rows in <code>inspection_scores</code> per organisation. Trends compare the two most
        recent snapshots.
      </p>
    </div>
  );
}
