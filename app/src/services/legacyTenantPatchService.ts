import { getDocs, limit, query, updateDoc } from "firebase/firestore";

import { db } from "../firebase";
import { orgPatientsCollection } from "../utils/tenantCollections";
import { normalizeHospitalScopeId, normalizeWardScopeId } from "../utils/tenantContext";

/**
 * Lightweight, best-effort legacy tenant scope repair.
 *
 * Purpose: stop “missing hospital/ward” from breaking strict reads.
 * This only patches a limited sample (to avoid expensive full collection scans).
 */
export async function patchLegacyTenantScopeOnce({
  organisationId,
  hospitalId,
  wardId,
}: {
  organisationId: string;
  hospitalId: string;
  wardId: string;
}): Promise<void> {
  if (!organisationId?.trim() || !hospitalId?.trim() || !wardId?.trim()) {
    throw new Error("Missing required tenant scope for legacy patch.");
  }

  const patientsCol = orgPatientsCollection(db, organisationId);
  const snapshot = await getDocs(query(patientsCol, limit(200)));

  const patch = {
    organisationId: organisationId.trim(),
    hospitalId: hospitalId.trim(),
    wardId: wardId.trim(),
  };

  const updates: Promise<unknown>[] = [];

  for (const d of snapshot.docs) {
    const data = d.data() ?? {};
    const existingHospital = normalizeHospitalScopeId(data?.hospitalId);
    const existingWard = normalizeWardScopeId(data?.wardId);

    const needsHospital = !existingHospital;
    const needsWard = !existingWard;
    const needsOrg = typeof data?.organisationId !== "string" || String(data.organisationId).trim() === "";

    if (!needsHospital && !needsWard && !needsOrg) continue;

    updates.push(
      updateDoc(d.ref, {
        ...(needsOrg ? { organisationId: patch.organisationId } : null),
        ...(needsHospital ? { hospitalId: patch.hospitalId } : null),
        ...(needsWard ? { wardId: patch.wardId } : null),
      }).catch(() => {})
    );
  }

  await Promise.all(updates);
}

