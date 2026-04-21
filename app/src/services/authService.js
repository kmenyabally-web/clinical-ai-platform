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
import { GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";

const STRUCTURE_STORAGE_PREFIX = "cqc.structure.";

function readScopedStorageSelection(organisationId) {
  if (!organisationId) return { hospitalId: null, wardId: null };
  if (typeof window === "undefined" || !window?.localStorage) {
    return { hospitalId: null, wardId: null };
  }
  const keyBase = `${STRUCTURE_STORAGE_PREFIX}${organisationId}`;
  const hospitalRaw = window.localStorage.getItem(`${keyBase}.hospitalId`);
  const wardRaw = window.localStorage.getItem(`${keyBase}.wardId`);
  const hospitalId = hospitalRaw != null && String(hospitalRaw).trim() ? String(hospitalRaw).trim() : null;
  const wardId = wardRaw != null && String(wardRaw).trim() ? String(wardRaw).trim() : null;
  return { hospitalId, wardId };
}

// Guided demo experience: provide fixed tenant scope even if Firebase Auth user is not present.
const DEMO_MODE = true;
const DEMO_TENANT = {
  role: "Admin",
  organisationId: "demo-org",
  hospitalId: "hospital001",
  wardId: "ward_picu",
};

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

  // Keep service-layer tenant scope aligned with OrganisationContext demo mode.
  // Without this, pages render under demo-org while writes/reads resolve to a
  // signed-in token org, causing widespread organisation mismatch/403 errors.
  if (DEMO_MODE) {
    return {
      role: DEMO_TENANT.role,
      organisationId: DEMO_TENANT.organisationId,
      hospitalId: DEMO_TENANT.hospitalId,
      wardId: DEMO_TENANT.wardId,
      serviceIds: null,
    };
  }

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
    console.error("Governance context missing: organisationId");
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }

  // Prefer globally selected hospital/ward from StructureContext persistence.
  // This keeps service queries aligned with the header scope selector.
  const selectedScope = readScopedStorageSelection(organisationId);
  if (selectedScope.hospitalId) {
    hospitalId = selectedScope.hospitalId;
  }
  if (selectedScope.wardId) {
    wardId = selectedScope.wardId;
  }

  // Hard requirement for strict tenant scope: hospital must always be set for module access.
  if ((!organisationId || !hospitalId) && DEMO_MODE) {
    return {
      role: role ?? DEMO_TENANT.role,
      organisationId: DEMO_TENANT.organisationId,
      hospitalId: DEMO_TENANT.hospitalId,
      wardId: DEMO_TENANT.wardId,
      serviceIds,
    };
  }
  if (!organisationId || !hospitalId) {
    throw new Error(GENERIC_USER_ERROR_MESSAGE);
  }

  return {
    role,
    organisationId,
    hospitalId,
    wardId,
    serviceIds,
  };
}
