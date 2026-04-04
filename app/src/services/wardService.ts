/**
 * Ward-scoped patient listing (uses org + hospital + optional ward from tenant context).
 */

import { listPatientMetadata } from "./patientService.js";
import { getUserContext } from "./authService";
import { GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";

export type WardPatientMeta = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  wardId: string;
  wardName: string;
  hospitalId: string;
  hospitalName: string;
  serviceId: string | null;
};

/**
 * Patients on a ward (or entire hospital if `wardId` is empty).
 * Requires `hospitalId` (explicit or from signed-in user context).
 */
export async function getWardPatients(
  wardId: string | null | undefined,
  hospitalId?: string | null | undefined
): Promise<WardPatientMeta[]> {
  const ctx = await getUserContext();
  const org = ctx.organisationId;
  if (!org) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const hid = String(hospitalId ?? ctx.hospitalId ?? "").trim();
  if (!hid) {
    throw new Error("hospitalId is required to list ward patients.");
  }

  const wid = String(wardId ?? "").trim();
  const filters: { hospitalId: string; wardId?: string } = { hospitalId: hid };
  if (wid) filters.wardId = wid;

  const rows = await listPatientMetadata(filters);
  return Array.isArray(rows) ? (rows as WardPatientMeta[]) : [];
}
