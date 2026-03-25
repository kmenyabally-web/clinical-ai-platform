import { generateDailySummary } from "./summaryService";

export async function generateWeeklyReports(patientId, context) {
  const summary = await generateDailySummary(patientId, new Date());

  return {
    weeklySummary: summary,
  };
}
