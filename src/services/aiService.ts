/**
 * Mirror of `app/src/services/aiService.ts` — use `app/src` for the running Vite app.
 */
export type NoteAnalysisResult = {
  discipline: string;
  behaviour: string;
  mood: string;
  engagement: string;
  physicalHealth: string;
  medicationIssues: string;
  incidents: string[];
  riskIndicators: string[];
  summary: string;
};

export async function analyseNote(
  note: string,
  discipline: string,
  patientId: string
): Promise<NoteAnalysisResult> {
  void note;
  void patientId;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return {
    discipline: discipline || "Clinical",
    behaviour: "Verbal agitation",
    mood: "Agitated",
    engagement: "Medication refusal",
    physicalHealth: "Not documented",
    medicationIssues: "Medication refusal",
    incidents: ["Verbal aggression"],
    riskIndicators: ["aggression", "medication refusal"],
    summary: "Patient presented with agitation and declined medication.",
  };
}
