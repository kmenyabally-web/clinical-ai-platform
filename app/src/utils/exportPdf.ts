import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Capture a DOM subtree and export multi-page A4 PDF (same strategy as ReportViewer).
 */
export async function exportToPDF(elementId: string, filename = "report.pdf"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("exportToPDF: element not found:", elementId);
    return;
  }

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
    const safe = filename.replace(/[^a-z0-9-_.]/gi, "_") || "report.pdf";
    pdf.save(safe.endsWith(".pdf") ? safe : `${safe}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
  }
}
