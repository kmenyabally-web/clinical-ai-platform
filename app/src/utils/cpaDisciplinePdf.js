import jsPDF from "jspdf";

/** @typedef {import("../templates/cpa/index").CpaDisciplineKey} CpaDisciplineKey */
/** @typedef {import("../templates/cpa/nursingTemplate").CpaTemplateSection} CpaTemplateSection */

const DISCIPLINE_META = {
  nurse: { subtitle: "Nursing — CPA discipline report", accent: [37, 99, 235] },
  psychiatrist: { subtitle: "Psychiatry — CPA discipline report", accent: [30, 58, 138] },
  psychologist: { subtitle: "Psychology — CPA discipline report", accent: [109, 40, 217] },
  occupational_therapist: { subtitle: "Occupational therapy — CPA discipline report", accent: [15, 118, 110] },
  speech_language_therapist: { subtitle: "Speech & language therapy — CPA discipline report", accent: [67, 56, 202] },
};

/**
 * @param {CpaDisciplineKey} disciplineKey
 * @param {CpaTemplateSection[]} templateRows
 * @param {Record<string, { text?: string }>} sections
 * @param {{ patientLabel?: string, organisationName?: string, authorLabel?: string }} meta
 */
export function exportCpaDisciplinePdf(disciplineKey, templateRows, sections, meta = {}) {
  const spec = DISCIPLINE_META[disciplineKey] ?? DISCIPLINE_META.nurse;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = pdf.internal.pageSize.getHeight();
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = 16;

  const need = (h) => {
    if (y + h > pageH - 14) {
      pdf.addPage();
      y = 14;
    }
  };

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Care Programme Approach (CPA)", margin, y);
  y += 7;
  pdf.setFontSize(10);
  const [r, g, b] = spec.accent;
  pdf.setTextColor(r, g, b);
  pdf.text(spec.subtitle, margin, y);
  y += 8;
  pdf.setTextColor(71, 85, 105);
  pdf.setFont("helvetica", "normal");
  if (meta.patientLabel) {
    pdf.text(`Patient: ${meta.patientLabel}`, margin, y);
    y += 5;
  }
  if (meta.organisationName) {
    pdf.text(`Organisation: ${meta.organisationName}`, margin, y);
    y += 5;
  }
  if (meta.authorLabel) {
    pdf.text(`Author: ${meta.authorLabel}`, margin, y);
    y += 5;
  }
  y += 4;
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, pageW - margin, y);
  y += 8;
  pdf.setTextColor(15, 23, 42);

  templateRows.forEach((row) => {
    const key = String(row.id);
    const body = (sections[key]?.text ?? "").toString().trim();

    need(14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    const heading = `${row.id}. ${row.title}`;
    pdf.splitTextToSize(heading, maxW).forEach((ln) => {
      need(6);
      pdf.text(ln, margin, y);
      y += 5.5;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    if (!body) {
      need(6);
      pdf.setTextColor(148, 163, 184);
      pdf.text("—", margin, y);
      pdf.setTextColor(15, 23, 42);
      y += 8;
      return;
    }

    const paras = body
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const blocks = paras.length ? paras : [body];
    blocks.forEach((para, idx) => {
      const prefix = `${row.id}.${idx + 1}`;
      const wrapped = pdf.splitTextToSize(`${prefix}  ${para}`, maxW);
      wrapped.forEach((ln) => {
        need(6);
        pdf.text(ln, margin, y);
        y += 5;
      });
      y += 2;
    });
    y += 4;
  });

  const fname = `cpa-${disciplineKey}-${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(fname);
}
