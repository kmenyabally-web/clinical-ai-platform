/** [ENABLEMENT GATE: STAGE 3 - PERSON-IDENTIFIABLE READ ONLY] */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPatients } from "../services/patientService";
import { logAuditEventNonBlocking } from "../services/auditService";

export default function PatientList() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listPatients();
        if (isMounted) setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1000);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const normalizedTerm = (debouncedSearchTerm || "").trim().toLowerCase();
  const isSearchActive = normalizedTerm.length > 0;

  const filteredRows = !isSearchActive
    ? rows
    : rows.filter((r) => {
        const first = (r.firstName || "").toString().toLowerCase();
        const last = (r.lastName || "").toString().toLowerCase();
        return first.includes(normalizedTerm) || last.includes(normalizedTerm);
      });

  useEffect(() => {
    if (!isSearchActive) return;
    logAuditEventNonBlocking({
      action: "PATIENT_SEARCH",
      metadata: {
        searchTerm: debouncedSearchTerm,
        resultCount: filteredRows.length,
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <span style={styles.badge}>Stage 3</span>
        <span style={styles.subtitle}>Non-Clinical View</span>
        {isSearchActive ? (
          <span style={styles.searchBadge}>Search Active</span>
        ) : null}
      </div>

      <h2 style={styles.title}>Patient List (Metadata)</h2>

      <div style={styles.searchRow}>
        <label style={styles.searchLabel} htmlFor="patientSearch">
          Search
        </label>
        <input
          id="patientSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type a first or last name…"
          style={styles.searchInput}
        />
      </div>

      {isLoading ? (
        <p style={styles.text}>Loading patient metadata…</p>
      ) : error ? (
        <div style={styles.errorBox}>
          <div style={styles.errorTitle}>Governance / Access Error</div>
          <div style={styles.errorText}>{error?.message || String(error)}</div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>First name</th>
              <th style={styles.th}>Last name</th>
              <th style={styles.th}>DOB</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} style={styles.tr}>
                <td style={styles.td}>
                  <Link to={`/patients/${r.id}`} style={styles.nameLink}>
                    {r.firstName}
                  </Link>
                </td>
                <td style={styles.td}>
                  <Link to={`/patients/${r.id}`} style={styles.nameLink}>
                    {r.lastName}
                  </Link>
                </td>
                <td style={styles.td}>{formatDob(r.dob)}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td style={styles.td} colSpan={3}>
                  {isSearchActive
                    ? "No patients match your search criteria."
                    : "No patients found for this organisation."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDob(value) {
  if (!value) return "";
  // Support Firestore Timestamp-like objects { seconds, nanoseconds }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return "";
}

const styles = {
  container: {
    padding: 20,
    fontFamily: "sans-serif",
    maxWidth: 900,
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e0f2fe",
    color: "#075985",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 12,
    color: "#334155",
    fontWeight: 600,
  },
  searchBadge: {
    display: "inline-block",
    backgroundColor: "#fff7ed",
    color: "#9a3412",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 14px 0",
    color: "#0f172a",
  },
  text: {
    color: "#334155",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  searchRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    minWidth: 56,
  },
  searchInput: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    outline: "none",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 13,
  },
  tr: {},
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    color: "#0f172a",
    fontSize: 13,
  },
  nameLink: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 800,
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    border: "1px solid #fecaca",
    backgroundColor: "#fef2f2",
  },
  errorTitle: {
    fontWeight: 800,
    color: "#991b1b",
    marginBottom: 6,
  },
  errorText: {
    color: "#7f1d1d",
  },
};

