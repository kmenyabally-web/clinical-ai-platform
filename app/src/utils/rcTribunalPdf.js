import jsPDF from "jspdf";
import { rcTemplate } from "../templates/rcTribunalTemplate";

/**
 * @param {Record<string, unknown>} section
 */
function headerLines(section) {
  const st = section?.structured && typeof section.structured === "object" ? section.structured : {};
  return [
    ["Patient name", st.patientName],
    ["Date of birth", st.dateOfBirth],
    ["NHS number", st.nhsNumber],
    ["Ward / unit", st.wardLocation],
    ["Mental Health Act section (as recorded)", st.mhaSection],
    ["Date of admission (as recorded)", st.dateOfAdmission],
    ["Hospital / provider", st.hospitalName],
    ["Report date", st.reportDate],
  ].map(([k, v]) => `${k}: ${v != null && String(v).trim() ? String(v).trim() : "—"}`);
}

/**
 * NHS-style formal PDF: section headings, sub-paragraph numbering (n.m), signature & validation text.
 * @param {{
 *   sections: Record<string, unknown>,
 *   signature?: { rcName?: string, designation?: string, signedDate?: string, typedSignature?: string },
 * }} opts
 */
export function exportRcTribunalReportPdf(opts) {
  const sections = opts.sections && typeof opts.sections === "object" ? opts.sections : {};
  const sig = opts.signature && typeof opts.signature === "object" ? opts.signature : {};

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = pdf.internal.pageSize.getHeight();
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = 14;

  const newPageIfNeeded = (h) => {
    if (y + h > pageH - 14) {
      pdf.addPage();
      y = 14;
    }
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text("Responsible Clinician — Tribunal Report", margin, y);
  y += 9;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Patient and legal identifiers", margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const hLines = headerLines(sections.header);
  hLines.forEach((ln) => {
    const wrapped = pdf.splitTextToSize(ln, maxW);
    wrapped.forEach((w) => {
      newPageIfNeeded(6);
      pdf.text(w, margin, y);
      y += 5;
    });
  });
  y += 5;

  rcTemplate.forEach((row) => {
    if (row.id === "header") return;
    const num = row.id;
    const title = row.title;
    const key = String(num);
    const sec = sections[key];
    const body = (sec?.text ?? "").toString().trim();

    newPageIfNeeded(16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    const heading = `${num}. ${title}`;
    pdf.splitTextToSize(heading, maxW).forEach((ln) => {
      newPageIfNeeded(6);
      pdf.text(ln, margin, y);
      y += 5.5;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    if (!body) {
      newPageIfNeeded(6);
      pdf.text("—", margin, y);
      y += 6;
      return;
    }

    const paras = body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const blocks = paras.length ? paras : [body];
    blocks.forEach((para, idx) => {
      const label = `${num}.${idx + 1}`;
      const prefixed = `${label}  ${para}`;
      const wrapped = pdf.splitTextToSize(prefixed, maxW);
      wrapped.forEach((ln) => {
        newPageIfNeeded(6);
        pdf.text(ln, margin, y);
        y += 5;
      });
      y += 2;
    });
    y += 3;
  });

  newPageIfNeeded(45);
  pdf.setDrawColor(40);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Signature and declaration", margin, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const decl = pdf.splitTextToSize(
    "I confirm that this report is true to the best of my knowledge and belief and that I have made clear which facts are within my personal knowledge and which are not. Facts outside my personal knowledge are believed to be true based on information recorded in the clinical records.",
    maxW
  );
  decl.forEach((ln) => {
    newPageIfNeeded(6);
    pdf.text(ln, margin, y);
    y += 4.5;
  });
  y += 6;

  pdf.setFontSize(10);
  pdf.text(`Name: ${sig.rcName ? String(sig.rcName) : "____________________________"}`, margin, y);
  y += 6;
  pdf.text(`Designation: ${sig.designation ? String(sig.designation) : "____________________________"}`, margin, y);
  y += 6;
  pdf.text(`Date: ${sig.signedDate ? String(sig.signedDate) : "____/____/______"}`, margin, y);
  y += 8;
  pdf.text("Typed signature (as entered):", margin, y);
  y += 5;
  pdf.setFont("helvetica", "italic");
  const ts = sig.typedSignature ? String(sig.typedSignature) : "____________________________";
  pdf.splitTextToSize(ts, maxW).forEach((ln) => {
    newPageIfNeeded(6);
    pdf.text(ln, margin, y);
    y += 5;
  });

  const fname = `rc-tribunal-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fname);
}
