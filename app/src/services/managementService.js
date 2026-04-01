import { generateManagementHearingReport } from "./enterpriseReportsService.js";

/**
 * Management Hearing Report — structured sections (Gemini + fallback).
 * @param {string} patientId
 * @param {{ organisationId?: string | null }} context
 * @param {unknown[]} [notes] — optional in-memory notes; otherwise fetched server-side.
 */
export async function generateManagementReport(patientId, context, notes) {
  return generateManagementHearingReport({
    patientId,
    organisationId: context?.organisationId ?? null,
    notes,
  });
}
