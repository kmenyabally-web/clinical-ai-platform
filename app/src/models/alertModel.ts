/**
 * Early warning / MDT alert items (V1).
 */

export type AlertSeverity = "low" | "medium" | "high";

export type AlertSource = "nursing" | "psychology" | "psychiatry" | "ot" | "salt";

export interface Alert {
  id: string;
  patientId: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  source: AlertSource;
  createdAt: Date;
}
