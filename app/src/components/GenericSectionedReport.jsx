import React, { useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CLINICAL_CONTENT_MAX_WIDTH_PX } from "../config/contentLayout";

const containerStyle = {
  background: "#ffffff",
  padding: 30,
  borderRadius: 10,
  lineHeight: 1.6,
  color: "#0f172a",
  width: "100%",
  maxWidth: CLINICAL_CONTENT_MAX_WIDTH_PX,
  boxSizing: "border-box",
};

const h2Style = {
  margin: "0 0 20px 0",
  fontSize: 22,
  fontWeight: 800,
  borderBottom: "2px solid #3B82F6",
  paddingBottom: 10,
};

const h3Style = {
  margin: "24px 0 10px 0",
  fontSize: 16,
  fontWeight: 700,
  color: "#1e293b",
};

const pStyle = {
  margin: "0 0 8px 0",
  fontSize: 14,
  whiteSpace: "pre-wrap",
};

const toolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 16,
};

const btnStyle = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const btnPrimaryStyle = {
  ...btnStyle,
  background: "#1976d2",
  color: "#fff",
  border: "none",
};

/**
 * @param {{
 *   report: { title?: string, sections: Record<string, string>, summary?: string, recommendations?: string[] },
 *   sectionOrder: Array<[string, string]>,
 *   filenameBase?: string,
 *   containerId: string,
 *   printRootClassName?: string,
 * }} props
 */
export default function GenericSectionedReport({
  report,
  sectionOrder,
  filenameBase = "Report",
  containerId,
  printRootClassName = "sectioned-report-print-root",
}) {
  const downloadPDF = useCallback(async () => {
    const element = document.getElementById(containerId);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
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
      const safe = String(filenameBase).replace(/[^a-z0-9-_]/gi, "_") || "Report";
      pdf.save(`${safe}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    }
  }, [containerId, filenameBase]);

  if (!report?.sections) return null;

  const { title, sections } = report;
  const summaryText = typeof report.summary === "string" ? report.summary.trim() : "";
  const recList = Array.isArray(report.recommendations)
    ? report.recommendations.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  return (
    <div style={{ marginTop: 22 }}>
      <div className="structured-report-toolbar-no-print" style={toolbarStyle}>
        <button type="button" onClick={downloadPDF} style={btnPrimaryStyle}>
          Download PDF
        </button>
        <button type="button" onClick={() => window.print()} style={btnStyle}>
          Print report
        </button>
      </div>

      <div id={containerId} className={printRootClassName} style={containerStyle}>
        <h2 style={h2Style}>{title || "Report"}</h2>
        {summaryText ? (
          <section style={{ marginBottom: 20 }}>
            <h3 style={h3Style}>Summary</h3>
            <p style={pStyle}>{summaryText}</p>
          </section>
        ) : null}
        {sectionOrder.map(([key, label]) => (
          <section key={key}>
            <h3 style={h3Style}>{label}</h3>
            <p style={pStyle}>{(sections[key] || "").trim() || "—"}</p>
          </section>
        ))}
        {recList.length ? (
          <section style={{ marginTop: 8 }}>
            <h3 style={h3Style}>Recommendations</h3>
            <ul style={{ ...pStyle, margin: "0 0 8px 1.1rem", paddingLeft: 0 }}>
              {recList.map((line) => (
                <li key={line} style={{ marginBottom: 6 }}>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <style>{`
        @media print {
          .structured-report-toolbar-no-print { display: none !important; }
          body * { visibility: hidden; }
          .${printRootClassName},
          .${printRootClassName} * { visibility: visible; }
          .${printRootClassName} {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            padding: 20px;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
