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
import { getCurrentUserProfile } from "./organisation";

/**
 * getUserContext()
 *
 * Reads role and organisationId from Firebase Auth custom claims (ID token),
 * and falls back to Firestore `users/{uid}` when claims are missing or stale.
 * Claims can lag after signup/onboarding while `orgId` in Firestore already matches
 * OrganisationContext — without this merge, structure writes throw "organisation scope mismatch".
 */
export async function getUserContext() {
  const user = auth.currentUser;

  if (!user) {
    return {
      role: null,
      organisationId: null,
      hospitalId: null,
      wardId: null,
      serviceIds: null,
    };
  }

  const tokenResult = await user.getIdTokenResult(true);
  const claims = tokenResult.claims || {};

  let role =
    typeof claims.role === "string" && claims.role.trim().length > 0
      ? claims.role.trim()
      : null;

  let organisationId =
    typeof claims.organisationId === "string" && claims.organisationId.trim().length > 0
      ? claims.organisationId.trim()
      : null;

  let hospitalId =
    typeof claims.hospitalId === "string" && claims.hospitalId.trim().length > 0
      ? claims.hospitalId.trim()
      : null;

  let wardId =
    typeof claims.wardId === "string" && claims.wardId.trim().length > 0
      ? claims.wardId.trim()
      : null;

  const serviceIds = Array.isArray(claims.serviceIds) ? claims.serviceIds : null;

  const profile = await getCurrentUserProfile(user.uid);
  const profileOrgIdCandidate =
    profile?.organisationId ?? profile?.orgId ?? null;
  const profileOrgId =
    profileOrgIdCandidate != null && String(profileOrgIdCandidate).trim() !== ""
      ? String(profileOrgIdCandidate).trim()
      : null;

  if (!role && profile?.role != null && String(profile.role).trim() !== "") {
    role = String(profile.role).trim();
  }

  if (!organisationId && profileOrgId) {
    organisationId = profileOrgId;
  } else if (organisationId && profileOrgId && organisationId !== profileOrgId) {
    organisationId = profileOrgId;
  }

  const profileHospitalId =
    profile?.hospitalId != null && String(profile.hospitalId).trim() !== ""
      ? String(profile.hospitalId).trim()
      : null;
  const profileWardId =
    profile?.wardId != null && String(profile.wardId).trim() !== ""
      ? String(profile.wardId).trim()
      : null;

  if (!hospitalId && profileHospitalId) hospitalId = profileHospitalId;
  if (!wardId && profileWardId) wardId = profileWardId;

  if (!organisationId) {
    throw new Error(
      "Governance Context Missing: organisationId claim is required at Stage 2."
    );
  }

  return {
    role,
    organisationId,
    hospitalId,
    wardId,
    serviceIds,
  };
}
