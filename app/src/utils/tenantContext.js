/**
 * Enforces non-empty organisation + hospital on Firestore creates.
 * Use {@link TENANT_UNSCOPED_HOSPITAL} / {@link TENANT_UNSCOPED_WARD} when no ward/hospital applies.
 */
export const TENANT_UNSCOPED_HOSPITAL = "__tenant_unscoped__";
export const TENANT_UNSCOPED_WARD = "__tenant_unscoped__";

export function assertTenantContext(organisationId, hospitalId) {
  if (!organisationId || !hospitalId) {
    throw new Error("Missing tenant context");
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
