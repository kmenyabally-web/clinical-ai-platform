import { fetchEvidenceForCqcSimulation } from "./evidencePackService";
import {
  buildSimulationInputFromMapped,
  runInspectionSimulation,
  getWarnings,
} from "../engine/inspectionSimulationEngine";

/**
 * Live CQC inspection simulation for dashboards — recalculate after notes, incidents, training, etc. change.
 *
 * @param {string} organisationId
 * @returns {Promise<{
 *   domains: { SAFE: number, EFFECTIVE: number, CARING: number, RESPONSIVE: number, WELL_LED: number },
 *   overallScore: number,
 *   rating: string,
 *   warnings: string[],
 * }>}
 */
export async function getInspectionSimulationSnapshot(organisationId) {
  const mapped = await fetchEvidenceForCqcSimulation(organisationId);
  const input = buildSimulationInputFromMapped(mapped);
  const simulation = runInspectionSimulation(input);
  const warnings = getWarnings(simulation.domains);
  return {
    domains: simulation.domains,
    overallScore: simulation.overallScore,
    rating: simulation.rating,
    warnings,
  };
}
