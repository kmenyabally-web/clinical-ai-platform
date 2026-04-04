/**
 * ABC (Antecedent–Behaviour–Consequence) behaviour log — stored in `abc_logs`.
 */

export interface ABCEntry {
  id: string;
  patientId: string;
  organisationId: string;
  antecedent: string;
  behaviour: string;
  consequence: string;
  severity: "low" | "medium" | "high";
  staff: string;
  createdAt: unknown;
}
