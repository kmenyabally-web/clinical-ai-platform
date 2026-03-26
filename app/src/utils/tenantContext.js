/**
 * Enforces non-empty organisation + hospital on Firestore creates.
 * Use {@link TENANT_UNSCOPED_HOSPITAL} / {@link TENANT_UNSCOPED_WARD} when no ward/hospital applies.
 */
export const TENANT_UNSCOPED_HOSPITAL = "__tenant_unscoped__";
export const TENANT_UNSCOPED_WARD = "__tenant_unscoped__";
export const GENERIC_USER_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function assertTenantContext(organisationId, hospitalId) {
  if (!organisationId || !hospitalId) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
}

export function requireOrganisationId(organisationId) {
  if (!organisationId || !String(organisationId).trim()) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
  return String(organisationId).trim();
}

export function requireHospitalId(hospitalId) {
  if (!hospitalId || !String(hospitalId).trim()) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
  return String(hospitalId).trim();
}

export function requirePatientId(patientId) {
  if (!patientId || !String(patientId).trim()) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
  return String(patientId).trim();
}

export function assertSameOrganisationData(dataOrganisationId, userOrganisationId) {
  const dataOrg = (dataOrganisationId ?? "").toString().trim();
  const userOrg = (userOrganisationId ?? "").toString().trim();
  if (!dataOrg || !userOrg || dataOrg !== userOrg) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
}

/**
 * @param {{ organisationId?: string | null, hospitalId?: string | null, wardId?: string | null }} ctx
 * @returns {{ organisationId: string, hospitalId: string, wardId: string }}
 */
export function tenantFieldsFromContext(ctx) {
  const organisationId =
    ctx?.organisationId != null && String(ctx.organisationId).trim() !== ""
      ? String(ctx.organisationId).trim()
      : "";
  const hospitalId =
    ctx?.hospitalId != null && String(ctx.hospitalId).trim() !== ""
      ? String(ctx.hospitalId).trim()
      : TENANT_UNSCOPED_HOSPITAL;
  const wardId =
    ctx?.wardId != null && String(ctx.wardId).trim() !== ""
      ? String(ctx.wardId).trim()
      : TENANT_UNSCOPED_WARD;
  return { organisationId, hospitalId, wardId };
}
