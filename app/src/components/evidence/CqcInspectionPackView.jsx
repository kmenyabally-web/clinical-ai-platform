import React, { useCallback, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { evidenceItemToDisplay } from "../../engine/cqcInspectionPack";

/**
 * @param {{
 *   pack: { cqcInspection?: { domains?: unknown[], criticalIssues?: string[] } } | null,
 *   exportContainerId?: string,
 * }} props
 */
export default function CqcInspectionPackView({ pack, exportContainerId = "cqc-inspection-export-root" }) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const ci = pack?.cqcInspection;
  const domains = Array.isArray(ci?.domains) ? ci.domains : [];
  const issues = Array.isArray(ci?.criticalIssues) ? ci.criticalIssues : [];

  const exportPdf = useCallback(async () => {
    const el = document.getElementById(exportContainerId);
    if (!el) return;
    setPdfBusy(true);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false });
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10;
      const imgWmm = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageHmm = pdf.internal.pageSize.getHeight() - margin * 2;
      const pxPerMm = canvas.width / imgWmm;
      const slicePx = pageHmm * pxPerMm;
      let offsetY = 0;
      let pageIdx = 0;
      while (offsetY < canvas.height) {
        const h = Math.min(slicePx, canvas.height - offsetY);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = h;
        const ctx = slice.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, offsetY, canvas.width, h, 0, 0, canvas.width, h);
        }
        const url = slice.toDataURL("image/png");
        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(url, "PNG", margin, margin, imgWmm, h / pxPerMm);
        offsetY += h;
        pageIdx += 1;
      }
      const d = new Date().toISOString().slice(0, 10);
      pdf.save(`CQC_Inspection_Evidence_${d}.pdf`);
    } catch (e) {
      console.error("CQC PDF export failed:", e);
    } finally {
      setPdfBusy(false);
    }
  }, [exportContainerId]);

  if (!pack || domains.length === 0) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <div className="cqc-inspection-toolbar-no-print" style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={exportPdf}
          disabled={pdfBusy}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 800,
            cursor: pdfBusy ? "wait" : "pointer",
            fontSize: 14,
          }}
        >
          {pdfBusy ? "Building PDF…" : "Export inspection PDF"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Print
        </button>
      </div>

      <div
        id={exportContainerId}
        style={{
          background: "#fff",
          padding: 28,
          maxWidth: 900,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: 22, color: "#0f172a" }}>CQC inspection evidence</h1>
        <p style={{ margin: "0 0 6px 0", fontSize: 13, color: "#64748b" }}>{pack.summary}</p>
        {pack.cqcInspection?.simulation ? (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 14px",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: 10,
              color: "#14532d",
            }}
          >
            <strong style={{ display: "block", marginBottom: 8, fontSize: 14 }}>Live inspection simulation</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13, marginBottom: 8 }}>
              {Object.entries(pack.cqcInspection.simulation.domains ?? {}).map(([k, v]) => (
                <span key={k} style={{ fontWeight: 700 }}>
                  {k}: {typeof v === "number" ? Math.round(v) : v}
                </span>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
              Overall: {Math.round(pack.cqcInspection.simulation.overallScore ?? 0)} →{" "}
              {pack.cqcInspection.simulation.rating}
            </p>
            {(pack.cqcInspection.simulation.warnings ?? []).length > 0 ? (
              <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                {(pack.cqcInspection.simulation.warnings ?? []).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {ci?.counts ? (
          <p style={{ margin: "0 0 20px 0", fontSize: 12, color: "#475569" }}>
            Counts — notes: {ci.counts.notes}, incidents: {ci.counts.incidents}, care plans: {ci.counts.carePlans}, training:{" "}
            {ci.counts.training}, policies: {ci.counts.policies}, audits: {ci.counts.audits}
          </p>
        ) : null}

        {issues.length > 0 ? (
          <div
            role="alert"
            style={{
              marginBottom: 22,
              padding: "14px 16px",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: 10,
              color: "#92400e",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: 15 }}>Inspection risks & gaps</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {issues.map((issue, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {domains.map((section) => (
          <div
            key={section.domain}
            style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <h2 style={{ margin: "0 0 6px 0", fontSize: 17, color: "#0f172a", letterSpacing: "0.02em" }}>{section.domain}</h2>
            <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "#334155" }}>{section.status}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{section.summary}</p>

            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "#2563eb" }}>View evidence</summary>
              <div style={{ marginTop: 12 }}>
                {section.evidence && typeof section.evidence === "object"
                  ? Object.entries(section.evidence).map(([key, items]) => (
                      <div key={key} style={{ marginBottom: 14 }}>
                        <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>{key}</strong>
                        {Array.isArray(items) && items.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {items.map((item, i) => (
                              <li key={i} style={{ marginBottom: 6, color: "#334155", fontSize: 13 }}>
                                {evidenceItemToDisplay(item)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>—</p>
                        )}
                      </div>
                    ))
                  : null}
              </div>
            </details>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .cqc-inspection-toolbar-no-print { display: none !important; }
          body * { visibility: hidden; }
          #cqc-inspection-export-root, #cqc-inspection-export-root * { visibility: visible; }
          #cqc-inspection-export-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
