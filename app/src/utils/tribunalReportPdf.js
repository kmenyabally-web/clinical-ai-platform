import jsPDF from "jspdf";
import { tribunalTemplate } from "../templates/tribunalNursingReport";

/**
 * @param {string} yn
 * @returns {string}
 */
function ynLabel(yn) {
  const v = (yn ?? "").toString().trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "no") return "No";
  return "___";
}

/**
 * @param {import("../templates/tribunalNursingReport").TribunalTemplateRow} row
 * @param {Record<string, unknown>} section
 */
function sectionLines(row, section) {
  const s = section && typeof section === "object" ? section : {};
  const lines = [];

  if (row.type === "structured") {
    const st = s.structured && typeof s.structured === "object" ? s.structured : {};
    const entries = [
      ["Legal name", st.fullName],
      ["Date of birth", st.dateOfBirth],
      ["NHS number", st.nhsNumber],
      ["Ward / location", st.wardLocation],
      ["Responsible clinician", st.responsibleClinician],
      ["Legal status (e.g. MHA section)", st.legalStatus],
    ];
    entries.forEach(([k, v]) => {
      const val = v != null && String(v).trim() ? String(v).trim() : "—";
      lines.push(`${k}: ${val}`);
    });
    return lines;
  }

  if (row.type === "yesno") {
    const ans = ynLabel(s.yesNo);
    lines.push(`[${ans === "Yes" ? "X" : " "}] Yes    [${ans === "No" ? "X" : " "}] No`);
    return lines;
  }

  if (row.type === "yesno_text") {
    const ans = ynLabel(s.yesNo);
    lines.push(`[${ans === "Yes" ? "X" : " "}] Yes    [${ans === "No" ? "X" : " "}] No`);
    const t = (s.text ?? "").toString().trim();
    if (t) lines.push(t);
    return lines;
  }

  const t = (s.text ?? "").toString().trim();
  lines.push(t || "—");
  return lines;
}

/**
 * Tribunal-ready PDF: numbered sections, Yes/No boxes, signature block.
 * @param {{
 *   sections: Record<string, unknown>,
 *   signature?: { typedName?: string, signedDate?: string, signatureDataUrl?: string | null },
 *   patientSummary?: string,
 * }} opts
 */
export function exportTribunalNursingReportPdf(opts) {
  const sections = opts.sections && typeof opts.sections === "object" ? opts.sections : {};
  const sig = opts.signature && typeof opts.signature === "object" ? opts.signature : {};
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = pdf.internal.pageSize.getHeight();
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = 16;

  const newPageIfNeeded = (h) => {
    if (y + h > pageH - 16) {
      pdf.addPage();
      y = 16;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Tribunal Nursing Report", margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  if (opts.patientSummary) {
    const sumLines = pdf.splitTextToSize(String(opts.patientSummary), maxW);
    sumLines.forEach((ln) => {
      newPageIfNeeded(6);
      pdf.text(ln, margin, y);
      y += 5;
    });
    y += 4;
  }

  tribunalTemplate.forEach((row) => {
    newPageIfNeeded(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    const head = `${row.id}. ${row.title}`;
    const headLines = pdf.splitTextToSize(head, maxW);
    headLines.forEach((ln) => {
      newPageIfNeeded(6);
      pdf.text(ln, margin, y);
      y += 5.5;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const key = String(row.id);
    const body = sectionLines(row, sections[key]);
    body.forEach((line) => {
      const wrapped = pdf.splitTextToSize(line, maxW);
      wrapped.forEach((ln) => {
        newPageIfNeeded(6);
        pdf.text(ln, margin, y);
        y += 5;
      });
    });
    y += 4;
  });

  newPageIfNeeded(40);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Signature", margin, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Printed name: ${sig.typedName ? String(sig.typedName) : "____________________________"}`, margin, y);
  y += 6;
  pdf.text(`Date: ${sig.signedDate ? String(sig.signedDate) : "____/____/______"}`, margin, y);
  y += 8;

  const dataUrl = sig.signatureDataUrl ? String(sig.signatureDataUrl) : "";
  if (dataUrl.startsWith("data:image")) {
    try {
      const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
      newPageIfNeeded(35);
      pdf.text("Signature image:", margin, y);
      y += 5;
      pdf.addImage(dataUrl, fmt, margin, y, 70, 22);
      y += 26;
    } catch {
      pdf.text("(Signature image could not be embedded.)", margin, y);
      y += 6;
    }
  } else {
    pdf.rect(margin, y, 70, 18);
    pdf.setFontSize(8);
    pdf.text("Sign within box", margin + 2, y + 10);
    y += 22;
  }

  const safeName = `tribunal-nursing-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(safeName);
}
