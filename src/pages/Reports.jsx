import { useState, useRef } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { generateReadinessReport } from "../services/reportService";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

/**
 * SanctumCare Clinical Report page. Admin/Manager can generate; Staff/Auditor can view.
 */
export default function Reports() {
  const { organisationId } = useOrganisation();
  const { currentServiceId, currentService } = useService();
  const { user } = useAuth();
  const { can, role } = useRole();
  const canGenerate = can("audit:update");

  const [report, setReport] = useState(null);
  const [reportScope, setReportScope] = useState("service"); // "organisation" | "service"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const reportRef = useRef(null);

  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;

  async function handleGenerate() {
    if (!organisationId || !auditContext) return;
    setError(null);
    setLoading(true);
    try {
      const options = reportScope === "service" && currentServiceId ? { serviceId: currentServiceId } : {};
      const data = await generateReadinessReport(organisationId, auditContext, options);
      setReport(data);
    } catch (e) {
      setError(e?.message ?? "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    if (!reportRef.current) return;
    const content = reportRef.current.cloneNode(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>SanctumCare Clinical Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 1rem; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 1.5rem; } h2 { font-size: 1.2rem; margin-top: 1.5rem; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .score { font-weight: 700; }
            ul { margin: 0.25rem 0 0 1.25rem; padding: 0; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  function handleDownloadJson() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanctumcare-clinical-report-${report.organisation?.id ?? "org"}-${report.generatedAt?.slice(0, 10) ?? "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>SanctumCare Clinical Report</h1>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {!canGenerate && (
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          You can view reports below. Only Admins and Managers can generate new reports.
        </p>
      )}

      {canGenerate && !report && (
        <div style={cardStyle}>
          <p style={{ marginTop: 0 }}>
            Generate a structured SanctumCare Clinical Report with organisation summary, domain scores, risk indicators, evidence coverage, and latest inspection simulation results.
          </p>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ marginRight: 8 }}>Scope:</label>
            <select
              value={reportScope}
              onChange={(e) => setReportScope(e.target.value)}
              style={{ padding: "6px 10px" }}
            >
              <option value="organisation">Organisation-wide</option>
              <option value="service">Current service{currentService ? ` (${currentService.serviceName})` : ""}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !organisationId}
            style={{
              padding: "10px 20px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating…" : "Generate report"}
          </button>
        </div>
      )}

      {report && (
        <>
          <div style={{ marginBottom: "1rem", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canGenerate && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  background: "#f5f5f5",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Regenerating…" : "Regenerate report"}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "8px 16px",
                background: "#37474f",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              style={{
                padding: "8px 16px",
                background: "#2e7d32",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Download as JSON
            </button>
          </div>

          <div ref={reportRef} style={{ marginTop: "0.5rem" }}>
            {/* Organisation Summary */}
            <section style={cardStyle} aria-label="Organisation summary">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Organisation Summary</h2>
              <p><strong>Organisation:</strong> {report.organisation?.name ?? "—"}</p>
              <p><strong>Provider ID:</strong> {report.organisation?.providerId ?? "—"}</p>
              <p><strong>Readiness score:</strong> <span className="score">{report.readinessScore}%</span></p>
              <p><strong>Risk level:</strong> {report.riskLevel}</p>
              <p style={{ fontSize: "0.875rem", color: "#666" }}>Report generated: {report.generatedAt}</p>
            </section>

            {/* Compliance Domain Scores */}
            <section style={cardStyle} aria-label="Compliance domain scores">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Compliance Domain Scores</h2>
              {report.domainSummary?.length === 0 ? (
                <p style={{ color: "#666" }}>No domain data.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>Domain</th>
                      <th style={{ textAlign: "right", padding: "8px", borderBottom: "2px solid #ddd" }}>Score %</th>
                      <th style={{ textAlign: "left", padding: "8px", borderBottom: "2px solid #ddd" }}>Readiness</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.domainSummary?.map((d) => (
                      <tr key={d.domainKey}>
                        <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{d.name || d.domainKey}</td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{d.compliancePercent}%</td>
                        <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>{d.readinessLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Risk Indicators */}
            <section style={cardStyle} aria-label="Risk indicators">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Risk Indicators</h2>
              <p><strong>Open compliance actions:</strong> {report.actionSummary?.openCount ?? 0}</p>
              <p><strong>Overdue actions:</strong> {report.actionSummary?.overdueCount ?? 0}</p>
              {report.actionSummary?.overdueActions?.length > 0 && (
                <ul>
                  {report.actionSummary.overdueActions.map((a) => (
                    <li key={a.id}>{a.title}</li>
                  ))}
                </ul>
              )}
              <p><strong>High severity open actions:</strong> {report.actionSummary?.highSeverityCount ?? 0}</p>
              {report.actionSummary?.highSeverityActions?.length > 0 && (
                <ul>
                  {report.actionSummary.highSeverityActions.map((a) => (
                    <li key={a.id}>{a.title}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Evidence Coverage */}
            <section style={cardStyle} aria-label="Evidence coverage">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Evidence Coverage</h2>
              <p><strong>Total evidence documents:</strong> {report.evidenceSummary?.totalCount ?? 0}</p>
              {report.evidenceSummary?.byDomain?.length > 0 && (
                <ul style={{ marginBottom: 0 }}>
                  {report.evidenceSummary.byDomain.map((d) => (
                    <li key={d.domainKey}>{d.label}: {d.count}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent Inspection Simulation Results */}
            <section style={cardStyle} aria-label="Recent inspection simulation results">
              <h2 style={{ marginTop: 0, fontSize: "1.2rem" }}>Recent Inspection Simulation Results</h2>
              {report.latestInspection ? (
                <>
                  <p><strong>Latest completed simulation</strong></p>
                  <p>Inspection score: <strong>{report.latestInspection.overallScore ?? "—"}%</strong></p>
                  <p>Risk level: {report.latestInspection.riskLevel ?? "—"}</p>
                </>
              ) : (
                <p style={{ color: "#666" }}>No completed inspection simulation yet.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
