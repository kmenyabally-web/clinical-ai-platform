/**
 * Tribunal nursing report — numbered sections for MH tribunal / nursing evidence.
 * Used by {@link ../pages/TribunalReport.jsx} and PDF export.
 */

export type TribunalSectionType = "structured" | "yesno_text" | "text" | "yesno";

export type TribunalTemplateRow = {
  id: number;
  title: string;
  type: TribunalSectionType;
};

export const tribunalTemplate: TribunalTemplateRow[] = [
  { id: 1, title: "Patient Details", type: "structured" },
  { id: 2, title: "Factors affecting understanding", type: "yesno_text" },
  { id: 3, title: "Tribunal adjustments", type: "yesno_text" },
  { id: 4, title: "Nature of nursing care and medication", type: "text" },
  { id: 5, title: "Observation level", type: "text" },
  { id: 6, title: "Contact with others", type: "yesno_text" },
  { id: 7, title: "Community support", type: "text" },
  { id: 8, title: "Strengths", type: "text" },
  { id: 9, title: "Progress summary", type: "text" },
  { id: 10, title: "Absence without leave", type: "text" },
  { id: 11, title: "Medication compliance", type: "text" },
  { id: 12, title: "Harm incidents", type: "text" },
  { id: 13, title: "Property damage incidents", type: "text" },
  { id: 14, title: "Restraint or seclusion", type: "yesno_text" },
  { id: 15, title: "Section 2 necessity", type: "yesno" },
  { id: 16, title: "Treatment necessity", type: "yesno" },
  { id: 17, title: "Risk if discharged", type: "yesno" },
  { id: 18, title: "Community risk management", type: "text" },
  { id: 19, title: "Recommendations", type: "yesno_text" },
];
