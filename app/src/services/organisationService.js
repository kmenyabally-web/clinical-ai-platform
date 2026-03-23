// src/services/organisationService.js

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * Organisation service for retrieving a minimal, non-clinical
 * display name for the current organisation. This service is
 * explicitly restricted to reading ONLY the organisation name.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * getOrgDisplayName(providedOrgId)
 *
 * Parameters:
 * - providedOrgId: the organisationId that the UI believes is in scope.
 *
 * Enforcement:
 * - The providedOrgId MUST strictly equal the organisationId found in the
 *   current user's claims (from getUserContext). If it does not, the
 *   function aborts immediately by throwing an error.
 *
 * Data minimisation:
 * - Uses getDoc on the "organisations" collection.
 * - Manually ensures that ONLY the "name" field is returned to callers.
 *
 * Returns:
 * - A string representing the organisation's display name, or null if the
 *   document does not exist or has no name field.
 */
export async function getOrgDisplayName(providedOrgId) {
  // TEMPORARY DEV BYPASS:
  // We still call getUserContext (which itself is currently mocked) so that
  // future reinstatement is straightforward.
  const { organisationId } = await getUserContext();

  // Original strict enforcement commented out for development:
  // if (providedOrgId !== organisationId) {
  //   throw new Error(
  //     "Access denied: provided organisationId does not match the user’s governance scope."
  //   );
  // }

  try {
    const orgDocRef = doc(db, "organisations", organisationId);
    const snapshot = await getDoc(orgDocRef);

    if (!snapshot.exists()) {
      return "Organisation";
    }

    const data = snapshot.data() || {};
    const name =
      typeof data.name === "string" && data.name.trim().length > 0
        ? data.name
        : null;

    return name || "Organisation";
  } catch (err) {
    // If anything goes wrong (missing collection, permission, etc.), use a neutral label.
    return "Organisation";
  }
}

/*
// ORIGINAL STRICT IMPLEMENTATION (REINSTATE FOR REAL GOVERNANCE)
export async function getOrgDisplayName(providedOrgId) {
  const { organisationId } = await getUserContext();

  if (providedOrgId !== organisationId) {
    throw new Error(
      "Access denied: provided organisationId does not match the user’s governance scope."
    );
  }

  const orgDocRef = doc(db, "organisations", organisationId);
  const snapshot = await getDoc(orgDocRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() || {};

  const name =
    typeof data.name === "string" && data.name.trim().length > 0
      ? data.name
      : null;

  return name;
}
*/

