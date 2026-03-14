/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL] */
import React from "react";
import { useGovernance } from "../hooks/useGovernance";
import { useAuth } from "../context/AuthContext";

export default function FirstSafeScreen() {
  const { isLoading, isAuthenticated, userRole, orgName, error } = useGovernance();
  const { user, logout } = useAuth();
  const userEmail = user?.email;

  // 1. Loading State
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div className="spinner-animation" style={styles.spinner}></div>
        <p style={styles.text}>Verifying Governance Context...</p>
      </div>
    );
  }

  // 2. Error / Violation State
  if (error || (isAuthenticated && !orgName)) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h1 style={{ color: "red" }}>Governance Violation</h1>
          <p style={styles.text}>
            {error?.message || "Access Restricted: Incomplete Governance Profile."}
          </p>
        <button onClick={() => logout()} style={styles.button}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // 3. Success State
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.badge}>Governance Verified</div>
        <h2 style={styles.title}>{orgName || "Organisation Name"}</h2>
        
        <div style={styles.infoBox}>
          <p style={styles.infoText}><strong>User:</strong> {userEmail}</p>
          <p style={styles.infoText}><strong>Role:</strong> {userRole}</p>
        </div>

        <p style={styles.description}>
          You are currently operating under Stage 2 Governance. 
          Clinical data remains locked.
        </p>
      </div>

      <footer style={styles.footer}>
        System Operating under Stage 2 Governance: Non-Clinical Metadata Read Only.
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "20px",
    fontFamily: "Arial, sans-serif"
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center"
  },
  errorCard: {
    backgroundColor: "#fff1f2",
    padding: "30px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
    textAlign: "center"
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "5px 15px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "20px"
  },
  title: {
    margin: "0 0 15px 0",
    color: "#1e293b"
  },
  infoBox: {
    backgroundColor: "#f1f5f9",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px",
    textAlign: "left"
  },
  infoText: {
    margin: "5px 0",
    fontSize: "14px",
    color: "#475569"
  },
  description: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: "1.6"
  },
  footer: {
    marginTop: "30px",
    fontSize: "11px",
    color: "#94a3b8"
  },
  button: {
    marginTop: "15px",
    padding: "10px 20px",
    backgroundColor: "#1e293b",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #3498db",
    borderRadius: "50%",
    marginBottom: "20px"
  },
  text: {
    color: "#1e293b",
    fontSize: "16px"
  }
};