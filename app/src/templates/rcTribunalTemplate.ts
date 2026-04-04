export type RcSectionType = "structured" | "text";

export type RcTemplateRow =
  | { id: "header"; type: "structured" }
  | { id: number; title: string; type: "text" };

/** Responsible Clinician tribunal report — section order for UI and PDF. */
export const rcTemplate: RcTemplateRow[] = [
  { id: "header", type: "structured" },
  { id: 1, title: "Introduction", type: "text" },
  { id: 2, title: "Sources of information", type: "text" },
  { id: 3, title: "Summary of grounds", type: "text" },
  { id: 4, title: "Circumstances of admission", type: "text" },
  { id: 5, title: "Medical and psychiatric history", type: "text" },
  { id: 6, title: "Developmental, family and forensic history", type: "text" },
  { id: 7, title: "Mental state, behaviour, treatment and progress", type: "text" },
  { id: 8, title: "Risk assessment", type: "text" },
  { id: 9, title: "Strengths and positive factors", type: "text" },
  { id: 10, title: "Other relevant information", type: "text" },
  { id: 11, title: "Conclusions and recommendations", type: "text" },
];
