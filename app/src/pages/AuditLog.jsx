/** [ENABLEMENT GATE: STAGE 8 - COMPLIANCE AUDIT VIEWER] */

import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "../services/authService";
import { formatUkDateTime } from "../utils/dateFormat";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      setForbidden(false);
      try {
        const { organisationId } = await getUserContext();
        if (organisationId !== "dev-org-001") {
          if (mounted) {
            setForbidden(true);
            setRows([]);
          }
          return;
        }

        const q = query(
          collection(db, "audit_logs"),
          orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        const docs = snapshot?.docs ?? [];

        const list = docs.map((d) => {
          const x = d?.data?.() ?? {};
          return {
            id: d?.id ?? "",
            timestamp: x.timestamp ?? null,
            action: x.action ?? "",
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
  }, []);

  if (forbidden) {
    return (
      <div style={styles.forbiddenBox}>
        <h2 style={styles.forbiddenTitle}>403 – Governance Restricted</h2>
        <p style={styles.forbiddenText}>
          Access to the compliance audit log is limited to organisation dev-org-001.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.text}>Loading audit log…</div>;
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <div style={styles.errorTitle}>Failed to load audit log</div>
        <div style={styles.errorText}>{error?.message || String(error)}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Compliance Audit Log</h1>
      <p style={styles.subtitle}>
        Read-only view of key governance and clinical-support actions across dev-org-001.
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
              return (
                <tr key={row.id}>
                  <td style={styles.td}>{formatWhen(row.timestamp) || "—"}</td>
                  <td style={styles.td}>
                    <span style={badgeStyle}>{row.action || "—"}</span>
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
  container: {
    maxWidth: 1100,
    margin: "0 auto",
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
  text: {
    fontFamily: "sans-serif",
    color: "#334155",
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
    color: "#7f1d1d",
    fontFamily: "sans-serif",
  },
  errorTitle: {
    fontWeight: 900,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
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

