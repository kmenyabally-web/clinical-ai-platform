/**
 * Resolves organisation + ward + patient flags into a single CPA/AI context block.
 */

import { buildClinicalContextPromptBlock, deriveClinicalContext } from "./clinicalContextEngine";
import { getOrganisation } from "../services/organisation";
import { getPatientById } from "../services/patientService";
import { getWardById } from "../services/structureService";

export async function loadClinicalContextForPatient(
  organisationId: string,
  patientId: string
): Promise<import("./clinicalContextEngine").ClinicalContext | null> {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org || !pid) return null;

  try {
    const [orgDoc, patient] = await Promise.all([
      getOrganisation(org).catch(() => null),
      getPatientById(pid).catch(() => null),
    ]);

    let wardType: string | null = null;
    if (patient?.wardId) {
      const w = await getWardById(org, patient.wardId).catch(() => null);
      wardType = w?.wardType ? String(w.wardType) : null;
    }

    return deriveClinicalContext({
      hasLD: patient?.hasLD === true,
      hasMentalHealth: patient?.hasMentalHealth === true,
      wardType,
      organisationType:
        (orgDoc as { type?: string; organisationType?: string } | null)?.type ??
        (orgDoc as { organisationType?: string } | null)?.organisationType ??
        "hospital",
    });
  } catch {
    return null;
  }
}

export async function loadClinicalContextPromptForPatient(
  organisationId: string,
  patientId: string
): Promise<string> {
  const ctx = await loadClinicalContextForPatient(organisationId, patientId);
  return ctx?.aiContextBlock ?? "";
}
