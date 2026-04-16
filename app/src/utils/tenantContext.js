/**
 * Enforces non-empty organisation + hospital on Firestore creates.
 * Ward-scoped records must use {@link assertWardTenantContext}.
 */
export const GENERIC_USER_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function assertTenantContext(organisationId, hospitalId) {
  if (!organisationId || !hospitalId) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }
}

/**
 * Enforces non-empty organisation + hospital + ward on Firestore creates.
 * Use for records that are ward-scoped (patients, notes, incidents, physical health,
 * safeguarding, care plans, and ward-bound reports).
 */
export function assertWardTenantContext(organisationId, hospitalId, wardId) {
  if (!organisationId || !hospitalId || !wardId) {
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
 * Cross-module write guard: patient record must belong to the active organisation session.
 * @throws {Error} message "Data mismatch detected" when organisations differ
 */
export function assertPatientOrganisationMatch(patientOrganisationId, sessionOrganisationId) {
  const p = (patientOrganisationId ?? "").toString().trim();
  const s = (sessionOrganisationId ?? "").toString().trim();
  if (!p || !s || p !== s) {
    const err = new Error("Data mismatch detected");
    err.code = "DATA_MISMATCH";
    throw err;
  }
}

/** Treat placeholder / unassigned ids as “no hospital scope” for reads and queries. */
export function normalizeHospitalScopeId(id) {
  if (id == null || typeof id !== "string") return null;
  const t = id.trim();
  if (!t) return null;
  if (t.toUpperCase() === "UNASSIGNED") return null;
  if (t === "__tenant_unscoped__") return null;
  return t;
}

export function normalizeWardScopeId(id) {
  if (id == null || typeof id !== "string") return null;
  const t = id.trim();
  if (!t) return null;
  if (t.toUpperCase() === "UNASSIGNED") return null;
  if (t === "__tenant_unscoped__") return null;
  return t;
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
      : "";
  const wardId =
    ctx?.wardId != null && String(ctx.wardId).trim() !== ""
      ? String(ctx.wardId).trim()
      : "";
  return { organisationId, hospitalId, wardId };
}
