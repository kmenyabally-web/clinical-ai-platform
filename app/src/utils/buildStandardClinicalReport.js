import { groupNotesByNhsRole, formatNhsMdtDisciplineBlock } from "./nhsDisciplineGrouping.js";

/** @typedef {{ title: string, content: string }} StandardReportSection */
/** @typedef {{ title: string, patient: string, hospital: string, ward: string, date: string, author: string, sections: StandardReportSection[] }} StandardClinicalReportDocument */

const FIXED_ORDER = [
  "Clinical Summary",
  "Mental State",
  "Risk Assessment",
  "Behaviour Overview",
  "Medication & Compliance",
  "MDT Input",
  "Plan / Recommendations",
];

function emptySections() {
  return FIXED_ORDER.map((title) => ({ title, content: "—" }));
}

function padSections(sections) {
  const map = new Map(sections.map((s) => [s.title, s.content]));
  return FIXED_ORDER.map((title) => ({
    title,
    content: (typeof map.get(title) === "string" ? map.get(title) : "—").trim() || "—",
  }));
}

function isStructuredNine(r) {
  return (
    r &&
    typeof r === "object" &&
    r.sections &&
    typeof r.sections === "object" &&
    typeof r.sections.patientOverview === "string"
  );
}

function isMdtWard(r) {
  return r && typeof r === "object" && r.kind === "mdtWardRound" && r.sections;
}

function isManagement(r) {
  return r && typeof r === "object" && r.kind === "managementHearing" && r.sections;
}

function isSimpleText(r) {
  return r && typeof r === "object" && r.kind === "simpleText" && typeof r.text === "string";
}

function isUnifiedReport(r) {
  return r && typeof r === "object" && r.kind === "unified" && Array.isArray(r.sections);
}

/**
 * @param {unknown} r
 * @param {unknown[]|undefined} notes
 */
function buildMdtInputSection(r, notes) {
  if (isMdtWard(r)) {
    const s = /** @type {Record<string, string>} */ (r.sections);
    const fromAi = [
      `Nursing:\n${s.nursingSummary || "—"}`,
      `Medical:\n${s.psychiatrySummary || "—"}`,
      `Psychology:\n${s.psychologySummary || "—"}`,
      `Occupational Therapy:\n${s.otSummary || "—"}`,
      `Speech & Language Therapy:\n${s.saltSummary || "—"}`,
      `Support Staff:\n${s.supportSummary || "—"}`,
    ].join("\n\n");
    if (Array.isArray(notes) && notes.length) {
      const grouped = groupNotesByNhsRole(notes);
      const fromNotes = formatNhsMdtDisciplineBlock(grouped);
      return `${fromAi}\n\n---\n\nDiscipline notes (source excerpts):\n\n${fromNotes}`;
    }
    return fromAi;
  }
  if (Array.isArray(notes) && notes.length) {
    const grouped = groupNotesByNhsRole(notes);
    return formatNhsMdtDisciplineBlock(grouped);
  }
  return "No multidisciplinary notes available for this period.";
}

/**
 * Build a single NHS/CQC-style document for PDF, print, and Firestore.
 *
 * @param {{
 *   report: unknown,
 *   notes?: unknown[],
 *   meta: {
 *     patient: string,
 *     hospital?: string,
 *     ward?: string,
 *     date?: string,
 *     author?: string,
 *     pipelineType?: string | null,
 *     documentTitle?: string,
 *   },
 * }} args
 * @returns {StandardClinicalReportDocument | null}
 */
