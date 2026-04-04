/**
 * Report templates to drive consistent section rendering in AI Reports.
 */

import { getCpaTemplateForDiscipline, type CpaDisciplineKey } from "../templates/cpa";
import { tribunalTemplate } from "../templates/tribunalNursingReport";
import { rcTemplate } from "../templates/rcTribunalTemplate";

const MDT_SUMMARY_SECTIONS = [
  "1. Overall Clinical Summary",
  "2. Nursing Summary",
  "3. Psychiatry Summary",
  "4. Psychology Summary",
  "5. Occupational Therapy Summary",
  "6. Speech & Language Summary",
  "7. Key Risks",
  "8. Risk Trend",
  "9. MDT Recommendations",
  "10. Care Plan Adjustments",
];

/** Weekly / Monthly patient-level MDT summaries (AI Reports) — matches unified section order in reportBuilder. */
const PATIENT_PERIOD_MDT_SECTIONS = [
  "1. Overall Summary",
  "2. Nursing",
  "3. Medical (Psychiatry / RC)",
  "4. Psychology",
  "5. Occupational Therapy",
  "6. Speech & Language Therapy",
];

const MANAGEMENT_HEARING_SECTIONS = [
  "1. Patient background",
  "2. Current concerns",
  "3. Incident summary",
  "4. Risk assessment",
  "5. Legal status",
  "6. Recommendation",
];

/** Prepended / appended in unified reports — must match {@link applyExecutiveLayersToUnified} section order. */
export function withExecutiveReportLayers(sections: string[]): string[] {
  return ["Executive Summary", ...sections, "Recommendations"];
}

export function getReportTemplate(
  type: string,
  discipline: string | null | undefined,
  orgType: string,
  reportWorkflowDiscipline?: string | null
) {
  const org = (orgType ?? "hospital")?.toString?.().trim?.().toLowerCase?.() ?? "hospital";
  const isCare = ["care_home", "nursing_home", "supported_living"].includes(org);

  if (String(type ?? "").toUpperCase() === "MDT_SUMMARY") {
    return withExecutiveReportLayers([...MDT_SUMMARY_SECTIONS]);
  }

  if (["WEEKLY", "MONTHLY"].includes(String(type ?? "").toUpperCase())) {
    return withExecutiveReportLayers([...PATIENT_PERIOD_MDT_SECTIONS]);
  }

  if (String(type ?? "") === "Tribunal") {
    const w = String(reportWorkflowDiscipline ?? "")
      .trim()
      .toLowerCase();
    if (w === "responsible_clinician") {
      const rows = rcTemplate.filter((r): r is { id: number; title: string; type: string } => r.id !== "header");
      return withExecutiveReportLayers(["1. Patient header (Responsible Clinician)", ...rows.map((r) => `${r.id + 1}. ${r.title}`)]);
    }
    return withExecutiveReportLayers(tribunalTemplate.map((r) => `${r.id}. ${r.title}`));
  }

  if (String(type ?? "") === "Management_Hearing") {
    return withExecutiveReportLayers([...MANAGEMENT_HEARING_SECTIONS]);
  }

  if (String(type ?? "").toUpperCase() === "CPA" && discipline) {
    const d = String(discipline).trim();
    const key = (["nurse", "psychiatrist", "psychologist", "occupational_therapist", "speech_language_therapist"].includes(d)
      ? d
      : "nurse") as CpaDisciplineKey;
    const tpl = getCpaTemplateForDiscipline(key);
    return withExecutiveReportLayers(tpl.map((r) => `${r.id}. ${r.title}`));
  }

  if (isCare) {
    return withExecutiveReportLayers([
      "1. Daily Care Summary",
      "2. Physical Health",
      "3. Nutrition & Hydration",
      "4. Behaviour",
      "5. Risks",
      "6. Actions Taken",
      "7. Recommendations",
    ]);
  }

  if (discipline) {
    return withExecutiveReportLayers([
      "1. Patient Overview",
      "2. Current Presentation",
      "3. Key Risks",
      "4. Interventions",
      "5. Progress",
      "6. Recommendations",
      "7. Plan",
    ]);
  }

  return withExecutiveReportLayers([
    "1. Overall Summary",
    "2. Nursing",
    "3. Medical",
    "4. Psychology",
    "5. Occupational Therapy",
    "6. Speech & Language",
    "7. Risk Summary",
    "8. Plan",
  ]);
}
