/** [ENABLEMENT GATE: STAGE 8 - COMPLIANCE AUDIT VIEWER] */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "../services/authService";
import { formatUkDateTime } from "../utils/dateFormat";
import { useOrganisation } from "../context/OrganisationContext";

export default function AuditLog() {
  const { hasFeature, loading: orgLoading } = useOrganisation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!hasFeature("audit")) {
        if (mounted) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { organisationId } = await getUserContext();
        if (!organisationId) {
          if (mounted) {
            setRows([]);
          }
          return;
        }

        let docs = [];
        try {
          const q = query(
            collection(db, "audit_logs"),
            where("organisationId", "==", organisationId),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          docs = snapshot?.docs ?? [];
        } catch {
          const q = query(
            collection(db, "audit_logs"),
            where("organisationId", "==", organisationId),
            orderBy("timestamp", "desc")
          );
          const snapshot = await getDocs(q);
          docs = snapshot?.docs ?? [];
        }
        const list = docs.map((d) => {
          const x = d?.data?.() ?? {};
          return {
            id: d?.id ?? "",
            timestamp: x.createdAt ?? x.timestamp ?? null,
            action: x.action ?? x.eventType ?? "",
            userEmail: x.userEmail ?? x.user ?? "",
            metadata: x.metadata ?? {},
          };
        });

        if (mounted) setRows(list);
      } catch (err) {
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [hasFeature]);

  if (orgLoading) {
    return <div style={styles.pageText}>Loading…</div>;
  }

  if (!hasFeature("audit")) {
    return (
      <div style={{ padding: "2rem", maxWidth: 560 }}>
        <h1 style={styles.title}>Compliance audit log</h1>
        <p style={{ color: "#64748b" }}>
          Extended audit log visibility is available on the Enterprise plan.{" "}
          <Link to="/billing" style={{ color: "#1976d2", fontWeight: 700 }}>
            View billing &amp; plans
          </Link>
        </p>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.pageText}>Loading audit log…</div>;
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorPanel}>
          <div style={styles.errorTitle}>Failed to load audit log</div>
          <div style={styles.errorText}>{error?.message || String(error)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Compliance Audit Log</h1>
      <p style={styles.subtitle}>
        Read-only view of key governance and clinical-support actions for your organisation.
      </p>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date / Time</th>
              <th style={styles.th}>Action</th>
              <th style={styles.th}>User (Email)</th>
              <th style={styles.th}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badgeStyle = getBadgeStyle(row.action, row.metadata);
              const keyAction = keyActionFromAuditRow(row.action, row.metadata);
              return (
                <tr key={row.id}>
                  <td style={styles.td}>{formatWhen(row.timestamp) || "—"}</td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span style={badgeStyle}>{row.action || "—"}</span>
                      {keyAction ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            backgroundColor: "#f8fafc",
                          }}
                        >
                          {keyAction}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td style={styles.td}>{row.userEmail || "—"}</td>
                  <td style={styles.td}>{renderMetadata(row.metadata)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td style={styles.td} colSpan={4}>
                  No audit entries recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatWhen(value) {
  return formatUkDateTime(value, "");
}

function renderMetadata(meta) {
  if (!meta || typeof meta !== "object") return "—";
  const entries = Object.entries(meta);
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function keyActionFromAuditRow(action, metadata) {
  const a = (action || "").toString().toUpperCase();
  const m = JSON.stringify(metadata ?? {}).toLowerCase();

  // created
  if (a.includes("CREATE") || a.includes("CREATED") || m.includes(": created") || m.includes("created")) return "created";

  // updated
  if (a.includes("UPDATE") || a.includes("UPDATED") || m.includes("updated")) return "updated";

  // approved
  if (a.includes("APPROVE") || a.includes("APPROVED") || a.includes("APPROVAL") || m.includes("approved")) return "approved";

  return null;
}

function getBadgeStyle(action, metadata) {
  const base = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 800,
  };

  const text = (action || "").toString().toUpperCase();
  const metaStr = JSON.stringify(metadata ?? {}).toLowerCase();

  if (text === "INCIDENT_REPORTED" || text === "INCIDENT_REPORT_CREATED") {
    return {
      ...base,
      backgroundColor: "#ffedd5",
      color: "#9a3412",
    };
  }

  if (text === "DASHBOARD_VIEWED" || text === "DASHBOARD_REPORTS_GENERATED") {
    return {
      ...base,
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
    };
  }

  if (
    text.includes("GOVERNANCE BREACH") ||
    text.includes("UNAUTHORIZED ACCESS") ||
    metaStr.includes("governance breach") ||
    metaStr.includes("unauthorized access")
  ) {
    return {
      ...base,
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    ...base,
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
  };
}

const styles = {
  pageText: {
    width: "100%",
    padding: "24px",
    color: "#334155",
  },
  container: {
    width: "100%",
    padding: "24px",
    fontFamily: "sans-serif",
  },
  title: {
    marginTop: 0,
    marginBottom: 4,
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#475569",
    fontSize: 13,
  },
  tableWrapper: {
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    fontSize: "0.85rem",
    color: "#0f172a",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "0.82rem",
    color: "#0f172a",
    verticalAlign: "top",
  },
  errorBox: {
    width: "100%",
    margin: 0,
    marginTop: "8px",
    padding: "24px",
    fontFamily: "sans-serif",
    boxSizing: "border-box",
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 6,
    color: "#7f1d1d",
  },
  errorText: {
    fontSize: 13,
    color: "#7f1d1d",
  },
  errorPanel: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
  },
  forbiddenBox: {
    maxWidth: 640,
    margin: "2rem auto",
    padding: "1.5rem 1.75rem",
    borderRadius: 12,
    border: "1px solid #fee2e2",
    background: "#fef2f2",
    color: "#b91c1c",
    fontFamily: "sans-serif",
  },
  forbiddenTitle: {
    marginTop: 0,
    marginBottom: "0.5rem",
    fontSize: "1.25rem",
  },
  forbiddenText: {
    margin: 0,
    fontSize: "0.9rem",
  },
};