export function buildStandardClinicalReport({ report, notes, meta }) {
  if (!report) return null;

  const patient = String(meta?.patient ?? "").trim() || "—";
  const hospital = String(meta?.hospital ?? "").trim() || "—";
  const ward = String(meta?.ward ?? "").trim() || "—";
  const date =
    meta?.date ||
    new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
  const author = String(meta?.author ?? "").trim() || "—";
  const pipelineType = meta?.pipelineType ? String(meta.pipelineType) : "";

  let title =
    meta?.documentTitle?.trim() ||
    (typeof report === "object" && report !== null && "title" in report && typeof report.title === "string"
      ? report.title
      : "") ||
    (pipelineType ? `${pipelineType.replace(/_/g, " ")} — Clinical Report` : "Clinical Report");

  /** @type {StandardReportSection[]} */
  let sections = emptySections();

  if (isSimpleText(report)) {
    const t = /** @type {{ title?: string, text: string }} */ (report);
    title = t.title || title;
    sections = padSections([{ title: "Clinical Summary", content: t.text }]);
  } else if (isUnifiedReport(report)) {
    const u = /** @type {{ title?: string, summary?: string, sections: Array<{ heading: string, content: string }>, recommendations?: string[] }} */ (
      report
    );
    title = u.title || title;
    const parts = [];
    if (u.summary && String(u.summary).trim()) {
      parts.push({ title: "Summary", content: String(u.summary).trim() });
    }
    for (const s of u.sections ?? []) {
      if (s && (s.heading || s.content != null)) {
        parts.push({
          title: String(s.heading || "Section").trim() || "Section",
          content: String(s.content ?? "").trim() || "—",
        });
      }
    }
    if (Array.isArray(u.recommendations) && u.recommendations.length) {
      parts.push({
        title: "Recommendations",
        content: u.recommendations.map((x) => String(x ?? "").trim()).filter(Boolean).join("\n\n"),
      });
    }
    sections = padSections(parts.length ? parts : [{ title: "Clinical Summary", content: "—" }]);
  } else if (isStructuredNine(report)) {
    const s = /** @type {import("../types/clinical").StructuredClinicalReport} */ (report).sections;
    const mdtBlock = buildMdtInputSection({}, notes);
    sections = padSections([
      {
        title: "Clinical Summary",
        content: [s.patientOverview, s.currentPresentation].filter(Boolean).join("\n\n").trim() || "—",
      },
      { title: "Mental State", content: s.currentPresentation?.trim() || "—" },
      { title: "Risk Assessment", content: s.riskAssessment?.trim() || "—" },
      {
        title: "Behaviour Overview",
        content: [s.behaviourAnalysis, s.incidentsSummary].filter(Boolean).join("\n\n").trim() || "—",
      },
      { title: "Medication & Compliance", content: s.medicationCompliance?.trim() || "—" },
      {
        title: "MDT Input",
        content: [s.MDTObservations?.trim(), mdtBlock !== "No multidisciplinary notes available for this period." ? mdtBlock : ""]
          .filter(Boolean)
          .join("\n\n---\n\n")
          .trim() || mdtBlock,
      },
      {
        title: "Plan / Recommendations",
        content: [s.legalContext, s.recommendation].filter(Boolean).join("\n\n").trim() || "—",
      },
    ]);
  } else if (isMdtWard(report)) {
    const s = /** @type {Record<string, string>} */ (
      /** @type {{ sections: Record<string, string> }} */ (report).sections
    );
    title = report.title || title;
    sections = padSections([
      {
        title: "Clinical Summary",
        content: s.overallSummary?.trim() || "—",
      },
      {
        title: "Mental State",
        content: [s.psychiatrySummary, s.psychologySummary].filter(Boolean).join("\n\n").trim() || "—",
      },
      {
        title: "Risk Assessment",
        content: [s.riskLevel ? `Risk level: ${s.riskLevel}` : "", s.nursingSummary].filter(Boolean).join("\n\n").trim() || "—",
      },
      { title: "Behaviour Overview", content: s.supportSummary?.trim() || "—" },
      {
        title: "Medication & Compliance",
        content: "Medication and compliance must be confirmed with the MAR, pharmacy, and prescriber records.",
      },
      { title: "MDT Input", content: buildMdtInputSection(report, notes) },
      { title: "Plan / Recommendations", content: s.plan?.trim() || "—" },
    ]);
  } else if (isManagement(report)) {
    const s = /** @type {Record<string, string>} */ (
      /** @type {{ sections: Record<string, string> }} */ (report).sections
    );
    title = report.title || title;
    sections = padSections([
      {
        title: "Clinical Summary",
        content: [s.patientBackground, s.currentConcerns].filter(Boolean).join("\n\n").trim() || "—",
      },
      { title: "Mental State", content: s.currentConcerns?.trim() || "—" },
      { title: "Risk Assessment", content: s.riskAssessment?.trim() || "—" },
      { title: "Behaviour Overview", content: s.incidentSummary?.trim() || "—" },
      {
        title: "Medication & Compliance",
        content: "Refer to clinical notes and MAR for medication detail.",
      },
      {
        title: "MDT Input",
        content: buildMdtInputSection({}, notes),
      },
      {
        title: "Plan / Recommendations",
        content: [s.legalStatus, s.recommendation].filter(Boolean).join("\n\n").trim() || "—",
      },
    ]);
  } else {
    const raw = typeof report === "object" && report !== null ? JSON.stringify(report, null, 2) : String(report);
    sections = padSections([
      {
        title: "Clinical Summary",
        content: raw.slice(0, 12000) + (raw.length > 12000 ? "\n…" : ""),
      },
    ]);
  }

  return {
    title,
    patient,
    hospital,
    ward,
    date,
    author,
    sections,
  };
}

export { FIXED_ORDER as STANDARD_CLINICAL_SECTION_ORDER };
