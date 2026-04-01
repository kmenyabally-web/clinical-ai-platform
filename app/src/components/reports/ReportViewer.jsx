import React, { useCallback, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./ReportViewer.css";

/**
 * Professional NHS-style report view: PDF, print, optional Firestore save.
 * @param {{ document: object | null, containerId?: string, filenameBase?: string, onSave?: () => Promise<void>, saveDisabled?: boolean, saveLabel?: string }} props
 */
export default function ReportViewer({
  document: doc,
  containerId = "report-container",
  filenameBase = "clinical-report",
  onSave,
  saveDisabled = false,
  saveLabel = "Save to records",
}) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const exportToPDF = useCallback(async () => {
    const element = document.getElementById(containerId);
    if (!element) return;
    setPdfBusy(true);
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
      const safe = String(filenameBase).replace(/[^a-z0-9-_]/gi, "_") || "clinical-report";
      pdf.save(`${safe}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
    } finally {
      setPdfBusy(false);
    }
  }, [containerId, filenameBase]);

  if (!doc) return null;

  return (
    <div className="clinical-report-viewer-wrap">
      <div className="clinical-report-toolbar">
        <button type="button" className="clinical-report-btn-primary" onClick={exportToPDF} disabled={pdfBusy}>
          {pdfBusy ? "Preparing PDF…" : "Export PDF"}
        </button>
        <button type="button" onClick={() => window.print()} disabled={pdfBusy}>
          Print
        </button>
        {typeof onSave === "function" ? (
          <button type="button" onClick={() => void onSave()} disabled={saveDisabled || pdfBusy}>
            {saveLabel}
          </button>
        ) : null}
      </div>

      <div id={containerId}>
        <h1 className="cr-title">{doc.title}</h1>
        <div className="cr-meta">
          <p>
            <strong>Patient:</strong> {doc.patient}
          </p>
          <p>
            <strong>Hospital:</strong> {doc.hospital}
          </p>
          <p>
            <strong>Ward / unit:</strong> {doc.ward}
          </p>
          <p>
            <strong>Date:</strong> {doc.date}
          </p>
          <p>
            <strong>Author:</strong> {doc.author}
          </p>
        </div>

        {doc.sections.map((section, idx) => (
          <div key={`${section.title}-${idx}`} className="cr-section">
            <h2>{section.title}</h2>
            <p>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
