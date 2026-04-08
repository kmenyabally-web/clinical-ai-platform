import jsPDF from "jspdf";

type ReportSection = { heading: string; content: string };

type ProfessionalPdfInput = {
  fileName?: string;
  reportType: string;
  organisationName: string;
  hospitalName: string;
  wardName: string;
  patientName: string;
  nhsNumber?: string | null;
  generatedAt?: string;
  title: string;
  summary?: string;
  sections: ReportSection[];
};

/**
 * Structured, text-first PDF generation (A4) for NHS/CQC-style documents.
 */
export function generatePDF(report: ProfessionalPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const lineHeight = 5.5;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed = 8) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, opts?: { bold?: boolean; spacingAfter?: number }) => {
    const value = String(text ?? "").trim();
    if (!value) return;
    const lines = doc.splitTextToSize(value, contentWidth);
    ensureSpace(lines.length * lineHeight + 2);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + (opts?.spacingAfter ?? 1.5);
  };

  const writeRule = () => {
    ensureSpace(4);
    doc.setDrawColor(160);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(report.title || "Clinical Report", margin, y);
  y += 7;

  writeWrapped(`Organisation: ${report.organisationName || "—"}`, { bold: true });
  writeWrapped(`Hospital: ${report.hospitalName || "—"}`);
  writeWrapped(`Ward: ${report.wardName || "—"}`);
  writeWrapped(`Patient: ${report.patientName || "—"}`);
  writeWrapped(`NHS No: ${report.nhsNumber || "Not recorded"}`);
  writeWrapped(`Date: ${report.generatedAt || new Date().toLocaleString("en-GB")}`);
  writeWrapped(`Report Type: ${report.reportType || "Clinical report"}`);
  writeRule();

  if (report.summary) {
    writeWrapped("Summary", { bold: true, spacingAfter: 1 });
    writeWrapped(report.summary, { spacingAfter: 3 });
  }

  for (const section of report.sections ?? []) {
    const heading = String(section?.heading ?? "").trim() || "Section";
    const content = String(section?.content ?? "").trim() || "No information recorded.";
    writeWrapped(heading, { bold: true, spacingAfter: 1 });
    writeRule();
    writeWrapped(content, { spacingAfter: 3 });
  }

  const safeName = (report.fileName || "clinical-report")
    .replace(/[^a-z0-9-_.]/gi, "_")
    .replace(/_+/g, "_");
  doc.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}

