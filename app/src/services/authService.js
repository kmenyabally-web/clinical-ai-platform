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
 * TEMPORARY DEV BYPASS:
 * For local development, this function has been overridden to ALWAYS return
 * a fixed manager/dev-org-001 context, regardless of the underlying token.
 *
 * The original strict governance logic is preserved below in comments and
 * must be restored before any regulated/testing use.
 */
export async function getUserContext() {
  // eslint-disable-next-line no-console
  console.warn(
    "⚠️ GOVERNANCE BYPASS ACTIVE: Using mock dev-org-001 context."
  );

  return {
    role: "manager",
    organisationId: "dev-org-001",
    serviceIds: ["service-001"],
  };
}

/*
// ORIGINAL STRICT IMPLEMENTATION (REINSTATE FOR REAL GOVERNANCE)
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
*/

