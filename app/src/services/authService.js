// src/services/authService.js

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * Auth service for retrieving a safe, non-clinical user context from
 * Firebase Authentication custom claims. This service exposes only:
 * - role
 * - organisationId
 * - serviceIds
 *
 * It does NOT read or write any clinical, person-level, or inspection data.
 */

import { auth } from "../firebase";

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * getUserContext()
 *
 * Returns an object containing:
 *   { role, organisationId, serviceIds }
 *
 * Behaviour:
 * - Calls auth.currentUser.getIdTokenResult(true) to force-refresh the token
 *   and obtain the latest custom claims.
 * - Extracts role, organisationId, and serviceIds from the token claims.
 * - If there is no signed-in user, returns all fields as null.
 * - If organisationId is null or missing, throws a "Governance Context Missing"
 *   error to prevent any attempt to read data without an organisation scope.
 */
export async function getUserContext() {
  const user = auth.currentUser;

  if (!user) {
    return {
      role: null,
      organisationId: null,
      serviceIds: null,
    };
  }

  const tokenResult = await user.getIdTokenResult(true);
  const claims = tokenResult.claims || {};

  const role =
    typeof claims.role === "string" && claims.role.trim().length > 0
      ? claims.role
      : null;

  const organisationId =
    typeof claims.organisationId === "string" &&
    claims.organisationId.trim().length > 0
      ? claims.organisationId
      : null;

  const serviceIds = Array.isArray(claims.serviceIds) ? claims.serviceIds : null;

  if (!organisationId) {
    // Governance enforcement: no data reads should be attempted
    // if we do not know which organisation the user belongs to.
    throw new Error(
      "Governance Context Missing: organisationId claim is required at Stage 2."
    );
  }

  return {
    role,
    organisationId,
    serviceIds,
  };
}

