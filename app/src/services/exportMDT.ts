/**
 * Rasterise the MDT report DOM node to a multi-page A4 PDF (html2canvas + jsPDF).
 */

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportMDTReport(elementId: string, fileName = "MDT_Report.pdf"): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - 2 * margin;
  const mmPerPx = contentWidth / canvas.width;

  let sourceY = 0;
  let pageIndex = 0;

  while (sourceY < canvas.height) {
    const maxSlicePx = Math.floor(contentHeight / mmPerPx);
    const sliceHeightPx = Math.min(maxSlicePx, canvas.height - sourceY);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;

    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceData = sliceCanvas.toDataURL("image/png");
    const sliceHeightMm = sliceHeightPx * mmPerPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(sliceData, "PNG", margin, margin, contentWidth, sliceHeightMm);

    sourceY += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(fileName);
}
