/**
 * Structured psychology formulation — stored in `formulations`.
 */

export interface Formulation {
  id: string;
  patientId: string;
  organisationId: string;

  presentingProblems: string;
  predisposingFactors: string;
  precipitatingFactors: string;
  perpetuatingFactors: string;
  protectiveFactors: string;

  triggers: string;
  copingStrategies: string;
  strengths: string;

  riskFormulation: string;

  createdBy: string;
  createdAt: unknown;
}
