/**
 * Dynamic aggregate risk score (ABC + incidents + nursing + formulation).
 */

export interface RiskScore {
  patientId: string;

  overallRisk: "low" | "medium" | "high";

  behaviourRisk: number;
  incidentRisk: number;
  clinicalRisk: number;

  riskDrivers: string[];

  trend: "improving" | "stable" | "deteriorating";

  lastUpdated: Date;
}
